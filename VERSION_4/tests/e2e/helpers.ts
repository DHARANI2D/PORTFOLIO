import { expect, type Page } from "@playwright/test";
import { UI_EVENTS } from "../../lib/ui-events";

/** The dialog that appears when the terminal opens. Its accessible name is set in components/terminal. */
const TERMINAL = { role: "dialog", name: "Terminal" } as const;

/**
 * Resolves once the page's React tree has hydrated and attached its window listeners.
 *
 * The terminal registers its open-event listener in an effect, so an event dispatched before
 * hydration is silently lost. Opening the terminal through its own event is idempotent (a second
 * event while open does nothing), so it can be retried until it works, then closed.
 */
export async function waitForHydration(page: Page): Promise<void> {
  const dialog = page.getByRole(TERMINAL.role, { name: TERMINAL.name });
  await expect(async () => {
    await page.evaluate((name) => window.dispatchEvent(new Event(name)), UI_EVENTS.openTerminal);
    await expect(dialog).toBeVisible({ timeout: 750 });
  }).toPass({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

/**
 * Opens the full-screen menu when the viewport shows the MENU button (below the lg breakpoint).
 * Returns whether it opened. On desktop the same controls are already in the header.
 */
export async function openMenuIfPresent(page: Page): Promise<boolean> {
  const button = page.getByRole("button", { name: "Menu", exact: true });
  if (!(await button.isVisible())) return false;
  await button.click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  return true;
}

/** Closes the menu opened by openMenuIfPresent. */
export async function closeMenu(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
}

const IGNORED_FAILURES = /net::ERR_ABORTED|NS_BINDING_ABORTED/;

/**
 * Collects everything that should never happen while a page loads: console errors (this includes
 * Content-Security-Policy violations and React hydration errors), uncaught exceptions, failed
 * requests, and same-origin responses with an error status. Call the returned function to read them.
 */
export function watchProblems(page: Page): () => string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "failed";
    // Navigations away from a page abort its in-flight prefetches. That is not a defect.
    if (!IGNORED_FAILURES.test(reason))
      problems.push(`request failed (${reason}): ${request.url()}`);
  });
  page.on("response", (response) => {
    const { hostname } = new URL(response.url());
    if (hostname === "127.0.0.1" && response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return () => [...problems];
}
