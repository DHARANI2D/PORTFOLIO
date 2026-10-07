import "server-only";
import {
  getCertifications,
  getExperience,
  getMetrics,
  getProjects,
  getResearch,
  getSkills,
} from "@/lib/content";
import { site } from "@/lib/site";
import type { TerminalData } from "@/lib/terminal-commands";

/**
 * The data the terminal prints from, as plain serialisable values.
 *
 * Built on the server (components/terminal/terminal.tsx calls this while the page is exported) from
 * the content accessors, so the zod validation has already run at build time and none of it, nor
 * the full case-study text, reaches the browser. The client dialog receives the result as props.
 *
 * Only the fields the commands print are copied: this object is embedded in every page's payload,
 * so a field that nothing reads would be bytes on every page for no reason.
 */
export function buildTerminalData(): TerminalData {
  return {
    projects: getProjects().map(({ slug, name, tier, tagline, graphNodes }) => ({
      slug,
      name,
      tier,
      tagline,
      graphNodes,
    })),
    research: getResearch().map(({ slug, title, tagline, graphNodes }) => ({
      slug,
      title,
      tagline,
      graphNodes,
    })),
    experience: getExperience().map(
      ({ id, org, role, team, start, end, current, summary, bullets }) => ({
        id,
        org,
        role,
        team,
        start,
        end,
        current,
        summary,
        bullets,
      }),
    ),
    skills: getSkills().map(({ title, items }) => ({ title, items })),
    certifications: getCertifications().map(({ name, status, year }) => ({ name, status, year })),
    metrics: getMetrics(),
    site: {
      name: site.name,
      brand: site.brand,
      description: site.description,
      location: site.location,
      availability: site.availability,
      email: site.email,
      github: site.github,
      linkedin: site.linkedin,
      hashnode: site.hashnode,
      resumeDownload: site.resumeDownload,
    },
  };
}
