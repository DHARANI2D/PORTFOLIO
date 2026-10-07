#!/usr/bin/env node
/**
 * Runs after `next build` (see "build" in package.json). Turns the static export in ./out into a
 * deployable, hardened site:
 *
 *   1. reads every out/**\/*.html and hashes its inline scripts, <style> elements and style
 *      attributes (sha256)
 *   2. puts that page's Content-Security-Policy in a <meta http-equiv> tag, first in <head>, in EVERY
 *      html file (404.html and _not-found included). Works on any host, with or without headers.
 *   3. writes out/_headers            the same policy plus frame-ancestors, and the security headers
 *                                     (Netlify, Cloudflare Pages)
 *   4. writes out/headers.vercel.json the baseline headers in vercel.json format (see README)
 *   5. writes out/.well-known/security.txt (RFC 9116)
 *   6. re-reads what it wrote and fails if a page lacks its policy tag, or has an inline script,
 *      style or style attribute its policy would block
 *
 * Exits non-zero (failing the build) if out/ is missing, holds no HTML, contains inline event
 * handlers or third-party subresources, or the generated policy does not verify.
 *
 * Usage:
 *   node scripts/postbuild.mjs                  generate everything
 *   node scripts/postbuild.mjs --check          verify an existing out/ without writing (CI)
 *   --out <dir>    export directory (default: ./out)
 *   --root <dir>   project root that holds lib/site.ts (default: this repository)
 *   --mode <m>     "per-page" (default) or "global": one CSP per page, or one CSP listing every hash
 *
 * All logic lives in scripts/lib/csp.mjs. This file only does file system work.
 */

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditHtml,
  buildCsp,
  buildHeadersFile,
  buildPageHeadersFile,
  buildSecurityTxt,
  buildVercelHeaders,
  checkVercelConfig,
  cspWeaknesses,
  pagePathFromFile,
  parseSiteConfig,
  scriptHashesOf,
  injectCspMeta,
  securityTxtExpires,
  styleAttrHashesOf,
  styleHashesOf,
  verifyCspMeta,
  verifyHeadersFile,
  verifySecurityTxt,
} from "./lib/csp.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Cloudflare Pages ignores a _headers line longer than this. Netlify and Vercel have no such cap. */
const CLOUDFLARE_LINE_LIMIT = 2000;
/** Cloudflare Pages accepts at most this many rules per _headers file. */
const CLOUDFLARE_RULE_LIMIT = 100;

class BuildError extends Error {}

function parseArgs(argv, env) {
  const options = {
    check: false,
    root: path.resolve(SCRIPT_DIR, ".."),
    out: undefined,
    mode: env.CSP_MODE ?? "per-page",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[(i += 1)];
      if (next === undefined) throw new BuildError(`${arg} needs a value`);
      return next;
    };
    if (arg === "--check") options.check = true;
    else if (arg === "--out") options.out = path.resolve(value());
    else if (arg === "--root") options.root = path.resolve(value());
    else if (arg === "--mode") options.mode = value();
    else throw new BuildError(`Unknown argument: ${arg}`);
  }
  if (options.mode !== "per-page" && options.mode !== "global") {
    throw new BuildError(`--mode must be "per-page" or "global", got "${options.mode}"`);
  }
  options.out ??= path.join(options.root, "out");
  return options;
}

