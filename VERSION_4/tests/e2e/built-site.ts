import fs from "node:fs";
import path from "node:path";

/**
 * Reads the static export from disk. Used to discover routes and to inspect the built HTML without
 * a browser. The folder is `out` in the project root, or E2E_OUT_DIR (relative to the project root).
 * Playwright loads specs as CommonJS here, so __dirname is available; the cwd is the fallback.
 */
const ROOT = typeof __dirname === "string" ? path.resolve(__dirname, "../..") : process.cwd();
export const OUT_DIR = path.resolve(ROOT, process.env.E2E_OUT_DIR ?? "out");

export function readOut(relativePath: string): string {
  const file = path.join(OUT_DIR, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`${file} does not exist. Run "pnpm build" before "pnpm test:e2e".`);
  }
  return fs.readFileSync(file, "utf8");
}

/** Every file under out/, as paths relative to it (posix separators). */
export function walkOut(dir = OUT_DIR, base = OUT_DIR): string[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`${dir} does not exist. Run "pnpm build" before "pnpm test:e2e".`);
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkOut(full, base)
      : [path.relative(base, full).split(path.sep).join("/")];
  });
}

/** URL path of a built page, or null for files that are not pages. `about/index.html` is `/about/`. */
export function pagePath(file: string): string | null {
  if (!file.endsWith(".html")) return null;
  const parts = file.split("/");
  if (parts.some((part) => part.startsWith("_"))) return null;
  if (parts[parts.length - 1] === "index.html")
    return `/${parts.slice(0, -1).join("/")}${parts.length > 1 ? "/" : ""}`;
  return `/${file}`;
}

/** Page files with their URL paths, including 404.html. */
export function builtPages(): { file: string; path: string; html: string }[] {
  return walkOut().flatMap((file) => {
    const route = pagePath(file);
    return route === null ? [] : [{ file, path: route, html: readOut(file) }];
  });
}

/** Paths listed in out/sitemap.xml, e.g. ["/", "/about/", ...]. Independent of the configured origin. */
export function sitemapPaths(): string[] {
  const xml = readOut("sitemap.xml");
  const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => {
    const loc = (match[1] ?? "").replace(/&amp;/g, "&");
    return new URL(loc).pathname;
  });
  if (paths.length === 0) throw new Error("out/sitemap.xml lists no URLs");
  return paths;
}

const STATIC_ROUTES = [
  "/",
  "/about/",
  "/experience/",
  "/systems/",
  "/research/",
  "/writing/",
  "/certifications/",
  "/resume/",
  "/contact/",
  "/privacy/",
  "/security/",
] as const;

/** The pages a visitor is most likely to see: every top-level page and one of each detail page. */
export function keyRoutes(): string[] {
  const all = sitemapPaths();
  const firstUnder = (prefix: string, preferred?: string) =>
    preferred && all.includes(preferred)
      ? preferred
      : all.find((route) => route.startsWith(prefix) && route !== prefix);
  const details = [
    firstUnder("/systems/", "/systems/witness/"),
    firstUnder("/research/", "/research/witness/"),
    firstUnder("/writing/"),
  ].filter((route): route is string => route !== undefined);
  return [...STATIC_ROUTES, ...details];
}
