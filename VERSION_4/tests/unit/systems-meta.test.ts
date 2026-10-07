import { describe, expect, it } from "vitest";
import {
  briefCopy,
  categoryRepeatsDomain,
  describeProject,
  isBrief,
  pageKind,
  relatedFor,
  truncateAtSentence,
} from "@/components/systems/project-meta";
import { getProject, getProjects, getResearch } from "@/lib/content";

describe("pageKind and isBrief", () => {
  it("calls a page a case study only when the system has an architecture diagram", () => {
    for (const project of getProjects()) {
      expect(pageKind(project), project.slug).toBe(
        project.architecture ? "case study" : "overview",
      );
    }
    expect(getProjects().some((p) => pageKind(p) === "case study")).toBe(true);
    expect(getProjects().some((p) => pageKind(p) === "overview")).toBe(true);
  });

  it("treats a system with no architecture, threat model, decisions or security notes as brief", () => {
    const brief = getProjects()
      .filter(isBrief)
      .map((p) => p.slug);
    expect(brief).toEqual(expect.arrayContaining(["argus", "voltrix", "desas"]));
    for (const slug of ["witness", "signalfusion-core", "aegis"]) {
      expect(brief).not.toContain(slug);
    }
  });
});

describe("truncateAtSentence", () => {
  it("returns text that already fits, unchanged", () => {
    expect(truncateAtSentence("One sentence.", 155)).toBe("One sentence.");
  });

  it("cuts at the last whole sentence that fits, never mid-clause, never with an ellipsis", () => {
    const text =
      "First sentence is short. Second sentence is also short, and it has a comma. Third one runs on and on and on and on and on.";
    const out = truncateAtSentence(text, 80);
    expect(out).toBe("First sentence is short. Second sentence is also short, and it has a comma.");
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out).not.toMatch(/…|\.\.\./);
  });

  it("falls back to a clause boundary and ends with a full stop when no sentence fits", () => {
    const text =
      "A single very long sentence that keeps going, with a clause, and then another clause that overruns the limit by a good margin";
    const out = truncateAtSentence(text, 60);
    expect(out.length).toBeLessThanOrEqual(61);
    expect(out.endsWith(".")).toBe(true);
    expect(out).not.toMatch(/…|\.\.\./);
  });
});

describe("describeProject", () => {
  it("uses metaDescription when the content has one", () => {
    expect(
      describeProject({ metaDescription: "Written for search.", summary: "Long summary." }),
    ).toBe("Written for search.");
  });

  it("otherwise cuts the summary at a sentence boundary within 155 characters", () => {
    const summary = `${"Word ".repeat(20).trim()}. ${"Another ".repeat(20).trim()}.`;
    const out = describeProject({ summary });
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith(".")).toBe(true);
  });

  it("gives every real system a description of at most 155 characters ending in a full stop", () => {
    for (const project of getProjects()) {
      const out = describeProject(project);
      expect(out.length, project.slug).toBeLessThanOrEqual(155);
      expect(out, project.slug).toMatch(/[.!?]$/);
    }
  });
});

describe("briefCopy", () => {
  const base = { tagline: "Tagline here.", summary: "Summary here.", overview: [], problem: [] };

  it("leads with the summary and keeps distinct overview paragraphs", () => {
    expect(briefCopy({ ...base, overview: ["One.", "Two."] })).toEqual({
      lead: "Summary here.",
      problem: [],
      paragraphs: ["One.", "Two."],
    });
  });

  it("drops a summary that only repeats the tagline, ignoring case and punctuation", () => {
    expect(briefCopy({ ...base, summary: "tagline here" }).lead).toBeUndefined();
  });

  it("drops overview lines that repeat the tagline or the summary, so a fact is said once", () => {
    const out = briefCopy({
      ...base,
      overview: ["TAGLINE HERE!", "Summary here", "Something new."],
    });
    expect(out.paragraphs).toEqual(["Something new."]);
  });

  it("never repeats a line across the real thin pages", () => {
    for (const slug of ["argus", "voltrix", "desas"]) {
      const project = getProject(slug)!;
      const { lead, problem, paragraphs } = briefCopy(project);
      const lines = [project.tagline, lead, ...problem, ...paragraphs].filter(Boolean) as string[];
      const keys = lines.map((l) =>
        l
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim(),
      );
      expect(new Set(keys).size, slug).toBe(keys.length);
    }
  });
});

describe("categoryRepeatsDomain", () => {
  it("is true when every part of the category is already a domain tag", () => {
    expect(
      categoryRepeatsDomain({ category: "DFIR & Malware", domain: ["DFIR", "Malware", "AI"] }),
    ).toBe(true);
    expect(
      categoryRepeatsDomain({
        category: "DFIR & Automation",
        domain: ["DFIR", "Agents", "Automation"],
      }),
    ).toBe(true);
  });

  it("is false when the category adds a word the domain does not have", () => {
    expect(
      categoryRepeatsDomain({
        category: "Email Security",
        domain: ["Email", "Sandbox", "Analysis"],
      }),
    ).toBe(false);
    expect(categoryRepeatsDomain({ category: "AI Security", domain: ["Detection"] })).toBe(false);
  });
});

describe("relatedFor", () => {
  const research = [
    { slug: "a", title: "A", tagline: "ta", relatedProjects: ["x"] },
    { slug: "x", title: "X", tagline: "tx", relatedProjects: ["x", "y"] },
    { slug: "b", title: "B", tagline: "tb", relatedProjects: ["y"] },
  ];
  const posts = [
    { slug: "n3", meta: { title: "Three", number: 3, tags: ["Foo", "X Sys"] } },
    { slug: "n1", meta: { title: "One", number: 1, tags: ["x sys"] } },
    { slug: "n2", meta: { title: "Two", number: 2, tags: ["Other"] } },
  ];

  it("lists research that names the system, the page about the system first", () => {
    const out = relatedFor({ slug: "x", name: "X Sys" }, research, posts);
    expect(out.research.map((r) => r.slug)).toEqual(["x", "a"]);
  });

  it("lists notes tagged with the display name, lowest number first", () => {
    const out = relatedFor({ slug: "x", name: "X Sys" }, research, posts);
    expect(out.notes.map((n) => n.slug)).toEqual(["n1", "n3"]);
  });

  it("is empty when nothing points at the system", () => {
    expect(relatedFor({ slug: "z", name: "Z" }, research, posts)).toEqual({
      research: [],
      notes: [],
    });
  });

  it("finds the real onward links of each system", () => {
    const posts2 = [
      {
        slug: "siem-alerts-to-correlated-investigations",
        meta: { title: "t1", number: 1, tags: ["SignalFusion Core"] },
      },
      {
        slug: "evidence-boundaries-for-autonomous-security",
        meta: { title: "t2", number: 2, tags: ["WITNESS", "AEGIS"] },
      },
      {
        slug: "deterministic-evidence-gate-for-remediation",
        meta: { title: "t3", number: 3, tags: ["WITNESS"] },
      },
    ];
    const rel = (slug: string) => relatedFor(getProject(slug)!, getResearch(), posts2);
    expect(rel("witness").research[0]?.slug).toBe("witness");
    expect(rel("witness").notes.map((n) => n.number)).toEqual([2, 3]);
    expect(rel("signalfusion-core").notes.map((n) => n.number)).toEqual([1]);
    expect(rel("aegis").research.map((r) => r.slug)).toContain("securemodelgate");
    expect(rel("argus").research.map((r) => r.slug)).toEqual(["ai-dfir"]);
    expect(rel("voltrix").research.map((r) => r.slug)).toEqual(["ai-dfir"]);
  });
});
