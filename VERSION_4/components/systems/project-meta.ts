import type { Project, ResearchItem } from "@/content/schema";

/*
 * Pure helpers for the /systems pages. No React, no I/O, so they are unit-tested directly
 * (tests/unit/systems-meta.test.ts).
 */

/** What to call the page behind a card or a link: only a system with a diagram has a case study. */
export function pageKind(project: Pick<Project, "architecture">): "case study" | "overview" {
  return project.architecture ? "case study" : "overview";
}

/**
 * A "brief" page has nothing beyond an overview and the flow: no architecture, no threat model, no
 * decisions, no security notes. It gets a compact layout instead of the case-study skeleton.
 */
export function isBrief(
  project: Pick<Project, "architecture" | "threatModel" | "decisions" | "security">,
): boolean {
  const threats = project.threatModel ? Object.values(project.threatModel) : [];
  return (
    !project.architecture &&
    threats.every((entries) => entries.length === 0) &&
    project.decisions.length === 0 &&
    project.security.length === 0
  );
}

/**
 * The longest run of whole sentences that fits in `max` characters. Never cuts mid-sentence and
 * never adds an ellipsis. When even the first sentence is too long, it ends at the last comma,
 * semicolon or colon that fits (replaced by a full stop), and failing that at the last space.
 */
export function truncateAtSentence(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [clean];
  let out = "";
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence.trim()}` : sentence.trim();
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;

  const head = clean.slice(0, max);
  const clause = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf(":"));
  if (clause > max / 2) return `${head.slice(0, clause)}.`;
  const space = head.lastIndexOf(" ");
  return `${head.slice(0, space > 0 ? space : max).replace(/[,;:\s]+$/, "")}.`;
}

/**
 * Meta description for a system page: the owner-written `metaDescription` when there is one, else
 * the summary cut at a sentence boundary.
 */
export function describeProject(project: Pick<Project, "metaDescription" | "summary">): string {
  return project.metaDescription ?? truncateAtSentence(project.summary, 155);
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Copy for a brief page: the summary as the lead and the overview paragraphs after it, with any
 * line that only repeats the tagline (or another line) left out, so one fact is said once.
 */
export function briefCopy(project: Pick<Project, "tagline" | "summary" | "overview" | "problem">): {
  lead: string | undefined;
  problem: string[];
  paragraphs: string[];
} {
  const seen = new Set<string>([normalise(project.tagline)]);
  const fresh = (line: string) => {
    const key = normalise(line);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const lead = fresh(project.summary) ? project.summary : undefined;
  const problem = project.problem.filter(fresh);
  const paragraphs = project.overview.filter(fresh);
  return { lead, problem, paragraphs };
}

/**
 * True when the category only repeats the domain tags ("DFIR & Malware" next to DFIR, Malware, AI),
 * so a brief page can show the domain once.
 */
export function categoryRepeatsDomain(project: Pick<Project, "category" | "domain">): boolean {
  const domains = new Set(project.domain.map((d) => d.toLowerCase()));
  const parts = project.category
    .split(/\s*(?:&|\/|,|\band\b)\s*/i)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => domains.has(part));
}

/* ---------------------------------------------------------------- related */

export type RelatedResearch = { slug: string; title: string; tagline: string };
export type RelatedNote = { slug: string; number: number; title: string };

type NoteLike = { slug: string; meta: { title: string; number: number; tags: readonly string[] } };

/**
 * What a case study should link onward to. Research pages whose `relatedProjects` name the system
 * (the page about the system itself first, then the rest in index order), and field notes tagged
 * with the system's display name (lowest note number first, which is reading order).
 */
export function relatedFor(
  project: Pick<Project, "slug" | "name">,
  research: readonly Pick<ResearchItem, "slug" | "title" | "tagline" | "relatedProjects">[],
  posts: readonly NoteLike[],
): { research: RelatedResearch[]; notes: RelatedNote[] } {
  const own = research.filter((r) => r.relatedProjects.includes(project.slug));
  const ordered = [
    ...own.filter((r) => r.slug === project.slug),
    ...own.filter((r) => r.slug !== project.slug),
  ];

  const name = project.name.trim().toLowerCase();
  const notes = posts
    .filter((post) => post.meta.tags.some((tag) => tag.trim().toLowerCase() === name))
    .map((post) => ({ slug: post.slug, number: post.meta.number, title: post.meta.title }))
    .sort((a, b) => a.number - b.number);

  return {
    research: ordered.map(({ slug, title, tagline }) => ({ slug, title, tagline })),
    notes,
  };
}
