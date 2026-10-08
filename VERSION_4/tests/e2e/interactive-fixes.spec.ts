import { expect, test, type Page } from "@playwright/test";
import { UI_EVENTS } from "../../lib/ui-events";
import { OUT_DIR, readOut, walkOut } from "./built-site";
import { waitForHydration, watchProblems } from "./helpers";

/**
 * Regression tests for the interactive layer: the terminal (CSP, bundle, odd input), the command
 * palette (labels, opening from the menu).
 * Each test says which defect it guards.
 */

type CspWindow = Window & { __csp?: string[] };

/**
 * Records every securitypolicyviolation event. A violation that the page catches itself (zod's
 * `new Function("")` probe was one) prints nothing to the console, so console watching cannot see it.
 */
async function trackCspViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as CspWindow).__csp = seen;
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(
        [event.violatedDirective, event.blockedURI, event.sourceFile, event.lineNumber].join(" "),
      );
    });
  });
  return () => page.evaluate(() => (window as CspWindow).__csp ?? []);
}

async function openTerminal(page: Page) {
  await page.evaluate((name) => window.dispatchEvent(new Event(name)), UI_EVENTS.openTerminal);
  const dialog = page.getByRole("dialog", { name: "Terminal" });
  await expect(dialog).toBeVisible();
  const log = dialog.getByRole("log", { name: "Terminal output" });
  const input = dialog.getByRole("textbox", { name: "Terminal command" });
  await expect(log).toContainText("COMMANDS");
  return { dialog, log, input };
}

async function run(page: Page, input: ReturnType<Page["locator"]>, command: string) {
  await input.fill(command);
  await input.press("Enter");
}

test.describe("terminal", () => {
  test("opening it and running commands raises no CSP violation, console error or page error", async ({
    page,
  }) => {
    // SEC-4: the terminal used to load zod, whose feature probe is an eval under script-src.
    const violations = await trackCspViolations(page);
    const problems = watchProblems(page);
    await page.goto("/");
    await waitForHydration(page);

    const { log, input } = await openTerminal(page);
    for (const command of ["help", "projects", "research", "status", "matrix", "skills"]) {
      await run(page, input, command);
    }
    await expect(log).toContainText("SYSTEMS /");
    await expect(log).toContainText("TECHNOLOGY DOMAINS");

    expect(await violations()).toEqual([]);
    expect(problems()).toEqual([]);
  });

  test("words that exist on every object are unknown words, and the terminal stays open", async ({
    page,
  }) => {
    // CODE-04: `open constructor` and `open __proto__` threw and closed the terminal with no output.
    const problems = watchProblems(page);
    await page.goto("/");
    await waitForHydration(page);
    const { dialog, log, input } = await openTerminal(page);

    for (const word of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      await run(page, input, `open ${word}`);
      await expect(log).toContainText(`Nothing named "${word}"`);
      await expect(dialog).toBeVisible();
      expect(new URL(page.url()).pathname, word).toBe("/");
    }
    await run(page, input, "constructor");
    await expect(log).toContainText("Command not found: constructor");

    // Still usable afterwards.
    await run(page, input, "open about");
    await expect(page).toHaveURL(/#about$/);
    expect(problems()).toEqual([]);
  });

  test("no browser script contains a schema library, and the interpreter chunk is small", async ({
    isMobile,
  }) => {
    test.skip(isMobile, "reads files only; one run is enough");
    // perf-7: the lazy terminal chunk was about 440 KB because it re-validated all content with zod.
    const scripts = walkOut().filter(
      (file) => file.startsWith("_next/static/") && file.endsWith(".js"),
    );
    expect(scripts.length).toBeGreaterThan(0);

    const withZod = scripts.filter((file) => /\$ZodType|ZodError/.test(readOut(file)));
    expect(withZod, "browser chunks that contain zod").toEqual([]);
    // The probe zod uses to detect eval support. Nothing the site ships may contain it.
    const withEvalProbe = scripts.filter((file) => readOut(file).includes('Function("")'));
    expect(withEvalProbe, "browser chunks that contain an eval probe").toEqual([]);

    const interpreter = scripts.filter((file) => readOut(file).includes("Command not found:"));
    expect(interpreter.length, `${OUT_DIR}: one chunk holds the interpreter`).toBe(1);
    const size = Buffer.byteLength(readOut(interpreter[0] ?? ""), "utf8");
    expect(size, "interpreter chunk bytes").toBeLessThan(40_000);
  });
});
