import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { THEME_KEY } from "../../lib/preferences";
import { waitForHydration } from "./helpers";

/**
 * Systems pages: diagram geometry, the stacked fallback, the detail panel, node semantics, the
 * signal pass, thin pages, onward links and the three information layers. Fixes D3, D4, D5, D10,
 * A11Y-6, UX-06, UX-07, UX-11 and perf-5. Pure geometry is also checked without a browser in
 * tests/unit/diagram-layout.test.ts; these run against the built, hydrated pages.
 */

const FLAGSHIPS = ["witness", "signalfusion-core"] as const;
const THIN = [
  "helios",
  "desas",
  "owl",
  "securemodelgate",
  "silentstorm",
  "ml-incident-response",
] as const;

const figure = (page: Page) => page.locator("#architecture figure");
const panel = (page: Page) => figure(page).locator('[aria-live="polite"]').first();
const nodeButton = (page: Page, label: string) =>
  figure(page).locator(`svg [role="button"][aria-label^="${label},"]`).first();

async function openDiagram(page: Page, slug: string, hash = "#architecture") {
  await page.goto(`/systems/${slug}/${hash}`);
  await waitForHydration(page);
}

function desktopOnly(testInfo: { project: { name: string } }) {
  test.skip(testInfo.project.name !== "desktop", "viewport is set by the test");
}

/* ------------------------------------------------------------------ D3 */

test.describe("diagram geometry (D3)", () => {
  for (const slug of FLAGSHIPS) {
    test(`${slug}: no edge runs through a trust-boundary label`, async ({ page }, testInfo) => {
      desktopOnly(testInfo);
      await page.setViewportSize({ width: 1440, height: 900 });
      await openDiagram(page, slug);

      const { hits, labelCount } = await page.evaluate(() => {
        const svg = document.querySelector<SVGSVGElement>("#architecture figure svg[role=group]");
        if (!svg) return { hits: ["no svg"], labelCount: 0 };
        const labels = [...svg.querySelectorAll<SVGTextElement>("text[stroke-width='4']")].map(
          (text) => ({ text: text.textContent ?? "", box: text.getBBox() }),
        );
        const found: string[] = [];
        for (const path of svg.querySelectorAll<SVGPathElement>("path[pathLength='1']")) {
          const length = path.getTotalLength();
          for (let at = 0; at <= length; at += 1.5) {
            const point = path.getPointAtLength(at);
            for (const { text, box } of labels) {
              if (
                point.x >= box.x - 2 &&
                point.x <= box.x + box.width + 2 &&
                point.y >= box.y - 1 &&
                point.y <= box.y + box.height + 1
              ) {
                found.push(
                  `edge crosses "${text}" near ${Math.round(point.x)},${Math.round(point.y)}`,
                );
                at = length;
                break;
              }
            }
          }
        }
        return { hits: [...new Set(found)], labelCount: labels.length };
      });
      expect(labelCount, "the diagram has boundary labels to check").toBeGreaterThan(0);
      expect(hits).toEqual([]);
    });
  }

  test("signalfusion-core: HUMAN JUDGMENT is still whole, left of the edge into the Analyst", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "signalfusion-core");
    const text = await figure(page).locator("svg text[stroke-width='4']").allTextContents();
    expect(text.join(" ")).toContain("HUMAN");
    expect(text.join(" ")).toContain("JUDGMENT");
  });
});

/* ------------------------------------------------------------------ D4 */

