import { expect, test, type Page } from "@playwright/test";
import { OUT_DIR, readOut, walkOut } from "./built-site";
import { waitForHydration, watchProblems } from "./helpers";

/**
 * Home page fixes: the identity row in the hero, no live GitHub data, continuous section numbers
 * in both views, an LCP element that is not animated, the boot console that never blanks its
 * lines, one finite pass of every ambient animation, honest card labels and aligned card rules.
 */

const BOOT_KEY = "ds-boot-typed";

/** Sets what the site stores before any page script runs. */
async function seedStorage(page: Page, values: Record<string, string>) {
  await page.addInitScript((entries) => {
    try {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    } catch {
      /* storage blocked */
    }
  }, values);
}

test.describe("hero identity row", () => {
  for (const view of ["engineer", "recruiter"] as const) {
    test(`says who, what and where, with a contact link, in ${view} view`, async ({ page }) => {
      await seedStorage(page, { "ds-view": view, [BOOT_KEY]: "1" });
      await page.goto("/");
      const row = page.getByRole("group", { name: "Role and location" });
      await expect(row).toBeVisible();
      await expect(row).toContainText("SOC ANALYST");
      await expect(row).toContainText("CYBERSECURITY DESIGN & ENGINEERING");
      await expect(row).toContainText("HPE");
      await expect(row).toContainText("INDIA");
      await expect(row).toContainText("OPEN TO GLOBAL ROLES");
      const contact = row.getByRole("link", { name: "CONTACT" });
      await expect(contact).toHaveAttribute("href", "/contact/");

      // It is part of the first screen, not something to scroll to.
      const box = await row.boundingBox();
      const viewport = page.viewportSize();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
    });
  }

  test("adds no extra button: the hero still has the two calls to action", async ({ page }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
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
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    await waitForHydration(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    expect(foreign).toEqual([]);
  });

  test("each repository is listed once under SYSTEMS, with one link to the GitHub profile", async ({
    page,
  }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
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
  test("engineer view counts 01 to 07 in order", async ({ page }) => {
    await seedStorage(page, { "ds-view": "engineer", [BOOT_KEY]: "1" });
    await page.goto("/");
    const sections = await sectionNumbers(page);
    expect(sections.map((s) => s.id)).toEqual([
      "signal",
      "systems",
      "experience",
      "research",
      "stack",
      "writing",
      "contact",
    ]);
    expect(sections.map((s) => s.number)).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
  });

  test("recruiter view: the counter skips the hidden sections, so the numbers have no gaps", async ({
    page,
  }) => {
    await seedStorage(page, { "ds-view": "recruiter", [BOOT_KEY]: "1" });
    await page.goto("/");
    const sections = await sectionNumbers(page);
    expect(sections.map((s) => s.id)).not.toContain("research");
    expect(sections.map((s) => s.id)).not.toContain("writing");
    const counted = sections.filter((s) => s.generated);
    expect(counted.map((s) => s.id)).toEqual([
      "signal",
      "systems",
      "experience",
      "stack",
      "contact",
    ]);
    expect(counted.map((s) => s.number)).toEqual(["01", "02", "03", "04", "05"]);
  });

  test("recruiter view: every home section, CONTACT included, follows on without a gap", async ({
    page,
  }) => {
    // Needs ContactSection (components/contact) to pass `autoNumber` like the other sections.
    await seedStorage(page, { "ds-view": "recruiter", [BOOT_KEY]: "1" });
    await page.goto("/");
    const sections = await sectionNumbers(page);
    expect(sections.map((s) => s.id)).toEqual([
      "signal",
      "systems",
      "experience",
      "stack",
      "contact",
    ]);
    expect(sections.map((s) => s.number)).toEqual(["01", "02", "03", "04", "05"]);
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
    await seedStorage(page, { [BOOT_KEY]: "1" });
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

/** Runs in the page before its scripts: samples the boot console every 40 ms once it exists. */
function installBootSampler() {
  type Sample = { t: number; rows: string[]; caret: boolean; width: number; height: number };
  const samples: Sample[] = [];
  const started = performance.now();
  const timer = setInterval(() => {
    const root = document.querySelector('[data-engineer-only][aria-hidden="true"].font-mono');
    if (!root) return;
    const box = root.getBoundingClientRect();
    samples.push({
      t: performance.now() - started,
      rows: [...root.querySelectorAll("p")].map((p) => p.textContent ?? ""),
      caret: Boolean(root.querySelector(".w-0")),
      width: box.width,
      height: box.height,
    });
  }, 40);
  (window as unknown as { __bootSamples: () => Sample[] }).__bootSamples = () => {
    clearInterval(timer);
    return samples;
  };
}

type BootSample = ReturnType<typeof readSamples> extends Promise<infer T> ? T : never;
async function readSamples(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        __bootSamples: () => {
          t: number;
          rows: string[];
          caret: boolean;
          width: number;
          height: number;
        }[];
      }
    ).__bootSamples(),
  );
}

test.describe("boot console", () => {
  test("on the first ever visit it types without ever blanking a line or moving", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.addInitScript(installBootSampler);
    await page.goto("/");
    await waitForHydration(page);
    await page.waitForTimeout(3600);
    const samples: BootSample = await readSamples(page);
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), BOOT_KEY)).toBe("1");
    expect(await page.evaluate((k) => sessionStorage.getItem(k), BOOT_KEY)).toBeNull();

    const full = samples[0]?.rows ?? [];
    expect(full).toHaveLength(5);
    expect(full.every((row) => row.trim().length > 2)).toBe(true);
    // Never wiped: every sample, from the first, shows the same five complete lines.
    for (const sample of samples) expect(sample.rows).toEqual(full);
    // It did play (a caret was on screen for a while) and it was over within about 3 s.
    const withCaret = samples.filter((sample) => sample.caret);
    expect(withCaret.length).toBeGreaterThan(5);
    const span = withCaret[withCaret.length - 1]!.t - withCaret[0]!.t;
    expect(span).toBeLessThanOrEqual(3200);
    // No layout shift: the box never changes size.
    expect(new Set(samples.map((s) => `${s.width}x${s.height}`)).size).toBe(1);

    // A new tab in the same browser does not replay it.
    const tab = await context.newPage();
    await tab.addInitScript(installBootSampler);
    await tab.goto("/");
    await waitForHydration(tab);
    await tab.waitForTimeout(1200);
    const again: BootSample = await readSamples(tab);
    expect(again.length).toBeGreaterThan(5);
    expect(again.some((sample) => sample.caret)).toBe(false);
    await context.close();
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("is static, complete and leaves the first visit unused", async ({ page }) => {
      await page.goto("/");
      await waitForHydration(page);
      await page.waitForTimeout(800);
      const rows = page.locator('[data-engineer-only][aria-hidden="true"].font-mono p');
      await expect(rows).toHaveCount(5);
      await expect(
        page.locator('[data-engineer-only][aria-hidden="true"].font-mono .w-0'),
      ).toHaveCount(0);
      expect(await page.evaluate((k) => localStorage.getItem(k), BOOT_KEY)).toBeNull();
    });
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

  test("flow diagrams run once when scrolled into view, finish within 5 s and then rest", async ({
    page,
  }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    await waitForHydration(page);

    // Before the diagrams are on screen nothing flows.
    const before = (await page.evaluate(MAIN_ANIMATIONS)) as { name: string }[];
    expect(before.filter((a) => a.name.startsWith("flow-"))).toEqual([]);

    await page.locator('[aria-label="Major systems"]').scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const now = (await page.evaluate(MAIN_ANIMATIONS)) as { name: string }[];
        return now.filter((a) => a.name.startsWith("flow-")).length;
      })
      .toBeGreaterThan(0);

    const running = (await page.evaluate(MAIN_ANIMATIONS)) as {
      iterations: string;
      endTime: number;
    }[];
    for (const animation of running) {
      expect(animation.iterations).not.toBe("Infinity");
      expect(animation.endTime).toBeLessThanOrEqual(5000);
    }

    // Everything on the page has come to rest within 5 s plus margin.
    await expect
      .poll(
        async () => {
          const now = (await page.evaluate(MAIN_ANIMATIONS)) as { state: string }[];
          return now.filter((a) => a.state === "running" || a.state === "pending").length;
        },
        { timeout: 9000 },
      )
      .toBe(0);
  });

  test("no infinite animation exists anywhere in the page content", async ({ page }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    await waitForHydration(page);
    for (const y of [0, 1200, 2400, 3600, 4800, 6000]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(250);
      const all = (await page.evaluate(MAIN_ANIMATIONS)) as { name: string; iterations: string }[];
      expect(all.filter((a) => a.iterations === "Infinity")).toEqual([]);
    }
  });

  test("the Helios pipeline plays once and rests with every step lit", async ({ page }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    await waitForHydration(page);
    const panel = page.locator('[role="img"][aria-label^="Helios security core"]');
    const steps = panel.locator("li");
    await expect(steps).toHaveCount(4);
    // On a phone the panel is below the first screen. The pass starts when it is in view.
    await panel.scrollIntoViewIfNeeded();
    const lit = () =>
      steps.evaluateAll((items) => items.filter((li) => li.dataset.lit === "true").length);
    // During the pass one step is lit at a time. Four lit at once means the pass is over.
    await expect.poll(lit, { timeout: 8000 }).toBe(4);
    await page.waitForTimeout(1500);
    expect(await lit()).toBe(4);
    const after = (await page.evaluate(MAIN_ANIMATIONS)) as { state: string }[];
    expect(after.filter((a) => a.state === "running")).toEqual([]);
  });
});

