import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";

type CaseSectionProps = {
  id: string;
  /** Page-local number, "01". The page numbers only the sections that exist. */
  index: string;
  /** Mono label next to the number. */
  label: string;
  title: string;
  /** Deep technical blocks are hidden in the recruiter view. */
  engineerOnly?: boolean;
  children: React.ReactNode;
};

/**
 * One numbered block of a case study: "02 / ARCHITECTURE" + h2 + body. Lighter than the home-page
 * <Section>: a case study has several of these in a row, so the type and spacing are smaller.
 */
export function CaseSection({
  id,
  index,
  label,
  title,
  engineerOnly = false,
  children,
}: CaseSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-engineer-only={engineerOnly ? "" : undefined}
      className="border-t py-16 md:py-24"
    >
      <Container>
        <Label className="block">
          <span className="text-accent">{index}</span> / {label}
        </Label>
        <h2 id={headingId} className="mt-6 text-3xl headline md:text-5xl">
          {title}
        </h2>
        <div className="mt-12 md:mt-16">{children}</div>
      </Container>
    </section>
  );
}

/** True when the project has any overview or problem text to show. */
export function hasOverview(project: Project): boolean {
  return project.overview.length > 0 || project.problem.length > 0;
}

/**
 * Layer 3, part one: the problem, then the overview paragraphs. Each part is rendered only when it
 * exists. A project with no problem statement gives the overview the full row. Server component.
 */
export function ProjectOverview({ project }: { project: Project }) {
  const { problem, overview } = project;
  if (!hasOverview(project)) return null;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-6">
      {problem.length > 0 ? (
        <div className="lg:col-span-5">
          <Label className="text-foreground">THE PROBLEM</Label>
          <div className="mt-6 flex flex-col gap-4 text-xl leading-snug font-medium tracking-tight text-foreground md:text-2xl">
            {problem.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      ) : null}

      {overview.length > 0 ? (
        <div className={problem.length > 0 ? "lg:col-span-7" : "lg:col-span-8"}>
          <div className="flex max-w-prose flex-col gap-6 text-base text-muted md:text-lg">
            {overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
