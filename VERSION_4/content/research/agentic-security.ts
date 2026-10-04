import type { ResearchInput } from "./types";

/**
 * Abstract: restated from docs/FACTS.md section A (a research direction, no papers). Notes:
 * reasoned from the concept, not stated by the owner. They are listed in CONTENT_REVIEW.md for the
 * owner to confirm, edit or delete.
 */
export const agenticSecurity = {
  slug: "agentic-security",
  title: "Agentic Security",
  tagline: "Autonomous security agents, and trustworthy AI remediation.",
  abstract:
    "A research direction on autonomous security agents and trustworthy AI remediation: how to let agents act on security problems without trusting their claims by default. It is a direction, not a published result.",
  notes: [
    "An agent that can act has a larger attack surface than one that only answers, because its inputs can now cause actions.",
    "Trust should be earned per action, not granted per agent.",
    "Once an agent holds tools, prompt injection becomes an access-control problem.",
    "Identity, intent and evidence are three different questions. AEGIS asks the first two. WITNESS asks the third.",
    "Remediation is the hard case. It changes state, so being wrong costs more than being late.",
  ],
  relatedProjects: ["witness", "aegis"],
  links: {},
  graphNodes: ["agents", "ai", "automation"],
} satisfies ResearchInput;
