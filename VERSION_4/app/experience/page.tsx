import type { Metadata } from "next";
import { OPERATING_NODE_IDS, OperatingGraph } from "@/components/career/operating-graph";
import { ContactLink } from "@/components/contact/contact-link";
import { PageHeader, rise } from "@/components/career/page-header";
import { Timeline } from "@/components/career/timeline";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { getCertifications, getExperience } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Work",
  description:
    "Work experience: SOC Analyst at Hewlett Packard Enterprise in Cybersecurity Design & Engineering, earlier HPE and Facilio internships, and education.",
  path: "/experience/",
});

/** Education has its own group. Everything else is a role. */
const EDUCATION_ID = "education";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * /work (nav) at /experience. "03 / EXPERIENCE": the full timeline from content, education apart,
 * then the security operating graph. Recruiter view swaps the graph for a credentials strip;
 * engineer view keeps the graph. Server component.
 */
export default function ExperiencePage() {
  const entries = getExperience();
  const roles = entries.filter((entry) => entry.id !== EDUCATION_ID);
  const education = entries.filter((entry) => entry.id === EDUCATION_ID);
  const verifiedCount = getCertifications().filter((cert) => cert.status === "verified").length;

  return (
    <>
      <PageHeader id="work-heading" index="03" label="EXPERIENCE" title="Work">
        <p className={cn("mt-8 max-w-2xl text-lg text-muted md:text-xl", rise, "delay-100")}>
          Enterprise SOC and cyber defense work: alert triage, incident response, detection
          engineering and cloud remediation. The current role comes first.
        </p>
        <ContactLink className={cn("mt-6", rise, "delay-200")} />
      </PageHeader>

      <section id="timeline" aria-labelledby="timeline-heading" className="border-t py-16 md:py-24">
        <Container className="flex flex-col gap-24">
          <div>
            <div className="mb-12 flex items-baseline justify-between gap-6 border-b pb-4">
              <h2 id="timeline-heading" className="label-mono text-foreground">
                TIMELINE
              </h2>
              <span className="label-mono text-muted">{pad(roles.length)} ROLES</span>
            </div>
            <Timeline entries={roles} label="Roles, current first" />
          </div>

          {education.length > 0 ? (
            <div>
              <div className="mb-12 flex items-baseline justify-between gap-6 border-b pb-4">
                <h2 id="education-heading" className="label-mono text-foreground">
                  EDUCATION
                </h2>
              </div>
              <Timeline entries={education} label="Education" />
            </div>
          ) : null}
        </Container>
        {/* What the role covers: triage and investigation, detection, cloud, incident response, automation. */}
        <GraphActivator nodes={["soc", "detection", "cloud", "dfir", "automation"]} />
      </section>

      <section
        aria-labelledby="credentials-heading"
        data-recruiter-only
        className="border-t py-16 md:py-24"
      >
        <Container className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="credentials-heading" className="label-mono text-foreground">
              CREDENTIALS
            </h2>
            <p className="mt-2 text-sm text-muted">{verifiedCount} verified certifications</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/certifications/" variant="ghost" size="sm" arrow>
              ALL CERTIFICATIONS
            </ButtonLink>
            <ButtonLink href="/resume/" variant="secondary" size="sm" arrow>
              VIEW RESUME
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section
        id="operating-graph"
        aria-labelledby="graph-heading"
        data-engineer-only
        className="border-t py-16 md:py-24"
      >
        <Container>
          <Label className="block">CONCEPTUAL MAP</Label>
          <h2 id="graph-heading" className="mt-8 max-w-[18ch] text-4xl headline md:text-6xl">
            The security operating graph.
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            How the disciplines connect: cloud security above, detection, SOC and AI security in the
            middle, incident response, automation and agents below.
          </p>
          <div className="mt-16">
            <OperatingGraph />
          </div>
        </Container>
        <GraphActivator nodes={[...OPERATING_NODE_IDS]} />
      </section>
    </>
  );
}
