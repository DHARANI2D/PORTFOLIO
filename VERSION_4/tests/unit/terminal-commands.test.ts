import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  commandNames,
  runCommand,
  type TerminalContext,
  type TerminalResult,
} from "@/lib/terminal-commands";

/** A hand-built context with sentinel numbers, so a test can tell data from hard-coded text. */
const ctx: TerminalContext = {
  projects: [
    {
      slug: "witness",
      name: "WITNESS",
      tier: 1,
      tagline: "A gate for agents.",
      graphNodes: ["ai", "agents"],
    },
    {
      slug: "signalfusion-core",
      name: "SignalFusion Core",
      tier: 1,
      tagline: "Correlation.",
      graphNodes: ["soc", "detection"],
    },
    { slug: "aegis", name: "AEGIS", tier: 2, tagline: "Control plane.", graphNodes: ["ai"] },
  ],
  research: [
    { slug: "witness", title: "WITNESS", tagline: "Evidence first.", graphNodes: ["ai"] },
    { slug: "ai-dfir", title: "AI DFIR", tagline: "Agentic IR.", graphNodes: ["dfir", "ai"] },
  ],
  experience: [
    {
      id: "now",
      org: "Acme",
      role: "Analyst",
      team: "Team",
      start: "Jan 2020",
      current: true,
      bullets: ["Did a thing."],
    },
    {
      id: "education",
      org: "College",
      role: "B.E.",
      start: "2015",
      end: "2019",
      current: false,
      bullets: [],
      summary: "Degree.",
    },
  ],
  skills: [{ title: "Cloud", items: ["AWS", "Azure"] }],
  certifications: [
    { name: "Earned One", status: "verified", year: "2025" },
    { name: "Future One", status: "planned" },
  ],
  metrics: {
    systems: 11,
    flagship: 22,
    research: 33,
    certificationsVerified: 44,
    earlierProjects: 55,
  },
  site: {
    name: "Test Person",
    brand: "T / P",
    description: "Does security.",
    location: "Nowhere",
    availability: "AVAILABLE",
    email: "test@example.com",
    github: "https://github.com/test",
    linkedin: "https://linkedin.com/in/test",
    hashnode: "https://test.hashnode.dev/",
    resumeDownload: "https://example.com/cv.pdf",
  },
};

const text = (result: TerminalResult) => result.lines.join("\n");
const run = (input: string, overrides: Partial<TerminalContext> = {}) =>
  runCommand(input, { ...ctx, ...overrides });

describe("runCommand basics", () => {
  it("returns nothing for empty input", () => {
    expect(run("")).toEqual({ lines: [] });
    expect(run("   ")).toEqual({ lines: [] });
  });

  it("lists every command in help, with its summary", () => {
    const out = text(run("help"));
    for (const name of commandNames) expect(out, name).toContain(name);
    expect(out).toContain("COMMANDS");
    expect(run("?").lines).toEqual(run("help").lines);
  });

  it("is case-insensitive on the command word and honours aliases", () => {
    expect(run("HELP").lines).toEqual(run("help").lines);
    expect(run("ls").lines).toEqual(run("projects").lines);
    expect(run("certs").lines).toEqual(run("certifications").lines);
  });

  it("explains an unknown command and suggests a near one", () => {
    const out = text(run("projcts"));
    expect(out).toContain("Command not found: projcts");
    expect(out).toContain('Did you mean "projects"?');
    expect(text(run("qqqqqq"))).toContain('Type "help"');
  });

  it("never navigates or changes preferences for an unknown command", () => {
    const result = run("rm -rf /");
    expect(result.navigate).toBeUndefined();
    expect(result.theme).toBeUndefined();
    expect(result.view).toBeUndefined();
    expect(result.clear).toBeUndefined();
  });

  it("echoes hostile input safely: printable ASCII only, bounded length", () => {
    // Built from code points so the source file holds no invisible or bidirectional characters.
    const hostile = ["\u001b[31m", "evil", "\u0007", String.fromCodePoint(0x202e, 0x1f600)].join(
      "",
    );
    for (const line of run(hostile).lines) {
      for (const char of line) {
        const code = char.codePointAt(0) ?? 0;
        expect(code >= 0x20 && code <= 0x7e, `U+${code.toString(16)}`).toBe(true);
      }
    }
    expect(text(run(hostile))).toContain("Command not found: ?[31mevil???");
    const long = run("x".repeat(500)).lines[0] ?? "";
    expect(long.length).toBeLessThan(80);
  });
});

