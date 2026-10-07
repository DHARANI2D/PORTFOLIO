import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  BASELINE_HEADERS,
  auditHtml,
  buildCsp,
  buildCspMetaTag,
  extractInlineStyles,
  extractStyleAttributes,
  injectCspMeta,
  styleAttrHashesOf,
  styleHashesOf,
  verifyCspMeta,
  buildHeadersFile,
  buildPageHeadersFile,
  buildSecurityTxt,
  buildVercelHeaders,
  checkVercelConfig,
  cspWeaknesses,
  extractInlineScripts,
  hashScript,
  headersForPath,
  pagePathFromFile,
  parseCsp,
  parseHeadersFile,
  parseSiteConfig,
  scriptHashesOf,
  securityTxtExpires,
  verifyHeadersFile,
  verifySecurityTxt,
} from "../../scripts/lib/csp.mjs";
import { INIT_SCRIPT } from "@/lib/preferences";
import { site } from "@/lib/site";

const root = path.join(import.meta.dirname, "../..");

// Example from the CSP spec: sha256 of the script text `alert('Hello, world.');`.
const SPEC_SCRIPT = "alert('Hello, world.');";
const SPEC_HASH = "'sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng='";

const FLIGHT = `self.__next_f.push([1,"0:[\\"$\\",\\"html\\"]"])`;
const BOOT = "(self.__next_f=self.__next_f||[]).push([0])";

/** HTML shaped like a Next.js export: init script, JSON-LD, external scripts, flight data. */
const page = (extra = "") =>
  `<!DOCTYPE html><html lang="en"><head>
<script>${INIT_SCRIPT}</script>
<script type="application/ld+json">{"@context":"https://schema.org","name":"x"}</script>
<link rel="stylesheet" href="/_next/static/css/a.css"/>
</head><body><main id="main"><h1>Hello</h1>${extra}</main>
<script src="/_next/static/chunks/main.js" async=""></script>
<script>${BOOT}</script><script>${FLIGHT}</script>
</body></html>`;

