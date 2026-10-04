import { expect, test, type Page } from "@playwright/test";
import { keyRoutes } from "./built-site";

// Runs in the "reduced-motion" project (prefers-reduced-motion: reduce). The site must then be
// static and fully visible: nothing animating, nothing waiting to fade in.
test.use({ reducedMotion: "reduce" });

const routes = keyRoutes();

/** Text-bearing elements in <main> that are visible in layout but not fully opaque. */
async function fadedContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const faded: string[] = [];
    for (const el of document.querySelectorAll("main *")) {
      if (faded.length >= 10) break;
      if (el.closest('[aria-hidden="true"], [hidden], [inert]')) continue;
      const hasOwnText = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
      if (!hasOwnText) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.width <= 1 && rect.height <= 1) continue;
      let opacity = 1;
      let clippedAway = false;
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none") {
          opacity = 0;
          break;
        }
        // Collapsed panels (zero height, overflow clipped) hold text nobody can see by design.
        if (style.overflow !== "visible" && node.getBoundingClientRect().height < 1) {
          clippedAway = true;
          break;
        }
        opacity *= Number.parseFloat(style.opacity);
        if (style.visibility === "hidden") opacity = 0;
      }
      if (clippedAway) continue;
      if (opacity < 0.99) {
        faded.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" opacity ${opacity.toFixed(2)}`,
        );
      }
    }
    return faded;
  });
}

/** Animations a browser would still be playing: CSS animations, transitions and Web Animations. */
async function runningAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === "running" || animation.pending)
      .map((animation) => {
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        const name =
          "animationName" in animation
            ? String((animation as CSSAnimation).animationName)
            : "transition";
        return `${target?.tagName.toLowerCase() ?? "?"}.${String(
          target?.getAttribute("class") ?? "",
        )
          .split(/\s+/)
          .slice(0, 2)
          .join(".")} ${name}`;
      }),
  );
}

test("the browser reports the reduced motion preference", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    "auto",
  );
});

test.describe("with reduced motion", () => {
  for (const route of routes) {
    test(`${route} is static and fully visible`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);

      // Nothing keeps running. Poll: a finishing 0.001ms transition may take a frame to clear.
      await expect
        .poll(() => runningAnimations(page), { timeout: 5_000, message: "running animations" })
        .toEqual([]);

      // Everything a visitor can read is opaque, without scrolling or waiting for a reveal.
      expect(await fadedContent(page), "text that is not fully opaque").toEqual([]);
      await expect(page.locator("h1")).toBeVisible();
    });
  }

  test("scrolling to the bottom reveals nothing new and starts no animation", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const before = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.75) {
        window.scrollTo(0, y);
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      }
    });
    expect(await page.evaluate(() => document.body.scrollHeight)).toBe(before);
    await expect.poll(() => runningAnimations(page), { timeout: 5_000 }).toEqual([]);
    expect(await fadedContent(page)).toEqual([]);
  });

  test("opening the palette does not animate", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.dispatchEvent(new Event("ds:open-palette")));
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await expect.poll(() => runningAnimations(page), { timeout: 5_000 }).toEqual([]);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const route of ["/", "/systems/", "/about/"]) {
    test(`${route} renders its final state from the server HTML`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);
      expect(await fadedContent(page), "text that is hidden until JavaScript runs").toEqual([]);
    });
  }
});
