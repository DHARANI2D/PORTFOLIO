import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraphActivator } from "@/components/graph/graph-context";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { graphNodesForTags } from "@/components/writing/note-graph";
import { NoteHeader } from "@/components/writing/note-header";
import { NoteNav } from "@/components/writing/note-nav";
import { NoteRelated, type RelatedLink } from "@/components/writing/note-related";
import { researchForTags, systemsForTags } from "@/components/writing/related";
import { NoteToc } from "@/components/writing/note-toc";
import { NoteTocMobile } from "@/components/writing/note-toc-mobile";
import { NoteBody } from "@/components/writing/prose";
import { getProjects, getResearch } from "@/lib/content";
import { articleJsonLd, buildMetadata } from "@/lib/seo";
import { getHeadings, getWritingPost, getWritingPosts, getWritingSlugs } from "@/lib/writing";

// Static export: only the notes in content/writing exist, anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await getWritingSlugs()).map((slug) => ({ slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getWritingPost(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.summary,
    path: `/writing/${post.slug}/`,
    type: "article",
    publishedTime: post.meta.date,
  });
}

// The contents list earns its place once there is enough to jump between.
const MIN_HEADINGS_FOR_TOC = 3;

/**
 * /writing/[slug]: a field note laid out like documentation. Header block, then the body with a
 * sticky "on this page" list on desktop (a collapsed <details> on mobile), then the neighbouring
 * notes. Server component; the only client leaf is the scroll-spy in the desktop contents list.
 */
export default async function WritingPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, posts, headings] = await Promise.all([
    getWritingPost(slug),
    getWritingPosts(),
    getHeadings(slug),
  ]);
  if (!post) notFound();

  const { Content } = post;
  const path = `/writing/${post.slug}/`;
  const showToc = headings.length >= MIN_HEADINGS_FOR_TOC;

  // Posts are newest first: the note before this one in the list is the newer one.
  const position = posts.findIndex((p) => p.slug === post.slug);
  const newer = position > 0 ? posts[position - 1] : undefined;
  const older = position >= 0 ? posts[position + 1] : undefined;

  // Back-links: the case studies this note is tagged with, then the research it belongs to.
  const systems = systemsForTags(post.meta.tags, getProjects());
  const research = researchForTags(post.meta.tags, getResearch(), systems);
  const related: RelatedLink[] = [
    ...systems.map((project) => ({
      href: `/systems/${project.slug}/`,
      kind: "SYSTEM",
      title: `${project.name}: ${project.tagline}`,
    })),
    ...research.map((item) => ({
      href: `/research/${item.slug}/`,
      kind: "RESEARCH",
      title: `${item.title}: ${item.tagline}`,
    })),
  ];

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.meta.title,
          description: post.meta.summary,
          date: post.meta.date,
          path,
        })}
      />

      <article>
        <NoteHeader post={post} />

        <div className="border-t">
          <Container className="py-12 md:py-16">
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
              <div className="min-w-0 lg:col-span-8">
                {showToc ? <NoteTocMobile headings={headings} /> : null}
                <NoteBody>
                  <Content />
                </NoteBody>
              </div>
              {showToc ? (
                <div className="hidden lg:col-span-3 lg:col-start-10 lg:block">
                  <div className="sticky top-24">
                    <NoteToc headings={headings} />
                  </div>
                </div>
              ) : null}
            </div>
          </Container>
        </div>
      </article>

      <NoteRelated links={related} />

      <NoteNav previous={older} next={newer} />

      <GraphActivator nodes={graphNodesForTags(post.meta.tags)} />
    </>
  );
}
