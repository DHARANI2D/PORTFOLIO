import { expect, test } from "./fixtures";
import { THEME_KEY, VIEW_KEY } from "../../lib/preferences";
import { closeMenu, openMenuIfPresent, waitForHydration } from "./helpers";

test.describe("command palette", () => {
  test("Ctrl+K opens it with the search field focused, Esc closes it", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Search the portfolio" })).toBeFocused();
    // Before typing, the curated shortcuts are listed.
    await expect(dialog.getByRole("option").first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("Ctrl+K again closes it (toggle)", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(dialog).toBeHidden();
  });

  test("typing 'witness' lists systems, research and writing, and Enter opens the best match", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const input = dialog.getByRole("combobox", { name: "Search the portfolio" });
    await input.fill("witness");

    for (const group of ["SYSTEMS", "RESEARCH", "WRITING"]) {
      await expect(dialog.getByRole("group", { name: group, exact: true }), group).toBeVisible();
    }
    await expect(dialog.getByRole("status")).toContainText(/\d+ results?/);
    // The exact name match is first and is the active option.
    const first = dialog.getByRole("option").first();
    await expect(first).toContainText("WITNESS");
    await expect(first).toHaveAttribute("aria-selected", "true");

    await input.press("Enter");
    await expect(page).toHaveURL(/\/systems\/witness\/$/);
    await expect(dialog).toBeHidden();
    await expect(page.locator("h1")).toContainText("WITNESS");
  });

  test("arrow keys move the active option and Enter opens it", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const input = dialog.getByRole("combobox");
    await input.fill("witness");
    const options = dialog.getByRole("option");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await input.press("ArrowDown");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(options.first()).toHaveAttribute("aria-selected", "false");
    await input.press("ArrowUp");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
  });

  test("a query with no match says so and Enter does nothing", async ({ page }) => {
    await page.goto("/about/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const input = dialog.getByRole("combobox");
    await input.fill("qqqqzzzz");
    await expect(dialog).toContainText("No matches");
    await input.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/about\/$/);
  });

  test("palette actions run: switching to the recruiter view", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await dialog.getByRole("combobox").fill("recruiter");
    await dialog.getByRole("option", { name: /View as recruiter/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-view", "recruiter");
  });
});

test.describe("keyboard shortcuts", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "keyboard shortcuts are for devices with a keyboard");
  });

  test("g then s goes to the systems page", async ({ page }) => {
    await page.goto("/about/");
    await waitForHydration(page);
    await page.keyboard.press("g");
    await page.keyboard.press("s");
    await expect(page).toHaveURL(/\/systems\/$/);
  });

  test("typing in a field never triggers a shortcut, and g then h goes home", async ({ page }) => {
    await page.goto("/contact/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const input = page.getByRole("combobox", { name: "Search the portfolio" });
    await input.pressSequentially("gh");
    await expect(input).toHaveValue("gh");
    // A shortcut would navigate within a few milliseconds; give it far longer than that.
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/contact/");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
    await page.keyboard.press("g");
    await page.keyboard.press("h");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  });

  test("the single-key shortcuts can be switched off (WCAG 2.1.4)", async ({ page }) => {
    await page.goto("/about/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const toggle = dialog.getByRole("button", { name: /Go-to keyboard shortcuts/ });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.keyboard.press("g");
    await page.keyboard.press("s");
    // The handler navigates synchronously when enabled, so half a second is ample to see it.
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/about/");

    // The Ctrl/Cmd+K shortcut needs a modifier and stays available.
    await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible();
  });
});

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
    await expect(page).toHaveURL(/\/about\/$/);
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
    await page.goto("/about/");
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
  test("recruiter view hides engineer-only blocks, shows recruiter-only blocks, and persists", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);

    const visible = (selector: string) =>
      page
        .locator(selector)
        .evaluateAll(
          (nodes) => nodes.filter((node) => getComputedStyle(node).display !== "none").length,
        );

    await expect(page.locator("html")).toHaveAttribute("data-view", "engineer");
    expect(await page.locator("[data-engineer-only]").count()).toBeGreaterThan(0);
    expect(await visible("[data-engineer-only]")).toBeGreaterThan(0);
    expect(await visible("[data-recruiter-only]")).toBe(0);

    const opened = await openMenuIfPresent(page);
    const recruiter = page.getByRole("button", { name: "RECRUITER", exact: true });
    await expect(recruiter).toHaveAttribute("aria-pressed", "false");
    await recruiter.click();
    await expect(recruiter).toHaveAttribute("aria-pressed", "true");
    if (opened) await closeMenu(page);

    await expect(page.locator("html")).toHaveAttribute("data-view", "recruiter");
    expect(await visible("[data-engineer-only]")).toBe(0);
    expect(await visible("[data-recruiter-only]")).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-view", "recruiter");
    expect(await visible("[data-engineer-only]")).toBe(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), VIEW_KEY)).toBe("recruiter");

    // Back to the engineer view restores everything.
    await waitForHydration(page);
    const reopened = await openMenuIfPresent(page);
    await page.getByRole("button", { name: "ENGINEER", exact: true }).click();
    if (reopened) await closeMenu(page);
    await expect(page.locator("html")).toHaveAttribute("data-view", "engineer");
    expect(await visible("[data-engineer-only]")).toBeGreaterThan(0);
  });
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

    // Focus is trapped: tabbing never leaves the dialog.
    for (let i = 0; i < 16; i += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
        `Tab ${i + 1}`,
      ).toBe(true);
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
    await expect(page).toHaveURL(/\/systems\/$/);
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

  test("the current section is marked in the header", async ({ page }) => {
    await page.goto("/systems/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "SYSTEMS" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "ABOUT" })).not.toHaveAttribute(
      "aria-current",
      /.+/,
    );
  });

  test("the skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/about/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });
});
