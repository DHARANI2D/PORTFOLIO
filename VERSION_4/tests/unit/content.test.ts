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

const root = path.join(import.meta.dirname, "../..");
const readFile = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const contentDir = path.join(root, "content/writing");

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

/** Sentence-sized pieces, so one exempt sentence does not exempt a whole note. */
const sentencesOf = ({ path, value }: Entry): Entry[] =>
  value
    .split(/(?<=[.!?”"])\s+|\n+/)
    .filter((sentence) => sentence.trim() !== "")
    .map((sentence) => ({ path, value: sentence.trim() }));

/** The `export const meta = {...}` object of a note, evaluated without compiling the MDX. */
function noteMeta(file: string, source: string): unknown {
  const literal = /^export const meta = (\{[\s\S]*?\n\});?[ \t]*$/m.exec(source)?.[1];
  expect(literal, `${file} must start with "export const meta = {...}"`).toBeDefined();
  return new Function(`return (${literal ?? "null"});`)();
}

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
  it("has at least one note", () => {
    expect(writing.length).toBeGreaterThan(0);
  });

  it("every note has valid metadata, a slug-safe file name and a unique number", () => {
    const numbers = new Set<number>();
    for (const { file, source } of writing) {
      expect(file, file).toMatch(/^[a-z0-9][a-z0-9-]*\.mdx$/);
      const meta = WritingMeta.parse(noteMeta(file, source));
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

/* ---------------------------------------------------------------------------------------------
 * Field notes: dates, titles, summaries, tags, links (docs/FACTS.md section D, rule 4)
 * ------------------------------------------------------------------------------------------- */

describe("field notes", () => {
  const notes = writing.map(({ file, source }) => ({
    file,
    slug: file.replace(/\.mdx$/, ""),
    source,
    meta: WritingMeta.parse(noteMeta(file, source)),
  }));

  it("keeps titles to 60 characters so a search result does not cut them", () => {
    for (const { file, meta } of notes) {
      expect(
        meta.title.length,
        `${file}: "${meta.title}" is ${meta.title.length}`,
      ).toBeLessThanOrEqual(60);
    }
  });

  it("writes each summary as complete sentences of at most 155 characters", () => {
    for (const { file, meta } of notes) {
      expect(meta.summary.length, `${file} summary length`).toBeLessThanOrEqual(155);
      expect(meta.summary, `${file} summary starts like a sentence`).toMatch(/^[A-Z“]/);
      expect(meta.summary, `${file} summary ends like a sentence`).toMatch(/[.”]$/);
      expect(meta.summary, `${file} summary is cut off`).not.toMatch(/…|\.\.\.$/);
      // A colon before the end is usually a headline fragment pretending to be a sentence.
      expect(meta.summary, `${file} summary has a fragment before a colon`).not.toMatch(/^[^.]*:/);
    }
  });

  it("uses real calendar dates", () => {
    for (const { file, meta } of notes) {
      const parsed = new Date(`${meta.date}T00:00:00Z`);
      expect(Number.isNaN(parsed.getTime()), `${file} date`).toBe(false);
      expect(parsed.toISOString().slice(0, 10), `${file} date is not a real day`).toBe(meta.date);
    }
  });

  it("carries the authoring date on every note while FACTS says so, never a staggered cadence", () => {
    // docs/FACTS.md section D, rule 4: the date is the authoring date until the owner publishes.
    // Remove that rule when the owner sets real dates, and this check stops applying.
    const authoring = /authoring date \((\d{4}-\d{2}-\d{2})\)/.exec(readFile("docs/FACTS.md"))?.[1];
    if (authoring === undefined) return;
    for (const { file, meta } of notes) {
      expect(meta.date, `${file} must carry the authoring date from FACTS section D`).toBe(
        authoring,
      );
    }
  });

  it("lists every note, with its date caveat, in the owner review sheet", () => {
    const sheet = readFile("CONTENT_REVIEW.md");
    expect(sheet).toMatch(/^## Field notes$/m);
    for (const { slug, meta } of notes) {
      const label = `note ${String(meta.number).padStart(3, "0")}`;
      expect(sheet, `${slug} is missing from CONTENT_REVIEW.md`).toContain(`${label} (${slug})`);
    }
    expect(sheet).toMatch(/not a verified publication date/);
  });

  it("tags a note with the name of every system it links to, exactly as displayed", () => {
    for (const { file, source, meta } of notes) {
      for (const match of source.matchAll(/\]\(\/systems\/([a-z0-9-]+)\//g)) {
        const project = getProject(match[1] ?? "");
        expect(
          project,
          `${file} links to /systems/${match[1]}/, which does not exist`,
        ).toBeDefined();
        expect(meta.tags, `${file} should be tagged ${project?.name}`).toContain(project?.name);
      }
    }
  });

  it("links only to case-study sections that exist", () => {
    for (const { file, source } of notes) {
      for (const match of source.matchAll(/\]\(\/systems\/([a-z0-9-]+)\/#([a-z0-9-]+)\)/g)) {
        const project = getProject(match[1] ?? "");
        const anchor = match[2];
        const has: Record<string, boolean> = {
          overview: (project?.overview.length ?? 0) > 0,
          architecture: project?.architecture !== undefined,
          "threat-model": project?.threatModel !== undefined,
          decisions: (project?.decisions.length ?? 0) > 0,
          security: (project?.security.length ?? 0) > 0,
        };
        expect(has[anchor ?? ""], `${file} links to #${anchor} on ${match[1]}`).toBe(true);
      }
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * Summaries and meta descriptions
 * ------------------------------------------------------------------------------------------- */

describe("descriptions", () => {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/[.]+$/, "").replace(/\s+/g, " ").trim();

  const described = [
    ...getProjects().map((p) => ({
      id: `system ${p.slug}`,
      text: p.metaDescription,
      tagline: p.tagline,
    })),
    ...getResearch().map((r) => ({
      id: `research ${r.slug}`,
      text: r.metaDescription,
      tagline: r.tagline,
    })),
  ];

  it.each(described)(
    "$id has a complete-sentence meta description of 70 to 155 characters",
    (d) => {
      expect(d.text, `${d.id} needs a metaDescription`).toBeDefined();
      const text = d.text ?? "";
      expect(text.length).toBeGreaterThanOrEqual(70);
      expect(text.length).toBeLessThanOrEqual(155);
      expect(text).toMatch(/^[A-Z0-9]/);
      expect(text).toMatch(/\.$/);
      expect(text, "cut off with an ellipsis").not.toMatch(/…|\.\.\./);
      expect(normalize(text)).not.toBe(normalize(d.tagline));
    },
  );

  it("the check catches a cut-off description", () => {
    const cutOff =
      "A research direction on how to let agents act on security problems without trusting…";
    expect(/…|\.\.\./.test(cutOff)).toBe(true);
    expect(cutOff.length).toBeLessThan(155);
  });

  it("gives every system a 30-second summary that is not its tagline or its meta description", () => {
    for (const project of getProjects()) {
      expect(normalize(project.summary), `${project.slug} summary equals tagline`).not.toBe(
        normalize(project.tagline),
      );
      expect(
        normalize(project.summary),
        `${project.slug} summary equals meta description`,
      ).not.toBe(normalize(project.metaDescription ?? ""));
      expect(project.summary, `${project.slug} summary is not a sentence`).toMatch(/[.]$/);
    }
  });

  it("does not repeat the summary or the tagline inside the overview of a thin page", () => {
    // Thin pages (no architecture) have one overview paragraph that adds something the other layers lack.
    const thin = getProjects().filter((p) => p.architecture === undefined);
    expect(thin.length, "no thin page to check").toBeGreaterThan(0);
    for (const project of thin) {
      expect(project.overview, `${project.slug} overview is one paragraph`).toHaveLength(1);
      const paragraph = normalize(project.overview[0] ?? "");
      expect(paragraph.length, `${project.slug} overview is empty`).toBeGreaterThan(40);
      expect(paragraph, `${project.slug} overview repeats the tagline`).not.toContain(
        normalize(project.tagline),
      );
      expect(paragraph, `${project.slug} overview repeats the summary`).not.toContain(
        normalize(project.summary),
      );
    }
  });

  it("no page apologises for being short", () => {
    const hits = allCopy().filter((entry) =>
      /intentionally short|this page is (?:short|brief|intentionally)|no implementation detail is published/i.test(
        entry.value,
      ),
    );
    expect(hits.map((entry) => entry.path)).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Diagrams: no edge around the human, coherent node text
 * ------------------------------------------------------------------------------------------- */

type Edges = readonly (readonly [string, string])[];

/** Node ids reachable from `from` without passing through `avoid`. */
function reachableAvoiding(edges: Edges, from: string, avoid: string): Set<string> {
  const seen = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const [a, b] of edges) {
      if (a === current && b !== avoid && !seen.has(b)) {
        seen.add(b);
        queue.push(b);
      }
    }
  }
  return seen;
}

describe("SignalFusion Core: human judgment is not bypassed", () => {
  const project = getProject("signalfusion-core");
  const diagram = project?.architecture;

  it("has no route from AI investigation to Response that skips the Analyst", () => {
    expect(diagram).toBeDefined();
    const edges = diagram?.edges ?? [];
    expect(edges).not.toContainEqual(["investigation", "response"]);
    expect(reachableAvoiding(edges, "investigation", "analyst").has("response")).toBe(false);
    // The analyst route itself exists.
    expect(edges).toContainEqual(["investigation", "analyst"]);
    expect(edges).toContainEqual(["analyst", "response"]);
  });

  it("the helper does catch a bypass (a test that can fail)", () => {
    const bypass: Edges = [
      ["investigation", "analyst"],
      ["analyst", "response"],
      ["investigation", "response"],
    ];
    expect(reachableAvoiding(bypass, "investigation", "analyst").has("response")).toBe(true);
    const longer: Edges = [
      ["investigation", "ticket"],
      ["ticket", "response"],
      ["investigation", "analyst"],
      ["analyst", "response"],
    ];
    expect(reachableAvoiding(longer, "investigation", "analyst").has("response")).toBe(true);
  });

  it("makes the node text, boundaries, caption and card flow agree", () => {
    const nodes = new Map((diagram?.nodes ?? []).map((n) => [n.id, n]));
    expect(nodes.get("analyst")?.trustBoundary).toMatch(/human judgment/i);
    const boundaries = new Map((diagram?.boundaries ?? []).map((b) => [b.id, b]));
    expect(boundaries.get("oversight")?.label).toMatch(/human judgment/i);
    expect(boundaries.get("oversight")?.nodeIds).toEqual(["analyst"]);
    expect(boundaries.get("analysis")?.nodeIds).toContain("investigation");
    expect(boundaries.get("analysis")?.nodeIds).not.toContain("response");
    expect(nodes.get("response")?.input).toMatch(/analyst/i);
    expect(nodes.get("investigation")?.output).toMatch(/analyst/i);
    expect(diagram?.caption).toMatch(/analyst/i);
    // The caption must not say a response follows the investigation directly.
    expect(diagram?.caption).not.toMatch(
      /investigat\w+ (?:leads|goes|passes) (?:straight )?to (?:a )?response/i,
    );

    const flow = project?.flow ?? [];
    const at = (label: string) => flow.indexOf(label);
    expect(at("AI investigation")).toBeGreaterThanOrEqual(0);
    expect(at("Analyst review")).toBe(at("AI investigation") + 1);
    expect(at("Response")).toBe(at("Analyst review") + 1);
  });

  it("field note 001 draws the same route", () => {
    const note = writing.find(({ file }) => file.startsWith("siem-alerts"));
    const diagram = /\{`([\s\S]*?)`\}<\/Diagram>/.exec(note?.source ?? "")?.[1] ?? "";
    const order = ["normalize", "resolve", "correlate", "map", "assemble", "analyst", "response"];
    const positions = order.map((word) => diagram.indexOf(word));
    expect(
      positions.every((position) => position >= 0),
      positions.join(","),
    ).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(diagram).not.toMatch(/analyst decides\s*-->/);
  });
});

describe("flagship diagrams: node text is coherent", () => {
  const diagrams = getProjectsByTier(1).flatMap((p) =>
    p.architecture ? [[p.slug, p.architecture] as const] : [],
  );

  it.each(diagrams)(
    "%s: no input without a producer, no output without a consumer",
    (_slug, diagram) => {
      const incoming = new Set(diagram.edges.map(([, to]) => to));
      const outgoing = new Set(diagram.edges.map(([from]) => from));
      for (const node of diagram.nodes) {
        if (node.input && !incoming.has(node.id)) {
          // An entry node's input comes from outside the diagram.
          expect(["source", "actor"], `${node.id} has an input but nothing feeds it`).toContain(
            node.kind,
          );
        }
        if (incoming.has(node.id)) {
          expect(node.input, `${node.id} receives edges but names no input`).toBeTruthy();
        }
        if (outgoing.has(node.id)) {
          expect(node.output, `${node.id} sends edges but names no output`).toBeTruthy();
        }
      }
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * WITNESS: one model on every page
 * ------------------------------------------------------------------------------------------- */

describe("WITNESS is described the same way everywhere", () => {
  const CHECKS = ["Evidence", "Corroboration", "Policy", "Validation"] as const;
  const witness = getProject("witness");
  const diagram = witness?.architecture;
  const node = (id: string) => diagram?.nodes.find((n) => n.id === id);
  const note = (prefix: string) => writing.find(({ file }) => file.startsWith(prefix));

  it("draws the checks in the order Evidence, Corroboration, Policy, Validation, Decision", () => {
    const chain = ["evidence", "corroboration", "policy", "validation", "decision"];
    chain.slice(0, -1).forEach((id, i) => {
      expect(diagram?.edges, `${id} -> ${chain[i + 1]}`).toContainEqual([id, chain[i + 1]]);
    });
    const placed = chain.map((id) => node(id));
    expect(placed.map((n) => n?.label)).toEqual([...CHECKS, "Decision"]);
    const cols = placed.map((n) => n?.col ?? -1);
    expect(cols).toEqual([...cols].sort((a, b) => a - b));
    expect(new Set(cols).size).toBe(cols.length);
    // Nothing skips a check: no edge from before a check to after it, except the environment reads.
    const index = new Map(chain.map((id, i) => [id, i]));
    for (const [from, to] of diagram?.edges ?? []) {
      const a = index.get(from);
      const b = index.get(to);
      if (a !== undefined && b !== undefined) expect(b - a, `${from} -> ${to}`).toBe(1);
    }
  });

  it("gives every check a pass, fail and insufficient result, and explains the decision rule", () => {
    for (const id of ["evidence", "corroboration", "policy", "validation"]) {
      const output = node(id)?.output ?? "";
      for (const result of ["pass", "fail", "insufficient"])
        expect(output.toLowerCase(), `${id} output names ${result}`).toContain(result);
    }
    const decision = node("decision")?.process ?? "";
    expect(decision).toMatch(/any fail gives deny/i);
    expect(decision).toMatch(/all pass gives allow/i);
    expect(decision).toMatch(/insufficient[^.]*escalate/i);
    expect(node("escalated")?.process).toMatch(/person/i);
  });

  it("keeps Evidence and Corroboration distinct", () => {
    const evidence = node("evidence");
    const corroboration = node("corroboration");
    expect(evidence?.process).toMatch(/independently observable evidence/i);
    expect(corroboration?.process).toMatch(/separate sources agree/i);
    expect(evidence?.process).not.toBe(corroboration?.process);
    expect(evidence?.sublabel).not.toBe(corroboration?.sublabel);
  });

  it("states the order the same way wherever three or more checks are listed", () => {
    const hits = allCopy()
      .flatMap(sentencesOf)
      .flatMap((entry) => {
        const found = CHECKS.map((name) => ({
          name,
          at: new RegExp(`\\b${name}\\b`).exec(entry.value)?.index ?? -1,
        })).filter((c) => c.at >= 0);
        if (found.length < 3) return [];
        const ordered = [...found].sort((a, b) => a.at - b.at).map((c) => c.name);
        const canonical = CHECKS.filter((name) => ordered.includes(name));
        return ordered.join() === canonical.join()
          ? []
          : [`${entry.path}: ${entry.value.slice(0, 120)}`];
      });
    expect(hits).toEqual([]);
  });

  it("names the stale-evidence case: a failure mode, a control and a labelled decision", () => {
    const model = witness?.threatModel;
    expect(model?.failureModes.some((m) => /time of check to time of use/i.test(m))).toBe(true);
    expect(model?.failureModes.some((m) => /stale/i.test(m))).toBe(true);
    expect(model?.controls.some((c) => /re-validated/i.test(c))).toBe(true);
    expect(model?.assumptions.some((a) => /read again/i.test(a))).toBe(true);
    const decision = witness?.decisions.find((d) => /re-validate/i.test(d.question));
    expect(decision, "an engineering decision about re-validating at execution time").toBeDefined();
    expect(decision?.answer).toMatch(/^Design reasoning/);
    // Execution reads the environment again, so the diagram has the edge that makes that true.
    expect(diagram?.edges).toContainEqual(["environment", "execution"]);
    expect(node("execution")?.process).toMatch(/re-validates/i);
  });

  it("note 003: the prose list and the decide() pseudocode follow the same order and rule", () => {
    const source = note("deterministic-evidence-gate")?.source ?? "";
    const prose = mdxProse(source);
    const labels = CHECKS.map((name) => prose.indexOf(`**${name}.**`));
    expect(
      labels.every((at) => at >= 0),
      labels.join(","),
    ).toBe(true);
    expect(labels).toEqual([...labels].sort((a, b) => a - b));

    const code = /```python\n([\s\S]*?)```/.exec(source)?.[1] ?? "";
    const calls = ["check_evidence", "check_corroboration", "check_policy", "check_validation"].map(
      (name) => code.indexOf(name),
    );
    expect(
      calls.every((at) => at >= 0),
      calls.join(","),
    ).toBe(true);
    expect(calls).toEqual([...calls].sort((a, b) => a - b));
    const rule = [`"fail" in results`, `"insufficient" in results`].map((s) => code.indexOf(s));
    expect(rule[0]).toBeGreaterThanOrEqual(0);
    expect(rule[1]).toBeGreaterThan(rule[0] ?? 0);
    const returns = ['return "deny"', 'return "escalate"', 'return "allow"'].map((s) =>
      code.indexOf(s),
    );
    expect(returns.every((at) => at >= 0)).toBe(true);
    expect(returns).toEqual([...returns].sort((a, b) => a - b));
    // The old model evaluated Policy first and merged two checks into one call.
    expect(code).not.toMatch(/def corroborate|rule\.permits/);
  });

  it("note 002: the decision table maps fail to deny, insufficient to escalate and all pass to allow", () => {
    const source = note("evidence-boundaries")?.source ?? "";
    const rows = source
      .split("\n")
      .filter((line) => /^\|.*\|\s*(?:deny|escalate[^|]*|allow)\s*\|$/.test(line));
    expect(rows).toHaveLength(3);
    const [deny, escalate, allow] = rows;
    expect(deny).toMatch(/fails/i);
    expect(deny).toMatch(/\|\s*deny\s*\|$/);
    expect(escalate).toMatch(/insufficient/i);
    expect(escalate).toMatch(/\|\s*escalate/);
    expect(allow).toMatch(/every check passes/i);
    expect(allow).toMatch(/\|\s*allow\s*\|$/);
    // Conflicting evidence is a fail, so it must not be listed under escalate.
    expect(escalate).not.toMatch(/conflict/i);
  });

  it("research page and case study agree on the three results and on escalating to a person", () => {
    const research = getResearchItem("witness");
    const text = (research?.notes ?? []).join(" ");
    expect(text).toMatch(/pass, fail or come back insufficient/i);
    expect(text).toMatch(/any fail is a deny/i);
    expect(text).toMatch(/goes to a person/i);
    expect(text).toMatch(/Evidence asks whether/);
    expect(text).toMatch(/Corroboration asks whether separate sources agree/);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Design-intent wording: no absolute claims about prototypes
 * ------------------------------------------------------------------------------------------- */

describe("absolute claims", () => {
  const ABSOLUTE: { name: string; pattern: RegExp }[] = [
    {
      name: "a guarantee",
      // "not a guarantee" is the hedge this rule asks for.
      pattern: /(?<!\b(?:not|no) (?:an? )?)\b(?:guarantees?|guaranteed)\b/i,
    },
    { name: "an elimination", pattern: /\beliminat(?:e|es|ed|ing)\b/i },
    { name: "always", pattern: /\balways\b/i },
    { name: "impossible", pattern: /\bimpossible\b/i },
    {
      name: "cannot be fooled",
      pattern: /\bcannot (?:talk|be (?:bypassed|fooled|forged|tricked|steered|defeated))/i,
    },
    { name: "stops the attacker", pattern: /\b(?:stops|prevents|blocks) (?:the )?attackers?\b/i },
  ];

  it.each(ABSOLUTE)("states no $name about a design", ({ pattern }) => {
    const hits = allCopy()
      .flatMap(sentencesOf)
      .filter((entry) => pattern.test(entry.value))
      .map((entry) => `${entry.path}: ${entry.value.slice(0, 140)}`);
    expect(hits).toEqual([]);
  });

  it("the patterns catch the sentences they exist for", () => {
    for (const bad of [
      "The gate guarantees safe remediation.",
      "This eliminates false positives.",
      "The agent can always be trusted.",
      "An agent cannot talk its way past the gate.",
      "Handling telemetry as data stops the attacker from directing the investigation.",
    ]) {
      expect(
        ABSOLUTE.some(({ pattern }) => pattern.test(bad)),
        bad,
      ).toBe(true);
    }
    for (const fine of [
      "The design is meant to keep the attacker from directing the investigation.",
      "The gate does not rest on what the agent says.",
      "That is an aim, not a guarantee.",
    ]) {
      expect(
        ABSOLUTE.some(({ pattern }) => pattern.test(fine)),
        fine,
      ).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The owner review sheet (docs/FACTS.md section D, rule 3) quotes the copy as it is today
 * ------------------------------------------------------------------------------------------- */

describe("owner review sheet", () => {
  const sheet = readFile("CONTENT_REVIEW.md");
  const absent = (where: string, strings: (string | undefined)[]) =>
    strings
      .filter((text): text is string => typeof text === "string" && text !== "")
      .filter((text) => !sheet.includes(text.replaceAll("|", "\\|")))
      .map((text) => `${where}: ${text.slice(0, 90)}`);

  it("quotes every inferred statement of the flagship case studies", () => {
    const missing = getProjectsByTier(1).flatMap((p) => [
      ...absent(`${p.slug} summary`, [p.summary, p.metaDescription]),
      ...absent(`${p.slug} flow`, [p.flow.join(" > ")]),
      ...absent(
        `${p.slug} node`,
        (p.architecture?.nodes ?? []).flatMap((n) => [
          n.input,
          n.process,
          n.output,
          n.trustBoundary,
        ]),
      ),
      ...absent(`${p.slug} caption`, [p.architecture?.caption]),
      ...absent(
        `${p.slug} threat model`,
        Object.values(p.threatModel ?? {}).flatMap((value) => value as string[]),
      ),
      ...absent(
        `${p.slug} decision`,
        p.decisions.flatMap((d) => [d.question, d.answer]),
      ),
      ...absent(`${p.slug} security`, p.security),
    ]);
    expect(missing).toEqual([]);
  });

  it("quotes the research notes and every meta description", () => {
    const missing = [
      ...getResearch().flatMap((r) => [
        ...absent(`research ${r.slug} notes`, r.notes),
        ...absent(`research ${r.slug} metaDescription`, [r.metaDescription]),
      ]),
      ...getProjects().flatMap((p) => absent(`${p.slug} metaDescription`, [p.metaDescription])),
    ];
    expect(missing).toEqual([]);
  });

  it("quotes the overview of each thin page", () => {
    const missing = getProjects()
      .filter((p) => p.architecture === undefined)
      .flatMap((p) => absent(`${p.slug} overview`, p.overview));
    expect(missing).toEqual([]);
  });

  it("the check does notice an unlisted statement", () => {
    expect(absent("probe", ["A sentence that is certainly not in the sheet 7f3a9."])).toHaveLength(
      1,
    );
  });
});
