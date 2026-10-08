import { ArrowUpRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Tag } from "@/components/ui/tag";
import { NoteRow } from "@/components/writing/note-row";
import { readLabel } from "@/components/writing/format";
import { devtoPosts, devtoProfile } from "@/content/devto";
import { site } from "@/lib/site";
import { getWritingPosts } from "@/lib/writing";

/**
 * "WRITING" (auto-numbered): the field notes written for this site, then the articles on DEV. The
 * DEV articles link out to dev.to in a new tab; the field notes are pages of this site.
 */
export async function WritingPreview() {
  const posts = await getWritingPosts();

  return (
    <Section
      id="writing"
      autoNumber
      label="WRITING"
      title="What I write."
      intro="Field notes on how these systems are designed, and articles on AI security and modern security operations."
    >
      {posts.length > 0 ? (
        <div>
          <h3 className="subhead text-foreground md:text-xl">FIELD NOTES</h3>
          <ul className="mt-5 space-y-4">
            {posts.map((post) => (
              <NoteRow key={post.slug} post={post} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className={posts.length > 0 ? "mt-14" : undefined}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="subhead text-foreground md:text-xl">ON DEV</h3>
            <p className="mt-2 text-sm text-muted">Series: {devtoProfile.series}</p>
          </div>
          <ButtonLink href={site.devto} variant="secondary" size="sm" external>
            ALL ARTICLES
          </ButtonLink>
        </div>

        <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devtoPosts.map((post) => (
            <li key={post.url} className="group/card relative flex flex-col rounded-xl border bg-surface p-6">
              <Label>{readLabel(post.readingMinutes)}</Label>
              <h4 className="mt-4 text-lg leading-snug headline">
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
                >
                  {post.title}
                  <span className="sr-only"> (opens on DEV in a new tab)</span>
                </a>
              </h4>
              <p className="mt-3 text-sm text-muted">{post.summary}</p>
              <ul aria-label="Tags" className="mt-5 flex flex-wrap gap-2 pt-1">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>
              <span
                aria-hidden
                className="mt-auto inline-flex items-center gap-2 pt-5 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground"
              >
                READ ON DEV
                <ArrowUpRight className="size-3.5" />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 text-muted">
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
    </Section>
  );
}
