import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { readOut } from "./built-site";

/**
 * Content fixes, checked on the built site: field-note dates.
 * The unit tests check the source (tests/unit/content.test.ts). These check what visitors and
 * crawlers actually get.
 */

const NOTES = [
  "siem-alerts-to-correlated-investigations",
  "evidence-boundaries-for-autonomous-security",
  "deterministic-evidence-gate-for-remediation",
];

const ROOT = typeof __dirname === "string" ? path.resolve(__dirname, "../..") : process.cwd();

/** The authoring date docs/FACTS.md section D, rule 4 names, or null once the owner removes the rule. */
function authoringDate(): string | null {
  const facts = fs.readFileSync(path.join(ROOT, "docs/FACTS.md"), "utf8");
  return /authoring date \((\d{4}-\d{2}-\d{2})\)/.exec(facts)?.[1] ?? null;
}

/** Every JSON-LD block of a built page, parsed. */
function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1] ?? "{}") as Record<string, unknown>,
  );
}

test.describe("field-note dates", () => {
  for (const slug of NOTES) {
    test(`${slug}: the page, JSON-LD, social tag and sitemap give one date`, () => {
      const html = readOut(`writing/${slug}/index.html`);

      const visible = /<time[^>]*dateTime="(\d{4}-\d{2}-\d{2})"/i.exec(html)?.[1];
      const article = jsonLd(html).find((block) => block["@type"] === "Article");
      const og = /property="article:published_time"\s+content="([^"]+)"/.exec(html)?.[1];
      const sitemap = new RegExp(
        `<loc>[^<]*/writing/${slug}/</loc>\\s*<lastmod>([^<]+)</lastmod>`,
      ).exec(readOut("sitemap.xml"))?.[1];

      expect(visible, "visible <time>").toBeDefined();
      expect(article?.datePublished, "Article datePublished").toBe(visible);
      expect(og?.slice(0, 10), "article:published_time").toBe(visible);
      expect(sitemap?.slice(0, 10), "sitemap lastmod").toBe(visible);

      // While FACTS says the date is the authoring date, no note may claim another one.
      const authoring = authoringDate();
      if (authoring) expect(visible, "the date FACTS section D names").toBe(authoring);
    });
  }

  test("the notes are not dated on a staggered cadence", () => {
    const dates = NOTES.map(
      (slug) =>
        /<time[^>]*dateTime="(\d{4}-\d{2}-\d{2})"/i.exec(
          readOut(`writing/${slug}/index.html`),
        )?.[1],
    );
    if (authoringDate()) expect(new Set(dates).size, dates.join(", ")).toBe(1);
  });
});
