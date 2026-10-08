import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A and the owner's SecureModelGate paper (measured
 * results omitted on purpose, the site states none). Notes: reasoned from the concept, not stated by
 * the owner. They are listed in CONTENT_REVIEW.md for the owner to confirm, edit or delete.
 */
export const secureModelGate = {
  slug: "securemodelgate",
  title: "SecureModelGate",
  tagline: "Runtime security enforcement for AI systems.",
  abstract:
    "AI models are routinely imported from public hubs and third parties with no systematic integrity check before deployment. SecureModelGate is a pre-deployment attestation pipeline: it inspects model weights statistically and probes model behaviour against a clean reference, then issues a cryptographically signed Model Attestation Token that a Kubernetes admission webhook requires before a model may run. A Model Bill of Materials records what was admitted. It treats AI security as an enforcement problem, not only a safety discussion. Written up as a research paper.",
  metaDescription:
    "SecureModelGate is a research paper on AI model attestation: signed tokens and a Kubernetes admission webhook that block untrusted models.",
  notes: [
    "Enforcement happens at runtime, at the interaction between a model or agent and what it touches, because that is where an unsafe action becomes real.",
    "A safety discussion asks what a model should do. Enforcement asks what it is able to do. The second question has an answer that can be checked.",
    "Deterministic policy is the point. A rule enforced the same way every time can be tested, reviewed and audited. A probabilistic safeguard is harder to test in the same way.",
    "Trust boundaries have to be explicit. An interaction that crosses one needs a verifiable reason to be allowed.",
    "The mechanism is attestation. A model earns a signed token by passing two independent looks: a static look at its weights and a behavioural look at how it responds. Deployment policy then refuses any model without a valid token.",
    "Backdoored models are the threat being designed for: a model can look normal on clean inputs and misbehave on a trigger, so integrity has to be checked before the model is trusted, not after it is running.",
    "A Model Bill of Materials turns admission into a record. What was admitted, by which check and when is something a governance review can read.",
    "Shares a premise with WITNESS: control sits outside the model, at the point where action happens.",
  ],
  relatedProjects: ["securemodelgate", "witness"],
  links: {},
  graphNodes: ["ai", "agents"],
} satisfies ResearchInput;
