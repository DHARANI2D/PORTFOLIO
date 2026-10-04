import type {
  Certification,
  Experience,
  GraphNodeId,
  Project,
  ResearchItem,
  SkillGroup,
} from "@/content/schema";
import { fuzzyScore } from "@/lib/fuzzy";

/**
 * Pure command interpreter behind the terminal easter egg. No DOM, no React, no content imports.
 *
 * Why the data arrives as `ctx` instead of being imported here: lib/content.ts validates every
 * entry with zod at module load. Importing it from this file would put zod and the full case-study
 * text into the client bundle of every page just for an easter egg. Instead the terminal loads the
 * data with a dynamic import on first open (components/terminal/terminal-context.ts) and hands it
 * to runCommand. The `import type` lines above are erased at build time.
 *
 * Every line printed comes from `ctx` (content) or from the command table below. Nothing about the
 * owner is hard-coded here.
 */

export type TerminalSite = {
  name: string;
  brand: string;
  description: string;
  location: string;
  availability: string;
  email: string;
  github: string;
  linkedin: string;
  hashnode: string;
  resumeDownload: string;
};

export type TerminalMetrics = {
  systems: number;
  flagship: number;
  research: number;
  certificationsVerified: number;
  earlierProjects: number;
};

/** Plain, serialisable data. The Pick<> shapes let tests build a context by hand. */
export type TerminalContext = {
  projects: readonly Pick<Project, "slug" | "name" | "tier" | "tagline" | "graphNodes">[];
  research: readonly Pick<ResearchItem, "slug" | "title" | "tagline" | "graphNodes">[];
  experience: readonly Pick<
    Experience,
    "id" | "org" | "role" | "team" | "start" | "end" | "current" | "summary" | "bullets"
  >[];
  skills: readonly Pick<SkillGroup, "title" | "items">[];
  certifications: readonly Pick<Certification, "name" | "status" | "year">[];
  metrics: TerminalMetrics;
  site: TerminalSite;
  /** Current preferences, when the caller knows them. Lets `theme` and `view` toggle without an argument. */
  theme?: "dark" | "light";
  view?: "engineer" | "recruiter";
};

export type TerminalResult = {
  lines: string[];
  clear?: boolean;
  /** Internal path to navigate to. Only ever built from known slugs or the fixed page table. */
  navigate?: string;
  theme?: "dark" | "light";
  view?: "engineer" | "recruiter";
};

type Handler = (args: string[], ctx: TerminalContext) => TerminalResult;

type CommandDef = {
  name: string;
  usage: string;
  summary: string;
  aliases?: readonly string[];
  run: Handler;
};

const INDENT = "  ";

const out = (...lines: string[]): TerminalResult => ({ lines });

/** Text table. Every column except the last is padded to its widest entry. */
function table(rows: readonly (readonly string[])[], indent = INDENT): string[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.slice(0, -1).forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, cell.length);
    });
  }
  return rows.map((row) => {
    const cells = row.map((cell, i) => (i < row.length - 1 ? cell.padEnd(widths[i] ?? 0) : cell));
    return `${indent}${cells.join("  ")}`;
  });
}

function dateRange(entry: { start: string; end?: string | undefined; current: boolean }): string {
  if (entry.current) return `${entry.start} – present`;
  return entry.end ? `${entry.start} – ${entry.end}` : entry.start;
}

/** Quote user input safely for echoing: printable ASCII only, bounded length. */
function echo(value: string): string {
  const clean = value.replace(/[^\x20-\x7e]/g, "?");
  return clean.length > 40 ? `${clean.slice(0, 40)}...` : clean;
}

/** Fixed pages reachable with `open <name>`. */
const PAGES: Readonly<Record<string, string>> = {
  home: "/",
  about: "/about/",
  experience: "/experience/",
  work: "/experience/",
  systems: "/systems/",
  projects: "/systems/",
  research: "/research/",
  writing: "/writing/",
  certifications: "/certifications/",
  certs: "/certifications/",
  resume: "/resume/",
  contact: "/contact/",
  privacy: "/privacy/",
};

