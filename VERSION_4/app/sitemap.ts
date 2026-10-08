import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getWritingPosts } from "@/lib/writing";

// Static export: this file is rendered once at build time into out/sitemap.xml.
export const dynamic = "force-static";

/** Pages that exist regardless of content. The home page holds every section, so it is one entry. Slugs are listed with the trailing slash the site uses. */
const STATIC_PATHS = [
  "/",
  "/resume/",
  "/privacy/",
  "/security/",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getWritingPosts();

  return [
    // No lastModified for pages whose content has no date: a build timestamp would claim every
    // page changed on every deploy, which makes the field useless to crawlers.
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/writing/${post.slug}/`),
      lastModified: post.meta.date,
    })),
  ];
}
