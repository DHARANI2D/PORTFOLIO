import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { ComponentType } from "react";
import { WritingMeta } from "@/content/schema";

const DIR = path.join(process.cwd(), "content", "writing");

export type WritingPost = {
  slug: string;
  meta: WritingMeta;
  readingMinutes: number;
};

export async function getWritingSlugs(): Promise<string[]> {
  const files = await fs.readdir(DIR).catch(() => [] as string[]);
  return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
}

async function readingMinutes(slug: string) {
  const raw = await fs.readFile(path.join(DIR, `${slug}.mdx`), "utf8");
  const words = raw
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
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
        readingMinutes: await readingMinutes(slug),
      };
    }),
  );
  return posts.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}

export async function getWritingPost(
  slug: string,
): Promise<(WritingPost & { Content: ComponentType }) | null> {
  const slugs = await getWritingSlugs();
  if (!slugs.includes(slug)) return null;
  const mod = (await import(`@/content/writing/${slug}.mdx`)) as {
    default: ComponentType;
    meta: unknown;
  };
  return {
    slug,
    meta: WritingMeta.parse(mod.meta),
    readingMinutes: await readingMinutes(slug),
    Content: mod.default,
  };
}