describe("hashScript", () => {
  it("matches the CSP specification's test vector", () => {
    expect(hashScript(SPEC_SCRIPT)).toBe(SPEC_HASH);
  });

  it("hashes exactly the text it is given", () => {
    expect(hashScript(`${SPEC_SCRIPT} `)).not.toBe(SPEC_HASH);
    expect(hashScript("")).toBe("'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
  });

  it("normalises line endings the way the HTML parser does before hashing", () => {
    expect(hashScript("a\r\nb\rc")).toBe(hashScript("a\nb\nc"));
  });
});

describe("extractInlineScripts", () => {
  it("returns executable inline scripts only", () => {
    expect(extractInlineScripts(page())).toEqual([INIT_SCRIPT, BOOT, FLIGHT]);
  });

  it("excludes JSON-LD and other data blocks", () => {
    const html = `<script type="application/ld+json">{"a":1}</script><script type="application/json">{}</script><script type="text/template">x</script>`;
    expect(extractInlineScripts(html)).toEqual([]);
  });

  it("excludes scripts with a src, and includes module and untyped scripts", () => {
    const html = `<script src="/a.js"></script><script type="module">import "x"</script><script type="text/javascript">a()</script><script>b()</script>`;
    expect(extractInlineScripts(html)).toEqual(['import "x"', "a()", "b()"]);
  });

  it("ignores scripts inside comments and does not treat a script body as a comment", () => {
    const html = `<!-- <script>hidden()</script> --><script>var a = "<!--";</script><script>after()</script>`;
    expect(extractInlineScripts(html)).toEqual(['var a = "<!--";', "after()"]);
  });

  it("copes with > inside quoted attribute values and mixed-case tags", () => {
    const html = `<SCRIPT data-x="a>b" id='c'>run()</SCRIPT>`;
    expect(extractInlineScripts(html)).toEqual(["run()"]);
  });
});

describe("scriptHashesOf", () => {
  it("dedupes and sorts", () => {
    const html = `<script>b()</script><script>a()</script><script>b()</script>`;
    const hashes = scriptHashesOf(html);
    expect(hashes).toHaveLength(2);
    expect(hashes).toEqual([...hashes].sort());
  });
});

describe("buildCsp", () => {
  const csp = buildCsp({ scriptHashes: scriptHashesOf(page()) });
  const directives = parseCsp(csp);

  it("locks scripts to self plus hashes: no unsafe-inline, no unsafe-eval", () => {
    const scriptSrc = directives.get("script-src") ?? [];
    expect(scriptSrc[0]).toBe("'self'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc.slice(1)).toHaveLength(3);
    for (const source of scriptSrc.slice(1))
      expect(source).toMatch(/^'sha256-[A-Za-z0-9+/]{43}='$/);
    expect(csp).not.toMatch(/unsafe-eval/);
  });

  it("has every directive the policy promises", () => {
    expect(directives.get("default-src")).toEqual(["'self'"]);
    expect(directives.get("img-src")).toEqual(["'self'"]);
    expect(directives.get("font-src")).toEqual(["'self'"]);
    expect(directives.get("connect-src")).toEqual(["'self'"]);
    expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
    expect(directives.get("base-uri")).toEqual(["'self'"]);
    expect(directives.get("object-src")).toEqual(["'none'"]);
    expect(directives.has("upgrade-insecure-requests")).toBe(true);
  });

  it("never allows 'unsafe-inline' anywhere, styles included", () => {
    expect(directives.get("style-src")).toEqual(["'self'"]);
    expect(directives.has("style-src-attr")).toBe(false);
    const withInline = [...directives].filter(([, sources]) => sources.includes("'unsafe-inline'"));
    expect(withInline).toEqual([]);
    expect(csp).not.toContain("data:");
  });

  it("allows style attributes and <style> elements by hash only, and only on pages that have them", () => {
    const attrHash = hashScript("--shiki-light:#24292e;--shiki-dark:#e6edf3");
    const elementHash = hashScript("a{color:red}");
    const withStyles = parseCsp(
      buildCsp({
        scriptHashes: [],
        styleHashes: [elementHash],
        styleAttrHashes: [attrHash, attrHash],
      }),
    );
    expect(withStyles.get("style-src")).toEqual(["'self'", elementHash]);
    expect(withStyles.get("style-src-attr")).toEqual(["'unsafe-hashes'", attrHash]);
    for (const sources of withStyles.values()) expect(sources).not.toContain("'unsafe-inline'");
  });

  it("builds the <meta> variant without frame-ancestors, which a browser ignores there", () => {
    const meta = buildCsp({ scriptHashes: [SPEC_HASH], meta: true });
    expect(parseCsp(meta).has("frame-ancestors")).toBe(false);
    // Everything else is identical, so a header and a tag on the same page never disagree.
    const header = buildCsp({ scriptHashes: [SPEC_HASH] }).replace("frame-ancestors 'none'; ", "");
    expect(meta).toBe(header);
  });

  it("lets forms leave the page only for the visitor's own mail client", () => {
    expect(directives.get("form-action")).toEqual(["'self'", "mailto:"]);
  });

  it("is deterministic and tolerates duplicates", () => {
    const a = buildCsp({ scriptHashes: [SPEC_HASH, SPEC_HASH] });
    expect(a.match(/qznLcs/g)).toHaveLength(1);
    expect(buildCsp({ scriptHashes: [] })).toContain("script-src 'self';");
  });

  it("refuses anything that is not a plain hash source", () => {
    for (const bad of [
      "'unsafe-inline'",
      "https://evil.example",
      "'sha256-abc'; script-src *",
      "sha256-AAAA",
      "'sha1-AAAA'",
    ]) {
      expect(() => buildCsp({ scriptHashes: [bad] }), bad).toThrow(/Invalid CSP hash/);
    }
  });
});

describe("style extraction", () => {
  const html = `<head><style>a{color:red}</style></head><body>
<p style="--a:1;--b:&quot;x&quot;">x</p><i style="--a:1;--b:&quot;x&quot;"></i><b style="  "></b><u style="top:0"></u>
<script>var s='<p style="not-a-tag">'</script></body>`;

  it("finds <style> element bodies and decoded style attribute values, not text inside scripts", () => {
    expect(extractInlineStyles(html)).toEqual(["a{color:red}"]);
    expect(extractStyleAttributes(html)).toEqual(['--a:1;--b:"x"', '--a:1;--b:"x"', "top:0"]);
  });

  it("hashes each distinct value once, in the form the browser hashes it", () => {
    const hashes = styleAttrHashesOf(html);
    expect(hashes).toHaveLength(2);
    expect(hashes).toContain(hashScript('--a:1;--b:"x"'));
    expect(styleHashesOf(html)).toEqual([hashScript("a{color:red}")]);
    expect(styleAttrHashesOf("<p>none</p>")).toEqual([]);
  });
});

describe("Content-Security-Policy <meta> tag", () => {
  const policy = buildCsp({ scriptHashes: [SPEC_HASH], meta: true });
  const doc = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><title>t</title></head><body><meta name="x" content="y"/></body></html>`;

  it("goes right after a leading charset tag and before everything else in <head>", () => {
    const out = injectCspMeta(doc, policy);
    expect(out).toContain(`<head><meta charSet="utf-8"/>${buildCspMetaTag(policy)}<title>`);
    expect(verifyCspMeta(out, policy)).toEqual([]);
  });

  it("goes first when there is no charset tag, and is idempotent", () => {
    const bare = "<html><head><title>t</title></head><body></body></html>";
    const once = injectCspMeta(bare, policy);
    expect(once).toContain(`<head>${buildCspMetaTag(policy)}<title>`);
    expect(injectCspMeta(once, policy)).toBe(once);
    // A policy from an earlier build is replaced, never stacked.
    const other = buildCsp({ scriptHashes: [], meta: true });
    const swapped = injectCspMeta(once, other);
    expect(swapped.match(/Content-Security-Policy/g)).toHaveLength(1);
    expect(verifyCspMeta(swapped, other)).toEqual([]);
    expect(verifyCspMeta(swapped, policy).join()).toContain("does not match");
  });

  it("does not alter any inline script, so no hash moves", () => {
    const withScripts = page();
    const out = injectCspMeta(withScripts, policy);
    expect(scriptHashesOf(out)).toEqual(scriptHashesOf(withScripts));
  });

  it("keeps other meta tags and escapes the attribute value", () => {
    const out = injectCspMeta(doc, policy);
    expect(out).toContain('<meta name="x" content="y"/>');
    expect(buildCspMetaTag(`a"b<c&d`)).toContain('content="a&quot;b&lt;c&amp;d"');
  });

  it("refuses a document with no <head>", () => {
    expect(() => injectCspMeta("<p>fragment</p>", policy)).toThrow(/no <head>/);
  });

  it("is reported when missing, doubled, not first in <head>, or for another page", () => {
    expect(verifyCspMeta(doc, policy)).toEqual(["no Content-Security-Policy <meta> tag"]);
    const good = injectCspMeta(doc, policy);
    expect(
      verifyCspMeta(good.replace("</head>", `${buildCspMetaTag(policy)}</head>`), policy).join(),
    ).toContain("2 Content-Security-Policy");
    const late = injectCspMeta(doc, policy)
      .replace(buildCspMetaTag(policy), "")
      .replace("</head>", `${buildCspMetaTag(policy)}</head>`);
    expect(verifyCspMeta(late, policy).join()).toContain("not the first element");
    expect(verifyCspMeta(good, buildCsp({ scriptHashes: [], meta: true })).join()).toContain(
      "does not match",
    );
  });

  it("finds the tag whatever the case of the attribute, as a browser does", () => {
    const upper = `<html><head><META HTTP-EQUIV="content-security-policy" CONTENT="${policy}"></head></html>`;
    expect(verifyCspMeta(upper, policy)).toEqual([]);
    expect(injectCspMeta(upper, policy).match(/content-security-policy/gi)).toHaveLength(1);
  });
});

