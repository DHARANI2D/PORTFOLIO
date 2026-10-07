import type { ArchDiagram, ArchNode } from "@/content/schema";

/*
 * Pure model and geometry for ArchitectureDiagram. No React, no DOM: the unit tests run every
 * project diagram through layout() and check the drawing for collisions (an edge through a boundary
 * label, an edge through a node it does not connect).
 *
 * Nodes sit on the content's col/row grid. Edges are orthogonal. Trust boundaries are dashed boxes
 * with a label on the top border. Two rules keep the picture honest for any diagram:
 *
 *  - A vertical run of an edge sits in the middle of the free corridor between two columns (the gap
 *    minus the margin of any dashed box that borders it), so it keeps clear of both the boxes and
 *    the nodes.
 *  - A boundary label never sits under an edge. The label is placed in the widest stretch of the
 *    box's top border that no vertical edge crosses, and wrapped to that stretch.
 */

export type Kind = ArchNode["kind"];
export type BoundaryDef = ArchDiagram["boundaries"][number];

/* ------------------------------------------------------------------ model */

export type Model = {
  /** Unique nodes in reading order (entry first, outcomes last). */
  nodes: readonly ArchNode[];
  byId: ReadonlyMap<string, ArchNode>;
  /** Edges whose two ends exist, without duplicates or self loops. */
  edges: readonly (readonly [string, string])[];
  from: ReadonlyMap<string, readonly ArchNode[]>;
  to: ReadonlyMap<string, readonly ArchNode[]>;
  /** Longest path from an entry node. Drives the order things light up in, and the stage number. */
  layer: ReadonlyMap<string, number>;
  maxLayer: number;
  boundaries: readonly BoundaryDef[];
  boundaryOf: ReadonlyMap<string, BoundaryDef>;
  /** Shown in the panel until the reader picks a node: the first gate, else the first node. */
  defaultId: string;
};

