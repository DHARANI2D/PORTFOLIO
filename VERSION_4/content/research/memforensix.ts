import type { ResearchInput } from "./types";

/**
 * Source: the owner's paper "MemForensix: A Hybrid Memory Forensics Framework for Real-Time Malware
 * Detection and Post-Incident Analysis" (docs/FACTS.md section A). Restated qualitatively; the
 * paper's measured results are left out on purpose (the site states none).
 */
export const memForensix = {
  slug: "memforensix",
  title: "MemForensix",
  tagline: "Memory forensics that keeps the evidence.",
  abstract:
    "Process injection, hollowing and reflective loading leave little on disk, so file-based detection misses them, and when they are finally found the volatile evidence is often gone. MemForensix is a hybrid memory forensics framework that does both jobs from one instrumentation layer: lightweight eBPF behavioural monitoring, selective memory acquisition when something looks wrong, and deep analysis with signature and machine-learning models, with forensic chain of custody preserved. Written up as a research paper.",
  metaDescription:
    "MemForensix is a research paper on hybrid memory forensics: eBPF monitoring and risk-triggered memory capture with chain of custody.",
  notes: [
    "Two gaps are treated as one problem: detection blind spots for memory-only techniques, and evidence lost by the time an investigator arrives.",
    "Three stages keep cost down. Cheap behavioural monitoring watches everything, expensive memory acquisition runs only on processes that look risky, and deep analysis runs on what was captured.",
    "The monitoring signal is a set of behavioural indicators chosen against MITRE ATT&CK process-injection and reflective-loading techniques, not file signatures.",
    "Preservation is part of detection, not an afterthought. Capturing memory at the moment of suspicion is what makes a timeline, root cause and lateral-movement trace possible later.",
    "Continuous full memory scanning is too costly to deploy, which is why acquisition is adaptive and triggered by risk.",
    "Pairs with MAESTRO: MemForensix is the evidence layer, MAESTRO is the reasoning that has to stay grounded in it.",
  ],
  relatedProjects: ["helios"],
  links: {},
  graphNodes: ["dfir", "detection", "soc"],
} satisfies ResearchInput;
