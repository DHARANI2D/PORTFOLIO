import type { z } from "zod";
import type { SkillGroup } from "@/content/schema";

type SkillGroupInput = z.input<typeof SkillGroup>;

/**
 * Source: docs/FACTS.md section A ("Tools / skills the owner lists"). Items are the groups the owner
 * asked for. Depth lists are the remaining names from FACTS.md, plus the AI security depth list the
 * owner's vision gives. Names marked in CONTENT_REVIEW.md as not in FACTS.md are kept for the owner
 * to confirm. No levels or percentages are shown anywhere.
 */
export const skillEntries: SkillGroupInput[] = [
  {
    id: "security-engineering",
    title: "Security Engineering",
    items: [
      "SIEM",
      "SOAR",
      "Detection Engineering",
      "Incident Response",
      "Threat Intelligence",
      "Malware Analysis",
      "DFIR",
      "Security Automation",
    ],
    depth: [
      "Threat hunting",
      "Alert correlation",
      "Root cause analysis",
      "MITRE ATT&CK",
      "Detection pipelines",
      "Security observability",
    ],
  },
  {
    id: "cloud-security",
    title: "Cloud Security",
    items: ["AWS", "Azure", "IAM", "Cloud Security", "Infrastructure Security", "DevSecOps"],
    depth: [
      "RBAC",
      "MFA",
      "SSO",
      "Zero-trust architecture",
      "Cloud misconfiguration remediation",
      "Policy-as-code (concepts)",
    ],
  },
  {
    id: "ai-security",
    title: "AI Security",
    items: [
      "AI Security",
      "LLM Security",
      "Agent Security",
      "AI Governance",
      "Adversarial AI",
      "Security Automation",
    ],
    depth: [
      "Secure AI Architecture",
      "Prompt Injection",
      "Tool Integrity",
      "Model Governance",
      "Autonomous Remediation",
      "AI Red Teaming",
      "AI Monitoring",
      "LLM-based security analysis",
      "Anomaly detection",
      "Behavioral analytics",
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    items: [
      "Python",
      "C++",
      "Java",
      "TypeScript",
      "React",
      "Next.js",
      "Spring Boot",
      "Docker",
      "Terraform",
      "Jenkins",
      "MySQL",
      "PostgreSQL",
    ],
    depth: ["SQL", "Bash", "Go (basics)"],
  },
  {
    id: "platforms",
    title: "Platforms",
    items: [
      "Splunk",
      "CrowdStrike",
      "Proofpoint",
      "Zscaler",
      "Wiz",
      "Threat intelligence platforms",
    ],
    depth: [],
  },
];
