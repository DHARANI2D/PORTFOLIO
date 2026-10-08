import type { ProjectInput } from "./types";

/** A card, nothing more: how the system works is not published. */
export const signalfusionCore = {
  slug: "signalfusion-core",
  name: "SignalFusion Core",
  category: "Detection & SOC",
  domain: ["Detection", "SOC", "Correlation", "MITRE ATT&CK"],
  tagline: "From disconnected alerts to contextual investigations.",
  graphNodes: ["soc", "detection", "cloud", "ai"],
} satisfies ProjectInput;