test.describe("stacked fallback (D4)", () => {
  const WIDTHS = [
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 640 },
  ];

  for (const size of WIDTHS) {
    test(`witness at ${size.width}px: grouped rows, no connectors, no overflow`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo);
      await page.setViewportSize(size);
      await page.goto("/systems/witness/");
      await waitForHydration(page);

      const rows = figure(page).locator("details");
      await expect(rows).toHaveCount(10);
      await expect(figure(page).locator("svg[role=group]")).toBeHidden();

      // No connector lines between rows: they implied a sequence that is not in the data.
      await expect(figure(page).locator("ol span.w-px")).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      // Each row says what it feeds, in text.
      const summary = (name: string) =>
        rows.filter({ hasText: new RegExp(`^\\s*STAGE \\d+\\s*·\\s*\\w+\\s*${name}`) }).first();
      await expect(summary("Decision")).toContainText("Escalated, Denied, Execution");
      await expect(summary("Environment state")).toContainText(
        "Evidence, Corroboration, Execution",
      );
      await expect(summary("Agent proposal")).toContainText("Feeds → Evidence");

      // The three outcomes of Decision share a stage number, so they read as alternatives.
      const stageOf = async (name: string) =>
        (await summary(name).locator("summary").innerText()).match(/STAGE (\d+)/)?.[1];
      const outcome = await stageOf("Denied");
      expect(outcome).toBeDefined();
      expect(await stageOf("Escalated")).toBe(outcome);
      expect(await stageOf("Execution")).toBe(outcome);
      expect(await stageOf("Decision")).not.toBe(outcome);
    });
  }

  test("at 1024 the rows use the width of the figure and siblings sit side by side", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/systems/witness/");
    await waitForHydration(page);

    const box = async (sublabel: string) => {
      const row = figure(page)
        .locator("details")
        .filter({ has: page.locator("summary", { hasText: sublabel }) })
        .first();
      return (await row.boundingBox())!;
    };
    const fig = (await figure(page).boundingBox())!;
    const evidence = await box("Is there observable evidence");
    // It used to be a 670px column in a 944px figure. Now the rows fill it, less the padding and
    // the dashed group around them.
    expect(evidence.width).toBeGreaterThan(fig.width * 0.85);

    const escalated = await box("Evidence does not settle it");
    const denied = await box("Does not execute");
    expect(Math.abs(escalated.y - denied.y)).toBeLessThan(2);
    expect(denied.x).toBeGreaterThan(escalated.x + escalated.width - 1);
  });

  test("at the phone's own width the rows replace the diagram, with no overflow", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "needs a phone-width viewport");
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    await expect(figure(page).locator("svg[role=group]")).toBeHidden();
    await expect(figure(page).locator("details")).toHaveCount(10);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a row opens to its detail and only one is open at a time", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    const rows = figure(page).locator("details");
    await rows.nth(2).locator("summary").click();
    await expect(rows.nth(2)).toHaveAttribute("open", "");
    await expect(rows.nth(2)).toContainText("RECEIVES FROM");
    await rows.nth(3).locator("summary").click();
    await expect(rows.nth(3)).toHaveAttribute("open", "");
    await expect(rows.nth(2)).not.toHaveAttribute("open", "");
  });
});

/* ------------------------------------------------------- D10 and A11Y-6 */

test.describe("detail panel and node semantics (D10, A11Y-6)", () => {
  test("hovering a node on a 900px screen shows its detail on screen", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");
    // Put the figure at the top of the screen, as a jump to the section does.
    await page.evaluate(() =>
      document.querySelector("#architecture figure")?.scrollIntoView({ block: "start" }),
    );
    await page.waitForTimeout(400);

    for (const name of ["Execution", "Environment state", "Escalated"]) {
      await nodeButton(page, name).hover();
      await expect(panel(page)).toContainText(name);
      const box = (await panel(page).boundingBox())!;
      expect(box.y, `${name}: panel top`).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, `${name}: panel bottom`).toBeLessThanOrEqual(900);
      // The INPUT / PROCESS / OUTPUT columns are in the panel, so they are on screen too.
      await expect(panel(page).getByText("PROCESS", { exact: true })).toBeInViewport();
    }
  });

  test("the panel stays pinned under the header while the diagram is on screen", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");
    await page.evaluate(() => {
      const el = document.querySelector("#architecture figure");
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 180);
    });
    await page.waitForTimeout(300);
    const box = (await panel(page).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(60);
    expect(box.y).toBeLessThanOrEqual(110);
  });

  test("a node that takes focus is never hidden under the pinned panel (WCAG 2.4.11)", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");
    // Scroll until the top of the diagram is well above the bottom edge of the pinned panel.
    await page.evaluate(() => {
      const svg = document.querySelector("#architecture figure svg[role=group]");
      if (svg) window.scrollTo(0, svg.getBoundingClientRect().top + window.scrollY + 120);
    });
    await page.waitForTimeout(300);
    for (const name of ["Escalated", "Evidence", "Agent proposal"]) {
      await nodeButton(page, name).focus();
      await page.waitForTimeout(150);
      const node = (await nodeButton(page, name).boundingBox())!;
      const dock = (await panel(page)
        .locator("xpath=ancestor::div[contains(@class,'sticky')][1]")
        .boundingBox())!;
      expect(node.y, `${name} below the panel`).toBeGreaterThanOrEqual(dock.y + dock.height);
    }
  });

  test("changing the selection moves nothing: the figure and the panel keep their height", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");
    const heights = async () => ({
      figure: Math.round((await figure(page).boundingBox())!.height),
      panel: Math.round((await panel(page).boundingBox())!.height),
      svg: Math.round((await figure(page).locator("svg[role=group]").boundingBox())!.height),
    });
    const before = await heights();
    const labels = await figure(page)
      .locator("svg [role=button]")
      .evaluateAll((nodes) =>
        nodes.map((n) => (n.getAttribute("aria-label") ?? "").split(",")[0] ?? ""),
      );
    expect(labels.length).toBe(10);
    for (const label of labels) {
      await nodeButton(page, label).focus();
      await expect(panel(page)).toContainText(label);
      expect(await heights(), label).toEqual(before);
    }
  });

  test("nodes are not toggles: no aria-pressed, aria-current marks the shown node", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");

    const nodes = figure(page).locator("svg [role=button]");
    await expect(nodes).toHaveCount(10);
    expect(await figure(page).locator("[aria-pressed]").count()).toBe(0);

    const panelId = await panel(page).getAttribute("id");
    expect(panelId).toBeTruthy();
    for (const node of await nodes.all()) {
      await expect(node).toHaveAttribute("aria-controls", panelId!);
    }

    // Tab through them: exactly the focused node is current, and the panel follows it.
    await nodeButton(page, "Agent proposal").focus();
    for (let i = 0; i < 10; i++) {
      const focused = page.locator("svg [role=button]:focus");
      const label = ((await focused.getAttribute("aria-label")) ?? "").split(",")[0] ?? "";
      await expect(focused).toHaveAttribute("aria-current", "true");
      await expect(figure(page).locator("svg [role=button][aria-current]")).toHaveCount(1);
      await expect(panel(page)).toContainText(label);
      expect(await figure(page).locator("[aria-pressed]").count()).toBe(0);
      if (i < 9) await page.keyboard.press("Tab");
    }
  });

  test("the text alternative lists every node in step with the panel", async ({
    page,
  }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openDiagram(page, "witness");
    const items = figure(page).locator(".sr-only li");
    await expect(items).toHaveCount(10);
    await nodeButton(page, "Policy").focus();
    const text =
      (await items
        .filter({ hasText: /: Policy,/ })
        .first()
        .textContent()) ?? "";
    const shown = (await panel(page).textContent()) ?? "";
    // The panel and the text list describe the node with the same words.
    for (const phrase of ["Is this action permitted", "Applies explicit, deterministic rules"]) {
      expect(text).toContain(phrase);
      expect(shown).toContain(phrase);
    }
  });
});

