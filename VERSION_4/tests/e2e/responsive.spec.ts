import { expect, test, type Page } from "@playwright/test";
import { keyRoutes } from "./built-site";

// No horizontal scroll and no clipped content at the widths that matter: the narrowest supported
// phone (320), a common phone (375), a tablet (768) and a laptop (1280).
const WIDTHS = [320, 375, 768, 1280] as const;
const HEIGHT = 900;

// Entrance animations move things for a moment. A static page makes the measurement exact.
test.use({ reducedMotion: "reduce" });

type Overflow = {
  documentOverflow: number;
  clipped: string[];
};

/**
 * `body` has `overflow-x: clip`, which hides sideways overflow from scrollWidth. So the check is
 * two-fold: the document must not be wider than the viewport, and no visible element may stick out
 * past the viewport edge (that is content cut off, which clip would otherwise hide).
 * Elements inside their own scroll container (a code block with overflow-x: auto) may be wider,
 * as may anything decorative (aria-hidden) and the 1px visually hidden helpers.
 */
async function measure(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    const scrolls = (el: Element) => {
      const { overflowX } = getComputedStyle(el);
      return (
        overflowX === "auto" ||
        overflowX === "scroll" ||
        overflowX === "hidden" ||
        overflowX === "clip"
      );
    };
    const insideScroller = (el: Element) => {
      for (
        let parent = el.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        if (scrolls(parent)) return true;
      }
      return false;
    };
    const clipped: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (clipped.length >= 8) break;
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      if (el.closest('[aria-hidden="true"], [hidden]')) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed")
        continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (rect.right <= viewport + 1 && rect.left >= -1) continue;
      if (insideScroller(el)) continue;
      const label = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(
        el.getAttribute("class") ?? "",
      )
        .split(/\s+/)
        .slice(0, 3)
        .join(".")}`;
      clipped.push(
        `${label} [${Math.round(rect.left)}..${Math.round(rect.right)}] "${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
    }
    return { documentOverflow: Math.max(0, root.scrollWidth - viewport), clipped };
  });
}

for (const width of WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: HEIGHT } });

    for (const route of keyRoutes()) {
      test(route, async ({ page }) => {
        await page.goto(route, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);

        const result = await measure(page);
        expect(result.documentOverflow, "document is wider than the viewport").toBe(0);
        expect(result.clipped, "elements sticking out past the viewport edge").toEqual([]);
      });
    }
  });
}

test.describe("touch targets", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("interactive controls on key pages are at least 44px tall on a phone", async ({ page }) => {
    const small: string[] = [];
    for (const route of ["/", "/systems/", "/contact/", "/about/"]) {
      await page.goto(route, { waitUntil: "load" });
      const found = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll(
          "button, [role='button'], summary, input:not([type='hidden']), select, textarea",
        )) {
          if (el.closest('[aria-hidden="true"], [hidden]')) continue;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // sr-only helpers (focus-reveal close buttons) are not touch targets until focused.
          if (rect.width <= 1 || rect.height <= 1) continue;
          if (rect.height < 44) {
            out.push(
              `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}" ${Math.round(rect.height)}px`,
            );
          }
        }
        return out;
      });
      small.push(...found.map((entry) => `${route}: ${entry}`));
    }
    expect(small).toEqual([]);
  });
});
