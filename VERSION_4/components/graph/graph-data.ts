import type { GraphNodeId } from "@/content/schema";

/**
 * Static data for the ambient security graph. Kept free of runtime imports from content/schema
 * (which pulls in zod): the graph ships in the root layout, so it must stay tiny.
 */

/** Typed as Record so adding a node id to the content schema fails the build until it is labelled. */
export const GRAPH_LABELS: Readonly<Record<GraphNodeId, string>> = {
  soc: "SOC",
  detection: "DETECTION",
  cloud: "CLOUD",
  ai: "AI",
  dfir: "DFIR",
  agents: "AGENTS",
  automation: "AUTOMATION",
};

// The cast is sound: GRAPH_LABELS is a Record<GraphNodeId, string>, so its keys are exactly the node ids.
export const GRAPH_NODE_IDS = Object.keys(GRAPH_LABELS) as GraphNodeId[];

export function isGraphNodeId(value: string): value is GraphNodeId {
  return Object.hasOwn(GRAPH_LABELS, value);
}

/**
 * Conceptual relations between the domains: a ring (the first seven) plus two chords.
 */
export const GRAPH_EDGES: readonly (readonly [GraphNodeId, GraphNodeId])[] = [
  ["soc", "detection"],
  ["detection", "cloud"],
  ["cloud", "ai"],
  ["ai", "agents"],
  ["agents", "automation"],
  ["automation", "dfir"],
  ["dfir", "soc"],
  ["detection", "ai"],
  ["soc", "automation"],
];

/**
 * The graph lives in the two empty margins either side of the page's text column, never over it.
 * Every node sits on one of two vertical rails (the centre line of each margin); only `y` varies.
 * An edge between two nodes on the same rail runs down the margin; an edge between the rails is a
 * chord, and the renderer fades a chord out before it reaches the text column (see
 * security-graph.module.css), so no graph pixel is ever painted behind text.
 *
 * `y` is a percentage of the viewport height. All nodes stay below ~18% (the sticky header band)
 * and above ~88% so none sits under the header or the footer line on a short viewport.
 */
export type GraphSide = "left" | "right";
export type GraphPlacement = { readonly side: GraphSide; readonly y: number };

export const GRAPH_PLACEMENT: Readonly<Record<GraphNodeId, GraphPlacement>> = {
  detection: { side: "left", y: 20 },
  soc: { side: "left", y: 46 },
  dfir: { side: "left", y: 78 },
  cloud: { side: "right", y: 24 },
  ai: { side: "right", y: 44 },
  agents: { side: "right", y: 64 },
  automation: { side: "right", y: 84 },
};

/** The edges that stay inside one margin. Every other edge is a chord that fades out toward the text. */
export function isRailEdge(from: GraphNodeId, to: GraphNodeId): boolean {
  return GRAPH_PLACEMENT[from].side === GRAPH_PLACEMENT[to].side;
}
