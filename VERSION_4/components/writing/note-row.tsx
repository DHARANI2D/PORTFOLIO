import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { formatDay, noteLabel, readLabel } from "@/components/writing/format";
import type { WritingPost } from "@/lib/writing";

/**
 * One line of the field-notes index. The title is the only link; its ::after stretches the link
 * over the whole row, so the row is one big tap target while a screen reader hears just the title.
 * The focus ring is drawn on that stretched area.
 */
export function NoteRow({ post }: { post: WritingPost }) {
  const { meta, slug, readingMinutes } = post;

  return (
    <li className="border-b first:border-t">
      <div className="group relative grid gap-x-8 gap-y-4 py-8 transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none md:-mx-4 md:grid-cols-12 md:items-baseline md:px-4">
        <Label className="md:col-span-3">{noteLabel(meta.number)}</Label>

        <div className="min-w-0 md:col-span-6">
          <h2 className="text-xl headline md:text-2xl">
            <Link
              href={`/writing/${slug}/`}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
            >
              {meta.title}
            </Link>
          </h2>
          <p className="mt-3 text-muted">{meta.summary}</p>
          {meta.tags.length > 0 ? (
            <ul aria-label="Tags" data-engineer-only className="mt-4 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 md:col-span-3 md:justify-end">
          <Label>
            <time dateTime={meta.date}>{formatDay(meta.date)}</time> · {readLabel(readingMinutes)}
          </Label>
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 text-muted transition-[translate,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </div>
      </div>
    </li>
  );
}
