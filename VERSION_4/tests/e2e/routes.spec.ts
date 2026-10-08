import { expect, test } from "./fixtures";
import { sitemapPaths } from "./built-site";
import { waitForHydration, watchProblems } from "./helpers";

// Routes come from out/sitemap.xml, so a new project, research item or note is covered the moment
// it exists. Each page must load cleanly with the production CSP enforced.
const routes = sitemapPaths();

test.describe("routes", () => {
  test("the sitemap lists the pages the site promises", () => {
    for (const route of ["/", "/resume/", "/privacy/", "/security/"]) {
      expect(routes, route).toContain(route);
    }
    expect(routes.some((route) => route.startsWith("/systems/") && route !== "/systems/")).toBe(
      true,
    );
    expect(routes.some((route) => route.startsWith("/research/") && route !== "/research/")).toBe(
      true,
    );
    expect(routes.some((route) => route.startsWith("/writing/") && route !== "/writing/")).toBe(
      true,
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  for (const route of routes) {
    test(`${route} loads cleanly`, async ({ page }) => {
      const problems = watchProblems(page);

      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status()).toBe(200);
      await waitForHydration(page);

      // Structure every page needs.
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("header")).not.toHaveCount(0);
      await expect(page.locator("footer")).not.toHaveCount(0);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);

      // The h1 has text a person can read.
      await expect(page.locator("h1")).not.toBeEmpty();

      // CSP violations, hydration errors, failed requests and 4xx/5xx all land here.
      expect(problems()).toEqual([]);
    });
  }

  test("an unknown address returns the 404 page with status 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist/", { waitUntil: "load" });
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("No page at this address");
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
  });

  test("a directory address without the trailing slash ends on the page", async ({ page }) => {
    const response = await page.goto("/privacy", { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/privacy\/$/);
  });
});
