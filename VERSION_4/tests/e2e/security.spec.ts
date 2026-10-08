import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { INIT_SCRIPT } from "../../lib/preferences";
import { site } from "../../lib/site";
import { builtPages, readOut, walkOut } from "./built-site";

/**
 * Static checks on the built output. No browser: these read out/ the way a crawler or a reviewer
 * would. They are written independently of scripts/lib/csp.mjs on purpose, so a mistake in the
 * generator cannot hide itself from the check.
 */

const pages = builtPages();

type Tag = { name: string; attrs: Record<string, string> };

/** Start tags with their attributes, skipping comments and the insides of <script> and <style>. */
function tags(html: string): Tag[] {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2")
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, "$1$2");
  const found: Tag[] = [];
  for (const match of stripped.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const attrs: Record<string, string> = {};
    for (const attr of (match[2] ?? "").matchAll(
      /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
    )) {
      attrs[(attr[1] ?? "").toLowerCase()] = (attr[2] ?? attr[3] ?? attr[4] ?? "").replace(
        /&amp;/g,
        "&",
      );
    }
    found.push({ name: (match[1] ?? "").toLowerCase(), attrs });
  }
  return found;
}

/** Bodies of inline scripts a browser would execute (not data blocks, not external). */
function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const match of html
    .replace(/<!--[\s\S]*?-->/g, "")
    .matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1] ?? "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type !== undefined && !/^(module|(text|application)\/(x-)?(java|ecma)script)$/.test(type))
      continue;
    scripts.push(match[2] ?? "");
  }
  return scripts;
}

const FETCHING_LINK =
  /\b(stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|apple-touch-icon|manifest)\b/i;
const EMBEDDING = new Set([
  "script",
  "img",
  "iframe",
  "source",
  "video",
  "audio",
  "embed",
  "object",
  "form",
]);

