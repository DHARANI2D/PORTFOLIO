import { ArrowUpRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { getEarlierWork } from "@/lib/content";
import { cn } from "@/lib/utils";

// Defensive: only plain https links are ever rendered as anchors.
const isHttps = (url: string | undefined): url is string => !!url && /^https:\/\//i.test(url);

/**
 * Academic and supporting work, shown small under the systems. Engineer view only: the recruiter
 * view keeps the systems and drops this archive. Entries that have no description in the content
 * are listed by name only, never described.
 */
export function EarlierWork({ className }: { className?: string }) {
  const work = getEarlierWork();
  const described = work.filter((entry) => entry.note);
  const namedOnly = work.filter((entry) => !entry.note);

  return (
    <div data-engineer-only className={cn("border-t pt-12", className)}>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <Label>EARLIER WORK</Label>
          <h3 className="mt-4 max-w-[14ch] text-3xl headline md:text-4xl">
            My work evolved. Now I build security systems.
          </h3>
        </div>

        <div className="lg:col-span-8">
          <ul>
            {described.map((entry) => (
              <li
                key={entry.name}
                className="grid gap-2 border-t py-4 first:border-t-0 first:pt-0 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6"
              >
                {isHttps(entry.url) ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link inline-flex min-h-11 items-center gap-2 self-start text-base text-foreground transition-colors duration-200 hover:text-accent motion-reduce:transition-none"
                  >
                    {entry.name}
                    <ArrowUpRight
                      aria-hidden
                      className="size-3.5 shrink-0 transition-transform duration-200 motion-safe:group-hover/link:translate-x-0.5 motion-safe:group-hover/link:-translate-y-0.5"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-base text-foreground">
                    {entry.name}
                  </span>
                )}
                <p className="self-center text-sm text-muted">{entry.note}</p>
              </li>
            ))}
          </ul>

          {namedOnly.length > 0 ? (
            <div className="mt-8 border-t pt-8">
              <Label>OTHER EARLIER WORK</Label>
              <ul className="mt-4 flex flex-wrap gap-2">
                {namedOnly.map((entry) => (
                  <li key={entry.name}>
                    <Tag>{entry.name}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
