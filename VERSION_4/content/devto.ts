/**
 * The owner's articles on DEV (https://dev.to/dharani2d), series "AI Security & Modern
 * Cybersecurity". Titles, URLs, dates, reading times and tags come from the DEV API; the summaries
 * are DEV's own descriptions. Newest first. Add a post by adding an entry here.
 */
export type DevtoPost = {
  title: string;
  url: string;
  /** ISO date, YYYY-MM-DD (UTC). */
  date: string;
  readingMinutes: number;
  tags: string[];
  summary: string;
};

export const devtoProfile = {
  url: "https://dev.to/dharani2d",
  series: "AI Security & Modern Cybersecurity",
} as const;

export const devtoPosts: DevtoPost[] = [
  {
    title: "Building an AI-Powered SOC: Architecture, Agents and Guardrails",
    url: "https://dev.to/dharani2d/building-an-ai-powered-soc-architecture-agents-and-guardrails-5die",
    date: "2026-09-27",
    readingMinutes: 4,
    tags: ["cybersecurity", "ai", "llm", "soc"],
    summary:
      "Most AI SOC designs follow a simplistic pattern: a SIEM feeding straight into an LLM for response.",
  },
  {
    title: "AI Agents vs Traditional Automation: What's Actually Different for Security",
    url: "https://dev.to/dharani2d/ai-agents-vs-traditional-automation-whats-actually-different-for-security-3n1l",
    date: "2026-09-25",
    readingMinutes: 16,
    tags: ["ai", "devsecops", "cybersecurity", "automation"],
    summary:
      "In security contexts, the difference between intelligent agents and conventional automation goes beyond capability.",
  },
  {
    title: "RAG Security: How Attackers Can Poison AI's Knowledge",
    url: "https://dev.to/dharani2d/rag-security-how-attackers-can-poison-ais-knowledge-385c",
    date: "2026-09-24",
    readingMinutes: 8,
    tags: ["ai", "rag", "security", "agents"],
    summary: "The model itself may be protected, but the knowledge base behind it might not be.",
  },
  {
    title: "LLM Security Is Not Just Prompt Injection: Understanding the Full Attack Surface",
    url: "https://dev.to/dharani2d/llm-security-is-not-just-prompt-injection-understanding-the-full-attack-surface-3m8i",
    date: "2026-09-23",
    readingMinutes: 16,
    tags: ["ai", "security", "cybersecurity", "llm"],
    summary:
      "The common mistake is treating the model as the security boundary, when the attack surface is much wider.",
  },
  {
    title: "Why AI Agents Will Become a New Attack Surface",
    url: "https://dev.to/dharani2d/why-ai-agents-will-become-a-new-attack-surface-345h",
    date: "2026-09-22",
    readingMinutes: 13,
    tags: ["ai", "security", "agenticai", "cybersecurity"],
    summary:
      "Application-security assumptions built up over decades are disrupted by agentic technology.",
  },
  {
    title: "The SOC Is Changing: From Alert Triage to AI-Native Security Operations",
    url: "https://dev.to/dharani2d/the-soc-is-changing-from-alert-triage-to-ai-native-security-operations-3f5d",
    date: "2026-09-21",
    readingMinutes: 5,
    tags: ["ai", "security", "cybersecurity", "machinelearning"],
    summary:
      "Security operations centres are changing how they handle alert management and response.",
  },
];
