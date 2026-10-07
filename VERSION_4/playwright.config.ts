import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the static export in ./out (build first: `pnpm build`).
 * A small Node server (tests/e2e/static-server.mjs) serves it with the headers from out/_headers,
 * so the production Content-Security-Policy is enforced while the tests run.
 *
 * Browser: by default Playwright's own Chromium. Set PLAYWRIGHT_CHROMIUM_PATH to use a specific
 * executable, for example a preinstalled one in a sandbox. /opt/pw-browsers/chromium is picked up
 * automatically when it exists.
 */
const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;
// The same folder is read from disk by the specs (tests/e2e/built-site.ts).
const OUT_DIR = process.env.E2E_OUT_DIR ?? "out";

const explicitChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const chromiumPath = explicitChromium ?? "/opt/pw-browsers/chromium";
if (explicitChromium && !existsSync(explicitChromium)) {
  throw new Error(`PLAYWRIGHT_CHROMIUM_PATH does not exist: ${explicitChromium}`);
}
const launchOptions = existsSync(chromiumPath) ? { executablePath: chromiumPath } : {};

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Deterministic rendering: one locale, one timezone, light/dark decided by the site's own toggle.
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
      testIgnore: /reduced-motion\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], launchOptions },
      // responsive.spec sets its own widths; security.spec reads files and needs no browser.
      testIgnore: /(reduced-motion|responsive|security)\.spec\.ts/,
    },
    {
      // The site must be static and fully visible when the visitor asks for no motion.
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
        launchOptions,
      },
      testMatch: /(reduced-motion|routes)\.spec\.ts/,
    },
  ],
  webServer: {
    command: `node tests/e2e/static-server.mjs --dir ${JSON.stringify(OUT_DIR)} --port ${PORT}`,
    url: `${BASE_URL}/`,
    reuseExistingServer: !isCI,
    timeout: 20_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
