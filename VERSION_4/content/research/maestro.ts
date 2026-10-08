import type { ResearchInput } from "./types";

/**
 * Source: the owner's paper "MAESTRO: Multi-Agent Evidence-Augmented System for Autonomous DFIR
 * Investigation" (docs/FACTS.md section A). Restated qualitatively. The paper's measured results
 * are left out on purpose: the site states no percentages or measured quantities (see
 * tests/unit/content.test.ts).
 */
export const maestro = {
  slug: "maestro",
  title: "MAESTRO",
  tagline: "Evidence-grounded agents for DFIR.",
  abstract:
    "Digital forensics and incident response has two problems that are usually treated separately: memory-resident malware that endpoint tools miss, and LLM automation that invents evidence. MAESTRO couples them. Kernel telemetry and adaptive memory forensics feed a Security Knowledge Graph, and a multi-agent reasoning pipeline may only state what it can cite to a verifiable evidence ID. A validation stage checks every claim before it reaches a forensic report. Written up as a research paper.",
  metaDescription:
    "MAESTRO is a research paper on evidence-grounded multi-agent DFIR: every agent claim is tied to a verifiable evidence ID.",
  notes: [
    "The central idea: memory artifacts are the highest-fidelity evidence available at runtime, and an LLM is only trustworthy when each claim traces back to evidence that can be checked.",
    "The failure mode being designed against is fabrication. A model that invents an indicator or a timestamp produces a report that cannot be used in an investigation, so the output is constrained to what the evidence graph contains.",
    "Memory topology is a first-class part of the knowledge graph, next to log events. That lets deterministic graph queries, not a classifier, carry the structural detections.",
    "Agent hypotheses can trigger a targeted re-acquisition of memory. The reasoning layer asks the evidence layer for more, instead of guessing.",
    "Validation is staged. A claim without a matching evidence ID is dropped before the report is written, so the model's confidence never substitutes for evidence.",
    "The paper is explicit about scope: novel techniques still need an analyst, and an attacker with kernel-level control can in principle blind kernel-level monitoring.",
    "Same premise as WITNESS: separate what an agent claims from what independently observable state supports.",
  ],
  relatedProjects: ["helios", "witness"],
  links: {},
  graphNodes: ["dfir", "agents", "ai", "detection"],
} satisfies ResearchInput;
