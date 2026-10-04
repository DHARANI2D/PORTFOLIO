/**
 * Build-time security helpers: HTML inspection, hash-based Content-Security-Policy, response
 * headers for static hosts, and security.txt.
 *
 * Pure ESM with no dependencies and no I/O, so it runs under plain `node` (scripts/postbuild.mjs)
 * and under vitest (tests/unit/csp.test.ts). All file system work lives in scripts/postbuild.mjs.
 *
 * Why hashes: the site is a static export, so there is no server to mint a per-request nonce.
 * Next.js still emits inline <script> tags (the theme init script and React Server Components
 * flight data). Their content is fixed at build time, so each one is allowed by its sha256 hash and
 * nothing else may run inline. See docs/SECURITY.md.
 */

import { createHash } from "node:crypto";

/* -------------------------------------------------------------------------------------------- */
/* HTML inspection                                                                              */
/* -------------------------------------------------------------------------------------------- */

/** Attribute run that may contain quoted `>`: linear time, the three alternatives cannot overlap. */
const ATTRS = `((?:[^>"']|"[^"]*"|'[^']*')*)`;

/**
 * One alternative per kind of token, in document order, so a `<!--` inside a script body is never
 * mistaken for a comment and a `<script` inside a comment is never mistaken for a script.
 * 1: comment (skipped)   2-4: <script>/<style> element (name, attributes, body)   5-6: any other start tag
 */
const TOKEN = new RegExp(
  `<!--[\\s\\S]*?(?:-->|$)|<(script|style)\\b${ATTRS}>([\\s\\S]*?)<\\/\\1\\s*>|<([a-zA-Z][^\\s/>]*)${ATTRS}>`,
  "gi",
);
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decodes the entities a serializer produces inside attribute values. */
function decodeEntities(value) {
  return value.replace(
    /&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi,
    (_m, hex, dec, name) => {
      if (name) return NAMED_ENTITIES[name.toLowerCase()];
      const code = hex ? Number.parseInt(hex, 16) : Number.parseInt(dec, 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "";
    },
  );
}

/** @returns {Record<string, string>} attribute names are lower-cased; a bare attribute is "". */
function parseAttributes(source) {
  /** @type {Record<string, string>} */
  const attrs = Object.create(null);
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = (match[1] ?? "").toLowerCase();
    if (name === "" || name in attrs) continue; // the first occurrence wins, as in a browser
    attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

/**
 * Start tags of an HTML document in order. `<script>` and `<style>` elements carry their raw `body`.
 * This is a tokenizer for the machine-generated HTML of a static export, not a full HTML parser.
 *
 * @param {string} html
 * @returns {Generator<{ name: string; attrs: Record<string, string>; body?: string }>}
 */
export function* iterateTags(html) {
  for (const match of html.matchAll(TOKEN)) {
    if (match[1] !== undefined) {
      yield {
        name: match[1].toLowerCase(),
        attrs: parseAttributes(match[2] ?? ""),
        body: match[3] ?? "",
      };
    } else if (match[4] !== undefined) {
      yield { name: match[4].toLowerCase(), attrs: parseAttributes(match[5] ?? "") };
    }
  }
}

/** MIME types (and the keyword "module") for which a browser executes an inline script. */
const EXECUTABLE_TYPE =
  /^(?:|module|importmap|(?:application|text)\/(?:x-)?(?:java|ecma)script|text\/(?:jscript|livescript))$/i;

/**
 * Bodies of the inline scripts a browser would run: no `src`, and a script type (or none).
 * Data blocks such as `type="application/ld+json"` are never executed and need no CSP entry.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function extractInlineScripts(html) {
  const scripts = [];
  for (const tag of iterateTags(html)) {
    if (tag.name !== "script" || tag.body === undefined) continue;
    if ("src" in tag.attrs) continue;
    if (!EXECUTABLE_TYPE.test((tag.attrs.type ?? "").trim())) continue;
    scripts.push(tag.body);
  }
  return scripts;
}

/** Tags and attributes that load a subresource. A cross-origin value is blocked by the CSP. */
const RESOURCE_ATTRS = [
  ["script", "src"],
  ["img", "src"],
  ["img", "srcset"],
  ["source", "src"],
  ["source", "srcset"],
  ["iframe", "src"],
  ["frame", "src"],
  ["embed", "src"],
  ["object", "data"],
  ["video", "src"],
  ["video", "poster"],
  ["audio", "src"],
  ["track", "src"],
  ["input", "src"],
  ["form", "action"],
];
/** `<link rel>` values that fetch the target (as opposed to metadata like canonical or alternate). */
const FETCHING_REL =
  /\b(?:stylesheet|preload|modulepreload|prefetch|prerender|preconnect|dns-prefetch|icon|apple-touch-icon|manifest|mask-icon)\b/i;

/** @param {string} value @param {string} siteOrigin */
function isForeignUrl(value, siteOrigin) {
  const trimmed = value.trim();
  if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(trimmed)) return false; // relative, data:, mailto:, #hash
  try {
    return new URL(trimmed, siteOrigin).origin !== siteOrigin;
  } catch {
    return true;
  }
}

/** Candidate URLs of a `srcset` value. */
const srcsetUrls = (value) =>
  value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean);

