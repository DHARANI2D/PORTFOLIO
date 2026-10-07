import type { ProjectInput } from "./types";

/**
 * Tier 3. Section A of docs/FACTS.md gives only the expansion of the name, so this entry carries
 * no architecture, threat model or decisions. The flow restates the words of the name. The
 * overview is one paragraph that places DESAS among the systems and defines the technique the name
 * refers to in general terms. It says nothing about how DESAS works.
 */
export const desas = {
  slug: "desas",
  name: "DESAS",
  tier: 3,
  category: "Email Security",
  domain: ["Email", "Sandbox", "Analysis"],
  tagline: "Dynamic Email Sandbox Analysis System.",
  summary: "Analyzes email in a dynamic sandbox.",
  metaDescription:
    "DESAS is the Dynamic Email Sandbox Analysis System, an email security system that analyzes email in a dynamic sandbox.",
  overview: [
    "DESAS is the email security system on this site. Dynamic analysis, as a general technique, observes what content does when it runs in an isolated environment, instead of only inspecting it, which is the idea the name points to.",
  ],
  flow: ["Email", "Sandbox", "Analysis"],
  stack: [],
  links: {},
  graphNodes: ["detection", "dfir"],
} satisfies ProjectInput;
