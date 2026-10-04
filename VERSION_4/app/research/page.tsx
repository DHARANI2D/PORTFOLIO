import type { Metadata } from "next";
import { GraphActivator } from "@/components/graph/graph-context";
import { ResearchCard } from "@/components/research/research-card";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import type { GraphNodeId } from "@/content/schema";
import { getResearch } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const titles = getResearch().map((item) => item.title);

export const metadata: Metadata = buildMetadata({
  title: "Research",
  description: `Research directions in AI security and autonomous agents: ${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}.`,
  path: "/research/",
});

// Entrance as an enhancement (CSS @starting-style): no JS, once, off under reduced motion. The h1
// is not animated; it is the LCP element.
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

/**
 * /research. "04 / RESEARCH", the headline, then one card per research direction. Server component.
 */
export default function ResearchPage() {
  const items = getResearch();
  const graphNodes: GraphNodeId[] = [...new Set(items.flatMap((item) => item.graphNodes))];

  return (
    <>
      <section aria-labelledby="research-heading">
        <Container className="pt-12 pb-16 md:pt-24 md:pb-24">
          <Label className="block">
            <span className="text-accent">04</span> / RESEARCH
          </Label>
          <h1
            id="research-heading"
            className="mt-8 max-w-[16ch] text-4xl display xs:text-5xl md:text-7xl xl:text-8xl"
          >
            Ideas I am turning into systems.
          </h1>
          <p className={cn("mt-8 max-w-2xl text-lg text-muted md:text-xl", rise, "delay-100")}>
            Directions in AI security and autonomous agents, and the systems they feed. Each page
            has an abstract, technical notes and the related case studies.
          </p>
        </Container>
      </section>

      <section aria-label="Research directions" className="border-t py-16 md:py-24">
        <Container>
          {items.length > 0 ? (
            <ul className="grid gap-6 md:grid-cols-2">
              {items.map((item, index) => (
                <ResearchCard
                  key={item.slug}
                  item={item}
                  position={index + 1}
                  className="md:last:odd:col-span-2"
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border p-6 md:p-8">
              <Label className="text-foreground">NO RESEARCH PAGES YET</Label>
              <p className="mt-3 max-w-xl text-muted">Nothing is published here yet.</p>
            </div>
          )}
        </Container>
      </section>

      <GraphActivator nodes={graphNodes} />
    </>
  );
}
