import type { Metadata } from "next";
import { GraphActivator } from "@/components/graph/graph-context";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Label } from "@/components/ui/label";
import { NoteRow } from "@/components/writing/note-row";
import { getWritingPosts } from "@/lib/writing";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Field notes",
  description:
    "Engineering notes on detection, correlation and autonomous security systems: what a system has to defend against, and why it is built the way it is.",
  path: "/writing/",
});

// Entrance as an enhancement (CSS @starting-style): no JS, once, off under reduced motion. The h1
// is not animated; it is the LCP element.
const rise =
  "transition-[opacity,translate] duration-700 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none";

/**
 * /writing. "06 / FIELD NOTES", the headline, then the notes as a document index, newest first.
 * Server component. The empty state is a quiet box that points at Hashnode.
 */
export default async function WritingPage() {
  const posts = await getWritingPosts();

  return (
    <>
      <section aria-labelledby="writing-heading">
        <Container className="pt-12 pb-16 md:pt-24 md:pb-24">
          <Label className="block">
            <span className="text-accent">06</span> / FIELD NOTES
          </Label>
          <h1
            id="writing-heading"
            className="mt-8 max-w-[14ch] text-4xl display xs:text-5xl md:text-7xl xl:text-8xl"
          >
            Engineering notes.
          </h1>
          <p className={cn("mt-8 max-w-2xl text-lg text-muted md:text-xl", rise, "delay-100")}>
            What a security system has to defend against, and why it is built the way it is. Written
            from SOC work and from the systems on this site. These are designs and lessons, not
            benchmarks.
          </p>
        </Container>
      </section>

      <section aria-label="Field notes" className="border-t py-16 md:py-24">
        <Container>
          {posts.length > 0 ? (
            <>
              <ul>
                {posts.map((post) => (
                  <NoteRow key={post.slug} post={post} />
                ))}
              </ul>
              <p className="mt-12 text-muted">
                Older articles are on{" "}
                <a
                  href={site.hashnode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline decoration-border-strong underline-offset-4 transition-colors duration-200 hover:decoration-foreground motion-reduce:transition-none"
                >
                  Hashnode<span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
            </>
          ) : (
            <div className="rounded-lg border p-6 md:p-8">
              <Label className="text-foreground">NO FIELD NOTES YET</Label>
              <p className="mt-3 max-w-xl text-muted">
                Nothing is published here yet. Earlier articles are on Hashnode.
              </p>
              <div className="mt-6">
                <ButtonLink href={site.hashnode} variant="secondary" size="sm" arrow>
                  HASHNODE
                </ButtonLink>
              </div>
            </div>
          )}
        </Container>
      </section>

      <GraphActivator nodes={["detection", "soc", "ai", "agents"]} />
    </>
  );
}
