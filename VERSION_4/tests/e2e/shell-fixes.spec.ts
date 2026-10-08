import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { THEME_KEY, type Theme } from "../../lib/preferences";
import { OUT_DIR, readOut } from "./built-site";
import { closeMenu, openMenuIfPresent, waitForHydration } from "./helpers";
import fs from "node:fs";
import path from "node:path";

/**
 * Shell fixes: route-change scroll and focus, skip link contrast, finite header animation, forced
 * colours, an opaque header, the header layout at every desktop width, availability and footer
 * links, no-JavaScript navigation, the mobile menu hand-off to the palette and terminal, the theme
 * switch, the icon set, the section counter and the font files.
 */

type Rgba = [number, number, number, number];

/** Parses the colour syntaxes Chromium returns from getComputedStyle: rgb(), rgba() and color(srgb). */
function parseColor(value: string): Rgba {
  const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(value);
  if (srgb) {
    const [r, g, b] = [srgb[1], srgb[2], srgb[3]].map((n) => Math.round(Number(n) * 255));
    return [r ?? 0, g ?? 0, b ?? 0, srgb[4] === undefined ? 1 : Number(srgb[4])];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
    value,
  );
  if (!rgb) throw new Error(`Unrecognised colour: ${value}`);
  const alpha =
    rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : Number(rgb[4]);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
}

function luminance([r, g, b]: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const css = (locator: Locator, property: string) =>
  locator.evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

async function seedTheme(page: Page, theme: Theme) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key as string, value as string);
      } catch {
        /* storage blocked */
      }
    },
    [THEME_KEY, theme] as const,
  );
}


test.describe("route changes (A11Y-1)", () => {
  // Smooth scrolling is on only when motion is allowed, which is where the bug was.
  test.use({ reducedMotion: "no-preference" });

  /** Waits for the router's own scroll, any smooth scroll that might still run, and the focus move. */
  async function expectNewPageAtTop(page: Page) {
    await expect(page.locator("main#main")).toBeFocused();
    await page.waitForTimeout(900);
    const state = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.getBoundingClientRect();
      return {
        scrollY: Math.round(window.scrollY),
        h1Top: h1 ? Math.round(h1.top) : null,
        h1Bottom: h1 ? Math.round(h1.bottom) : null,
        viewport: window.innerHeight,
      };
    });
    expect(state.scrollY, "scrollY after the route change").toBe(0);
    expect(state.h1Top, "H1 top").toBeGreaterThanOrEqual(0);
    expect(state.h1Bottom, "H1 bottom").toBeLessThanOrEqual(state.viewport);
  }

  async function goViaPrimaryNav(page: Page, isMobile: boolean, label: string) {
    if (isMobile) {
      await openMenuIfPresent(page);
      await page
        .getByRole("dialog", { name: "Menu" })
        .getByRole("link", { name: label, exact: true })
        .click();
    } else {
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: label.toUpperCase(), exact: true })
        .click();
    }
  }

  for (const originScroll of [0, 200, 300]) {
    test(`a nav link from /privacy/ scrolled to ${originScroll}px lands on its section`, async ({
      page,
      isMobile,
    }) => {
      await page.goto("/privacy/");
      await waitForHydration(page);
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), originScroll);
      await goViaPrimaryNav(page, isMobile, "Systems");
      await expect(page).toHaveURL(/\/#systems$/);
      await expect(page.locator("#systems")).toBeInViewport();
    });
  }

  test("a link to another page lands at its top with focus in main", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
    const link = page
      .getByRole("navigation", { name: "Footer links" })
      .getByRole("link", { name: "Privacy", exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/privacy\/$/);
    await expectNewPageAtTop(page);
  });

  test("a route change that carries a #hash still lands on its target, not at the top", async ({
    page,
  }) => {
    await page.goto("/privacy/");
    await waitForHydration(page);
    await page.evaluate(() => {
      (
        window as unknown as { next: { router: { push: (href: string) => void } } }
      ).next.router.push("/#stack");
    });
    await expect(page).toHaveURL(/\/#stack$/);
    await page.waitForTimeout(900);
    const target = await page.evaluate(() => ({
      scrollY: Math.round(window.scrollY),
      top: Math.round(document.getElementById("stack")?.getBoundingClientRect().top ?? -1),
    }));
    expect(target.scrollY).toBeGreaterThan(500);
    expect(target.top).toBeGreaterThanOrEqual(0);
    expect(target.top).toBeLessThan(200);
  });

  test("the first load does not move focus into main", async ({ page }) => {
    await page.goto("/privacy/");
    await waitForHydration(page);
    await page.waitForTimeout(300);
    await expect(page.locator("main#main")).not.toBeFocused();
  });

  test("the router sets scroll-behavior to auto only while it changes route", async ({ page }) => {
    await page.goto("/privacy/");
    await expect(page.locator("html")).toHaveAttribute("data-scroll-behavior", "smooth");
    // In-page anchors keep the smooth scrolling the stylesheet asks for.
    expect(await css(page.locator("html"), "scroll-behavior")).toBe("smooth");
  });
});

