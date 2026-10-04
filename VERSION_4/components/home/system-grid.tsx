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

function CaseStudyCue({ className }: { className?: string }) {
  // The link itself carries the accessible name, so this cue is decorative.
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none",
        className,
      )}
    >
      CASE STUDY
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

/** Tier 1 and 2: a system component, not an image card. Header strip, body, diagram, footer strip. */
function SystemCard({ project, size }: { project: Project; size: "lg" | "md" }) {
  const lg = size === "lg";
  return (
    <article data-flow-host className={cn(cardBase, "flex h-full flex-col")}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-6 py-3">
        <Label>{lg ? `FLAGSHIP / ${project.category}` : project.category}</Label>
        {project.status ? (
          <span className="flex items-center gap-2 label-mono text-muted">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
            {project.status}
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col", lg ? "gap-8 p-6 md:p-8" : "gap-6 p-6")}>
        <div>
          <h3
            className={cn(
              "font-mono font-medium tracking-tight text-foreground",
              lg ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            <Link href={`/systems/${project.slug}/`} className={stretchedLink}>
              {project.name}
              <span className="sr-only"> case study</span>
            </Link>
          </h3>
          <p className={cn("mt-3 text-muted", lg ? "text-lg" : "text-base")}>{project.tagline}</p>
          {lg ? <p className="mt-4 max-w-xl text-sm text-muted">{project.summary}</p> : null}
        </div>
        <MiniDiagram
          flow={project.flow}
          slug={project.slug}
          label={`${project.name} flow`}
          className="mt-auto"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t px-6 py-4">
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
        <CaseStudyCue />
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
            <span className="sr-only"> case study</span>
          </Link>
        </h3>
        <p className="mt-2 text-sm text-muted">{project.tagline}</p>
      </div>
      <DomainTags items={project.domain} label={`${project.name} domains`} />
      <CaseStudyCue />
    </article>
  );
}

/**
 * 02 / SYSTEMS. Visual weight follows tier: two large flagship cards, three medium cards, one
 * compact row. Under the cards: the earlier-work archive and the engineering activity panel,
 * both engineer view only (the recruiter view keeps every system card).
 */
export function SystemGrid() {
  const flagship = getProjectsByTier(1);
  const major = getProjectsByTier(2);
  const supporting = getProjectsByTier(3);

  return (
    <Section
      id="systems"
      index="02"
      label="SYSTEMS"
      title="Systems, not demos."
      intro="Detection, correlation and agent security. Each system links to a case study."
    >
      <div className="flex flex-col gap-6">
        {flagship.length > 0 ? (
          <ul aria-label="Flagship systems" className="grid gap-6 lg:grid-cols-2">
            {flagship.map((project, index) => (
              <li key={project.slug}>
                <Reveal className="h-full" delay={index === 0 ? 0 : 1}>
                  <SystemCard project={project} size="lg" />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}

        {major.length > 0 ? (
          <ul aria-label="Major systems" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {major.map((project, index) => (
              <li key={project.slug} className="md:last:odd:col-span-2 lg:last:odd:col-span-1">
                <Reveal className="h-full" delay={index === 0 ? 0 : index === 1 ? 1 : 2}>
                  <SystemCard project={project} size="md" />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}

        {supporting.length > 0 ? (
          <ul aria-label="Supporting systems" className="flex flex-col gap-6">
            {supporting.map((project) => (
              <li key={project.slug}>
                <Reveal>
                  <SystemRow project={project} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <EarlierWork className="mt-24" />
      <div data-engineer-only className="mt-24">
        <EngineeringActivity />
      </div>

      <GraphActivator nodes={SYSTEM_NODES} />
    </Section>
  );
}
