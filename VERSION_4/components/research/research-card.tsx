import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { firstSentence, pad2 } from "@/components/research/text";
import type { ResearchItem } from "@/content/schema";
import { cn } from "@/lib/utils";

/**
 * One research direction on the index. The title is the only link and its ::after stretches over
 * the whole card, so the card is one tap target and a screen reader hears just the title. The
 * focus ring is drawn on the stretched area. Hover lifts the card 3px; reduced motion keeps it flat.
 */
export function ResearchCard({
  item,
  position,
  className,
}: {
  item: ResearchItem;
  /** 1-based position in the research list. */
  position: number;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "group relative flex h-full flex-col rounded-lg border bg-surface p-6 md:p-8",
        "transition-[translate,border-color,background-color] duration-200 motion-reduce:transition-none",
        "hover:border-border-strong hover:bg-surface-hover motion-safe:hover:-translate-y-[3px]",
        className,
      )}
    >
      <Label>RESEARCH / {pad2(position)}</Label>

      <h2 className="mt-6 font-mono text-base font-medium [overflow-wrap:anywhere] text-foreground">
        <Link
          href={`/research/${item.slug}/`}
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
        >
          {item.title}
        </Link>
      </h2>
      <p className="mt-3 text-2xl headline">{item.tagline}</p>
      <p className="mt-4 text-muted">{firstSentence(item.abstract)}</p>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-8">
        {item.graphNodes.length > 0 ? (
          <ul aria-label="Domains" data-engineer-only className="flex flex-wrap gap-2">
            {item.graphNodes.map((node) => (
              <li key={node}>
                <Tag>{node}</Tag>
              </li>
            ))}
          </ul>
        ) : null}
        <span
          aria-hidden
          className="ml-auto flex items-center gap-2 label-mono text-muted transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none"
        >
          READ
          <ArrowRight className="size-3.5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </div>
    </li>
  );
}
