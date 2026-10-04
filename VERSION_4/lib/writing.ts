import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";
import { WritingMeta } from "@/content/schema";
import { extractHeadings, type NoteHeading } from "@/components/writing/headings";

const DIR = path.join(process.cwd(), "content", "writing");

export type WritingPost = {
  slug: string;
  meta: WritingMeta;
  readingMinutes: number;
};

export type { NoteHeading };

// A slug becomes a URL and a file path, so it must be a plain, lowercase file name. A file that
// breaks the rule fails the build loudly instead of silently disappearing from the site.
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export async function getWritingSlugs(): Promise<string[]> {
  const files = await fs.readdir(DIR).catch(() => [] as string[]);
  return files
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, "");
      if (!SAFE_SLUG.test(slug)) {
        throw new Error(
          `content/writing/${f}: file names use lowercase letters, digits and hyphens only.`,
        );
      }
      return slug;
    })
    .sort();
}

async function readSource(slug: string): Promise<string> {
  return fs.readFile(path.join(DIR, `${slug}.mdx`), "utf8");
}

const WORDS_PER_MINUTE = 220;

/**
 * Reading time from the prose. The `meta` export, JSX tags and diagram text are not read aloud, and
 * code is skimmed more than it is read, so it counts for a third.
 */
export function estimateReadingMinutes(source: string): number {
  const code = source.match(/```[\s\S]*?```/g) ?? [];
  const prose = source
    .replace(/^export const meta = \{[\s\S]*?\n\};?[ \t]*$/m, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{`[\s\S]*?`\}/g, " ")
    .replace(/<\/?[A-Z][^>]*>/g, " ");
  const count = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const words = count(prose) + code.reduce((sum, block) => sum + count(block), 0) / 3;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** All posts, newest first. Metadata is validated at build time. */
export async function getWritingPosts(): Promise<WritingPost[]> {
  const slugs = await getWritingSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const mod = (await import(`@/content/writing/${slug}.mdx`)) as { meta: unknown };
      return {
        slug,
        meta: WritingMeta.parse(mod.meta),
        readingMinutes: estimateReadingMinutes(await readSource(slug)),
      };
    }),
  );
  const numbers = new Set<number>();
  for (const { slug, meta } of posts) {
    if (numbers.has(meta.number)) {
      throw new Error(`content/writing/${slug}.mdx: note number ${meta.number} is already used.`);
    }
    numbers.add(meta.number);
  }
  // Same-day posts fall back to the note number so the order is stable across builds.
  return posts.sort(
    (a, b) => b.meta.date.localeCompare(a.meta.date) || b.meta.number - a.meta.number,
  );
}

export async function getWritingPost(
  slug: string,
): Promise<(WritingPost & { Content: ComponentType<MDXProps> }) | null> {
  const slugs = await getWritingSlugs();
  if (!slugs.includes(slug)) return null;
  const mod = (await import(`@/content/writing/${slug}.mdx`)) as {
    default: ComponentType<MDXProps>;
    meta: unknown;
  };
  return {
    slug,
    meta: WritingMeta.parse(mod.meta),
    readingMinutes: estimateReadingMinutes(await readSource(slug)),
    Content: mod.default,
  };
}

/** The h2 headings of a post, for the on-page table of contents. Empty for an unknown slug. */
export async function getHeadings(slug: string): Promise<NoteHeading[]> {
  const slugs = await getWritingSlugs();
  if (!slugs.includes(slug)) return [];
  return extractHeadings(await readSource(slug));
}
