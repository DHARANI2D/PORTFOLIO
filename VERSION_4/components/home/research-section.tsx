import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { getResearch } from "@/lib/content";

/**
 * "04 / RESEARCH": one card per research direction. Engineer view only, so the wrapper carries
 * data-engineer-only (Section does not forward attributes) and recruiter view hides the whole block.
 */
export function ResearchSection() {
  const items = getResearch();

  return (
    <div data-engineer-only>
      <Section
        id="research"
        index="04"
        label="RESEARCH"
        title="Building trustworthy autonomous security."
        intro="Research directions in AI security and autonomous agents."
      >
        <GraphActivator nodes={["ai", "agents", "dfir"]} />

        <ul className="grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/research/${item.slug}/`}
                className="group flex h-full flex-col rounded-lg border bg-surface p-6 transition-[transform,border-color] duration-200 hover:border-border-strong focus-visible:rounded-lg motion-safe:hover:-translate-y-[3px] motion-reduce:transition-none md:p-8"
              >
                {item.graphNodes.length > 0 ? <Label>{item.graphNodes.join(" · ")}</Label> : null}
                <h3 className="mt-6 font-mono text-base font-medium [overflow-wrap:anywhere] text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-2xl headline">{item.tagline}</p>
                <span className="mt-auto flex items-center gap-2 pt-8 label-mono text-muted transition-colors duration-200 group-hover:text-foreground motion-reduce:transition-none">
                  READ RESEARCH
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <ButtonLink href="/research/" variant="secondary" arrow>
            ALL RESEARCH
          </ButtonLink>
        </div>
      </Section>
    </div>
  );
}
