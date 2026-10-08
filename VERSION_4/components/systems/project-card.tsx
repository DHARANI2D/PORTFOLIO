import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MiniDiagram } from "@/components/systems/mini-diagram";
import { pageKind } from "@/components/systems/project-meta";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

type ProjectCardProps = {
  project: Project;
  /**
   * lg: flagship (tagline, summary, diagram, all domains). md: major (tagline, diagram).
   * row: one compact line with no diagram, for supporting systems.
   */
  size: "lg" | "md" | "row";
  className?: string;
};

/**
 * Shared chrome. The whole card is one link (stretched from the heading), moves up 3px on hover and
 * takes the stronger border. `data-flow-host` lets the mini diagram light up on hover or keyboard
 * focus. Keyboard focus shows as a ring on the whole card, not on the heading text alone. Under
 * reduced motion the card does not move.
 */
const cardBase = cn(
  "group/card relative rounded-lg border bg-surface",
  "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
  "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
  "has-[a:focus-visible]:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-accent",
);

// Stretches the heading link over the whole card (the card is position: relative).
const stretchedLink =
  "after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none";

/** Which case-study blocks this system has, taken from the content. Empty for thin pages. */
function depthOf(project: Project): string[] {
  const parts: string[] = [];
  if (project.architecture) parts.push("Architecture");
  if (project.threatModel) parts.push("Threat model");
  if (project.decisions.length > 0) parts.push("Decisions");
  return parts;
}

function Cue({ project }: { project: Project }) {
  // The link carries the accessible name, so the cue is decorative. Only a system with an
  // architecture diagram has a case study. The others have a short overview, and say so.
  return (
    <span
      aria-hidden
      className="inline-flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none"
    >
      {pageKind(project).toUpperCase()}
      <ArrowRight className="size-3.5 transition-transform duration-200 motion-safe:group-hover/card:translate-x-0.5 motion-reduce:transition-none" />
    </span>
  );
}

function Domains({ project, limit }: { project: Project; limit?: number }) {
  const items = limit ? project.domain.slice(0, limit) : project.domain;
  return (
    <ul aria-label={`${project.name} domains`} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

function CardLink({ project }: { project: Project }) {
  return (
    <Link href={`/systems/${project.slug}/`} className={stretchedLink}>
      {project.name}
      <span className="sr-only"> {pageKind(project)}</span>
    </Link>
  );
}

/**
 * A system as a component, not a picture: header strip (category, status), body (name, tagline,
 * flow), footer strip (domains, stack, depth of the page). Visual weight follows the tier.
 * Server component.
 */
export function ProjectCard({ project, size, className }: ProjectCardProps) {
  if (size === "row") {
    return (
      <article
        data-flow-host
        className={cn(
          cardBase,
          "grid gap-4 px-6 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-8",
          className,
        )}
      >
        <div>
          <h3 className="font-mono text-base font-medium tracking-tight text-foreground">
            <CardLink project={project} />
          </h3>
          <p className="mt-2 text-sm text-muted">{project.tagline}</p>
        </div>
        <Domains project={project} />
        <Cue project={project} />
      </article>
    );
  }

  const large = size === "lg";
  const depth = depthOf(project);

  return (
    <article data-flow-host className={cn(cardBase, "flex h-full flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-6 py-3">
        <Label>{large ? `FLAGSHIP / ${project.category}` : project.category}</Label>
        {project.status ? (
          <span className="flex items-center gap-2 label-mono text-muted">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
            {project.status}
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col", large ? "gap-8 p-6 md:p-8" : "gap-6 p-6")}>
        <div>
          <h3
            className={cn(
              "font-mono font-medium tracking-tight text-foreground",
              large ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            <CardLink project={project} />
          </h3>
          <p className={cn("mt-3 text-muted", large ? "text-lg" : "text-base")}>
            {project.tagline}
          </p>
          {large ? <p className="mt-4 max-w-xl text-sm text-muted">{project.summary}</p> : null}
        </div>
        <MiniDiagram
          flow={project.flow}
          slug={project.slug}
          label={`${project.name} flow`}
          className=""
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t px-6 py-4">
        <div className="flex min-w-0 flex-col gap-3">
          <Domains project={project} limit={large ? undefined : 3} />
          {project.stack.length > 0 ? (
            <p className="label-mono text-muted">
              <span className="text-foreground">STACK</span> {project.stack.join(" · ")}
            </p>
          ) : null}
          {depth.length > 0 ? (
            <p className="label-mono text-muted">
              <span className="text-foreground">INCLUDES</span> {depth.join(" · ")}
            </p>
          ) : null}
        </div>
        <Cue project={project} />
      </div>
    </article>
  );
}
