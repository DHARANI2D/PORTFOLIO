import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { THEME_KEY, type Theme } from "../../lib/preferences";
import { OUT_DIR } from "./built-site";
import fs from "node:fs";
import path from "node:path";

/**
 * Page fixes: avatar format and frame, contact field contrast, one-line LinkedIn row, the encoded
 * mailto length cap, certifications wording, the /security/ page, two-way links between notes,
 * research and systems, inbound links to /contact/, and research meta descriptions.
 */

type Rgb = [number, number, number];

function parse(value: string): Rgb {
  const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(value);
  if (!m) throw new Error(`colour: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function lum([r, g, b]: Rgb): number {
  const c = (n: number) => {
    const s = n / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
function ratio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

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

test.describe("avatar (perf-3, D11)", () => {
  test("is a small WebP with real dimensions, in a bordered frame, and the PNG is gone", async ({
    page,
  }) => {
    expect(fs.existsSync(path.join(OUT_DIR, "helios-avatar.png"))).toBe(false);
    const size = fs.statSync(path.join(OUT_DIR, "helios-avatar.webp")).size;
    expect(size).toBeLessThan(30 * 1024);

    await page.goto("/about/");
    const img = page.getByRole("img", { name: /Illustrated portrait/ });
    await expect(img).toHaveAttribute("src", "/helios-avatar.webp");
    await expect(img).toHaveAttribute("width", "320");
    await expect(img).toHaveAttribute("height", "395");
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(320);
    const frame = await img.evaluate((el) => {
      const style = getComputedStyle(el.parentElement as HTMLElement);
      return { width: style.borderTopWidth, radius: style.borderTopLeftRadius };
    });
    expect(frame.width).toBe("1px");
    expect(parseFloat(frame.radius)).toBeGreaterThan(0);
  });
});

test.describe("contact (D6, D13, UX-16)", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`field borders are at least 3:1 against field and card (${theme})`, async ({ page }) => {
      await seedTheme(page, theme);
      await page.goto("/contact/");
      for (const selector of ['input[name="name"]', 'input[name="email"]', "select", "textarea"]) {
        const field = page.locator(`form ${selector}`).first();
        const colours = await field.evaluate((el) => {
          const style = getComputedStyle(el);
          const card = getComputedStyle(el.closest("form") as HTMLElement);
          return {
            border: style.borderTopColor,
            fill: style.backgroundColor,
            card: card.backgroundColor,
          };
        });
        const border = parse(colours.border);
        expect(ratio(border, parse(colours.card)), `${selector} vs card`).toBeGreaterThanOrEqual(3);
        expect(ratio(border, parse(colours.fill)), `${selector} vs fill`).toBeGreaterThanOrEqual(3);
      }
    });
  }

  for (const width of [320, 390, 1440]) {
    test(`LinkedIn row stays on one line at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contact/");
      const value = page.getByRole("link", { name: /LINKEDIN/ }).locator("span.font-mono");
      const lines = await value.evaluate((el) => {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lineHeight);
      });
      expect(lines).toBe(1);
      await expect(value).toHaveText("in/dharanidharan-senthilkumar");
    });
  }

  test("a message whose encoded mailto is too long is not opened and shows the email", async ({
    page,
  }) => {
    await page.goto("/contact/");
    await page.evaluate(() => {
      (window as unknown as { __opened?: string }).__opened = "";
    });
    const form = page.locator("form");
    await form.locator('input[name="name"]').fill("Test");
    await form.locator('input[name="email"]').fill("test@example.com");
    await form.locator("select").selectOption("research");
    // 1000 characters is allowed by the cap, but each Tamil letter encodes to 9 URL characters.
    await form.locator("textarea").fill("வணக்கம் ".repeat(125));
    const startUrl = page.url();
    await form.getByRole("button", { name: /OPEN EMAIL DRAFT/ }).click();
    const status = form.getByRole("status");
    await expect(status).toContainText("Too long for an email link");
    await expect(status.getByRole("link", { name: "dharanidharan2d@gmail.com" })).toBeVisible();
    expect(page.url()).toBe(startUrl);
  });
});

test.describe("certifications wording (F10)", () => {
  test("the intro is exactly true and the group is called EARNED", async ({ page }) => {
    await page.goto("/certifications/");
    await expect(
      page.getByText("Where a public verification page exists, the credential links to it."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "EARNED", level: 2 })).toBeVisible();
    await expect(page.getByText("Verified credentials link")).toHaveCount(0);
  });
});

test.describe("/security/ (SEC-10)", () => {
  test("has one h1, the contact email, security.txt and privacy links, and no axe violations", async ({
    page,
  }) => {
    await page.goto("/security/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Reporting a security issue with this site",
    );
    await expect(page.locator("main a[href^='mailto:']").first()).toBeVisible();
    await expect(page.locator("main a[href='/.well-known/security.txt']")).toBeVisible();
    await expect(page.locator("main a[href='/privacy/']")).toBeVisible();
    await expect(page).toHaveTitle(/Reporting a security issue/);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("internal links (SEO-2, UX-07)", () => {
  test("research WITNESS lists its field notes; the notes link back to the system and research", async ({
    page,
  }) => {
    await page.goto("/research/witness/");
    const noteLink = page.locator(
      "main a[href='/writing/deterministic-evidence-gate-for-remediation/']",
    );
    await expect(noteLink).toBeVisible();

    await noteLink.click();
    await expect(page.locator("main a[href='/systems/witness/']").first()).toBeVisible();
    await expect(page.locator("main a[href='/research/witness/']").first()).toBeVisible();
  });

  test("the SignalFusion note links back to its system", async ({ page }) => {
    await page.goto("/writing/siem-alerts-to-correlated-investigations/");
    await expect(page.locator("main a[href='/systems/signalfusion-core/']").first()).toBeVisible();
  });

  for (const route of ["/about/", "/experience/", "/resume/"]) {
    test(`${route} links to /contact/`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("main a[href='/contact/']").first()).toBeAttached();
    });
  }
});

test.describe("research meta descriptions (SEO-3)", () => {
  for (const slug of ["witness", "securemodelgate", "ai-dfir", "agentic-security"]) {
    test(`/research/${slug}/ description is a complete sentence within 160 characters`, async ({
      page,
    }) => {
      await page.goto(`/research/${slug}/`);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description).toMatch(/[.!?]["”’']?$/);
      expect(description?.length ?? 999).toBeLessThanOrEqual(160);
      expect(description).not.toContain("…");
    });
  }
});
