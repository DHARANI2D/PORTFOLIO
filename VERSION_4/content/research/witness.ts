import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A. Notes: reasoned from the concept, not stated by
 * the owner. They are listed in CONTENT_REVIEW.md for the owner to confirm, edit or delete.
 */
export const witnessResearch = {
  slug: "witness",
  title: "WITNESS",
  tagline: "Evidence before autonomous action.",
  abstract:
    "Autonomous agents can generate plausible remediation actions without sufficient evidence that their causal claims are true. WITNESS is a deterministic admission-control layer that checks whether the real environment corroborates a proposed remediation before it executes, separating what an agent claims from what independently observable system state can prove. The aim is to move autonomous security from “the AI thinks this is the problem” to “the environment provides sufficient evidence for this specific action.” Status: research prototype.",
  notes: [
    "Open question: what counts as independent evidence. An observation is independent only if the agent cannot influence it, so the evidence boundary matters as much as the checks.",
    "A claim is only checkable if it is specific. “The host is compromised” has to be reduced to observable facts before the environment can corroborate it.",
    "Determinism is worth protecting. With fixed inputs and fixed policy the decision should replay identically, which makes it testable and auditable.",
    "Three outcomes carry more information than two. Escalate is the honest answer when the evidence neither supports nor contradicts the action.",
    "The gate bounds the damage of a wrong agent. It does not make the agent right.",
  ],
  relatedProjects: ["witness"],
  links: {},
  graphNodes: ["ai", "agents", "detection"],
} satisfies ResearchInput;
