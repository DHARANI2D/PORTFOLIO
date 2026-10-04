"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, ViewTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ArchDiagram, ArchNode } from "@/content/schema";
import { cn } from "@/lib/utils";

/*
 * ArchitectureDiagram: data-driven from ArchDiagram, in two forms of the same thing.
 *
 *  - xl and up: one inline SVG. Nodes sit on the content's col/row grid, edges are orthogonal
 *    paths, trust boundaries are dashed labelled groups. Nodes are focusable buttons; hover,
 *    focus or a click shows INPUT / PROCESS / OUTPUT / TRUST BOUNDARY in a panel under the SVG.
 *  - below xl: a vertical flow of native <details> rows, one per node, in reading order, with the
 *    same detail inside each row. Works with no JS. The SVG needs a wide canvas: at 1200 units it
 *    is drawn at about 0.96 scale on a 1280px screen, and text would shrink below that.
 *
 * Motion is an enhancement and never gates content. The server HTML is the final, fully drawn
 * diagram. After hydration, a diagram that is still below the fold is reset and then draws in when
 * it scrolls into view (nodes light in layer order, edges draw with stroke-dashoffset), and a soft
 * signal travels the edges while it is on screen. Reduced motion: none of that, ever.
 * No inline styles are used (the site ships a strict CSP): geometry is SVG attributes and every
 * delay is a literal class.
 */

type Kind = ArchNode["kind"];
type BoundaryDef = ArchDiagram["boundaries"][number];

const KIND_LABEL: Record<Kind, string> = {
  source: "SOURCE",
  process: "PROCESS",
  gate: "GATE",
  output: "OUTPUT",
  actor: "ACTOR",
};
const KIND_ORDER: readonly Kind[] = ["source", "actor", "process", "gate", "output"];

/* ------------------------------------------------------------------ model */

type Model = {
  /** Unique nodes in reading order (entry first, outcomes last). */
  nodes: readonly ArchNode[];
  byId: ReadonlyMap<string, ArchNode>;
  /** Edges whose two ends exist, without duplicates or self loops. */
  edges: readonly (readonly [string, string])[];
  from: ReadonlyMap<string, readonly ArchNode[]>;
  to: ReadonlyMap<string, readonly ArchNode[]>;
  /** Longest path from an entry node. Drives the order things light up in. */
  layer: ReadonlyMap<string, number>;
  maxLayer: number;
  boundaries: readonly BoundaryDef[];
  boundaryOf: ReadonlyMap<string, BoundaryDef>;
  /** Shown in the panel until the reader picks a node: the first gate, else the first node. */
  defaultId: string;
};

