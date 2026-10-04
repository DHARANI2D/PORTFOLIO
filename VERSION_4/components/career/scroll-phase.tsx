"use client";

import { useEffect, useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type ScrollPhaseProps = {
  as?: "div" | "li" | "figure";
  className?: string;
  children: React.ReactNode;
};

/**
 * Scroll-driven reveal as a progressive enhancement. It is the only client code behind the career
 * path (/about) and the operating graph (/experience): everything inside stays a server component.
 *
 * The server HTML carries no `data-phase`, so no-JS, crawlers and reduced motion all get the final,
 * fully visible state. After hydration, only an element that is still below the fold is armed
 * (`data-phase="hidden"`) and it moves to `shown` when Motion's useInView sees it. Descendants
 * style themselves with `group-data-[phase=...]/phase:` variants. Every hidden-state class is
 * gated with `motion-safe:`, so reduced motion never hides anything, even if the preference
 * changes while the page is open.
 *
 * The phase lives in a DOM attribute rather than React state: no re-render per step, and no inline
 * style (the site ships a strict CSP). Before printing, armed elements drop back to the static state.
 */
export function ScrollPhase({ as = "div", className, children }: ScrollPhaseProps) {
  // Asserted so TypeScript does not narrow it to the three tag names and demand an intersected ref.
  const Component = as as React.ElementType;
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia(REDUCED_MOTION).matches) return;
    // Already on screen, or scrolled past (restored scroll position): leave the final state alone.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.phase = "hidden";

    // If the browser restores the scroll position after this runs, an armed element can end up
    // above the viewport and would never "enter". Anything scrolled past counts as seen.
    const onScroll = () => {
      if (element.dataset.phase !== "hidden") {
        window.removeEventListener("scroll", onScroll);
      } else if (element.getBoundingClientRect().bottom < 0) {
        element.dataset.phase = "shown";
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Printing must never lose content. Dropping the attribute returns the element to its static,
    // fully visible state, and that state has no transition, so the print layout sees it at once.
    const onBeforePrint = () => {
      delete element.dataset.phase;
    };
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeprint", onBeforePrint);
      delete element.dataset.phase;
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (inView && element?.dataset.phase === "hidden") element.dataset.phase = "shown";
  }, [inView]);

  return (
    <Component ref={ref} className={cn("group/phase", className)}>
      {children}
    </Component>
  );
}
