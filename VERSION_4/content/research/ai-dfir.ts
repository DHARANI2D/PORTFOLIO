import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A (a research direction, no papers). Notes:
 * reasoned from the concept, not stated by the owner. They are listed in CONTENT_REVIEW.md for the
 * owner to confirm, edit or delete.
 */
export const aiDfir = {
  slug: "ai-dfir",
  title: "AI DFIR",
  tagline: "Agentic incident-response architecture.",
  abstract:
    "A research direction on agentic architecture for incident response: how autonomous agents could take part in digital forensics and incident response. It is a direction, not a published result.",
  notes: [
    "Incident response is a sequence of decisions under time pressure. An agentic design has to say which steps are safe to automate and which need a person, and that boundary moves with the cost of being wrong.",
    "Evidence handling constrains the design. An agent that touches a system during an investigation can change what it is investigating.",
    "An investigation has to be reconstructable afterwards, so auditability matters as much as speed.",
    "An agent that proposes containment is making a remediation claim. That is the question WITNESS is built around.",
  ],
  relatedProjects: ["voltrix", "argus", "witness"],
  links: {},
  graphNodes: ["dfir", "agents", "ai"],
} satisfies ResearchInput;
