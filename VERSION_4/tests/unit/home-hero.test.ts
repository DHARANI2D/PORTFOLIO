import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOOT_LINES,
  CHAR_MS,
  LINE_PAUSE_MS,
  START_DELAY_MS,
  TOTAL_MS,
  progressAt,
} from "@/components/hero/boot-sequence";
import { buildIdentity, shortOrg } from "@/components/hero/identity";
import { getEarlierWork, getExperience } from "@/lib/content";
import { site } from "@/lib/site";

const ROOT = path.resolve(import.meta.dirname, "../..");

describe("hero identity row", () => {
  it("is built from the current role in content and the site location", () => {
    const identity = buildIdentity(getExperience(), site.location);
    expect(identity).toEqual({
      role: "SOC ANALYST · CYBERSECURITY DESIGN & ENGINEERING · HPE",
      place: "INDIA · OPEN TO GLOBAL ROLES",
    });
  });

  it("follows the content: another current role changes the row, none removes it", () => {
    const [first] = getExperience();
    if (!first) throw new Error("no experience content");
    const changed = buildIdentity(
      [{ ...first, role: "Detection Engineer", team: undefined, org: "Acme Labs" }],
      "India",
    );
    expect(changed?.role).toBe("DETECTION ENGINEER · ACME LABS");
    expect(buildIdentity([{ ...first, current: false }], "India")).toBeNull();
  });

  it("shortens an organisation only when it carries a bracketed short form", () => {
    expect(shortOrg("Hewlett Packard Enterprise (HPE)")).toBe("HPE");
    expect(shortOrg("Facilio")).toBe("Facilio");
  });
});

describe("boot console sequence", () => {
  it("fits in 3 seconds in total", () => {
    const chars = BOOT_LINES.reduce((sum, line) => sum + line.length, 0);
    expect(TOTAL_MS).toBe(
      START_DELAY_MS + chars * CHAR_MS + (BOOT_LINES.length - 1) * LINE_PAUSE_MS,
    );
    expect(TOTAL_MS).toBeLessThanOrEqual(3000);
  });

  it("starts empty, never goes backwards and ends on null", () => {
    expect(progressAt(0)).toEqual({ line: 0, chars: 0 });
    let last = { line: 0, chars: 0 };
    for (let t = 0; t < TOTAL_MS; t += 7) {
      const now = progressAt(t);
      expect(now).not.toBeNull();
      if (!now) continue;
      const lineText = BOOT_LINES[now.line] ?? "";
      expect(now.chars).toBeGreaterThanOrEqual(0);
      expect(now.chars).toBeLessThanOrEqual(lineText.length);
      expect(now.line * 1000 + now.chars).toBeGreaterThanOrEqual(last.line * 1000 + last.chars);
      last = now;
    }
    expect(last.line).toBe(BOOT_LINES.length - 1);
    expect(progressAt(TOTAL_MS)).toBeNull();
    expect(progressAt(TOTAL_MS + 10_000)).toBeNull();
  });
});

/** Every .ts/.tsx file under a folder of the project, for source scans. */
function sources(dir: string): string[] {
  const full = path.join(ROOT, dir);
  return readdirSync(full).flatMap((name) => {
    const file = path.join(full, name);
    if (statSync(file).isDirectory()) return sources(path.join(dir, name));
    return /\.(ts|tsx)$/.test(name) ? [file] : [];
  });
}

describe("the home page has no live GitHub data", () => {
  it("has no lib/github module and nothing imports one", () => {
    expect(existsSync(path.join(ROOT, "lib/github.ts"))).toBe(false);
    for (const file of [...sources("app"), ...sources("components"), ...sources("lib")]) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/api\.github\.com/);
      expect(text, file).not.toMatch(/from ["']@\/lib\/github["']/);
    }
  });

  it("makes no network request from the home components at all", () => {
    for (const file of [
      ...sources("components/home"),
      ...sources("components/hero"),
      ...sources("components/skills"),
      path.join(ROOT, "app/page.tsx"),
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /\bfetch\s*\(|XMLHttpRequest|sendBeacon/,
      );
    }
  });

  it("lists only reviewed GitHub links: the earlier-work entries and the profile", () => {
    const linked = getEarlierWork().filter((entry) => entry.url);
    expect(linked.length).toBeGreaterThan(0);
    for (const entry of linked) {
      expect(entry.url).toMatch(new RegExp(`^${site.github}/[A-Za-z0-9._-]+$`));
    }
  });
});