/** The content is not checked for referential integrity, so every lookup here tolerates gaps. */
export function buildModel(diagram: ArchDiagram): Model {
  const byId = new Map<string, ArchNode>();
  for (const node of diagram.nodes) if (!byId.has(node.id)) byId.set(node.id, node);
  const unique = [...byId.values()];

  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const [a, b] of diagram.edges) {
    const key = `${a}>${b}`;
    if (a === b || !byId.has(a) || !byId.has(b) || seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b]);
  }

  // Layers: relax longest-path distances. The bound keeps a cyclic diagram from looping.
  const layer = new Map<string, number>(unique.map((n) => [n.id, 0]));
  for (let pass = 0; pass < unique.length; pass++) {
    let changed = false;
    for (const [a, b] of edges) {
      const next = (layer.get(a) ?? 0) + 1;
      if (next < unique.length && next > (layer.get(b) ?? 0)) {
        layer.set(b, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const maxLayer = Math.max(0, ...layer.values());

  // Reading order: a topological sort that prefers the leftmost, topmost ready node.
  const indegree = new Map<string, number>(unique.map((n) => [n.id, 0]));
  for (const [, b] of edges) indegree.set(b, (indegree.get(b) ?? 0) + 1);
  const remaining = [...unique];
  const nodes: ArchNode[] = [];
  while (remaining.length > 0) {
    const ready = remaining.filter((n) => (indegree.get(n.id) ?? 0) === 0);
    const pool = ready.length > 0 ? ready : remaining; // a cycle: fall back to grid order
    const next = pool.reduce((best, n) =>
      n.col < best.col || (n.col === best.col && n.row < best.row) ? n : best,
    );
    nodes.push(next);
    remaining.splice(remaining.indexOf(next), 1);
    for (const [a, b] of edges) if (a === next.id) indegree.set(b, (indegree.get(b) ?? 0) - 1);
  }

  const from = new Map<string, ArchNode[]>();
  const to = new Map<string, ArchNode[]>();
  for (const [a, b] of edges) {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    to.set(a, [...(to.get(a) ?? []), nb]);
    from.set(b, [...(from.get(b) ?? []), na]);
  }

  const boundaries = diagram.boundaries
    .map((b) => ({ ...b, nodeIds: b.nodeIds.filter((id) => byId.has(id)) }))
    .filter((b) => b.nodeIds.length > 0);
  const boundaryOf = new Map<string, BoundaryDef>();
  for (const b of boundaries)
    for (const id of b.nodeIds) if (!boundaryOf.has(id)) boundaryOf.set(id, b);

  return {
    nodes,
    byId,
    edges,
    from,
    to,
    layer,
    maxLayer,
    boundaries,
    boundaryOf,
    defaultId: nodes.find((n) => n.kind === "gate")?.id ?? nodes[0]?.id ?? "",
  };
}

/** Nodes of one stage inside one run: they share a depth, so no node feeds another. */
export type Stage = { layer: number; nodes: ArchNode[] };
/** Consecutive nodes of the same trust boundary (or of none), in reading order. */
export type Run = { key: string; boundary: BoundaryDef | undefined; stages: Stage[] };

/**
 * Reading order, grouped. A run is a stretch of nodes in the same trust boundary and is drawn as one
 * dashed box. Inside a run, neighbours at the same depth form one stage and are drawn side by side.
 */
export function groupNodes(model: Model): Run[] {
  const runs: Run[] = [];
  for (const node of model.nodes) {
    const boundary = model.boundaryOf.get(node.id);
    const layer = model.layer.get(node.id) ?? 0;
    const lastRun = runs[runs.length - 1];
    if (!lastRun || lastRun.boundary?.id !== boundary?.id) {
      runs.push({
        key: `${boundary?.id ?? "free"}-${node.id}`,
        boundary,
        stages: [{ layer, nodes: [node] }],
      });
      continue;
    }
    const lastStage = lastRun.stages[lastRun.stages.length - 1];
    if (lastStage && lastStage.layer === layer) lastStage.nodes.push(node);
    else lastRun.stages.push({ layer, nodes: [node] });
  }
  return runs;
}

/* --------------------------------------------------------------- geometry */

export const VB_W = 1200;
export const PAD_X = 16;
export const GAP_X = 44;
export const GAP_Y = 56;
export const MAX_NODE_W = 176;
export const TEXT_PAD = 12;
export const BP_X = 12;
export const BP_BOTTOM = 12;
export const LABEL_FS = 13;
export const SUB_FS = 12;
export const TAG_FS = 11;
export const BOUNDARY_FS = 10;
// Geist Mono advances 0.6em. 0.62 keeps wrapped lines safely inside the node.
export const CHAR_EM = 0.62;
export const ARROW = 7;
/** Boundary label: letter-spacing 0.12em on top of the 0.6em advance. */
export const BOUNDARY_ADVANCE = BOUNDARY_FS * 0.72;
// What wrap() assumes per boundary character: the advance plus a little slack.
const BOUNDARY_FIT = BOUNDARY_FS * (CHAR_EM + 0.12);
/** Space kept clear on each side of an edge when a boundary label is placed beside it. */
const LABEL_EDGE_CLEARANCE = 8;
/** How far above a boundary's top row an edge can reach into the label zone (an upper bound). */
const LABEL_ZONE = 50;

export type Pt = readonly [number, number];

export type Placed = {
  node: ArchNode;
  /** Zero-based grid column and row, after trimming empty leading columns and rows. */
  c: number;
  r: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  labelLines: string[];
  subLines: string[];
};
export type EdgeGeo = {
  from: string;
  to: string;
  d: string;
  arrow: string;
  layer: number;
  /** The corners of the path, for collision checks. The drawn path rounds them. */
  pts: Pt[];
};
export type BoundaryGeo = {
  def: BoundaryDef;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  /** Left edge of the label text. Right of x unless an edge forces it elsewhere. */
  tx: number;
};
export type Geometry = {
  height: number;
  placed: ReadonlyMap<string, Placed>;
  edges: EdgeGeo[];
  boundaries: BoundaryGeo[];
};

/** Greedy word wrap on a monospace estimate. Words longer than a line are split. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word;
    while (rest.length > max) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(rest.slice(0, max));
      rest = rest.slice(max);
    }
    if (!line) line = rest;
    else if (line.length + 1 + rest.length <= max) line += ` ${rest}`;
    else {
      lines.push(line);
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const num = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Orthogonal route from one node to another, plus an arrowhead at the end. `corridorX(col, dir)` is
 * the x of the vertical run in the gap next to column `col` on the `dir` side.
 */
function route(
  a: Placed,
  b: Placed,
  corridorX: (col: number, dir: 1 | -1) => number,
): { d: string; arrow: string; pts: Pt[] } {
  let ux = 0;
  let uy = 0;
  let d: string;
  let ex: number;
  let ey: number;
  const pts: Pt[] = [];

  if (a.c !== b.c) {
    const dir = b.c > a.c ? 1 : -1;
    const sx = dir === 1 ? a.x + a.w : a.x;
    const sy = a.cy;
    ex = dir === 1 ? b.x : b.x + b.w;
    ey = b.cy;
    ux = dir;
    if (Math.abs(ey - sy) < 1) {
      d = `M${num(sx)} ${num(sy)}H${num(ex)}`;
      pts.push([sx, sy], [ex, ey]);
    } else {
      // Leave the source, turn in the corridor next to its column, enter the target level.
      const xm = corridorX(a.c, dir);
      const sgn = ey > sy ? 1 : -1;
      const r = Math.min(8, Math.abs(ey - sy) / 2, Math.abs(xm - sx), Math.abs(ex - xm));
      d =
        `M${num(sx)} ${num(sy)}H${num(xm - dir * r)}` +
        `Q${num(xm)} ${num(sy)} ${num(xm)} ${num(sy + sgn * r)}` +
        `V${num(ey - sgn * r)}` +
        `Q${num(xm)} ${num(ey)} ${num(xm + dir * r)} ${num(ey)}` +
        `H${num(ex)}`;
      pts.push([sx, sy], [xm, sy], [xm, ey], [ex, ey]);
    }
  } else {
    const dir = b.r >= a.r ? 1 : -1;
    const sx = a.cx;
    const sy = dir === 1 ? a.y + a.h : a.y;
    ex = b.cx;
    ey = dir === 1 ? b.y : b.y + b.h;
    uy = dir;
    d = `M${num(sx)} ${num(sy)}V${num(ey)}`;
    pts.push([sx, sy], [ex, ey]);
  }

  const bx = ex - ux * ARROW;
  const by = ey - uy * ARROW;
  const px = -uy * (ARROW / 2);
  const py = ux * (ARROW / 2);
  const arrow = `M${num(ex)} ${num(ey)}L${num(bx + px)} ${num(by + py)}L${num(bx - px)} ${num(by - py)}Z`;
  return { d, arrow, pts };
}

function heightFor(labelLines: number, subLines: number): number {
  // tag row, label lines, sublabel lines, bottom padding
  return 40 + (labelLines - 1) * 17 + (subLines > 0 ? 18 + (subLines - 1) * 15 : 0) + 14;
}

/** The free stretches of [lo, hi] once `margin` is cleared on each side of every blocker. */
function freeStretches(lo: number, hi: number, blockers: readonly number[], margin: number) {
  const stretches: [number, number][] = [];
  let start = lo;
  for (const x of [...blockers].sort((p, q) => p - q)) {
    if (x - margin > start) stretches.push([start, x - margin]);
    start = Math.max(start, x + margin);
  }
  if (hi > start) stretches.push([start, hi]);
  return stretches;
}

export function layout(model: Model): Geometry {
  const nodes = model.nodes;
  const minCol = Math.min(...nodes.map((n) => n.col));
  const minRow = Math.min(...nodes.map((n) => n.row));
  const cols = Math.max(...nodes.map((n) => n.col)) - minCol + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) - minRow + 1;
  const colOf = (n: ArchNode) => n.col - minCol;
  const rowOf = (n: ArchNode) => n.row - minRow;

  const nodeW = Math.min(MAX_NODE_W, Math.floor((VB_W - 2 * PAD_X - (cols - 1) * GAP_X) / cols));
  const offsetX = Math.round((VB_W - (cols * nodeW + (cols - 1) * GAP_X)) / 2);
  const inner = nodeW - 2 * TEXT_PAD;
  const labelMax = Math.max(4, Math.floor(inner / (LABEL_FS * CHAR_EM)));
  const subMax = Math.max(4, Math.floor(inner / (SUB_FS * CHAR_EM)));

  const wrapped = nodes.map((node) => ({
    node,
    labelLines: wrap(node.label, labelMax),
    subLines: node.sublabel ? wrap(node.sublabel, subMax) : [],
  }));
  const nodeH = Math.max(
    ...wrapped.map((w) => heightFor(Math.max(1, w.labelLines.length), w.subLines.length)),
  );
  const pitchX = nodeW + GAP_X;
  const pitchY = nodeH + GAP_Y;

  // Which columns a dashed box starts or ends on: the corridor next to them is narrower.
  const spans = model.boundaries.flatMap((def) => {
    const members = def.nodeIds.flatMap((id) => {
      const n = model.byId.get(id);
      return n ? [n] : [];
    });
    if (members.length === 0) return [];
    const c0 = Math.min(...members.map(colOf));
    const c1 = Math.max(...members.map(colOf));
    return [
      {
        def,
        c0,
        c1,
        r0: Math.min(...members.map(rowOf)),
        r1: Math.max(...members.map(rowOf)),
        w: (c1 - c0 + 1) * nodeW + (c1 - c0) * GAP_X + 2 * BP_X,
      },
    ];
  });
  const startsAt = new Set(spans.map((s) => s.c0));
  const endsAt = new Set(spans.map((s) => s.c1));
  // x of the vertical run next to column `col`, on the `dir` side: the middle of the free corridor.
  const corridorX = (col: number, dir: 1 | -1): number => {
    const gap = dir === 1 ? col : col - 1; // the gap between columns `gap` and `gap + 1`
    const left = offsetX + gap * pitchX + nodeW + (endsAt.has(gap) ? BP_X : 0);
    const right = offsetX + (gap + 1) * pitchX - (startsAt.has(gap + 1) ? BP_X : 0);
    return (left + right) / 2;
  };

  const place = (shiftY: number) => {
    const placed = new Map<string, Placed>();
    for (const { node, labelLines, subLines } of wrapped) {
      const c = colOf(node);
      const r = rowOf(node);
      const x = offsetX + c * pitchX;
      const y = shiftY + r * pitchY;
      placed.set(node.id, {
        node,
        c,
        r,
        x,
        y,
        w: nodeW,
        h: nodeH,
        cx: x + nodeW / 2,
        cy: y + nodeH / 2,
        labelLines,
        subLines,
      });
    }
    const edges: EdgeGeo[] = model.edges.flatMap(([a, b]) => {
      const pa = placed.get(a);
      const pb = placed.get(b);
      if (!pa || !pb) return [];
      return [{ from: a, to: b, layer: model.layer.get(a) ?? 0, ...route(pa, pb, corridorX) }];
    });
    return { placed, edges };
  };

  // First pass, with no vertical offset: where do vertical edge runs cross each boundary's top?
  // Column positions and row spacing do not depend on the labels, so this is exact.
  const probe = place(0).edges;
  const meta = spans.map((s) => {
    const bx = offsetX + s.c0 * pitchX - BP_X;
    const topY = s.r0 * pitchY;
    const blockers: number[] = [];
    for (const edge of probe) {
      for (let i = 1; i < edge.pts.length; i++) {
        const p = edge.pts[i - 1];
        const q = edge.pts[i];
        if (!p || !q || p[0] !== q[0] || p[1] === q[1]) continue;
        const [lo, hi] = p[1] < q[1] ? [p[1], q[1]] : [q[1], p[1]];
        const inside = p[0] > bx && p[0] < bx + s.w;
        if (inside && lo < topY && hi > topY - LABEL_ZONE) blockers.push(p[0]);
      }
    }
    const stretches = freeStretches(bx + 12, bx + s.w - 12, blockers, LABEL_EDGE_CLEARANCE);
    // The widest free stretch, the leftmost on a tie. With nothing in the way it is the whole top.
    const best = stretches.reduce<[number, number] | undefined>(
      (pick, s2) => (!pick || s2[1] - s2[0] > pick[1] - pick[0] + 0.5 ? s2 : pick),
      undefined,
    ) ?? [bx + 12, bx + s.w - 12];
    const lines = wrap(
      s.def.label.toUpperCase(),
      Math.max(6, Math.floor((best[1] - best[0]) / BOUNDARY_FIT)),
    );
    return { ...s, lines, tx: best[0], top: 14 + lines.length * 12 };
  });

  const shiftY = 8 - Math.min(0, ...meta.map((m) => m.r0 * pitchY - m.top));
  const { placed, edges } = place(shiftY);

  const boundaries: BoundaryGeo[] = meta.map((m) => ({
    def: m.def,
    x: offsetX + m.c0 * pitchX - BP_X,
    y: shiftY + m.r0 * pitchY - m.top,
    w: m.w,
    h: (m.r1 - m.r0 + 1) * nodeH + (m.r1 - m.r0) * GAP_Y + m.top + BP_BOTTOM,
    lines: m.lines,
    tx: m.tx,
  }));

  const bottom = Math.max(
    shiftY + (rows - 1) * pitchY + nodeH,
    ...boundaries.map((b) => b.y + b.h),
  );
  return { height: bottom + 8, placed, edges, boundaries };
}

/* ------------------------------------------------------------ collisions */

export type Rect = { x0: number; y0: number; x1: number; y1: number };

/** The painted box of each line of a boundary label (text sits on a baseline 18px below the top). */
export function labelRects(b: BoundaryGeo): Rect[] {
  return b.lines.map((line, i) => {
    const baseline = b.y + 18 + i * 12;
    return {
      x0: b.tx,
      x1: b.tx + line.length * BOUNDARY_ADVANCE,
      y0: baseline - BOUNDARY_FS,
      y1: baseline + 2,
    };
  });
}

export function nodeRect(p: Placed): Rect {
  return { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h };
}

/** True when the axis-aligned segment p-q touches the rectangle grown by `pad`. */
export function segmentHitsRect(p: Pt, q: Pt, rect: Rect, pad = 0): boolean {
  const x0 = Math.min(p[0], q[0]);
  const x1 = Math.max(p[0], q[0]);
  const y0 = Math.min(p[1], q[1]);
  const y1 = Math.max(p[1], q[1]);
  return x1 >= rect.x0 - pad && x0 <= rect.x1 + pad && y1 >= rect.y0 - pad && y0 <= rect.y1 + pad;
}