/* -------------------------------------------------------------- perf-5 */

test.describe("signal pass (perf-5)", () => {
  test("one finite pass, then the diagram rests", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    await page.evaluate(() =>
      document.querySelector("#architecture figure")?.scrollIntoView({ block: "start" }),
    );

    // While it runs: every animation is a single pass, and a pulse really shows up.
    await expect
      .poll(() => page.locator("#architecture svg animateMotion").count(), { timeout: 4000 })
      .toBeGreaterThan(0);
    const repeats = await page
      .locator("#architecture svg animateMotion, #architecture svg animate")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("repeatCount")));
    expect(new Set(repeats)).toEqual(new Set(["1"]));
    const durations = await page
      .locator("#architecture svg animateMotion")
      .evaluateAll((nodes) => nodes.map((n) => parseFloat(n.getAttribute("dur") ?? "99")));
    expect(Math.max(...durations)).toBeLessThanOrEqual(5);

    let seen = false;
    const until = Date.now() + 5200;
    while (Date.now() < until && !seen) {
      seen = await page.evaluate(() =>
        [...document.querySelectorAll<SVGCircleElement>("#architecture svg circle")].some(
          (circle) => parseFloat(getComputedStyle(circle).opacity) > 0.5,
        ),
      );
      await page.waitForTimeout(60);
    }
    expect(seen, "a pulse became visible").toBe(true);

    // After the pass nothing is left running: no SMIL element, no CSS animation, no signal.
    await expect
      .poll(
        () => page.locator("#architecture svg animateMotion, #architecture svg animate").count(),
        {
          timeout: 7000,
        },
      )
      .toBe(0);
    await expect(page.locator("#architecture svg circle")).toHaveCount(0);
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (a) => a.effect && (a.effect as KeyframeEffect).target?.closest?.("#architecture"),
          )
          .filter(
            (a) =>
              a.playState === "running" && a.effect?.getComputedTiming().iterations === Infinity,
          ).length,
    );
    expect(running).toBe(0);
  });

  test("it does not start while the diagram is offscreen", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    await expect(page.locator("#architecture svg animateMotion")).toHaveCount(0);
  });
});

