import { MiniDiagram } from "@/components/systems/mini-diagram";
import { briefCopy } from "@/components/systems/project-meta";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";

/**
 * The body of a brief system page (no architecture, threat model or decisions): one overview block
 * and the flow, once each. The summary leads, then the overview text, and a line that only repeats
 * the tagline or another line is left out (see briefCopy), so a fact is said once. The flow is a
 * small strip beside the text, not a section of its own. Server component.
 */
export function ProjectBrief({ project }: { project: Project }) {
  const { lead, problem, paragraphs } = briefCopy(project);
  const hasText = Boolean(lead) || problem.length > 0 || paragraphs.length > 0;

  return (
    <section id="overview" aria-labelledby="overview-heading" className="border-t py-12 md:py-16">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-x-6">
        {hasText ? (
          <div className="lg:col-span-7">
            <Label className="block">OVERVIEW</Label>
            <h2 id="overview-heading" className="mt-6 text-2xl headline md:text-3xl">
              What it is
            </h2>
            <div className="mt-8 flex max-w-prose flex-col gap-6">
              {lead ? (
                <p className="text-xl leading-snug font-medium tracking-tight text-foreground md:text-2xl">
                  {lead}
                </p>
              ) : null}
              {problem.map((line) => (
                <p key={line} className="text-base text-foreground md:text-lg">
                  {line}
                </p>
              ))}
              {paragraphs.map((line) => (
                <p key={line} className="text-base text-muted md:text-lg">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <h2 id="overview-heading" className="sr-only">
            Overview
          </h2>
        )}

        {/* The flow, as a small strip. Same view-transition name as the card it came from. */}
        <div className={hasText ? "lg:col-span-5" : "lg:col-span-12"}>
          <div
            data-flow-host
            className="max-w-xl overflow-hidden rounded-lg border bg-surface lg:max-w-none"
          >
            <div className="border-b px-4 py-3 md:px-6">
              <Label>FLOW / SCHEMATIC</Label>
            </div>
            <div className="p-6">
              <MiniDiagram flow={project.flow} slug={project.slug} label={`${project.name} flow`} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
