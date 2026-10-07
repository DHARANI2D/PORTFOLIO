"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveal as a progressive enhancement.
 *
 * The server HTML (and the no-JS page) is the final, fully visible state: phase "static". After
 * hydration, only elements that are still below the fold are hidden ("hidden") and then shown
 * when they scroll into view ("shown"). Anything already on screen is never touched, so there is
 * no flash, and reduced motion skips the whole mechanism.
 *
 * Styling is plain classes keyed off `data-phase`, so there are no inline styles. Server-rendered
 * descendants can follow the phase with `group-data-[phase=hidden]/reveal:` utilities.
 */
type Phase = "static" | "hidden" | "shown";

// Stagger only applies once items sit side by side (md and up); stacked items reveal one by one.
const DELAY = {
  0: "",
  1: "md:data-[phase=shown]:delay-100",
  2: "md:data-[phase=shown]:delay-200",
  3: "md:data-[phase=shown]:delay-300",
} as const;

type RevealProps = {
  as?: "div" | "li" | "article";
  /**
   * "rise": the element fades in with a 12px lift. "none": the element is untouched and only
   * exposes `data-phase` for descendants to react to.
   */
  effect?: "rise" | "none";
  delay?: keyof typeof DELAY;
  className?: string;
  children: React.ReactNode;
};

export function Reveal({
  as = "div",
  effect = "rise",
  delay = 0,
  className,
  children,
}: RevealProps) {
  // Asserted so TypeScript does not narrow it to the three tag names and demand an intersected ref.
  const Component = as as React.ElementType;
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Above the viewport (restored scroll position) counts as already seen.
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setPhase("shown");
          observer.disconnect();
        } else {
          setPhase((current) => (current === "static" ? "hidden" : current));
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      data-phase={phase}
      className={cn(
        "group/reveal",
        effect === "rise" &&
          "data-[phase=hidden]:translate-y-3 data-[phase=hidden]:opacity-0 data-[phase=shown]:transition-[opacity,translate] data-[phase=shown]:duration-700 data-[phase=shown]:ease-out",
        DELAY[delay],
        className,
      )}
    >
      {children}
    </Component>
  );
}
