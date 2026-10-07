import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Tag } from "@/components/ui/tag";
import type { Experience } from "@/content/schema";
import { getCertifications, getExperience } from "@/lib/content";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Education lives on About and /experience. This is the work timeline only. */
const NON_WORK_IDS: ReadonlySet<string> = new Set(["education"]);

/** Tags come straight from the role's own tags in content/experience.ts, never rewritten here. */
const MAX_TAGS = 4;
/** The current role earns more room: it carries the verified "100+ daily alerts" line. */
const BULLETS_CURRENT = 3;
const BULLETS_PAST = 1;

function dateRange(entry: Experience): string {
  if (entry.end) return `${entry.start} — ${entry.end}`;
  return entry.current ? `${entry.start} — Present` : entry.start;
}

function TimelineEntry({ entry }: { entry: Experience }) {
  const bullets = entry.bullets.slice(0, entry.current ? BULLETS_CURRENT : BULLETS_PAST);
  const tags = entry.tags.slice(0, MAX_TAGS);

  return (
    <li className="group/entry grid grid-cols-[1rem_1fr] gap-x-4 md:grid-cols-[12rem_1rem_1fr] md:gap-x-8">
      {/* Date: beside the rail on desktop, above the body on mobile. */}
      <div className="col-start-2 row-start-1 pb-3 md:col-start-1 md:pt-2 md:pb-0">
        <Label className={entry.current ? "text-foreground" : undefined}>{dateRange(entry)}</Label>
      </div>

      {/* Rail: a 1px line with one marker per role. Decorative, the dates carry the order. */}
      <div
        aria-hidden
        className="relative col-start-1 row-span-2 row-start-1 md:col-start-2 md:row-span-1"
      >
        <span
          className={cn(
            "absolute top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full border md:top-2",
            entry.current ? "border-accent bg-accent" : "border-border-strong bg-background",
          )}
        />
        <span className="absolute top-4 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border group-last/entry:hidden md:top-6" />
      </div>

      <div className="col-start-2 row-start-2 pb-12 group-last/entry:pb-0 md:col-start-3 md:row-start-1 md:pb-16 md:group-last/entry:pb-0">
        <h3 className="text-2xl headline md:text-3xl">{entry.org}</h3>
        <p className="mt-2 text-lg text-foreground">{entry.role}</p>
        {entry.team ? <p className="text-muted">{entry.team}</p> : null}

        {bullets.length > 0 ? (
          <ul className="mt-6 max-w-3xl space-y-3">
            {bullets.map((bullet, index) => (
              <li
                key={bullet}
                className={cn("flex gap-3", index === 0 ? "text-foreground" : "text-muted")}
              >
                <span aria-hidden className="mt-2.5 size-1 shrink-0 bg-border-strong" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {tags.length > 0 ? (
          <ul aria-label="Focus areas and tools" className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <Tag>{tag}</Tag>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

/** "EXPERIENCE" (auto-numbered): a short work timeline, plus a recruiter-only credentials strip. */
export function ExperiencePreview() {
  const roles = getExperience().filter((entry) => !NON_WORK_IDS.has(entry.id));
  const verified = getCertifications().filter((cert) => cert.status === "verified");

  return (
    <Section
      id="experience"
      autoNumber
      label="EXPERIENCE"
      title="Where I've worked."
      intro="Hands-on SOC work in an enterprise environment: alert triage, incident response and detection engineering."
    >
      <GraphActivator nodes={["soc", "detection", "cloud"]} />

      <ol>
        {roles.map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </ol>

      <div className="mt-16">
        <ButtonLink href="/experience/" variant="secondary" arrow>
          FULL EXPERIENCE
        </ButtonLink>
      </div>

      {verified.length > 0 ? (
        <div data-recruiter-only className="mt-16 border-t pt-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h3 className="label-mono text-foreground">CREDENTIALS</h3>
              <p className="mt-2 text-sm text-muted">{verified.length} verified certifications</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/certifications/" variant="ghost" size="sm" arrow>
                ALL CERTIFICATIONS
              </ButtonLink>
              <ButtonLink href={site.resumeDownload} variant="secondary" size="sm" arrow>
                RESUME PDF
              </ButtonLink>
            </div>
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {verified.map((cert) => (
              <li key={cert.name} className="font-mono text-xs leading-relaxed text-foreground">
                {cert.name}
                {cert.year ? <span className="text-muted"> · {cert.year}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
