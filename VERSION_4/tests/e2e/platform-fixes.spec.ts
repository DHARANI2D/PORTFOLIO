import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { UI_EVENTS } from "../../lib/ui-events";
import { THEME_KEY, VIEW_KEY } from "../../lib/preferences";
import { OUT_DIR, readOut, sitemapPaths, walkOut } from "./built-site";
import { expect, test } from "./fixtures";
import { closeMenu, openMenuIfPresent, waitForHydration, watchProblems } from "./helpers";

/**
 * Platform fixes: the Content-Security-Policy as a <meta> tag in every page, the tightened style and
 * image directives, and a guard (see fixtures.ts) that fails any test on a policy violation.
 */

const routes = sitemapPaths();

test.describe("policy tag in the built HTML", () => {
  const htmlFiles = walkOut().filter(
    (file) => file.endsWith(".html") && !file.startsWith("_next/"),
  );

  test("the export includes the error pages and the security page", () => {
    expect(htmlFiles).toContain("404.html");
    expect(htmlFiles).toContain("security/index.html");
    expect(routes).toContain("/security/");
  });

  for (const file of htmlFiles) {
    test(`${file}: first thing in <head> (after charset) is one policy tag without unsafe-inline`, () => {
      const html = readOut(file);
      const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? "";
      const lead = head.replace(/^\s*<meta\s+charset=[^>]*>/i, "");
      expect(lead.startsWith('<meta http-equiv="Content-Security-Policy" content="'), file).toBe(
        true,
      );
      expect(html.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);
      const policy = /content="([^"]*)"/.exec(lead)?.[1] ?? "";
      expect(policy).toContain("script-src 'self' 'sha256-");
      expect(policy).toContain("style-src 'self'");
      expect(policy).toContain("img-src 'self';");
      expect(policy).not.toContain("unsafe-inline");
      expect(policy).not.toContain("unsafe-eval");
      expect(policy).not.toContain("data:");
      // A browser ignores frame-ancestors in a tag; it is a header-only directive.
      expect(policy).not.toContain("frame-ancestors");
    });
  }
});

test.describe("no policy violation on any route, in both themes, after interacting", () => {
  // The fixture fails the test on any violation. Each step below touches something that has
  // violated the policy before: the terminal (an eval probe), overlays, toggles, diagrams.
  const themes = ["dark", "light"] as const;

  for (const theme of themes) {
    for (const route of routes) {
      test(`${route} (${theme})`, async ({ page, isMobile }) => {
        test.skip(isMobile && theme === "light" && route !== "/", "mobile: dark and home only");
        await page.addInitScript(
          ([themeKey, viewKey, value]) => {
            try {
              localStorage.setItem(themeKey, value);
              localStorage.setItem(viewKey, "engineer");
            } catch {
              /* storage blocked */
            }
          },
          [THEME_KEY, VIEW_KEY, theme] as const,
        );
        const problems = watchProblems(page);
        await page.goto(route, { waitUntil: "load" });
        await waitForHydration(page);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        // Scroll through the page so lazy and in-view effects run.
        await page.evaluate(async () => {
          for (let y = 0; y <= document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });

        // Palette: open, type, close.
        await page.keyboard.press("Control+k");
        const palette = page.getByRole("dialog", { name: "Command palette" });
        await expect(palette).toBeVisible();
        await palette.getByRole("combobox").fill("witness");
        await page.keyboard.press("Escape");
        await expect(palette).toBeHidden();

        // Terminal: open with a command, switch theme and view through it, close.
        await page.evaluate(
          (name) => window.dispatchEvent(new CustomEvent(name, { detail: { command: "status" } })),
          UI_EVENTS.openTerminal,
        );
        const terminal = page.getByRole("dialog", { name: "Terminal" });
        await expect(terminal).toBeVisible();
        const input = terminal.getByRole("textbox", { name: "Terminal command" });
        for (const command of [
          "help",
          "view recruiter",
          "view engineer",
          "theme dark",
          `theme ${theme}`,
        ]) {
          await input.fill(command);
          await input.press("Enter");
        }
        await expect(terminal.getByRole("log")).toContainText("COMMANDS");
        await page.keyboard.press("Escape");
        await expect(terminal).toBeHidden();

        // Menu (small screens) and the diagram hover on pages that have one.
        if (await openMenuIfPresent(page)) await closeMenu(page);
        const node = page.locator("svg g[role='button']").first();
        if ((await node.count()) > 0 && (await node.first().isVisible())) {
          await node.scrollIntoViewIfNeeded();
          await node.hover({ force: true });
          await node.focus();
        }

        expect(problems()).toEqual([]);
      });
    }
  }
});

test.describe("opening the terminal and the palette", () => {
  test("causes no CSP violation (the terminal used to probe eval)", async ({
    page,
    cspViolations,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.evaluate(
      (name) => window.dispatchEvent(new CustomEvent(name, { detail: { command: "help" } })),
      UI_EVENTS.openTerminal,
    );
    const terminal = page.getByRole("dialog", { name: "Terminal" });
    await expect(terminal).toBeVisible();
    await expect(terminal.getByRole("log")).toContainText("COMMANDS");
    await page.keyboard.press("Escape");
    await expect(terminal).toBeHidden();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await page.waitForTimeout(300);
    expect(cspViolations).toEqual([]);
  });
});

test.describe("the policy tag works without any header", () => {
  test.use({ allowCspViolations: true });
  let server: ChildProcess;
  let base = "";

  test.beforeAll(async () => {
    const script = path.resolve(__dirname, "static-server.mjs");
    server = spawn(
      process.execPath,
      [script, "--dir", OUT_DIR, "--port", "0", "--csp-header", "off"],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    base = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("static server did not start")), 10_000);
      server.stdout?.on("data", (chunk: Buffer) => {
        const match = /listening (http:\/\/\S+)/.exec(chunk.toString());
        if (match?.[1]) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
    });
  });
  test.afterAll(() => {
    server?.kill();
  });

  test("a host that sends no Content-Security-Policy header still enforces the page's policy", async ({
    page,
    request,
    cspViolations,
  }) => {
    const response = await request.get(`${base}/about/`);
    expect(response.headers()["content-security-policy"]).toBeUndefined();

    await page.goto(`${base}/about/`);
    await waitForHydration(page);
    const result = await page.evaluate(async () => {
      const violations: string[] = [];
      document.addEventListener("securitypolicyviolation", (event) => {
        violations.push(event.effectiveDirective);
      });
      window.name = "";
      const script = document.createElement("script");
      script.textContent = "window.name = 'ran'";
      document.head.append(script);
      const image = document.createElement("img");
      image.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
      document.body.append(image);
      const holder = document.createElement("div");
      holder.setAttribute("style", "color: red");
      document.body.append(holder);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { ran: window.name === "ran", violations };
    });
    expect(result.ran).toBe(false);
    // The guard in fixtures.ts records them too: this is what makes it able to fail a test.
    expect(cspViolations.join("\n")).toMatch(/script-src-elem blocked inline/);
    expect(result.violations).toEqual(
      expect.arrayContaining(["script-src-elem", "img-src", "style-src-attr"]),
    );
  });

  test("the 404 page and /_not-found/ carry the policy tag too", async ({ request }) => {
    for (const url of ["/does-not-exist/", "/systems/nope/", "/_not-found/"]) {
      const body = await (await request.get(`${base}${url}`)).text();
      expect(body, url).toContain('http-equiv="Content-Security-Policy"');
    }
  });
});