test.describe("system cards", () => {
  test("say case study only where there is an architecture diagram, overview otherwise", async ({
    page,
  }) => {
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    const links = page.locator('#systems article h3 a[href^="/systems/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(5);

    const targets = await links.evaluateAll((anchors) =>
      anchors.map((a) => ({
        href: a.getAttribute("href") ?? "",
        name: (a.textContent ?? "").trim(),
        cue: (a.closest("article")?.textContent ?? "").includes("CASE STUDY")
          ? "case study"
          : "overview",
      })),
    );

    for (const target of targets) {
      const response = await page.request.get(target.href);
      const html = await response.text();
      const hasArchitecture = /architecture diagram/i.test(html);
      expect(target.cue, `${target.href} cue`).toBe(hasArchitecture ? "case study" : "overview");
      // The accessible name follows the same wording.
      expect(target.name.toLowerCase(), `${target.href} name`).toContain(target.cue);
    }
    expect(new Set(targets.map((t) => t.cue))).toEqual(new Set(["case study", "overview"]));
  });

  test("the footer rules of the medium cards line up", async ({ page }) => {
    // Cards share row tracks from md up. Below that they are one column and nothing needs to line up.
    test.skip((page.viewportSize()?.width ?? 0) < 768, "single column below 768px");
    await seedStorage(page, { [BOOT_KEY]: "1" });
    await page.goto("/");
    const tops = await page.locator('[aria-label="Major systems"] article').evaluateAll((cards) =>
      cards.map((card) => {
        const parts = [...card.children] as HTMLElement[];
        return parts.map((part) => Math.round(part.getBoundingClientRect().top));
      }),
    );
    expect(tops.length).toBeGreaterThanOrEqual(3);
    const first = tops[0]!;
    expect(first).toHaveLength(4);
    for (const card of tops) {
      // Header strip, title block, diagram and footer start at the same height in every card.
      for (let i = 0; i < 4; i += 1) expect(Math.abs(card[i]! - first[i]!)).toBeLessThanOrEqual(1);
    }
  });
});

test("the home page loads without console errors or failed requests", async ({ page }) => {
  const problems = watchProblems(page);
  await seedStorage(page, { [BOOT_KEY]: "1" });
  await page.goto("/");
  await waitForHydration(page);
  expect(problems()).toEqual([]);
});
