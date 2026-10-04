import { ScrollPhase } from "@/components/career/scroll-phase";
import { cn } from "@/lib/utils";

/**
 * The owner's own career narrative (docs/FACTS.md section B). Each caption restates something
 * already verified in section A. No step carries a date: the order is the narrative, and the
 * dated roles live on /experience.
 */
const STEPS = [
  {
    label: "SOFTWARE ENGINEERING",
    caption: "A Computer Science and Engineering degree. Python, Java, TypeScript and C++.",
  },
  {
    label: "SECURITY",
    caption:
      "Cybersecurity Analyst Intern at HPE. Helped triage phishing and malware alerts with Splunk and CrowdStrike.",
  },
  {
    label: "SOC",
    caption:
      "SOC Analyst at HPE. 100+ security alerts triaged daily, and the full incident lifecycle.",
  },
  {
    label: "DETECTION ENGINEERING",
    caption:
      "Threats mapped to MITRE ATT&CK. SIEM correlation rules designed and tuned to cut false positives.",
  },
  {
    label: "CLOUD SECURITY",
    caption:
      "Cloud misconfigurations remediated across AWS and Azure. IAM with RBAC, MFA and zero-trust.",
  },
  {
    label: "AI SECURITY",
    caption:
      "AI-driven anomaly detection for alert prioritization. AEGIS, a zero-trust control plane for AI agents.",
  },
  {
    label: "AUTONOMOUS SECURITY SYSTEMS",
    caption:
      "WITNESS, a deterministic admission gate for autonomous remediation. Research and prototype.",
  },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Vertical, scroll-revealed path. A plain ordered list: every step is readable with no JS, and
 * <ScrollPhase> only exposes a data-phase attribute that the node, connector and text follow. The
 * hidden state is motion-safe only, so reduced motion shows the finished path at once.
 * Not interactive on purpose: there is nothing to operate, so there are no tab stops to get lost in.
 */
export function CareerPath() {
  return (
    <ol aria-label="Career path, in seven steps">
      {STEPS.map((step, index) => {
        const isLast = index === STEPS.length - 1;
        return (
          <ScrollPhase key={step.label} as="li" className="relative pb-12 pl-8 last:pb-0">
            {/* Node. The destination gets the accent ring. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1 left-0 size-3 rounded-full border bg-background",
                isLast ? "border-accent" : "border-border-strong",
              )}
            >
              <span className="absolute inset-[2px] rounded-full bg-accent motion-safe:group-data-[phase=hidden]/phase:opacity-0 motion-safe:group-data-[phase=shown]/phase:transition-opacity motion-safe:group-data-[phase=shown]/phase:duration-500" />
            </span>

            {/* Connector down to the next node. It draws as its step enters. */}
            {isLast ? null : (
              <span
                aria-hidden
                className="absolute top-[18px] -bottom-1 left-[5.5px] w-px bg-border-strong"
              >
                <span className="absolute inset-0 origin-top bg-accent/40 motion-safe:group-data-[phase=hidden]/phase:scale-y-0 motion-safe:group-data-[phase=shown]/phase:transition-transform motion-safe:group-data-[phase=shown]/phase:duration-700" />
              </span>
            )}

            <div className="motion-safe:group-data-[phase=hidden]/phase:translate-y-2 motion-safe:group-data-[phase=hidden]/phase:opacity-0 motion-safe:group-data-[phase=shown]/phase:transition-[opacity,translate] motion-safe:group-data-[phase=shown]/phase:duration-700">
              <p className="font-mono text-sm font-medium tracking-[0.12em] text-foreground md:text-base">
                <span className="text-muted">{pad(index + 1)}</span>
                <span aria-hidden className="text-muted">
                  {" "}
                  /{" "}
                </span>
                <span className="sr-only">: </span>
                {step.label}
              </p>
              <p className="mt-2 max-w-xl text-muted">{step.caption}</p>
            </div>
          </ScrollPhase>
        );
      })}
    </ol>
  );
}