describe("cspWeaknesses: styles", () => {
  const ok = buildCsp({ scriptHashes: [SPEC_HASH] });
  it("rejects unsafe-inline and unknown sources in any style directive", () => {
    expect(cspWeaknesses(ok)).toEqual([]);
    expect(
      cspWeaknesses(ok.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")),
    ).toContain("style-src allows 'unsafe-inline'");
    expect(cspWeaknesses(`${ok}; style-src-attr 'unsafe-inline'`).join()).toContain(
      "style-src-attr allows 'unsafe-inline'",
    );
    expect(
      cspWeaknesses(ok.replace("style-src 'self'", "style-src 'self' https:")).join(),
    ).toContain("style-src allows an unexpected source: https:");
    expect(cspWeaknesses(ok.replace("img-src 'self'", "img-src 'self' data:")).join()).toContain(
      "img-src",
    );
  });

  it("allows frame-ancestors in a header and forbids it in a meta tag", () => {
    expect(cspWeaknesses(ok, { meta: true }).join()).toContain("frame-ancestors");
    expect(cspWeaknesses(buildCsp({ scriptHashes: [], meta: true }), { meta: true })).toEqual([]);
    expect(cspWeaknesses(buildCsp({ scriptHashes: [], meta: true })).join()).toContain(
      "frame-ancestors",
    );
  });
});

describe("cspWeaknesses", () => {
  const good = buildCsp({ scriptHashes: [SPEC_HASH] });

  it("accepts the generated policy", () => {
    expect(cspWeaknesses(good)).toEqual([]);
  });

  it.each([
    ["script-src 'self' 'unsafe-inline'", "'unsafe-inline'"],
    ["script-src 'self' 'unsafe-eval'", "'unsafe-eval'"],
    ["script-src 'self' *", "*"],
    ["script-src 'self' https://cdn.example.com", "https://cdn.example.com"],
    ["script-src 'self' data:", "data:"],
    ["script-src 'self' 'strict-dynamic'", "'strict-dynamic'"],
  ])("rejects %s", (replacement, expected) => {
    const weak = good.replace(/script-src [^;]*/, replacement);
    expect(cspWeaknesses(weak).join(" ")).toContain(expected);
  });

  it("rejects a missing script-src and a weak default-src", () => {
    expect(cspWeaknesses("default-src 'self'")).toContain("script-src is missing");
    expect(cspWeaknesses(good.replace("default-src 'self'", "default-src *"))).toContain(
      "default-src is not \"'self'\"",
    );
  });
});

describe("headers file", () => {
  const csp = buildCsp({ scriptHashes: [SPEC_HASH] });

  it("global mode: one /* rule with the CSP and every baseline header", () => {
    const text = buildHeadersFile({ csp });
    const rules = parseHeadersFile(text);
    const star = rules.find((rule) => rule.path === "/*");
    expect(star).toBeDefined();
    const names = star?.headers.map(([name]) => name);
    expect(names).toEqual(["Content-Security-Policy", ...BASELINE_HEADERS.map(([name]) => name)]);
    expect(star?.headers[0]?.[1]).toBe(csp);
  });

  it("sends the baseline headers the policy promises", () => {
    const headers = new Map(BASELINE_HEADERS);
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("is formatted for Netlify and Cloudflare: unindented path, two-space indented headers", () => {
    const text = buildHeadersFile({ csp });
    const lines = text.split("\n").filter((line) => line !== "" && !line.startsWith("#"));
    for (const line of lines) {
      expect(/^\/\S*$/.test(line) || /^ {2}[A-Za-z-]+: \S/.test(line), line).toBe(true);
    }
    expect(text.endsWith("\n")).toBe(true);
  });

  it("caches fingerprinted assets for a year and serves security.txt as text", () => {
    const rules = parseHeadersFile(buildHeadersFile({ csp }));
    expect(headersForPath(rules, "/_next/static/chunks/a.js")).toContainEqual([
      "Cache-Control",
      "public, max-age=31536000, immutable",
    ]);
    expect(headersForPath(rules, "/.well-known/security.txt")).toContainEqual([
      "Content-Type",
      "text/plain; charset=utf-8",
    ]);
    expect(headersForPath(rules, "/about/").map(([name]) => name)).not.toContain("Cache-Control");
  });

  it("per-page mode keeps the CSP out of /* and gives each page its own", () => {
    const a = buildCsp({ scriptHashes: [hashScript("a()")] });
    const b = buildCsp({ scriptHashes: [hashScript("b()")] });
    const text = buildPageHeadersFile({
      pages: [
        { path: "/", csp: a },
        { path: "/about/", csp: b },
      ],
    });
    const rules = parseHeadersFile(text);
    expect(rules.find((r) => r.path === "/*")?.headers.map(([n]) => n)).not.toContain(
      "Content-Security-Policy",
    );
    const csps = (p: string) =>
      headersForPath(rules, p).filter(([n]) => n === "Content-Security-Policy");
    expect(csps("/")).toEqual([["Content-Security-Policy", a]]);
    expect(csps("/about/")).toEqual([["Content-Security-Policy", b]]);
    expect(csps("/other/")).toEqual([]);
  });

  it("refuses header injection and unsafe paths", () => {
    expect(() => buildHeadersFile({ csp: "default-src 'self'\n  Set-Cookie: a=b" })).toThrow(
      /Unsafe header/,
    );
    expect(() => buildPageHeadersFile({ pages: [{ path: "/a/\n/*", csp }] })).toThrow(
      /Unsafe header path/,
    );
    expect(() => buildPageHeadersFile({ pages: [{ path: "/*", csp }] })).toThrow(
      /Unsafe header path/,
    );
    expect(() => buildPageHeadersFile({ pages: [{ path: "a/", csp }] })).toThrow(
      /Unsafe header path/,
    );
  });

  it("vercel snippet carries the same headers in vercel.json shape", () => {
    const pages = [{ path: "/about/", csp }];
    const rules = buildVercelHeaders({ pages });
    expect(rules[0]?.source).toBe("/(.*)");
    expect(rules[0]?.headers.map((h) => h.key)).toEqual(BASELINE_HEADERS.map(([name]) => name));
    expect(rules.find((r) => r.source === "/_next/static/(.*)")?.headers).toEqual([
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ]);
    expect(rules.find((r) => r.source === "/about/")?.headers).toEqual([
      { key: "Content-Security-Policy", value: csp },
    ]);
    const global = buildVercelHeaders({ csp });
    expect(global[0]?.headers[0]).toEqual({ key: "Content-Security-Policy", value: csp });
  });
});

describe("verifyHeadersFile", () => {
  const html = page();
  const pages = [{ path: "/", scriptHashes: scriptHashesOf(html) }];
  const csp = buildCsp({ scriptHashes: pages[0]?.scriptHashes ?? [] });

  it("passes when every inline script of a page is allowed for that page", () => {
    expect(
      verifyHeadersFile({
        headersText: buildPageHeadersFile({ pages: [{ path: "/", csp }] }),
        pages,
      }),
    ).toEqual([]);
    expect(verifyHeadersFile({ headersText: buildHeadersFile({ csp }), pages })).toEqual([]);
  });

  it("fails when a script hash is missing", () => {
    const stripped = buildCsp({ scriptHashes: (pages[0]?.scriptHashes ?? []).slice(1) });
    const problems = verifyHeadersFile({
      headersText: buildPageHeadersFile({ pages: [{ path: "/", csp: stripped }] }),
      pages,
    });
    expect(problems.join("\n")).toMatch(/inline script 'sha256-.*' is not allowed/);
  });

  it("fails when a page has no policy, an unsafe policy, or two policies", () => {
    const none = verifyHeadersFile({ headersText: buildPageHeadersFile({ pages: [] }), pages });
    expect(none.join()).toContain("no Content-Security-Policy applies");

    const unsafe = buildPageHeadersFile({ pages: [{ path: "/", csp }] }).replace(
      "script-src 'self'",
      "script-src 'self' 'unsafe-inline'",
    );
    expect(verifyHeadersFile({ headersText: unsafe, pages }).join()).toContain("'unsafe-inline'");

    const both = `${buildHeadersFile({ csp })}\n/\n  Content-Security-Policy: ${csp}\n`;
    expect(verifyHeadersFile({ headersText: both, pages }).join()).toContain(
      "2 Content-Security-Policy headers",
    );
  });

  it("fails when a baseline header is missing", () => {
    const text = buildHeadersFile({ csp }).replace(/ {2}X-Frame-Options: DENY\n/, "");
    expect(verifyHeadersFile({ headersText: text, pages }).join()).toContain(
      "X-Frame-Options missing or changed",
    );
  });

  it("reports a malformed file instead of throwing", () => {
    expect(verifyHeadersFile({ headersText: "  X: y", pages })).toHaveLength(1);
  });
});

describe("pagePathFromFile", () => {
  it.each([
    ["index.html", "/"],
    ["about/index.html", "/about/"],
    ["systems/witness/index.html", "/systems/witness/"],
    ["systems\\witness\\index.html", "/systems/witness/"],
    ["404.html", "/404.html"],
    ["_not-found/index.html", "/_not-found/"],
    ["_next/static/x.html", null],
    ["_next/_not-found/index.html", null],
    ["_next/static/x.html", null],
    ["robots.txt", null],
  ])("%s -> %s", (file, expected) => {
    expect(pagePathFromFile(file)).toBe(expected);
  });
});

describe("auditHtml", () => {
  const options = { siteOrigin: "https://example.com" };

  it("accepts same-origin and relative resources and ordinary outbound links", () => {
    const html = page(
      `<a href="https://github.com/x" target="_blank" rel="noopener noreferrer">x</a><img src="data:image/png;base64,AAAA" alt=""/>`,
    ).replace(
      "<head>",
      `<head><link rel="icon" href="https://example.com/favicon.ico"/><link rel="canonical" href="https://example.com/"/><meta property="og:image" content="https://example.com/og.png"/>`,
    );
    expect(auditHtml(html, options)).toEqual([]);
  });

  it("flags inline event handlers and javascript: URLs", () => {
    const problems = auditHtml(
      `<button onclick="x()">a</button><a href="javascript:alert(1)">b</a>`,
      options,
    );
    expect(problems.join("\n")).toContain('inline event handler "onclick"');
    expect(problems.join("\n")).toContain("javascript: URL");
  });

  it("flags subresources on other origins", () => {
    const html = [
      `<script src="https://cdn.example.net/a.js"></script>`,
      `<link rel="stylesheet" href="//fonts.example.net/x.css"/>`,
      `<link rel="preload" as="font" href="http://example.com/f.woff2"/>`,
      `<img src="https://img.example.net/a.png" srcset="/a.png 1x, https://img.example.net/b.png 2x"/>`,
      `<iframe src="https://frame.example.net/"></iframe>`,
    ].join("");
    expect(auditHtml(html, options)).toHaveLength(6);
  });

  it("does not look inside script bodies or comments", () => {
    const html = `<script>var s = '<a onclick="x()" href="javascript:y()">';</script><!-- <img src="https://evil.example/a.png"> -->`;
    expect(auditHtml(html, options)).toEqual([]);
  });
});

describe("checkVercelConfig", () => {
  const csp = buildCsp({ scriptHashes: [hashScript("a()")] });
  const generated = buildVercelHeaders({ pages: [{ path: "/about/", csp }] });
  const json = (headers: unknown) => JSON.stringify({ headers });

  it("passes when vercel.json carries no CSP (nothing can be stale)", () => {
    expect(checkVercelConfig({ vercelJson: json(buildVercelHeaders({})), generated })).toEqual([]);
    expect(checkVercelConfig({ vercelJson: "{}", generated })).toEqual([]);
  });

  it("passes when the committed CSP equals the generated one", () => {
    expect(checkVercelConfig({ vercelJson: json(generated), generated })).toEqual([]);
  });

  it("flags a CSP from an older build, a missing page and a page that is gone", () => {
    const older = buildVercelHeaders({
      pages: [{ path: "/about/", csp: buildCsp({ scriptHashes: [hashScript("old()")] }) }],
    });
    expect(checkVercelConfig({ vercelJson: json(older), generated }).join()).toContain(
      "out of date",
    );

    const other = buildVercelHeaders({ pages: [{ path: "/gone/", csp }] });
    const problems = checkVercelConfig({ vercelJson: json(other), generated }).join("\n");
    expect(problems).toContain("no CSP for /about/");
    expect(problems).toContain("/gone/");
  });

  it("reports invalid JSON", () => {
    expect(checkVercelConfig({ vercelJson: "{nope", generated })).toEqual([
      "vercel.json is not valid JSON",
    ]);
  });

  it("the committed vercel.json is the baseline of the generator, with no CSP", () => {
    const committed = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")) as {
      headers: unknown;
      outputDirectory: string;
      buildCommand: string;
      trailingSlash: boolean;
    };
    expect(committed.headers).toEqual(buildVercelHeaders({}));
    expect(JSON.stringify(committed.headers)).not.toContain("Content-Security-Policy");
    expect(committed).toMatchObject({
      outputDirectory: "out",
      buildCommand: "pnpm build",
      trailingSlash: true,
    });
  });
});

describe("security.txt", () => {
  const now = new Date("2026-10-04T12:00:00.000Z");
  const input = {
    contact: "dharanidharan2d@gmail.com",
    expires: securityTxtExpires(now),
    canonical: "https://example.com/.well-known/security.txt",
    policy: "https://example.com/security/",
  };

  it("expires just under a year from the build, in UTC, as RFC 9116 recommends", () => {
    expect(securityTxtExpires(now).toISOString()).toBe("2027-10-03T12:00:00.000Z");
  });

  it("has the required fields in order", () => {
    const text = buildSecurityTxt(input);
    expect(text.split("\n")).toEqual([
      "Contact: mailto:dharanidharan2d@gmail.com",
      "Expires: 2027-10-03T12:00:00Z",
      "Preferred-Languages: en",
      "Canonical: https://example.com/.well-known/security.txt",
      "Policy: https://example.com/security/",
      "",
    ]);
  });

  it("puts Expires in the future and verifies clean", () => {
    const text = buildSecurityTxt({ ...input, expires: securityTxtExpires() });
    const expires = /^Expires: (.+)$/m.exec(text)?.[1] ?? "";
    expect(new Date(expires).getTime()).toBeGreaterThan(Date.now());
    expect(verifySecurityTxt(text)).toEqual([]);
  });

  it("keeps a full contact URI and omits Policy when none is given", () => {
    const text = buildSecurityTxt({
      ...input,
      contact: "https://example.com/report",
      policy: undefined,
    });
    expect(text).toContain("Contact: https://example.com/report\n");
    expect(text).not.toContain("Policy:");
  });

  it("refuses values that could inject a field, and invalid dates", () => {
    expect(() => buildSecurityTxt({ ...input, contact: "a@b.c\nExpires: never" })).toThrow(
      /Unsafe/,
    );
    expect(() => buildSecurityTxt({ ...input, expires: "not a date" })).toThrow(/valid date/);
  });

  it("verifySecurityTxt flags a missing contact, an expired file and a bad contact", () => {
    expect(verifySecurityTxt("Expires: 2999-01-01T00:00:00Z\n")).toContain("Contact is missing");
    expect(
      verifySecurityTxt("Contact: mailto:a@b.c\nExpires: 2020-01-01T00:00:00Z\n").join(),
    ).toContain("in the past");
    expect(verifySecurityTxt("Contact: nope\nExpires: 2999-01-01T00:00:00Z\n").join()).toContain(
      "not a mailto",
    );
    expect(verifySecurityTxt("Contact: mailto:a@b.c\n")).toContain(
      "Expires must appear exactly once",
    );
  });
});

describe("parseSiteConfig", () => {
  const source = fs.readFileSync(path.join(root, "lib/site.ts"), "utf8");

  it("reads the same email and URL lib/site.ts exports", () => {
    const parsed = parseSiteConfig(source, process.env);
    expect(parsed.email).toBe(site.email);
    expect(parsed.url).toBe(site.url);
    expect(parsed.origin).toBe(new URL(site.url).origin);
  });

  it("lets NEXT_PUBLIC_SITE_URL override the default, as lib/site.ts does", () => {
    const parsed = parseSiteConfig(source, {
      NEXT_PUBLIC_SITE_URL: "https://portfolio.example.org/",
    });
    expect(parsed.url).toBe("https://portfolio.example.org");
    expect(parsed.origin).toBe("https://portfolio.example.org");
  });

  it("fails loudly when the file no longer has the expected shape or the URL is unsafe", () => {
    expect(() => parseSiteConfig("export const site = {}", {})).toThrow(/email/);
    expect(() => parseSiteConfig('email: "a@b.c"', {})).toThrow(/default site URL/);
    expect(() =>
      parseSiteConfig('email: "a@b.c"', { NEXT_PUBLIC_SITE_URL: "http://example.com" }),
    ).toThrow(/https/);
    expect(() => parseSiteConfig('email: "a@b.c"', { NEXT_PUBLIC_SITE_URL: "nonsense" })).toThrow(
      /valid URL/,
    );
  });
});

/* -------------------------------------------------------------------------------------------- */
/* scripts/postbuild.mjs end to end, against a fixture export                                    */
/* -------------------------------------------------------------------------------------------- */

describe("postbuild script", () => {
  const dirs: string[] = [];
  const fixture = (files: Record<string, string>) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "postbuild-"));
    dirs.push(out);
    for (const [name, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
      fs.writeFileSync(path.join(out, name), body);
    }
    return out;
  };
  const run = (out: string, ...args: string[]) =>
    spawnSync(process.execPath, [path.join(root, "scripts/postbuild.mjs"), "--out", out, ...args], {
      encoding: "utf8",
      env: { ...process.env, NEXT_PUBLIC_SITE_URL: "https://example.com" },
    });
  const site3 = {
    "index.html": page(),
    "about/index.html": page("<p>about</p>"),
    "404.html": page("<p>missing</p>"),
    "_next/static/chunks/main.js": "console.log(1)",
  };

  afterAll(() => {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes _headers, headers.vercel.json and security.txt, and verifies them", () => {
    const out = fixture(site3);
    const result = run(out);
    expect(result.status, result.stderr).toBe(0);

    const headers = fs.readFileSync(path.join(out, "_headers"), "utf8");
    const rules = parseHeadersFile(headers);
    expect(rules.map((r) => r.path)).toEqual(
      expect.arrayContaining(["/*", "/_next/static/*", "/", "/about/", "/404.html"]),
    );
    // Every page's CSP lists exactly the hashes of its own inline scripts.
    for (const [file, pagePath] of [
      ["index.html", "/"],
      ["about/index.html", "/about/"],
    ] as const) {
      const hashes = scriptHashesOf(fs.readFileSync(path.join(out, file), "utf8"));
      const csp =
        headersForPath(rules, pagePath).find(([n]) => n === "Content-Security-Policy")?.[1] ?? "";
      expect(parseCsp(csp).get("script-src")).toEqual(["'self'", ...hashes]);
    }
    expect(headers).not.toMatch(/script-src[^;]*unsafe-inline/);

    const vercel = JSON.parse(fs.readFileSync(path.join(out, "headers.vercel.json"), "utf8")) as {
      headers: unknown[];
    };
    expect(Array.isArray(vercel.headers)).toBe(true);

    const securityTxt = fs.readFileSync(path.join(out, ".well-known/security.txt"), "utf8");
    expect(securityTxt).toContain(`Contact: mailto:${site.email}`);
    expect(securityTxt).toContain("Canonical: https://example.com/.well-known/security.txt");
    expect(securityTxt).toContain("Policy: https://example.com/security/");
    expect(verifySecurityTxt(securityTxt)).toEqual([]);
  });

  it("puts the policy into EVERY html file, error pages and _not-found included", () => {
    const out = fixture({ ...site3, "_not-found/index.html": page("<p>nf</p>") });
    expect(run(out).status).toBe(0);
    for (const file of ["index.html", "about/index.html", "404.html", "_not-found/index.html"]) {
      const html = fs.readFileSync(path.join(out, file), "utf8");
      const expected = buildCsp({ scriptHashes: scriptHashesOf(html), meta: true });
      expect(verifyCspMeta(html, expected), file).toEqual([]);
    }
    // The header side covers /_not-found/ too.
    const rules = parseHeadersFile(fs.readFileSync(path.join(out, "_headers"), "utf8"));
    expect(rules.map((r) => r.path)).toContain("/_not-found/");
  });

  it("hashes style attributes and <style> elements instead of allowing 'unsafe-inline'", () => {
    const out = fixture({
      ...site3,
      "styled/index.html": page(`<style>p{margin:0}</style><i style="--a:1">x</i>`),
    });
    const result = run(out);
    expect(result.status, result.stderr).toBe(0);
    const rules = parseHeadersFile(fs.readFileSync(path.join(out, "_headers"), "utf8"));
    const policy = (route: string) =>
      parseCsp(
        headersForPath(rules, route).find(([n]) => n === "Content-Security-Policy")?.[1] ?? "",
      );
    expect(policy("/styled/").get("style-src")).toEqual(["'self'", hashScript("p{margin:0}")]);
    expect(policy("/styled/").get("style-src-attr")).toEqual([
      "'unsafe-hashes'",
      hashScript("--a:1"),
    ]);
    // A page with no inline style gets neither.
    expect(policy("/about/").get("style-src")).toEqual(["'self'"]);
    expect(policy("/about/").has("style-src-attr")).toBe(false);
    expect(fs.readFileSync(path.join(out, "styled/index.html"), "utf8")).toContain(
      `style-src-attr 'unsafe-hashes' ${hashScript("--a:1")}`,
    );
  });

  it("--check fails when a page loses its policy tag or the tag is edited", () => {
    const out = fixture(site3);
    expect(run(out).status).toBe(0);
    const file = path.join(out, "404.html");
    const built = fs.readFileSync(file, "utf8");

    fs.writeFileSync(file, built.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ""));
    const missing = run(out, "--check");
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("404.html: no Content-Security-Policy <meta> tag");

    fs.writeFileSync(file, built.replace("default-src 'self'", "default-src *"));
    const edited = run(out, "--check");
    expect(edited.status).toBe(1);
    expect(edited.stderr).toContain("does not match");
  });

  it("running it twice yields the same files (the tag is replaced, not stacked)", () => {
    const out = fixture(site3);
    expect(run(out).status).toBe(0);
    const first = fs.readFileSync(path.join(out, "index.html"), "utf8");
    expect(run(out).status).toBe(0);
    expect(fs.readFileSync(path.join(out, "index.html"), "utf8")).toBe(first);
  });

  it("global mode writes one /* policy holding every hash", () => {
    const out = fixture(site3);
    expect(run(out, "--mode", "global").status).toBe(0);
    const rules = parseHeadersFile(fs.readFileSync(path.join(out, "_headers"), "utf8"));
    expect(
      rules.filter((r) => r.headers.some(([n]) => n === "Content-Security-Policy")),
    ).toHaveLength(1);
  });

  it("--check passes on its own output and fails when the headers are tampered with", () => {
    const out = fixture(site3);
    expect(run(out).status).toBe(0);
    expect(run(out, "--check").status).toBe(0);

    const file = path.join(out, "_headers");
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, "utf8")
        .replace(/script-src 'self'/g, "script-src 'self' 'unsafe-inline'"),
    );
    const result = run(out, "--check");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unsafe-inline");
  });

  it("--check fails when an inline script has changed since the headers were written", () => {
    const out = fixture(site3);
    expect(run(out).status).toBe(0);
    fs.appendFileSync(path.join(out, "index.html"), "<script>injected()</script>");
    const result = run(out, "--check");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/inline script .* is not allowed/);
  });

  it("fails the build when out/ is missing or holds no HTML", () => {
    const missing = run(path.join(os.tmpdir(), "postbuild-does-not-exist"));
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("does not exist");

    const empty = fixture({ "robots.txt": "User-agent: *" });
    const result = run(empty);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No HTML found");
  });

  it("fails the build on inline handlers and third-party resources", () => {
    const handler = fixture({ "index.html": page(`<button onclick="x()">x</button>`) });
    const a = run(handler);
    expect(a.status).toBe(1);
    expect(a.stderr).toContain("onclick");

    const external = fixture({
      "index.html": page(`<img src="https://tracker.example.net/p.gif" alt=""/>`),
    });
    const b = run(external);
    expect(b.status).toBe(1);
    expect(b.stderr).toContain("another origin");
  });

  describe("a committed vercel.json", () => {
    /** A project root with lib/site.ts (read by the script) and the given vercel.json. */
    const projectRoot = (vercelJson?: unknown) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "postbuild-root-"));
      dirs.push(dir);
      fs.mkdirSync(path.join(dir, "lib"));
      fs.copyFileSync(path.join(root, "lib/site.ts"), path.join(dir, "lib/site.ts"));
      if (vercelJson !== undefined)
        fs.writeFileSync(path.join(dir, "vercel.json"), JSON.stringify(vercelJson));
      return dir;
    };
    const runIn = (
      rootDir: string,
      out: string,
      env: Record<string, string> = {},
      ...args: string[]
    ) =>
      spawnSync(
        process.execPath,
        [path.join(root, "scripts/postbuild.mjs"), "--root", rootDir, "--out", out, ...args],
        {
          encoding: "utf8",
          env: { ...process.env, VERCEL: "", NEXT_PUBLIC_SITE_URL: "https://example.com", ...env },
        },
      );
    const staleConfig = {
      headers: buildVercelHeaders({
        pages: [{ path: "/", csp: buildCsp({ scriptHashes: [hashScript("old()")] }) }],
      }),
    };

    it("without a CSP is fine", () => {
      const result = runIn(projectRoot({ headers: buildVercelHeaders({}) }), fixture(site3));
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).not.toContain("stale");
    });

    it("with a stale CSP warns locally and fails the build on Vercel", () => {
      const local = runIn(projectRoot(staleConfig), fixture(site3));
      expect(local.status, local.stderr).toBe(0);
      expect(local.stderr).toContain("stale Content-Security-Policy");

      const onVercel = runIn(projectRoot(staleConfig), fixture(site3), { VERCEL: "1" });
      expect(onVercel.status).toBe(1);
      expect(onVercel.stderr).toContain("stale Content-Security-Policy");
    });

    it("with the snippet from this build passes everywhere, and --check catches it going stale", () => {
      const out = fixture(site3);
      expect(runIn(projectRoot(), out).status).toBe(0);
      const snippet = JSON.parse(
        fs.readFileSync(path.join(out, "headers.vercel.json"), "utf8"),
      ) as { headers: unknown };

      const current = projectRoot({ headers: snippet.headers });
      expect(runIn(current, out, { VERCEL: "1" }, "--check").status).toBe(0);

      fs.appendFileSync(path.join(out, "about/index.html"), "<script>changed()</script>");
      fs.rmSync(path.join(out, "_headers"));
      const stale = runIn(current, out, {}, "--mode", "per-page");
      expect(stale.status, stale.stderr).toBe(0); // regenerated for the new content, so vercel.json is now behind
      expect(stale.stderr).toContain("stale Content-Security-Policy");
      expect(runIn(current, out, {}, "--check").status).toBe(1);
    });
  });

  it("rejects unknown arguments", () => {
    const out = fixture(site3);
    expect(run(out, "--nope").status).toBe(1);
    expect(run(out, "--mode", "weird").status).toBe(1);
  });
});
