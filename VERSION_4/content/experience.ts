import type { z } from "zod";
import type { Experience } from "@/content/schema";

type ExperienceInput = z.input<typeof Experience>;

/**
 * Source: docs/FACTS.md section A. Bullets are the owner's own, lightly edited for scanning without
 * changing meaning. Facilio has no bullets and no summary because nothing beyond the role is known.
 * Dates are display strings. Facilio has a start only, because only the year is known.
 * The education entry has id "education" so pages can render it apart from the roles.
 */
export const experienceEntries: ExperienceInput[] = [
  {
    id: "hpe-soc",
    org: "Hewlett Packard Enterprise (HPE)",
    role: "SOC Analyst",
    team: "Cybersecurity Design & Engineering",
    start: "Sep 2025",
    current: true,
    summary:
      "Enterprise SOC and cyber defense. Previously titled Cybersecurity Analyst, SOC & Cyber Defense.",
    bullets: [
      "Triage 100+ daily security alerts in an enterprise SOC and cyber defense environment, improving incident response efficiency and reducing alert backlog.",
      "Manage the full incident lifecycle (detection, triage, containment, eradication, remediation) and perform root cause analysis for phishing, malware, account compromise and lateral movement.",
      "Map threats to MITRE ATT&CK. Design and optimize SIEM correlation rules to improve detection accuracy and reduce false positives.",
      "Build Python automation workflows. Apply AI-driven anomaly detection to improve alert prioritization and reduce noise.",
      "Build log analysis pipelines across Linux systems. Support investigations across endpoint, cloud, identity and email.",
      "Remediate cloud misconfigurations across AWS and Azure. Implement IAM controls including RBAC, MFA and zero-trust architecture.",
      "Design dashboards and alert pipelines for security visibility. Make risk-based escalation decisions with global teams.",
    ],
    tags: ["SOC", "SIEM", "MITRE ATT&CK", "Python", "AWS", "Azure", "IAM"],
  },
  {
    id: "hpe-intern",
    org: "Hewlett Packard Enterprise (HPE)",
    role: "Cybersecurity Analyst Intern",
    start: "Feb 2025",
    end: "Aug 2025",
    current: false,
    bullets: [
      "Monitored and analyzed alerts across SIEM and endpoint tools. Supported continuous threat detection and SOC operations.",
      "Assisted in triage and investigation of phishing and malware alerts using Splunk and CrowdStrike.",
      "Contributed to incident response playbooks. Hands-on experience with Wiz and Azure.",
    ],
    tags: ["SIEM", "Splunk", "CrowdStrike", "Wiz", "Azure"],
  },
  {
    id: "facilio-intern",
    org: "Facilio",
    role: "Member of Technical Staff (Intern)",
    start: "2024",
    current: false,
    bullets: [],
    tags: [],
  },
  {
    id: "education",
    org: "Sri Krishna College of Engineering & Technology",
    role: "B.E. Computer Science & Engineering",
    start: "2021",
    end: "2025",
    current: false,
    summary: "Anna University. CGPA 8.5/10.",
    bullets: [],
    tags: ["Education"],
  },
];
