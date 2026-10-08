import type { ResearchInput } from "./types";

/**
 * Source: the owner's own description of SilentStorm (docs/FACTS.md section A4). Restated
 * qualitatively; measured results are left out on purpose (the site states none). Notes: reasoned
 * from the method, listed in CONTENT_REVIEW.md for the owner to confirm, edit or delete.
 */
export const silentstormResearch = {
  slug: "silentstorm",
  title: "SilentStorm",
  tagline: "Causal early warning for network congestion.",
  abstract:
    "Network operations usually respond to congestion after it has started. SilentStorm asks which signals lead it. Causal discovery over telemetry separates real precursors from metrics that merely move together, and a temporal model built on those precursors raises a warning before a link saturates. The method runs from causal discovery to feature reduction to temporal prediction to early-warning evaluation, and the write-up records the attack classes it does not handle.",
  metaDescription:
    "SilentStorm is research on causal early warning: causal discovery finds the signals that lead network congestion and a temporal model warns ahead.",
  notes: [
    "Correlation is not enough for an early warning. A metric that rises with congestion because both have the same cause gives no lead time, so the method asks which signals actually come first.",
    "Reducing many metrics to a few causal precursors makes the predictor smaller, and makes its warning explainable in terms an operator can check.",
    "The warning is only useful if it comes early enough to act on, so lead time is evaluated alongside accuracy.",
    "Reporting where it fails is part of the result. The work records attack classes the model has not seen and does not claim to cover them.",
    "The same shape applies to security telemetry: find the signals that lead an incident, not the ones that follow it.",
  ],
  relatedProjects: ["silentstorm"],
  links: {},
  graphNodes: ["automation", "detection"],
} satisfies ResearchInput;
