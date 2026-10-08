import "server-only";
import { devtoPosts } from "@/content/devto";
import {
  getCertifications,
  getExperience,
  getProjects,
  getResearch,
  getSkills,
} from "@/lib/content";
import type { KnowledgeDoc } from "@/lib/assistant";
import { site } from "@/lib/site";
import { getWritingPosts } from "@/lib/writing";

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/**
 * Every document the terminal assistant can answer from, built from the validated content at export
 * time and served as /knowledge.json (app/knowledge.json/route.ts). The browser fetches it the
 * first time a question is asked, so it is in no page's payload. Nothing here is written by hand:
 * if the content changes, the answers change with it.
 */
export async function buildKnowledge(): Promise<KnowledgeDoc[]> {
  const experience = getExperience();
  const current = experience.find((entry) => entry.current);
  const posts = await getWritingPosts();

  const about: KnowledgeDoc = {
    id: "about",
    title: site.name,
    kind: "about",
    text: [
      sentence(site.description),
      current
        ? sentence(`Currently ${current.role} at ${current.org}${current.team ? `, ${current.team}` : ""}`)
        : "",
      sentence(`Based in ${site.location}. Open to global roles`),
      sentence(site.headline.replace(/\.$/, "")),
    ]
      .filter(Boolean)
      .join("\n"),
    open: "about",
  };

  const projects: KnowledgeDoc[] = getProjects().map((project) => ({
    id: `project:${project.slug}`,
    title: project.name,
    kind: "project",
    text: [
      sentence(project.tagline),
      sentence(project.summary),
      ...project.overview,
      project.status ? sentence(`Status: ${project.status}`) : "",
      sentence(`Domain: ${project.domain.join(", ")}`),
      project.stack.length > 0 ? sentence(`Stack: ${project.stack.join(", ")}`) : "",
    ]
      .filter(Boolean)
      .join("\n"),
    open: `open ${project.slug}`,
  }));

  const research: KnowledgeDoc[] = getResearch().map((item) => ({
    id: `research:${item.slug}`,
    title: item.title,
    kind: "research",
    text: [sentence(item.tagline), item.abstract].join("\n"),
    open: `open ${item.slug}`,
  }));

  const roles: KnowledgeDoc[] = experience.map((entry) => ({
    id: `experience:${entry.id}`,
    title: entry.org,
    kind: "experience",
    text: [
      sentence(`${entry.role}${entry.team ? `, ${entry.team}` : ""}`),
      sentence(`${entry.start}${entry.end ? ` to ${entry.end}` : entry.current ? " to present" : ""}`),
      entry.summary ? sentence(entry.summary) : "",
      ...entry.bullets.map(sentence),
    ]
      .filter(Boolean)
      .join("\n"),
    open: "experience",
  }));

  const skills: KnowledgeDoc[] = getSkills().map((group) => ({
    id: `skills:${group.id}`,
    title: group.title,
    kind: "skills",
    text: sentence(`${group.title}: ${[...group.items, ...group.depth].join(", ")}`),
    open: "skills",
  }));

  const certs = getCertifications();
  const earned = certs.filter((cert) => cert.status === "verified");
  const next = certs.filter((cert) => cert.status !== "verified");
  const certifications: KnowledgeDoc = {
    id: "certifications",
    title: "Certifications",
    kind: "certifications",
    text: [
      sentence(`Earned: ${earned.map((cert) => cert.name).join("; ")}`),
      next.length > 0 ? sentence(`Planned, not earned yet: ${next.map((cert) => cert.name).join("; ")}`) : "",
    ]
      .filter(Boolean)
      .join("\n"),
    open: "certifications",
  };

  const writing: KnowledgeDoc[] = [
    ...posts.map((post) => ({
      id: `writing:${post.slug}`,
      title: post.meta.title,
      kind: "writing" as const,
      text: sentence(post.meta.summary),
      open: `open ${post.slug}`,
    })),
    ...devtoPosts.map((post) => ({
      id: `devto:${post.url}`,
      title: post.title,
      kind: "writing" as const,
      text: [sentence(post.summary), `Published on DEV: ${post.url}`].join("\n"),
    })),
  ];

  const contact: KnowledgeDoc = {
    id: "contact",
    title: "Contact",
    kind: "contact",
    text: [
      `Email: ${site.email}`,
      `LinkedIn: ${site.linkedin}`,
      `GitHub: ${site.github}`,
      `DEV: ${site.devto}`,
      `Resume: ${site.resumeDownload}`,
      sentence(`${site.availability.toLowerCase()}. Open to global roles`),
    ].join("\n"),
    open: "contact",
  };

  return [about, ...projects, ...research, ...roles, ...skills, certifications, ...writing, contact];
}
