import type { Metadata } from "next";
import { Avatar } from "@/components/about/avatar";
import { CareerPath } from "@/components/about/career-path";
import { dateRange } from "@/components/career/date-range";
import { PageHeader, rise } from "@/components/career/page-header";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Tag } from "@/components/ui/tag";
import { getExperience } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "About",
  description:
    "Security Engineer focused on detection engineering, cloud security, AI security, security automation and DFIR. SOC Analyst at Hewlett Packard Enterprise.",
  path: "/about/",
});

const OPENING =
  "I am a Security Engineer focused on building systems that improve how security teams detect, investigate, and respond to threats.";

const FOCUS = [
  "Detection Engineering",
  "Cloud Security",
  "AI Security",
  "Security Automation",
  "DFIR",
] as const;

/** Reuses the home page's wording for the three themes (docs/FACTS.md section B). */
const THEMES = [
  {
    label: "DEFEND",
    text: "Triage, incident response and SIEM correlation in an enterprise SOC.",
    keywords: "SOC · IR · Detection · SIEM / SOAR · Cloud",
  },
  {
    label: "BUILD",
    text: "Detection, correlation and AI security systems, built from first principles.",
    keywords: "Systems · Pipelines · Automation",
  },
  {
    label: "RESEARCH",
    text: "AI security, autonomous agents and trustworthy AI remediation.",
    keywords: "AI security · Agentic security · AI DFIR",
  },
] as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-6">
      <dt className="label-mono text-muted">{label}</dt>
      <dd className="mt-4">{children}</dd>
    </div>
  );
}

/**
 * /about. Structured, not an autobiography: the opening line, a profile block, the three themes,
 * the career path, one line outside security, and links on. Server component. The only client code
 * is the scroll-reveal wrapper inside the career path.
 */
export default function AboutPage() {
  const experience = getExperience();
  const current = experience.find((entry) => entry.current);
  const education = experience.find((entry) => entry.id === "education");

  return (
    <>
      <PageHeader id="about-heading" label="ABOUT" title="About" aside={<Avatar />}>
        <p
          className={cn(
            "mt-8 max-w-3xl text-2xl leading-snug font-medium tracking-tight md:text-3xl",
            rise,
            "delay-100",
          )}
        >
          {OPENING}
        </p>
      </PageHeader>

      <section aria-labelledby="profile-heading" className="border-t py-16 md:py-24">
        <Container>
          <h2 id="profile-heading" className="mb-12 label-mono text-foreground">
            PROFILE
          </h2>
          <dl className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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
        </Container>
        {/* Everything the profile names: the role (SOC) and the five focus areas. */}
        <GraphActivator nodes={["soc", "detection", "cloud", "ai", "automation", "dfir"]} />
      </section>

      <section aria-labelledby="themes-heading" className="border-t py-16 md:py-24">
        <Container>
          <h2 id="themes-heading" className="mb-12 label-mono text-foreground">
            THEMES
          </h2>
          <ul className="grid gap-12 md:grid-cols-3 md:gap-6">
            {THEMES.map((theme) => (
              <li key={theme.label} className="border-t pt-6">
                <h3 className="label-mono text-foreground">{theme.label}</h3>
                <p className="mt-4 text-muted">{theme.text}</p>
                <p className="mt-4 label-mono text-muted">{theme.keywords}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="path-heading" className="border-t py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-5">
            <h2 id="path-heading" className="max-w-[14ch] text-4xl headline md:text-6xl">
              How the work got here.
            </h2>
            <p className="mt-6 max-w-md text-lg text-muted">
              Seven steps from software engineering to autonomous security systems.
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <CareerPath />
          </div>
        </Container>
        {/* The path ends in AI security and autonomous agents, with automation underneath. */}
        <GraphActivator nodes={["ai", "agents", "automation"]} />
      </section>

      <section aria-label="Outside security and next steps" className="border-t py-16 md:py-24">
        <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">
            <span className="text-foreground">Outside security:</span> Tennis · systems ·
            self-hosting · experimentation
          </p>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/resume/" variant="secondary">
              VIEW RESUME
            </ButtonLink>
            <ButtonLink href="/contact/" variant="primary" arrow>
              CONTACT
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
