import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { site } from "@/lib/site";

// getWritingPosts() imports compiled MDX, which Vitest does not compile. The notes are supplied by hand.
vi.mock("@/lib/writing", () => ({
  getWritingPosts: async () => [
    { slug: "newer-note", meta: { date: "2026-09-20" } },
    { slug: "older-note", meta: { date: "2026-08-01" } },
  ],
}));

const publicDir = path.join(import.meta.dirname, "../../public");

describe("sitemap", () => {
  it("lists every page: the home page, the standalone pages and notes", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const route of [
      "/",
      "/resume/",
      "/privacy/",
    ]) {
      expect(urls, route).toContain(`${site.url}${route}`);
    }
    // Systems and research have no pages, so neither is in the sitemap.
    expect(urls.filter((url) => url.includes("/systems/"))).toEqual([]);
    expect(urls.filter((url) => url.includes("/research/"))).toEqual([]);
    expect(urls).toContain(`${site.url}/writing/newer-note/`);
    expect(urls).toContain(`${site.url}/writing/older-note/`);
  });

  it("uses absolute URLs with a trailing slash and no duplicates", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const url of urls) {
      expect(url.startsWith(`${site.url}/`), url).toBe(true);
      expect(url.endsWith("/"), url).toBe(true);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("dates only what has a date: the notes", async () => {
    const entries = await sitemap();
    const dated = entries.filter((entry) => entry.lastModified !== undefined);
    expect(dated.map((entry) => entry.url).sort()).toEqual([
      `${site.url}/writing/newer-note/`,
      `${site.url}/writing/older-note/`,
    ]);
    expect(entries.find((entry) => entry.url.endsWith("/newer-note/"))?.lastModified).toBe(
      "2026-09-20",
    );
  });
});

describe("robots", () => {
  it("allows everything and names the sitemap", () => {
    const result = robots();
    expect(result.rules).toEqual([{ userAgent: "*", allow: "/" }]);
    expect(result.sitemap).toBe(`${site.url}/sitemap.xml`);
  });
});

describe("manifest", () => {
  const result = manifest();

  it("names the site and uses the short name DS", () => {
    expect(result.short_name).toBe("DS");
    expect(result.name).toBe(site.title);
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("browser");
  });

  it("uses the dark background token for both colours", () => {
    const css = fs.readFileSync(path.join(import.meta.dirname, "../../app/globals.css"), "utf8");
    const background = /--background:\s*(#[0-9a-f]{6})/i.exec(css)?.[1];
    expect(background).toBeDefined();
    expect(result.background_color?.toLowerCase()).toBe(background?.toLowerCase());
    expect(result.theme_color?.toLowerCase()).toBe(background?.toLowerCase());
  });

  it("points at icons that exist, at the sizes it claims", () => {
    expect(result.icons?.length).toBeGreaterThan(0);
    for (const icon of result.icons ?? []) {
      const file = path.join(publicDir, icon.src);
      expect(fs.existsSync(file), icon.src).toBe(true);
      const png = fs.readFileSync(file);
      // PNG IHDR: width and height are big-endian 32-bit integers at offsets 16 and 20.
      const [width, height] = (icon.sizes ?? "").split("x").map(Number);
      expect(png.readUInt32BE(16), icon.src).toBe(width);
      expect(png.readUInt32BE(20), icon.src).toBe(height);
    }
  });
});