const DOMAIN_LABEL: Readonly<Record<GraphNodeId, string>> = {
  soc: "SOC",
  detection: "DETECTION",
  cloud: "CLOUD",
  ai: "AI SECURITY",
  dfir: "DFIR",
  agents: "AGENTS",
  automation: "AUTOMATION",
};
const DOMAIN_ORDER: readonly GraphNodeId[] = [
  "soc",
  "detection",
  "cloud",
  "ai",
  "dfir",
  "agents",
  "automation",
];

function about(_args: string[], ctx: TerminalContext): TerminalResult {
  const lines = [ctx.site.name.toUpperCase(), ctx.site.description, ""];
  const current = ctx.experience.find((entry) => entry.current);
  const rows: string[][] = [];
  if (current) {
    const team = current.team ? `, ${current.team}` : "";
    rows.push(["current", `${current.role}, ${current.org}${team}`]);
  }
  rows.push(["location", ctx.site.location], ["status", ctx.site.availability]);
  return { lines: [...lines, ...table(rows)] };
}

function experience(_args: string[], ctx: TerminalContext): TerminalResult {
  const roles = ctx.experience.filter((entry) => entry.id !== "education");
  const education = ctx.experience.filter((entry) => entry.id === "education");
  const lines: string[] = ["EXPERIENCE"];
  for (const entry of roles) {
    lines.push("", `${INDENT}${dateRange(entry)}`, `${INDENT}${entry.role}, ${entry.org}`);
    if (entry.team) lines.push(`${INDENT}${entry.team}`);
    for (const bullet of entry.bullets) lines.push(`${INDENT}${INDENT}- ${bullet}`);
  }
  if (education.length > 0) {
    lines.push("", "EDUCATION");
    for (const entry of education) {
      lines.push("", `${INDENT}${dateRange(entry)}`, `${INDENT}${entry.role}, ${entry.org}`);
      if (entry.summary) lines.push(`${INDENT}${entry.summary}`);
    }
  }
  return { lines };
}

const TIER_LABEL = { 1: "flagship", 2: "major", 3: "supporting" } as const;

function projects(_args: string[], ctx: TerminalContext): TerminalResult {
  const rows = ctx.projects.map((p) => [p.slug, TIER_LABEL[p.tier], p.tagline]);
  return {
    lines: [
      `SYSTEMS / ${ctx.projects.length}`,
      ...table(rows),
      "",
      'Type "open <slug>" to read a case study.',
    ],
  };
}

function skills(_args: string[], ctx: TerminalContext): TerminalResult {
  const lines = ["SKILLS"];
  for (const group of ctx.skills) {
    lines.push("", `${INDENT}${group.title}`, `${INDENT}${INDENT}${group.items.join(", ")}`);
  }
  lines.push("", 'Type "matrix" to see how the domains map to systems.');
  return { lines };
}

function research(_args: string[], ctx: TerminalContext): TerminalResult {
  const rows = ctx.research.map((r) => [r.slug, `${r.title}. ${r.tagline}`]);
  return {
    lines: [
      `RESEARCH / ${ctx.research.length}`,
      ...table(rows),
      "",
      'Type "open research <slug>" to read one.',
    ],
  };
}

const CERT_SECTIONS = [
  { status: "verified", heading: "VERIFIED" },
  { status: "in-progress", heading: "IN PROGRESS" },
  { status: "planned", heading: "PLANNED, NOT EARNED" },
] as const;

function certifications(_args: string[], ctx: TerminalContext): TerminalResult {
  const lines = ["CERTIFICATIONS"];
  for (const { status, heading } of CERT_SECTIONS) {
    const group = ctx.certifications.filter((cert) => cert.status === status);
    if (group.length === 0) continue;
    lines.push("", `${INDENT}${heading}`);
    for (const cert of group) {
      lines.push(`${INDENT}${INDENT}${cert.name}${cert.year ? ` (${cert.year})` : ""}`);
    }
  }
  return { lines };
}

function contact(_args: string[], ctx: TerminalContext): TerminalResult {
  const { site } = ctx;
  return {
    lines: [
      "CONTACT",
      ...table([
        ["email", site.email],
        ["github", site.github],
        ["linkedin", site.linkedin],
        ["hashnode", site.hashnode],
        ["location", site.location],
        ["status", site.availability],
      ]),
      "",
      'Type "open contact" for the contact page.',
    ],
  };
}

