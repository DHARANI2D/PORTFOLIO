import Link from "next/link";
import { GraphActivator } from "@/components/graph/graph-context";
import { Section } from "@/components/ui/section";
import type { ResearchItem } from "@/content/schema";
import { getResearch } from "@/lib/content";

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

function Names({ id, items }: { id: string; items: readonly ResearchItem[] }) {
  return (
    <ul aria-labelledby={id} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.slug}
          className="rounded-xl border bg-surface px-6 py-5 font-mono text-lg font-semibold tracking-tight [overflow-wrap:anywhere] text-foreground"
        >
          {item.title}
        </li>
      ))}
    </ul>
  );
}

/**
 * "RESEARCH" (auto-numbered): the names of the written-up papers and of the research directions,
 * and nothing else. The detail is not published, so there are no cards to open, no abstracts and no
 * pages behind these names. The split is the `kind` field of each entry in content/research.
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
      intro="Research in AI security, DFIR and autonomous agents. The detail is not published."
    >
      <GraphActivator nodes={["ai", "agents", "dfir"]} />

      {papers.length > 0 ? (
        <div>
          <GroupHeading id="papers-heading" label="PAPERS" count={papers.length} />
          <Names id="papers-heading" items={papers} />
        </div>
      ) : null}

      {directions.length > 0 ? (
        <div className="mt-12">
          <GroupHeading id="directions-heading" label="DIRECTIONS" count={directions.length} />
          <Names id="directions-heading" items={directions} />
        </div>
      ) : null}

      <p className="mt-10 text-muted">
        Details are shared in conversation.{" "}
        <Link
          href="/#contact"
          className="text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none"
        >
          Get in touch
        </Link>
        .
      </p>
    </Section>
  );
}
