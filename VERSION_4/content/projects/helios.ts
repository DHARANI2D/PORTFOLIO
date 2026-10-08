import type { ProjectInput } from "./types";

/** A card, nothing more: how the system works is not published. */
export const helios = {
  slug: "helios",
  name: "HELIOS",
  category: "DFIR & Investigation",
  status: "In development",
  domain: ["DFIR", "Malware analysis", "Multi-agent"],
  tagline: "Autonomous security investigation, evidence first.",
  graphNodes: ["dfir", "agents", "ai"],
} satisfies ProjectInput;
