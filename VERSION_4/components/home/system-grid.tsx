import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GraphActivator } from "@/components/graph/graph-context";
import { EarlierWork } from "@/components/home/earlier-work";
import { EngineeringActivity } from "@/components/home/engineering-activity";
import { Reveal } from "@/components/hero/reveal";
import { MiniDiagram } from "@/components/systems/mini-diagram";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Tag } from "@/components/ui/tag";
import type { GraphNodeId, Project } from "@/content/schema";
import { getProjectsByTier } from "@/lib/content";
import { cn } from "@/lib/utils";

const SYSTEM_NODES: GraphNodeId[] = ["detection", "agents", "ai", "dfir"];

/**
 * Shared card chrome. The whole card is one link (stretched from the heading), moves up 3px on
 * hover and takes the stronger border. `data-flow-host` lets the diagram light up on hover or
 * keyboard focus. Under reduced motion the card does not move.
 */
const cardBase = cn(
  "group/card relative rounded-lg border bg-surface",
  "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
  "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
  "has-[a:focus-visible]:border-border-strong",
);

// Stretches the heading link over the whole card (the card is position: relative).
const stretchedLink = "after:absolute after:inset-0 after:rounded-lg after:content-['']";

/**
 * A system gets the "case study" wording only when it has an architecture diagram to show. The
 * others have a short overview page, and calling that a case study would promise more than is
 * there. The same rule drives the cue, the accessible name and the intro below.
 */
function pageKind(project: Project): "case study" | "overview" {
  return project.architecture ? "case study" : "overview";
}

function PageCue({ project, className }: { project: Project; className?: string }) {
  // The link itself carries the accessible name, so this cue is decorative.
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none",
        className,
      )}
    >
      {pageKind(project).toUpperCase()}
      <ArrowRight className="size-3.5 transition-transform duration-200 motion-safe:group-hover/card:translate-x-0.5" />
    </span>
  );
}

