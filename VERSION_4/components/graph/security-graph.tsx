"use client";

import type { GraphNodeId } from "@/content/schema";
import { useActiveGraphNodes } from "@/components/graph/graph-context";
import {
  GRAPH_EDGES,
  GRAPH_LABELS,
  GRAPH_NODE_IDS,
  GRAPH_PLACEMENT,
  isRailEdge,
} from "@/components/graph/graph-data";
import styles from "@/components/graph/security-graph.module.css";

/** x as a percentage of the span between the two rails: 0% is the left rail, 100% the right one. */
const xOf = (id: GraphNodeId) => (GRAPH_PLACEMENT[id].side === "left" ? "0%" : "100%");
const yOf = (id: GraphNodeId) => `${GRAPH_PLACEMENT[id].y}%`;

type Active = ReadonlySet<GraphNodeId>;

/** Every edge of the given kind, as an idle line with a lit copy stacked above it. */
function Lines({ active, rails }: { active: Active; rails: boolean }) {
  return GRAPH_EDGES.filter(([from, to]) => isRailEdge(from, to) === rails).map(([from, to]) => {
    // 0 idle, 1 touches a lit node, 2 joins two lit nodes.
    const level = Number(active.has(from)) + Number(active.has(to));
    const geometry = { x1: xOf(from), y1: yOf(from), x2: xOf(to), y2: yOf(to) };
    const kind = rails ? styles.rail : styles.chord;
    return (
      <g key={`${from}-${to}`}>
        <line {...geometry} className={`${styles.line} ${kind}`} />
        <line
          {...geometry}
          data-level={level}
          className={`${styles.line} ${kind} ${styles.lineLit}`}
        />
      </g>
    );
  });
}

function Node({ id, isActive }: { id: GraphNodeId; isActive: boolean }) {
  const on = isActive ? "" : undefined;
  return (
    // A nested <svg> puts its origin at a percentage of the outer viewport, so the node follows
    // the rail at any size. The label is centred under the node.
    <svg x={xOf(id)} y={yOf(id)} width="1" height="1" overflow="visible">
      <g data-on={on} className={styles.idle}>
        <circle r={2} className={styles.dot} />
        <text y={20} className={styles.label}>
          {GRAPH_LABELS[id]}
        </text>
      </g>
      <g data-on={on} className={styles.on}>
        <circle r={7} className={styles.ring} />
        <circle r={2.5} className={styles.dotLit} />
        <text y={20} className={`${styles.label} ${styles.labelLit}`}>
          {GRAPH_LABELS[id]}
        </text>
      </g>
    </svg>
  );
}

/**
 * The site's one signature visual: seven domains and the relations between them, drawn faintly
 * down both margins of every page. Sections light the nodes they are about (see GraphActivator),
 * so the graph quietly follows the reader.
 *
 * Fixed, full-viewport, decorative (aria-hidden, no pointer events) and below all content: the body
 * is an isolated stacking context, so z-index -10 sits above the body fill and under everything
 * else. It never paints behind text: nodes and labels live in the margins beside the text column
 * and chords between the two sides fade out before the column (see security-graph.module.css and
 * GRAPH_PLACEMENT), so the contrast of text does not depend on the graph at any width or theme.
 *
 * No animation loop: a state change is a 300ms opacity transition between two stacked layers, which
 * also means nothing runs while the tab is hidden, and under prefers-reduced-motion it is instant.
 * `contain: strict` keeps its paint and layout from ever touching the page.
 */
export function SecurityGraph() {
  const active = useActiveGraphNodes();
  return (
    <div aria-hidden="true" data-graph="root" className={styles.root}>
      <svg focusable="false" data-graph="chords" className={styles.chords}>
        <Lines active={active} rails={false} />
      </svg>
      <svg focusable="false" data-graph="plane" className={styles.plane}>
        <Lines active={active} rails />
        {GRAPH_NODE_IDS.map((id) => (
          <Node key={id} id={id} isActive={active.has(id)} />
        ))}
      </svg>
    </div>
  );
}
