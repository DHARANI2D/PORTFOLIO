import { describe, expect, it } from "vitest";
import { fuzzyScore, fuzzyScoreFields, rankItems, rankItemsScored } from "@/lib/fuzzy";

describe("fuzzyScore", () => {
  it("returns 0 for an empty query, empty text or no match", () => {
    expect(fuzzyScore("", "witness")).toBe(0);
    expect(fuzzyScore("   ", "witness")).toBe(0);
    expect(fuzzyScore("witness", "")).toBe(0);
    expect(fuzzyScore("zzz", "witness")).toBe(0);
  });

  it("orders the tiers: exact > prefix > word start > substring > subsequence", () => {
    const exact = fuzzyScore("sig", "sig");
    const prefix = fuzzyScore("sig", "signal");
    const wordStart = fuzzyScore("sig", "core signal");
    const substring = fuzzyScore("ign", "signal");
    const subsequence = fuzzyScore("sgl", "signal");
    expect(exact).toBe(1000);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(subsequence);
    expect(subsequence).toBeGreaterThan(0);
  });

  it("keeps each tier inside its documented band", () => {
    expect(fuzzyScore("sig", "signal")).toBeGreaterThanOrEqual(800);
    expect(fuzzyScore("sig", "signal")).toBeLessThan(900);
    expect(fuzzyScore("sig", "core signal")).toBeGreaterThanOrEqual(600);
    expect(fuzzyScore("sig", "core signal")).toBeLessThan(700);
    expect(fuzzyScore("ign", "signal")).toBeGreaterThanOrEqual(400);
    expect(fuzzyScore("ign", "signal")).toBeLessThan(500);
    expect(fuzzyScore("sgl", "signal")).toBeLessThan(400);
  });

  it("prefers shorter text and earlier matches inside a tier", () => {
    expect(fuzzyScore("sig", "signal")).toBeGreaterThan(fuzzyScore("sig", "signal fusion core"));
    expect(fuzzyScore("ign", "signal")).toBeGreaterThan(fuzzyScore("ign", "a long design note"));
  });

  it("ignores case, diacritics and extra spaces", () => {
    expect(fuzzyScore("WITNESS", "witness")).toBe(1000);
    expect(fuzzyScore("cafe", "Café")).toBe(1000);
    expect(fuzzyScore("  signal   fusion ", "Signal Fusion")).toBeGreaterThan(0);
  });

  it("needs every word of a multi-word query to match", () => {
    expect(fuzzyScore("signal core", "SignalFusion Core")).toBeGreaterThan(0);
    expect(fuzzyScore("signal banana", "SignalFusion Core")).toBe(0);
  });

  it("rejects a subsequence that sprawls across the text", () => {
    expect(fuzzyScore("sw", "s" + "x".repeat(40) + "w")).toBe(0);
  });

  it("does not match single characters loosely", () => {
    // One-letter queries only match as a prefix or substring, never as a scattered subsequence.
    expect(fuzzyScore("z", "signal")).toBe(0);
  });
});

describe("fuzzyScoreFields", () => {
  it("weights later fields below the title", () => {
    const title = fuzzyScoreFields("detect", ["detection", "unrelated"]);
    const keyword = fuzzyScoreFields("detect", ["unrelated", "detection"]);
    expect(title).toBeGreaterThan(keyword);
    expect(keyword).toBeGreaterThan(0);
  });

  it("accepts a plain string", () => {
    expect(fuzzyScoreFields("a", "a")).toBe(1000);
  });
});

describe("rankItems", () => {
  const items = [
    { id: 1, title: "Research" },
    { id: 2, title: "Resume" },
    { id: 3, title: "Writing" },
    { id: 4, title: "Security research notes" },
  ];

  it("returns everything in the original order for an empty query", () => {
    expect(rankItems("", items, (i) => i.title)).toEqual(items);
    expect(rankItems("  ", items, (i) => i.title)).toEqual(items);
  });

  it("drops non-matches and puts the best match first", () => {
    const ranked = rankItems("res", items, (i) => i.title).map((i) => i.id);
    expect(ranked).not.toContain(3);
    expect(ranked.slice(0, 2)).toEqual([2, 1]); // "Resume" is shorter than "Research"
    expect(ranked.at(-1)).toBe(4); // a word-start match ranks below prefix matches
  });

  it("is stable: equal scores keep their input order", () => {
    const same = [
      { id: "a", title: "alpha" },
      { id: "b", title: "alpha" },
      { id: "c", title: "alpha" },
    ];
    expect(rankItems("alpha", same, (i) => i.title).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate its input", () => {
    const copy = [...items];
    rankItems("res", items, (i) => i.title);
    expect(items).toEqual(copy);
  });

  it("scores through several fields", () => {
    const scored = rankItemsScored("cloud", [{ t: "Stack", k: "cloud security" }], (i) => [
      i.t,
      i.k,
    ]);
    expect(scored).toHaveLength(1);
    expect(scored[0]?.score).toBeGreaterThan(0);
  });
});
