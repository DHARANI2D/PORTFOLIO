import { CareerPath } from "@/components/about/career-path";
import { dateRange } from "@/components/career/date-range";
import { GraphActivator } from "@/components/graph/graph-context";
import { Section } from "@/components/ui/section";
import { Tag } from "@/components/ui/tag";
import { getExperience } from "@/lib/content";
import { site } from "@/lib/site";

const OPENING =
  "I am a Security Engineer focused on building systems that improve how security teams detect, investigate, and respond to threats.";

const FOCUS = [
  "Detection Engineering",
  "Cloud Security",
  "AI Security",
  "Security Automation",
  "DFIR",
] as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-6 transition-colors hover:border-border-strong">
      <dt className="label-mono text-accent-text">{label}</dt>
      <dd className="mt-4">{children}</dd>
    </div>
  );
}

/**
 * "ABOUT" (auto-numbered): the opening line, four facts, and the path that led here. There is no
 * portrait: the name is in the hero and the page is text first. Server component.
 */
export function AboutSection() {
  const experience = getExperience();
  const current = experience.find((entry) => entry.current);
  const education = experience.find((entry) => entry.id === "education");

  return (
    <Section id="about" autoNumber label="ABOUT" title="Who I am." intro={OPENING}>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {current ? (
          <Fact label="CURRENT">
            <p className="text-xl text-foreground">{current.role}</p>
            {current.team ? <p className="text-muted">{current.team}</p> : null}
            <p className="mt-3 text-muted">{current.org}</p>
            <p className="mt-3 label-mono text-muted">Since {current.start}</p>
          </Fact>
        ) : null}

        <Fact label="FOCUS">
          <ul aria-label="Focus areas" className="flex flex-wrap gap-2">
            {FOCUS.map((item) => (
              <li key={item}>
                <Tag>{item}</Tag>
              </li>
            ))}
          </ul>
        </Fact>

        {education ? (
          <Fact label="EDUCATION">
            <p className="text-xl text-foreground">{education.role}</p>
            <p className="text-muted">{education.org}</p>
            {education.summary ? <p className="mt-3 text-muted">{education.summary}</p> : null}
            <p className="mt-3 label-mono text-muted">{dateRange(education)}</p>
          </Fact>
        ) : null}

        <Fact label="BASED IN">
          <p className="text-xl text-foreground">{site.location}</p>
          <p className="text-muted">Open to global roles.</p>
        </Fact>
      </dl>

      <div className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h3 className="text-3xl font-semibold headline md:text-4xl">How the work got here.</h3>
            <p className="mt-3 max-w-xl text-base text-muted md:text-lg">
              Seven steps from software engineering to autonomous security systems.
            </p>
          </div>
          <p className="text-sm text-muted">
            <span className="text-foreground">Outside security:</span> Tennis · systems ·
            self-hosting · experimentation
          </p>
        </div>
        <div className="mt-8">
          <CareerPath />
        </div>
      </div>

      {/* The profile names the role (SOC) and the five focus areas; the path ends in AI and agents. */}
      <GraphActivator nodes={["soc", "detection", "cloud", "ai", "automation", "dfir", "agents"]} />
    </Section>
  );
}
