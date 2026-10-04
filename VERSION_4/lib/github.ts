import "server-only";
import { z } from "zod";
import { getEarlierWork } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Build-log data for the engineering-activity panel.
 *
 * This runs at BUILD time (the site is a static export), so the list refreshes on each deploy and
 * is never fetched in the browser. The CSP forbids client-side requests to api.github.com, and a
 * build-time fetch keeps visitors from talking to GitHub at all. On ANY failure (offline build,
 * rate limit, timeout, unexpected shape) it falls back to a curated list derived from content, so
 * the build can never fail because GitHub was unreachable.
 */

export type Repo = {
  /** GitHub repository name, or the project name for curated entries. */
  name: string;
  /** Always an https://github.com/ URL. */
  url: string;
  description: string | null;
  /** Primary language as reported by GitHub. Null for curated entries (not known). */
  language: string | null;
  /** ISO 8601 timestamp of the last push. Null for curated entries (not known). */
  pushedAt: string | null;
  /** Present only when it was actually fetched from GitHub. Never defaulted or invented. */
  stars?: number;
  source: "github" | "curated";
};

const FETCH_TIMEOUT_MS = 5_000;
const MAX_REPOS = 6;
const MAX_DESCRIPTION_CHARS = 160;

function isGithubHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

// Only the fields we use. Extra fields are stripped. A missing essential field fails validation
// and triggers the curated fallback rather than rendering a half-broken row.
const ApiRepo = z.object({
  name: z.string().min(1),
  html_url: z.url().refine(isGithubHttpsUrl, "not an https://github.com URL"),
  description: z.string().nullish(),
  language: z.string().nullish(),
  pushed_at: z.string().nullish(),
  stargazers_count: z.number().int().nonnegative().optional(),
  fork: z.boolean(),
  archived: z.boolean(),
});
const ApiRepoList = z.array(ApiRepo);

/** Collapses whitespace and strips emoji and control characters (the site uses none). */
function cleanText(value: string | null | undefined, max?: number): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/[\p{Extended_Pictographic}\p{Cc}\u200D\uFE0F]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  if (max !== undefined && cleaned.length > max) return `${cleaned.slice(0, max - 1).trimEnd()}…`;
  return cleaned;
}

function pushedTime(repo: Repo): number {
  return repo.pushedAt ? Date.parse(repo.pushedAt) : Number.NEGATIVE_INFINITY;
}

/**
 * Validates a GitHub `/users/:user/repos` payload and picks the newest repos.
 * Excludes forks, archived repos, repos never pushed to, and the profile README repo
 * (named like the user). Throws if the payload does not match the expected shape.
 */
export function selectRepos(
  raw: unknown,
  user: string = site.githubUser,
  limit = MAX_REPOS,
): Repo[] {
  const profileRepo = user.toLowerCase();
  return ApiRepoList.parse(raw)
    .filter(
      (repo) =>
        !repo.fork &&
        !repo.archived &&
        repo.name.toLowerCase() !== profileRepo &&
        repo.name !== ".github" &&
        typeof repo.pushed_at === "string" &&
        !Number.isNaN(Date.parse(repo.pushed_at)),
    )
    .map((repo): Repo => ({
      name: repo.name,
      url: repo.html_url,
      description: cleanText(repo.description, MAX_DESCRIPTION_CHARS),
      language: cleanText(repo.language),
      pushedAt: repo.pushed_at ?? null,
      ...(repo.stargazers_count !== undefined ? { stars: repo.stargazers_count } : {}),
      source: "github",
    }))
    .sort((a, b) => pushedTime(b) - pushedTime(a))
    .slice(0, limit);
}

/** Static fallback: earlier work that has a public GitHub repository. No dates, languages or stars. */
export function curatedRepos(limit = MAX_REPOS): Repo[] {
  const repos: Repo[] = [];
  for (const entry of getEarlierWork()) {
    if (!entry.url || !isGithubHttpsUrl(entry.url)) continue;
    repos.push({
      name: entry.name,
      url: entry.url,
      description: cleanText(entry.note),
      language: null,
      pushedAt: null,
      source: "curated",
    });
  }
  return repos.slice(0, limit);
}

async function fetchRepos(): Promise<Repo[]> {
  const endpoint = `https://api.github.com/users/${encodeURIComponent(site.githubUser)}/repos?sort=pushed&per_page=100`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub API responded with ${response.status}`);
  return selectRepos(await response.json());
}

async function loadRepos(): Promise<Repo[]> {
  try {
    const live = await fetchRepos();
    if (live.length > 0) return live;
  } catch (error) {
    // Expected when building offline or when rate limited. Log the reason, never fail the build.
    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`[github] build log falls back to curated list: ${reason}`);
  }
  return curatedRepos();
}

// One fetch per build process, however many pages render the panel.
let cached: Promise<Repo[]> | undefined;

/** Top repos for the build log: live from GitHub at build time, else the curated fallback. */
export function getRepos(): Promise<Repo[]> {
  cached ??= loadRepos();
  return cached;
}
