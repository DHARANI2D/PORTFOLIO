import { z } from "zod";
import { Certification, Experience, Project, ResearchItem, SkillGroup } from "@/content/schema";
import { projectEntries } from "@/content/projects";
import { researchEntries } from "@/content/research";
import { experienceEntries } from "@/content/experience";
import { skillEntries } from "@/content/skills";
import { certificationEntries } from "@/content/certifications";
import { earlierWork } from "@/content/earlier-work";

/**
 * Typed, build-time-validated accessors. Pages and components read content ONLY through here.
 * A schema violation throws during `next build`, so bad content can never ship.
 */
const projects = z
  .array(Project)
  .parse(projectEntries)
  .sort((a, b) => a.tier - b.tier);
const research = z.array(ResearchItem).parse(researchEntries);
const experience = z.array(Experience).parse(experienceEntries);
const skills = z.array(SkillGroup).parse(skillEntries);
const certifications = z.array(Certification).parse(certificationEntries);

export const getProjects = () => projects;
export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
export const getProjectsByTier = (tier: 1 | 2 | 3) => projects.filter((p) => p.tier === tier);
export const getResearch = () => research;
export const getResearchItem = (slug: string) => research.find((r) => r.slug === slug);
export const getExperience = () => experience;
export const getSkills = () => skills;
export const getCertifications = () => certifications;
export const getEarlierWork = () => earlierWork;

/** Real, content-derived numbers for the engineering-activity panel. Never hard-code these. */
export const getMetrics = () => ({
  systems: projects.length,
  flagship: projects.filter((p) => p.tier === 1).length,
  research: research.length,
  certificationsVerified: certifications.filter((c) => c.status === "verified").length,
  earlierProjects: earlierWork.length,
});
