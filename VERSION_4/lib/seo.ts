import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Short hash of what the social card is drawn from. The card is a static file at a fixed URL, so a
 * crawler that cached the old picture would keep it. A new `?v=` value is a new URL, so a changed
 * card is fetched again. Read at build time; "1" if a source file cannot be read.
 */
function cardVersion(): string {
  try {
    const hash = createHash("sha256");
    for (const file of ["app/opengraph-image.tsx", "lib/site.ts"]) {
      hash.update(readFileSync(path.join(process.cwd(), file)));
    }
    return hash.digest("hex").slice(0, 8);
  } catch {
    return "1";
  }
}

const OG_IMAGE = {
  url: `${absoluteUrl("/opengraph-image")}?v=${cardVersion()}`,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: `${site.name}. Security Engineer. Detection, cloud security, AI security.`,
};

type MetaInput = {
  /** Page title WITHOUT the site suffix (layout supplies the template). Omit for the home page. */
  title?: string;
  description?: string;
  /** Path with leading and trailing slash, e.g. "/systems/witness/". */
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
};

export function buildMetadata({
  title,
  description = site.description,
  path,
  type = "website",
  publishedTime,
}: MetaInput): Metadata {
  const suffix = ` — ${site.name}`;
  // Search results cut titles at about 60 characters. When the site suffix would push a title past
  // that, show the page title alone instead of letting the useful part be truncated.
  const useSuffix = title !== undefined && title.length + suffix.length <= 60;
  const fullTitle = title ? (useSuffix ? `${title}${suffix}` : title) : site.title;
  return {
    ...(title ? { title: useSuffix ? title : { absolute: title } } : {}),
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type,
      title: fullTitle,
      description,
      url: absoluteUrl(path),
      siteName: site.name,
      locale: "en_US",
      // A page-level `openGraph` replaces the layout's whole object, which drops the file-based
      // image from app/opengraph-image.tsx. Repeat it here so every page has a social card.
      images: [OG_IMAGE],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [
        { url: OG_IMAGE.url, alt: OG_IMAGE.alt, width: OG_IMAGE.width, height: OG_IMAGE.height },
      ],
    },
  };
}

/** Identifier of the owner's Person node. Article and SoftwareSourceCode authors point at it. */
export const PERSON_ID = `${site.url}/#person`;

const authorRef = () => ({ "@type": "Person", "@id": PERSON_ID, name: site.name, url: site.url });

export const personJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  // docs/FACTS.md: the HPE title. "Security Engineer" is positioning and lives in `description`.
  jobTitle: "SOC Analyst",
  description: site.description,
  sameAs: [site.github, site.linkedin, site.hashnode],
  email: `mailto:${site.email}`,
  worksFor: { "@type": "Organization", name: "Hewlett Packard Enterprise" },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Sri Krishna College of Engineering and Technology",
  },
  knowsAbout: [
    "Detection engineering",
    "Security operations",
    "Cloud security",
    "AI security",
    "Incident response",
  ],
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.url,
  description: site.description,
  inLanguage: "en",
});

export const articleJsonLd = (a: {
  title: string;
  description: string;
  date: string;
  path: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: a.title,
  description: a.description,
  datePublished: a.date,
  dateModified: a.date,
  url: absoluteUrl(a.path),
  mainEntityOfPage: absoluteUrl(a.path),
  author: authorRef(),
});

export const softwareJsonLd = (s: {
  name: string;
  description: string;
  path: string;
  codeRepository?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: s.name,
  description: s.description,
  url: absoluteUrl(s.path),
  author: authorRef(),
  ...(s.codeRepository ? { codeRepository: s.codeRepository } : {}),
});
