import fs from "node:fs/promises";
import path from "node:path";
import type { Experience, Project, ResearchItem, SkillGroup, WritingMeta } from "@/content/schema";
import { getExperience, getProjects, getResearch, getSkills } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Search index for the command palette. Built once on the server at export time (the root layout
 * awaits it) and passed to the client palette as plain data. Everything here is derived from the
 * typed content accessors, so a new project, research item or field note is searchable the moment
 * it exists.
 *
 * Client code must only `import type` from this module: it reads the file system.
 */

export type SearchGroup =
  "NAVIGATE" | "SYSTEMS" | "RESEARCH" | "WRITING" | "SKILLS" | "EXPERIENCE" | "LINKS" | "ACTIONS";

export type SearchAction =
  | "toggle-theme"
  | "view-engineer"
  | "view-recruiter"
  | "open-terminal"
  | "system-overview"
  | "print-resume";

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  group: SearchGroup;
  /** Internal path, `mailto:` address or external URL. Items with an `action` have no href. */
  href?: string;
  /** Opens in a new tab with noopener. Only set for http(s) URLs. */
  external?: boolean;
  action?: SearchAction;
  /** Extra match text: related names, tags, tools. Matched at a lower weight than the title. */
  keywords?: string[];
  /** Shown in the palette before the visitor types anything. */
  featured?: boolean;
};

type PostInput = {
  slug: string;
  meta: Pick<WritingMeta, "title" | "summary" | "tags" | "number">;
  /** Project and research names the post body mentions, so a search for a system finds the notes about it. */
  mentions: readonly string[];
};

export type SearchSources = {
  projects: readonly Pick<
    Project,
    "slug" | "name" | "tagline" | "category" | "status" | "domain" | "stack" | "tier"
  >[];
  research: readonly Pick<ResearchItem, "slug" | "title" | "tagline" | "relatedProjects">[];
  posts: readonly PostInput[];
  skills: readonly Pick<SkillGroup, "id" | "title" | "items" | "depth">[];
  experience: readonly Pick<
    Experience,
    "id" | "org" | "role" | "team" | "start" | "end" | "current" | "tags"
  >[];
};

const NAVIGATE: SearchItem[] = [
  {
    id: "nav:home",
    title: "Home",
    subtitle: "Overview",
    group: "NAVIGATE",
    href: "/",
    keywords: ["start", "landing"],
  },
  {
    id: "nav:systems",
    title: "Systems",
    subtitle: "Security systems built",
    group: "NAVIGATE",
    href: "/systems/",
    keywords: ["projects", "case studies", "build"],
    featured: true,
  },
  {
    id: "nav:experience",
    title: "Experience",
    subtitle: "Roles and education",
    group: "NAVIGATE",
    href: "/experience/",
    keywords: ["work", "career", "history", "education"],
    featured: true,
  },
  {
    id: "nav:research",
    title: "Research",
    subtitle: "AI security and autonomous agents",
    group: "NAVIGATE",
    href: "/research/",
    keywords: ["papers", "directions"],
    featured: true,
  },
  {
    id: "nav:writing",
    title: "Writing",
    subtitle: "Field notes",
    group: "NAVIGATE",
    href: "/writing/",
    keywords: ["blog", "articles", "notes", "field notes"],
    featured: true,
  },
  {
    id: "nav:about",
    title: "About",
    subtitle: "Background and focus",
    group: "NAVIGATE",
    href: "/about/",
    keywords: ["bio", "profile", "who"],
    featured: true,
  },
  {
    id: "nav:certifications",
    title: "Certifications",
    subtitle: "Earned and planned",
    group: "NAVIGATE",
    href: "/certifications/",
    keywords: ["credentials", "badges", "certificates"],
  },
  {
    id: "nav:resume",
    title: "Resume",
    subtitle: "Resume page and PDF",
    group: "NAVIGATE",
    href: "/resume/",
    keywords: ["cv", "print"],
  },
  {
    id: "nav:contact",
    title: "Contact",
    subtitle: "Email and links",
    group: "NAVIGATE",
    href: "/contact/",
    keywords: ["email", "hire", "message", "reach"],
    featured: true,
  },
  {
    id: "nav:privacy",
    title: "Privacy",
    subtitle: "How this site handles data",
    group: "NAVIGATE",
    href: "/privacy/",
    keywords: ["data", "cookies", "tracking"],
  },
];

const LINKS: SearchItem[] = [
  {
    id: "link:github",
    title: "GitHub",
    subtitle: `github.com/${site.githubUser}`,
    group: "LINKS",
    href: site.github,
    external: true,
    keywords: ["code", "repositories", "source"],
  },
  {
    id: "link:linkedin",
    title: "LinkedIn",
    subtitle: "Profile",
    group: "LINKS",
    href: site.linkedin,
    external: true,
    keywords: ["profile", "network"],
  },
  {
    id: "link:email",
    title: "Email",
    subtitle: site.email,
    group: "LINKS",
    href: `mailto:${site.email}`,
    keywords: ["mail", "contact", "write"],
  },
  {
    id: "link:hashnode",
    title: "Hashnode",
    subtitle: "Articles",
    group: "LINKS",
    href: site.hashnode,
    external: true,
    keywords: ["blog", "writing", "articles"],
  },
  {
    id: "link:resume-pdf",
    title: "Resume PDF",
    subtitle: "Download",
    group: "LINKS",
    href: site.resumeDownload,
    external: true,
    keywords: ["cv", "download", "resume"],
  },
];

