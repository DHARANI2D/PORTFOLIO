import type { ProjectInput } from "./types";

/** A card, nothing more: how the system works is not published. */
export const owl = {
  slug: "owl",
  name: "OWL",
  category: "Systems Security",
  domain: ["Systems Security", "Operating Systems", "Capabilities"],
  tagline: "A capability-secured, agent-native operating system.",
  graphNodes: ["agents", "ai"],
} satisfies ProjectInput;