function resume(_args: string[], ctx: TerminalContext): TerminalResult {
  return {
    lines: [
      "RESUME",
      ...table([
        ["page", "/resume/"],
        ["pdf", ctx.site.resumeDownload],
      ]),
      "",
      'Type "open resume" for the resume page.',
    ],
  };
}

function status(_args: string[], ctx: TerminalContext): TerminalResult {
  const { metrics } = ctx;
  const lines = [
    "SYSTEM / portfolio operational",
    [
      `projects ${metrics.systems}`,
      `flagship ${metrics.flagship}`,
      `research ${metrics.research}`,
      `certifications ${metrics.certificationsVerified} verified`,
      `earlier work ${metrics.earlierProjects}`,
    ].join(" / "),
  ];
  if (ctx.theme && ctx.view) lines.push(`theme ${ctx.theme} / view ${ctx.view}`);
  return { lines };
}

function theme(args: string[], ctx: TerminalContext): TerminalResult {
  const arg = args[0]?.toLowerCase();
  if (arg === "dark" || arg === "light") {
    return { lines: [`Theme set to ${arg}.`], theme: arg };
  }
  if (arg === undefined && ctx.theme) {
    const next = ctx.theme === "dark" ? "light" : "dark";
    return { lines: [`Theme set to ${next}.`], theme: next };
  }
  return out(
    arg === undefined
      ? "Usage: theme dark|light"
      : `Unknown theme "${echo(arg)}". Use: theme dark|light`,
  );
}

function view(args: string[], ctx: TerminalContext): TerminalResult {
  const arg = args[0]?.toLowerCase();
  if (arg === "engineer" || arg === "recruiter") {
    return { lines: [`View set to ${arg}.`], view: arg };
  }
  if (arg === undefined && ctx.view) {
    const next = ctx.view === "engineer" ? "recruiter" : "engineer";
    return { lines: [`View set to ${next}.`], view: next };
  }
  return out(
    arg === undefined
      ? "Usage: view engineer|recruiter"
      : `Unknown view "${echo(arg)}". Use: view engineer|recruiter`,
  );
}

type Target = { href: string; label: string };

const SYSTEM_SCOPES = new Set(["systems", "system", "projects", "project"]);

function resolveTarget(args: string[], ctx: TerminalContext): { target?: Target; hint?: string } {
  // Accepts "open witness", "open research witness", "open systems/witness", "open /research/witness/".
  const words = args
    .join(" ")
    .toLowerCase()
    .split(/[\s/]+/)
    .filter(Boolean);
  const first = words[0];
  if (first === undefined) return {};

  if (words.length === 1) {
    const page = PAGES[first];
    if (page) return { target: { href: page, label: first } };
  }

  let scope: "research" | "system" | null = null;
  if (words.length > 1 && (first === "research" || SYSTEM_SCOPES.has(first))) {
    scope = first === "research" ? "research" : "system";
    words.shift();
  }
  const slug = words.join("-");
  const text = words.join(" ");

  const project =
    scope === "research"
      ? undefined
      : (ctx.projects.find((p) => p.slug === slug) ??
        bestMatch(text, ctx.projects, (p) => [p.slug, p.name]));
  if (project) {
    const alsoResearch = scope === null && ctx.research.some((r) => r.slug === project.slug);
    return {
      target: { href: `/systems/${project.slug}/`, label: project.name },
      hint: alsoResearch ? `Also in research: open research ${project.slug}` : undefined,
    };
  }

  const item =
    scope === "system"
      ? undefined
      : (ctx.research.find((r) => r.slug === slug) ??
        bestMatch(text, ctx.research, (r) => [r.slug, r.title]));
  if (item) return { target: { href: `/research/${item.slug}/`, label: item.title } };
  return {};
}