test.describe("signal pass under reduced motion (perf-5)", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing animates and the diagram is drawn in full", async ({ page }, testInfo) => {
    desktopOnly(testInfo);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    await page.evaluate(() =>
      document.querySelector("#architecture figure")?.scrollIntoView({ block: "start" }),
    );
    await page.waitForTimeout(2000);
    await expect(
      page.locator("#architecture svg animateMotion, #architecture svg animate"),
    ).toHaveCount(0);
    await expect(page.locator("#architecture [data-phase]").first()).toHaveAttribute(
      "data-phase",
      "static",
    );
    await expect(figure(page).locator("svg [role=button]")).toHaveCount(10);
  });
});

/* ----------------------------------------------------- UX-06 and D5 */

test.describe("thin pages and the case-study wording (UX-06, D5)", () => {
  test("cards say OVERVIEW unless the system has an architecture diagram", async ({ page }) => {
    await page.goto("/");
    for (const slug of [...FLAGSHIPS, ...THIN]) {
      const link = page.locator(`article h3 a[href="/systems/${slug}/"]`);
      const card = link.locator("xpath=ancestor::article");
      const text = (await card.textContent()) ?? "";
      const thin = (THIN as readonly string[]).includes(slug);
      expect(text, slug).toContain(thin ? "OVERVIEW" : "CASE STUDY");
      expect(text, slug).not.toContain(thin ? "CASE STUDY" : "OVERVIEW");
      await expect(link).toContainText(thin ? "overview" : "case study");
    }
  });

  test("the index does not promise a case study for every system", async ({ page }) => {
    await page.goto("/");
    const intro = (await page.locator("#systems-heading").locator("xpath=../following-sibling::p").textContent()) ?? "";
    expect(intro).not.toMatch(/each one has a case study/i);
    expect(intro).toMatch(/architecture diagram/i);
    expect(intro).toMatch(/overview/i);
  });

  for (const slug of THIN) {
    test(`${slug}: titled an overview, one fact said once, no empty blocks`, async ({ page }) => {
      await page.goto(`/systems/${slug}/`);
      await expect(page).toHaveTitle(/ overview/i);
      expect(await page.title()).not.toMatch(/case study/i);

      const main = page.locator("main");
      const text = ((await main.innerText()) ?? "").replace(/\s+/g, " ");
      expect(text).not.toMatch(/intentionally short/i);
      expect(text).not.toMatch(/3-second|30-second|5-minute/i);
      expect(text).not.toMatch(/case study/i);

      // The lines of the page (tagline, summary, overview) are all different.
      const lines = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const tagline = h1?.closest("header")?.querySelector("p.headline")?.textContent ?? "";
        const overview = [...document.querySelectorAll("#overview p")].map(
          (p) => p.textContent ?? "",
        );
        return [tagline, ...overview];
      });
      const norm = (t: string) =>
        t
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      expect(lines.filter(Boolean).length).toBeGreaterThanOrEqual(2);
      expect(new Set(lines.map(norm)).size).toBe(lines.length);

      // One flow, drawn once, and no section of its own for it.
      await expect(
        page.locator(`ol[aria-label="${(await page.locator("h1").textContent())?.trim()} flow"]`),
      ).toHaveCount(1);
      await expect(page.locator("#flow")).toHaveCount(0);
      for (const heading of await page.locator("main h2").all()) {
        expect(((await heading.textContent()) ?? "").trim()).not.toBe("");
      }
    });
  }

  test("the category is left out when it only repeats the domain", async ({ page }) => {
    await page.goto("/systems/owl/");
    await expect(page.locator("header dl")).not.toContainText("CATEGORY");
    await expect(page.locator("header dl")).toContainText("DOMAIN");
    await page.goto("/systems/desas/");
    await expect(page.locator("header dl")).toContainText("CATEGORY");
  });

  test("meta descriptions are whole sentences of at most 155 characters", async ({ page }) => {
    for (const slug of [...FLAGSHIPS, ...THIN]) {
      await page.goto(`/systems/${slug}/`);
      const description =
        (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(description.length, slug).toBeGreaterThan(40);
      expect(description.length, slug).toBeLessThanOrEqual(155);
      expect(description, slug).toMatch(/[.!?]$/);
      expect(description, slug).not.toMatch(/…|\.\.\./);
    }
  });
});

/* -------------------------------------------------------------- UX-07 */