/**
 * Things in built HTML that the CSP would silently break or that the site promises not to have.
 * A non-empty result should fail the build.
 *   - inline event-handler attributes (onclick=...): blocked by script-src, and ruled out by docs/SECURITY.md
 *   - `javascript:` URLs
 *   - subresources on another origin (third-party scripts, fonts, images, frames)
 *
 * @param {string} html
 * @param {{ siteOrigin: string }} options origin of the site, e.g. "https://example.com"
 * @returns {string[]} human-readable problems
 */
export function auditHtml(html, { siteOrigin }) {
  const problems = [];
  for (const { name, attrs } of iterateTags(html)) {
    for (const [attr, value] of Object.entries(attrs)) {
      if (/^on[a-z]+$/.test(attr)) problems.push(`<${name}> has inline event handler "${attr}"`);
      if (
        ["href", "src", "action", "formaction", "data", "poster"].includes(attr) &&
        /^\s*javascript:/i.test(value)
      ) {
        problems.push(`<${name} ${attr}> is a javascript: URL`);
      }
    }
    for (const [tag, attr] of RESOURCE_ATTRS) {
      const value = name === tag ? attrs[attr] : undefined;
      if (value === undefined) continue;
      const urls = attr === "srcset" ? srcsetUrls(value) : [value];
      for (const url of urls) {
        if (isForeignUrl(url, siteOrigin)) {
          problems.push(`<${tag} ${attr}> loads from another origin: ${url.slice(0, 80)}`);
        }
      }
    }
    if (
      name === "link" &&
      FETCHING_REL.test(attrs.rel ?? "") &&
      isForeignUrl(attrs.href ?? "", siteOrigin)
    ) {
      problems.push(
        `<link rel="${attrs.rel}"> loads from another origin: ${(attrs.href ?? "").slice(0, 80)}`,
      );
    }
  }
  return problems;
}

/* -------------------------------------------------------------------------------------------- */
/* Content-Security-Policy                                                                      */
/* -------------------------------------------------------------------------------------------- */

const HASH_SOURCE = /^'sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}'$/;

/**
 * CSP source expression for one inline script: `'sha256-<base64>'`, quotes included.
 * The browser hashes the element text after HTML input-stream normalisation (CR and CRLF become
 * LF), so the same normalisation is applied here.
 *
 * @param {string} content exact text between <script> and </script>
 * @returns {string}
 */
export function hashScript(content) {
  const normalised = content.replace(/\r\n?/g, "\n");
  return `'sha256-${createHash("sha256").update(normalised, "utf8").digest("base64")}'`;
}

/**
 * Inline scripts in `html` as unique, sorted hash sources.
 * @param {string} html
 * @returns {string[]}
 */
export function scriptHashesOf(html) {
  return [...new Set(extractInlineScripts(html).map(hashScript))].sort();
}

/**
 * Builds the policy. `script-src` is `'self'` plus the given hashes. It never contains
 * 'unsafe-inline', 'unsafe-eval' or a host.
 *
 * `style-src` keeps 'unsafe-inline' on purpose. React and Motion emit inline `style` attributes
 * (positions, transforms, CSS variables). A hash source cannot allow an attribute without
 * 'unsafe-hashes', and the set of values is open-ended, so style attributes need 'unsafe-inline'.
 * The risk is bounded: CSS cannot execute script, `script-src` still blocks every injected script,
 * and `img-src`, `font-src`, `connect-src` and `form-action` already close the usual CSS
 * exfiltration routes. docs/SECURITY.md records the trade-off.
 *
 * `form-action` also allows `mailto:`: the contact form falls back to a native mailto: submission
 * when JavaScript is off, and that hands the message to the visitor's own mail client. Nothing is
 * posted to any server.
 *
 * @param {{ scriptHashes: readonly string[] }} input
 * @returns {string}
 */
