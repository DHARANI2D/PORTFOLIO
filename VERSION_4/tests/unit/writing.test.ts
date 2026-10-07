import { describe, expect, it } from "vitest";
import { extractHeadings, slugify } from "@/components/writing/headings";
import { estimateReadingMinutes, getHeadings, getWritingSlugs } from "@/lib/writing";

describe("getWritingSlugs", () => {
  it("lists the notes in content/writing as sorted, url-safe slugs", async () => {
    const slugs = await getWritingSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toEqual([...slugs].sort());
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });
});

describe("estimateReadingMinutes", () => {
  const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

  it("is at least one minute", () => {
    expect(estimateReadingMinutes("")).toBe(1);
    expect(estimateReadingMinutes("two words")).toBe(1);
  });

  it("counts prose at about 220 words per minute", () => {
    expect(estimateReadingMinutes(words(220))).toBe(1);
    expect(estimateReadingMinutes(words(221))).toBe(2);
    expect(estimateReadingMinutes(words(1100))).toBe(5);
  });

  it("ignores the meta export and skims code and diagrams", () => {
    const meta = `export const meta = {\n  title: "${words(500)}",\n};\n`;
    expect(estimateReadingMinutes(`${meta}\n${words(10)}`)).toBe(1);
    // The two fence lines count as words too: 657 + 2 = 659 words of code, a third of which is 220.
    const code = `\`\`\`ts\n${words(657)}\n\`\`\``;
    expect(estimateReadingMinutes(code)).toBe(1);
    expect(estimateReadingMinutes(`${code}\n${words(220)}`)).toBe(2);
  });
});

describe("headings", () => {
  it("slugify makes url-safe ids", () => {
    expect(slugify("Threat model & trust")).toBe("threat-model-and-trust");
    expect(slugify("  Café — notes  ")).toBe("cafe-notes");
    expect(slugify("!!!")).toBe("");
  });

  it("extractHeadings skips fenced code and duplicate ids", () => {
    const source = ["## One", "text", "```", "## Not a heading", "```", "## Two", "## One"].join(
      "\n",
    );
    expect(extractHeadings(source).map((h) => h.id)).toEqual(["one", "two"]);
  });

  it("getHeadings is empty for an unknown note and populated for a real one", async () => {
    expect(await getHeadings("does-not-exist")).toEqual([]);
    const [first] = await getWritingSlugs();
    expect((await getHeadings(first ?? "")).length).toBeGreaterThan(0);
  });
});
