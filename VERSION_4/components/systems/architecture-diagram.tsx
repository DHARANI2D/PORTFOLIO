"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, ViewTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ArchDiagram, ArchNode } from "@/content/schema";
import { cn } from "@/lib/utils";
import {
  buildModel,
  groupNodes,
  layout,
  TAG_FS,
  TEXT_PAD,
  LABEL_FS,
  SUB_FS,
  BOUNDARY_FS,
  VB_W,
  type Kind,
  type Model,
} from "@/components/systems/diagram-layout";

/*
 * ArchitectureDiagram: data-driven from ArchDiagram, in two forms of the same thing.
 *
 *  - xl and up: one inline SVG. Nodes sit on the content's col/row grid, edges are orthogonal
 *    paths, trust boundaries are dashed labelled groups (geometry lives in diagram-layout.ts).
 *    Nodes are focusable buttons; hover, focus or a click shows INPUT / PROCESS / OUTPUT / TRUST
 *    BOUNDARY in a panel directly above the SVG. The panel sticks under the site header while the
 *    diagram is on screen, so the detail is always in view next to the node being read, and it is
 *    sized to the tallest node so changing the selection never moves anything.
 *  - below xl: the nodes as native <details> rows, grouped by trust boundary, in reading order, with
 *    the same detail inside each row. Works with no JS. The SVG needs a wide canvas: at 1200 units
 *    it is drawn at about 0.96 scale on a 1280px screen, and text would shrink below that. The rows
 *    draw no connectors: a connector between neighbouring rows reads as "then", which is false for
 *    nodes that feed each other out of order. Each row lists what it feeds, and nodes at the same
 *    depth sit side by side as siblings.
 *
 * Motion is an enhancement and never gates content. The server HTML is the final, fully drawn
 * diagram. After hydration, a diagram that is still below the fold is reset and then draws in when
 * it scrolls into view (nodes light in layer order, edges draw with stroke-dashoffset), then one
 * soft signal travels the edges once, about 5 s in all. Nothing loops. Reduced motion: none of that.
 * No inline styles are used (the site ships a strict CSP): geometry is SVG attributes and every
 * delay is a literal class.
 */

const KIND_LABEL: Record<Kind, string> = {
  source: "SOURCE",
  process: "PROCESS",
  gate: "GATE",
  output: "OUTPUT",
  actor: "ACTOR",
};
const KIND_ORDER: readonly Kind[] = ["source", "actor", "process", "gate", "output"];

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

/*
 * One signal pass (WCAG 2.2.2: nothing auto-animates for more than 5 s). The pass waits for the
 * draw-in to settle, then a pulse runs down each edge in layer order, once. The whole pass is
 * PASS_SECONDS at most, and the signals are removed from the DOM afterwards, so the diagram rests.
 */
const PASS_LEAD = 1.2;
const PASS_BODY = 3.4;
const PULSE_MAX = 0.8;
const PASS_SECONDS = PASS_LEAD + PASS_BODY; // 4.6

/** Pulse length per layer: PULSE_MAX, or less on a deep diagram so the pass still fits. */
const pulseFor = (layers: number) => Math.min(PULSE_MAX, PASS_BODY / Math.max(1, layers));

/**
 * One soft pulse running down an edge, once. SMIL: no JS per frame. The animations are created with
 * begin="indefinite" and started on mount: a SMIL element inserted into a document whose timeline
 * has been running would otherwise begin at time zero, in the past, and never show.
 */
