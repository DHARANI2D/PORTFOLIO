import { describe, expect, it } from "vitest";
import { getEarlierWork } from "@/lib/content";
import { curatedRepos, selectRepos } from "@/lib/github";

const repo = (over: Record<string, unknown> = {}) => ({
  name: "r",
  html_url: "https://github.com/DHARANI2D/r",
  description: "A repo",
  language: "Python",
  pushed_at: "2026-01-01T00:00:00Z",
  stargazers_count: 3,
  fork: false,
  archived: false,
  ...over,
});

describe("selectRepos", () => {
  it("keeps the newest repositories first and honours the limit", () => {
    const raw = [
      repo({
        name: "old",
        html_url: "https://github.com/DHARANI2D/old",
        pushed_at: "2024-01-01T00:00:00Z",
      }),
      repo({
        name: "new",
        html_url: "https://github.com/DHARANI2D/new",
        pushed_at: "2026-06-01T00:00:00Z",
      }),
      repo({
        name: "mid",
        html_url: "https://github.com/DHARANI2D/mid",
        pushed_at: "2025-01-01T00:00:00Z",
      }),
    ];
    expect(selectRepos(raw).map((r) => r.name)).toEqual(["new", "mid", "old"]);
    expect(selectRepos(raw, "DHARANI2D", 2).map((r) => r.name)).toEqual(["new", "mid"]);
  });

  it("drops forks, archived repos, never-pushed repos, .github and the profile repo", () => {
    const raw = [
      repo({ name: "fork", fork: true }),
      repo({ name: "archived", archived: true }),
      repo({ name: "never", pushed_at: null }),
      repo({ name: ".github" }),
      repo({ name: "dharani2d" }),
      repo({ name: "keep" }),
    ];
    expect(selectRepos(raw).map((r) => r.name)).toEqual(["keep"]);
  });

  it("only includes stars that GitHub reported", () => {
    const [withStars] = selectRepos([repo()]);
    expect(withStars?.stars).toBe(3);
    const [without] = selectRepos([repo({ stargazers_count: undefined })]);
    expect(without).not.toHaveProperty("stars");
    expect(without?.source).toBe("github");
  });

  it("strips emoji and control characters from descriptions and bounds their length", () => {
    const [clean] = selectRepos([
      repo({ description: `Fast \u{1F680}\u0007 tool ${"x".repeat(400)}` }),
    ]);
    expect(clean?.description).not.toMatch(/\p{Extended_Pictographic}|\p{Cc}/u);
    expect((clean?.description ?? "").length).toBeLessThanOrEqual(160);
    expect(selectRepos([repo({ description: null })])[0]?.description).toBeNull();
  });

  it("rejects a payload of the wrong shape and any URL that is not https://github.com", () => {
    expect(() => selectRepos({ message: "rate limited" })).toThrow();
    expect(() => selectRepos([repo({ name: "" })])).toThrow();
    expect(() => selectRepos([repo({ html_url: "https://evil.example/r" })])).toThrow();
    expect(() => selectRepos([repo({ html_url: "http://github.com/DHARANI2D/r" })])).toThrow();
    expect(() => selectRepos([repo({ html_url: "javascript:alert(1)" })])).toThrow();
  });
});

describe("curatedRepos", () => {
  it("lists earlier work that has a GitHub repository, with nothing invented", () => {
    const repos = curatedRepos(50);
    const withUrl = getEarlierWork().filter((e) => e.url);
    expect(repos).toHaveLength(withUrl.length);
    for (const entry of repos) {
      expect(entry.url).toMatch(/^https:\/\/github\.com\/DHARANI2D\//);
      expect(entry.source).toBe("curated");
      // Not known, so not shown (docs/FACTS.md section C).
      expect(entry.language).toBeNull();
      expect(entry.pushedAt).toBeNull();
      expect(entry).not.toHaveProperty("stars");
    }
  });

  it("honours the limit", () => {
    expect(curatedRepos(1)).toHaveLength(1);
  });
});
