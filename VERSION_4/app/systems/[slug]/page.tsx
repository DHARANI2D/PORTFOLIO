import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraphActivator } from "@/components/graph/graph-context";
import { JsonLd } from "@/components/seo/json-ld";
import { ArchitectureDiagram } from "@/components/systems/architecture-diagram";
import { EngineeringDecisions } from "@/components/systems/engineering-decisions";
import { MiniDiagram } from "@/components/systems/mini-diagram";
import { ProjectHero, LevelLabel } from "@/components/systems/project-hero";
import { getRepositoryUrl } from "@/components/systems/project-links";
import { ProjectNav } from "@/components/systems/project-nav";
import { CaseSection, hasOverview, ProjectOverview } from "@/components/systems/project-overview";
import { SecurityConsiderations } from "@/components/systems/security-considerations";
import { ThreatModel, threatModelBlocks } from "@/components/systems/threat-model";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { Project } from "@/content/schema";
import { getProject, getProjects } from "@/lib/content";
import { buildMetadata, softwareJsonLd } from "@/lib/seo";

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
  return buildMetadata({
    title: `${project.name} case study`,
    description: project.summary,
    path: `/systems/${project.slug}/`,
  });
}

type SectionId = "overview" | "architecture" | "flow" | "threat-model" | "decisions" | "security";
type SectionDef = { id: SectionId; label: string; title: string; engineerOnly: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The blocks this project has data for, in reading order. A block with no data is not in the list,
 * so it is neither rendered nor numbered. Thin projects (ARGUS, Voltrix, DESAS) end up with an
 * overview and a flow, and the numbering stays 01, 02.
 */
function sectionsFor(project: Project): SectionDef[] {
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
  return sections;
}

/**
 * /systems/[slug]: an engineering case study. Hero (3-second and 30-second versions), then the
 * 5-minute version as numbered blocks, each rendered only when the content has it. The threat
 * model, decisions and security notes are engineer view only; the recruiter view keeps the hero,
 * the overview and the diagram. Server component: the only client leaf is the diagram.
 */
export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const projects = getProjects();
  const position = projects.findIndex((p) => p.slug === project.slug);
  const previous = projects[position - 1];
  const next = projects[position + 1];

  const sections = sectionsFor(project).map((section, index) => ({
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
        <ProjectHero project={project} />

        {/* Level 3. Only a page with enough depth gets the label and jump links. A thin page
            (overview and flow) skips the band instead of promising five minutes of reading. */}
        {sections.length >= 3 ? (
          <div className="border-t">
            <Container className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <LevelLabel level={3}>THE 5-MINUTE VERSION</LevelLabel>
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
      </article>

      <ProjectNav previous={previous} next={next} />

      <GraphActivator nodes={project.graphNodes} />
    </>
  );
}
