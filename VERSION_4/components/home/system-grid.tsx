import { GraphActivator } from "@/components/graph/graph-context";
import { EarlierWork } from "@/components/home/earlier-work";
import { EngineeringActivity } from "@/components/home/engineering-activity";
import { Reveal } from "@/components/hero/reveal";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Tag } from "@/components/ui/tag";
import type { GraphNodeId, Project } from "@/content/schema";
import { getProjects } from "@/lib/content";

const SYSTEM_NODES: GraphNodeId[] = ["detection", "agents", "ai", "dfir"];

type Theme = {
  id: string;
  title: string;
  blurb: string;
  /** Slugs in display order. A system that is in no theme is shown under "More systems". */
  slugs: readonly string[];
};

/** The systems, grouped by what they are for. Each group is one row: a title rail and its cards. */
const THEMES: readonly Theme[] = [
  {
    id: "systems-security",
    title: "Systems security",
    blurb: "Containment at the operating-system boundary, for processes and for AI agents.",
    slugs: ["owl"],
  },
  {
    id: "detection-soc",
    title: "Detection & SOC",
    blurb: "Telemetry turned into attack chains, and suspicious email turned into evidence.",
    slugs: ["signalfusion-core", "desas", "ml-incident-response"],
  },
  {
    id: "dfir",
    title: "DFIR & investigation",
    blurb: "Autonomous investigation that has to show the evidence behind each finding.",
    slugs: ["helios"],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Groups every project under its theme, in theme order. Nothing in the content can go missing. */
function groupProjects(projects: readonly Project[]) {
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  const themed = new Set(THEMES.flatMap((theme) => theme.slugs));
  const groups = THEMES.map((theme) => ({
    ...theme,
    projects: theme.slugs.flatMap((slug) => bySlug.get(slug) ?? []),
  }));
  const rest = projects.filter((project) => !themed.has(project.slug));
  if (rest.length > 0) {
    groups.push({ id: "more", title: "More systems", blurb: "", slugs: [], projects: rest });
  }
  return groups.filter((group) => group.projects.length > 0);
}

/**
 * A system as a card: category, name, one line and its domains. It is not a link and there is no
 * page behind it. How a system works is not published, so a card is all there is.
 */
function SystemCard({ project }: { project: Project }) {
  return (
    <article className="flex h-full flex-col rounded-xl border bg-surface p-6 transition-colors duration-200 hover:border-border-strong motion-reduce:transition-none">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Label>{project.category}</Label>
        {project.status ? (
          <span className="flex items-center gap-2 label-mono text-muted">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
            {project.status}
          </span>
        ) : null}
      </div>
      <h4 className="mt-5 font-mono text-xl font-medium tracking-tight text-foreground">
        {project.name}
      </h4>
      <p className="mt-3 text-base text-muted">{project.tagline}</p>
      <ul aria-label={`${project.name} domains`} className="mt-auto flex flex-wrap gap-2 pt-6">
        {project.domain.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * SYSTEMS (numbered by CSS counter). Grouped by theme, each group a row with a sticky title rail on
 * the left and its systems as cards on the right. Under the groups: the earlier-work archive (which
 * also holds the one link to the GitHub profile) and the engineering activity counts.
 */
export function SystemGrid() {
  const groups = groupProjects(getProjects());

  return (
    <Section
      id="systems"
      autoNumber
      label="SYSTEMS"
      title="Systems, not demos."
      intro="Detection, investigation and systems security. How each one works is not published; details are shared in conversation."
    >
      <div className="flex flex-col gap-12">
        {groups.map((group, groupIndex) => (
          <div
            key={group.id}
            aria-labelledby={`${group.id}-heading`}
            role="group"
            className="grid gap-6 border-t pt-10 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-x-8"
          >
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <Label>
                  <span className="text-accent-text">{pad(groupIndex + 1)}</span> /{" "}
                  {pad(group.projects.length)} {group.projects.length === 1 ? "SYSTEM" : "SYSTEMS"}
                </Label>
                <h3 id={`${group.id}-heading`} className="mt-3 text-2xl headline md:text-3xl">
                  {group.title}
                </h3>
                {group.blurb ? <p className="mt-3 max-w-sm text-muted">{group.blurb}</p> : null}
              </div>
            </div>

            <ul
              aria-label={`${group.title} systems`}
              className="grid gap-4 sm:grid-cols-2 lg:col-span-8"
            >
              {group.projects.map((project, index) => (
                <li
                  key={project.slug}
                  // An odd last card takes the full width, so the row has no gap.
                  className={
                    group.projects.length % 2 === 1 && index === group.projects.length - 1
                      ? "sm:col-span-2"
                      : undefined
                  }
                >
                  <Reveal className="h-full" delay={index === 0 ? 0 : 1}>
                    <SystemCard project={project} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <EarlierWork className="mt-16" />
      <div data-engineer-only className="mt-16">
        <EngineeringActivity />
      </div>

      <GraphActivator nodes={SYSTEM_NODES} />
    </Section>
  );
}