function DomainTags({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tier 1 and 2: a system component, not an image card. Four parts, always in this order: header
 * strip, title block, flow diagram, footer. Cards in a row stretch to the same height, with the
 * diagram taking up the slack so the footers line up.
 */
function SystemCard({ project, size }: { project: Project; size: "lg" | "md" }) {
  const lg = size === "lg";
  return (
    <article
      data-flow-host
      className={cn(
        cardBase,
        "flex h-full flex-col",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-6 py-3">
        <Label>{lg ? `FLAGSHIP / ${project.category}` : project.category}</Label>
        {project.status ? (
          <span className="flex items-center gap-2 label-mono text-muted">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
            {project.status}
          </span>
        ) : null}
      </div>

      <div className={cn(lg ? "px-6 pt-6 md:px-8 md:pt-8" : "px-6 pt-6")}>
        <h3
          className={cn(
            "font-mono font-medium tracking-tight text-foreground",
            lg ? "text-2xl md:text-3xl" : "text-xl",
          )}
        >
          <Link href={`/systems/${project.slug}/`} className={stretchedLink}>
            {project.name}
            <span className="sr-only"> {pageKind(project)}</span>
          </Link>
        </h3>
        <p className={cn("mt-3 text-muted", lg ? "text-lg" : "text-base")}>{project.tagline}</p>
        {lg ? <p className="mt-4 max-w-xl text-sm text-muted">{project.summary}</p> : null}
      </div>

      {/* Flagship: the diagram sits at the bottom of the stretched card. Medium: it stays directly
          under its tagline, and any extra height rests above the footer rule. */}
      <div className={cn("flex flex-1 flex-col justify-end px-6 py-6", lg && "md:px-8 md:py-8")}>
        <MiniDiagram flow={project.flow} slug={project.slug} label={`${project.name} flow`} />
      </div>

      <div
        className={cn(
          "border-t px-6 py-4",
          // Medium: always two lines (tags, then the cue), so every footer has the same shape.
          lg
            ? "flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
            : "flex flex-col items-start gap-4",
        )}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <DomainTags
            items={lg ? project.domain : project.domain.slice(0, 3)}
            label={`${project.name} domains`}
          />
          {project.stack.length > 0 ? (
            <p className="label-mono text-muted">
              <span className="text-foreground">STACK</span> {project.stack.join(" · ")}
            </p>
          ) : null}
        </div>
        <PageCue project={project} />
      </div>
    </article>
  );
}

/** Tier 3: one compact row. No diagram; weight follows tier. */
function SystemRow({ project }: { project: Project }) {
  return (
    <article
      data-flow-host
      className={cn(
        cardBase,
        "grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-8",
      )}
    >
      <div>
        <h3 className="font-mono text-base font-medium tracking-tight text-foreground">
          <Link href={`/systems/${project.slug}/`} className={stretchedLink}>
            {project.name}
            <span className="sr-only"> {pageKind(project)}</span>
          </Link>
        </h3>
        <p className="mt-2 text-sm text-muted">{project.tagline}</p>
      </div>
      <DomainTags items={project.domain} label={`${project.name} domains`} />
      <PageCue project={project} />
    </article>
  );
}

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
  {
    id: "ai-security",
    title: "AI security",
    blurb: "Controls around models and agents: what enters, what runs and what may act.",
    slugs: ["securemodelgate", "witness"],
  },
  {
    id: "causal-ml",
    title: "Causal ML & AIOps",
    blurb: "Finding the signals that lead an incident, not the ones that follow it.",
    slugs: ["silentstorm"],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** The slug of the last half-width card when there is an odd number of them, else null. */
function widestMedium(projects: readonly Project[]): string | null {
  const medium = projects.filter((project) => project.tier === 2);
  return medium.length % 2 === 1 ? (medium.at(-1)?.slug ?? null) : null;
}

/** Groups every project under its theme, in theme order. Nothing in the content can go missing. */
function groupProjects(projects: readonly Project[]) {
  const bySlug = new Map(projects.map((project) => [project.slug, project]));
  const themed = new Set(THEMES.flatMap((theme) => theme.slugs));
  const groups = THEMES.map((theme) => ({
    ...theme,
    // Wide cards first, then half-width cards, then compact rows, so no row is left half empty.
    projects: theme.slugs
      .flatMap((slug) => bySlug.get(slug) ?? [])
      .sort((a, b) => a.tier - b.tier),
  }));
  const rest = projects.filter((project) => !themed.has(project.slug));
  if (rest.length > 0) {
    groups.push({ id: "more", title: "More systems", blurb: "", slugs: [], projects: rest });
  }
  return groups.filter((group) => group.projects.length > 0);
}

/**
 * SYSTEMS (numbered by CSS counter). Grouped by theme, each group a row with a sticky title rail on
 * the left and its systems on the right. A flagship system is a wide card, a major one a half-width
 * card, a supporting one a compact row. Under the groups: the earlier-work archive (which also
 * holds the one link to the GitHub profile) and the engineering activity counts.
 */
export function SystemGrid() {
  const groups = groupProjects([
    ...getProjectsByTier(1),
    ...getProjectsByTier(2),
    ...getProjectsByTier(3),
  ]);

  return (
    <Section
      id="systems"
      autoNumber
      label="SYSTEMS"
      title="Systems, not demos."
      intro="Detection, correlation and agent security. Each system has its own page; the ones with an architecture diagram are written up as case studies, and the others have a short overview."
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
                  className={cn(
                    // Flagships and rows are full width. An odd half-width card at the end of its
                    // run takes the full width too, so the row has no gap.
                    (project.tier !== 2 || project.slug === widestMedium(group.projects)) &&
                      "sm:col-span-2",
                  )}
                >
                  <Reveal className="h-full" delay={index === 0 ? 0 : 1}>
                    {project.tier === 3 ? (
                      <SystemRow project={project} />
                    ) : (
                      <SystemCard project={project} size={project.tier === 1 ? "lg" : "md"} />
                    )}
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
