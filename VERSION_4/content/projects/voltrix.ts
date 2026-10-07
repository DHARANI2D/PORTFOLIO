import type { ProjectInput } from "./types";

/**
 * Tier 2. Section A of docs/FACTS.md gives only the one-line description and the domain, so this
 * entry carries no architecture, threat model or decisions. Adding any would be inventing them.
 * The overview is one paragraph that places Voltrix next to ARGUS and the AI DFIR research
 * direction, and says nothing about how Voltrix works.
 */
export const voltrix = {
  slug: "voltrix",
  name: "Voltrix",
  tier: 2,
  category: "DFIR & Automation",
  domain: ["DFIR", "Agents", "Automation"],
  tagline: "An AI-driven incident response platform.",
  summary: "Incident response driven by AI, across the DFIR, agents and automation domains.",
  metaDescription:
    "Voltrix is an AI-driven incident response platform in the DFIR, agents and automation domains.",
  overview: [
    "Voltrix is the response side of the two DFIR systems on this site, next to ARGUS, which covers malware analysis. The AI DFIR research direction, agentic incident-response architecture, is the wider question they sit under.",
  ],
  flow: ["Incident", "Agents", "Automated response"],
  stack: [],
  links: {},
  graphNodes: ["dfir", "agents", "automation"],
} satisfies ProjectInput;
