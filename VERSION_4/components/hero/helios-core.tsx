"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animateMini, useInView } from "motion/react";
import { HeliosMark } from "@/components/navigation/logo";
import { cn } from "@/lib/utils";

/**
 * The step names are the pipeline from the brief. The right-hand word maps each step onto the
 * site-wide motif (signal -> context -> decision -> action).
 */
const STEPS = [
  { name: "DETECT", motif: "SIGNAL" },
  { name: "CORRELATE", motif: "CONTEXT" },
  { name: "INVESTIGATE", motif: "DECISION" },
  { name: "RESPOND", motif: "ACTION" },
] as const;

/** One beat lights one step while a pulse crosses the connector below it. */
const BEAT_MS = 1000;
/** Pause before the first beat. With four beats the whole pass is 4.6 s, under the 5 s limit. */
const START_DELAY_MS = 600;

/**
 * One pulse crossing a connector: it slides from above the connector to below it (-100% to 200% of
 * its own height, which is half the connector) while it fades in and out. Linear, with the
 * transform keyframes spaced to match the opacity offsets, so it moves at a constant speed.
 */
const PULSE_KEYFRAMES = {
  transform: ["translateY(-100%)", "translateY(-40%)", "translateY(140%)", "translateY(200%)"],
  opacity: [0, 1, 1, 0],
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Own hook instead of Motion's useReducedMotion: this one reports false on the server and during
 * hydration, then the real value, so the first client render always matches the server HTML.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

const ARIA_LABEL = `Helios security core. Pipeline: ${STEPS.map((s) => s.name.toLowerCase()).join(", ")}.`;

/**
 * "HELIOS SECURITY CORE": a calm, bordered panel with the Helios mark and the vertical pipeline.
 * One accent signal travels down it once and lights each step in turn.
 *
 * The server HTML shows the full pipeline with every step readable. Motion is an enhancement: one
 * pass of 4.6 s (WCAG 2.2.2: nothing moves for more than 5 s), and only while the panel is on
 * screen and motion is allowed. It then rests with every step lit, which is also the state under
 * reduced motion, where nothing moves at all. The panel is one image to assistive tech
 * (role="img"), so the decorative parts are never announced piecemeal.
 */
export function HeliosCore({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  // One pulse element per connector, indexed by the step above it.
  const pulseRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(rootRef);
  // Index of the lit step while the pass runs; -1 before it starts.
  const [beat, setBeat] = useState(-1);
  // The single pass is over: rest with every step lit.
  const [done, setDone] = useState(false);
  // The next beat to play. Kept in a ref so leaving and re-entering the view resumes the pass
  // where it stopped instead of restarting it.
  const nextBeat = useRef(0);
  const running = inView && !reduced && !done;

  useEffect(() => {
    if (!running) return;
    let timer = 0;
    let pulse: { stop: () => void } | undefined;
    const tick = () => {
      const step = nextBeat.current;
      if (step >= STEPS.length) {
        setDone(true);
        return;
      }
      setBeat(step);
      const element = pulseRefs.current[step];
      // Web Animations API (Motion's mini animate). Older engines just skip the pulse.
      if (element && typeof element.animate === "function") {
        pulse?.stop();
        pulse = animateMini(element, PULSE_KEYFRAMES, {
          duration: BEAT_MS / 1000,
          ease: "linear",
          times: [0, 0.2, 0.8, 1],
        });
      }
      nextBeat.current = step + 1;
      timer = window.setTimeout(tick, BEAT_MS);
    };
    timer = window.setTimeout(tick, nextBeat.current === 0 ? START_DELAY_MS : 0);
    return () => {
      window.clearTimeout(timer);
      pulse?.stop();
    };
  }, [running]);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={ARIA_LABEL}
      className={cn("rounded-lg border bg-surface", className)}
    >
      <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <HeliosMark size={20} className="text-foreground" />
        <span className="label-mono text-foreground">HELIOS SECURITY CORE</span>
      </div>

      <ol className="surface-grid px-4 py-6 sm:px-6">
        {STEPS.map((step, index) => {
          const lit = reduced || done || beat === index;
          const isLast = index === STEPS.length - 1;
          return (
            <li
              key={step.name}
              data-lit={lit}
              className="group/step relative flex h-12 items-center gap-3"
            >
              {isLast ? null : (
                // Connector from this node's centre to the next node's centre. The nodes sit on top.
                <span
                  aria-hidden
                  className="absolute top-1/2 left-[5.5px] h-full w-px overflow-hidden bg-border-strong"
                >
                  <span
                    ref={(element) => {
                      pulseRefs.current[index] = element;
                    }}
                    className="absolute inset-x-0 top-0 h-1/2 bg-accent opacity-0"
                  />
                </span>
              )}
              <span
                aria-hidden
                className="relative z-10 size-3 shrink-0 rounded-full border border-border-strong bg-surface transition-colors duration-300 group-data-[lit=true]/step:border-accent motion-reduce:transition-none"
              >
                <span className="absolute inset-[2px] rounded-full bg-accent opacity-0 transition-opacity duration-300 group-data-[lit=true]/step:opacity-100 motion-reduce:transition-none" />
              </span>
              <span className="hidden w-5 label-mono text-muted xs:block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted transition-colors duration-300 group-data-[lit=true]/step:text-foreground motion-reduce:transition-none">
                {step.name}
              </span>
              <span className="ml-auto label-mono text-muted">{step.motif}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
