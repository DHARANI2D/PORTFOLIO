import { ArrowUpRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CountUp } from "@/components/skills/count-up";
import { getMetrics, getSkills } from "@/lib/content";
import { getRepos, type Repo } from "@/lib/github";

/**
 * Names the panel highlights. Each one is checked against the skills content, so a name that is
 * removed from content drops out here instead of staying on the page.
 */
const PRIMARY_STACK = ["Python", "TypeScript", "AWS"] as const;

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** "04 OCT 2026". Explicit UTC parts, no Intl, so the output is identical on every build machine. */
function formatDay(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const date = new Date(time);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}

function primaryStack(): string[] {
  const known = new Set(
    getSkills().flatMap((group) => [...group.items, ...group.depth].map((s) => s.toLowerCase())),
  );
  return PRIMARY_STACK.filter((name) => known.has(name.toLowerCase()));
}

function RepoRow({ repo }: { repo: Repo }) {
  const pushed = repo.pushedAt ? formatDay(repo.pushedAt) : null;
  const stars = repo.stars !== undefined && repo.stars > 0 ? repo.stars : null;

  return (
    <li className="border-b last:border-b-0">
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid gap-x-6 gap-y-2 px-6 py-4 transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none md:grid-cols-12 md:items-baseline"
      >
        <span className="flex items-start justify-between gap-4 md:col-span-4">
          <span className="min-w-0 font-mono text-sm [overflow-wrap:anywhere] text-foreground">
            {repo.name}
          </span>
          <ArrowUpRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-reduce:transition-none md:hidden"
          />
        </span>

        {repo.description ? (
          <span className="line-clamp-2 text-sm text-muted md:col-span-4">{repo.description}</span>
        ) : (
          <span className="hidden md:col-span-4 md:block" aria-hidden />
        )}

        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-4 md:justify-end">
          {repo.language ? <Label className="text-foreground">{repo.language}</Label> : null}
          {stars !== null ? <Label>{`${stars} ${stars === 1 ? "STAR" : "STARS"}`}</Label> : null}
          {pushed && repo.pushedAt ? (
            <Label>
              <time dateTime={repo.pushedAt}>{pushed}</time>
            </Label>
          ) : null}
          <ArrowUpRight
            aria-hidden
            className="hidden size-4 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-reduce:transition-none md:block"
          />
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </li>
  );
}

/**
 * "ENGINEERING ACTIVITY": content-derived counts plus an open-source build log.
 * A block, not a <Section>: it sits inside "02 / SYSTEMS" under the system cards. It has no outer
 * margin; the parent owns spacing (pass `className` if needed).
 * The counts come from content (getMetrics) and describe what is documented on this site.
 * The build log is fetched from GitHub at build time (see lib/github.ts), so it refreshes on each deploy.
 */
export async function EngineeringActivity({ className }: { className?: string }) {
  const metrics = getMetrics();
  const repos = await getRepos();
  const live = repos.some((repo) => repo.source === "github");
  const stack = primaryStack();

  const rows = [
    { label: "SYSTEMS", value: metrics.systems },
    { label: "FLAGSHIP", value: metrics.flagship },
    { label: "RESEARCH", value: metrics.research },
    { label: "CERTIFICATIONS VERIFIED", value: metrics.certificationsVerified },
    { label: "EARLIER PROJECTS", value: metrics.earlierProjects },
  ];

  return (
    <div className={className}>
      <div className="rounded-lg border bg-surface">
        <div className="border-b px-6 py-4">
          <h3 className="label-mono text-foreground">ENGINEERING ACTIVITY</h3>
        </div>

        <dl className="grid divide-y lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 px-6 py-4 lg:flex-col-reverse lg:items-start lg:justify-end lg:gap-3 lg:py-8"
            >
              <dt>
                <Label>{row.label}</Label>
              </dt>
              <dd className="m-0 text-3xl headline tabular-nums lg:text-5xl">
                <CountUp value={row.value} />
              </dd>
            </div>
          ))}
        </dl>

        <p className="border-t px-6 py-3 text-xs text-muted">
          Counts of the systems, research and credentials documented on this site. Not usage or
          performance figures.
        </p>

        {stack.length > 0 ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t px-6 py-4">
            <Label>PRIMARY STACK</Label>
            <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-sm text-foreground">
              {stack.map((name, index) => (
                <li key={name} className="flex items-baseline gap-3">
                  {index > 0 ? (
                    <span aria-hidden className="text-muted">
                      ·
                    </span>
                  ) : null}
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {repos.length > 0 ? (
          <div data-engineer-only className="border-t">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b px-6 py-4">
              <h3 className="label-mono text-foreground">OPEN SOURCE / BUILD LOG</h3>
              <Label>{live ? "SOURCE · GITHUB API · AT BUILD" : "SOURCE · CURATED"}</Label>
            </div>
            <ul>
              {repos.map((repo) => (
                <RepoRow key={repo.url} repo={repo} />
              ))}
            </ul>
            <p className="border-t px-6 py-3 text-xs text-muted">
              {live
                ? "Public repositories, most recently pushed first. Fetched from the GitHub API at build time, so it refreshes on each deploy."
                : "Selected earlier work with public repositories."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