/** The content is not checked for referential integrity, so every lookup here tolerates gaps. */
function buildModel(diagram: ArchDiagram): Model {
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

/* --------------------------------------------------------------- geometry */

const VB_W = 1200;
const PAD_X = 16;
const GAP_X = 44;
const GAP_Y = 56;
const MAX_NODE_W = 176;
const TEXT_PAD = 12;
const BP_X = 12;
const BP_BOTTOM = 12;
const LABEL_FS = 13;
const SUB_FS = 12;
const TAG_FS = 11;
const BOUNDARY_FS = 10;
// Geist Mono advances 0.6em. 0.62 keeps wrapped lines safely inside the node.
const CHAR_EM = 0.62;
const ARROW = 7;

type Placed = {
  node: ArchNode;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  labelLines: string[];
  subLines: string[];
};
type EdgeGeo = { from: string; to: string; d: string; arrow: string; layer: number };
type BoundaryGeo = {
  def: BoundaryDef;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
};
type Geometry = {
  height: number;
  placed: ReadonlyMap<string, Placed>;
  edges: EdgeGeo[];
  boundaries: BoundaryGeo[];
};

/** Greedy word wrap on a monospace estimate. Words longer than a line are split. */
function wrap(text: string, max: number): string[] {
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

/** Orthogonal route from one node to another, plus an arrowhead at the end. */
function route(a: Placed, b: Placed): { d: string; arrow: string } {
  let sx: number;
  let sy: number;
  let ex: number;
  let ey: number;
  let ux = 0;
  let uy = 0;
  let d: string;

  if (a.node.col !== b.node.col) {
    const dir = b.node.col > a.node.col ? 1 : -1;
    sx = dir === 1 ? a.x + a.w : a.x;
    sy = a.cy;
    ex = dir === 1 ? b.x : b.x + b.w;
    ey = b.cy;
    ux = dir;
    if (Math.abs(ey - sy) < 1) {
      d = `M${num(sx)} ${num(sy)}H${num(ex)}`;
    } else {
      // Leave the source, turn in the gap right after its column, enter the target level.
      const xm = sx + dir * (GAP_X / 2);
      const sgn = ey > sy ? 1 : -1;
      const r = Math.min(8, Math.abs(ey - sy) / 2, GAP_X / 2);
      d =
        `M${num(sx)} ${num(sy)}H${num(xm - dir * r)}` +
        `Q${num(xm)} ${num(sy)} ${num(xm)} ${num(sy + sgn * r)}` +
        `V${num(ey - sgn * r)}` +
        `Q${num(xm)} ${num(ey)} ${num(xm + dir * r)} ${num(ey)}` +
        `H${num(ex)}`;
    }
  } else {
    const dir = b.node.row >= a.node.row ? 1 : -1;
    sx = a.cx;
    sy = dir === 1 ? a.y + a.h : a.y;
    ex = b.cx;
    ey = dir === 1 ? b.y : b.y + b.h;
    uy = dir;
    d = `M${num(sx)} ${num(sy)}V${num(ey)}`;
  }

  const bx = ex - ux * ARROW;
  const by = ey - uy * ARROW;
  const px = -uy * (ARROW / 2);
  const py = ux * (ARROW / 2);
  const arrow = `M${num(ex)} ${num(ey)}L${num(bx + px)} ${num(by + py)}L${num(bx - px)} ${num(by - py)}Z`;
  return { d, arrow };
}

function heightFor(labelLines: number, subLines: number): number {
  // tag row, label lines, sublabel lines, bottom padding
  return 40 + (labelLines - 1) * 17 + (subLines > 0 ? 18 + (subLines - 1) * 15 : 0) + 14;
}

function layout(model: Model): Geometry {
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

  // Boundary boxes first: their labels decide how much room the top row needs.
  const meta = model.boundaries.flatMap((def) => {
    const members = def.nodeIds.flatMap((id) => {
      const n = model.byId.get(id);
      return n ? [n] : [];
    });
    if (members.length === 0) return [];
    const c0 = Math.min(...members.map(colOf));
    const c1 = Math.max(...members.map(colOf));
    const r0 = Math.min(...members.map(rowOf));
    const r1 = Math.max(...members.map(rowOf));
    const w = (c1 - c0 + 1) * nodeW + (c1 - c0) * GAP_X + 2 * BP_X;
    const lines = wrap(
      def.label.toUpperCase(),
      Math.max(6, Math.floor((w - 24) / (BOUNDARY_FS * (CHAR_EM + 0.12)))),
    );
    return [{ def, c0, r0, r1, w, lines, top: 14 + lines.length * 12 }];
  });

  const pitchX = nodeW + GAP_X;
  const pitchY = nodeH + GAP_Y;
  const shiftY = 8 - Math.min(0, ...meta.map((m) => m.r0 * pitchY - m.top));

  const placed = new Map<string, Placed>();
  for (const { node, labelLines, subLines } of wrapped) {
    const x = offsetX + colOf(node) * pitchX;
    const y = shiftY + rowOf(node) * pitchY;
    placed.set(node.id, {
      node,
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

  const boundaries: BoundaryGeo[] = meta.map((m) => ({
    def: m.def,
    x: offsetX + m.c0 * pitchX - BP_X,
    y: shiftY + m.r0 * pitchY - m.top,
    w: m.w,
    h: (m.r1 - m.r0 + 1) * nodeH + (m.r1 - m.r0) * GAP_Y + m.top + BP_BOTTOM,
    lines: m.lines,
  }));

  const edges: EdgeGeo[] = model.edges.flatMap(([a, b]) => {
    const pa = placed.get(a);
    const pb = placed.get(b);
    if (!pa || !pb) return [];
    return [{ from: a, to: b, layer: model.layer.get(a) ?? 0, ...route(pa, pb) }];
  });

  const bottom = Math.max(
    shiftY + (rows - 1) * pitchY + nodeH,
    ...boundaries.map((b) => b.y + b.h),
  );
  return { height: bottom + 8, placed, edges, boundaries };
}

/* ----------------------------------------------------------------- motion */

// Delays are literal class names so Tailwind can see them. Nodes light in layer order and the edge
// leaving a layer draws just after it. Layers past the table share the last step.
const NODE_DELAY = [
  "group-data-[phase=shown]/diagram:delay-0",
  "group-data-[phase=shown]/diagram:delay-180",
  "group-data-[phase=shown]/diagram:delay-360",
  "group-data-[phase=shown]/diagram:delay-540",
  "group-data-[phase=shown]/diagram:delay-720",
  "group-data-[phase=shown]/diagram:delay-900",
  "group-data-[phase=shown]/diagram:delay-1000",
  "group-data-[phase=shown]/diagram:delay-1000",
] as const;
const EDGE_DELAY = [
  "group-data-[phase=shown]/diagram:delay-100",
  "group-data-[phase=shown]/diagram:delay-300",
  "group-data-[phase=shown]/diagram:delay-500",
  "group-data-[phase=shown]/diagram:delay-700",
  "group-data-[phase=shown]/diagram:delay-900",
  "group-data-[phase=shown]/diagram:delay-1000",
  "group-data-[phase=shown]/diagram:delay-1000",
  "group-data-[phase=shown]/diagram:delay-1000",
] as const;
const stepOf = (table: readonly string[], layer: number) =>
  table[Math.min(layer, table.length - 1)] ?? "";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReduced = () => window.matchMedia(REDUCED_QUERY).matches;
// The server never animates: it renders the final state.
const getReducedOnServer = () => false;

type Phase = "static" | "hidden" | "shown";

/** One soft pulse running down an edge, once per cycle, in layer order. SMIL: no JS per frame. */
const SIGNAL_SECONDS = 0.8;
function Signal({ d, layer, cycle }: { d: string; layer: number; cycle: number }) {
  const start = layer * SIGNAL_SECONDS;
  const t0 = (start / cycle).toFixed(4);
  const t1 = ((start + SIGNAL_SECONDS) / cycle).toFixed(4);
  return (
    <circle r="3" opacity="0" className="fill-accent">
      <animateMotion
        dur={`${cycle}s`}
        repeatCount="indefinite"
        path={d}
        calcMode="linear"
        keyPoints="0;0;1;1"
        keyTimes={`0;${t0};${t1};1`}
      />
      <animate
        attributeName="opacity"
        dur={`${cycle}s`}
        repeatCount="indefinite"
        calcMode="discrete"
        values="0;1;0"
        keyTimes={`0;${t0};${t1}`}
      />
    </circle>
  );
}

/* ------------------------------------------------------------- small parts */

/** The kind of a node as a tiny glyph. Shape differs by kind so colour is never the only cue. */
function KindGlyph({
  kind,
  x,
  y,
  className,
}: {
  kind: Kind;
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      x={x}
      y={y}
      width="14"
      height="10"
      viewBox="0 0 14 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      className={cn("shrink-0", kind === "gate" ? "text-accent" : "text-muted", className)}
    >
      <rect x=".5" y=".5" width="13" height="9" rx={kind === "actor" ? 4.5 : 1.5} />
      {kind === "source" ? <path d="M3.5 .5v9" /> : null}
      {kind === "output" ? <rect x="2.5" y="2.5" width="9" height="5" rx=".5" /> : null}
      {kind === "gate" ? (
        <path d="M7 2.5 9.5 5 7 7.5 4.5 5Z" fill="currentColor" stroke="none" />
      ) : null}
    </svg>
  );
}

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);
const names = (list: readonly ArchNode[]) => list.map((n) => n.label).join(", ");

function detailFields(node: ArchNode): { label: string; text: string }[] {
  const fields = [
    { label: "INPUT", text: node.input },
    { label: "PROCESS", text: node.process },
    { label: "OUTPUT", text: node.output },
    { label: "TRUST BOUNDARY", text: node.trustBoundary },
  ];
  return fields.flatMap((f) => (f.text ? [{ label: f.label, text: f.text }] : []));
}

/** The same detail in the desktop panel and in each stacked row. */
function NodeDetail({
  node,
  model,
  withHead,
}: {
  node: ArchNode;
  model: Model;
  withHead: boolean;
}) {
  const fields = detailFields(node);
  const boundary = model.boundaryOf.get(node.id);
  const from = model.from.get(node.id) ?? [];
  const to = model.to.get(node.id) ?? [];
  const position = model.nodes.findIndex((n) => n.id === node.id) + 1;

  return (
    <div>
      {withHead ? (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 label-mono text-muted">
            <span className="flex items-center gap-2 text-foreground">
              <KindGlyph kind={node.kind} />
              {KIND_LABEL[node.kind]}
            </span>
            <span>
              NODE {String(position).padStart(2, "0")} /{" "}
              {String(model.nodes.length).padStart(2, "0")}
            </span>
            {boundary ? <span>{boundary.label.toUpperCase()}</span> : null}
          </div>
          <p className="mt-6 font-mono text-xl font-medium tracking-tight text-foreground">
            {node.label}
          </p>
          {node.sublabel ? <p className="mt-2 text-sm text-muted">{node.sublabel}</p> : null}
        </>
      ) : null}

      {fields.length > 0 ? (
        <dl
          className={cn(
            "grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-x-6 gap-y-6",
            withHead ? "mt-8" : "",
          )}
        >
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="label-mono text-muted">{field.label}</dt>
              <dd className="mt-3 text-sm text-foreground">{field.text}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={cn("text-sm text-muted", withHead ? "mt-8" : "")}>
          No further detail is published for this node.
        </p>
      )}

      {from.length > 0 || to.length > 0 ? (
        <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-4 border-t pt-6">
          {from.length > 0 ? (
            <div className="min-w-0">
              <dt className="label-mono text-muted">RECEIVES FROM</dt>
              <dd className="mt-3 text-sm text-foreground">{names(from)}</dd>
            </div>
          ) : null}
          {to.length > 0 ? (
            <div className="min-w-0">
              <dt className="label-mono text-muted">SENDS TO</dt>
              <dd className="mt-3 text-sm text-foreground">{names(to)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/** The whole diagram as one paragraph per node, for assistive tech (visible only below xl as rows). */
function describeNode(node: ArchNode, model: Model, position: number): string {
  const boundary = model.boundaryOf.get(node.id);
  const from = model.from.get(node.id) ?? [];
  const to = model.to.get(node.id) ?? [];
  const parts = [
    `Node ${position} of ${model.nodes.length}: ${node.label}, ${node.kind}.`,
    node.sublabel ? sentence(node.sublabel) : "",
    boundary ? `Inside the ${boundary.label} boundary.` : "",
    from.length > 0 ? `Receives from ${names(from)}.` : "",
    to.length > 0 ? `Sends to ${names(to)}.` : "",
    node.input ? `Input: ${sentence(node.input)}` : "",
    node.process ? `Process: ${sentence(node.process)}` : "",
    node.output ? `Output: ${sentence(node.output)}` : "",
    node.trustBoundary ? `Trust boundary: ${sentence(node.trustBoundary)}` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

type Group = { key: string; boundary: BoundaryDef | undefined; nodes: ArchNode[] };

/** Consecutive nodes of the same trust boundary share a dashed box in the stacked flow. */
function groupNodes(model: Model): Group[] {
  const groups: Group[] = [];
  for (const node of model.nodes) {
    const boundary = model.boundaryOf.get(node.id);
    const last = groups[groups.length - 1];
    if (last && last.boundary?.id === boundary?.id) last.nodes.push(node);
    else groups.push({ key: `${boundary?.id ?? "free"}-${node.id}`, boundary, nodes: [node] });
  }
  return groups;
}

const connector = <span aria-hidden className="ml-6 block h-4 w-px bg-border-strong" />;

/** Below xl: nodes as a vertical flow of native disclosure rows. One open at a time. */
function StackedFlow({
  model,
  label,
  groupName,
}: {
  model: Model;
  label: string;
  groupName: string;
}) {
  const groups = groupNodes(model);
  return (
    <ol aria-label={`${label}, in reading order`} className="flex flex-col">
      {groups.map((group, groupIndex) => {
        const rows = (
          <ol className="flex flex-col">
            {group.nodes.map((node, nodeIndex) => (
              <li key={node.id}>
                <details
                  name={groupName}
                  className={cn(
                    "group/row rounded-md border bg-surface open:bg-surface-hover",
                    node.kind === "gate" ? "border-accent" : "border-border-strong",
                  )}
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-md px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <KindGlyph kind={node.kind} />
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="label-mono text-muted">{KIND_LABEL[node.kind]}</span>
                      <span className="font-mono text-sm font-medium break-words text-foreground">
                        {node.label}
                      </span>
                      {node.sublabel ? (
                        <span className="text-xs text-muted">{node.sublabel}</span>
                      ) : null}
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-muted transition-transform duration-200 group-open/row:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <div className="border-t px-4 py-6">
                    <NodeDetail node={node} model={model} withHead={false} />
                  </div>
                </details>
                {nodeIndex < group.nodes.length - 1 ? connector : null}
              </li>
            ))}
          </ol>
        );

        return (
          <li key={group.key}>
            {group.boundary ? (
              <div
                role="group"
                aria-label={`Trust boundary: ${group.boundary.label}`}
                className="rounded-lg border border-dashed border-border-strong p-3"
              >
                <p aria-hidden className="mb-3 label-mono text-muted">
                  {group.boundary.label}
                </p>
                {rows}
              </div>
            ) : (
              rows
            )}
            {groupIndex < groups.length - 1 ? connector : null}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- component */

type ArchitectureDiagramProps = {
  diagram: ArchDiagram;
  /** The project slug. Names the view transition shared with the card diagram. */
  slug: string;
  /** Used in accessible names only. */
  name?: string;
};

export function ArchitectureDiagram({ diagram, slug, name }: ArchitectureDiagramProps) {
  const uid = useId();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("static");
  const [inView, setInView] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedOnServer);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        // Scrolled past already (restored scroll position) counts as seen.
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) setPhase("shown");
        else setPhase((current) => (current === "static" ? "hidden" : current));
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const model = buildModel(diagram);
  const shownId = activeId ?? model.defaultId;
  const shownNode = model.byId.get(shownId);
  if (!shownNode || model.nodes.length === 0) return null;

  const geo = layout(model);
  const label = name ? `${name} architecture` : "Architecture";
  const panelId = `${uid}-panel`;
  const effectivePhase: Phase = reduced ? "static" : phase;
  const signals = !reduced && inView && phase !== "static";
  const cycle = (model.maxLayer + 1) * SIGNAL_SECONDS + 2.4;
  const shownBoundary = model.boundaryOf.get(shownId);
  const kinds = KIND_ORDER.filter((kind) => model.nodes.some((n) => n.kind === kind));

  const select = (id: string) => setActiveId(id);

  return (
    <figure aria-label={label} className="overflow-hidden rounded-lg border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-4 py-3 md:px-6">
        <Label>ARCHITECTURE / SCHEMATIC</Label>
        <p className="label-mono text-muted max-xl:hidden">HOVER, FOCUS OR CLICK A NODE</p>
        <p className="label-mono text-muted xl:hidden">TAP A STAGE TO OPEN IT</p>
      </div>

      <ViewTransition name={`diagram-${slug}`}>
        <div ref={canvasRef} data-phase={effectivePhase} className="group/diagram">
          {/* xl and up: the SVG. Everything inside is decorative except the node buttons. */}
          <div className="p-6 max-xl:hidden">
            <svg
              viewBox={`0 0 ${VB_W} ${geo.height}`}
              role="group"
              aria-label={`${label} diagram. Each node is a button that shows its detail below.`}
              className="block h-auto w-full"
            >
              {geo.boundaries.map((b) => {
                const active = shownBoundary?.id === b.def.id;
                return (
                  <g
                    key={b.def.id}
                    aria-hidden
                    className={cn(
                      "group-data-[phase=hidden]/diagram:opacity-25",
                      "group-data-[phase=shown]/diagram:transition-opacity group-data-[phase=shown]/diagram:duration-500",
                    )}
                  >
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx={10}
                      fill="none"
                      strokeDasharray="5 5"
                      className={cn(
                        "transition-colors duration-200 motion-reduce:transition-none",
                        active ? "stroke-foreground" : "stroke-muted",
                      )}
                    />
                    {b.lines.map((line, i) => (
                      <text
                        key={line}
                        x={b.x + 12}
                        y={b.y + 18 + i * 12}
                        fontSize={BOUNDARY_FS}
                        letterSpacing="0.12em"
                        className={cn(
                          "font-mono transition-colors duration-200 motion-reduce:transition-none",
                          active ? "fill-foreground" : "fill-muted",
                        )}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}

              {geo.edges.map((edge) => {
                const lit = activeId !== null && (edge.from === activeId || edge.to === activeId);
                return (
                  <g key={`${edge.from}>${edge.to}`} aria-hidden>
                    <path
                      d={edge.d}
                      pathLength={1}
                      fill="none"
                      strokeLinejoin="round"
                      className={cn(
                        "stroke-muted stroke-1 [stroke-dasharray:1] [stroke-dashoffset:0]",
                        "group-data-[phase=hidden]/diagram:[stroke-dashoffset:1]",
                        "group-data-[phase=shown]/diagram:transition-[stroke-dashoffset] group-data-[phase=shown]/diagram:duration-500 group-data-[phase=shown]/diagram:ease-out",
                        stepOf(EDGE_DELAY, edge.layer),
                      )}
                    />
                    <path
                      d={edge.arrow}
                      className={cn(
                        "fill-muted",
                        "group-data-[phase=hidden]/diagram:opacity-0",
                        "group-data-[phase=shown]/diagram:transition-opacity group-data-[phase=shown]/diagram:duration-300",
                        stepOf(EDGE_DELAY, edge.layer),
                      )}
                    />
                    {/* The lit copy sits on top and only fades: it never takes part in the draw-in. */}
                    <path
                      d={edge.d}
                      fill="none"
                      strokeLinejoin="round"
                      className={cn(
                        "stroke-accent stroke-2 transition-opacity duration-200 motion-reduce:transition-none",
                        lit ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <path
                      d={edge.arrow}
                      className={cn(
                        "fill-accent transition-opacity duration-200 motion-reduce:transition-none",
                        lit ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </g>
                );
              })}

              {signals ? (
                <g aria-hidden>
                  {geo.edges.map((edge) => (
                    <Signal
                      key={`${edge.from}>${edge.to}`}
                      d={edge.d}
                      layer={edge.layer}
                      cycle={cycle}
                    />
                  ))}
                </g>
              ) : null}

              {[...geo.placed.values()].map((p) => {
                const selected = shownId === p.node.id;
                const kind = p.node.kind;
                const lastLabelY = p.y + 40 + (p.labelLines.length - 1) * 17;
                return (
                  <g
                    key={p.node.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${p.node.label}, ${kind}${p.node.sublabel ? `, ${p.node.sublabel}` : ""}`}
                    aria-pressed={activeId === p.node.id}
                    onClick={() => select(p.node.id)}
                    onFocus={() => select(p.node.id)}
                    onPointerEnter={(event) => {
                      // Mouse hover previews. Touch and pen go through click.
                      if (event.pointerType === "mouse") select(p.node.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        select(p.node.id);
                      }
                    }}
                    className={cn(
                      "group/node cursor-pointer outline-none",
                      "group-data-[phase=hidden]/diagram:opacity-25",
                      "group-data-[phase=shown]/diagram:transition-opacity group-data-[phase=shown]/diagram:duration-500",
                      stepOf(NODE_DELAY, model.layer.get(p.node.id) ?? 0),
                    )}
                  >
                    {/* Keyboard focus ring, drawn by hand: the global outline would sit on the <g>'s box. */}
                    <rect
                      x={p.x - 4}
                      y={p.y - 4}
                      width={p.w + 8}
                      height={p.h + 8}
                      rx={10}
                      fill="none"
                      className="pointer-events-none stroke-accent stroke-2 opacity-0 group-focus-visible/node:opacity-100"
                    />
                    <rect
                      x={p.x}
                      y={p.y}
                      width={p.w}
                      height={p.h}
                      rx={kind === "actor" ? 12 : 6}
                      className={cn(
                        "transition-[fill,stroke,stroke-width] duration-200 motion-reduce:transition-none",
                        selected
                          ? "fill-accent-soft stroke-accent stroke-2"
                          : cn(
                              "fill-surface stroke-1 group-hover/node:fill-surface-hover",
                              kind === "gate"
                                ? "stroke-accent"
                                : "stroke-border-strong group-hover/node:stroke-muted",
                            ),
                      )}
                    />
                    {kind === "output" ? (
                      <rect
                        x={p.x + 3}
                        y={p.y + 3}
                        width={p.w - 6}
                        height={p.h - 6}
                        rx={4}
                        className="pointer-events-none fill-none stroke-border stroke-1"
                      />
                    ) : null}
                    {kind === "source" ? (
                      <path
                        d={`M${p.x + 5} ${p.y + 8}V${p.y + p.h - 8}`}
                        className="pointer-events-none stroke-border-strong stroke-1"
                      />
                    ) : null}
                    <KindGlyph kind={kind} x={p.x + TEXT_PAD} y={p.y + 9} />
                    <text
                      x={p.x + TEXT_PAD + 20}
                      y={p.y + 18}
                      fontSize={TAG_FS}
                      letterSpacing="0.12em"
                      className="fill-muted font-mono"
                    >
                      {KIND_LABEL[kind]}
                    </text>
                    {p.labelLines.map((line, i) => (
                      <text
                        key={`${i}-${line}`}
                        x={p.x + TEXT_PAD}
                        y={p.y + 40 + i * 17}
                        fontSize={LABEL_FS}
                        fontWeight={500}
                        className="fill-foreground font-mono"
                      >
                        {line}
                      </text>
                    ))}
                    {p.subLines.map((line, i) => (
                      <text
                        key={`${i}-${line}`}
                        x={p.x + TEXT_PAD}
                        y={lastLabelY + 18 + i * 15}
                        fontSize={SUB_FS}
                        className="fill-muted font-mono"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Below xl: the same nodes as a vertical flow. */}
          <div className="p-4 md:p-6 xl:hidden">
            <div className="mx-auto max-w-2xl">
              <StackedFlow model={model} label={label} groupName={`${uid}-nodes`} />
            </div>
          </div>
        </div>
      </ViewTransition>

      {/* xl and up: the detail panel. A polite live region, so a change is announced once. */}
      <div className="border-t max-xl:hidden">
        <div id={panelId} aria-live="polite" aria-atomic="true" className="min-h-80 px-6 py-8">
          <NodeDetail node={shownNode} model={model} withHead />
        </div>
      </div>

      {/* The same diagram as text, for assistive tech. The stacked rows already are text. */}
      <div className="sr-only max-xl:hidden">
        <h3>{label} as text</h3>
        <ol>
          {model.nodes.map((node, index) => (
            <li key={node.id}>
              <p>{describeNode(node, model, index + 1)}</p>
            </li>
          ))}
        </ol>
      </div>

      {diagram.caption || kinds.length > 0 ? (
        <figcaption className="flex flex-wrap items-start justify-between gap-x-12 gap-y-4 border-t px-4 py-4 md:px-6">
          {diagram.caption ? (
            <span className="max-w-2xl text-sm text-muted">{diagram.caption}</span>
          ) : null}
          <ul aria-label="Node kinds" className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {kinds.map((kind) => (
              <li key={kind} className="flex items-center gap-2 label-mono text-muted">
                <KindGlyph kind={kind} />
                {KIND_LABEL[kind]}
              </li>
            ))}
          </ul>
        </figcaption>
      ) : null}
    </figure>
  );
}
