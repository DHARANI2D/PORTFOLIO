import { describe, expect, it } from "vitest";
import {
  buildModel,
  groupNodes,
  labelRects,
  layout,
  nodeRect,
  segmentHitsRect,
  type Geometry,
} from "@/components/systems/diagram-layout";
import type { ArchDiagram } from "@/content/schema";
import { getProjects } from "@/lib/content";

/**
 * Geometry of every architecture diagram, checked without a browser. layout() is pure, so these run
 * on the same numbers the SVG is drawn from. The unit of measure is the 1200-unit viewBox.
 */

const diagrams = getProjects().flatMap((project) =>
  project.architecture ? [{ slug: project.slug, diagram: project.architecture }] : [],
);

/** The corners of every edge as segments, with the ids of the two nodes it connects. */
function segments(geo: Geometry) {
  return geo.edges.flatMap((edge) =>
    edge.pts.slice(1).map((q, i) => ({ edge, p: edge.pts[i]!, q })),
  );
}

function labelCrossings(geo: Geometry): string[] {
  const found: string[] = [];
  for (const b of geo.boundaries) {
    for (const [i, rect] of labelRects(b).entries()) {
      for (const { edge, p, q } of segments(geo)) {
        if (segmentHitsRect(p, q, rect, 2)) {
          found.push(`${edge.from}>${edge.to} crosses "${b.lines[i]}" (${b.def.id})`);
        }
      }
    }
  }
  return found;
}

describe("architecture diagram geometry", () => {
  it("covers every project that has a diagram", () => {
    expect(diagrams.map((d) => d.slug)).toEqual(
      expect.arrayContaining(["witness", "signalfusion-core"]),
    );
  });

  describe.each(diagrams)("$slug", ({ diagram }) => {
    const model = buildModel(diagram);
    const geo = layout(model);

    it("no edge runs through a trust-boundary label", () => {
      expect(labelCrossings(geo)).toEqual([]);
    });

    it("no edge runs through a node it does not connect", () => {
      const hits: string[] = [];
      for (const { edge, p, q } of segments(geo)) {
        for (const placed of geo.placed.values()) {
          if (placed.node.id === edge.from || placed.node.id === edge.to) continue;
          if (segmentHitsRect(p, q, nodeRect(placed), 1)) {
            hits.push(`${edge.from}>${edge.to} runs through ${placed.node.id}`);
          }
        }
      }
      expect(hits).toEqual([]);
    });

    it("every label sits inside its own dashed box", () => {
      for (const b of geo.boundaries) {
        for (const rect of labelRects(b)) {
          expect(rect.x0, `${b.def.id} left`).toBeGreaterThanOrEqual(b.x);
          expect(rect.x1, `${b.def.id} right`).toBeLessThanOrEqual(b.x + b.w);
          expect(rect.y0, `${b.def.id} top`).toBeGreaterThanOrEqual(b.y);
        }
      }
    });

    it("every node and edge stays inside the drawing", () => {
      for (const p of geo.placed.values()) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(1200);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y + p.h).toBeLessThanOrEqual(geo.height);
      }
      for (const b of geo.boundaries) {
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y + b.h).toBeLessThanOrEqual(geo.height);
      }
    });
  });

  it("keeps a label clear of an edge that enters the box from above (SignalFusion, Analyst)", () => {
    const sf = diagrams.find((d) => d.slug === "signalfusion-core");
    const geo = layout(buildModel(sf!.diagram));
    const oversight = geo.boundaries.find((b) => b.def.id === "oversight");
    const analyst = geo.placed.get("analyst");
    expect(oversight && analyst).toBeTruthy();
    // The edge from AI investigation drops into the Analyst at its centre. The label may not span it.
    const enters = geo.edges.find((e) => e.to === "analyst" && e.from === "investigation");
    const x = enters!.pts[0]![0];
    for (const rect of labelRects(oversight!)) {
      expect(
        rect.x1 < x - 4 || rect.x0 > x + 4,
        `label ${rect.x0}-${rect.x1} vs edge at ${x}`,
      ).toBe(true);
    }
  });

  it("keeps a label clear of a vertical run that crosses the top of a multi-column box", () => {
    // `top` sits above the boundary and feeds `right`, so its vertical run falls inside the box's
    // label zone. The label is long enough that it would span that run if it were left-aligned.
    const synthetic: ArchDiagram = {
      nodes: [
        { id: "top", label: "Top", kind: "source", col: 0, row: 0 },
        { id: "left", label: "Left", kind: "process", col: 0, row: 1 },
        { id: "right", label: "Right", kind: "process", col: 1, row: 1 },
        { id: "far", label: "Far", kind: "output", col: 6, row: 1 },
      ],
      edges: [
        ["top", "right"],
        ["left", "right"],
        ["right", "far"],
      ],
      boundaries: [
        {
          id: "zone",
          label: "Untrusted automated analysis zone with a long name",
          nodeIds: ["left", "right"],
        },
      ],
    };
    const geo = layout(buildModel(synthetic));
    expect(labelCrossings(geo)).toEqual([]);
    // It still shows the whole label.
    const zone = geo.boundaries[0]!;
    expect(zone.lines.join(" ")).toBe("UNTRUSTED AUTOMATED ANALYSIS ZONE WITH A LONG NAME");
  });

  it("puts the vertical run of an edge in the middle of the corridor, clear of a dashed box", () => {
    const d: ArchDiagram = {
      nodes: [
        { id: "a", label: "A", kind: "source", col: 0, row: 0 },
        { id: "b", label: "B", kind: "process", col: 1, row: 1 },
        { id: "c", label: "C", kind: "output", col: 1, row: 2 },
      ],
      edges: [
        ["a", "b"],
        ["b", "c"],
      ],
      boundaries: [{ id: "box", label: "Box", nodeIds: ["b", "c"] }],
    };
    const geo = layout(buildModel(d));
    const box = geo.boundaries[0]!;
    const run = geo.edges.find((e) => e.from === "a")!.pts[1]![0];
    // The box starts at column 1, so the corridor is the gap less the box margin. The run is 16
    // units from the box side and 16 from the node it passes, not 10 from the box.
    expect(box.x - run).toBeGreaterThanOrEqual(16 - 0.5);
    expect(run - (geo.placed.get("a")!.x + geo.placed.get("a")!.w)).toBeGreaterThanOrEqual(
      16 - 0.5,
    );
  });
});

