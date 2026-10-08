import type { ProjectInput } from "./types";

/**
 * Source: the owner's own project summary (docs/FACTS.md section A4). Described qualitatively: the
 * site states no counts or measured results. No architecture, threat model or decisions are written,
 * because none were supplied, so this is an overview page.
 */
export const silentstorm = {
  slug: "silentstorm",
  name: "SilentStorm",
  tier: 2,
  category: "Causal ML / AIOps",
  domain: ["Causal ML", "AIOps", "Networking"],
  tagline: "Causal early warning for network congestion.",
  summary:
    "A model that learns which signals lead congestion and warns before a link saturates.",
  metaDescription:
    "SilentStorm uses causal discovery and a temporal model to find the leading indicators of network congestion and warn before it happens.",
  overview: [
    "SilentStorm looks for the signals that come before congestion, not the congestion itself. Causal discovery over network telemetry narrows many metrics to a small set of precursors, and a bidirectional LSTM with attention uses them to raise a warning ahead of time. It was evaluated on an emulated network fabric, and the write-up records the attack classes it fails on as well as where it works.",
  ],
  flow: ["Network telemetry", "Causal discovery", "Precursor signals", "Early warning"],
  stack: ["Python", "PyTorch", "causal-learn"],
  links: {},
  graphNodes: ["automation", "detection"],
} satisfies ProjectInput;
