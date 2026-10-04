import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "@/components/seo/json-ld";
import { getProjects, getResearch } from "@/lib/content";
import {
  absoluteUrl,
  articleJsonLd,
  buildMetadata,
  personJsonLd,
  softwareJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { primaryNav, site } from "@/lib/site";

/** JSON round trip: fails if a builder leaves `undefined` or a non-serialisable value in the data. */
const plain = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;

describe("site", () => {
  it("has a canonical origin without a trailing slash", () => {
    expect(site.url).toMatch(/^https?:\/\/[^/]+$/);
    expect(site.url.endsWith("/")).toBe(false);
  });

  it("keeps navigation paths in the trailing-slash form the static export serves", () => {
    for (const item of primaryNav) expect(item.href).toMatch(/^\/[a-z-]+\/$/);
  });
});

describe("absoluteUrl", () => {
  it("prefixes the origin and adds a missing leading slash", () => {
    expect(absoluteUrl("/systems/")).toBe(`${site.url}/systems/`);
    expect(absoluteUrl("systems/")).toBe(`${site.url}/systems/`);
    expect(absoluteUrl()).toBe(`${site.url}/`);
  });
});

describe("buildMetadata", () => {
  it("builds an absolute canonical with a trailing slash", () => {
    const meta = buildMetadata({ title: "Systems", path: "/systems/" });
    expect(meta.alternates?.canonical).toBe(`${site.url}/systems/`);
    expect(String(meta.alternates?.canonical)).toMatch(/^https?:\/\/.+\/$/);
  });

  it("keeps the canonical and the Open Graph URL identical", () => {
    const meta = buildMetadata({ title: "About", path: "/about/" });
    expect(meta.openGraph).toMatchObject({ url: `${site.url}/about/`, siteName: site.name });
  });

  it("leaves the layout template to add the site name, but spells it out for social cards", () => {
    const meta = buildMetadata({ title: "Systems", path: "/systems/" });
    expect(meta.title).toBe("Systems");
    expect(meta.openGraph).toMatchObject({ title: `Systems — ${site.name}` });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: `Systems — ${site.name}`,
    });
  });

  it("uses the site title and description for the home page", () => {
    const meta = buildMetadata({ path: "/" });
    expect(meta.title).toBeUndefined();
    expect(meta.description).toBe(site.description);
    expect(meta.openGraph).toMatchObject({ title: site.title });
  });

  it("marks articles with their publication time", () => {
    const meta = buildMetadata({
      title: "Note",
      path: "/writing/note/",
      type: "article",
      publishedTime: "2026-09-20",
    });
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-09-20" });
    expect(buildMetadata({ title: "Page", path: "/p/" }).openGraph).not.toHaveProperty(
      "publishedTime",
    );
  });

  it("gives every system and research page a canonical that ends in a slash", () => {
    const paths = [
      ...getProjects().map((p) => `/systems/${p.slug}/`),
      ...getResearch().map((r) => `/research/${r.slug}/`),
    ];
    for (const path of paths) {
      expect(String(buildMetadata({ title: "x", path }).alternates?.canonical)).toBe(
        `${site.url}${path}`,
      );
    }
  });
});

describe("JSON-LD", () => {
  it("person: identity, links and employer, with no street address or phone", () => {
    const person = personJsonLd();
    expect(person).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: site.name,
      url: site.url,
      jobTitle: "Security Engineer",
    });
    expect(person.sameAs).toEqual([site.github, site.linkedin, site.hashnode]);
    for (const link of person.sameAs) expect(link).toMatch(/^https:\/\//);
    expect(person.email).toBe(`mailto:${site.email}`);
    // docs/FACTS.md section C: no city-level location, no other private details.
    expect(person).not.toHaveProperty("address");
    expect(person).not.toHaveProperty("telephone");
    expect(person).not.toHaveProperty("birthDate");
    expect(plain(person)).toEqual(person);
  });

  it("website", () => {
    expect(websiteJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: site.url,
      inLanguage: "en",
    });
    expect(plain(websiteJsonLd())).toEqual(websiteJsonLd());
  });

  it("article: dated, absolute URLs, authored by the owner", () => {
    const article = articleJsonLd({
      title: "T",
      description: "D",
      date: "2026-09-20",
      path: "/writing/t/",
    });
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "T",
      datePublished: "2026-09-20",
      url: `${site.url}/writing/t/`,
      mainEntityOfPage: `${site.url}/writing/t/`,
      author: { "@type": "Person", name: site.name },
    });
    expect(plain(article)).toEqual(article);
  });

  it("software: includes a repository only when one is given", () => {
    const base = { name: "N", description: "D", path: "/systems/n/" };
    expect(softwareJsonLd(base)).not.toHaveProperty("codeRepository");
    expect(softwareJsonLd({ ...base, codeRepository: "https://github.com/x/y" })).toMatchObject({
      "@type": "SoftwareSourceCode",
      codeRepository: "https://github.com/x/y",
    });
    expect(plain(softwareJsonLd(base))).toEqual(softwareJsonLd(base));
  });
});

describe("<JsonLd>", () => {
  it("renders a non-executable data block", () => {
    const markup = renderToStaticMarkup(<JsonLd data={{ "@type": "Person", name: "A" }} />);
    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain('"name":"A"');
  });

  it("escapes < so data can never close the script element or open another", () => {
    const markup = renderToStaticMarkup(
      <JsonLd data={{ name: "</script><script>alert(1)</script><!--" }} />,
    );
    expect(markup).not.toContain("</script><script>");
    expect(markup).not.toContain("<!--");
    expect(markup).toContain("\\u003c/script>");
    // The block still parses back to the original value.
    const body = /<script[^>]*>([\s\S]*)<\/script>/.exec(markup)?.[1] ?? "";
    expect((JSON.parse(body) as { name: string }).name).toBe(
      "</script><script>alert(1)</script><!--",
    );
  });
});