export function buildCsp({ scriptHashes }) {
  for (const hash of scriptHashes) {
    // Anything that is not a plain hash source could smuggle in another directive or source.
    if (!HASH_SOURCE.test(hash))
      throw new Error(`Invalid CSP hash source: ${JSON.stringify(hash)}`);
  }
  const hashes = [...new Set(scriptHashes)].sort();
  return [
    "default-src 'self'",
    ["script-src 'self'", ...hashes].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/**
 * Directive name to its source list.
 * @param {string} csp
 * @returns {Map<string, string[]>}
 */
export function parseCsp(csp) {
  const directives = new Map();
  for (const part of csp.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

/** Sources that would let arbitrary script run. */
const UNSAFE_SCRIPT_SOURCES = new Set([
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  "'wasm-unsafe-eval'",
  "'strict-dynamic'",
  "*",
  "data:",
  "blob:",
  "http:",
  "https:",
  "filesystem:",
]);

/**
 * Why a CSP is too weak for this site, as a list. Empty when it is acceptable.
 * @param {string} csp
 * @returns {string[]}
 */
export function cspWeaknesses(csp) {
  const problems = [];
  const d = parseCsp(csp);
  const scriptSrc = d.get("script-src");
  if (!scriptSrc) problems.push("script-src is missing");
  else {
    for (const source of scriptSrc) {
      if (UNSAFE_SCRIPT_SOURCES.has(source.toLowerCase())) {
        problems.push(`script-src allows ${source}`);
      } else if (!(source === "'self'" || HASH_SOURCE.test(source))) {
        problems.push(`script-src allows an unexpected source: ${source}`);
      }
    }
    if (!scriptSrc.includes("'self'")) problems.push("script-src does not include 'self'");
  }
  if (d.has("script-src-elem") || d.has("script-src-attr")) {
    problems.push("script-src-elem / script-src-attr would override script-src");
  }
  const requireValue = (name, value) => {
    if (d.get(name)?.join(" ") !== value) problems.push(`${name} is not "${value}"`);
  };
  requireValue("default-src", "'self'");
  requireValue("object-src", "'none'");
  requireValue("base-uri", "'self'");
  requireValue("frame-ancestors", "'none'");
  return problems;
}

/* -------------------------------------------------------------------------------------------- */
/* Response headers                                                                             */
/* -------------------------------------------------------------------------------------------- */

/** Applied to every response. Order is stable so the generated file diffs cleanly. */
export const BASELINE_HEADERS = Object.freeze([
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  ],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["X-Frame-Options", "DENY"],
]);

/** Fingerprinted build output never changes under the same URL, so it can be cached for a year. */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const SAFE_PATH = /^\/[A-Za-z0-9\-._~/]*$/;
const SAFE_HEADER_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;

function assertHeader(name, value) {
  // CR or LF in a value would let a caller start a new header line or a new rule.
  if (!SAFE_HEADER_NAME.test(name) || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`Unsafe header: ${JSON.stringify(name)}`);
  }
}

function assertPath(path) {
  if (!SAFE_PATH.test(path)) throw new Error(`Unsafe header path: ${JSON.stringify(path)}`);
}

/** @param {string} path @param {readonly (readonly [string, string])[]} headers */
function ruleBlock(path, headers) {
  for (const [name, value] of headers) assertHeader(name, value);
  const lines = headers.map(([name, value]) => `  ${name}: ${value}`);
  return [path, ...lines].join("\n");
}

const HEADERS_FILE_NOTE = [
  "# Generated by scripts/postbuild.mjs after `next build`. Do not edit: it is rewritten on every build.",
  "# The Content-Security-Policy contains sha256 hashes of this build's inline scripts, so it is",
  "# specific to this build.",
];

/** Extra rules every layout shares: long cache for fingerprinted assets, a clean type for security.txt. */
const ASSET_RULES = Object.freeze([
  ["/_next/static/*", [["Cache-Control", IMMUTABLE_CACHE]]],
  ["/.well-known/security.txt", [["Content-Type", "text/plain; charset=utf-8"]]],
]);

/**
 * `_headers` file (Netlify and Cloudflare Pages format) with ONE policy for every path.
 * Simple, but the policy lists the hashes of every page, so it grows with the site. Hosts cap
 * header size (Cloudflare Pages: 2,000 characters per line), so prefer buildPageHeadersFile for
 * more than a handful of pages.
 *
 * @param {{ csp: string }} input
 * @returns {string}
 */
export function buildHeadersFile({ csp }) {
  const blocks = [
    ruleBlock("/*", [["Content-Security-Policy", csp], ...BASELINE_HEADERS]),
    ...ASSET_RULES.map(([path, headers]) => ruleBlock(path, headers)),
  ];
  return [...HEADERS_FILE_NOTE, "", ...blocks.flatMap((b) => [b, ""])].join("\n");
}

/**
 * `_headers` file with the baseline headers on `/*` and one Content-Security-Policy per page.
 *
 * Each page lists only its own script hashes, which keeps every header line short and means a
 * hash that is valid on one page is not valid on another. The CSP is deliberately NOT part of the
 * `/*` rule: hosts either merge or join headers from overlapping rules, and two policies on one
 * response would both have to pass.
 *
 * @param {{ pages: readonly { path: string; csp: string }[] }} input
 * @returns {string}
 */
export function buildPageHeadersFile({ pages }) {
  const blocks = [
    ruleBlock("/*", BASELINE_HEADERS),
    ...ASSET_RULES.map(([path, headers]) => ruleBlock(path, headers)),
    ...pages.map(({ path, csp }) => {
      assertPath(path);
      return ruleBlock(path, [["Content-Security-Policy", csp]]);
    }),
  ];
  return [...HEADERS_FILE_NOTE, "", ...blocks.flatMap((b) => [b, ""])].join("\n");
}

/**
 * Vercel `headers` array. Same content as the `_headers` file, in the shape vercel.json expects.
 * Pass `csp` for one policy everywhere, or `pages` for one per page.
 *
 * @param {{ csp?: string; pages?: readonly { path: string; csp: string }[] }} input
 * @returns {{ source: string; headers: { key: string; value: string }[] }[]}
 */
export function buildVercelHeaders({ csp, pages = [] }) {
  const toRule = (source, headers) => {
    for (const [name, value] of headers) assertHeader(name, value);
    return { source, headers: headers.map(([key, value]) => ({ key, value })) };
  };
  return [
    toRule("/(.*)", [...(csp ? [["Content-Security-Policy", csp]] : []), ...BASELINE_HEADERS]),
    ...ASSET_RULES.map(([path, headers]) =>
      // Vercel sources are path-to-regexp patterns: "/x/*" is spelled "/x/(.*)".
      toRule(path.replace(/\*$/, "(.*)"), headers),
    ),
    ...pages.map(({ path, csp: pageCsp }) => {
      assertPath(path);
      return toRule(path, [["Content-Security-Policy", pageCsp]]);
    }),
  ];
}

/**
 * Parses a `_headers` file into rules. Comments (#) and blank lines are ignored.
 * @param {string} text
 * @returns {{ path: string; headers: [string, string][] }[]}
 */
export function parseHeadersFile(text) {
  const rules = [];
  /** @type {{ path: string; headers: [string, string][] } | undefined} */
  let current;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) continue;
    if (/^\s/.test(raw)) {
      const index = raw.indexOf(":");
      if (!current || index === -1)
        throw new Error(`Malformed _headers line: ${JSON.stringify(raw)}`);
      current.headers.push([raw.slice(0, index).trim(), raw.slice(index + 1).trim()]);
    } else {
      current = { path: raw.trim(), headers: [] };
      rules.push(current);
    }
  }
  return rules;
}