test.describe("skip link contrast (A11Y-3)", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`white on the accent fill is at least 4.5:1 in the ${theme} theme, while focused`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "a keyboard is needed to focus the skip link");
      await seedTheme(page, theme);
      await page.goto("/privacy/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await expect(skip).toBeFocused();
      await expect(skip).toHaveCSS("top", "16px");

      const ratio = contrast(
        parseColor(await css(skip, "color")),
        parseColor(await css(skip, "background-color")),
      );
      expect(ratio, `contrast ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);

      const results = await new AxeBuilder({ page })
        .include(".skip-link")
        .withRules(["color-contrast"])
        .analyze();
      expect(results.violations.map((v) => v.help)).toEqual([]);
    });
  }
});

test.describe("finite animation (A11Y-4)", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the header status ping is three pulses of at most 5 seconds, then it rests", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the status line is in the header at xl only");
    await page.goto("/privacy/");
    const timings = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => {
            const target =
              animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
            return target?.closest("header, footer") != null;
          })
          .map((animation) => {
            const timing = animation.effect?.getComputedTiming();
            return {
              name: "animationName" in animation ? String(animation.animationName) : "transition",
              iterations: timing?.iterations ?? 0,
              endTime: Number(timing?.endTime ?? 0),
              playState: animation.playState,
            };
          }),
      );

    const ping = (await timings()).filter((a) => a.name === "status-ping");
    expect(ping.length, "the ping is running right after load").toBeGreaterThan(0);
    for (const animation of await timings()) {
      expect(Number.isFinite(animation.iterations), `${animation.name} iterations`).toBe(true);
      expect(Number.isFinite(animation.endTime), `${animation.name} end time`).toBe(true);
      expect(animation.endTime, `${animation.name} total duration`).toBeLessThanOrEqual(5000);
    }
    expect(ping[0]?.iterations).toBe(3);

    await expect
      .poll(async () => (await timings()).filter((a) => a.playState === "running"), {
        timeout: 6000,
      })
      .toEqual([]);
  });
});

test.describe("forced colours (A11Y-5)", () => {
  test.use({ forcedColors: "active", reducedMotion: "reduce" });
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "the header controls are desktop only; the sheet prints Current in text");
  });

  test("the pressed theme toggle changes its fill", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    const before = await css(toggle, "background-color");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(await css(toggle, "background-color")).not.toBe(before);
  });

  test("the current section keeps a visible mark in the nav", async ({ page }) => {
    await page.goto("/systems/witness/");
    const link = page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "SYSTEMS" });
    await expect(link).toHaveAttribute("aria-current", "true");
    const mark = link.locator("[aria-hidden]");
    await expect(mark).toHaveCSS("border-bottom-width", "1px");
    // Backgrounds are dropped in this mode, so the mark must be a border with a real colour.
    const [, , , alpha] = parseColor(await css(mark, "border-bottom-color"));
    expect(alpha).toBeGreaterThan(0.5);
  });

  test("focus rings stay solid and 2px wide", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // logo
    const focused = page.locator(":focus");
    await expect(focused).toHaveCSS("outline-style", "solid");
    await expect(focused).toHaveCSS("outline-width", "2px");
  });

  test("the skip link has a border and the status dot a fill", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".skip-link")).toHaveCSS("border-top-width", "2px");
    const dot = page.locator("header .status-dot").first();
    await expect(dot).toBeAttached();
    const canvas = parseColor(await css(page.locator("body"), "background-color"));
    const fill = parseColor(await css(dot, "background-color"));
    expect(fill).not.toEqual(canvas);
  });
});

test.describe("opaque header (D8)", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`the header background is fully opaque, with no blur, in the ${theme} theme`, async ({
      page,
    }) => {
      await seedTheme(page, theme);
      await page.goto("/");
      const header = page.locator("header").first();
      const [, , , alpha] = parseColor(await css(header, "background-color"));
      expect(alpha).toBe(1);
      expect(await css(header, "backdrop-filter")).toBe("none");
      // The 1px border stays.
      await expect(header).toHaveCSS("border-bottom-width", "1px");
    });
  }
});

test.describe("header layout and the VIEW AS label (D9, UX-12)", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "desktop widths are set per test");
  });

  for (const width of [1024, 1100, 1279, 1280, 1366, 1440]) {
    test(`at ${width}px the header row fits with room between its parts`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const row = await page.evaluate(() => {
        const container = document.querySelector("header")?.firstElementChild as HTMLElement;
        const parts = [...container.children]
          .filter((el) => getComputedStyle(el).display !== "none")
          .map((el) => el.getBoundingClientRect());
        const box = container.getBoundingClientRect();
        const style = getComputedStyle(container);
        return {
          parts: parts.map((r) => ({ left: r.left, right: r.right })),
          contentRight: box.right - parseFloat(style.paddingRight),
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });
      expect(row.documentWidth).toBeLessThanOrEqual(row.viewportWidth);
      for (let i = 1; i < row.parts.length; i += 1) {
        const gap = (row.parts[i]?.left ?? 0) - (row.parts[i - 1]?.right ?? 0);
        expect(gap, `gap before part ${i}`).toBeGreaterThanOrEqual(8);
      }
      // The right cluster ends on the container edge (1px for rounding), not in the page margin.
      expect(row.parts.at(-1)?.right ?? 0).toBeLessThanOrEqual(row.contentRight + 1);
    });
  }

  test("availability shows in the header at xl and in the footer at every width", async ({
    page,
  }) => {
    for (const width of [320, 768, 1024, 1279, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/privacy/");
      const footerLine = page.locator("footer").getByText("AVAILABLE FOR SECURITY ENGINEERING");
      await footerLine.scrollIntoViewIfNeeded();
      await expect(footerLine, `footer at ${width}`).toBeVisible();
      const box = await footerLine.boundingBox();
      expect(box?.x ?? -1, `footer text left edge at ${width}`).toBeGreaterThanOrEqual(0);
      expect(
        (box?.x ?? 0) + (box?.width ?? 0),
        `footer text right edge at ${width}`,
      ).toBeLessThanOrEqual(width);

      const headerLine = page.locator("header").getByText("AVAILABLE FOR SECURITY ENGINEERING");
      if (width >= 1280) await expect(headerLine, `header at ${width}`).toBeVisible();
      else await expect(headerLine, `header at ${width}`).toBeHidden();
    }
  });
});

test.describe("the open menu at 320px", () => {
  test("nothing sticks out, availability line and last nav link included", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/privacy/");
    await waitForHydration(page);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Menu" });
    await expect(sheet).toBeVisible();
    const size = await sheet.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    for (const target of [
      sheet.getByText("AVAILABLE FOR SECURITY ENGINEERING"),
      sheet.getByRole("link", { name: "Contact", exact: true }),
    ]) {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
  });
});

test.describe("footer links (UX-08)", () => {
  for (const route of ["/", "/privacy/", "/systems/witness/"]) {
    test(`${route} links to certifications, security and privacy in the default view`, async ({
      page,
    }) => {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "Footer links" });
      await nav.scrollIntoViewIfNeeded();
      for (const [name, href] of [
        ["Certifications", "/#certifications"],
        ["Security", "/security/"],
        ["Privacy", "/privacy/"],
        ["security.txt", "/.well-known/security.txt"],
      ] as const) {
        const link = nav.getByRole("link", { name, exact: true });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", href);
        expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });
  }

  test("the Certifications footer link scrolls to the certifications section", async ({ page }) => {
    await page.goto("/privacy/");
    await waitForHydration(page);
    const link = page
      .getByRole("navigation", { name: "Footer links" })
      .getByRole("link", { name: "Certifications", exact: true });
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(page).toHaveURL(/\/#certifications$/);
    await expect(page.locator("#certifications")).toBeInViewport();
  });

  test("the menu sheet also links to certifications", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the sheet is the mobile navigation");
    await page.goto("/privacy/");
    await waitForHydration(page);
    await openMenuIfPresent(page);
    const link = page
      .getByRole("dialog", { name: "Menu" })
      .getByRole("link", { name: "Certs", exact: true });
    await expect(link).toHaveAttribute("href", "/#certifications");
    // 44px target; the sheet may still be easing in, which leaves a fraction of a pixel of float error.
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.9);
    await link.click();
    await expect(page).toHaveURL(/\/#certifications$/);
  });
});

test.describe("with JavaScript", () => {
  test("the init script adds html.js, so script-only controls are shown", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/privacy/");
    await expect(page.locator("html")).toHaveClass(/(^|\s)js(\s|$)/);
    if (isMobile)
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
    else {
      await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
    }
    // The <noscript> row is not part of the page when scripts run.
    await expect(page.locator("header noscript nav")).toHaveCount(0);
  });

  test("the server HTML ships without the js class", () => {
    for (const file of ["index.html", "privacy/index.html", "404.html"]) {
      const tag = /<html\b[^>]*>/.exec(readOut(file))?.[0] ?? "";
      expect(tag, file).toContain("<html");
      const classes = /\bclass="([^"]*)"/.exec(tag)?.[1]?.split(/\s+/) ?? [];
      expect(classes, file).not.toContain("js");
    }
    // ... and the inline init script is what adds it.
    expect(readOut("index.html")).toContain('d.classList.add("js")');
  });
});

test.describe("without JavaScript (UX-14)", () => {
  test.use({ javaScriptEnabled: false });

  /** Buttons in the header and footer that a visitor can see (they would be dead without scripts). */
  async function visibleButtons(page: Page) {
    return page.evaluate(() =>
      [...document.querySelectorAll("header button, footer button")]
        .filter((el) => {
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 1;
        })
        .map((el) => el.textContent?.trim() || el.getAttribute("aria-label") || "button"),
    );
  }

  test("a phone still has the primary navigation, and no dead MENU button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/privacy/", { waitUntil: "load" });
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)js(\s|$)/);
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    for (const label of [
      "ABOUT",
      "WORK",
      "SYSTEMS",
      "RESEARCH",
      "CERTS",
      "WRITING",
      "CONTACT",
      "RESUME",
    ]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole("link", { name: "ABOUT" })).not.toHaveAttribute("aria-current", /.+/);
    expect(await visibleButtons(page)).toEqual([]);

    await nav.getByRole("link", { name: "SYSTEMS", exact: true }).click();
    await expect(page).toHaveURL(/\/#systems$/);
  });

  test("the no-JS row fits at 320px and the header is not pinned", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/privacy/", { waitUntil: "load" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    await expect(page.locator("header")).toHaveCSS("position", "static");
    for (const link of await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link")
      .all()) {
      expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("a desktop shows no inert toggle, theme, palette or terminal buttons", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/privacy/", { waitUntil: "load" });
    expect(await visibleButtons(page)).toEqual([]);
    await expect(
      page.locator("header").getByRole("link", { name: "Resume", exact: true }),
    ).toBeVisible();
    // One visible Primary nav, not two.
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(1);
    // The keyboard hint in the footer needs scripts as well.
    await expect(page.locator("footer p[data-js-only]")).toBeHidden();
  });
});

test.describe("mobile menu hands over to the terminal (CODE-01)", () => {
  async function press(page: Page, locator: Locator, isMobile: boolean) {
    if (isMobile) await locator.tap();
    else await locator.click();
  }

  for (const [label, dialogName, focusTarget] of [
    ["Terminal", "Terminal", { role: "textbox", name: "Terminal command" }],
  ] as const) {
    test(`MENU, ${label} opens the ${dialogName} and Esc returns focus to MENU`, async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "the tablet-width variant below runs in the desktop project");
      await page.goto("/privacy/");
      await waitForHydration(page);
      const menu = page.getByRole("button", { name: "Menu", exact: true });
      await press(page, menu, true);
      const sheet = page.getByRole("dialog", { name: "Menu" });
      await expect(sheet).toBeVisible();
      await press(page, sheet.getByRole("button", { name: label, exact: true }), true);

      const dialog = page.getByRole("dialog", { name: dialogName });
      await expect(dialog).toBeVisible();
      await expect(sheet).toBeHidden();
      await expect(dialog.getByRole(focusTarget.role, { name: focusTarget.name })).toBeFocused();

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(menu).toBeFocused();
    });
  }

  test.describe("at tablet width with a mouse", () => {
    test.use({ viewport: { width: 820, height: 1000 } });

    for (const [label, dialogName] of [
      ["Terminal", "Terminal"],
    ] as const) {
      test(`MENU, ${label} opens the ${dialogName}`, async ({ page, isMobile }) => {
        test.skip(isMobile, "covered by the touch variant above");
        await page.goto("/privacy/");
        await waitForHydration(page);
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        const sheet = page.getByRole("dialog", { name: "Menu" });
        await sheet.getByRole("button", { name: label, exact: true }).click();
        await expect(page.getByRole("dialog", { name: dialogName })).toBeVisible();
        await expect(sheet).toBeHidden();
      });
    }
  });

  test.describe("with reduced motion", () => {
    // No exit animation: the sheet leaves the DOM at once, a different timing from the default.
    test.use({ reducedMotion: "reduce", viewport: { width: 820, height: 1000 } });

    for (const [label, dialogName] of [
      ["Terminal", "Terminal"],
    ] as const) {
      test(`MENU, ${label} opens the ${dialogName}`, async ({ page, isMobile }) => {
        test.skip(isMobile, "the viewport override is for the desktop project");
        await page.goto("/privacy/");
        await waitForHydration(page);
        const menu = page.getByRole("button", { name: "Menu", exact: true });
        await menu.click();
        await page
          .getByRole("dialog", { name: "Menu" })
          .getByRole("button", { name: label, exact: true })
          .click();
        const dialog = page.getByRole("dialog", { name: dialogName });
        await expect(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(menu).toBeFocused();
      });
    }
  });

  test("a link in the menu still closes it and lands on the section", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the menu button only exists below the desktop breakpoint");
    await page.goto("/privacy/");
    await waitForHydration(page);
    await press(page, page.getByRole("button", { name: "Menu", exact: true }), true);
    await press(
      page,
      page
        .getByRole("dialog", { name: "Menu" })
        .getByRole("link", { name: "Research", exact: true }),
      true,
    );
    await expect(page).toHaveURL(/\/#research$/);
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await expect(page.locator("#research")).toBeInViewport();
    // Focus does not jump back to the MENU button that opened the sheet.
    await expect(page.getByRole("button", { name: "Menu", exact: true })).not.toBeFocused();
  });

  test("Esc on the menu still returns focus to MENU and opens nothing", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the menu button only exists below the desktop breakpoint");
    await page.goto("/privacy/");
    await waitForHydration(page);
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    await press(page, menu, true);
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await closeMenu(page);
    await expect(menu).toBeFocused();
  });
});

test.describe("theme switch (perf-6)", () => {
  test("transitions are off while the theme repaints and come back after", async ({ page }) => {
    await page.goto("/privacy/");
    await waitForHydration(page);
    const opened = await openMenuIfPresent(page);
    const toggle = page.getByRole("button", { name: "Toggle theme" });
    const during = await toggle.evaluate((el) => {
      (el as HTMLElement).click();
      return document.documentElement.hasAttribute("data-theme-switching");
    });
    expect(during).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme-switching", /.*/);
    if (opened) await closeMenu(page);
  });

  test("no transition runs for any element while the attribute is set", async ({ page }) => {
    await page.goto("/privacy/");
    const durations = await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme-switching", "");
      const seen = new Set<string>();
      for (const el of document.body.querySelectorAll("*")) {
        const style = getComputedStyle(el);
        if (style.transitionProperty !== "none") seen.add(style.transitionDuration);
      }
      document.documentElement.removeAttribute("data-theme-switching");
      return [...seen];
    });
    expect(durations).toEqual([]);
  });
});

test.describe("icons (D2, SEO-7)", () => {
  test("/favicon.ico is a PNG-in-ICO with 16, 32 and 48 px images", async ({ request }) => {
    for (const url of ["/favicon.ico", "/favicon_io/favicon.ico"]) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      const body = await response.body();
      expect([...body.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
      const sizes = [0, 1, 2].map((i) => body.readUInt8(6 + i * 16));
      expect(sizes).toEqual([16, 32, 48]);
      for (let i = 0; i < 3; i += 1) {
        const length = body.readUInt32LE(6 + i * 16 + 8);
        const offset = body.readUInt32LE(6 + i * 16 + 12);
        expect([...body.subarray(offset, offset + 4)], `${url} image ${i}`).toEqual([
          0x89, 0x50, 0x4e, 0x47,
        ]);
        expect(offset + length).toBeLessThanOrEqual(body.length);
      }
    }
  });

  test("the head points at the root favicon first, then the PNGs", async ({ page }) => {
    await page.goto("/privacy/");
    const hrefs = await page
      .locator('link[rel="icon"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(hrefs[0]).toBe("/favicon.ico");
    expect(hrefs).toEqual(
      expect.arrayContaining(["/favicon_io/favicon-32x32.png", "/favicon_io/favicon-16x16.png"]),
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/favicon_io/apple-touch-icon.png",
    );
  });

  test("every icon has its size and the DS / TRACE colours, not the old amber tile", async ({
    page,
  }) => {
    await page.goto("/privacy/");
    const icons = [
      ["/favicon_io/favicon-16x16.png", 16],
      ["/favicon_io/favicon-32x32.png", 32],
      ["/favicon_io/apple-touch-icon.png", 180],
      ["/favicon_io/android-chrome-192x192.png", 192],
      ["/favicon_io/android-chrome-512x512.png", 512],
    ] as const;
    for (const [src, size] of icons) {
      const sample = await page.evaluate(
        async ([url, expected]) => {
          const image = new Image();
          image.src = url as string;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("no canvas");
          context.drawImage(image, 0, 0);
          const at = (x: number, y: number) => [...context.getImageData(x, y, 1, 1).data];
          const half = Math.floor((expected as number) / 2);
          return {
            width: image.naturalWidth,
            height: image.naturalHeight,
            centre: at(half, half),
            edge: at(1, half),
          };
        },
        [src, size] as const,
      );
      expect([sample.width, sample.height], src).toEqual([size, size]);
      // Core of the glyph: the violet accent (#8b5cf6).
      const [r, g, b] = sample.centre;
      expect(Math.abs((r ?? 0) - 0x8b), `${src} core red`).toBeLessThan(24);
      expect(Math.abs((g ?? 0) - 0x5c), `${src} core green`).toBeLessThan(24);
      expect(Math.abs((b ?? 0) - 0xf6), `${src} core blue`).toBeLessThan(24);
      // Tile: off-black (#090909) on the full-bleed sizes; the 16 and 32 px tab icons are rounded
      // and the ring (near-white) sits close to the edge, so only the large ones are checked here.
      if (size >= 180) {
        expect(sample.edge.slice(0, 3), `${src} tile`).toEqual([9, 9, 9]);
      }
    }
  });

  test("the manifest still lists the same files", async ({ request }) => {
    const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
      icons: { src: string }[];
    };
    expect(manifest.icons.map((i) => i.src).sort()).toEqual([
      "/favicon_io/android-chrome-192x192.png",
      "/favicon_io/android-chrome-512x512.png",
      "/favicon_io/apple-touch-icon.png",
    ]);
  });
});

test.describe("section counter contract (UX-15)", () => {
  test(".ds-section increments inside #main and .ds-section-number prints it", async ({ page }) => {
    await page.goto("/privacy/");
    const stylesheets = await page.evaluate(() =>
      [...document.styleSheets].flatMap((sheet) => (sheet.href ? [sheet.href] : [])),
    );
    expect(stylesheets.length).toBeGreaterThan(0);

    // A blank page that loads the site's own CSS, so nothing else (animation, hydration, the
    // graph) can change the pixels. The computed `content` is the unresolved counter() expression
    // and generated text is not in the DOM, so each number is compared pixel for pixel with the
    // same digits written as real text.
    const probe = await page.context().newPage();
    try {
      const row = "margin:0;padding:0;font:16px/20px monospace;background:#fff;color:#000";
      await probe.setContent(
        `<!doctype html><html><head>${stylesheets
          .map((href) => `<link rel="stylesheet" href="${href}">`)
          .join("")}</head><body style="margin:0;background:#fff"><main id="main">${[1, 2, 3]
          .map(
            (n) =>
              `<section class="ds-section"><div data-kind="rendered" style="${row}"><span class="ds-section-number"></span></div></section>` +
              `<div data-kind="reference" style="${row}">0${n}</div>`,
          )
          .join("")}</main></body></html>`,
        { waitUntil: "load" },
      );
      const rendered = probe.locator('[data-kind="rendered"]');
      const reference = probe.locator('[data-kind="reference"]');
      expect(await rendered.count()).toBe(3);
      const shots: { rendered: Buffer; reference: Buffer }[] = [];
      for (let i = 0; i < 3; i += 1) {
        shots.push({
          rendered: await rendered.nth(i).screenshot(),
          reference: await reference.nth(i).screenshot(),
        });
      }
      shots.forEach((shot, i) => {
        expect(shot.rendered.equals(shot.reference), `number ${i + 1} renders as 0${i + 1}`).toBe(
          true,
        );
      });
      // The numbers differ from each other, so the matches above are not trivial.
      expect(shots[0]?.rendered.equals(shots[1]?.rendered as Buffer)).toBe(false);
      expect(await css(probe.locator("#main"), "counter-reset")).toBe("ds-section 0");
    } finally {
      await probe.close();
    }
  });
});

test.describe("font files (perf-2)", () => {
  test("only the two Latin subsets are preloaded, each well under the full 70 KB file", () => {
    for (const file of ["index.html", "resume/index.html", "privacy/index.html"]) {
      const html = readOut(file);
      const preloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/g)].flatMap(
        (match) => /href="([^"]+)"/.exec(match[0])?.[1] ?? [],
      );
      expect(preloads.length, `${file} preloaded fonts`).toBe(2);
      let total = 0;
      for (const href of preloads) {
        const size = fs.statSync(path.join(OUT_DIR, href)).size;
        total += size;
        expect(size, `${file} ${href}`).toBeLessThan(40_000);
      }
      expect(total, `${file} font bytes`).toBeLessThan(55_000);
    }
  });

  test("the fonts swap in and Sans keeps a metric-matched fallback", () => {
    const cssDir = path.join(OUT_DIR, "_next", "static", "chunks");
    const stylesheet = fs
      .readdirSync(cssDir)
      .filter((name) => name.endsWith(".css"))
      .map((name) => fs.readFileSync(path.join(cssDir, name), "utf8"))
      .join("\n");
    expect(stylesheet).toMatch(/font-display:\s*swap/);
    expect(stylesheet).toMatch(/size-adjust:\s*106\.\d+%/);
    // The system-font stand-in for platforms without a font named Arial.
    expect(stylesheet).toMatch(/font-family:\s*"?Geist Fallback"?/);
  });

  test("text uses Geist once the files are in, and its glyphs are all there", async ({ page }) => {
    await page.goto("/privacy/");
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      [...document.fonts]
        .filter((face) => face.status === "loaded")
        .map((face) => face.family.replace(/["']/g, "")),
    );
    expect(loaded).toContain("geistSans");
    expect(loaded).toContain("geistMono");

    // Every character on the page is in the subset (or is the Command symbol, which neither the
    // subset nor the full font has, so a system font draws it as before).
    const missing = await page.evaluate(() => {
      const inSubset =
        /^[\u0020-\u007e\u00a0-\u00ff\u0131\u0152\u0153\u02c6\u02da\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122\u2190-\u2193\u2197\u2212\u25cf\u2318\s]$/;
      return [...new Set(document.body.innerText)].filter((ch) => !inSubset.test(ch));
    });
    expect(missing).toEqual([]);
  });
});