const ACTIONS: SearchItem[] = [
  {
    id: "action:open-terminal",
    title: "Open terminal",
    subtitle: "Type commands",
    group: "ACTIONS",
    action: "open-terminal",
    keywords: ["console", "shell", "command line", "cli"],
    featured: true,
  },
  {
    id: "action:toggle-theme",
    title: "Toggle dark mode",
    subtitle: "Switch between dark and light",
    group: "ACTIONS",
    action: "toggle-theme",
    keywords: ["theme", "light mode", "appearance", "color"],
    featured: true,
  },
  {
    id: "action:view-recruiter",
    title: "View as recruiter",
    subtitle: "Hide the engineering detail",
    group: "ACTIONS",
    action: "view-recruiter",
    keywords: ["view", "mode", "summary", "hiring"],
    featured: true,
  },
  {
    id: "action:view-engineer",
    title: "View as engineer",
    subtitle: "Show the engineering detail",
    group: "ACTIONS",
    action: "view-engineer",
    keywords: ["view", "mode", "technical", "detail"],
    featured: true,
  },
  {
    id: "action:system-overview",
    title: "System overview",
    subtitle: "Run status in the terminal",
    group: "ACTIONS",
    action: "system-overview",
    keywords: ["status", "metrics", "summary"],
  },
];

function dateRange(entry: { start: string; end?: string | undefined; current: boolean }): string {
  if (entry.current) return `${entry.start} – present`;
  return entry.end ? `${entry.start} – ${entry.end}` : entry.start;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Names from `names` that appear in `text` as whole words, ignoring case. Pure. */
export function findMentions(text: string, names: readonly string[]): string[] {
  const found: string[] = [];
  for (const name of new Set(names)) {
    if (name.trim() === "") continue;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "iu");
    if (pattern.test(text)) found.push(name);
  }
  return found;
}

/** Pure assembly of the index from content. Exported for tests; `buildSearchIndex` feeds it. */
export function composeSearchItems(sources: SearchSources): SearchItem[] {
  const projectNames = new Map(sources.projects.map((p) => [p.slug, p.name] as const));

  const systems = sources.projects.map((p): SearchItem => ({
    id: `system:${p.slug}`,
    title: p.name,
    subtitle: p.tagline,
    group: "SYSTEMS",
    href: `/systems/${p.slug}/`,
    keywords: [
      p.category,
      ...p.domain,
      ...p.stack,
      ...(p.status ? [p.status] : []),
      "system",
      "project",
    ],
    featured: p.tier === 1,
  }));

  const research = sources.research.map((r): SearchItem => ({
    id: `research:${r.slug}`,
    title: r.title,
    subtitle: r.tagline,
    group: "RESEARCH",
    href: `/research/${r.slug}/`,
    keywords: [
      "research",
      ...r.relatedProjects.map((slug) => projectNames.get(slug)).filter((n) => n !== undefined),
    ],
  }));

  const writing = sources.posts.map((post): SearchItem => ({
    id: `writing:${post.slug}`,
    title: post.meta.title,
    subtitle: post.meta.summary,
    group: "WRITING",
    href: `/writing/${post.slug}/`,
    keywords: [...post.meta.tags, ...post.mentions, "field note", "writing", "article"],
  }));

  const skills = sources.skills.map((g): SearchItem => ({
    id: `skill:${g.id}`,
    title: g.title,
    subtitle: g.items.slice(0, 4).join(" · "),
    group: "SKILLS",
    href: "/#stack",
    keywords: [...g.items, ...g.depth, "skills", "stack", "tools"],
  }));

  const experience = sources.experience.map((e): SearchItem => ({
    id: `experience:${e.id}`,
    title: e.role,
    subtitle: `${e.org} · ${dateRange(e)}`,
    group: "EXPERIENCE",
    href: "/experience/",
    keywords: [e.org, ...(e.team ? [e.team] : []), ...e.tags],
  }));

  return [
    ...NAVIGATE,
    ...systems,
    ...research,
    ...writing,
    ...skills,
    ...experience,
    ...LINKS,
    ...ACTIONS,
  ];
}

async function readPostSource(slug: string): Promise<string> {
  const file = path.join(process.cwd(), "content", "writing", `${slug}.mdx`);
  return fs.readFile(file, "utf8").catch(() => "");
}

/** Server-side. Reads content and the field-note sources once per build. */
export async function buildSearchIndex(): Promise<SearchItem[]> {
  // Imported lazily so the pure functions above stay importable where `server-only` would throw.
  const { getWritingPosts } = await import("@/lib/writing");
  const projects = getProjects();
  const research = getResearch();
  const names = [...projects.map((p) => p.name), ...research.map((r) => r.title)];

  const posts = await Promise.all(
    (await getWritingPosts()).map(async (post) => ({
      slug: post.slug,
      meta: post.meta,
      mentions: findMentions(await readPostSource(post.slug), names),
    })),
  );

  return composeSearchItems({
    projects,
    research,
    posts,
    skills: getSkills(),
    experience: getExperience(),
  });
}
