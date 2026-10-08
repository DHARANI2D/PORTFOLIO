import { z } from "zod";

/**
 * Content model. All portfolio content lives in /content as typed data (projects, research,
 * experience, skills, certifications) or MDX (writing) and is validated with these schemas at
 * build time. Components never hard-code project facts.
 */

/** Nodes of the ambient "security graph". Pages/sections activate subsets of them. */
export const graphNodeIds = [
  "soc",
  "detection",
  "cloud",
  "ai",
  "dfir",
  "agents",
  "automation",
] as const;
export const GraphNodeId = z.enum(graphNodeIds);
export type GraphNodeId = z.infer<typeof GraphNodeId>;

/**
 * A system is a card: its name, one line, the domains it sits in and, when it is known, a status.
 * There are no case studies, architecture diagrams or threat models on the site, and nothing in
 * the schema to hold them: how a system works is not published, so it cannot be copied from here.
 */
export const Project = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  category: z.string(),
  /** Only set when known (e.g. "In development"). Never invent a status. */
  status: z.string().optional(),
  domain: z.array(z.string()),
  tagline: z.string(),
  graphNodes: z.array(GraphNodeId).default([]),
});
export type Project = z.infer<typeof Project>;

export const Experience = z.object({
  id: z.string(),
  org: z.string(),
  role: z.string(),
  team: z.string().optional(),
  start: z.string(),
  /** Omit for current roles. */
  end: z.string().optional(),
  current: z.boolean().default(false),
  summary: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type Experience = z.infer<typeof Experience>;

export const SkillGroup = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(z.string()),
  /** Optional drill-down shown when the group is opened. */
  depth: z.array(z.string()).default([]),
});
export type SkillGroup = z.infer<typeof SkillGroup>;

export const Certification = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  status: z.enum(["verified", "in-progress", "planned"]),
  year: z.string().optional(),
  url: z.url().optional(),
});
export type Certification = z.infer<typeof Certification>;

/**
 * A research entry is a name, nothing more. The site shows the title and whether it is a paper or
 * a direction. No abstract, notes or tagline are stored: research is not published in detail, so
 * there is nothing for the site (or its assistant) to show, and nothing to copy from it.
 */
export const ResearchItem = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** A written-up paper, or a research direction that has no paper yet. Drives grouping on the home page. */
  kind: z.enum(["paper", "direction"]).default("paper"),
  graphNodes: z.array(GraphNodeId).default([]),
});
export type ResearchItem = z.infer<typeof ResearchItem>;

/** Exported from each content/writing/*.mdx as `export const meta = {...}`. */
export const WritingMeta = z.object({
  title: z.string(),
  summary: z.string(),
  /** ISO date, YYYY-MM-DD. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string()).default([]),
  /** Field-note number, e.g. 1 -> "FIELD NOTE / 001". */
  number: z.number().int().positive(),
});
export type WritingMeta = z.infer<typeof WritingMeta>;
