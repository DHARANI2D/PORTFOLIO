import {
  getCertifications,
  getExperience,
  getMetrics,
  getProjects,
  getResearch,
  getSkills,
} from "@/lib/content";
import { site } from "@/lib/site";
import type { TerminalContext } from "@/lib/terminal-commands";

// Re-exported so the interpreter loads in the same lazy chunk as the data it prints.
export { runCommand } from "@/lib/terminal-commands";

/**
 * Builds the data the terminal prints from. This module is the only place the terminal touches
 * lib/content.ts (which pulls in zod and every case study), and it is only ever reached through a
 * dynamic import the first time the terminal opens, so none of it ships with the initial page JS.
 */
export function createTerminalContext(): TerminalContext {
  return {
    projects: getProjects(),
    research: getResearch(),
    experience: getExperience(),
    skills: getSkills(),
    certifications: getCertifications(),
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
