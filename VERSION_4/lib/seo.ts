import type { Metadata } from "next";
import { site } from "@/lib/site";

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

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
  const fullTitle = title ? `${title} — ${site.name}` : site.title;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type,
      title: fullTitle,
      description,
      url: absoluteUrl(path),
      siteName: site.name,
      locale: "en",
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export const personJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  jobTitle: "Security Engineer",
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
  author: { "@type": "Person", name: site.name, url: site.url },
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
  author: { "@type": "Person", name: site.name, url: site.url },
  ...(s.codeRepository ? { codeRepository: s.codeRepository } : {}),
});
