import type { GraphNodeId } from "@/content/schema";

/**
 * Which nodes of the ambient security graph a note lights, derived from its tags so a new note
 * needs no extra metadata. Tags with no match light nothing.
 */
const NODE_BY_TAG: Record<string, GraphNodeId> = {
  soc: "soc",
  detection: "detection",
  correlation: "detection",
  cloud: "cloud",
  "ai security": "ai",
  ai: "ai",
  "agentic security": "agents",
  agents: "agents",
  dfir: "dfir",
  automation: "automation",
  remediation: "automation",
  witness: "ai",
};

export function graphNodesForTags(tags: readonly string[]): GraphNodeId[] {
  const nodes = new Set<GraphNodeId>();
  for (const tag of tags) {
    const node = NODE_BY_TAG[tag.trim().toLowerCase()];
    if (node) nodes.add(node);
  }
  return [...nodes];
}