function Signal({ d, layer, pulse }: { d: string; layer: number; pulse: number }) {
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  const fadeRef = useRef<SVGAnimateElement>(null);
  useEffect(() => {
    motionRef.current?.beginElement?.();
    fadeRef.current?.beginElement?.();
  }, []);

  const start = PASS_LEAD + layer * pulse;
  const t0 = (start / PASS_SECONDS).toFixed(4);
  const t1 = ((start + pulse) / PASS_SECONDS).toFixed(4);
  return (
    <circle r="3" opacity="0" className="fill-accent">
      <animateMotion
        ref={motionRef}
        begin="indefinite"
        dur={`${PASS_SECONDS}s`}
        repeatCount="1"
        path={d}
        calcMode="linear"
        keyPoints="0;0;1;1"
        keyTimes={`0;${t0};${t1};1`}
      />
      <animate
        ref={fadeRef}
        begin="indefinite"
        attributeName="opacity"
        dur={`${PASS_SECONDS}s`}
        repeatCount="1"
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
const pad2 = (n: number) => String(n).padStart(2, "0");

function detailFields(node: ArchNode): { label: string; text: string }[] {
  const fields = [
    { label: "INPUT", text: node.input },
    { label: "PROCESS", text: node.process },
    { label: "OUTPUT", text: node.output },
    { label: "TRUST BOUNDARY", text: node.trustBoundary },
  ];
  return fields.flatMap((f) => (f.text ? [{ label: f.label, text: f.text }] : []));
}

/**
 * The detail of one node. `panel` adds the head (kind, position, name) and is compact: it is read
 * next to the diagram. `row` is the body of a stacked row, whose summary already carries the head.
 */
function NodeDetail({
  node,
  model,
  variant,
}: {
  node: ArchNode;
  model: Model;
  variant: "panel" | "row";
}) {
  const fields = detailFields(node);
  const boundary = model.boundaryOf.get(node.id);
  const from = model.from.get(node.id) ?? [];
  const to = model.to.get(node.id) ?? [];
  const position = model.nodes.findIndex((n) => n.id === node.id) + 1;
  const panel = variant === "panel";

  const relations =
    from.length > 0 || to.length > 0 ? (
      <dl
        className={cn(
          "flex flex-wrap gap-x-8 gap-y-2",
          panel ? "mt-3 text-xs" : "mt-6 gap-y-4 border-t pt-6 text-sm",
        )}
      >
        {from.length > 0 ? (
          <div className={cn("min-w-0", panel ? "flex flex-wrap gap-x-3" : "")}>
            <dt className="label-mono text-muted">RECEIVES FROM</dt>
            <dd className={cn("text-foreground", panel ? "" : "mt-3")}>{names(from)}</dd>
          </div>
        ) : null}
        {to.length > 0 ? (
          <div className={cn("min-w-0", panel ? "flex flex-wrap gap-x-3" : "")}>
            <dt className="label-mono text-muted">SENDS TO</dt>
            <dd className={cn("text-foreground", panel ? "" : "mt-3")}>{names(to)}</dd>
          </div>
        ) : null}
      </dl>
    ) : null;

  return (
    <div>
      {panel ? (
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="font-mono text-lg font-medium tracking-tight text-foreground">
              {node.label}
            </p>
            {node.sublabel ? <p className="mt-1 text-sm text-muted">{node.sublabel}</p> : null}
            {relations}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 label-mono text-muted">
            <span className="flex items-center gap-2 text-foreground">
              <KindGlyph kind={node.kind} />
              {KIND_LABEL[node.kind]}
            </span>
            <span>
              NODE {pad2(position)} / {pad2(model.nodes.length)}
            </span>
            {boundary ? <span>{boundary.label.toUpperCase()}</span> : null}
          </div>
        </div>
      ) : null}

      {fields.length > 0 ? (
        <dl
          className={cn(
            "grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-x-6",
            panel ? "mt-4 gap-y-3" : "gap-y-6",
          )}
        >
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="label-mono text-muted">{field.label}</dt>
              <dd className={cn("text-sm text-foreground", panel ? "mt-1.5" : "mt-3")}>
                {field.text}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={cn("text-sm text-muted", panel ? "mt-4" : "")}>
          No further detail is published for this node.
        </p>
      )}

      {panel ? null : relations}
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

/* -------------------------------------------------------- stacked fallback */

// Columns follow the width of the diagram box (container query), not the viewport, so the rows use
// whatever width there is: one column on a phone, two on a tablet, three where a stage has three.
const STAGE_COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-1 @lg:grid-cols-2",
  3: "grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3",
} as const;

function StackedRow({
  node,
  model,
  stage,
  groupName,
}: {
  node: ArchNode;
  model: Model;
  stage: number;
  groupName: string;
}) {
  const feeds = model.to.get(node.id) ?? [];
  return (
    <details
      name={groupName}
      className={cn(
        "group/row rounded-md border bg-surface open:bg-surface-hover",
        node.kind === "gate" ? "border-accent" : "border-border-strong",
      )}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-md px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <KindGlyph kind={node.kind} />
        <span className="flex min-w-0 flex-1 flex-col gap-2 @md:grid @md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] @md:items-end @md:gap-x-8">
          <span className="flex min-w-0 flex-col gap-2">
            <span className="label-mono text-muted">
              STAGE {pad2(stage + 1)} · {KIND_LABEL[node.kind]}
            </span>
            <span className="font-mono text-sm font-medium break-words text-foreground">
              {node.label}
            </span>
            {node.sublabel ? <span className="text-xs text-muted">{node.sublabel}</span> : null}
          </span>
          {feeds.length > 0 ? (
            <span className="text-xs break-words text-muted">
              <span className="label-mono">Feeds</span> <span aria-hidden>→</span>{" "}
              <span className="text-foreground">{names(feeds)}</span>
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open/row:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t px-3 py-6 sm:px-4">
        <NodeDetail node={node} model={model} variant="row" />
      </div>
    </details>
  );
}

/** Below xl: nodes as native disclosure rows. One open at a time. No connectors, see the header. */
function StackedFlow({
  model,
  label,
  groupName,
}: {
  model: Model;
  label: string;
  groupName: string;
}) {
  const runs = groupNodes(model);
  return (
    <div className="@container">
      <p className="max-w-prose text-xs text-muted">
        Stages are numbered by depth in the flow. Nodes in one stage do not feed each other. Each
        node lists what it feeds.
      </p>
      <ol aria-label={`${label}, in reading order`} className="mt-4 flex flex-col gap-4">
        {runs.map((run) => {
          const stages = (
            <ol className="flex flex-col gap-3">
              {run.stages.map((stage) => {
                const rows = stage.nodes.map((node) => (
                  <StackedRow
                    key={node.id}
                    node={node}
                    model={model}
                    stage={stage.layer}
                    groupName={groupName}
                  />
                ));
                const columns = STAGE_COLUMNS[Math.min(3, stage.nodes.length) as 1 | 2 | 3];
                return (
                  <li key={stage.nodes.map((n) => n.id).join("+")}>
                    {stage.nodes.length === 1 ? (
                      <div className="@container">{rows}</div>
                    ) : (
                      <ul
                        aria-label={`Stage ${pad2(stage.layer + 1)}: ${names(stage.nodes)}`}
                        className={cn("grid items-start gap-3", columns)}
                      >
                        {stage.nodes.map((node, i) => (
                          <li key={node.id} className="@container min-w-0">
                            {rows[i]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          );

          return (
            <li key={run.key}>
              {run.boundary ? (
                <div
                  role="group"
                  aria-label={`Trust boundary: ${run.boundary.label}`}
                  className="rounded-lg border border-dashed border-border-strong p-2 sm:p-3"
                >
                  <p aria-hidden className="mb-3 label-mono text-muted">
                    {run.boundary.label}
                  </p>
                  {stages}
                </div>
              ) : (
                stages
              )}
            </li>
          );
        })}
      </ol>
    </div>
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
  const dockRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("static");
  const [inView, setInView] = useState(false);
  const [passDone, setPassDone] = useState(false);
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

  // One pass while the diagram is on screen. Scrolling away mid-pass stops it (the signals unmount
  // with `inView`); scrolling back restarts it until it has completed once.
  const signalling = !reduced && inView && phase !== "static" && !passDone;
  useEffect(() => {
    if (!signalling) return;
    const timer = window.setTimeout(() => setPassDone(true), (PASS_SECONDS + 0.3) * 1000);
    return () => window.clearTimeout(timer);
  }, [signalling]);

  const model = buildModel(diagram);
  const shownId = activeId ?? model.defaultId;
  const shownNode = model.byId.get(shownId);
  if (!shownNode || model.nodes.length === 0) return null;

  const geo = layout(model);
  const label = name ? `${name} architecture` : "Architecture";
  const panelId = `${uid}-panel`;
  const effectivePhase: Phase = reduced ? "static" : phase;
  const pulse = pulseFor(model.maxLayer + 1);
  const shownBoundary = model.boundaryOf.get(shownId);
  const kinds = KIND_ORDER.filter((kind) => model.nodes.some((n) => n.kind === kind));

  const select = (id: string) => setActiveId(id);

  // WCAG 2.4.11: a node that takes focus must not sit under the pinned panel. The browser scrolls a
  // focused element clear of the site header only, so when the panel is pinned and the node is
  // above its lower edge, scroll the page until the node (and its focus ring) is just below it.
  const clearOfDock = (node: Element) => {
    window.requestAnimationFrame(() => {
      const dock = dockRef.current;
      if (!dock || getComputedStyle(dock).position !== "sticky") return;
      const gap = node.getBoundingClientRect().top - dock.getBoundingClientRect().bottom;
      if (gap < 12) window.scrollBy({ top: gap - 12, behavior: "instant" });
    });
  };

  return (
    <figure aria-label={label} className="overflow-clip rounded-lg border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-4 py-3 md:px-6">
        <Label>ARCHITECTURE / SCHEMATIC</Label>
        <p className="label-mono text-muted max-xl:hidden">HOVER, FOCUS OR CLICK A NODE</p>
        <p className="label-mono text-muted xl:hidden">TAP A NODE TO OPEN IT</p>
      </div>

      {/* xl and up: the detail panel, directly above the diagram and pinned under the site header
          while the diagram is on screen (on screens tall enough to spare the room). A polite live
          region, so a change is announced once. Every node's detail is also laid into the same grid
          cell, invisible and hidden from assistive tech, so the cell is as tall as the tallest
          node and a new selection never changes the height of anything. */}
      <div
        ref={dockRef}
        className="z-10 border-b bg-surface max-xl:hidden [@media(min-height:45rem)]:sticky [@media(min-height:45rem)]:top-16"
      >
        <div className="grid px-6 py-4">
          <div
            id={panelId}
            aria-live="polite"
            aria-atomic="true"
            className="col-start-1 row-start-1 min-w-0"
          >
            <NodeDetail node={shownNode} model={model} variant="panel" />
          </div>
          {model.nodes.map((node) => (
            <div
              key={node.id}
              aria-hidden
              className="pointer-events-none invisible col-start-1 row-start-1 min-w-0 select-none"
            >
              <NodeDetail node={node} model={model} variant="panel" />
            </div>
          ))}
        </div>
      </div>

      <ViewTransition name={`diagram-${slug}`}>
        <div ref={canvasRef} data-phase={effectivePhase} className="group/diagram">
          {/* xl and up: the SVG. Everything inside is decorative except the node buttons. */}
          <div className="px-6 pt-4 pb-6 max-xl:hidden">
            <svg
              viewBox={`0 0 ${VB_W} ${geo.height}`}
              role="group"
              aria-label={`${label} diagram. Each node is a button that shows its detail in the panel above the diagram.`}
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

              {/* Boundary labels come after the edges and carry a halo in the surface colour. The
                  layout already keeps every edge clear of them; the halo is the backstop, so a
                  crossing could never strike through the text. */}
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
                    {b.lines.map((line, i) => (
                      <text
                        key={line}
                        x={b.tx}
                        y={b.y + 18 + i * 12}
                        fontSize={BOUNDARY_FS}
                        letterSpacing="0.12em"
                        strokeWidth={4}
                        strokeLinejoin="round"
                        className={cn(
                          "stroke-surface font-mono transition-colors duration-200 [paint-order:stroke] motion-reduce:transition-none",
                          active ? "fill-foreground" : "fill-muted",
                        )}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}

              {signalling ? (
                <g aria-hidden>
                  {geo.edges.map((edge) => (
                    <Signal
                      key={`${edge.from}>${edge.to}`}
                      d={edge.d}
                      layer={edge.layer}
                      pulse={pulse}
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
                    aria-controls={panelId}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => select(p.node.id)}
                    onFocus={(event) => {
                      select(p.node.id);
                      clearOfDock(event.currentTarget);
                    }}
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

          {/* Below xl: the same nodes as grouped rows. They use the width they are given. */}
          <div className="p-3 sm:p-4 md:p-6 xl:hidden">
            <StackedFlow model={model} label={label} groupName={`${uid}-nodes`} />
          </div>
        </div>
      </ViewTransition>

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
