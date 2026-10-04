import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GraphNodeId, WritingMeta } from "@/content/schema";
import {
  getCertifications,
  getEarlierWork,
  getExperience,
  getMetrics,
  getProject,
  getProjects,
  getProjectsByTier,
  getResearch,
  getResearchItem,
  getSkills,
} from "@/lib/content";

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

type Entry = { path: string; value: string };

/** Every string in a parsed value, with the path it was found at (for readable failures). */
function collectStrings(value: unknown, at = "$"): Entry[] {
  if (typeof value === "string") return [{ path: at, value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => collectStrings(item, `${at}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => collectStrings(item, `${at}.${key}`));
  }
  return [];
}

/** Prose only: URLs and identifiers are not copy. */
const isProse = ({ value }: Entry) => !/^https?:\/\//.test(value) && /\s/.test(value);

const contentDir = path.join(import.meta.dirname, "../../content/writing");

/** MDX with fenced code, inline code and diagram templates removed: what a reader reads as prose. */
function mdxProse(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{`[\s\S]*?`\}/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

const writing = fs
  .readdirSync(contentDir)
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => ({ file, source: fs.readFileSync(path.join(contentDir, file), "utf8") }));

/** Everything a visitor can read, as prose entries. */
function allCopy(): Entry[] {
  return [
    ...collectStrings({
      projects: getProjects(),
      research: getResearch(),
      experience: getExperience(),
      skills: getSkills(),
      certifications: getCertifications(),
      earlier: getEarlierWork(),
    }).filter(isProse),
    ...writing.map(({ file, source }) => ({ path: `writing/${file}`, value: mdxProse(source) })),
  ];
}

/* ---------------------------------------------------------------------------------------------
 * Structure
 * ------------------------------------------------------------------------------------------- */

describe("projects", () => {
  const projects = getProjects();

  it("has content, ordered flagship first", () => {
    expect(projects.length).toBeGreaterThan(0);
    const tiers = projects.map((p) => p.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(getProjectsByTier(1).length).toBeGreaterThanOrEqual(1);
  });

  it("has unique slugs and names", () => {
    const slugs = projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const names = projects.map((p) => p.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("looks projects up by slug", () => {
    for (const project of projects) expect(getProject(project.slug)).toBe(project);
    expect(getProject("does-not-exist")).toBeUndefined();
  });

  it.each(projects.map((p) => [p.slug, p] as const))(
    "%s has a flow of at least two steps",
    (_slug, p) => {
      expect(p.flow.length).toBeGreaterThanOrEqual(2);
      for (const step of p.flow) expect(step.trim()).not.toBe("");
    },
  );

  it("gives every flagship project an architecture and a threat model", () => {
    for (const project of getProjectsByTier(1)) {
      expect(project.architecture, `${project.slug} architecture`).toBeDefined();
      expect(project.threatModel, `${project.slug} threatModel`).toBeDefined();
      expect(project.threatModel?.assets.length, `${project.slug} assets`).toBeGreaterThan(0);
      expect(project.threatModel?.controls.length, `${project.slug} controls`).toBeGreaterThan(0);
    }
  });

  it("only sets a status the owner has stated", () => {
    // docs/FACTS.md: only WITNESS has a stated status.
    const statuses = projects.flatMap((p) => (p.status ? [p.status] : []));
    for (const status of statuses) expect(status).toBe("Research / Prototype");
  });

  it("uses only known graph nodes", () => {
    const known = new Set<string>(GraphNodeId.options);
    for (const item of [...projects, ...getResearch()]) {
      for (const node of item.graphNodes)
        expect(known.has(node), `${item.slug}: ${node}`).toBe(true);
    }
  });
});

describe("architecture diagrams", () => {
  const diagrams = getProjects().flatMap((p) =>
    p.architecture ? [[p.slug, p.architecture] as const] : [],
  );

  it("exist for at least one project", () => {
    expect(diagrams.length).toBeGreaterThan(0);
  });

  it.each(diagrams)(
    "%s: node ids are unique and edges point at existing nodes",
    (_slug, diagram) => {
      const ids = diagram.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      const known = new Set(ids);
      for (const [from, to] of diagram.edges) {
        expect(known.has(from), `edge source ${from}`).toBe(true);
        expect(known.has(to), `edge target ${to}`).toBe(true);
        expect(from).not.toBe(to);
      }
    },
  );

  it.each(diagrams)("%s: boundaries only wrap existing nodes", (_slug, diagram) => {
    const known = new Set(diagram.nodes.map((n) => n.id));
    const boundaryIds = diagram.boundaries.map((b) => b.id);
    expect(new Set(boundaryIds).size).toBe(boundaryIds.length);
    for (const boundary of diagram.boundaries) {
      for (const id of boundary.nodeIds)
        expect(known.has(id), `${boundary.id} -> ${id}`).toBe(true);
    }
  });

  it.each(diagrams)(
    "%s: every node is connected and no two share a grid cell",
    (_slug, diagram) => {
      const connected = new Set(diagram.edges.flat());
      for (const node of diagram.nodes)
        expect(connected.has(node.id), `${node.id} is isolated`).toBe(true);
      const cells = diagram.nodes.map((n) => `${n.col},${n.row}`);
      expect(new Set(cells).size).toBe(cells.length);
    },
  );
});

describe("research", () => {
  const research = getResearch();

  it("has unique slugs", () => {
    const slugs = research.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of research) expect(getResearchItem(item.slug)).toBe(item);
  });

  it("only relates to systems that exist", () => {
    const slugs = new Set(getProjects().map((p) => p.slug));
    for (const item of research) {
      for (const related of item.relatedProjects)
        expect(slugs.has(related), `${item.slug} -> ${related}`).toBe(true);
    }
  });
});

describe("experience", () => {
  const experience = getExperience();

  it("has unique ids and exactly one current role", () => {
    const ids = experience.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(experience.filter((e) => e.current)).toHaveLength(1);
  });

  it("does not describe work the owner has not described", () => {
    // docs/FACTS.md: Facilio is a role and a year. "No other details are known."
    const facilio = experience.find((e) => e.org === "Facilio");
    expect(facilio).toBeDefined();
    expect(facilio?.bullets).toEqual([]);
    expect(facilio?.summary).toBeUndefined();
    expect(facilio?.end).toBeUndefined();
  });

  it("keeps education under the id the pages look for", () => {
    expect(experience.some((e) => e.id === "education")).toBe(true);
  });
});

describe("certifications", () => {
  const certifications = getCertifications();
  const verified = certifications.filter((c) => c.status === "verified");
  const planned = certifications.filter((c) => c.status === "planned");

  it("keeps earned and planned separate", () => {
    expect(verified.length).toBeGreaterThan(0);
    for (const cert of verified) {
      expect(cert.name, cert.name).not.toMatch(
        /\b(?:planned|planning|in progress|upcoming|next)\b/i,
      );
    }
    for (const cert of planned) {
      // A planned item has not been earned: no year, no credential link.
      expect(cert.year, `${cert.name} year`).toBeUndefined();
      expect(cert.url, `${cert.name} url`).toBeUndefined();
    }
  });

  it("states a year only where the owner has", () => {
    // docs/FACTS.md: years are known for the two Proofpoint certifications only.
    for (const cert of certifications) {
      if (cert.year !== undefined) {
        expect(cert.issuer).toBe("Proofpoint");
        expect(cert.year).toBe("2025");
      }
    }
  });

  it("has unique names", () => {
    const names = certifications.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("skills", () => {
  it("has groups with items and no ratings", () => {
    const groups = getSkills();
    expect(groups.length).toBeGreaterThan(0);
    const ids = groups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of groups) {
      expect(group.items.length, group.id).toBeGreaterThan(0);
      // No skill levels or percentages anywhere in a skill name.
      for (const item of [...group.items, ...group.depth])
        expect(item).not.toMatch(/\d\s*%|\/\s*10\b|\bexpert\b|\bbeginner\b/i);
    }
  });
});

describe("metrics", () => {
  it("are derived from content, never typed in", () => {
    const projects = getProjects();
    expect(getMetrics()).toEqual({
      systems: projects.length,
      flagship: projects.filter((p) => p.tier === 1).length,
      research: getResearch().length,
      certificationsVerified: getCertifications().filter((c) => c.status === "verified").length,
      earlierProjects: getEarlierWork().length,
    });
  });
});

/* ---------------------------------------------------------------------------------------------
 * Links: only places the owner has published
 * ------------------------------------------------------------------------------------------- */

describe("links", () => {
  const GITHUB_OWNER = "/DHARANI2D/";
  /** Hosts the owner's own materials live on (docs/FACTS.md section A). */
  const CERT_HOSTS = new Set(["www.credly.com", "learn.microsoft.com", "drive.google.com"]);

  const hostOf = (url: string) => new URL(url).hostname;

  it("never links a system or research item to a repository (none are public)", () => {
    // docs/FACTS.md section C: no repo URLs for WITNESS, SignalFusion, AEGIS, ARGUS, Voltrix,
    // DESAS or SecureModelGate. A link is added only when the owner supplies one.
    for (const project of getProjects()) {
      expect(project.links, project.slug).toEqual({});
    }
    for (const item of getResearch()) expect(item.links, item.slug).toEqual({});
  });

  it("limits earlier-work links to the owner's GitHub", () => {
    for (const entry of getEarlierWork()) {
      if (!entry.url) continue;
      const url = new URL(entry.url);
      expect(url.protocol).toBe("https:");
      expect(url.hostname, entry.name).toBe("github.com");
      expect(url.pathname.startsWith(GITHUB_OWNER), entry.name).toBe(true);
    }
  });

  it("limits credential links to the issuers' own hosts", () => {
    for (const cert of getCertifications()) {
      if (!cert.url) continue;
      expect(new URL(cert.url).protocol).toBe("https:");
      expect(CERT_HOSTS.has(hostOf(cert.url)), `${cert.name}: ${hostOf(cert.url)}`).toBe(true);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * Claims the owner has not made (docs/FACTS.md section C) and the copy voice
 * ------------------------------------------------------------------------------------------- */

describe("copy rules", () => {
  /** Shapes of claim that need data the owner has not supplied. Each has a reason for the failure message. */
  const UNSUPPORTED_CLAIMS: { name: string; pattern: RegExp }[] = [
    { name: "a percentage", pattern: /\d(?:\.\d+)?\s*%/ },
    {
      name: "a measured quantity",
      pattern:
        /\b\d[\d,.]*\s*(?:ms|msec|milliseconds?|seconds?|minutes?|hours?|x|×|gb|mb|tb|rps|qps|eps)\b/i,
    },
    {
      name: "a count of people or events",
      pattern:
        /\b(?:\d[\d,.]*\+?|thousands of|millions of|hundreds of)\s+(?:active\s+)?(?:users|customers|clients|downloads|installs|stars|commits|contributors|deployments)\b/i,
    },
    {
      name: "an operational metric",
      pattern: /\b(?:uptime|throughput|benchmarks?|latency|latencies|SLA)\b/i,
    },
    {
      name: "a production claim",
      pattern:
        /\b(?:in|into|to)\s+production\b|\bproduction[- ](?:ready|grade|deployed|deployment|use|scale)\b/i,
    },
    {
      name: "a publication or award",
      pattern:
        /\b(?:peer[- ]reviewed|award(?:s|ed|-winning)?|keynote|published (?:a |in |at )?(?:paper|journal|conference))\b/i,
    },
  ];

  /**
   * Sentences that trip a pattern on purpose, each with the reason. A sentence is exempt only if one
   * of these matches it. Add to this list only with a reason that holds against docs/FACTS.md.
   */
  const ALLOWED: { sentence: RegExp; why: string }[] = [
    {
      sentence: /not claiming results or production use/i,
      why: "a disclaimer: the note says it makes no production claim",
    },
    {
      sentence: /in the last 15 minutes/i,
      why: "a made-up example of a checkable claim in a design note, not a measurement",
    },
  ];

  /** Sentence-sized pieces, so one exempt sentence does not exempt a whole note. */
  const sentencesOf = ({ path, value }: Entry): Entry[] =>
    value
      .split(/(?<=[.!?”"])\s+|\n+/)
      .filter((sentence) => sentence.trim() !== "")
      .map((sentence) => ({ path, value: sentence.trim() }));

  it.each(UNSUPPORTED_CLAIMS)("states no $name", ({ pattern }) => {
    const hits = allCopy()
      .flatMap(sentencesOf)
      .filter(
        (entry) =>
          pattern.test(entry.value) && !ALLOWED.some((ok) => ok.sentence.test(entry.value)),
      )
      .map((entry) => `${entry.path}: ${entry.value.slice(0, 160)}`);
    expect(hits).toEqual([]);
  });

  it("the patterns do catch the claims they exist for", () => {
    const samples: Record<string, string> = {
      "a percentage": "Cuts false positives by 40%.",
      "a measured quantity": "Responds in 200 ms.",
      "a count of people or events": "Used by 2,000 users.",
      "an operational metric": "Ships with 99.9 uptime.",
      "a production claim": "Running in production today.",
      "a publication or award": "Winner of an award.",
    };
    for (const { name, pattern } of UNSUPPORTED_CLAIMS) {
      expect(pattern.test(samples[name] ?? ""), name).toBe(true);
    }
    // The owner's own sentences, from docs/FACTS.md, must not trip anything.
    for (const fine of [
      "Triage 100+ daily security alerts in an enterprise SOC.",
      "SOCs see thousands of independent signals.",
      "Improve detection accuracy and reduce false positives.",
      "It is a direction, not a published result.",
    ]) {
      for (const { name, pattern } of UNSUPPORTED_CLAIMS)
        expect(pattern.test(fine), `${name}: ${fine}`).toBe(false);
    }
  });

  it("scans real copy from every source", () => {
    const paths = allCopy().map((entry) => entry.path);
    for (const source of [
      "projects",
      "research",
      "experience",
      "skills",
      "certifications",
      "writing/",
    ]) {
      expect(
        paths.some((p) => p.includes(source)),
        source,
      ).toBe(true);
    }
  });

  it("allows only the one count the owner gave (100+ daily alerts)", () => {
    const counts = allCopy().flatMap((entry) => entry.value.match(/\b\d[\d,]*\+/g) ?? []);
    expect(counts.every((count) => count === "100+")).toBe(true);
  });

  const HYPE =
    /\b(?:cutting[- ]edge|revolutionary|passionate|passion for|leverag(?:e|es|ed|ing)|seamless(?:ly)?|synergy|world[- ]class|next[- ]gen(?:eration)?|excited|game[- ]chang(?:er|ing))\b/i;
  // The variation selector is built from its code point so the file holds no invisible characters.
  const EMOJI = new RegExp(`\\p{Emoji_Presentation}|${String.fromCodePoint(0xfe0f)}`, "u");

  it("the voice checks do catch what they exist for", () => {
    for (const hype of [
      "cutting-edge",
      "Revolutionary",
      "I am passionate",
      "leverage it",
      "seamlessly",
      "world class",
      "next-gen",
    ]) {
      expect(HYPE.test(hype), hype).toBe(true);
    }
    expect(EMOJI.test(`smile ${String.fromCodePoint(0x1f600)}`)).toBe(true);
    expect(EMOJI.test(`ok${String.fromCodePoint(0x2705)}`)).toBe(true);
    // Ordinary typography is fine.
    for (const fine of ["Detection · Cloud", "SIGNAL → CONTEXT", "© 2026", "Café"]) {
      expect(EMOJI.test(fine), fine).toBe(false);
    }
    expect(HYPE.test("leveraged finance"), "word boundary").toBe(true);
    expect(HYPE.test("Elevated privileges"), "inside a longer word").toBe(false);
  });

  it("uses none of the banned hype words, exclamation marks or emoji", () => {
    const hits = allCopy().flatMap((entry) => {
      const found: string[] = [];
      if (HYPE.test(entry.value)) found.push("hype word");
      if (entry.value.includes("!")) found.push("exclamation mark");
      if (EMOJI.test(entry.value)) found.push("emoji");
      return found.map((what) => `${entry.path}: ${what}`);
    });
    expect(hits).toEqual([]);
  });
});

describe("writing", () => {
  /** The `export const meta = {...}` object of a note, evaluated without compiling the MDX. */
  function metaOf(file: string, source: string): unknown {
    const literal = /^export const meta = (\{[\s\S]*?\n\});?[ \t]*$/m.exec(source)?.[1];
    expect(literal, `${file} must start with "export const meta = {...}"`).toBeDefined();
    return new Function(`return (${literal ?? "null"});`)();
  }

  it("has at least one note", () => {
    expect(writing.length).toBeGreaterThan(0);
  });

  it("every note has valid metadata, a slug-safe file name and a unique number", () => {
    const numbers = new Set<number>();
    for (const { file, source } of writing) {
      expect(file, file).toMatch(/^[a-z0-9][a-z0-9-]*\.mdx$/);
      const meta = WritingMeta.parse(metaOf(file, source));
      expect(numbers.has(meta.number), `${file} reuses note number ${meta.number}`).toBe(false);
      numbers.add(meta.number);
      expect(Number.isNaN(Date.parse(meta.date)), `${file} date`).toBe(false);
    }
  });

  it("notes do not use a top-level heading (the page title is the h1)", () => {
    for (const { file, source } of writing) {
      const withoutCode = source.replace(/```[\s\S]*?```/g, "");
      expect(/^# /m.test(withoutCode), `${file} has a "# " heading`).toBe(false);
    }
  });
});
