import { ScrollPhase } from "@/components/career/scroll-phase";
import { Label } from "@/components/ui/label";
import type { GraphNodeId } from "@/content/schema";
import { cn } from "@/lib/utils";

/*
 * THE SECURITY OPERATING GRAPH. A conceptual map of how the disciplines in the work connect:
 * cloud security on top, three disciplines in the middle row, three in the bottom row, with
 * vertical links between the rows. It is not an architecture of any deployed system.
 *
 * Two forms of the same data, because the SVG needs a wide canvas (12px text at a 960 unit
 * viewBox is only legible from about 1024px):
 *  - lg and up: one inline SVG, drawn in on scroll. Decorative (aria-hidden).
 *  - below lg: the nodes as a list of cards, each naming the nodes it links to.
 * That same list is the text equivalent at lg and up, where it is visually hidden (lg:sr-only).
 *
 * Server component. The only client code is <ScrollPhase>, which sets a data-phase attribute that
 * the classes below follow. Without JS or with reduced motion the graph is simply fully drawn.
 * No inline styles (the site ships a strict CSP): geometry is SVG attributes, delays are literals.
 */

type OperatingNode = {
  id: GraphNodeId;
  name: string;
  /** Short, grounded in docs/FACTS.md section A. */
  detail: string;
  col: 0 | 1 | 2;
  row: 0 | 1 | 2;
};

/** Reading order: top row, then middle row, then bottom row. */
const NODES: readonly OperatingNode[] = [
  { id: "cloud", name: "Cloud security", detail: "AWS · Azure · IAM", col: 1, row: 0 },
  { id: "soc", name: "SOC", detail: "Triage · escalation", col: 0, row: 1 },
  {
    id: "detection",
    name: "Detection engineering",
    detail: "SIEM rules · MITRE ATT&CK",
    col: 1,
    row: 1,
  },
  { id: "ai", name: "AI security", detail: "LLM · agent security", col: 2, row: 1 },
  { id: "dfir", name: "Incident response", detail: "Lifecycle · root cause", col: 0, row: 2 },
  {
    id: "automation",
    name: "Security automation",
    detail: "Python · alert pipelines",
    col: 1,
    row: 2,
  },
  { id: "agents", name: "Agents", detail: "WITNESS · HELIOS", col: 2, row: 2 },
];

/** Undirected. Each pair shares a row (a horizontal link) or a column (a vertical link). */
const EDGES: readonly (readonly [GraphNodeId, GraphNodeId])[] = [
  ["cloud", "detection"],
  ["soc", "detection"],
  ["detection", "ai"],
  ["soc", "dfir"],
  ["detection", "automation"],
  ["ai", "agents"],
  ["dfir", "automation"],
  ["automation", "agents"],
];

/** For the page's GraphActivator: every node this diagram shows. */
export const OPERATING_NODE_IDS: readonly GraphNodeId[] = NODES.map((node) => node.id);
export const OPERATING_GRAPH_STATS = { nodes: NODES.length, links: EDGES.length } as const;

/* --------------------------------------------------------------- geometry */

const VB_W = 960;
const NODE_W = 248;
const NODE_H = 72;
const COL_GAP = (VB_W - 3 * NODE_W) / 2;
const ROW_GAP = 56;
const PAD_Y = 8;
const VB_H = 2 * PAD_Y + 3 * NODE_H + 2 * ROW_GAP;
const TEXT_X = 16;

const colX = (col: number) => col * (NODE_W + COL_GAP);
const rowY = (row: number) => PAD_Y + row * (NODE_H + ROW_GAP);

const byId = new Map(NODES.map((node) => [node.id, node]));

type EdgeGeo = { key: string; d: string; step: number };

/** A straight link from one node's border to the other's. Anything not on a shared row/col is dropped. */
function edgeGeo([a, b]: readonly [GraphNodeId, GraphNodeId]): EdgeGeo[] {
  const na = byId.get(a);
  const nb = byId.get(b);
  if (!na || !nb) return [];
  const key = `${a}-${b}`;

  if (na.row === nb.row) {
    const [left, right] = na.col < nb.col ? [na, nb] : [nb, na];
    const y = rowY(na.row) + NODE_H / 2;
    // Horizontal links in row r draw after the vertical links above them.
    return [
      { key, d: `M${colX(left.col) + NODE_W} ${y}H${colX(right.col)}`, step: na.row * 2 - 1 },
    ];
  }
  if (na.col === nb.col) {
    const [top, bottom] = na.row < nb.row ? [na, nb] : [nb, na];
    const x = colX(na.col) + NODE_W / 2;
    return [{ key, d: `M${x} ${rowY(top.row) + NODE_H}V${rowY(bottom.row)}`, step: top.row * 2 }];
  }
  return [];
}

const EDGE_GEOMETRY = EDGES.flatMap(edgeGeo);

/** Names of the nodes a node links to, in edge order. */
function linksOf(id: GraphNodeId): string[] {
  return EDGES.flatMap(([a, b]) => {
    const other = a === id ? b : b === id ? a : null;
    const name = other ? byId.get(other)?.name : undefined;
    return name ? [name] : [];
  });
}

/* ----------------------------------------------------------------- motion */

