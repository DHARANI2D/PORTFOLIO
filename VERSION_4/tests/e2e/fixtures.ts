import { expect, test as base } from "@playwright/test";

/**
 * `test` with a guard that fails ANY test in which the page raises a Content-Security-Policy
 * violation. Specs import `test` and `expect` from here instead of "@playwright/test".
 *
 * Two sources are watched, because a page can swallow one of them:
 *   - the `securitypolicyviolation` DOM event, reported through a binding that survives navigations
 *     (a library that catches its own failure, such as an eval probe, still fires the event);
 *   - console errors that name the policy ("Refused to ...", "Content Security Policy").
 *
 * A test that provokes a violation on purpose sets `test.use({ allowCspViolations: true })`.
 */
type Fixtures = {
  allowCspViolations: boolean;
  cspViolations: string[];
};

const CONSOLE_CSP =
  /Content[- ]Security[- ]Policy|Refused to (?:apply|execute|load|connect|frame|create|evaluate|run|send)/i;

export const test = base.extend<Fixtures>({
  allowCspViolations: [false, { option: true }],

  cspViolations: [
    async ({ page, allowCspViolations }, use) => {
      const seen: string[] = [];
      await page.exposeFunction("__reportCspViolation", (detail: string) => {
        seen.push(detail);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          const where = event.sourceFile ? ` at ${event.sourceFile}:${event.lineNumber}` : "";
          const report = (window as unknown as { __reportCspViolation?: (detail: string) => void })
            .__reportCspViolation;
          report?.(
            `${event.effectiveDirective} blocked ${event.blockedURI || "inline"}${where} on ${location.pathname}`,
          );
        });
      });
      page.on("console", (message) => {
        if (message.type() === "error" && CONSOLE_CSP.test(message.text())) {
          seen.push(`console: ${message.text().slice(0, 300)}`);
        }
      });

      await use(seen);

      if (!allowCspViolations) {
        expect(seen, "Content-Security-Policy violations").toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
export type { Page } from "@playwright/test";
