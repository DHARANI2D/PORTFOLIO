import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraphActivator } from "@/components/graph/graph-context";
import { JsonLd } from "@/components/seo/json-ld";
import { ArchitectureDiagram } from "@/components/systems/architecture-diagram";
import { EngineeringDecisions } from "@/components/systems/engineering-decisions";
import { MiniDiagram } from "@/components/systems/mini-diagram";
import { ProjectBrief } from "@/components/systems/project-brief";
import { ProjectHero, LevelLabel } from "@/components/systems/project-hero";
import { getRepositoryUrl } from "@/components/systems/project-links";
import { describeProject, isBrief, pageKind, relatedFor } from "@/components/systems/project-meta";
import { ProjectNav } from "@/components/systems/project-nav";
import { CaseSection, hasOverview, ProjectOverview } from "@/components/systems/project-overview";
import { ProjectRelated } from "@/components/systems/project-related";
import { SecurityConsiderations } from "@/components/systems/security-considerations";
import { ThreatModel, threatModelBlocks } from "@/components/systems/threat-model";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";
import { getProject, getProjects, getResearch } from "@/lib/content";
import { buildMetadata, softwareJsonLd } from "@/lib/seo";
import { getWritingPosts } from "@/lib/writing";

// Static export: only the slugs in the content exist, anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getProjects().map((project) => ({ slug: project.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  // Only a system with an architecture diagram has a case study. The others have an overview.
  return buildMetadata({
    title: `${project.name} ${pageKind(project)}`,
    description: describeProject(project),
    path: `/systems/${project.slug}/`,
  });
}

type SectionId =
  "overview" | "architecture" | "flow" | "threat-model" | "decisions" | "security" | "related";
