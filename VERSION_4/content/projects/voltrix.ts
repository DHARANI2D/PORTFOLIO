import type { ProjectInput } from "./types";

/**
 * Tier 2. Section A of docs/FACTS.md gives only the one-line description and the domain, so this
 * entry carries no architecture, threat model or decisions. Adding any would be inventing them.
 */
export const voltrix = {
  slug: "voltrix",
  name: "Voltrix",
  tier: 2,
  category: "DFIR & Automation",
  domain: ["DFIR", "Agents", "Automation"],
  tagline: "An AI-driven incident response platform.",
  summary: "Incident response driven by AI, across the DFIR, agents and automation domains.",
  overview: [
    "Voltrix is an AI-driven incident response platform.",
    "This page is intentionally short. No implementation detail is published here.",
  ],
  flow: ["Incident", "Agents", "Automated response"],
  stack: [],
  links: {},
  graphNodes: ["dfir", "agents", "automation"],
} satisfies ProjectInput;
