import type { ProjectInput } from "./types";

/**
 * Source: the owner's own project summary (docs/FACTS.md section A4). Described qualitatively: the
 * site states no counts or measured results. No architecture, threat model or decisions are written,
 * because none were supplied, so this is an overview page.
 */
export const mlIncidentResponse = {
  slug: "ml-incident-response",
  name: "ML Incident Response",
  tier: 3,
  category: "Detection & SOC",
  domain: ["Detection", "SOAR", "Machine learning"],
  tagline: "Network IDS alerts to automated containment.",
  summary:
    "An incident-response pipeline that classifies network alerts and blocks malicious traffic.",
  metaDescription:
    "ML Incident Response is a pipeline from network IDS telemetry through ELK and threat intelligence to ML classification and automated blocking.",
  overview: [
    "This pipeline takes alerts from Snort, Suricata and Zeek into an ELK stack, enriches them with threat intelligence from AbuseIPDB, MISP and Cortex, classifies them with a scikit-learn model, blocks malicious sources with iptables and notifies by Slack or email. SignalFusion Core is the more developed version of the same idea: correlation and response in one system.",
  ],
  flow: ["IDS telemetry", "ELK", "Threat intelligence", "ML classifier", "Automated blocking"],
  stack: ["Suricata", "ELK", "scikit-learn"],
  links: {},
  graphNodes: ["soc", "detection", "automation"],
} satisfies ProjectInput;
