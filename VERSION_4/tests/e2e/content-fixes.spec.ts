import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { readOut } from "./built-site";

/**
 * Content fixes, checked on the built site: field-note dates and the two flagship diagrams.
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

/**
 * The text-only version of the diagram (one paragraph per node, in reading order) that assistive
 * tech reads. textContent also reads it while it is visually hidden, so this works at every width.
 */
const nodeItems = (page: Page) => page.locator("#architecture .sr-only li");

/** The text of one node of the diagram, found by its label. */
async function nodeText(page: Page, label: string): Promise<string> {
  const item = nodeItems(page)
    .filter({ hasText: new RegExp(`^Node \\d+ of \\d+: ${label}[,.]`) })
    .first();
  return ((await item.textContent()) ?? "").replace(/\s+/g, " ").trim();
}

/** The names listed after "Receives from" or "Sends to" in a node's text, e.g. "Validation". */
const listedAfter = (text: string, heading: "Receives from" | "Sends to"): string =>
  new RegExp(`${heading} ([^.]*)\\.`).exec(text)?.[1]?.trim() ?? "";

test.describe("SignalFusion Core diagram", () => {
  test("every route to Response passes through the Analyst", async ({ page }) => {
    await page.goto("/systems/signalfusion-core/");
    const investigation = await nodeText(page, "AI investigation");
    const analyst = await nodeText(page, "Analyst");
    const response = await nodeText(page, "Response");

    expect(listedAfter(investigation, "Sends to")).toBe("Analyst");
    expect(listedAfter(analyst, "Receives from")).toBe("AI investigation");
    expect(listedAfter(analyst, "Sends to")).toBe("Response");
    expect(listedAfter(response, "Receives from")).toBe("Analyst");
  });

  test("the caption and the boundary agree with the route", async ({ page }) => {
    await page.goto("/systems/signalfusion-core/");
    const text = ((await page.locator("#architecture").textContent()) ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/An analyst reviews the investigation/);
    expect(text).toMatch(/Human judgment sits between AI analysis and action/);
    expect(text).not.toMatch(/acted on after review/);
  });
});

test.describe("WITNESS diagram", () => {
  test("lists the checks in the order Evidence, Corroboration, Policy, Validation, Decision", async ({
    page,
  }) => {
    await page.goto("/systems/witness/");
    const labels = (await nodeItems(page).allTextContents()).map(
      (text) => /^Node \d+ of \d+: ([^,]+),/.exec(text.trim())?.[1] ?? "",
    );
    const order = ["Evidence", "Corroboration", "Policy", "Validation", "Decision"];
    const at = order.map((name) => labels.indexOf(name));
    expect(
      at.every((index) => index >= 0),
      labels.join(" | "),
    ).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  test("every node that receives something names where it comes from", async ({ page }) => {
    await page.goto("/systems/witness/");
    const policy = await nodeText(page, "Policy");
    expect(listedAfter(policy, "Receives from")).toBe("Corroboration");
    const decision = await nodeText(page, "Decision");
    expect(listedAfter(decision, "Receives from")).toBe("Validation");
    expect(decision).toMatch(/Any fail gives deny/);
    expect(decision).toMatch(/All pass gives allow/);
    const execution = await nodeText(page, "Execution");
    expect(listedAfter(execution, "Receives from")).toBe("Decision, Environment state");
    expect(execution).toMatch(/Re-validates the environment state/);
  });

  test("each check says what pass, fail and insufficient mean", async ({ page }) => {
    await page.goto("/systems/witness/");
    for (const check of ["Evidence", "Corroboration", "Policy", "Validation"]) {
      const text = await nodeText(page, check);
      expect(text, check).toMatch(/\bPass\b/);
      expect(text, check).toMatch(/\bfail\b/i);
      expect(text, check).toMatch(/\binsufficient\b/i);
    }
  });

  test("the threat model names the stale-evidence case", async ({ page }) => {
    await page.goto("/systems/witness/");
    const text = ((await page.locator("#threat-model").textContent()) ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/time of check to time of use/i);
    expect(text).toMatch(/re-validated when the action executes/i);
  });
});
