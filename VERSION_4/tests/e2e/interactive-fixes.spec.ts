import { expect, test, type Page } from "@playwright/test";
import { THEME_KEY } from "../../lib/preferences";
import { UI_EVENTS } from "../../lib/ui-events";
import { keyRoutes, OUT_DIR, readOut, walkOut } from "./built-site";
import { openMenuIfPresent, waitForHydration, watchProblems } from "./helpers";

/**
 * Regression tests for the interactive layer: the terminal (CSP, bundle, odd input), the command
 * palette (labels, opening from the menu), and the ambient security graph (never behind text,
 * cheap state changes). Each test says which defect it guards.
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
    await expect(page).toHaveURL(/\/about\/$/);
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

test.describe("command palette", () => {
  test("the go-to shortcuts switch is named by its visible label (WCAG 2.5.3)", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the key hints are hidden on touch devices");
    // A11Y-7: the visible words were aria-hidden, so the name did not contain them.
    await page.goto("/about/");
    await waitForHydration(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    const toggle = dialog.getByRole("button", { name: /Go-to keyboard shortcuts/ });

    // The words a speech-input user reads off the screen: visible, not hidden from assistive tech.
    const label = toggle.getByText("G then H S E R W A C", { exact: true });
    await expect(label).toBeVisible();
    expect(await label.evaluate((el) => el.closest('[aria-hidden="true"]'))).toBeNull();

    await expect(toggle).toHaveAccessibleName(/^G then H S E R W A C\b/i);
    await expect(dialog.getByRole("button", { name: "G then H S E R W A C" })).toBeVisible();
    // The long explanation is the description, so the name stays short.
    await expect(toggle).toHaveAccessibleDescription(
      /Press G, then H for home.*Active when this palette is closed/,
    );
    // The state is carried by aria-pressed, not by words in the name.
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAccessibleName(/^G then H S E R W A C\b/i);
  });

  test("the mobile menu's Search button opens the palette", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu sheet only exists below lg");
    await page.goto("/");
    await waitForHydration(page);
    expect(await openMenuIfPresent(page)).toBe(true);
    await page
      .getByRole("dialog", { name: "Menu" })
      .getByRole("button", { name: "Search" })
      .click();

    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("combobox", { name: "Search the portfolio" })).toBeFocused();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  test("its Open terminal action opens the terminal after the palette has closed", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.evaluate((name) => window.dispatchEvent(new Event(name)), UI_EVENTS.openPalette);
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await palette.getByRole("combobox").fill("terminal");
    await palette.getByRole("option", { name: /Open terminal/ }).click();

    const terminal = page.getByRole("dialog", { name: "Terminal" });
    await expect(terminal).toBeVisible();
    await expect(palette).toBeHidden();
    await expect(terminal.getByRole("textbox", { name: "Terminal command" })).toBeFocused();
  });
});

/* ------------------------------------------------------------------------------------------- *
 * Ambient security graph
 * ------------------------------------------------------------------------------------------- */

/**
 * Known defects in other files that put text inside a graph margin. Each entry is a bug to fix
 * there, not a reason to move the graph; delete the entry when it is fixed.
 */
const KNOWN_TEXT_IN_MARGIN: readonly { width: number; route: string; text: string }[] = [
  // A tag in the earlier-work list is 7px wider than its container at 320px.
  { width: 320, route: "/systems/", text: "Ransomware Detection and Prevention" },
];

/**
 * Visible text whose box reaches into a margin: the strips left and right of the text column that
 * hold every graph node, label and rail. Document coordinates, so it covers every scroll position.
 * Text hidden for assistive tech only (.sr-only), off screen (.skip-link) or clipped away by an
 * overflow container does not count.
 */
async function textInMargins(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const plane = document.querySelector('[data-graph="plane"]');
    if (!plane) return ["graph plane is missing"];
    // The plane spans from the left rail to the right rail, each half a margin in from the edge.
    const margin = plane.getBoundingClientRect().left * 2;
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      const text = node.nodeValue?.trim() ?? "";
      if (!el || text === "" || el.closest("svg, .sr-only, .skip-link")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        let left = rect.left;
        let right = rect.right;
        for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
          if (
            a !== document.body &&
            /(hidden|auto|scroll|clip)/.test(getComputedStyle(a).overflowX)
          ) {
            const box = a.getBoundingClientRect();
            left = Math.max(left, box.left);
            right = Math.min(right, box.right);
          }
        }
        if (right - left < 1) continue;
        if (left < margin - 0.5 || right > width - margin + 0.5) {
          found.push(
            `${text.slice(0, 60)} [${Math.round(left)}-${Math.round(right)}] margin ${margin}`,
          );
        }
      }
    }
    return found;
  });
}

