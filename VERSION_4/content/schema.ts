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

/** One node of an architecture diagram. Positioned on a simple integer grid (col,row). */
export const ArchNode = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string(),
  sublabel: z.string().optional(),
  kind: z.enum(["source", "process", "gate", "output", "actor"]),
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  input: z.string().optional(),
  process: z.string().optional(),
  output: z.string().optional(),
  trustBoundary: z.string().optional(),
});
export type ArchNode = z.infer<typeof ArchNode>;

export const ArchDiagram = z.object({
  nodes: z.array(ArchNode).min(2),
  edges: z.array(z.tuple([z.string(), z.string()])),
  /** Named trust boundaries drawn as dashed groups around node ids. */
  boundaries: z
    .array(z.object({ id: z.string(), label: z.string(), nodeIds: z.array(z.string()).min(1) }))
    .default([]),
  caption: z.string().optional(),
});
export type ArchDiagram = z.infer<typeof ArchDiagram>;

export const ThreatModel = z.object({
  assets: z.array(z.string()),
  attackSurface: z.array(z.string()),
  trustBoundaries: z.array(z.string()),
  threatActors: z.array(z.string()),
  assumptions: z.array(z.string()),
  failureModes: z.array(z.string()),
  controls: z.array(z.string()),
});
export type ThreatModel = z.infer<typeof ThreatModel>;

export const Project = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  /** 1 = flagship, 2 = major, 3 = supporting. Drives visual weight. */
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  category: z.string(),
  /** Only set when known (e.g. "Research / Prototype"). Never invent a status. */
  status: z.string().optional(),
  domain: z.array(z.string()),
  /** Layer 1 — 3 seconds. One short line. */
  tagline: z.string(),
  /** Layer 2 — 30 seconds. One or two sentences on why it matters. */
  summary: z.string(),
  /** Layer 3 — 5 minutes. Body paragraphs for the case-study page. */
  overview: z.array(z.string()).default([]),
  problem: z.array(z.string()).default([]),
  /** Short pipeline shown on cards, e.g. ["SIEM / IDS / EDR / Threat Intel", "Correlation engine", ...]. */
  flow: z.array(z.string()).min(2),
  stack: z.array(z.string()).default([]),
  architecture: ArchDiagram.optional(),
  threatModel: ThreatModel.optional(),
  decisions: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  security: z.array(z.string()).default([]),
  /** Only add links that are real. Omit anything unknown. */
  links: z
    .object({ github: z.url().optional(), paper: z.url().optional(), demo: z.url().optional() })
    .default({}),
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

export const ResearchItem = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  tagline: z.string(),
  abstract: z.string(),
  notes: z.array(z.string()).default([]),
  /** Slugs of related /systems entries. */
  relatedProjects: z.array(z.string()).default([]),
  links: z.object({ github: z.url().optional(), paper: z.url().optional() }).default({}),
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
