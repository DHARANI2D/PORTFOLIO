import type { ProjectInput } from "./types";

/**
 * Source: the owner's own project summary (docs/FACTS.md section A4). HELIOS is the Autonomous
 * Security Investigation Platform. It absorbs what was a separate autonomous malware-analysis
 * project, so there is no other malware-analysis system on the site. Described qualitatively; no
 * architecture, threat model or decisions are written, because none were supplied, so this is an
 * overview page. Status is known: it is being built now.
 */
export const helios = {
  slug: "helios",
  name: "HELIOS",
  tier: 2,
  category: "DFIR & Investigation",
  status: "In development",
  domain: ["DFIR", "Malware analysis", "Multi-agent"],
  tagline: "Autonomous security investigation, evidence first.",
  summary:
    "A multi-agent platform that turns forensic evidence and malware analysis into one investigation graph and findings tied to that evidence.",
  metaDescription:
    "HELIOS is a multi-agent security investigation platform in development: evidence graphs, malware analysis and findings grounded in forensic evidence.",
  overview: [
    "HELIOS is the Autonomous Security Investigation Platform, and it is being built now. It brings investigation and malware analysis into one system. Agents work through forensic evidence and malware samples, using YARA signatures, memory forensics with Volatility and sandbox results, and relate everything in an evidence graph. Behaviour is mapped to MITRE ATT&CK, the agents reason over the graph with retrieval, and an adversarial validation step challenges a finding before it is reported.",
  ],
  flow: ["Evidence and samples", "Evidence graph", "Multi-agent analysis", "Validated findings"],
  stack: ["YARA", "Volatility"],
  links: {},
  graphNodes: ["dfir", "agents", "ai"],
} satisfies ProjectInput;
