import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GraphActivator } from "@/components/graph/graph-context";
import { Reveal } from "@/components/hero/reveal";
import { Section } from "@/components/ui/section";
import type { GraphNodeId } from "@/content/schema";
import { cn } from "@/lib/utils";

const SIGNAL_NODES: GraphNodeId[] = ["soc", "detection", "cloud", "ai", "automation"];

/** The owner's stated positioning (docs/FACTS.md section B), in the first person. */
const STATEMENT =
  "I'm a security engineer building detection, correlation and AI security systems from first principles.";

/** Career chain. Each caption restates a line of the verified experience or system descriptions. */
const CHAIN = [
  { label: "SOC", caption: "100+ alerts triaged daily in an enterprise SOC." },
  { label: "DETECTION", caption: "SIEM correlation rules, mapped to MITRE ATT&CK." },
  { label: "CLOUD", caption: "Misconfigurations remediated across AWS and Azure." },
  { label: "AI SECURITY", caption: "Controls for autonomous agents, in WITNESS and AEGIS." },
  {
    label: "AUTOMATION",
    caption: "Python workflows and AI-driven anomaly detection for alert prioritization.",
  },
] as const;

const THEMES = [
  {
    label: "DEFEND",
    text: "Triage, incident response and SIEM correlation in an enterprise SOC.",
    keywords: "SOC · IR · Detection · SIEM / SOAR · Cloud",
    href: "/experience/",
    cta: "VIEW EXPERIENCE",
    delay: 0,
  },
  {
    label: "BUILD",
    text: "Detection, correlation and AI security systems, built from first principles.",
    keywords: "Python · Pipelines · Automation",
    href: "/systems/",
    cta: "VIEW SYSTEMS",
    delay: 1,
  },
  {
    label: "RESEARCH",
    text: "AI security, autonomous agents and trustworthy AI remediation.",
    keywords: "AI security · Agentic security · AI DFIR",
    href: "/research/",
    cta: "VIEW RESEARCH",
    delay: 2,
  },
] as const;

// Drawing order on wide screens, where all five steps enter the viewport together.
const STAGGER = [
  "",
  "lg:group-data-[phase=shown]/reveal:delay-150",
  "lg:group-data-[phase=shown]/reveal:delay-300",
  "lg:group-data-[phase=shown]/reveal:delay-500",
  "lg:group-data-[phase=shown]/reveal:delay-700",
] as const;

/**
 * 01 / SIGNAL. The positioning statement, the career chain (SOC to automation) and the three
 * themes. Server component: the chain is a plain ordered list. <Reveal> only exposes a
 * `data-phase` attribute, and the connectors and nodes follow it with group-data variants, so the
 * drawing is an enhancement. Without JS, or with reduced motion, the chain is fully drawn.
 * Visible in both view modes.
 */
export function SignalSection() {
  return (
    <Section id="signal" autoNumber label="SIGNAL" title="From alerts to systems.">
      <p className="max-w-3xl text-2xl leading-snug font-medium tracking-tight md:text-3xl">
        {STATEMENT}
      </p>

      <ol aria-label="Career signal chain" className="mt-16 grid lg:grid-cols-5">
        {CHAIN.map((step, index) => {
          const isLast = index === CHAIN.length - 1;
          const stagger = STAGGER[index] ?? "";
          return (
            <Reveal
              key={step.label}
              as="li"
              effect="none"
              className="relative pb-8 pl-8 last:pb-0 lg:pt-8 lg:pr-6 lg:pb-0 lg:pl-0"
            >
              <span
                aria-hidden
                className="absolute top-px left-0 size-3 rounded-full border border-border-strong bg-background lg:top-0"
              >
                <span
                  className={cn(
                    "absolute inset-[2px] rounded-full bg-accent group-data-[phase=hidden]/reveal:opacity-0 group-data-[phase=shown]/reveal:transition-opacity group-data-[phase=shown]/reveal:duration-500",
                    stagger,
                  )}
                />
              </span>

              {isLast ? null : (
                <>
                  {/* Stacked layout: the connector runs down to the next node. */}
                  <span
                    aria-hidden
                    className="absolute top-[17px] bottom-[3px] left-[5.5px] w-px bg-border-strong lg:hidden"
                  >
                    <span className="absolute inset-0 origin-top bg-accent/40 group-data-[phase=hidden]/reveal:scale-y-0 group-data-[phase=shown]/reveal:transition-transform group-data-[phase=shown]/reveal:duration-700" />
                  </span>
                  {/* Wide layout: the connector runs across to the next node. */}
                  <span
                    aria-hidden
                    className="absolute top-[5.5px] right-[4px] left-[16px] hidden h-px bg-border-strong lg:block"
                  >
                    <span
                      className={cn(
                        "absolute inset-0 origin-left bg-accent/40 group-data-[phase=hidden]/reveal:scale-x-0 group-data-[phase=shown]/reveal:transition-transform group-data-[phase=shown]/reveal:duration-700",
                        stagger,
                      )}
                    />
                  </span>
                </>
              )}

              <div
                className={cn(
                  "group-data-[phase=hidden]/reveal:translate-y-2 group-data-[phase=hidden]/reveal:opacity-0 group-data-[phase=shown]/reveal:transition-[opacity,translate] group-data-[phase=shown]/reveal:duration-700",
                  stagger,
                )}
              >
                <p className="label-mono text-foreground">{step.label}</p>
                <p className="mt-2 text-sm text-muted">{step.caption}</p>
              </div>
            </Reveal>
          );
        })}
      </ol>

      <div className="mt-24 grid gap-8 md:grid-cols-3 md:gap-6">
        {THEMES.map((theme) => (
          <Reveal key={theme.label} delay={theme.delay}>
            <div className="flex h-full flex-col border-t pt-6">
              <h3 className="label-mono text-foreground">{theme.label}</h3>
              <p className="mt-4 text-base text-muted">{theme.text}</p>
              <p className="mt-4 label-mono text-muted">{theme.keywords}</p>
              <Link
                href={theme.href}
                className="group/link mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-4 label-mono text-foreground transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
              >
                {theme.cta}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 motion-safe:group-hover/link:translate-x-0.5"
                />
              </Link>
            </div>
          </Reveal>
        ))}
      </div>

      <GraphActivator nodes={SIGNAL_NODES} />
    </Section>
  );
}
