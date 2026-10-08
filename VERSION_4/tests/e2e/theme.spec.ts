import { expect, test } from "./fixtures";
import { THEME_KEY } from "../../lib/preferences";
import { openMenuIfPresent, waitForHydration } from "./helpers";

/**
 * Dark and light mode. With nothing stored the site follows the visitor's system setting; the
 * toggle switches it and the choice is remembered, and a remembered choice beats the system.
 */

async function toggle(page: import("@playwright/test").Page) {
  // On a phone the toggle is in the menu sheet; on a desktop it is in the header.
  await openMenuIfPresent(page);
  await page.getByRole("button", { name: "Toggle theme" }).click();
}

test.describe("system set to light", () => {
  test.use({ colorScheme: "light" });

  test("with nothing stored the site is light, and switching to dark is remembered", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await toggle(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("a stored choice of dark wins over the system setting", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, "dark"), THEME_KEY);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("system set to dark", () => {
  test.use({ colorScheme: "dark" });

  test("with nothing stored the site is dark, and switching to light is remembered", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await toggle(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test("the toggle shows the mode a press switches to", async ({ page, isMobile }) => {
  test.skip(isMobile, "the icon-only toggle is in the desktop header");
  await page.goto("/");
  await waitForHydration(page);
  const button = page.getByRole("button", { name: "Toggle theme" });
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button.locator("svg.lucide-sun")).toHaveCount(1);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button.locator("svg.lucide-moon")).toHaveCount(1);
});
