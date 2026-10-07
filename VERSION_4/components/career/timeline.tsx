import { dateRange } from "@/components/career/date-range";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import type { Experience } from "@/content/schema";
import { cn } from "@/lib/utils";

/** The education entry repeats "Education" as its only tag. Under an EDUCATION heading that is noise. */
const HIDDEN_TAGS: ReadonlySet<string> = new Set(["Education"]);

function TimelineEntry({ entry }: { entry: Experience }) {
  const tags = entry.tags.filter((tag) => !HIDDEN_TAGS.has(tag));

  return (
    <li className="group/entry grid grid-cols-[1rem_1fr] gap-x-4 md:grid-cols-[12rem_1rem_1fr] md:gap-x-8">
      {/* Date: beside the rail on desktop, above the body on mobile. */}
      <div className="col-start-2 row-start-1 pb-3 md:col-start-1 md:pt-2 md:pb-0">
        <Label className={entry.current ? "text-foreground" : undefined}>{dateRange(entry)}</Label>
      </div>

      {/* Rail: a 1px line with one marker per entry. Decorative: the dates carry the order. */}
      <div
        aria-hidden
        className="relative col-start-1 row-span-2 row-start-1 md:col-start-2 md:row-span-1"
      >
        <span
          className={cn(
            "absolute top-[3px] left-1/2 size-2.5 -translate-x-1/2 rounded-full border md:top-2",
            entry.current ? "border-accent bg-accent" : "border-border-strong bg-background",
          )}
        />
        <span className="absolute top-4 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border group-last/entry:hidden md:top-6" />
      </div>

      <div className="col-start-2 row-start-2 pb-12 group-last/entry:pb-0 md:col-start-3 md:row-start-1 md:pb-16 md:group-last/entry:pb-0">
        <h3 className="text-2xl headline md:text-3xl">{entry.org}</h3>
        <p className="mt-2 text-lg text-foreground">{entry.role}</p>
        {entry.team ? <p className="text-muted">{entry.team}</p> : null}
        {entry.summary ? <p className="mt-3 max-w-2xl text-muted">{entry.summary}</p> : null}

        {entry.bullets.length > 0 ? (
          <ul className="mt-6 max-w-3xl space-y-3">
            {entry.bullets.map((bullet, index) => (
              <li
                key={bullet}
                className={cn("flex gap-3", index === 0 ? "text-foreground" : "text-muted")}
              >
                <span aria-hidden className="mt-3 size-1 shrink-0 bg-border-strong" />
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

/** A vertical timeline. Server component, no motion: the content is the point. */
export function Timeline({ entries, label }: { entries: readonly Experience[]; label: string }) {
  return (
    <ol aria-label={label}>
      {entries.map((entry) => (
        <TimelineEntry key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}
