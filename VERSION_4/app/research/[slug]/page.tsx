import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GraphActivator } from "@/components/graph/graph-context";
import { RelatedSystems } from "@/components/research/related-systems";
import { ResearchBlock } from "@/components/research/research-block";
import { ResearchLinks } from "@/components/research/research-links";
import { ResearchNav } from "@/components/research/research-nav";
import { firstSentence, pad2 } from "@/components/research/text";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { getProject, getResearch, getResearchItem } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

// Static export: only the slugs in the content exist, anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getResearch().map((item) => ({ slug: item.slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getResearchItem(slug);
  if (!item) return {};
  return buildMetadata({
    title: `${item.title} research`,
    description: firstSentence(item.abstract, 160),
    path: `/research/${item.slug}/`,
  });
}

// Entrance as an enhancement (CSS @starting-style): no JS, once, off under reduced motion. The h1
// is not animated; it is the LCP element.
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

/**
 * /research/[slug]: one research direction. Header (title and tagline, plus links only when they
 * are real), then the abstract, the technical notes (engineer view only) and the systems it
 * relates to. Blocks without content are not rendered, and numbering follows what is shown.
 * Server component.
 */
export default async function ResearchPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getResearchItem(slug);
  if (!item) notFound();

  const all = getResearch();
  const position = all.findIndex((entry) => entry.slug === item.slug);
  const previous = all[position - 1];
  const next = all[position + 1];

  const related = item.relatedProjects.flatMap((projectSlug) => {
    const project = getProject(projectSlug);
    return project ? [project] : [];
  });

  // Number only the blocks that exist, so a short page reads 01, 02 rather than 01, 03.
  const hasNotes = item.notes.length > 0;
  const relatedIndex = pad2(hasNotes ? 3 : 2);
  // Technical notes are engineer-only, so recruiter view numbers the next block 02.

  return (
    <>
      <article aria-labelledby="research-title">
        <header>
          <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
            <nav aria-label="Breadcrumb">
              <Link
                href="/research/"
                className="group/back -ml-2 inline-flex min-h-11 items-center gap-2 px-2 label-mono text-muted transition-colors duration-200 hover:text-foreground motion-reduce:transition-none"
              >
                <ArrowLeft
                  aria-hidden
                  className="size-3.5 transition-transform duration-200 motion-safe:group-hover/back:-translate-x-0.5"
                />
                ALL RESEARCH
              </Link>
            </nav>

            <div className="mt-12 md:mt-16">
              <Label className="block text-foreground">
                RESEARCH <span className="text-muted">/ {pad2(position + 1)}</span>
              </Label>
              <h1
                id="research-title"
                className="mt-6 text-3xl display break-words xs:text-5xl md:text-7xl xl:text-8xl"
              >
                {item.title}
              </h1>
              <p
                className={cn("mt-8 max-w-[28ch] text-2xl headline md:text-4xl", rise, "delay-100")}
              >
                {item.tagline}
              </p>
            </div>

            <ResearchLinks
              links={item.links}
              title={item.title}
              className="mt-12 flex flex-wrap gap-3"
            />
          </Container>
        </header>

        <ResearchBlock id="abstract" index="01" label="ABSTRACT">
          <p className="max-w-3xl text-xl leading-8 text-foreground md:text-2xl md:leading-9">
            {item.abstract}
          </p>
        </ResearchBlock>

        {hasNotes ? (
          <ResearchBlock id="notes" index="02" label="TECHNICAL NOTES" engineerOnly>
            <ol role="list" className="border-t">
              {item.notes.map((note, i) => (
                <li
                  key={note}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-b py-6 md:gap-x-6"
                >
                  <span aria-hidden className="pt-1.5 label-mono text-muted">
                    {pad2(i + 1)}
                  </span>
                  <p className="max-w-[60ch] text-lg leading-8 text-foreground/90">{note}</p>
                </li>
              ))}
            </ol>
          </ResearchBlock>
        ) : null}

        {related.length > 0 ? (
          <ResearchBlock
            id="related"
            index={relatedIndex}
            recruiterIndex="02"
            label="RELATED SYSTEMS"
          >
            <RelatedSystems systems={related} />
          </ResearchBlock>
        ) : null}
      </article>

      <ResearchNav previous={previous} next={next} />

      <GraphActivator nodes={item.graphNodes} />
    </>
  );
}
