import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GraphActivator } from "@/components/graph/graph-context";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import type { ResearchItem } from "@/content/schema";
import { getResearch } from "@/lib/content";
import { cn } from "@/lib/utils";

function ResearchCard({ item, featured = false }: { item: ResearchItem; featured?: boolean }) {
  return (
    <Link
      href={`/research/${item.slug}/`}
      className={cn(
        "group/card flex h-full flex-col rounded-xl border bg-surface p-6 transition-[transform,border-color] duration-200 hover:border-border-strong focus-visible:rounded-xl motion-safe:hover:-translate-y-[3px] motion-reduce:transition-none",
        featured && "md:p-8",
      )}
    >
      {item.graphNodes.length > 0 ? <Label>{item.graphNodes.join(" · ")}</Label> : null}
      <h4 className="mt-5 font-mono text-base font-medium [overflow-wrap:anywhere] text-foreground">
        {item.title}
      </h4>
      <p className={cn("mt-3 headline", featured ? "text-3xl md:text-4xl" : "text-xl")}>
        {item.tagline}
      </p>
      {featured ? <p className="mt-4 max-w-xl text-sm text-muted">{item.abstract}</p> : null}
      <span className="mt-auto flex items-center gap-2 pt-8 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground motion-reduce:transition-none">
        READ RESEARCH
        <ArrowRight
          aria-hidden
          className="size-3.5 transition-transform duration-200 motion-safe:group-hover/card:translate-x-0.5 motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}

function GroupHeading({ id, label, count }: { id: string; label: string; count: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b pb-4">
      <h3 id={id} className="subhead text-foreground md:text-xl">
        {label}
      </h3>
      <span className="label-mono text-muted">
        {String(count).padStart(2, "0")} {count === 1 ? "ITEM" : "ITEMS"}
      </span>
    </div>
  );
}

/**
 * "RESEARCH" (auto-numbered): the written-up papers first, the first of them as a wide featured
 * card, then the research directions that have no paper yet. The split is the `kind` field of each
 * entry in content/research.
 */
export function ResearchSection() {
  const items = getResearch();
  const papers = items.filter((item) => item.kind === "paper");
  const directions = items.filter((item) => item.kind === "direction");

  return (
    <Section
      id="research"
      autoNumber
      label="RESEARCH"
      title="Building trustworthy autonomous security."
      intro="Research papers and directions in AI security, DFIR and autonomous agents."
    >
      <GraphActivator nodes={["ai", "agents", "dfir"]} />

      {papers.length > 0 ? (
        <div>
          <GroupHeading id="papers-heading" label="PAPERS" count={papers.length} />
          <ul aria-labelledby="papers-heading" className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {papers.map((item, index) => (
              <li key={item.slug} className={cn(index === 0 && "lg:col-span-2")}>
                <ResearchCard item={item} featured={index === 0} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {directions.length > 0 ? (
        <div className="mt-12">
          <GroupHeading id="directions-heading" label="DIRECTIONS" count={directions.length} />
          <p className="mt-4 max-w-2xl text-muted">
            Questions I am working on that do not have a paper yet.
          </p>
          <ul aria-labelledby="directions-heading" className="mt-6 grid gap-4 md:grid-cols-2">
            {directions.map((item) => (
              <li key={item.slug}>
                <ResearchCard item={item} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