/** URLs a tag makes the browser fetch or submit to. Plain links (<a href>) are not subresources. */
function resourceUrls(tag: Tag): string[] {
  const { attrs } = tag;
  if (tag.name === "link")
    return FETCHING_LINK.test(attrs.rel ?? "") && attrs.href ? [attrs.href] : [];
  if (!EMBEDDING.has(tag.name)) return [];
  const srcset = (attrs.srcset ?? "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "");
  return [attrs.src, attrs.data, attrs.action, ...srcset].filter((url): url is string =>
    Boolean(url),
  );
}

const sha256 = (text: string) =>
  `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

/** Inline scripts this site is allowed to ship: its own init script and Next.js flight-data pushes. */
const ALLOWED_INLINE: readonly (string | RegExp)[] = [
  INIT_SCRIPT,
  /^\(self\.__next_f\s*=\s*self\.__next_f\s*\|\|\s*\[\]\)\.push\(\[0\]\)$/,
  /^self\.__next_f\.push\(\[[\s\S]*\]\)$/,
];

const isAllowed = (script: string) =>
  ALLOWED_INLINE.some((rule) =>
    typeof rule === "string" ? script === rule : rule.test(script.trim()),
  );

test.describe("built pages", () => {
  test("the export contains pages", () => {
    expect(pages.length).toBeGreaterThan(5);
    expect(pages.map((p) => p.path)).toEqual(expect.arrayContaining(["/", "/privacy/", "/404.html"]));
  });

  for (const page of pages) {
    test(`${page.path}: only the allowed inline scripts exist`, () => {
      const unexpected = inlineScripts(page.html).filter((script) => !isAllowed(script));
      expect(
        unexpected.map((script) => script.slice(0, 80)),
        "inline scripts that are neither the theme init script nor Next.js flight data",
      ).toEqual([]);
      expect(inlineScripts(page.html), "theme init script is present").toContain(INIT_SCRIPT);
    });

    test(`${page.path}: no inline handlers, javascript: URLs or third-party subresources`, () => {
      const origin = new URL(site.url).origin;
      const problems: string[] = [];
      for (const tag of tags(page.html)) {
        for (const [attr, value] of Object.entries(tag.attrs)) {
          if (/^on[a-z]+$/.test(attr)) problems.push(`<${tag.name}> ${attr}=`);
          if (/^\s*javascript:/i.test(value)) problems.push(`<${tag.name}> ${attr}=javascript:`);
        }
        for (const url of resourceUrls(tag)) {
          const foreign =
            /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url) && new URL(url, origin).origin !== origin;
          if (foreign) problems.push(`<${tag.name}> loads ${url}`);
        }
      }
      expect(problems).toEqual([]);
    });

    test(`${page.path}: new-tab links carry rel="noopener noreferrer"`, () => {
      const bad = tags(page.html)
        .filter((tag) => tag.name === "a" && /^_blank$/i.test(tag.attrs.target ?? ""))
        .filter(
          (tag) =>
            !/\bnoopener\b/i.test(tag.attrs.rel ?? "") ||
            !/\bnoreferrer\b/i.test(tag.attrs.rel ?? ""),
        )
        .map((tag) => tag.attrs.href);
      expect(bad).toEqual([]);
    });

    test(`${page.path}: external links are https`, () => {
      const insecure = tags(page.html)
        .filter((tag) => tag.name === "a")
        .map((tag) => tag.attrs.href ?? "")
        .filter((href) => /^http:\/\//i.test(href));
      expect(insecure).toEqual([]);
    });
  }
});

test.describe("built assets", () => {
  test("CSS and JavaScript reference only same-origin resources", () => {
    const files = walkOut().filter(
      (file) => /\.(css|js)$/.test(file) && file.startsWith("_next/static/"),
    );
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files.filter((f) => f.endsWith(".css"))) {
      const css = readOut(file);
      for (const match of css.matchAll(/(?:@import\s+|url\(\s*)["']?(https?:)?\/\/([^"')\s]+)/gi)) {
        offenders.push(`${file}: ${match[0].slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("no analytics, tag managers or remote font hosts are referenced anywhere in the HTML", () => {
    const banned =
      /googletagmanager|google-analytics|gtag\(|plausible\.io|segment\.com|mixpanel|hotjar|clarity\.ms|fonts\.googleapis|fonts\.gstatic|use\.typekit|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare/i;
    const hits = pages.filter((page) => banned.test(page.html)).map((page) => page.path);
    expect(hits).toEqual([]);
  });
});

test.describe("_headers", () => {
  type Rule = { path: string; headers: [string, string][] };
  const rules: Rule[] = [];
  let current: Rule | undefined;
  for (const line of readOut("_headers").split(/\r?\n/)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) {
      const i = line.indexOf(":");
      current?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    } else {
      current = { path: line.trim(), headers: [] };
      rules.push(current);
    }
  }

  /** Rules that apply to a path: exact match or a trailing /* splat. */
  const applicable = (route: string) =>
    rules.filter(
      (rule) =>
        rule.path === route ||
        (rule.path.endsWith("*") && route.startsWith(rule.path.slice(0, -1))),
    );
  const headerValues = (route: string, name: string) =>
    applicable(route).flatMap((rule) =>
      rule.headers.filter(([n]) => n.toLowerCase() === name.toLowerCase()).map(([, v]) => v),
    );

  test("exists with the baseline security headers on every path", () => {
    const star = rules.find((rule) => rule.path === "/*");
    expect(star).toBeDefined();
    const values = new Map((star?.headers ?? []).map(([n, v]) => [n.toLowerCase(), v]));
    expect(values.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(values.get("x-content-type-options")).toBe("nosniff");
    expect(values.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("permissions-policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    expect(values.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(values.get("x-frame-options")).toBe("DENY");
  });

  for (const page of pages) {
    test(`${page.path}: one CSP, no unsafe-inline or unsafe-eval in script-src, hash for every inline script`, () => {
      const policies = headerValues(page.path, "Content-Security-Policy");
      expect(policies, "exactly one policy applies to the page").toHaveLength(1);
      const directives = new Map(
        (policies[0] ?? "").split(";").map((part) => {
          const [name = "", ...sources] = part.trim().split(/\s+/);
          return [name.toLowerCase(), sources] as const;
        }),
      );
      const scriptSrc = directives.get("script-src") ?? [];
      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
      for (const source of scriptSrc)
        expect(source, "no hosts or wildcards in script-src").toMatch(
          /^('self'|'sha256-[A-Za-z0-9+/]{43}=')$/,
        );
      for (const script of inlineScripts(page.html)) {
        expect(scriptSrc, `hash of inline script ${script.slice(0, 40)}...`).toContain(
          sha256(script),
        );
      }
      expect(directives.get("default-src")).toEqual(["'self'"]);
      expect(directives.get("frame-ancestors")).toEqual(["'none'"]);
      expect(directives.get("object-src")).toEqual(["'none'"]);
      expect(directives.get("base-uri")).toEqual(["'self'"]);
      expect(directives.get("img-src")).toEqual(["'self'"]);
      expect(directives.get("connect-src")).toEqual(["'self'"]);
      // Styles: hashes only. Every inline style attribute value on the page is allowed by hash.
      expect(directives.get("style-src")).toEqual(["'self'"]);
      const attrHashes = directives.get("style-src-attr") ?? [];
      const styleAttrs = new Set(
        [...page.html.matchAll(/\sstyle="([^"]*)"/g)].map((m) =>
          (m[1] ?? "")
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&amp;/g, "&"),
        ),
      );
      if (styleAttrs.size === 0) expect(attrHashes).toEqual([]);
      else {
        expect(attrHashes[0]).toBe("'unsafe-hashes'");
        for (const value of styleAttrs) {
          expect(attrHashes, `hash of style="${value.slice(0, 40)}"`).toContain(sha256(value));
        }
        expect(attrHashes).not.toContain("'unsafe-inline'");
      }
    });
  }

  test("fingerprinted assets are cached as immutable", () => {
    expect(headerValues("/_next/static/chunks/x.js", "Cache-Control")).toEqual([
      "public, max-age=31536000, immutable",
    ]);
  });

  test("headers.vercel.json carries the same policies", () => {
    const vercel = JSON.parse(readOut("headers.vercel.json")) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    expect(vercel.headers.length).toBeGreaterThan(1);
    for (const page of pages) {
      const rule = vercel.headers.find((r) => r.source === page.path);
      const fromHeadersFile = headerValues(page.path, "Content-Security-Policy")[0];
      expect(rule?.headers.find((h) => h.key === "Content-Security-Policy")?.value, page.path).toBe(
        fromHeadersFile,
      );
    }
  });
});

test.describe("security.txt", () => {
  test("is present with Contact and a future Expires (RFC 9116)", () => {
    expect(walkOut()).toContain(".well-known/security.txt");
    const text = readOut(".well-known/security.txt");
    const contact = /^Contact:\s*(.+)$/m.exec(text)?.[1] ?? "";
    expect(contact).toMatch(/^mailto:[^\s@]+@[^\s@]+$/);
    const expires = /^Expires:\s*(.+)$/m.exec(text)?.[1] ?? "";
    expect(expires).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(new Date(expires).getTime()).toBeGreaterThan(Date.now());
    expect(text).toMatch(/^Canonical:\s*https:\/\/\S+\/\.well-known\/security\.txt$/m);
  });

  test("Policy points at the security page, which exists and is in the sitemap", () => {
    const policy = /^Policy:\s*(\S+)$/m.exec(readOut(".well-known/security.txt"))?.[1] ?? "";
    expect(new URL(policy).pathname).toBe("/security/");
    expect(walkOut()).toContain("security/index.html");
    expect(readOut("sitemap.xml")).toContain("/security/</loc>");
  });

  test("the contact address is the one published on the site", () => {
    const home = readOut("index.html");
    const contact = /^Contact:\s*mailto:(\S+)$/m.exec(readOut(".well-known/security.txt"))?.[1];
    expect(contact).toBeDefined();
    expect(home).toContain(contact ?? "unreachable");
  });
});
