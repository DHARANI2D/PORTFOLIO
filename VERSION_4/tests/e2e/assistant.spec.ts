import { expect, test } from "./fixtures";
import { readOut } from "./built-site";
import { waitForHydration, watchProblems } from "./helpers";

/**
 * The terminal sits inline in the hero and doubles as the site's assistant: a command runs, any
 * other input is a question answered from the site's own content (/knowledge.json). There is no
 * command palette and no Cmd/Ctrl+K button any more.
 */

const hero = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Terminal and assistant" });

test.describe("the hero terminal", () => {
  test("is in the hero, with a prompt and suggested questions", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    await expect(terminal).toBeVisible();
    await expect(terminal.getByRole("log")).toContainText("Ask me about the systems");
    await expect(terminal.getByRole("textbox", { name: "Ask a question or type a command" })).toBeVisible();
    for (const question of [
      "What do you work on?",
      "Tell me about HELIOS",
      "Which certifications do you have?",
      "How can I contact you?",
    ]) {
      await expect(terminal.getByRole("button", { name: question, exact: true })).toBeVisible();
    }
  });

  test("a suggested question is answered from the site's content", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    await terminal.getByRole("button", { name: "Tell me about HELIOS", exact: true }).click();
    const log = terminal.getByRole("log");
    await expect(log).toContainText("SYSTEM / HELIOS");
    await expect(log).toContainText("Autonomous Security Investigation Platform");
    await expect(log).toContainText('Type "open helios"');
  });

  test("a typed question finds a fact in the content", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    const input = terminal.getByRole("textbox", { name: "Ask a question or type a command" });
    await input.fill("did you work with kafka?");
    await input.press("Enter");
    await expect(terminal.getByRole("log")).toContainText("EXPERIENCE / Facilio");
    await expect(terminal.getByRole("log")).toContainText("Redis, Kafka and Apache");
  });

  test("an off-topic question says what it can answer instead of guessing", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    const input = terminal.getByRole("textbox", { name: "Ask a question or type a command" });
    await input.fill("what is the weather in Paris");
    await input.press("Enter");
    await expect(terminal.getByRole("log")).toContainText(
      "I can only answer from what is on this site",
    );
  });

  test("commands still run, and a command that navigates moves the page", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    const input = terminal.getByRole("textbox", { name: "Ask a question or type a command" });
    await input.fill("projects");
    await input.press("Enter");
    await expect(terminal.getByRole("log")).toContainText("helios");
    await input.fill("open helios");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/systems\/helios\/$/);
  });

  test("asking questions is allowed by the Content-Security-Policy and stays on this origin", async ({
    page,
    cspViolations,
  }) => {
    const problems = watchProblems(page);
    const foreign: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname !== "127.0.0.1") foreign.push(request.url());
    });
    await page.goto("/");
    await waitForHydration(page);
    const terminal = hero(page);
    await terminal.getByRole("button", { name: "How can I contact you?", exact: true }).click();
    await expect(terminal.getByRole("log")).toContainText("CONTACT / Contact");
    expect(cspViolations).toEqual([]);
    expect(foreign).toEqual([]);
    expect(problems()).toEqual([]);
  });
});

test.describe("no command palette", () => {
  test("the header has no Cmd/Ctrl+K button and the shortcut opens nothing", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    await expect(page.getByRole("button", { name: /command palette/i })).toHaveCount(0);
    await expect(page.locator("header").getByText(/⌘K|CTRL K/)).toHaveCount(0);
    if (!isMobile) {
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(300);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await expect(page.locator("footer").getByText(/SEARCH/)).toHaveCount(0);
  });
});

test.describe("/knowledge.json", () => {
  test("is built from the content: it knows HELIOS and certifications, and never ARGUS", () => {
    const docs = JSON.parse(readOut("knowledge.json")) as { id: string; title: string; text: string }[];
    expect(docs.length).toBeGreaterThan(20);
    const everything = JSON.stringify(docs);
    expect(everything).toContain("HELIOS");
    expect(everything).toContain("ISC2 Certified in Cybersecurity");
    expect(everything).not.toMatch(/ARGUS/);
    expect(everything).not.toMatch(/100\+/);
    for (const doc of docs) {
      expect(typeof doc.id).toBe("string");
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.text.length).toBeGreaterThan(0);
    }
  });
});
