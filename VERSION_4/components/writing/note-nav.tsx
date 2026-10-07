import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { noteLabel } from "@/components/writing/format";
import type { WritingPost } from "@/lib/writing";
import { cn } from "@/lib/utils";

type Neighbour = Pick<WritingPost, "slug" | "meta">;

function NeighbourLink({ note, direction }: { note: Neighbour; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  const Arrow = isNext ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={`/writing/${note.slug}/`}
      className={cn(
        "group/card flex h-full flex-col gap-3 rounded-lg border bg-surface p-6",
        "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
        "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
        isNext && "md:items-end md:text-right",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none",
          isNext && "md:flex-row-reverse",
        )}
      >
        <Arrow
          aria-hidden
          className={cn(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            isNext
              ? "motion-safe:group-hover/card:translate-x-0.5"
              : "motion-safe:group-hover/card:-translate-x-0.5",
          )}
        />
        {isNext ? "NEXT NOTE" : "PREVIOUS NOTE"}
      </span>
      <span className="label-mono text-muted">{noteLabel(note.meta.number)}</span>
      <span className="max-w-[40ch] text-lg headline text-foreground">{note.meta.title}</span>
    </Link>
  );
}

/**
 * End of a field note: the previous (older) and next (newer) note, and a way back to the index.
 * Either neighbour may be missing. Server component.
 */
export function NoteNav({ previous, next }: { previous?: Neighbour; next?: Neighbour }) {
  if (!previous && !next) return null;

  return (
    <nav aria-labelledby="more-notes-heading" className="border-t">
      <Container className="py-16 md:py-24">
        <div className="flex items-center justify-between gap-6 border-b pb-6">
          <Label>
            <span id="more-notes-heading">MORE FIELD NOTES</span>
          </Label>
          <ButtonLink href="/writing/" variant="secondary" size="sm">
            All notes
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {previous ? (
            <NeighbourLink note={previous} direction="previous" />
          ) : (
            <span aria-hidden className="hidden md:block" />
          )}
          {next ? (
            <NeighbourLink note={next} direction="next" />
          ) : (
            <span aria-hidden className="hidden md:block" />
          )}
        </div>
      </Container>
    </nav>
  );
}