async function isDirectory(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

/** Every .html file under `dir`, as paths relative to it. Next's `_next` folder holds none. */
async function collectHtml(dir, base = dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue;
      found.push(...(await collectHtml(full, base)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      found.push(path.relative(base, full));
    }
  }
  return found.sort();
}

/**
 * Every HTML file of the export with the hashes of what its policy has to allow. `path` is the URL
 * the file is served at, or null for files a host never serves by name.
 */
async function readPages(outDir, siteOrigin) {
  const files = await collectHtml(outDir);
  if (files.length === 0) {
    throw new BuildError(`No HTML found in ${outDir}. Did "next build" export the site?`);
  }

  const pages = [];
  const problems = [];
  for (const file of files) {
    const html = await readFile(path.join(outDir, file), "utf8");
    for (const problem of auditHtml(html, { siteOrigin })) problems.push(`${file}: ${problem}`);
    pages.push({
      file,
      html,
      path: pagePathFromFile(file),
      scriptHashes: scriptHashesOf(html),
      styleHashes: styleHashesOf(html),
      styleAttrHashes: styleAttrHashesOf(html),
    });
  }
  if (problems.length > 0) {
    throw new BuildError(
      `Built HTML breaks the site's security rules:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
    );
  }
  if (!pages.some((page) => page.path !== null)) {
    throw new BuildError(`No pages found in ${outDir}.`);
  }
  return pages.sort((a, b) => a.file.localeCompare(b.file));
}

const headerCsp = (page) => buildCsp(page);
const metaCsp = (page) => buildCsp({ ...page, meta: true });

function verifyAll({ headersText, pages, securityTxt, htmlByFile }) {
  const metaProblems = [];
  for (const page of pages) {
    const html = htmlByFile.get(page.file) ?? "";
    for (const problem of verifyCspMeta(html, metaCsp(page))) {
      metaProblems.push(`${page.file}: ${problem}`);
    }
    for (const weakness of cspWeaknesses(metaCsp(page), { meta: true })) {
      metaProblems.push(`${page.file}: meta policy: ${weakness}`);
    }
  }
  return [
    ...metaProblems,
    ...verifyHeadersFile({ headersText, pages: pages.filter((page) => page.path !== null) }),
    ...verifySecurityTxt(securityTxt).map((problem) => `security.txt: ${problem}`),
  ];
}

async function generate({ outDir, pages, site, mode }) {
  const unique = (key) => [...new Set(pages.flatMap((page) => page[key]))].sort();
  const served = pages.filter((page) => page.path !== null);

  let headersText;
  let vercelHeaders;
  if (mode === "global") {
    const csp = buildCsp({
      scriptHashes: unique("scriptHashes"),
      styleHashes: unique("styleHashes"),
      styleAttrHashes: unique("styleAttrHashes"),
    });
    headersText = buildHeadersFile({ csp });
    vercelHeaders = buildVercelHeaders({ csp });
  } else {
    const perPage = served.map((page) => ({ path: page.path, csp: headerCsp(page) }));
    headersText = buildPageHeadersFile({ pages: perPage });
    vercelHeaders = buildVercelHeaders({ pages: perPage });
  }

  // The policy goes into the HTML itself, so a host that ignores _headers still enforces it. This
  // happens after hashing and changes no script, so no hash moves. The tag is first in <head>.
  const htmlByFile = new Map();
  for (const page of pages) {
    const html = injectCspMeta(page.html, metaCsp(page));
    htmlByFile.set(page.file, html);
    await writeFile(path.join(outDir, page.file), html, "utf8");
  }

  const expires = securityTxtExpires();
  const securityTxt = buildSecurityTxt({
    contact: site.email,
    expires,
    canonical: `${site.url}/.well-known/security.txt`,
    policy: `${site.url}/security/`,
  });

  await mkdir(path.join(outDir, ".well-known"), { recursive: true });
  await writeFile(path.join(outDir, "_headers"), headersText, "utf8");
  await writeFile(
    path.join(outDir, "headers.vercel.json"),
    `${JSON.stringify({ headers: vercelHeaders }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(outDir, ".well-known", "security.txt"), securityTxt, "utf8");

  const lines = headersText.split("\n");
  const longest = Math.max(...lines.map((line) => line.length));
  const rules = lines.filter((line) => line !== "" && !/^\s|^#/.test(line)).length;
  const warnings = [];
  if (longest > CLOUDFLARE_LINE_LIMIT) {
    warnings.push(
      `longest _headers line is ${longest} characters; Cloudflare Pages ignores lines over ${CLOUDFLARE_LINE_LIMIT}. Use --mode per-page.`,
    );
  }
  if (rules > CLOUDFLARE_RULE_LIMIT) {
    warnings.push(`${rules} rules; Cloudflare Pages accepts at most ${CLOUDFLARE_RULE_LIMIT}.`);
  }

  console.log(
    `postbuild: ${pages.length} html files, ${unique("scriptHashes").length} unique inline script hashes (max ${Math.max(0, ...pages.map((p) => p.scriptHashes.length))} per page), ${unique("styleHashes").length} inline <style> hashes, ${unique("styleAttrHashes").length} style attribute hashes (max ${Math.max(0, ...pages.map((p) => p.styleAttrHashes.length))} per page)`,
  );
  console.log(`postbuild: wrote a Content-Security-Policy <meta> tag into ${pages.length} files`);
  console.log(`postbuild: wrote _headers (${mode} CSP, ${rules} rules, longest line ${longest})`);
  console.log("postbuild: wrote headers.vercel.json");
  console.log(`postbuild: wrote .well-known/security.txt (Expires ${expires.toISOString()})`);
  for (const warning of warnings) console.warn(`postbuild: warning: ${warning}`);

  return { headersText, securityTxt, vercelHeaders, htmlByFile };
}

async function main(argv, env) {
  const options = parseArgs(argv, env);
  const site = parseSiteConfig(
    await readFile(path.join(options.root, "lib", "site.ts"), "utf8"),
    env,
  );

  if (!(await isDirectory(options.out))) {
    throw new BuildError(`${options.out} does not exist. Run "next build" first.`);
  }
  const pages = await readPages(options.out, site.origin);

  let written;
  if (options.check) {
    const read = (name) =>
      readFile(path.join(options.out, name), "utf8").catch(() => {
        throw new BuildError(
          `${name} is missing from ${options.out}. Run the build, not just "next build".`,
        );
      });
    let snippet;
    try {
      snippet = JSON.parse(await read("headers.vercel.json"));
    } catch (error) {
      if (error instanceof BuildError) throw error;
      throw new BuildError("headers.vercel.json is not valid JSON");
    }
    written = {
      headersText: await read("_headers"),
      securityTxt: await read(path.join(".well-known", "security.txt")),
      vercelHeaders: Array.isArray(snippet?.headers) ? snippet.headers : [],
      htmlByFile: new Map(pages.map((page) => [page.file, page.html])),
    };
  } else {
    written = await generate({ outDir: options.out, pages, site, mode: options.mode });
  }

  const problems = verifyAll({ ...written, pages });
  if (problems.length > 0) {
    throw new BuildError(`Verification failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
  console.log(
    `postbuild: verified ${pages.length} html files: policy tag in each, ${pages.filter((p) => p.path !== null).length} pages against _headers`,
  );

  // A committed vercel.json that carries an old build's CSP would break every page on Vercel.
  const vercelJson = await readFile(path.join(options.root, "vercel.json"), "utf8").catch(
    () => null,
  );
  if (vercelJson !== null) {
    const stale = checkVercelConfig({ vercelJson, generated: written.vercelHeaders });
    if (stale.length > 0) {
      const message = `vercel.json has a stale Content-Security-Policy. Copy "headers" from out/headers.vercel.json into vercel.json, or remove its CSP rules:\n${stale.map((p) => `  - ${p}`).join("\n")}`;
      // Deploying would ship pages whose inline scripts the policy blocks: stop the Vercel build.
      if (options.check || env.VERCEL) throw new BuildError(message);
      console.warn(`postbuild: warning: ${message}`);
    }
  }
}

try {
  await main(process.argv.slice(2), process.env);
} catch (error) {
  console.error(`postbuild: ${error instanceof Error ? error.message : String(error)}`);
  if (!(error instanceof BuildError) && error instanceof Error && error.stack)
    console.error(error.stack);
  process.exitCode = 1;
}
