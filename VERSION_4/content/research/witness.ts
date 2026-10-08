import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A. Notes: reasoned from the concept, not stated by
 * the owner. They are listed in CONTENT_REVIEW.md for the owner to confirm, edit or delete. The
 * notes use the same model as content/projects/witness.ts: checks in the order Evidence,
 * Corroboration, Policy, Validation; each returns pass, fail or insufficient; any fail is deny,
 * all pass is allow, insufficient evidence escalates to a person.
 */
export const witnessResearch = {
  slug: "witness",
  title: "WITNESS",
  tagline: "Evidence before autonomous action.",
  abstract:
    "Autonomous agents can generate plausible remediation actions without sufficient evidence that their causal claims are true. WITNESS is a deterministic admission-control layer that checks whether the real environment corroborates a proposed remediation before it executes, separating what an agent claims from what independently observable system state can prove. The aim is to move autonomous security from “the AI thinks this is the problem” to “the environment provides sufficient evidence for this specific action.” Status: research prototype.",
  metaDescription:
    "This research page covers WITNESS, a deterministic admission gate that checks an AI agent’s proposed remediation against observable evidence.",
  notes: [
    "Open question: what counts as independent evidence. An observation is independent only if the agent could not have influenced it, so the evidence boundary matters as much as the checks.",
    "A claim is only checkable if it is specific. “The host is compromised” has to be reduced to observable facts before the environment can corroborate it.",
    "Evidence and corroboration are different questions. Evidence asks whether independently observable evidence exists for a claim. Corroboration asks whether separate sources agree with each other and with the claim. One source can supply evidence, but a single source has nothing to agree with.",
    "Determinism is worth protecting. With fixed inputs and fixed policy the decision should replay identically, which makes it testable and auditable.",
    "Three outcomes carry more information than two. Each check can pass, fail or come back insufficient. Any fail is a deny, and insufficient evidence with no fail is what escalate is for: it goes to a person.",
    "Open question: how stale can evidence be? An allow is only as current as the state it was checked against, so the design re-validates that state when the action executes. How much change between the check and the action should void an allow is not settled.",
    "Corroboration has to come from channels the agent cannot write to. Two reports that share a source are really one report, so the checks look for agreement across independent telemetry channels.",
    "Where a proposed action came from matters. The design keeps a trusted record of how each action was produced, so a decision can be traced back through it.",
    "The decision leaves a tamper-evident record, so an allow or a deny can be checked after the fact.",
    "The prototype is exercised against Microsoft AIOpsLab with local language models, and it fails safe: when the gate cannot decide, the action does not run.",
    "The gate is meant to limit the damage of a wrong agent. It does not make the agent right.",
  ],
  relatedProjects: ["witness"],
  links: {},
  graphNodes: ["ai", "agents", "detection"],
} satisfies ResearchInput;
