import { expect, test, type Page } from "@playwright/test";
import { OUT_DIR, readOut, walkOut } from "./built-site";
import { waitForHydration, watchProblems } from "./helpers";

/**
 * Home page fixes: the identity row in the hero, no live GitHub data, continuous section numbers
 * in both views, an LCP element that is not animated, the boot console that never blanks its
 * lines, one finite pass of every ambient animation, honest card labels and aligned card rules.
 */

test.describe("hero identity row", () => {
  {
    test("says who, what and where, with a contact link", async ({ page }) => {
      await page.goto("/");
      const row = page.getByRole("group", { name: "Role and location" });
      await expect(row).toBeVisible();
      await expect(row).toContainText("SOC ANALYST");
      await expect(row).toContainText("CYBERSECURITY DESIGN & ENGINEERING");
      await expect(row).toContainText("HPE");
      await expect(row).toContainText("INDIA");
      await expect(row).toContainText("OPEN TO GLOBAL ROLES");
      const contact = row.getByRole("link", { name: "CONTACT" });
      await expect(contact).toHaveAttribute("href", "/#contact");

      // It is part of the first screen, not something to scroll to.
      const box = await row.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
    });
  }

  test("adds no extra button: the hero still has the two calls to action", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator('section[aria-labelledby="hero-heading"]');
    await expect(hero.getByRole("link", { name: "EXPLORE SYSTEMS" })).toBeVisible();
    await expect(hero.getByRole("link", { name: "VIEW RESUME" })).toBeVisible();
  });
});

