import { describe, expect, it } from "vitest";
import {
  GRAPH_EDGES,
  GRAPH_LABELS,
  GRAPH_NODE_IDS,
  GRAPH_PLACEMENT,
  isGraphNodeId,
  isRailEdge,
} from "@/components/graph/graph-data";
import { GraphNodeId } from "@/content/schema";

describe("graph data", () => {
  it("labels, places and connects exactly the nodes the content schema defines", () => {
    const schemaIds = [...GraphNodeId.options].sort();
    expect([...GRAPH_NODE_IDS].sort()).toEqual(schemaIds);
    expect(Object.keys(GRAPH_PLACEMENT).sort()).toEqual(schemaIds);
    for (const [from, to] of GRAPH_EDGES) {
      expect(schemaIds, `${from}-${to}`).toContain(from);
      expect(schemaIds, `${from}-${to}`).toContain(to);
      expect(from, "an edge cannot join a node to itself").not.toBe(to);
    }
    for (const id of GRAPH_NODE_IDS) {
      const touching = GRAPH_EDGES.filter(([a, b]) => a === id || b === id);
      expect(touching.length, `${id} has an edge`).toBeGreaterThan(0);
    }
  });

  it("has no duplicate edge, in either direction", () => {
    const keys = GRAPH_EDGES.map(([a, b]) => [a, b].sort().join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps every node clear of the sticky header band and the foot of the viewport", () => {
    for (const id of GRAPH_NODE_IDS) {
      const { y } = GRAPH_PLACEMENT[id];
      expect(y, `${id} below the header`).toBeGreaterThanOrEqual(18);
      expect(y, `${id} above the foot`).toBeLessThanOrEqual(88);
    }
  });

  it("uses both margins, and gives nodes sharing a margin room for a label between them", () => {
    for (const side of ["left", "right"] as const) {
      const ys = GRAPH_NODE_IDS.filter((id) => GRAPH_PLACEMENT[id].side === side)
        .map((id) => GRAPH_PLACEMENT[id].y)
        .sort((a, b) => a - b);
      expect(ys.length, `${side} margin has nodes`).toBeGreaterThan(0);
      // A label hangs 20px under its node. At 8% of a 320px-tall viewport that is 25px.
      for (let i = 1; i < ys.length; i += 1) {
        expect((ys[i] ?? 0) - (ys[i - 1] ?? 0), `${side} spacing`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("tells rail edges (inside one margin) from chords (across the page)", () => {
    expect(isRailEdge("soc", "detection")).toBe(true);
    expect(isRailEdge("cloud", "ai")).toBe(true);
    expect(isRailEdge("detection", "cloud")).toBe(false);
    expect(isRailEdge("soc", "automation")).toBe(false);
    // Both kinds exist, so there are rails to draw and relations between the two sides.
    const kinds = GRAPH_EDGES.map(([a, b]) => isRailEdge(a, b));
    expect(kinds).toContain(true);
    expect(kinds).toContain(false);
  });

  it("recognises only real node ids, never a prototype member", () => {
    expect(isGraphNodeId("soc")).toBe(true);
    for (const word of ["constructor", "__proto__", "toString", "hasOwnProperty", "", "SOC"]) {
      expect(isGraphNodeId(word), word).toBe(false);
    }
    expect(Object.keys(GRAPH_LABELS)).toEqual([...GRAPH_NODE_IDS]);
  });
});
