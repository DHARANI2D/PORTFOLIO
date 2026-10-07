import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { getWritingPosts, type WritingPost } from "@/lib/writing";
import { site } from "@/lib/site";

const LATEST = 3;

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** "04 OCT 2026" from an ISO date. Explicit UTC parts, no Intl, so every build prints the same string. */
function formatDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  const date = new Date(time);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}

function NoteRow({ post }: { post: WritingPost }) {
  const { meta, slug, readingMinutes } = post;
  return (
    <li className="border-b first:border-t">
      <Link
        href={`/writing/${slug}/`}
        className="group grid gap-x-8 gap-y-3 py-6 transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none md:-mx-4 md:grid-cols-12 md:items-baseline md:px-4"
      >
        <Label className="md:col-span-3">FIELD NOTE / {String(meta.number).padStart(3, "0")}</Label>

        <div className="md:col-span-6">
          <h3 className="text-xl headline md:text-2xl">{meta.title}</h3>
          <p className="mt-2 text-muted">{meta.summary}</p>
        </div>

        <div className="flex items-center justify-between gap-4 md:col-span-3 md:justify-end">
          <Label>
            <time dateTime={meta.date}>{formatDay(meta.date)}</time> · {readingMinutes} MIN READ
          </Label>
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </div>
      </Link>
    </li>
  );
}

/** "FIELD NOTES" (auto-numbered): the three newest notes as a document index. Engineer view only. */
export async function WritingPreview() {
  const posts = (await getWritingPosts()).slice(0, LATEST);

  return (
    <div data-engineer-only>
      <Section id="writing" autoNumber label="FIELD NOTES" title="Engineering notes.">
        {posts.length > 0 ? (
          <>
            <ul>
              {posts.map((post) => (
                <NoteRow key={post.slug} post={post} />
              ))}
            </ul>
            <div className="mt-12">
              <ButtonLink href="/writing/" variant="secondary" arrow>
                ALL NOTES
              </ButtonLink>
            </div>
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
      </Section>
    </div>
  );
}
