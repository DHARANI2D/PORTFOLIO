import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { formatDay, pad3, readLabel } from "@/components/writing/format";
import type { WritingPost } from "@/lib/writing";
import { cn } from "@/lib/utils";

// Entrance as an enhancement: CSS @starting-style, so it needs no JS, runs once and is switched off
// by reduced motion. The h1 is deliberately not animated (it is the LCP element).
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

/**
 * Header block of a field note: way back, "FIELD NOTE / 003", title, summary and the metadata row
 * (date, reading time, tags). Server component.
 */
export function NoteHeader({ post }: { post: WritingPost }) {
  const { meta, readingMinutes } = post;

  return (
    <header>
      <Container className="pt-6 pb-12 md:pt-8 md:pb-16">
        <nav aria-label="Breadcrumb">
          <Link
            href="/#writing"
            className="group/back -ml-2 inline-flex min-h-11 items-center gap-2 px-2 label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
          >
            <ArrowLeft
              aria-hidden
              className="size-3.5 transition-transform duration-200 motion-safe:group-hover/back:-translate-x-0.5"
            />
            ALL FIELD NOTES
          </Link>
        </nav>

        <div className="mt-12 md:mt-16">
          <Label className="block text-foreground">
            FIELD NOTE <span className="text-muted">/ {pad3(meta.number)}</span>
          </Label>
          <h1 className="mt-6 max-w-[22ch] text-3xl headline break-words xs:text-4xl md:text-5xl lg:text-6xl">
            {meta.title}
          </h1>
          <p className={cn("mt-5 max-w-2xl text-base text-muted md:text-lg", rise, "delay-100")}>
            {meta.summary}
          </p>
        </div>

        <div
          className={cn(
            "mt-12 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between",
            rise,
            "delay-200",
          )}
        >
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label>
              <time dateTime={meta.date}>{formatDay(meta.date)}</time>
            </Label>
            <span aria-hidden className="text-border-strong">
              /
            </span>
            <Label>{readLabel(readingMinutes)}</Label>
          </p>
          {meta.tags.length > 0 ? (
            <ul aria-label="Tags" data-engineer-only className="flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Container>
    </header>
  );
}
