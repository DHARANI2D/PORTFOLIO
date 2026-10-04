import type { ProjectInput } from "./types";

/**
 * Tier 3. Section A of docs/FACTS.md gives only the expansion of the name, so this entry carries
 * no architecture, threat model or decisions. The flow restates the words of the name.
 */
export const desas = {
  slug: "desas",
  name: "DESAS",
  tier: 3,
  category: "Email Security",
  domain: ["Email", "Sandbox", "Analysis"],
  tagline: "Dynamic Email Sandbox Analysis System.",
  summary: "Analyzes email in a dynamic sandbox.",
  overview: [
    "DESAS is the Dynamic Email Sandbox Analysis System.",
    "This page is intentionally short. No implementation detail is published here.",
  ],
  flow: ["Email", "Sandbox", "Analysis"],
  stack: [],
  links: {},
  graphNodes: ["detection", "dfir"],
} satisfies ProjectInput;
