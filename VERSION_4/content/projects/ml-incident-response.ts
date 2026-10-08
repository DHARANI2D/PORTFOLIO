import type { ProjectInput } from "./types";

/** A card, nothing more: how the system works is not published. */
export const mlIncidentResponse = {
  slug: "ml-incident-response",
  name: "ML Incident Response",
  category: "Detection & SOC",
  domain: ["Detection", "SOAR", "Machine learning"],
  tagline: "Network IDS alerts to automated containment.",
  graphNodes: ["soc", "detection", "automation"],
} satisfies ProjectInput;
