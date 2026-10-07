import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A. Notes: reasoned from the concept, not stated by
 * the owner. They are listed in CONTENT_REVIEW.md for the owner to confirm, edit or delete.
 */
export const secureModelGate = {
  slug: "securemodelgate",
  title: "SecureModelGate",
  tagline: "Runtime security enforcement for AI systems.",
  abstract:
    "SecureModelGate is a security enforcement architecture that controls AI model and agent interactions through deterministic policy, trust boundaries and runtime verification. It treats AI security as an enforcement problem, not only a safety discussion.",
  metaDescription:
    "SecureModelGate is a research item on runtime security enforcement for AI systems, using deterministic policy, trust boundaries and runtime verification.",
  notes: [
    "Enforcement happens at runtime, at the interaction between a model or agent and what it touches, because that is where an unsafe action becomes real.",
    "A safety discussion asks what a model should do. Enforcement asks what it is able to do. The second question has an answer that can be checked.",
    "Deterministic policy is the point. A rule enforced the same way every time can be tested, reviewed and audited. A probabilistic safeguard is harder to test in the same way.",
    "Trust boundaries have to be explicit. An interaction that crosses one needs a verifiable reason to be allowed.",
    "Shares a premise with AEGIS and WITNESS: control sits outside the model, at the point where action happens.",
  ],
  relatedProjects: ["aegis", "witness"],
  links: {},
  graphNodes: ["ai", "agents"],
} satisfies ResearchInput;
