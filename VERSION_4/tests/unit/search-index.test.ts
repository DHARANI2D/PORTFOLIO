import { describe, expect, it } from "vitest";
import { buildPaletteResults } from "@/components/command/palette-model";
import { getExperience, getProjects, getResearch, getSkills } from "@/lib/content";
import {
  composeSearchItems,
  findMentions,
  type SearchGroup,
  type SearchItem,
  type SearchSources,
} from "@/lib/search-index";
import { site } from "@/lib/site";

// buildSearchIndex() itself also reads field notes through lib/writing, which imports compiled MDX.
// Vitest does not compile MDX, so the index is built from the pure composeSearchItems() with the
// notes supplied by hand. The wiring in buildSearchIndex() is covered by the e2e palette test.
const notes: SearchSources["posts"] = [
  {
    slug: "evidence-boundaries",
    meta: {
      title: "Why agents need evidence boundaries",
      summary: "A claim is not evidence.",
      tags: ["AI security"],
      number: 2,
    },
    mentions: ["WITNESS"],
  },
  {
    slug: "siem-to-investigations",
    meta: {
      title: "From SIEM alerts to correlated investigations",
      summary: "Correlation.",
      tags: ["Detection"],
      number: 3,
    },
    mentions: ["SignalFusion Core"],
  },
];

const sources: SearchSources = {
  projects: getProjects(),
  research: getResearch(),
  posts: notes,
  skills: getSkills(),
  experience: getExperience(),
};
const items = composeSearchItems(sources);

const GROUPS: readonly SearchGroup[] = [
  "NAVIGATE",
  "SYSTEMS",
  "RESEARCH",
  "WRITING",
  "SKILLS",
  "EXPERIENCE",
  "LINKS",
  "ACTIONS",
];

describe("composeSearchItems", () => {
  it("gives every item a unique id, a title and a known group", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of items) {
      expect(item.title.trim(), item.id).not.toBe("");
      expect(GROUPS, item.id).toContain(item.group);
    }
  });

  it("indexes every system, research item and note under its real route", () => {
    for (const p of getProjects()) {
      expect(items.find((i) => i.id === `system:${p.slug}`)?.href).toBe(`/systems/${p.slug}/`);
    }
    for (const r of getResearch()) {
      expect(items.find((i) => i.id === `research:${r.slug}`)?.href).toBe(`/research/${r.slug}/`);
    }
    for (const note of notes) {
      expect(items.find((i) => i.id === `writing:${note.slug}`)?.href).toBe(
        `/writing/${note.slug}/`,
      );
    }
  });

  it("only links internal paths, https URLs and the owner's mailto", () => {
    for (const item of items) {
      const { href } = item;
      if (href === undefined) continue;
      if (item.external) {
        expect(href, item.id).toMatch(/^https:\/\//);
      } else if (href.startsWith("mailto:")) {
        expect(href, item.id).toBe(`mailto:${site.email}`);
      } else {
        // Internal: rooted, never protocol-relative, trailing slash (optionally followed by a hash).
        expect(href, item.id).toMatch(/^\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/);
      }
    }
  });

  it("marks external links as external and gives actions no href", () => {
    for (const item of items) {
      if (item.action) expect(item.href, item.id).toBeUndefined();
      if (item.href?.startsWith("http")) expect(item.external, item.id).toBe(true);
    }
  });

  it("offers every action the palette can run", () => {
    const actions = items.flatMap((i) => (i.action ? [i.action] : []));
    for (const action of [
      "toggle-theme",
      "view-engineer",
      "view-recruiter",
      "open-terminal",
      "system-overview",
    ]) {
      expect(actions, action).toContain(action);
    }
  });

  it("indexes only pages that exist", () => {
    const pages = items.filter((i) => i.group === "NAVIGATE").map((i) => i.href);
    for (const page of [
      "/",
      "/about/",
      "/experience/",
      "/systems/",
      "/research/",
      "/writing/",
      "/resume/",
      "/contact/",
      "/privacy/",
      "/certifications/",
    ]) {
      expect(pages, page).toContain(page);
    }
  });
});

describe("findMentions", () => {
  const names = ["WITNESS", "AEGIS", "AI DFIR", "C++ (core)"];

  it("finds whole words, ignoring case", () => {
    expect(findMentions("The witness gate and Aegis.", names)).toEqual(["WITNESS", "AEGIS"]);
  });

  it("does not match inside a longer word", () => {
    expect(findMentions("witnesses and aegises", names)).toEqual([]);
    expect(findMentions("wwitness", names)).toEqual([]);
  });

  it("treats regex metacharacters in a name literally", () => {
    expect(findMentions("written in C++ (core) mostly", names)).toEqual(["C++ (core)"]);
    expect(findMentions("written in cpp core", names)).toEqual([]);
    expect(() => findMentions("x", ["(", "[", "\\", "a|b", "*"])).not.toThrow();
  });

  it("skips blank names and counts a duplicate once", () => {
    expect(findMentions("anything", ["", "   "])).toEqual([]);
    expect(findMentions("witness witness", ["WITNESS", "WITNESS"])).toEqual(["WITNESS"]);
  });
});

describe("palette results over the real index", () => {
  const groupsOf = (query: string, view: "engineer" | "recruiter" = "engineer") =>
    buildPaletteResults(items, query, view).groups.map((g) => g.group);

  it("'witness' reaches systems, research and writing", () => {
    const groups = groupsOf("witness");
    expect(groups).toContain("SYSTEMS");
    expect(groups).toContain("RESEARCH");
    expect(groups).toContain("WRITING");
  });

  it("puts the exact system match first", () => {
    const first = buildPaletteResults(items, "witness", "engineer").flat[0];
    expect(first?.title).toBe("WITNESS");
  });

  it("shows only curated items for an empty query", () => {
    const { flat } = buildPaletteResults(items, "", "engineer");
    expect(flat.length).toBeGreaterThan(0);
    expect(flat.every((i: SearchItem) => i.featured)).toBe(true);
  });

  it("hides the 'view as' action for the view that is already active", () => {
    const actions = (view: "engineer" | "recruiter") =>
      buildPaletteResults(items, "", view).flat.flatMap((i) => (i.action ? [i.action] : []));
    expect(actions("engineer")).not.toContain("view-engineer");
    expect(actions("engineer")).toContain("view-recruiter");
    expect(actions("recruiter")).not.toContain("view-recruiter");
    expect(actions("recruiter")).toContain("view-engineer");
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(buildPaletteResults(items, "qqqqzzzz", "engineer").flat).toEqual([]);
  });
});
