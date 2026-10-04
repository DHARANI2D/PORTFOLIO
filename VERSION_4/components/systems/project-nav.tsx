import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";
import { cn } from "@/lib/utils";

type Neighbour = Pick<Project, "slug" | "name" | "tagline">;

type ProjectNavProps = {
  previous?: Neighbour;
  next?: Neighbour;
};

function NeighbourLink({
  project,
  direction,
}: {
  project: Neighbour;
  direction: "previous" | "next";
}) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={`/systems/${project.slug}/`}
      className={cn(
        "group/card flex h-full flex-col gap-3 rounded-lg border bg-surface p-6",
        "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
        "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
        isNext && "md:items-end md:text-right",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none",
          isNext && "md:flex-row-reverse",
        )}
      >
        <Arrow
          aria-hidden
          className={cn(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            isNext
              ? "motion-safe:group-hover/card:translate-x-0.5"
              : "motion-safe:group-hover/card:-translate-x-0.5",
          )}
        />
        {isNext ? "NEXT SYSTEM" : "PREVIOUS SYSTEM"}
      </span>
      <span className="font-mono text-xl font-medium tracking-tight text-foreground">
        {project.name}
      </span>
      <span className="max-w-[40ch] text-sm text-muted">{project.tagline}</span>
    </Link>
  );
}

/**
 * End of a case study: the previous and next system in the index order, and a way back to the
 * index. Either neighbour may be missing (first and last system). Server component.
 */
export function ProjectNav({ previous, next }: ProjectNavProps) {
  return (
    <nav aria-labelledby="more-systems-heading" className="border-t">
      <Container className="py-16 md:py-24">
        <div className="flex items-center justify-between gap-6 border-b pb-6">
          <Label>
            <span id="more-systems-heading">MORE SYSTEMS</span>
          </Label>
          <ButtonLink href="/systems/" variant="secondary" size="sm">
            All systems
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {previous ? (
            <NeighbourLink project={previous} direction="previous" />
          ) : (
            <span aria-hidden className="hidden md:block" />
          )}
          {next ? (
            <NeighbourLink project={next} direction="next" />
          ) : (
            <span aria-hidden className="hidden md:block" />
          )}
        </div>
      </Container>
    </nav>
  );
}
