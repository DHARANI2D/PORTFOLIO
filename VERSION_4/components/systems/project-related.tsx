import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RelatedNote, RelatedResearch } from "@/components/systems/project-meta";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";

function Row({
  href,
  kind,
  title,
  detail,
}: {
  href: string;
  kind: string;
  title: string;
  detail?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group/related flex min-h-11 items-start justify-between gap-6 border-b py-4 transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none"
      >
        <span className="flex min-w-0 flex-col gap-2">
          <span className="label-mono text-muted">{kind}</span>
          <span className="font-mono text-base font-medium break-words text-foreground">
            {title}
          </span>
          {detail ? <span className="text-sm text-muted">{detail}</span> : null}
        </span>
        <ArrowRight
          aria-hidden
          className="mt-5 size-3.5 shrink-0 text-muted transition-transform duration-200 group-hover/related:text-foreground motion-safe:group-hover/related:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </li>
  );
}

type ProjectRelatedProps = {
  research: readonly RelatedResearch[];
  notes: readonly RelatedNote[];
  /** Page-local section number ("07"), when the page numbers its sections. */
  index?: string;
};

const pad = (n: number) => String(n).padStart(3, "0");

/**
 * Where to go next from a system page: the research pages and field notes about it. Without this a
 * reader who finishes the case study has only the next system to click, and the material that
 * explains the design sits behind the global navigation. Engineer view only, like the research and
 * the notes themselves. Renders nothing when there is nothing to link. Server component.
 */
export function ProjectRelated({ research, notes, index }: ProjectRelatedProps) {
  if (research.length === 0 && notes.length === 0) return null;
  const both = research.length > 0 && notes.length > 0;

  return (
    <section
      id="related"
      aria-labelledby="related-heading"
      data-engineer-only
      className="border-t py-12 md:py-16"
    >
      <Container>
        <div className="flex items-baseline justify-between gap-6 border-b pb-6">
          <h2 id="related-heading" className="label-mono text-foreground">
            {index ? <span className="text-accent">{index} / </span> : null}
            RELATED
          </h2>
          <Label>KEEP READING</Label>
        </div>

        <div className={both ? "mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-2" : "mt-8"}>
          {research.length > 0 ? (
            <div>
              <ul aria-label="Related research" className="border-t">
                {research.map((item) => (
                  <Row
                    key={item.slug}
                    href={`/research/${item.slug}/`}
                    kind="RESEARCH"
                    title={item.title}
                    detail={item.tagline}
                  />
                ))}
              </ul>
            </div>
          ) : null}
          {notes.length > 0 ? (
            <div>
              <ul aria-label="Related field notes" className="border-t">
                {notes.map((note) => (
                  <Row
                    key={note.slug}
                    href={`/writing/${note.slug}/`}
                    kind={`FIELD NOTE / ${pad(note.number)}`}
                    title={note.title}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
