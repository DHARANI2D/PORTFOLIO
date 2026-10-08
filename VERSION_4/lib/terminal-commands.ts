import { fuzzyScore } from "@/lib/fuzzy";
import type {
  Certification,
  Experience,
  GraphNodeId,
  Project,
  ResearchItem,
  SkillGroup,
} from "@/content/schema";

/**
 * Pure command interpreter behind the terminal easter egg. No DOM, no React, no content imports.
 *
 * Why the data arrives as `ctx` instead of being imported here: lib/content.ts validates every
 * entry with zod at module load. Importing it from this file would put zod and the full case-study
 * text into the client bundle just for an easter egg (and zod's feature probe, `new Function("")`,
 * is reported by a strict CSP as an eval violation). Instead the server builds plain data from the
 * validated content (lib/terminal-data.ts), the client dialog receives it as props, and it is
 * handed to runCommand on every command. The `import type` lines above are erased at build time;
 * a unit test keeps it that way.
 *
 * Every line printed comes from `ctx` (content) or from the command table below. Nothing about the
 * owner is hard-coded here.
 *
 * User input never indexes a plain object: names come from Maps and Sets, so words such as
 * `constructor` and `__proto__` are ordinary unknown words, not prototype members.
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
  research: number;
  certificationsVerified: number;
  earlierProjects: number;
};

/** Plain, serialisable data. The Pick<> shapes let tests build a context by hand. */
export type TerminalContext = {
  projects: readonly Pick<Project, "slug" | "name" | "tagline" | "graphNodes">[];
  research: readonly Pick<ResearchItem, "slug" | "title" | "kind" | "graphNodes">[];
  experience: readonly Pick<
    Experience,
    "id" | "org" | "role" | "team" | "start" | "end" | "current" | "summary" | "bullets"
  >[];
  skills: readonly Pick<SkillGroup, "title" | "items">[];
  certifications: readonly Pick<Certification, "name" | "status" | "year">[];
  metrics: TerminalMetrics;
  site: TerminalSite;
  /** Current preferences, when the caller knows them. Lets `theme` toggle without an argument. */
  theme?: "dark" | "light";
};

/** What the server hands to the client: the context minus the preferences, which are read at run time. */
export type TerminalData = Omit<TerminalContext, "theme">;

export type TerminalResult = {
  lines: string[];
  clear?: boolean;
  /** Internal path to navigate to. Only ever built from known slugs or the fixed page table. */
  navigate?: string;
  theme?: "dark" | "light";
  /**
   * A question for the assistant (lib/assistant.ts). The UI answers it from the site's content and
   * prints `lines` only if nothing matches, so `lines` is the fallback.
   */
  ask?: string;
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

/** Fixed pages reachable with `open <name>`. A Map, so `open constructor` or `open __proto__` finds nothing. */
const PAGES: ReadonlyMap<string, string> = new Map([
  ["home", "/"],
  ["about", "/#about"],
  ["experience", "/#experience"],
  ["work", "/#experience"],
  ["systems", "/#systems"],
  ["projects", "/#systems"],
  ["research", "/#research"],
  ["writing", "/#writing"],
  ["certifications", "/#certifications"],
  ["certs", "/#certifications"],
  ["resume", "/resume/"],
  ["contact", "/#contact"],
  ["privacy", "/privacy/"],
]);

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


function projects(_args: string[], ctx: TerminalContext): TerminalResult {
  const rows = ctx.projects.map((p) => [p.name, p.tagline]);
  return {
    lines: [
      `SYSTEMS / ${ctx.projects.length}`,
      ...table(rows),
      "",
      'How each one works is not published. Type "open systems" to see them on the page.',
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
  // Names only: the detail of the research is not published.
  const rows = ctx.research.map((r) => [r.title, r.kind]);
  return {
    lines: [
      `RESEARCH / ${ctx.research.length}`,
      ...table(rows),
      "",
      'The detail is not published. Type "contact" to get in touch.',
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
      `research ${metrics.research}`,
      `certifications ${metrics.certificationsVerified} verified`,
      `earlier work ${metrics.earlierProjects}`,
    ].join(" / "),
  ];
  if (ctx.theme) lines.push(`theme ${ctx.theme}`);
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

type Target = { href: string; label: string };

/** Opens a section of the page by name. Systems and research have no pages of their own. */
function resolveTarget(args: string[]): { target?: Target } {
  const words = args
    .join(" ")
    .toLowerCase()
    .split(/[\s/]+/)
    .filter(Boolean);
  const first = words[0];
  if (words.length !== 1 || first === undefined) return {};
  const page = PAGES.get(first);
  return page === undefined ? {} : { target: { href: page, label: first } };
}

function open(args: string[]): TerminalResult {
  if (args.length === 0) {
    return out("Usage: open <section>, such as: open about, open systems, open contact.");
  }
  const { target } = resolveTarget(args);
  if (!target) {
    return out(
      `Nothing named "${echo(args.join(" "))}".`,
      "Sections: about, work, systems, research, certs, writing, contact, resume.",
    );
  }
  return { lines: [`Opening ${target.label} (${target.href})`], navigate: target.href };
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

const NOT_FOUND_LINES = [
  "I can only answer from what is on this site: systems, research, experience, certifications, writing and contact.",
  'Type "help" for the list of commands.',
];

function ask(args: string[]): TerminalResult {
  if (args.length === 0) return out("Usage: ask <question>");
  return { lines: NOT_FOUND_LINES, ask: args.join(" ") };
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
  { name: "research", usage: "research", summary: "research names", run: research },
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
  {
    name: "open",
    usage: "open <section>",
    summary: "go to a section",
    aliases: ["cd"],
    run: open,
  },
  { name: "matrix", usage: "matrix", summary: "technology domains", run: matrix },
  { name: "ask", usage: "ask <question>", summary: "ask about this site", run: ask },
  { name: "clear", usage: "clear", summary: "clear the screen", aliases: ["cls"], run: clear },
];

function help(): TerminalResult {
  return {
    lines: [
      "COMMANDS",
      ...table(COMMANDS.map((c) => [c.usage, c.summary])),
      "",
      "Or just type a question, such as: What do you work on?",
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
    const question = args.length > 0;
    const hint = question ? undefined : suggest(word);
    // A single word that is one typo away from a command is a typo. Anything else is a question.
    if (hint) {
      return {
        lines: [
          `Command not found: ${echo(word)}`,
          `Did you mean "${hint}"? Type "help" for all commands.`,
        ],
      };
    }
    return {
      lines: question
        ? NOT_FOUND_LINES
        : [`Command not found: ${echo(word)}`, 'Type "help" for the list of commands.'],
      ask: trimmed,
    };
  }
  return def.run(args, ctx);
}

/** Command names, for UI hints (quick-run chips, completion). */
export const commandNames: readonly string[] = COMMANDS.map((def) => def.name);
