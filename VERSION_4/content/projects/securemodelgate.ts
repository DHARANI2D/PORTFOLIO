import type { ProjectInput } from "./types";

/**
 * Source: the owner's own project summary (docs/FACTS.md section A4). Described qualitatively: the
 * site states no counts or measured results. No architecture, threat model or decisions are written,
 * because none were supplied, so this is an overview page.
 */
export const secureModelGateProject = {
  slug: "securemodelgate",
  name: "SecureModelGate",
  tier: 2,
  category: "AI Security",
  domain: ["AI Security", "Model Supply Chain", "Kubernetes"],
  tagline: "Pre-deployment attestation for ML models.",
  summary:
    "A gate that checks a model's integrity and behaviour before it may enter a Kubernetes environment.",
  metaDescription:
    "SecureModelGate attests ML models before deployment with weight analysis and behavioural fingerprints, enforced by a Kubernetes admission webhook.",
  overview: [
    "SecureModelGate inspects a model before it is trusted. It analyses the weights statistically and compares the model's behavioural fingerprint with a clean reference, so a backdoor that stays quiet on ordinary inputs can still show. A model that passes receives a signed attestation token, and a Kubernetes admission webhook refuses any model without one. It was evaluated on image-classification models, clean and backdoored, with several trigger types. The research behind it is on the research page of the same name.",
  ],
  flow: ["Model", "Weight analysis", "Behavioural fingerprint", "Attestation token", "Admission webhook"],
  stack: ["PyTorch", "Kubernetes", "JWT"],
  links: {},
  graphNodes: ["ai", "automation"],
} satisfies ProjectInput;
