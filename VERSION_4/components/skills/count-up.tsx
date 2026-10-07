"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

type CountUpProps = {
  value: number;
  className?: string;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Writes into the existing text node so React's own reference to it never goes stale. */
function setText(el: HTMLElement, text: string): void {
  if (el.firstChild) el.firstChild.nodeValue = text;
  else el.textContent = text;
}

/**
 * Counts from 0 to `value` once, when scrolled into view.
 *
 * The server renders the final value, so no-JS, reduced-motion and crawlers all see the real number.
 * With motion allowed the number is reset to 0 after mount (below the fold, so it is not seen) and
 * animated on entry. The visible span is aria-hidden and a screen-reader copy always holds the final
 * value, so assistive tech never reads a half-counted number.
 */
export function CountUp({ value, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    setText(el, "0");
    return () => setText(el, String(value));
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!inView || !el || prefersReducedMotion()) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setText(el, String(Math.round(latest))),
    });
    return () => {
      controls.stop();
      setText(el, String(value));
    };
  }, [inView, value]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
