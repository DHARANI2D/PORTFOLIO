import type { ProjectInput } from "./types";

/**
 * Tier 2. Section A of docs/FACTS.md gives only the one-line description and the domain, so this
 * entry carries no architecture, threat model or decisions. Adding any would be inventing them.
 * The overview is one paragraph that places ARGUS next to Voltrix and the AI DFIR research
 * direction, and says nothing about how ARGUS works.
 */
export const argus = {
  slug: "argus",
  name: "ARGUS",
  tier: 2,
  category: "DFIR & Malware",
  domain: ["DFIR", "Malware", "AI"],
  tagline: "Agentic autonomous malware analysis.",
  summary: "Autonomous agents applied to malware analysis, in the DFIR, malware and AI domains.",
  metaDescription:
    "ARGUS is an agentic, autonomous malware analysis system in the DFIR, malware and AI domains.",
  overview: [
    "ARGUS is one of two DFIR systems on this site, with Voltrix: ARGUS on the analysis side, Voltrix on the response side. The AI DFIR research direction, agentic incident-response architecture, is the wider question they sit under.",
  ],
  flow: ["Malware sample", "Autonomous agents", "Analysis"],
  stack: [],
  links: {},
  graphNodes: ["dfir", "ai", "agents"],
} satisfies ProjectInput;
