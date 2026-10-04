import type { Metadata } from "next";
import { GraphActivator } from "@/components/graph/graph-context";
import { ProjectCard } from "@/components/systems/project-card";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { GraphNodeId } from "@/content/schema";
import { getEarlierWork, getProjectsByTier, getProjects } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const systemNames = getProjects().map((project) => project.name);

export const metadata: Metadata = buildMetadata({
  title: "Systems",
  description: `Detection, correlation and AI security systems: ${systemNames.slice(0, -1).join(", ")} and ${systemNames.at(-1)}.`,
  path: "/systems/",
});

const pad = (n: number) => String(n).padStart(2, "0");

// Entrance as an enhancement (CSS @starting-style): no JS, once, off under reduced motion.
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

const isHttps = (url: string | undefined): url is string => !!url && /^https:\/\//i.test(url);

function TierHeading({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b pb-4">
      <h2 id={id} className="label-mono text-foreground">
        {label}
      </h2>
      <span className="label-mono text-muted">
        {pad(count)} {count === 1 ? "SYSTEM" : "SYSTEMS"}
      </span>
    </div>
  );
}

/**
 * Earlier work, as a pointer: names only, linked where the content has a link. The descriptions
 * live with the home page archive. Engineer view only, like the archive itself.
 */
function EarlierWork() {
  const work = getEarlierWork();
  if (work.length === 0) return null;

  return (
    <section
      aria-labelledby="earlier-work-heading"
      data-engineer-only
      className="border-t py-16 md:py-24"
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-4">
            <h2 id="earlier-work-heading" className="label-mono text-foreground">
              EARLIER WORK
            </h2>
            <p className="mt-6 max-w-[34ch] text-muted">
              Academic and supporting projects, listed by name.
            </p>
          </div>
          <ul aria-label="Earlier work" className="flex flex-wrap gap-3 lg:col-span-8">
            {work.map((entry) => (
              <li key={entry.name}>
                {isHttps(entry.url) ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/work inline-flex min-h-11 items-center rounded-sm"
                  >
                    <Tag className="transition-colors duration-200 group-hover/work:border-border-strong group-hover/work:text-foreground motion-reduce:transition-none">
                      {entry.name}
                    </Tag>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Tag>{entry.name}</Tag>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/**
 * /systems. "02 / SYSTEMS", the headline, then the systems in three tiers. Visual weight follows
 * the tier: flagship cards are large with a summary, major cards are medium, supporting systems
 * are a single row. Server component.
 */
export default function SystemsPage() {
  const flagship = getProjectsByTier(1);
  const major = getProjectsByTier(2);
  const supporting = getProjectsByTier(3);

  // Every graph node any system touches, once.
  const graphNodes: GraphNodeId[] = [...new Set(getProjects().flatMap((p) => p.graphNodes))];

  return (
    <>
      <section aria-labelledby="systems-heading">
        <Container className="pt-12 pb-16 md:pt-24 md:pb-24">
          <Label className="block">
            <span className="text-accent">02</span> / SYSTEMS
          </Label>
          <h1
            id="systems-heading"
            className="mt-8 max-w-[14ch] text-4xl display xs:text-5xl md:text-7xl xl:text-8xl"
          >
            Systems, not demos.
          </h1>
          <p className={cn("mt-8 max-w-2xl text-lg text-muted md:text-xl", rise, "delay-100")}>
            Detection, correlation and AI security systems. Each one has a case study. The longer
            ones cover the architecture, the threat model and the engineering decisions.
          </p>
        </Container>
      </section>

      <section aria-label="Systems" className="border-t py-16 md:py-24">
        <Container className="flex flex-col gap-24">
          {flagship.length > 0 ? (
            <div>
              <TierHeading id="tier-flagship" label="Flagship" count={flagship.length} />
              <ul aria-labelledby="tier-flagship" className="mt-8 grid gap-6 lg:grid-cols-2">
                {flagship.map((project, index) => (
                  <li
                    key={project.slug}
                    className={cn(rise, index === 0 ? "delay-100" : "delay-200")}
                  >
                    <ProjectCard project={project} size="lg" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {major.length > 0 ? (
            <div>
              <TierHeading id="tier-major" label="Major" count={major.length} />
              <ul
                aria-labelledby="tier-major"
                className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {major.map((project) => (
                  <li key={project.slug} className="md:last:odd:col-span-2 lg:last:odd:col-span-1">
                    <ProjectCard project={project} size="md" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {supporting.length > 0 ? (
            <div>
              <TierHeading id="tier-supporting" label="Supporting" count={supporting.length} />
              <ul aria-labelledby="tier-supporting" className="mt-8 flex flex-col gap-6">
                {supporting.map((project) => (
                  <li key={project.slug}>
                    <ProjectCard project={project} size="row" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </section>

      <EarlierWork />

      <GraphActivator nodes={graphNodes} />
    </>
  );
}
