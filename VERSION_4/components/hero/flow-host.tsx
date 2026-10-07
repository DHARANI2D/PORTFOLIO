"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One ambient signal pass for a MiniDiagram. The pass is plain CSS (home-motion.css, keyed on the
 * `data-flow` attribute below); this leaf only decides when it may run.
 *
 *  - idle: the server HTML and everything before the diagram is on screen. Nothing animates.
 *  - run: the diagram has scrolled into view. One pass plays, longest stage included, in under 5 s
 *    (WCAG 2.2.2). Nothing runs while the diagram is offscreen, and it never loops.
 *  - done: the pass is over. The animation rules no longer match, so the diagram rests, and hover
 *    or focus on the card still lights the stages through a transition.
 *
 * Under reduced motion the state never leaves idle, and the CSS does not animate anyway.
 */

/** A little over the longest pass in home-motion.css (8 stages): 7 x 350 ms + 300 ms + 2.4 s. */
const PASS_MS = 4900;

type FlowState = "idle" | "run" | "done";

export function FlowHost({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<FlowState>("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setState("run");
        timer = window.setTimeout(() => setState("done"), PASS_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} data-flow={state} className={className}>
      {children}
    </div>
  );
}
