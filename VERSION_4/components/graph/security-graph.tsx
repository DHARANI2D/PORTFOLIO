"use client";

import type { GraphNodeId } from "@/content/schema";
import { useActiveGraphNodes } from "@/components/graph/graph-context";
import {
  GRAPH_EDGES,
  GRAPH_LABELS,
  GRAPH_LAYOUTS,
  GRAPH_NODE_IDS,
  type GraphLayoutName,
} from "@/components/graph/graph-data";
import { cn } from "@/lib/utils";

/**
 * Opacity budget, as custom properties so dark and light can differ. Nothing is above 0.5 and idle
 * labels are 0.2 or less. The values are chosen against the contrast of body copy sitting on top
 * of a graph pixel: in dark, secondary (muted) text keeps at least 4.5:1 over every layer except
 * the 5px lit dot, and primary text keeps at least 5:1 over everything. Light theme is lower
 * because muted text there is only 4.97:1 on the page background to begin with, so the layers are
 * kept as faint as still reads as lit; muted text over a lit pixel there is about 3.6 to 4.5:1,
 * primary text at least 6.5:1.
 * Lit state is carried by hue (accent), weight (ring, larger dot) and opacity together.
 */
const budget = [
  "[--g-line:0.55] [--g-line-1:0.26] [--g-line-2:0.3]",
  "[--g-dot:0.2] [--g-dot-on:0.5] [--g-ring-on:0.28]",
  "[--g-label:0.2] [--g-label-on:0.3]",
  "[[data-theme=light]_&]:[--g-line:0.28] [[data-theme=light]_&]:[--g-line-1:0.12] [[data-theme=light]_&]:[--g-line-2:0.16]",
  "[[data-theme=light]_&]:[--g-dot:0.15] [[data-theme=light]_&]:[--g-dot-on:0.4] [[data-theme=light]_&]:[--g-ring-on:0.2]",
  "[[data-theme=light]_&]:[--g-label:0.1] [[data-theme=light]_&]:[--g-label-on:0.16]",
].join(" ");

// One calm, slow ease for every state change. Reduced motion: the state changes instantly.
const ease =
  "transition-[opacity,fill,stroke,r] duration-[1400ms] ease-out motion-reduce:transition-none";

function GraphLayer({
  layout,
  active,
  className,
}: {
  layout: GraphLayoutName;
  active: ReadonlySet<GraphNodeId>;
  className: string;
}) {
  const placement = GRAPH_LAYOUTS[layout];
  return (
    // No viewBox on purpose: user units are CSS pixels, so dots and text are never stretched and
    // percentage coordinates still follow the viewport on any aspect ratio.
    <svg focusable="false" className={cn("absolute inset-0 size-full", className)}>
      {GRAPH_EDGES.map(([from, to]) => {
        const [x1, y1] = placement[from];
        const [x2, y2] = placement[to];
        // 0 idle, 1 touches a lit node, 2 joins two lit nodes.
        const level = Number(active.has(from)) + Number(active.has(to));
        return (
          <line
            key={`${from}-${to}`}
            x1={`${x1}%`}
            y1={`${y1}%`}
            x2={`${x2}%`}
            y2={`${y2}%`}
            data-level={level}
            className={cn(
              "stroke-border-strong stroke-1 opacity-(--g-line)",
              "data-[level='1']:stroke-accent data-[level='1']:opacity-(--g-line-1)",
              "data-[level='2']:stroke-accent data-[level='2']:opacity-(--g-line-2)",
              ease,
            )}
          />
        );
      })}
      {GRAPH_NODE_IDS.map((id) => {
        const [x, y] = placement[id];
        const on = active.has(id) ? "" : undefined;
        return (
          // A nested <svg> positions its origin at a percentage of the outer viewport.
          <svg key={id} x={`${x}%`} y={`${y}%`} width="1" height="1" overflow="visible">
            <circle
              r={7}
              data-active={on}
              className={cn(
                "fill-none stroke-accent stroke-1 opacity-0",
                "data-active:opacity-(--g-ring-on)",
                ease,
              )}
            />
            <circle
              r={2}
              data-active={on}
              className={cn(
                "fill-muted opacity-(--g-dot) [r:2px]",
                "data-active:fill-accent data-active:opacity-(--g-dot-on) data-active:[r:2.5px]",
                ease,
              )}
            />
            <text
              y={20}
              textAnchor="middle"
              data-active={on}
              className={cn(
                "fill-muted font-mono text-[10px] tracking-[0.14em] opacity-(--g-label)",
                "data-active:fill-accent data-active:opacity-(--g-label-on)",
                ease,
              )}
            >
              {GRAPH_LABELS[id]}
            </text>
          </svg>
        );
      })}
    </svg>
  );
}

/**
 * The site's one signature visual: seven domains and the relations between them, drawn faintly
 * behind every page. Sections light the nodes they are about (see GraphActivator), so the graph
 * quietly follows the reader.
 *
 * Fixed, full-viewport, decorative (aria-hidden, no pointer events) and below all content: the body
 * is an isolated stacking context, so -z-10 sits above the body fill and under everything else.
 * No animation loop: state changes are CSS transitions, which also means nothing runs while the tab
 * is hidden, and under prefers-reduced-motion they are instant. `contain: strict` keeps its paint
 * and layout from ever touching the page.
 *
 * Two layouts, switched with CSS at `md`: a ring around a landscape viewport, and a vertical ring
 * for portrait phones. The hidden one is display: none and costs nothing.
 */
export function SecurityGraph() {
  const active = useActiveGraphNodes();
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden [contain:strict] select-none",
        budget,
      )}
    >
      <GraphLayer layout="wide" active={active} className="hidden md:block" />
      <GraphLayer layout="tall" active={active} className="md:hidden" />
    </div>
  );
}
