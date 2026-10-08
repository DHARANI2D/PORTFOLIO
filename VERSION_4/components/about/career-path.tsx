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
      "SOC Analyst at HPE. Security alerts triaged every day, and the full incident lifecycle.",
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
      "AI-driven anomaly detection for alert prioritization. SecureModelGate, attestation for ML models before deployment.",
  },
  {
    label: "AUTONOMOUS SECURITY SYSTEMS",
    caption:
      "WITNESS, a deterministic admission gate for autonomous remediation. Research and prototype.",
  },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** How far along the journey each step is, as a fixed set of widths (the site ships no inline styles). */
const PROGRESS = [
  "w-[14%]",
  "w-[28%]",
  "w-[43%]",
  "w-[57%]",
  "w-[71%]",
  "w-[86%]",
  "w-full",
] as const;

/**
 * The path as a grid of step cards. Each card has a large number, a bold label and its caption, and
 * a bar along the top that grows with the step, so the eye reads the journey left to right and top
 * to bottom. The last step, where the path arrives, spans two columns and is tinted. A plain ordered
 * list: every step is readable with no JS, and <ScrollPhase> only exposes a data-phase attribute
 * that each card follows. The hidden state is motion-safe only, so reduced motion shows the
 * finished path at once.
 */
export function CareerPath() {
  return (
    <ol aria-label="Career path, in seven steps" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, index) => {
        const isLast = index === STEPS.length - 1;
        return (
          <ScrollPhase key={step.label} as="li" className={cn(isLast && "sm:col-span-2")}>
            <div
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-xl border p-6 pt-8 transition-colors duration-200 hover:border-border-strong motion-reduce:transition-none md:p-7 md:pt-9",
                isLast ? "border-accent/50 bg-accent-soft" : "bg-surface",
                "motion-safe:group-data-[phase=hidden]/phase:translate-y-3 motion-safe:group-data-[phase=hidden]/phase:opacity-0 motion-safe:group-data-[phase=shown]/phase:transition-[opacity,translate] motion-safe:group-data-[phase=shown]/phase:duration-700",
              )}
            >
              {/* Journey bar: full track, accent fill up to this step. */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-border">
                <span className={cn("absolute inset-y-0 left-0 bg-accent", PROGRESS[index])} />
              </span>

              <span aria-hidden className="font-mono text-4xl font-semibold text-accent-text">
                {pad(index + 1)}
              </span>
              <p className="mt-5 font-mono text-base font-bold tracking-[0.08em] text-foreground md:text-lg">
                <span className="sr-only">{pad(index + 1)}: </span>
                {step.label}
              </p>
              <p className={cn("mt-3 text-base md:text-lg", isLast ? "text-foreground" : "text-muted")}>
                {step.caption}
              </p>
              {isLast ? (
                <p className="mt-auto pt-6 label-mono text-accent-text">WHERE THE PATH LEADS</p>
              ) : null}
            </div>
          </ScrollPhase>
        );
      })}
    </ol>
  );
}