// Delays are literal class names so Tailwind can see them. Order: cloud, the link below it, the
// middle row, its horizontal links, the links down, the bottom row, its horizontal links.
const NODE_DELAY = [
  "motion-safe:group-data-[phase=shown]/phase:delay-0",
  "motion-safe:group-data-[phase=shown]/phase:delay-500",
  "motion-safe:group-data-[phase=shown]/phase:delay-1100",
] as const;
const DOT_DELAY = [
  "motion-safe:group-data-[phase=shown]/phase:delay-300",
  "motion-safe:group-data-[phase=shown]/phase:delay-800",
  "motion-safe:group-data-[phase=shown]/phase:delay-1400",
] as const;
const EDGE_DELAY = [
  "motion-safe:group-data-[phase=shown]/phase:delay-100",
  "motion-safe:group-data-[phase=shown]/phase:delay-700",
  "motion-safe:group-data-[phase=shown]/phase:delay-900",
  "motion-safe:group-data-[phase=shown]/phase:delay-1300",
] as const;
// Stacked cards enter one after another.
const CARD_DELAY = [
  "motion-safe:group-data-[phase=shown]/phase:delay-0",
  "motion-safe:group-data-[phase=shown]/phase:delay-100",
  "motion-safe:group-data-[phase=shown]/phase:delay-200",
  "motion-safe:group-data-[phase=shown]/phase:delay-300",
  "motion-safe:group-data-[phase=shown]/phase:delay-400",
  "motion-safe:group-data-[phase=shown]/phase:delay-500",
  "motion-safe:group-data-[phase=shown]/phase:delay-600",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/* -------------------------------------------------------------- component */

export function OperatingGraph() {
  return (
    <ScrollPhase as="figure" className="overflow-hidden rounded-lg border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3 md:px-6">
        <Label>OPERATING GRAPH / SCHEMATIC</Label>
        <Label>
          {pad(OPERATING_GRAPH_STATS.nodes)} NODES · {pad(OPERATING_GRAPH_STATS.links)} LINKS
        </Label>
      </div>

      {/* lg and up: the drawing. The list below is its text equivalent. */}
      <div className="hidden p-8 lg:block">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          aria-hidden
          focusable="false"
          className="mx-auto block h-auto w-full max-w-[60rem]"
        >
          {EDGE_GEOMETRY.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              pathLength={1}
              fill="none"
              className={cn(
                "stroke-muted stroke-1 [stroke-dasharray:1] [stroke-dashoffset:0]",
                "motion-safe:group-data-[phase=hidden]/phase:[stroke-dashoffset:1]",
                "motion-safe:group-data-[phase=shown]/phase:transition-[stroke-dashoffset] motion-safe:group-data-[phase=shown]/phase:duration-500 motion-safe:group-data-[phase=shown]/phase:ease-out",
                EDGE_DELAY[Math.min(edge.step, EDGE_DELAY.length - 1)],
              )}
            />
          ))}

          {NODES.map((node) => {
            const x = colX(node.col);
            const y = rowY(node.row);
            return (
              <g
                key={node.id}
                className={cn(
                  "motion-safe:group-data-[phase=hidden]/phase:opacity-25",
                  "motion-safe:group-data-[phase=shown]/phase:transition-opacity motion-safe:group-data-[phase=shown]/phase:duration-500",
                  NODE_DELAY[node.row],
                )}
              >
                <rect
                  x={x}
                  y={y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  className="fill-surface stroke-border-strong stroke-1"
                />
                <text
                  x={x + TEXT_X}
                  y={y + 32}
                  fontSize={14}
                  fontWeight={500}
                  className="fill-foreground font-mono"
                >
                  {node.name.toUpperCase()}
                </text>
                <text x={x + TEXT_X} y={y + 54} fontSize={12} className="fill-muted font-mono">
                  {node.detail}
                </text>
                {/* Activation dot: lights after its node. */}
                <circle
                  cx={x + NODE_W - TEXT_X}
                  cy={y + TEXT_X}
                  r={3}
                  className={cn(
                    "fill-accent",
                    "motion-safe:group-data-[phase=hidden]/phase:opacity-0",
                    "motion-safe:group-data-[phase=shown]/phase:transition-opacity motion-safe:group-data-[phase=shown]/phase:duration-700",
                    DOT_DELAY[node.row],
                  )}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Below lg: the visible form. At lg and up: the same list, visually hidden. */}
      <div className="p-4 md:p-6 lg:sr-only">
        <h3 className="sr-only">Security operating graph, as text</h3>
        <ol className="grid gap-3 sm:grid-cols-2">
          {NODES.map((node, index) => (
            <li
              key={node.id}
              className={cn(
                "rounded-md border bg-surface p-4",
                "motion-safe:group-data-[phase=hidden]/phase:translate-y-2 motion-safe:group-data-[phase=hidden]/phase:opacity-0",
                "motion-safe:group-data-[phase=shown]/phase:transition-[opacity,translate] motion-safe:group-data-[phase=shown]/phase:duration-500",
                CARD_DELAY[index],
              )}
            >
              <p className="flex items-center justify-between gap-3 label-mono text-muted">
                <span>NODE {pad(index + 1)}</span>
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              </p>
              <p className="mt-3 font-mono text-sm font-medium text-foreground">
                {node.name.toUpperCase()}
              </p>
              <p className="mt-2 text-sm text-muted">{node.detail}</p>
              <p className="mt-4 border-t pt-3 text-sm">
                <span className="label-mono text-muted">LINKS TO </span>
                <span className="text-foreground">{linksOf(node.id).join(", ")}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      <figcaption className="border-t px-4 py-4 text-sm text-muted md:px-6">
        A conceptual map of how these disciplines connect in the work. A line marks a connection. It
        does not describe a deployed architecture.
      </figcaption>
    </ScrollPhase>
  );
}