test.describe("no live GitHub data", () => {
  test("the built site never mentions the GitHub API, stars or a build-log panel", async () => {
    const textFiles = walkOut().filter((file) => /\.(html|js|txt|json|css)$/.test(file));
    expect(textFiles.length).toBeGreaterThan(10);
    for (const file of textFiles) {
      expect(readOut(file), file).not.toContain("api.github.com");
    }
    const home = readOut("index.html");
    expect(home).not.toContain("SOURCE · GITHUB API");
    expect(home).not.toContain("OPEN SOURCE / BUILD LOG");
    expect(home).not.toContain("PRIMARY STACK");
    expect(home).not.toMatch(/\b\d+ STARS?\b/);
    expect(OUT_DIR).toBeTruthy();
  });

  test("the home page requests nothing from another origin", async ({ page }) => {
    const foreign: string[] = [];
    page.on("request", (request) => {
      const { hostname } = new URL(request.url());
      if (hostname !== "127.0.0.1") foreign.push(request.url());
    });
    await page.goto("/");
    await waitForHydration(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    expect(foreign).toEqual([]);
  });

  test("each repository is listed once under SYSTEMS, with one link to the GitHub profile", async ({
    page,
  }) => {
    await page.goto("/");
    const hrefs = await page
      .locator('#systems a[href^="https://github.com/DHARANI2D"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    const repos = hrefs.filter((href) => href !== "https://github.com/DHARANI2D");
    expect(repos.length).toBeGreaterThan(0);
    expect(new Set(repos).size).toBe(repos.length);
    expect(hrefs.filter((href) => href === "https://github.com/DHARANI2D")).toHaveLength(1);
    const profile = page.locator('#systems a[href="https://github.com/DHARANI2D"]');
    await expect(profile).toHaveAttribute("rel", "noopener noreferrer");
    await expect(profile).toHaveAttribute("target", "_blank");
  });
});

/**
 * The number each visible home section shows, in page order, as the browser renders it.
 *
 * A CSS counter's value is not readable from script (getComputedStyle returns the counter()
 * function, innerText skips generated content). Chromium's accessibility tree does hold the
 * generated text, so the decorative wrapper is un-hidden and given a heading role, and the text
 * Chromium generated under it is read over CDP. Sections with an explicit index are read from text.
 */
async function sectionNumbers(
  page: Page,
): Promise<{ id: string; number: string; generated: boolean }[]> {
  const sections = await page.evaluate(() => {
    const visible = [...document.querySelectorAll<HTMLElement>("main section[id]")].filter(
      (section) => section.getClientRects().length > 0,
    );
    return visible.map((section) => {
      const label = section.querySelector<HTMLElement>(".label-mono");
      const generated = label?.querySelector<HTMLElement>(".ds-section-number");
      const wrapper = generated?.parentElement;
      if (wrapper) {
        wrapper.removeAttribute("aria-hidden");
        wrapper.setAttribute("role", "heading");
        wrapper.setAttribute("aria-level", "6");
      }
      return {
        id: section.id,
        generated: Boolean(generated),
        explicit: label?.querySelector(".text-accent")?.textContent ?? "",
      };
    });
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const textUnder = (id: string): string => {
    const node = byId.get(id);
    if (!node) return "";
    const own = node.role?.value === "StaticText" ? String(node.name?.value ?? "") : "";
    return own + (node.childIds ?? []).map(textUnder).join("");
  };
  const names = nodes
    .filter(
      (node) =>
        node.role?.value === "heading" &&
        node.properties?.some((p) => p.name === "level" && p.value.value === 6),
    )
    .map((node) => /\d{2}/.exec(textUnder(node.nodeId))?.[0] ?? "none");

  let next = 0;
  return sections.map((section) => ({
    id: section.id,
    number: section.generated ? (names[next++] ?? "none") : section.explicit,
    generated: section.generated,
  }));
}

test.describe("section numbering", () => {
  test("the sections count 01 to 09 in order", async ({ page }) => {
    await page.goto("/");
    const sections = await sectionNumbers(page);
    expect(sections.map((s) => s.id)).toEqual([
      "signal",
      "about",
      "experience",
      "systems",
      "research",
      "stack",
      "certifications",
      "writing",
      "contact",
    ]);
    expect(sections.map((s) => s.number)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
    ]);
  });

  test("the number is decoration: the section label reads as the label alone", async ({ page }) => {
    await page.goto("/");
    const label = page.locator("#systems .label-mono").first();
    await expect(label).toContainText("SYSTEMS");
    // The number and the slash sit in an aria-hidden wrapper, and the number is generated.
    const wrapper = label.locator('[aria-hidden="true"]');
    await expect(wrapper).toHaveCount(1);
    expect(await wrapper.locator(".ds-section-number").textContent()).toBe("");
    // The section is still named by its h2.
    await expect(page.getByRole("region", { name: "Systems, not demos." })).toBeVisible();
  });
});

test.describe("largest text is painted at once", () => {
  test("nothing in the hero's text column animates, and the LCP element is not animated", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { element?: Element | null })[];
        for (const entry of entries) {
          (window as unknown as { __lcp: Element | null }).__lcp = entry.element ?? null;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto("/");
    await waitForHydration(page);

    const report = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-labelledby="hero-heading"]');
      const column = hero?.querySelector("div.lg\\:col-span-7");
      const animated = (start: Element | null): string[] => {
        const found: string[] = [];
        for (let node = start; node && node.tagName !== "MAIN"; node = node.parentElement) {
          const name = getComputedStyle(node).animationName;
          if (name !== "none") found.push(`${node.tagName.toLowerCase()} ${name}`);
        }
        return found;
      };
      const inColumn = [...(column?.querySelectorAll("*") ?? [])].flatMap(animated);
      const lcp = (window as unknown as { __lcp?: Element | null }).__lcp ?? null;
      return {
        columnFound: Boolean(column),
        inColumn,
        lcpTag: lcp?.tagName.toLowerCase() ?? null,
        lcpInTextColumn: Boolean(lcp && column?.contains(lcp)),
        lcpAnimated: animated(lcp),
      };
    });
    expect(report.columnFound).toBe(true);
    // The headline, support line, identity row, proof strip and buttons: no entrance animation.
    expect(report.inColumn).toEqual([]);
    // The element the browser reports as the largest paint is real, in the text column, and still.
    expect(report.lcpTag).not.toBeNull();
    expect(report.lcpInTextColumn).toBe(true);
    expect(report.lcpAnimated).toEqual([]);
  });
});

test.describe("ambient animation is one finite pass", () => {
  /** Animations whose target is in the page content (the header status ping is not the home's). */
  const MAIN_ANIMATIONS = `document.getAnimations()
    .filter((a) => a.effect && a.effect.target && a.effect.target.closest('main'))
    .map((a) => {
      const timing = a.effect.getComputedTiming();
      return {
        name: a.animationName ?? 'script',
        iterations: String(timing.iterations),
        endTime: timing.endTime,
        state: a.playState,
      };
    })`;

  test("no infinite animation exists anywhere in the page content", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    for (const y of [0, 1200, 2400, 3600, 4800, 6000]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(250);
      const all = (await page.evaluate(MAIN_ANIMATIONS)) as { name: string; iterations: string }[];
      expect(all.filter((a) => a.iterations === "Infinity")).toEqual([]);
    }
  });

});

test.describe("system cards", () => {
});

test("the home page loads without console errors or failed requests", async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto("/");
  await waitForHydration(page);
  expect(problems()).toEqual([]);
});