describe("stacked fallback grouping", () => {
  const witness = diagrams.find((d) => d.slug === "witness")!;
  const model = buildModel(witness.diagram);
  const runs = groupNodes(model);
  const stagesOf = (id: string) =>
    runs.flatMap((r) => r.stages).find((s) => s.nodes.some((n) => n.id === id))!;

  it("keeps every node exactly once, in reading order", () => {
    const flat = runs.flatMap((r) => r.stages.flatMap((s) => s.nodes.map((n) => n.id)));
    expect(flat).toEqual(model.nodes.map((n) => n.id));
  });

  it("puts the three outcomes of Decision in one stage, with no edge between them", () => {
    const stage = stagesOf("denied");
    expect(stage.nodes.map((n) => n.id).sort()).toEqual(["denied", "escalated"]);
    // Execution shares the depth but belongs to a different trust boundary, so it is in its own run.
    const depth = (id: string) => model.layer.get(id);
    expect(depth("execution")).toBe(depth("denied"));
    expect(depth("escalated")).toBe(depth("denied"));
  });

  it("never gives two nodes of one stage an edge between them", () => {
    for (const run of runs) {
      for (const stage of run.stages) {
        const ids = new Set(stage.nodes.map((n) => n.id));
        for (const [a, b] of model.edges) expect(ids.has(a) && ids.has(b)).toBe(false);
      }
    }
  });

  it("groups by trust boundary: the gate checks form one run", () => {
    const gate = runs.find((r) => r.boundary?.id === "gate");
    expect(gate?.stages.flatMap((s) => s.nodes.map((n) => n.id))).toEqual([
      "evidence",
      "corroboration",
      "policy",
      "validation",
      "decision",
    ]);
  });
});
