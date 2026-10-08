import { expect, test } from "./fixtures";
import { THEME_KEY } from "../../lib/preferences";
import { closeMenu, openMenuIfPresent, waitForHydration } from "./helpers";

test.describe("terminal", () => {
  test("opens from the interface, prints help, runs commands and navigates", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Desktop: the header button. Mobile: the same button inside the menu sheet.
    await openMenuIfPresent(page);
    await page.getByRole("button", { name: "Terminal", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Terminal" });
    await expect(dialog).toBeVisible();
    const log = dialog.getByRole("log", { name: "Terminal output" });
    const input = dialog.getByRole("textbox", { name: "Terminal command" });
    await expect(input).toBeFocused();
    // The first open greets with the command list.
    await expect(log).toContainText("COMMANDS");

    await input.fill("help");
    await input.press("Enter");
    await expect(log).toContainText("list commands");

    await input.fill("status");
    await input.press("Enter");
    await expect(log).toContainText(
      /projects \d+ \/ flagship \d+ \/ research \d+ \/ certifications \d+ verified/,
    );

    await input.fill("definitely-not-a-command");
    await input.press("Enter");
    await expect(log).toContainText("Command not found: definitely-not-a-command");

    await input.fill("theme light");
    await input.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await input.fill("open about");
    await input.press("Enter");
    await expect(page).toHaveURL(/#about$/);
    await expect(dialog).toBeHidden();
  });

  test("Esc closes the terminal and puts focus back where it was", async ({ page, isMobile }) => {
    test.skip(isMobile, "the opener on mobile lives in a sheet that closes first");
    await page.goto("/");
    await waitForHydration(page);
    const opener = page.getByRole("button", { name: "Terminal", exact: true });
    await opener.focus();
    await opener.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Terminal" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
});

test.describe("theme", () => {
  test("the toggle sets data-theme and the choice survives a reload", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    const opened = await openMenuIfPresent(page);
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    if (opened) await closeMenu(page);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("light");

    // And the choice carries to another page.
    await page.goto("/privacy/");
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("a stored choice is applied before first paint (no flash)", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, "light"), THEME_KEY);
    // Read the attribute as soon as the document element exists, before hydration or paint.
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __themeAtDcl: string | undefined }).__themeAtDcl =
          document.documentElement.dataset.theme;
      });
    });
    await page.goto("/");
    expect(
      await page.evaluate(() => (window as unknown as { __themeAtDcl?: string }).__themeAtDcl),
    ).toBe("light");
  });

  test("falls back to dark when storage holds nonsense", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, "<script>"), THEME_KEY);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("view mode", () => {
});

test.describe("mobile menu", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, "the menu button only exists below the desktop breakpoint");
  });

  test("opens, keeps focus inside, closes on Esc and returns focus to the button", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    // The modal dialog hides the rest of the page from assistive technology, so look the button
    // up with includeHidden to keep reading its state while the menu is open.
    const button = page.getByRole("button", { name: "Menu", exact: true, includeHidden: true });
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    for (const label of ["Work", "Systems", "Research", "Writing", "About"]) {
      await expect(dialog.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    // Focus is trapped: tabbing never leaves the dialog. At the wrap point focus passes through a
    // focus guard for a frame before it is sent back in, so each press is checked once it settles.
    for (let i = 0; i < 16; i += 1) {
      await page.keyboard.press("Tab");
      await expect
        .poll(
          () => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
          { message: `Tab ${i + 1}`, timeout: 2000 },
        )
        .toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("the Close button works and a link closes the menu and navigates", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await dialog.getByRole("link", { name: "Systems", exact: true }).click();
    await expect(page).toHaveURL(/#systems$/);
    await expect(dialog).toBeHidden();
  });

  test("the menu controls are at least 44px tall", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const button = page.getByRole("button", { name: "Menu", exact: true });
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    for (const control of await dialog.getByRole("link").all()) {
      expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    for (const control of await dialog.getByRole("button").all()) {
      expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("desktop navigation", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "desktop header only");
  });

  test("the section being read is marked in the header", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const nav = page.getByRole("navigation", { name: "Primary" });
    const systems = nav.getByRole("link", { name: "SYSTEMS" });
    // Nothing is current while the hero is on screen.
    await expect(systems).not.toHaveAttribute("aria-current", /.+/);

    await page.evaluate(() => document.getElementById("systems")?.scrollIntoView());
    await expect(systems).toHaveAttribute("aria-current", "true");
    await expect(nav.getByRole("link", { name: "ABOUT" })).not.toHaveAttribute(
      "aria-current",
      /.+/,
    );
  });

  test("a detail page marks the section it belongs to", async ({ page }) => {
    await page.goto("/systems/witness/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "SYSTEMS" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("a header link scrolls to its section", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "CERTS" }).click();
    await expect(page).toHaveURL(/#certifications$/);
    await expect(page.locator("#certifications")).toBeInViewport();
  });

  test("the skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/privacy/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});