test.describe("onward links (UX-07)", () => {
  const EXPECTED: Record<string, string[]> = {
    witness: [
      "/research/witness/",
      "/research/securemodelgate/",
      "/writing/evidence-boundaries-for-autonomous-security/",
      "/writing/deterministic-evidence-gate-for-remediation/",
    ],
    "signalfusion-core": ["/writing/siem-alerts-to-correlated-investigations/"],
    helios: ["/research/ai-dfir/"],
  };

  for (const [slug, hrefs] of Object.entries(EXPECTED)) {
    test(`${slug} links to its research and field notes, and every link resolves`, async ({
      page,
    }) => {
      await page.goto(`/systems/${slug}/`);
      const related = page.locator("#related");
      await expect(related).toBeVisible();
      const found = await related
        .locator("a")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
      for (const href of hrefs) expect(found, `${slug} -> ${href}`).toContain(href);
      for (const href of found) {
        const response = await page.request.get(href ?? "/");
        expect(response.status(), href ?? "").toBe(200);
      }
    });
  }

  test("a system with nothing to point at has no empty RELATED block", async ({ page }) => {
    await page.goto("/systems/desas/");
    await expect(page.locator("#related")).toHaveCount(0);
  });

  test("RELATED is reachable from the page's own jump links", async ({
    page,
  }) => {
    await page.goto("/systems/witness/");
    await expect(
      page.locator('nav[aria-label="Case study sections"] a[href="#related"]'),
    ).toBeVisible();
    await expect(page.locator("#related")).toBeVisible();
  });
});

/* -------------------------------------------------------------- UX-11 */

test.describe("three layers of information (UX-11)", () => {
  test("a case study names its layers: what it is, why it matters, how it works", async ({
    page,
  }) => {
    await page.goto("/systems/witness/");
    const header = page.locator("main article header");
    await expect(header).toContainText("WHAT IT IS");
    await expect(header).toContainText("WHY IT MATTERS");
    // The 30-second block carries the summary, which is not the tagline.
    const block = header.locator("p", { hasText: "WHY IT MATTERS" }).locator("xpath=..");
    const summary = ((await block.locator("p").last().textContent()) ?? "").trim();
    const tagline = ((await header.locator("p.headline").textContent()) ?? "").trim();
    expect(summary.length).toBeGreaterThan(40);
    expect(summary.toLowerCase()).not.toBe(tagline.toLowerCase());
    await expect(page.locator("main")).toContainText("HOW IT WORKS");
    await expect(page.locator("main")).not.toContainText("THE 30-SECOND VERSION");
  });
});

/* --------------------------------------------------------- 320px safe */

test.describe("small screens", () => {
  for (const slug of [...FLAGSHIPS, ...THIN]) {
    test(`${slug}: nothing scrolls sideways at 320px, open rows included`, async ({
      page,
    }, testInfo) => {
      desktopOnly(testInfo);
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(`/systems/${slug}/`);
      await waitForHydration(page);
      // Open every row of the stacked diagram in turn: the widest detail must still fit.
      const rows = page.locator("#architecture details");
      for (let i = 0; i < (await rows.count()); i++) {
        await rows.nth(i).locator("summary").click();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${slug} row ${i}`).toBeLessThanOrEqual(0);
      }
      const clipped = await page.evaluate(
        () =>
          [...document.querySelectorAll("main *")].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > window.innerWidth + 1;
          }).length,
      );
      expect(clipped, `${slug}: elements past the right edge`).toBe(0);
    });
  }
});

/* ----------------------------------------------------------------- axe */

test.describe("axe on the reshaped systems pages", () => {
  // Reduced motion keeps the scan deterministic: entrance animations leave text partly transparent.
  test.use({ reducedMotion: "reduce" });
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
  const PAGES = [
    { slug: "witness", width: 1440, height: 900 },
    { slug: "witness", width: 1024, height: 768 },
    { slug: "witness", width: 390, height: 844 },
    { slug: "signalfusion-core", width: 1440, height: 900 },
    { slug: "helios", width: 1440, height: 900 },
    { slug: "desas", width: 390, height: 844 },
  ];

  for (const theme of ["dark", "light"] as const) {
    for (const { slug, width, height } of PAGES) {
      test(`${slug} at ${width}px, ${theme}`, async ({ page }, testInfo) => {
        desktopOnly(testInfo);
        await page.setViewportSize({ width, height });
        await page.addInitScript(
          ([key, value]) => {
            try {
              localStorage.setItem(key, value);
            } catch {
              /* the assertion below says so */
            }
          },
          [THEME_KEY, theme] as const,
        );
        await page.goto(`/systems/${slug}/`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.evaluate(() => document.fonts.ready);
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        expect(
          results.violations.map(
            (v) =>
              `${v.id} [${v.impact ?? "n/a"}] ${v.help}: ${v.nodes
                .slice(0, 3)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          ),
        ).toEqual([]);
      });
    }
  }
});
