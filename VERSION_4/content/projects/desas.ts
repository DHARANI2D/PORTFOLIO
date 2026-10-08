import type { ProjectInput } from "./types";

/**
 * Tier 2. Source: the name in docs/FACTS.md section A and the owner's own capability list (section
 * A4). No architecture, threat model or decisions are written, so this stays an overview page.
 */
export const desas = {
  slug: "desas",
  name: "DESAS",
  tier: 2,
  category: "Email Security",
  domain: ["Email", "Sandbox", "Malware analysis"],
  tagline: "Dynamic Email Sandbox Analysis System.",
  summary: "Analyzes email in a dynamic sandbox.",
  metaDescription:
    "DESAS is the Dynamic Email Sandbox Analysis System: email forensics and sandbox detonation for phishing and malicious attachments.",
  overview: [
    "DESAS is a desktop tool for investigating a suspicious email end to end. It reads the headers and checks SPF, DKIM and DMARC, analyses the links and attachments, and detonates content in a sandbox. Attachment checks include PDF, DOCX and Excel extraction, OCR, polyglot and appended-payload detection, OLE analysis and hunting for XLM macros, with heuristics for hidden image content. Findings are enriched through VirusTotal and MXToolbox and mapped to MITRE ATT&CK, in an Electron interface.",
  ],
  flow: ["Email", "Sandbox", "Analysis"],
  stack: ["Electron", "VirusTotal", "MXToolbox"],
  links: {},
  graphNodes: ["detection", "dfir"],
} satisfies ProjectInput;