type SectionDef = { id: SectionId; label: string; title: string; engineerOnly: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The blocks this project has data for, in reading order. A block with no data is not in the list,
 * so it is neither rendered nor numbered. `related` is the last block and is there only when the
 * system has research or field notes to link to.
 */
function sectionsFor(project: Project, hasRelated: boolean): SectionDef[] {
  const sections: SectionDef[] = [];
  if (hasOverview(project)) {
    sections.push({ id: "overview", label: "OVERVIEW", title: "What it is", engineerOnly: false });
  }
  if (project.architecture) {
    sections.push({
      id: "architecture",
      label: "ARCHITECTURE",
      title: "How it fits together",
      engineerOnly: false,
    });
  } else {
    sections.push({ id: "flow", label: "FLOW", title: "Flow", engineerOnly: false });
  }
  if (project.threatModel && threatModelBlocks(project.threatModel).length > 0) {
    sections.push({
      id: "threat-model",
      label: "THREAT MODEL",
      title: "Threat model",
      engineerOnly: true,
    });
  }
  if (project.decisions.length > 0) {
    sections.push({
      id: "decisions",
      label: "DECISIONS",
      title: "Engineering decisions",
      engineerOnly: true,
    });
  }
  if (project.security.length > 0) {
    sections.push({
      id: "security",
      label: "SECURITY",
      title: "Security considerations",
      engineerOnly: true,
    });
  }
  if (hasRelated) {
    sections.push({ id: "related", label: "RELATED", title: "Keep reading", engineerOnly: true });
  }
  return sections;
}

/**
 * /systems/[slug]. Two shapes of the same page.
 *
 * Case study (a system with an architecture, a threat model or decisions): hero with the three
 * layers named (WHAT IT IS, WHY IT MATTERS), then the 5-minute version (HOW IT WORKS) as numbered
 * blocks, each rendered only when the content has it, then RELATED so the reader has somewhere to go.
 * The threat model, decisions, security notes and related links are engineer view only; the
 * recruiter view keeps the hero, the overview and the diagram.
 *
 * Brief (an overview and a flow, nothing more): a compact hero, one overview block with the flow
 * beside it, related research, and the pager. No jump links, no numbered sections, no level labels:
 * there is one fact and it is shown once.
 *
 * Server component: the only client leaf is the diagram.
 */
export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const projects = getProjects();
  const position = projects.findIndex((p) => p.slug === project.slug);
  const previous = projects[position - 1];
  const next = projects[position + 1];

  const related = relatedFor(project, getResearch(), await getWritingPosts());
  const hasRelated = related.research.length + related.notes.length > 0;
  const brief = isBrief(project);

  const sections = sectionsFor(project, hasRelated).map((section, index) => ({
    ...section,
    index: pad(index + 1),
  }));
  const section = (id: SectionId) => sections.find((s) => s.id === id);
  const overview = section("overview");
  const architecture = section("architecture");
  const flow = section("flow");
  const threat = section("threat-model");
  const decisions = section("decisions");
  const security = section("security");
  const relatedSection = section("related");

  return (
    <>
      <JsonLd
        data={softwareJsonLd({
          name: project.name,
          description: project.summary,
          path: `/systems/${project.slug}/`,
          codeRepository: getRepositoryUrl(project.links),
        })}
      />

      <article aria-labelledby="system-title">
        <ProjectHero project={project} variant={brief ? "brief" : "case-study"} />

        {brief ? (
          <>
            <ProjectBrief project={project} />
            <ProjectRelated research={related.research} notes={related.notes} />
          </>
        ) : (
          <>
            {/* Level 3. The label and jump links come with enough depth to need them. */}
            {sections.length >= 3 ? (
              <div className="border-t">
                <Container className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
                  <LevelLabel level={3} hint="5 minutes">
                    HOW IT WORKS
                  </LevelLabel>
                  <nav aria-label="Case study sections">
                    <ol className="flex flex-wrap gap-x-6">
                      {sections.map((s) => (
                        <li key={s.id} data-engineer-only={s.engineerOnly ? "" : undefined}>
                          <a
                            href={`#${s.id}`}
                            className="inline-flex min-h-11 items-center gap-2 label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
                          >
                            <span className="text-accent">{s.index}</span>
                            {s.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </Container>
              </div>
            ) : null}

            {overview ? (
              <CaseSection
                id={overview.id}
                index={overview.index}
                label={overview.label}
                title={overview.title}
              >
                <ProjectOverview project={project} />
              </CaseSection>
            ) : null}

            {architecture && project.architecture ? (
              <CaseSection
                id={architecture.id}
                index={architecture.index}
                label={architecture.label}
                title={architecture.title}
              >
                <ArchitectureDiagram
                  diagram={project.architecture}
                  slug={project.slug}
                  name={project.name}
                />
              </CaseSection>
            ) : null}

            {flow ? (
              <CaseSection id={flow.id} index={flow.index} label={flow.label} title={flow.title}>
                {/* No architecture is published for this system, so the stages named in its content
                    stand in for the diagram. Same view-transition name as the card it came from. */}
                <div data-flow-host className="overflow-hidden rounded-lg border bg-surface">
                  <div className="border-b px-4 py-3 md:px-6">
                    <Label>FLOW / SCHEMATIC</Label>
                  </div>
                  <div className="p-6 md:p-8">
                    <MiniDiagram
                      flow={project.flow}
                      slug={project.slug}
                      label={`${project.name} flow`}
                    />
                  </div>
                </div>
              </CaseSection>
            ) : null}

            {threat && project.threatModel ? (
              <CaseSection
                id={threat.id}
                index={threat.index}
                label={threat.label}
                title={threat.title}
                engineerOnly
              >
                <ThreatModel model={project.threatModel} />
              </CaseSection>
            ) : null}

            {decisions ? (
              <CaseSection
                id={decisions.id}
                index={decisions.index}
                label={decisions.label}
                title={decisions.title}
                engineerOnly
              >
                <EngineeringDecisions decisions={project.decisions} />
              </CaseSection>
            ) : null}

            {security ? (
              <CaseSection
                id={security.id}
                index={security.index}
                label={security.label}
                title={security.title}
                engineerOnly
              >
                <SecurityConsiderations items={project.security} />
              </CaseSection>
            ) : null}

            {relatedSection ? (
              <ProjectRelated
                research={related.research}
                notes={related.notes}
                index={relatedSection.index}
              />
            ) : null}
          </>
        )}
      </article>

      <ProjectNav previous={previous} next={next} />

      <GraphActivator nodes={project.graphNodes} />
    </>
  );
}