/** `*` matches any run of characters (including "/"), everything else is literal. */
function pathMatches(pattern, pathname) {
  if (!pattern.includes("*")) return pattern === pathname;
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`).test(pathname);
}

/**
 * Rules whose path pattern matches `pathname`, in file order.
 * @param {{ path: string; headers: [string, string][] }[]} rules
 * @param {string} pathname
 */
export function matchingRules(rules, pathname) {
  return rules.filter((rule) => pathMatches(rule.path, pathname));
}

/**
 * Headers a host would send for `pathname` given parsed rules. Headers of the same name from
 * several matching rules are joined with ", ", which is how Cloudflare Pages combines them.
 *
 * @param {{ path: string; headers: [string, string][] }[]} rules
 * @param {string} pathname
 * @returns {[string, string][]}
 */
export function headersForPath(rules, pathname) {
  /** @type {Map<string, { name: string; values: string[] }>} */
  const merged = new Map();
  for (const rule of matchingRules(rules, pathname)) {
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const entry = merged.get(key) ?? { name, values: [] };
      entry.values.push(value);
      merged.set(key, entry);
    }
  }
  return [...merged.values()].map(({ name, values }) => [name, values.join(", ")]);
}

/**
 * Maps a built HTML file (path relative to the export root) to the URL path it is served at.
 * `index.html` and `a/b/index.html` become `/` and `/a/b/`; `404.html` stays `/404.html`.
 * Returns null for files that are not pages (Next's internal `_next` and `_not-found` outputs).
 *
 * @param {string} relativeFile path relative to out/, with / or \ separators
 * @returns {string | null}
 */
export function pagePathFromFile(relativeFile) {
  const parts = relativeFile.split(/[\\/]+/).filter(Boolean);
  const file = parts.pop();
  if (!file || !file.endsWith(".html")) return null;
  if (parts.some((part) => part.startsWith("_"))) return null;
  if (file === "index.html") return `/${parts.map((p) => `${p}/`).join("")}`;
  if (file.startsWith("_")) return null;
  return `/${[...parts, file].join("/")}`;
}

/**
 * Checks a generated `_headers` file against the pages it protects.
 * Every page must resolve to exactly one acceptable CSP that contains the hash of every one of its
 * inline scripts, plus every baseline header.
 *
 * @param {{ headersText: string; pages: readonly { path: string; scriptHashes: readonly string[] }[] }} input
 * @returns {string[]} problems; empty when the file is sound
 */
export function verifyHeadersFile({ headersText, pages }) {
  const problems = [];
  let rules;
  try {
    rules = parseHeadersFile(headersText);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  for (const page of pages) {
    const policies = matchingRules(rules, page.path).flatMap((rule) =>
      rule.headers
        .filter(([name]) => name.toLowerCase() === "content-security-policy")
        .map(([, value]) => value),
    );
    const [csp] = policies;
    if (csp === undefined) {
      problems.push(`${page.path}: no Content-Security-Policy applies`);
    } else {
      // Two policies on one response are both enforced, so a hash missing from either one blocks the script.
      if (policies.length > 1) {
        problems.push(`${page.path}: ${policies.length} Content-Security-Policy headers apply`);
      }
      for (const weakness of cspWeaknesses(csp)) problems.push(`${page.path}: ${weakness}`);
      const allowed = new Set(parseCsp(csp).get("script-src") ?? []);
      for (const hash of page.scriptHashes) {
        if (!allowed.has(hash)) problems.push(`${page.path}: inline script ${hash} is not allowed`);
      }
    }

    const headers = headersForPath(rules, page.path);
    for (const [name, value] of BASELINE_HEADERS) {
      const sent = headers.find(([n]) => n.toLowerCase() === name.toLowerCase())?.[1];
      if (sent !== value) problems.push(`${page.path}: ${name} missing or changed`);
    }
  }
  return problems;
}

/**
 * Staleness check for a committed vercel.json.
 *
 * The CSP holds hashes of this build's inline scripts, and any content change changes them. A
 * vercel.json that carries a copy of an older build's policy would block the new inline scripts
 * and break hydration on every page. So when vercel.json has CSP rules at all, they must equal the
 * freshly generated ones. A vercel.json with no CSP rules cannot be stale and passes.
 *
 * @param {{ vercelJson: string; generated: readonly VercelRule[] }} input
 * @returns {string[]} problems; empty when nothing is stale
 *
 * @typedef {{ source: string; headers: { key: string; value: string }[] }} VercelRule
 */
export function checkVercelConfig({ vercelJson, generated }) {
  let config;
  try {
    config = JSON.parse(vercelJson);
  } catch {
    return ["vercel.json is not valid JSON"];
  }
  const cspOf = (rules) => {
    /** @type {Map<string, string>} */
    const map = new Map();
    for (const rule of Array.isArray(rules) ? rules : []) {
      const header = rule?.headers?.find?.(
        (h) => String(h?.key).toLowerCase() === "content-security-policy",
      );
      if (header && typeof rule.source === "string") map.set(rule.source, String(header.value));
    }
    return map;
  };
  const committed = cspOf(config?.headers);
  if (committed.size === 0) return [];

  const fresh = cspOf(generated);
  const problems = [];
  for (const [source, csp] of fresh) {
    if (!committed.has(source)) problems.push(`vercel.json has no CSP for ${source}`);
    else if (committed.get(source) !== csp)
      problems.push(`vercel.json CSP for ${source} is out of date`);
  }
  for (const source of committed.keys()) {
    if (!fresh.has(source))
      problems.push(`vercel.json has a CSP for ${source}, which is no longer a page`);
  }
  return problems;
}

/* -------------------------------------------------------------------------------------------- */
/* security.txt (RFC 9116)                                                                      */
/* -------------------------------------------------------------------------------------------- */

/** RFC 9116 asks for an expiry less than a year ahead, so the file cannot go stale unnoticed. */
export const SECURITY_TXT_VALID_DAYS = 364;

/**
 * @param {Date} [now]
 * @param {number} [days]
 * @returns {Date}
 */
export function securityTxtExpires(now = new Date(), days = SECURITY_TXT_VALID_DAYS) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/** One header-style line. A line break in a value would inject a field. */
function field(name, value) {
  if (/[\r\n\x00-\x1f\x7f]/.test(value)) throw new Error(`Unsafe security.txt value for ${name}`);
  return `${name}: ${value}`;
}

/**
 * RFC 9116 file body. `contact` is an email address or a full URI. `expires` is a Date or an
 * ISO 8601 string and is written in UTC.
 *
 * @param {{ contact: string; expires: Date | string; canonical: string; policy?: string }} input
 * @returns {string}
 */
export function buildSecurityTxt({ contact, expires, canonical, policy }) {
  const expiry = expires instanceof Date ? expires : new Date(expires);
  if (Number.isNaN(expiry.getTime())) throw new Error("security.txt: Expires is not a valid date");
  const contactUri = /^[a-z][a-z0-9+.-]*:/i.test(contact) ? contact : `mailto:${contact}`;
  const lines = [
    field("Contact", contactUri),
    field("Expires", expiry.toISOString().replace(/\.\d{3}Z$/, "Z")),
    field("Preferred-Languages", "en"),
    field("Canonical", canonical),
    ...(policy ? [field("Policy", policy)] : []),
  ];
  return `${lines.join("\n")}\n`;
}

/**
 * Problems with a security.txt body. Empty when it has the required fields and has not expired.
 *
 * @param {string} text
 * @param {Date} [now]
 * @returns {string[]}
 */
export function verifySecurityTxt(text, now = new Date()) {
  const problems = [];
  /** @type {Map<string, string[]>} */
  const fields = new Map();
  for (const line of text.split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (line.trim() === "" || line.startsWith("#") || index === -1) continue;
    const name = line.slice(0, index).trim().toLowerCase();
    fields.set(name, [...(fields.get(name) ?? []), line.slice(index + 1).trim()]);
  }
  const contact = fields.get("contact") ?? [];
  if (contact.length === 0) problems.push("Contact is missing");
  for (const value of contact) {
    if (!/^(?:mailto:[^\s@]+@[^\s@]+|https:\/\/\S+|tel:\S+)$/i.test(value)) {
      problems.push(`Contact is not a mailto:, https: or tel: URI: ${value}`);
    }
  }
  const expires = fields.get("expires") ?? [];
  if (expires.length !== 1) problems.push("Expires must appear exactly once");
  else {
    const when = new Date(expires[0] ?? "");
    if (Number.isNaN(when.getTime())) problems.push(`Expires is not a valid date: ${expires[0]}`);
    else if (when.getTime() <= now.getTime())
      problems.push(`Expires is in the past: ${expires[0]}`);
  }
  return problems;
}

/* -------------------------------------------------------------------------------------------- */
/* Site configuration                                                                           */
/* -------------------------------------------------------------------------------------------- */

/**
 * Reads the public email address and canonical origin from the source text of lib/site.ts, so the
 * build script has no second copy of either. Throws if the file no longer has the expected shape:
 * a wrong security.txt contact must fail the build, not ship.
 *
 * @param {string} source contents of lib/site.ts
 * @param {Record<string, string | undefined>} [env] process.env; NEXT_PUBLIC_SITE_URL overrides the default
 * @returns {{ email: string; url: string; origin: string }}
 */
export function parseSiteConfig(source, env = {}) {
  const email = /\bemail:\s*"([^"\s]+@[^"\s]+)"/.exec(source)?.[1];
  if (!email) throw new Error("lib/site.ts: could not find the `email` constant");

  const fallback = /NEXT_PUBLIC_SITE_URL\s*\?\?\s*"([^"]+)"/.exec(source)?.[1];
  const raw = env.NEXT_PUBLIC_SITE_URL ?? fallback;
  if (!raw) throw new Error("lib/site.ts: could not find the default site URL");

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Site URL is not a valid URL: ${raw}`);
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw new Error(`Site URL must use https: ${raw}`);
  }
  return { email, url: raw.replace(/\/+$/, ""), origin: parsed.origin };
}
