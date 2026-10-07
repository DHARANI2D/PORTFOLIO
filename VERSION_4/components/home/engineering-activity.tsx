import { Label } from "@/components/ui/label";
import { CountUp } from "@/components/skills/count-up";
import { getMetrics } from "@/lib/content";

/**
 * "ENGINEERING ACTIVITY": counts of what is documented on this site.
 * A block, not a <Section>: it sits inside "02 / SYSTEMS" under the system cards. It has no outer
 * margin; the parent owns spacing (pass `className` if needed).
 * The counts come from content (getMetrics) and describe what is documented here, never usage or
 * performance. Nothing is fetched at build time: the repository list lives in EarlierWork, from
 * content/earlier-work.ts, so the deployed page equals the reviewed content.
 */
export function EngineeringActivity({ className }: { className?: string }) {
  const metrics = getMetrics();

  const rows = [
    { label: "SYSTEMS", value: metrics.systems },
    { label: "FLAGSHIP", value: metrics.flagship },
    { label: "RESEARCH", value: metrics.research },
    { label: "CERTIFICATIONS VERIFIED", value: metrics.certificationsVerified },
    { label: "EARLIER PROJECTS", value: metrics.earlierProjects },
  ];

  return (
    <div className={className}>
      <div className="rounded-lg border bg-surface">
        <div className="border-b px-6 py-4">
          <h3 className="label-mono text-foreground">ENGINEERING ACTIVITY</h3>
        </div>

        <dl className="grid divide-y lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 px-6 py-4 lg:flex-col-reverse lg:items-start lg:justify-end lg:gap-3 lg:py-8"
            >
              <dt>
                <Label>{row.label}</Label>
              </dt>
              <dd className="m-0 text-3xl headline tabular-nums lg:text-5xl">
                <CountUp value={row.value} />
              </dd>
            </div>
          ))}
        </dl>

        <p className="border-t px-6 py-3 text-xs text-muted">
          Counts of the systems, research and credentials documented on this site. Not usage or
          performance figures.
        </p>
      </div>
    </div>
  );
}