/** Best fuzzy hit at word-start quality or better, so "open signal" works but noise does not. */
function bestMatch<T>(
  query: string,
  items: readonly T[],
  fields: (item: T) => string[],
): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const item of items) {
    const score = Math.max(...fields(item).map((field) => fuzzyScore(query, field)));
    if (score >= 600 && score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function open(args: string[], ctx: TerminalContext): TerminalResult {
  if (args.length === 0) {
    return out('Usage: open <slug>. Type "projects" or "research" to list slugs.');
  }
  const { target, hint } = resolveTarget(args, ctx);
  if (!target) {
    return out(
      `Nothing named "${echo(args.join(" "))}".`,
      'Type "projects" or "research" to list slugs.',
    );
  }
  const lines = [`Opening ${target.label} (${target.href})`];
  if (hint) lines.push(hint);
  return { lines, navigate: target.href };
}

function matrix(_args: string[], ctx: TerminalContext): TerminalResult {
  const rows = DOMAIN_ORDER.map((id) => {
    const names: string[] = [];
    const add = (name: string, nodes: readonly GraphNodeId[]) => {
      if (nodes.includes(id) && !names.includes(name)) names.push(name);
    };
    for (const p of ctx.projects) add(p.name, p.graphNodes);
    for (const r of ctx.research) add(r.title, r.graphNodes);
    return [DOMAIN_LABEL[id], names.length > 0 ? names.join(", ") : "-"];
  });
  return { lines: ["TECHNOLOGY DOMAINS", ...table(rows)] };
}

function clear(): TerminalResult {
  return { lines: [], clear: true };
}

const COMMANDS: readonly CommandDef[] = [
  { name: "help", usage: "help", summary: "list commands", aliases: ["?"], run: help },
  { name: "about", usage: "about", summary: "who this is", aliases: ["whoami"], run: about },
  {
    name: "experience",
    usage: "experience",
    summary: "roles and education",
    aliases: ["work"],
    run: experience,
  },
  {
    name: "projects",
    usage: "projects",
    summary: "systems built",
    aliases: ["systems", "ls"],
    run: projects,
  },
  { name: "skills", usage: "skills", summary: "tools and domains", run: skills },
  { name: "research", usage: "research", summary: "research directions", run: research },
  {
    name: "certifications",
    usage: "certifications",
    summary: "earned and planned",
    aliases: ["certs"],
    run: certifications,
  },
  {
    name: "contact",
    usage: "contact",
    summary: "email and links",
    aliases: ["email"],
    run: contact,
  },
  { name: "resume", usage: "resume", summary: "resume page and PDF", aliases: ["cv"], run: resume },
  { name: "status", usage: "status", summary: "system overview", run: status },
  { name: "theme", usage: "theme [dark|light]", summary: "switch theme", run: theme },
  { name: "view", usage: "view [engineer|recruiter]", summary: "switch view", run: view },
  {
    name: "open",
    usage: "open <slug>",
    summary: "go to a system, research item or page",
    aliases: ["cd"],
    run: open,
  },
  { name: "matrix", usage: "matrix", summary: "technology domains", run: matrix },
  { name: "clear", usage: "clear", summary: "clear the screen", aliases: ["cls"], run: clear },
];

function help(): TerminalResult {
  return {
    lines: [
      "COMMANDS",
      ...table(COMMANDS.map((c) => [c.usage, c.summary])),
      "",
      "Up and down recall earlier commands. Ctrl+L clears. Esc closes.",
    ],
  };
}

/** Name or alias to definition. Built once. */
const LOOKUP = new Map<string, CommandDef>(
  COMMANDS.flatMap((def) => [def.name, ...(def.aliases ?? [])].map((key) => [key, def] as const)),
);

function suggest(word: string): string | undefined {
  let best: string | undefined;
  let bestScore = 0;
  for (const def of COMMANDS) {
    const score = fuzzyScore(word, def.name);
    if (score >= 300 && score > bestScore) {
      best = def.name;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Runs one line of terminal input. Never throws; unknown input returns a helpful message.
 * Empty input returns no lines.
 */
export function runCommand(input: string, ctx: TerminalContext): TerminalResult {
  const trimmed = input.trim();
  if (trimmed === "") return { lines: [] };

  const [word = "", ...args] = trimmed.split(/\s+/);
  const def = LOOKUP.get(word.toLowerCase());
  if (!def) {
    const lines = [`Command not found: ${echo(word)}`];
    const hint = suggest(word);
    lines.push(
      hint
        ? `Did you mean "${hint}"? Type "help" for all commands.`
        : 'Type "help" for the list of commands.',
    );
    return { lines };
  }
  return def.run(args, ctx);
}

/** Command names, for UI hints (quick-run chips, completion). */
export const commandNames: readonly string[] = COMMANDS.map((def) => def.name);
