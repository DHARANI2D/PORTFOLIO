import { describe, expect, it } from "vitest";
import {
  getCertifications,
  getExperience,
  getMetrics,
  getProjects,
  getResearch,
  getSkills,
} from "@/lib/content";
import { runCommand } from "@/lib/terminal-commands";
import { buildTerminalData } from "@/lib/terminal-data";

/** The terminal's data is built on the server and travels as props, so it has to survive serialisation. */
describe("buildTerminalData", () => {
  const data = buildTerminalData();

  it("is plain data: it survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it("carries every system, research item, role and group from the validated content", () => {
    expect(data.projects.map((p) => p.slug)).toEqual(getProjects().map((p) => p.slug));
    expect(data.research.map((r) => r.slug)).toEqual(getResearch().map((r) => r.slug));
    expect(data.experience.map((e) => e.id)).toEqual(getExperience().map((e) => e.id));
    expect(data.skills.map((s) => s.title)).toEqual(getSkills().map((s) => s.title));
    expect(data.certifications.map((c) => c.name)).toEqual(getCertifications().map((c) => c.name));
    expect(data.metrics).toEqual(getMetrics());
  });

  it("copies only the fields the commands read", () => {
    expect(Object.keys(data.projects[0] ?? {}).sort()).toEqual(
      ["graphNodes", "name", "slug", "tagline", "tier"].sort(),
    );
    expect(Object.keys(data.certifications[0] ?? {}).sort()).toEqual(
      ["name", "status", "year"].sort(),
    );
  });

  it("drives every content command without throwing, and prints real content", () => {
    const ctx = { ...data, theme: "dark" as const, view: "engineer" as const };
    for (const command of [
      "about",
      "experience",
      "projects",
      "skills",
      "research",
      "certifications",
      "contact",
      "resume",
      "status",
      "matrix",
    ]) {
      const { lines } = runCommand(command, ctx);
      expect(lines.length, command).toBeGreaterThan(0);
    }
    const first = data.projects[0];
    expect(first).toBeDefined();
    expect(runCommand(`open ${first?.slug}`, ctx).navigate).toBe(`/systems/${first?.slug}/`);
    expect(runCommand("status", ctx).lines.join("\n")).toContain(
      `projects ${getProjects().length}`,
    );
  });

  it("keeps odd words from reaching a prototype with the real data too", () => {
    const ctx = { ...data };
    for (const word of ["constructor", "__proto__", "hasOwnProperty", "toString"]) {
      expect(runCommand(`open ${word}`, ctx).navigate, word).toBeUndefined();
    }
  });
});