describe("content commands", () => {
  it("projects lists slugs, tiers and taglines from the context", () => {
    const out = text(run("projects"));
    expect(out).toContain("SYSTEMS / 3");
    expect(out).toContain("signalfusion-core");
    expect(out).toContain("flagship");
    expect(out).toContain("Control plane.");
  });

  it("about, experience, skills, research, certifications, contact and resume print context data", () => {
    expect(text(run("about"))).toContain("Analyst, Acme, Team");
    expect(text(run("about"))).toContain("Nowhere");
    expect(text(run("experience"))).toContain("Jan 2020 – present");
    expect(text(run("experience"))).toContain("EDUCATION");
    expect(text(run("skills"))).toContain("AWS, Azure");
    expect(text(run("research"))).toContain("RESEARCH / 2");
    const certs = text(run("certifications"));
    expect(certs).toContain("Earned One (2025)");
    expect(certs).toContain("PLANNED, NOT EARNED");
    expect(text(run("contact"))).toContain("test@example.com");
    expect(text(run("resume"))).toContain("https://example.com/cv.pdf");
  });

  it("keeps planned certifications out of the verified list", () => {
    const certs = text(run("certifications"));
    const verified = certs.slice(certs.indexOf("VERIFIED"), certs.indexOf("PLANNED"));
    expect(verified).toContain("Earned One");
    expect(verified).not.toContain("Future One");
  });

  it("matrix maps domains to the systems and research that use them", () => {
    const out = text(run("matrix"));
    expect(out).toMatch(/AI SECURITY\s+WITNESS, AEGIS, AI DFIR/);
    expect(out).toMatch(/CLOUD\s+-/);
  });
});

describe("status", () => {
  it("prints the numbers from ctx.metrics and nothing else", () => {
    const out = text(run("status"));
    expect(out).toContain("projects 11");
    expect(out).toContain("flagship 22");
    expect(out).toContain("research 33");
    expect(out).toContain("certifications 44 verified");
    expect(out).toContain("earlier work 55");
  });

  it("changes when the metrics change", () => {
    const out = text(run("status", { metrics: { ...ctx.metrics, systems: 99 } }));
    expect(out).toContain("projects 99");
    expect(out).not.toContain("projects 11");
  });

  it("shows the current preferences only when the caller knows them", () => {
    expect(text(run("status"))).not.toContain("theme");
    expect(text(run("status", { theme: "light", view: "recruiter" }))).toContain(
      "theme light / view recruiter",
    );
  });
});

describe("theme and view", () => {
  it("sets an explicit theme or view", () => {
    expect(run("theme dark").theme).toBe("dark");
    expect(run("theme LIGHT").theme).toBe("light");
    expect(run("view recruiter").view).toBe("recruiter");
    expect(run("view engineer").view).toBe("engineer");
  });

  it("toggles when the context knows the current value", () => {
    expect(run("theme", { theme: "dark" }).theme).toBe("light");
    expect(run("theme", { theme: "light" }).theme).toBe("dark");
    expect(run("view", { view: "engineer" }).view).toBe("recruiter");
  });

  it("explains usage instead of guessing", () => {
    const bare = run("theme");
    expect(bare.theme).toBeUndefined();
    expect(text(bare)).toContain("Usage: theme dark|light");
    const bad = run("view sideways");
    expect(bad.view).toBeUndefined();
    expect(text(bad)).toContain('Unknown view "sideways"');
  });
});

