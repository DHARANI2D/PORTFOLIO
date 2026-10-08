import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./fixtures";
import { THEME_KEY, type Theme } from "../../lib/preferences";
import { keyRoutes } from "./built-site";
import { closeMenu, openMenuIfPresent, waitForHydration } from "./helpers";

// WCAG 2.2 AA, automated. Axe finds roughly a third of real issues; keyboard and screen reader
// behaviour is covered by interactions.spec.ts and by the checklist in README.md.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Entrance animations leave text partly transparent for a moment, which makes contrast results
// depend on timing. With reduced motion the page is static, so the scan is deterministic.
test.use({ reducedMotion: "reduce" });

type Mode = { name: string; theme: Theme };
const MODES: readonly Mode[] = [
  { name: "dark", theme: "dark" },
  { name: "light", theme: "light" },
];

async function scan(page: Page, scope?: string) {
  await page.evaluate(() => document.fonts.ready);
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  const results = await (scope ? builder.include(scope) : builder).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id} [${violation.impact ?? "n/a"}] ${violation.help}: ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join(" | ")} (${violation.nodes.length} node(s)) ${violation.helpUrl}`,
  );
}

async function prefer(page: Page, mode: Mode) {
  await page.addInitScript(
    ([themeKey, theme]) => {
      try {
        localStorage.setItem(themeKey, theme);
      } catch {
        /* storage blocked: the page falls back to defaults and the assertion below says so */
      }
    },
    [THEME_KEY, mode.theme] as const,
  );
}

for (const mode of MODES) {
  test.describe(`axe: ${mode.name}`, () => {
    for (const route of keyRoutes()) {
      test(route, async ({ page }) => {
        await prefer(page, mode);
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", mode.theme);
        expect(await scan(page)).toEqual([]);
      });
    }
  });
}

test.describe("axe: overlays", () => {
  test("terminal dialog", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    // Desktop: the header button. Phones: the same button inside the menu sheet.
    await openMenuIfPresent(page);
    await page.getByRole("button", { name: "Terminal", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Terminal" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("log")).toContainText("COMMANDS");
    expect(await scan(page, '[role="dialog"]')).toEqual([]);
  });

  test("navigation menu (below the desktop breakpoint)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await waitForHydration(page);
    expect(await openMenuIfPresent(page)).toBe(true);
    expect(await scan(page, '[role="dialog"]')).toEqual([]);
    await closeMenu(page);
  });
});
