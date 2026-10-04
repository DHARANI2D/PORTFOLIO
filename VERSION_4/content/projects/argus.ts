import type { ProjectInput } from "./types";

/**
 * Tier 2. Section A of docs/FACTS.md gives only the one-line description and the domain, so this
 * entry carries no architecture, threat model or decisions. Adding any would be inventing them.
 */
export const argus = {
  slug: "argus",
  name: "ARGUS",
  tier: 2,
  category: "DFIR & Malware",
  domain: ["DFIR", "Malware", "AI"],
  tagline: "Agentic autonomous malware analysis.",
  summary: "Autonomous agents applied to malware analysis, in the DFIR, malware and AI domains.",
  overview: [
    "ARGUS is an agentic, autonomous malware analysis system.",
    "This page is intentionally short. No implementation detail is published here.",
  ],
  flow: ["Malware sample", "Autonomous agents", "Analysis"],
  stack: [],
  links: {},
  graphNodes: ["dfir", "ai", "agents"],
} satisfies ProjectInput;
