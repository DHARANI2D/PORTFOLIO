import { ViewTransition } from "react";
import "@/components/hero/home-motion.css";
import { FlowHost } from "@/components/hero/flow-host";
import { cn } from "@/lib/utils";

type MiniDiagramProps = {
  /** Ordered stage labels, 3 to 6 of them (see Project.flow). */
  flow: readonly string[];
  /** When given, the diagram takes part in the card -> case-study view transition. */
  slug?: string;
  className?: string;
  /** Accessible name of the list. */
  label?: string;
};

/**
 * Compact signal-flow diagram for system cards: stages are nodes, thin lines are edges.
 *
 * Layout adapts to the width of the box it sits in (container query), not the viewport: a narrow
 * card stacks the stages vertically with the labels to the right; a wide card lays them out left
 * to right. It is a plain ordered list, so the flow reads in order for assistive tech; the nodes
 * and edges are decorative and aria-hidden.
 *
 * Motion is CSS only (see home-motion.css): ONE soft signal pass, started when the diagram scrolls
 * into view and over in about 4 s, so it never loops and never runs offscreen (WCAG 2.2.2).
 * Hovering or focusing the host card (marked data-flow-host) lights every stage in sequence.
 * With reduced motion nothing animates and hover simply lights the stages.
 *
 * Server component. The only client code is the small FlowHost leaf that starts the pass.
 */
export function MiniDiagram({ flow, slug, className, label = "Signal flow" }: MiniDiagramProps) {
  const diagram = (
    <FlowHost className={cn("@container", className)}>
      <ol role="list" aria-label={label} className="flex flex-col @md:flex-row">
        {flow.map((stage, index) => (
          <li
            key={`${index}-${stage}`}
            className="flow-step relative flex min-w-0 gap-3 pb-6 last:pb-0 @md:flex-1 @md:flex-col @md:pr-4 @md:pb-0"
          >
            <span
              aria-hidden
              className="relative mt-px size-3 shrink-0 rounded-full border border-border-strong bg-surface"
            >
              <span className="flow-fill absolute inset-[2px] rounded-full bg-accent" />
            </span>
            {index < flow.length - 1 ? (
              // Edge to the next node, with a 4px gap at both ends. The accent overlay is the signal.
              <span
                aria-hidden
                className="absolute top-[17px] bottom-[3px] left-[5.5px] w-px bg-border-strong @md:top-[6.5px] @md:right-[4px] @md:bottom-auto @md:left-[16px] @md:h-px @md:w-auto"
              >
                <span className="flow-edge absolute inset-0 bg-accent" />
              </span>
            ) : null}
            <span className="min-w-0 label-mono text-muted transition-colors duration-200 group-hover/card:text-foreground group-has-[a:focus-visible]/card:text-foreground motion-reduce:transition-none">
              {stage}
            </span>
          </li>
        ))}
      </ol>
    </FlowHost>
  );

  return slug ? <ViewTransition name={`diagram-${slug}`}>{diagram}</ViewTransition> : diagram;
}
