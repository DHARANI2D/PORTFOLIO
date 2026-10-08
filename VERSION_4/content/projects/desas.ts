import type { ProjectInput } from "./types";

/** A card, nothing more: how the system works is not published. */
export const desas = {
  slug: "desas",
  name: "DESAS",
  category: "Email Security",
  domain: ["Email", "Sandbox", "Malware analysis"],
  tagline: "Dynamic Email Sandbox Analysis System.",
  graphNodes: ["detection", "dfir"],
} satisfies ProjectInput;