describe("open", () => {
  it("opens a system by slug, name or partial name", () => {
    expect(run("open aegis").navigate).toBe("/systems/aegis/");
    expect(run("open signalfusion-core").navigate).toBe("/systems/signalfusion-core/");
    expect(run("open signal").navigate).toBe("/systems/signalfusion-core/");
    expect(run("cd AEGIS").navigate).toBe("/systems/aegis/");
  });

  it("separates systems from research and hints when a name is in both", () => {
    const both = run("open witness");
    expect(both.navigate).toBe("/systems/witness/");
    expect(text(both)).toContain("Also in research: open research witness");
    expect(run("open research witness").navigate).toBe("/research/witness/");
    expect(run("open systems/witness").navigate).toBe("/systems/witness/");
    expect(run("open ai-dfir").navigate).toBe("/research/ai-dfir/");
  });

  it("opens fixed pages", () => {
    expect(run("open about").navigate).toBe("/about/");
    expect(run("open work").navigate).toBe("/experience/");
    expect(run("open certs").navigate).toBe("/certifications/");
    expect(run("open home").navigate).toBe("/");
  });

  it("only ever produces an internal path", () => {
    for (const input of [
      "open https://evil.example",
      "open //evil.example",
      "open ../../etc/passwd",
      "open javascript:alert(1)",
      "open witness/../../x",
      "open /",
      "open",
      "open nonexistent-thing",
    ]) {
      const { navigate } = run(input);
      if (navigate !== undefined) {
        expect(navigate, input).toMatch(/^\/(?:[a-z0-9-]+\/)*$/);
        expect(navigate.startsWith("//"), input).toBe(false);
      }
    }
    expect(text(run("open nonexistent-thing"))).toContain('Nothing named "nonexistent-thing"');
    expect(text(run("open"))).toContain("Usage: open <slug>");
  });
});

describe("clear", () => {
  it("asks the UI to clear and prints nothing", () => {
    expect(run("clear")).toEqual({ lines: [], clear: true });
    expect(run("cls").clear).toBe(true);
  });
});

/**
 * Words that exist on every plain object. User input must treat them as ordinary unknown words:
 * `open constructor` used to resolve to Object's constructor function and crash the terminal.
 */
const PROTOTYPE_WORDS = [
  "constructor",
  "__proto__",
  "toString",
  "hasOwnProperty",
  "valueOf",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__defineGetter__",
  "__lookupGetter__",
  "prototype",
] as const;

describe("input that names a prototype member", () => {
  it.each(PROTOTYPE_WORDS)("`open %s` finds nothing and does not navigate", (word) => {
    const result = run(`open ${word}`);
    expect(result.navigate).toBeUndefined();
    expect(text(result)).toContain(`Nothing named "${word}"`);
  });

  it.each(PROTOTYPE_WORDS)("`%s` as a command is an unknown command", (word) => {
    const result = run(word);
    expect(text(result)).toContain(`Command not found: ${word}`);
    expect(result.navigate).toBeUndefined();
  });

  it.each(PROTOTYPE_WORDS)("scoped and argument forms with %s never throw or navigate", (word) => {
    for (const input of [
      `open research ${word}`,
      `open systems ${word}`,
      `open systems/${word}`,
      `open /research/${word}/`,
      `cd ${word}`,
      `theme ${word}`,
      `view ${word}`,
    ]) {
      const result = run(input);
      expect(result.navigate, input).toBeUndefined();
      expect(result.theme, input).toBeUndefined();
      expect(result.view, input).toBeUndefined();
      expect(Array.isArray(result.lines), input).toBe(true);
    }
  });

  it("only ever returns a string for navigate", () => {
    for (const word of PROTOTYPE_WORDS) {
      for (const input of [`open ${word}`, `open ${word} ${word}`, `open research ${word}`]) {
        const { navigate } = run(input);
        expect(navigate === undefined || typeof navigate === "string", input).toBe(true);
      }
    }
  });

  it("still opens the real pages, which share the lookup table", () => {
    expect(run("open home").navigate).toBe("/");
    expect(run("open privacy").navigate).toBe("/privacy/");
  });
});

describe("what ships to the browser", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../lib/terminal-commands.ts"), "utf8");
  const imports = [...source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)";/gms)].map(
    (match) => ({ typeOnly: match[1] !== undefined, from: match[2] ?? "" }),
  );

  it("imports content and the schema as types only, so zod never reaches a bundle", () => {
    expect(imports.length).toBeGreaterThan(0);
    for (const { typeOnly, from } of imports) {
      if (from === "@/lib/fuzzy") continue;
      expect(typeOnly, `${from} must be \`import type\``).toBe(true);
    }
    expect(source).not.toMatch(/from\s+"zod"/);
    expect(source).not.toMatch(/@\/lib\/content/);
    expect(source).not.toMatch(/server-only/);
  });

  it("runtime-imports nothing but the fuzzy scorer, which has no imports of its own", () => {
    const runtime = imports.filter((entry) => !entry.typeOnly).map((entry) => entry.from);
    expect(runtime).toEqual(["@/lib/fuzzy"]);
    const fuzzy = fs.readFileSync(path.join(__dirname, "../../lib/fuzzy.ts"), "utf8");
    expect(fuzzy).not.toMatch(/^import\s/m);
  });
});
