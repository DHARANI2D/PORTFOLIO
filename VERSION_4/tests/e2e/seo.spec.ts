import { expect, test } from "@playwright/test";
import { readOut, sitemapPaths } from "./built-site";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

test.describe("metadata files", () => {
  test("robots.txt allows crawling and points at the sitemap", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/User-Agent:\s*\*/i);
    expect(body).toMatch(/Allow:\s*\//i);
    expect(body).not.toMatch(/Disallow:\s*\/\s*$/m);
    expect(body).toMatch(/Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/i);
  });

  test("sitemap.xml lists absolute https URLs with trailing slashes and no duplicates", () => {
    const xml = readOut("sitemap.xml");
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1] ?? "");
    expect(locs.length).toBeGreaterThan(5);
    for (const loc of locs) {
      expect(loc).toMatch(/^https?:\/\/[^/]+\/(?:[a-z0-9-]+\/)*$/);
    }
    expect(new Set(locs).size).toBe(locs.length);
    // Field notes carry a date.
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
  });

  test("the web manifest is valid and its icons exist", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = (await response.json()) as {
      name: string;
      short_name: string;
      icons: { src: string; sizes: string; type: string }[];
    };
    expect(manifest.short_name).toBe("DS");
    expect(manifest.name).toMatch(/Security Engineer/);
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()["content-type"], icon.src).toBe(icon.type);
    }
  });
});

test.describe("page metadata", () => {
  for (const route of sitemapPaths()) {
    test(`${route}: canonical matches the sitemap and the social card resolves`, async ({
      page,
      request,
    }) => {
      const sitemapLoc = [...readOut("sitemap.xml").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
        .map((m) => m[1] ?? "")
        .find((loc) => new URL(loc).pathname === route);

      await page.goto(route);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        sitemapLoc ?? "unreachable",
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        sitemapLoc ?? "unreachable",
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /\S/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );

      // The Open Graph image is a real, same-site PNG.
      const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
      expect(image, "og:image is set").toBeTruthy();
      const response = await request.get(new URL(image ?? "", "http://127.0.0.1").pathname);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect([...(await response.body()).subarray(0, 8)]).toEqual(PNG_SIGNATURE);

      // Structured data parses as JSON.
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.length).toBeGreaterThan(0);
      for (const block of blocks) {
        const data = JSON.parse(block) as { "@context": string; "@type": string };
        expect(data["@context"]).toBe("https://schema.org");
        expect(data["@type"]).toBeTruthy();
      }
    });
  }
});