const MARGIN_WIDTHS = [320, 390, 768, 1024, 1280, 1400, 1440, 1920] as const;

test.describe("security graph geometry", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "sets its own viewport widths");
  });

  for (const width of MARGIN_WIDTHS) {
    test(`no visible text reaches the graph margins at ${width}px`, async ({ page }) => {
      // D1 / A11Y-2: the graph used to print nodes and labels over headings, dates and links.
      await page.setViewportSize({ width, height: 900 });
      const offenders: string[] = [];
      for (const route of keyRoutes()) {
        await page.goto(route);
        for (const found of await textInMargins(page)) {
          const known = KNOWN_TEXT_IN_MARGIN.some(
            (entry) =>
              entry.width === width && entry.route === route && found.startsWith(entry.text),
          );
          if (!known) offenders.push(`${route}: ${found}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  }

  test("labels appear only where the margin can hold the longest one", async ({ page }) => {
    const labelDisplays = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      return page.evaluate(() =>
        [...document.querySelectorAll('[data-graph="plane"] text')].map(
          (label) => getComputedStyle(label).display,
        ),
      );
    };
    for (const width of [320, 768, 1280, 1399]) {
      expect(new Set(await labelDisplays(width)), `${width}px`).toEqual(new Set(["none"]));
    }
    const wide = await labelDisplays(1400);
    expect(wide.length).toBeGreaterThan(0);
    expect(
      wide.filter((display) => display === "none"),
      "1400px",
    ).toEqual([]);
  });
});

function luminance(hex: string): number {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;
  const channel = (offset: number) => {
    const value = Number.parseInt(full.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const toHex = ([r, g, b]: readonly number[]) =>
  `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")}`;

type PixelReport = {
  background: number[];
  margin: number;
  /** Pixels in the text column that differ from the page background, with the first few positions. */
  columnDifferent: number;
  samples: string[];
  /** Pixels in the margins that differ from the page background: proof the graph is drawn at all. */
  marginDrawn: number;
  tokens: { foreground: string; muted: string; accent: string };
};

/**
 * Renders the graph alone, in its busiest state (every node and every line lit), and reads the
 * pixels back. Content is hidden, so every pixel is either page background or graph.
 */
async function graphPixels(page: Page): Promise<PixelReport> {
  await page.addStyleTag({
    content:
      "main, header, footer, .skip-link { visibility: hidden !important }" +
      " *, *::before, *::after { transition: none !important; animation: none !important }",
  });
  await page.evaluate(() => {
    const plane = document.querySelector('[data-graph="plane"]');
    plane?.querySelectorAll(":scope > svg > g").forEach((g) => g.setAttribute("data-on", ""));
    document
      .querySelectorAll("[data-graph] line[data-level]")
      .forEach((line) => line.setAttribute("data-level", "2"));
  });
  const png = await page.screenshot({ type: "png" });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    context.drawImage(bitmap, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height);

    const plane = document.querySelector('[data-graph="plane"]');
    const margin = (plane?.getBoundingClientRect().left ?? 0) * 2;
    const at = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    };
    // The middle of the page is inside the text column at every width and holds no graph.
    const background = at(Math.floor(width / 2), Math.floor(height / 2));
    const same = (p: number[]) =>
      p[0] === background[0] && p[1] === background[1] && p[2] === background[2];

    let columnDifferent = 0;
    let marginDrawn = 0;
    const samples: string[] = [];
    const start = Math.ceil(margin);
    const end = Math.floor(width - margin);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (same(at(x, y))) continue;
        if (x >= start && x < end) {
          columnDifferent += 1;
          if (samples.length < 5) samples.push(`(${x},${y}) ${at(x, y).join(",")}`);
        } else {
          marginDrawn += 1;
        }
      }
    }
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    return {
      background,
      margin,
      columnDifferent,
      samples,
      marginDrawn,
      tokens: {
        foreground: token("--foreground"),
        muted: token("--muted"),
        accent: token("--accent"),
      },
    };
  }, png.toString("base64"));
}

test.describe("security graph contrast", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "sets its own viewport widths");
  });

  for (const theme of ["dark", "light"] as const) {
    for (const width of [390, 768, 1024, 1400, 1440, 1920] as const) {
      test(`the text column holds no graph pixel, ${theme} at ${width}px`, async ({ page }) => {
        // A11Y-2: with the graph lit, muted text on the old graph fell to 2.5:1 to 3.8:1. Here the
        // column must be pixel-identical to the page background, so text keeps the token contrast.
        await page.addInitScript(
          ([key, value]) => localStorage.setItem(key as string, value as string),
          [THEME_KEY, theme],
        );
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/systems/");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await waitForHydration(page);

        const report = await graphPixels(page);
        expect(report.samples, "graph pixels inside the text column").toEqual([]);
        expect(report.columnDifferent).toBe(0);
        // Not vacuous: the busiest state really is drawn, in the margins.
        expect(report.marginDrawn, "graph pixels in the margins").toBeGreaterThan(300);

        // Worst-case pixel under any text is the background itself, so contrast is the tokens' own.
        const worst = toHex(report.background);
        expect(contrast(report.tokens.muted, worst), "muted text").toBeGreaterThanOrEqual(4.5);
        expect(contrast(report.tokens.foreground, worst), "body text").toBeGreaterThanOrEqual(7);
        expect(contrast(report.tokens.accent, worst), "accent text").toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

test.describe("security graph state changes", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "computed style and layer checks, one run is enough");
  });

  const transitions = (page: Page) =>
    page.evaluate(() => {
      const root = document.querySelector('[data-graph="root"]');
      return [...(root?.querySelectorAll("*") ?? [])]
        .map((el) => {
          const style = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            property: style.transitionProperty,
            durations: style.transitionDuration.split(",").map((value) => Number.parseFloat(value)),
          };
        })
        .filter((entry) => entry.durations.some((seconds) => seconds > 0));
    });

  test("a state change is an opacity-only transition of at most 400ms", async ({ page }) => {
    // perf-8: fill, stroke and r transitions of 1.4s put long frames into scrolling on a phone.
    await page.goto("/");
    const animated = await transitions(page);
    expect(animated.length, "elements that transition").toBeGreaterThan(0);
    for (const entry of animated) {
      expect(entry.property, entry.tag).toBe("opacity");
      for (const seconds of entry.durations) expect(seconds, entry.tag).toBeLessThanOrEqual(0.4);
    }
  });

  test("nothing in the graph animates once the page is idle", async ({ page }) => {
    // WCAG 2.2.2: the graph has no loop, only finite transitions that have ended.
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    await page.waitForTimeout(900);
    const running = await page.evaluate(
      () =>
        document
          .querySelector('[data-graph="root"]')
          ?.getAnimations({ subtree: true })
          .map((animation) => animation.constructor.name) ?? ["root missing"],
    );
    expect(running).toEqual([]);
  });

  test("the lit nodes follow the page being read", async ({ page }) => {
    await page.goto("/systems/witness/");
    await waitForHydration(page);
    const lit = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-graph="plane"] g[data-on]:has(> circle[r="7"])')].map(
          (group) => group.querySelector("text")?.textContent ?? "",
        ),
      );
    // WITNESS is tagged ai, agents, detection and automation in content/projects/witness.ts.
    await expect
      .poll(lit)
      .toEqual(expect.arrayContaining(["AI", "AGENTS", "DETECTION", "AUTOMATION"]));
    expect(await lit()).not.toContain("DFIR");
    // And the lit layer is visible, not just marked: its transition has finished at full opacity.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const group = document.querySelector(
            '[data-graph="plane"] g[data-on]:has(> circle[r="7"])',
          );
          return group ? Number(getComputedStyle(group).opacity) : -1;
        }),
      )
      .toBe(1);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("state changes are instant", async ({ page }) => {
      await page.goto("/");
      // globals.css shortens every transition to 0.001ms under reduced motion; none may be longer.
      const slow = (await transitions(page)).filter((entry) =>
        entry.durations.some((seconds) => seconds > 0.001),
      );
      expect(slow).toEqual([]);
    });
  });
});
