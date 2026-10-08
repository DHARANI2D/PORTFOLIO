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

  it("has content", () => {
    expect(projects.length).toBeGreaterThan(0);
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

  it("is a card and nothing more: no case-study fields are stored", () => {
    // How the systems work is not published. If a field is added to the schema, this fails.
    for (const project of projects) {
      const keys = Object.keys(project).filter((key) => key !== "status");
      expect(keys.sort(), project.slug).toEqual(
        ["category", "domain", "graphNodes", "name", "slug", "tagline"].sort(),
      );
    }
  });

  it("does not list the research as systems: WITNESS, SecureModelGate and SilentStorm are names only", () => {
    const slugs = projects.map((p) => p.slug);
    for (const research of ["witness", "securemodelgate", "silentstorm"]) {
      expect(slugs).not.toContain(research);
    }
  });

  it("only sets a status the owner has stated", () => {
    // The owner said HELIOS is being built now. No other system has a stated status.
    const stated: Record<string, string> = { helios: "In development" };
    for (const project of projects.filter((p) => p.status)) {
      expect(project.status, project.slug).toBe(stated[project.slug]);
    }
  });

  it("uses only known graph nodes", () => {
    const known = new Set<string>(GraphNodeId.options);
    for (const item of [...projects, ...getResearch()]) {
      for (const node of item.graphNodes)
        expect(known.has(node), `${item.slug}: ${node}`).toBe(true);
    }
  });
});

describe("research", () => {
  const research = getResearch();

  it("has unique slugs", () => {
    const slugs = research.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const item of research) expect(getResearchItem(item.slug)).toBe(item);
  });

  it("is names only: no abstract, notes or tagline are stored", () => {
    // The research is not published in detail. If a field is added to the schema, this fails, so
    // detail cannot reach the site (or its assistant) by accident.
    for (const item of research) {
      expect(Object.keys(item).sort(), item.slug).toEqual(["graphNodes", "kind", "slug", "title"]);
    }
  });

  it("names every paper and direction once, as papers or directions", () => {
    expect(research.filter((r) => r.kind === "paper").map((r) => r.title)).toEqual([
      "WITNESS",
      "SecureModelGate",
      "MAESTRO",
      "MemForensix",
      "SilentStorm",
    ]);
    expect(research.filter((r) => r.kind === "direction").map((r) => r.title)).toEqual([
      "AI DFIR",
      "Agentic Security",
    ]);
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
    // docs/FACTS.md: Facilio is a role, a year and a stack (Redis, Kafka, Apache). What was built
    // there is not stated, so there are no bullets. The summary says what the company does.
    const facilio = experience.find((e) => e.org === "Facilio");
    expect(facilio).toBeDefined();
    expect(facilio?.bullets).toEqual([]);
    expect(facilio?.tags).toEqual(["Redis", "Kafka", "Apache"]);
    expect(facilio?.summary).toMatch(/Redis, Kafka and Apache/);
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
      "Triage daily security alerts in an enterprise SOC.",
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

  it("states no count with a plus sign (such as \"100+\")", () => {
    const counts = allCopy().flatMap((entry) => entry.value.match(/\b\d[\d,]*\+/g) ?? []);
    expect(counts).toEqual([]);
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

  it("links to no system or research page: neither has pages", () => {
    for (const { file, source } of notes) {
      expect(source, file).not.toMatch(/\]\(\/(?:systems|research)\//);
    }
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

  it("the check does notice an unlisted statement", () => {
    expect(absent("probe", ["A sentence that is certainly not in the sheet 7f3a9."])).toHaveLength(
      1,
    );
  });
});
