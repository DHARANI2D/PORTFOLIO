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
 * Conceptual relations between the domains. A ring around the viewport plus two short chords, so
 * the middle of the screen (where the text is) stays clear.
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

export type GraphLayoutName = "wide" | "tall";
type Placement = Readonly<Record<GraphNodeId, readonly [x: number, y: number]>>;

/**
 * Node positions as percentages of the viewport, one layout per orientation. Both keep nodes out of
 * the first ~12% of the height (the sticky header) and inside the viewport at 320px wide.
 */
export const GRAPH_LAYOUTS: Readonly<Record<GraphLayoutName, Placement>> = {
  wide: {
    soc: [6, 36],
    detection: [27, 15],
    cloud: [62, 13],
    ai: [92, 31],
    agents: [94, 70],
    automation: [68, 90],
    dfir: [19, 82],
  },
  tall: {
    soc: [14, 20],
    detection: [62, 14],
    cloud: [90, 30],
    ai: [80, 52],
    agents: [90, 76],
    automation: [50, 90],
    dfir: [12, 68],
  },
};
