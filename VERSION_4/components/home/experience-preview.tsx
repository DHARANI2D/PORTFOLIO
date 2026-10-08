import { OPERATING_NODE_IDS, OperatingGraph } from "@/components/career/operating-graph";
import { Timeline } from "@/components/career/timeline";
import { GraphActivator } from "@/components/graph/graph-context";
import { Section } from "@/components/ui/section";
import { getExperience } from "@/lib/content";

const EDUCATION_ID = "education";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "EXPERIENCE" (auto-numbered): the work timeline with the current role first, education, and the
 * security operating graph. Server component.
 */
export function ExperiencePreview() {
  const entries = getExperience();
  const roles = entries.filter((entry) => entry.id !== EDUCATION_ID);
  const education = entries.filter((entry) => entry.id === EDUCATION_ID);

  return (
    <Section
      id="experience"
      autoNumber
      label="EXPERIENCE"
      title="Where I've worked."
      intro="Enterprise SOC and cyber defense work: alert triage, incident response, detection engineering and cloud remediation. The current role comes first."
    >
      <GraphActivator nodes={["soc", "detection", "cloud", "dfir", "automation"]} />

      <div className="flex items-baseline justify-between gap-6 border-b pb-4">
        <h3 id="timeline-heading" className="subhead text-foreground md:text-xl">
          TIMELINE
        </h3>
        <span className="label-mono text-muted">{pad(roles.length)} ROLES</span>
      </div>
      <div className="mt-10">
        <Timeline entries={roles} label="Roles, current first" />
      </div>

      {education.length > 0 ? (
        <div className="mt-14">
          <div className="border-b pb-4">
            <h3 id="education-heading" className="subhead text-foreground md:text-xl">
              EDUCATION
            </h3>
          </div>
          <div className="mt-10">
            <Timeline entries={education} label="Education" />
          </div>
        </div>
      ) : null}

      <div id="operating-graph" className="mt-14">
        <h3 id="graph-heading" className="text-2xl headline md:text-3xl">
          The security operating graph.
        </h3>
        <p className="mt-4 max-w-2xl text-muted">
          How the disciplines connect: cloud security above, detection, SOC and AI security in the
          middle, incident response, automation and agents below.
        </p>
        <div className="mt-8">
          <OperatingGraph />
        </div>
        <GraphActivator nodes={[...OPERATING_NODE_IDS]} />
      </div>
    </Section>
  );
}
