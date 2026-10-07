"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOOT_LINES as LINES,
  progressAt,
  type BootProgress,
} from "@/components/hero/boot-sequence";
import { cn } from "@/lib/utils";

/** Listed on /privacy/. localStorage, so the intro plays once per browser, not once per tab. */
const STORAGE_KEY = "ds-boot-typed";

/**
 * True only on the very first visit of this browser. Reading or writing storage can throw
 * (blocked cookies, private modes). Then there is no way to know it is a first visit, so the
 * answer is "no": a visitor with blocked storage never sees the sequence replay.
 */
function isFirstEverVisit(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return false;
    // Written before the sequence starts, so a second tab opened meanwhile does not replay it.
    localStorage.setItem(STORAGE_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

// Decided once per page session. Cleared after the sequence has finished, so moving back to the
// home page within the same session never replays it.
let pending: boolean | undefined;

/**
 * Five status lines under the Helios panel. Quiet, not a hacker terminal: small mono text, no
 * glow, no blinking.
 *
 * The server HTML and every repeat visit show the five lines complete, and the text is never
 * removed or blanked. On the first ever visit of a browser (and only if motion is allowed) a caret
 * moves down the lines and brightens each character as it passes, for about 2.4 s. The characters
 * sit in the same place the whole time, so nothing shifts. Decorative: the same information is in
 * the hero copy, so it is hidden from assistive tech and from recruiter view.
 */
export function BootConsole({ className }: { className?: string }) {
  // null = settled: every line complete, the final colours.
  const [progress, setProgress] = useState<BootProgress | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Hidden (recruiter view): nobody would see it, so it must not use up the first visit either.
    if (rootRef.current && getComputedStyle(rootRef.current).display === "none") return;
    pending ??= isFirstEverVisit();
    if (!pending) return;

    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = progressAt(now - started);
      setProgress((current) =>
        current?.line === next?.line && current?.chars === next?.chars ? current : next,
      );
      if (next === null) {
        pending = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const settled = progress === null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-engineer-only
      className={cn("font-mono text-xs leading-6 text-muted", className)}
    >
      {LINES.map((text, index) => {
        const isStatus = index === LINES.length - 1;
        const shown = settled
          ? text.length
          : index < progress.line
            ? text.length
            : index === progress.line
              ? progress.chars
              : 0;
        const typingHere = !settled && index === progress.line;
        return (
          // Fixed row height and the full text always in place: typing never moves the layout.
          <p key={text} className="flex h-6 items-center whitespace-pre">
            <span>{"> "}</span>
            <span
              className={cn(
                "transition-colors duration-700 motion-reduce:transition-none",
                !settled || isStatus ? "text-foreground" : "text-muted",
              )}
            >
              {text.slice(0, shown)}
            </span>
            {typingHere ? (
              // Zero width, so the caret overlays the text instead of pushing it.
              <span className="relative w-0">
                <span className="absolute top-1/2 left-0 h-3.5 w-[0.5ch] -translate-y-1/2 bg-muted" />
              </span>
            ) : null}
            <span>{text.slice(shown)}</span>
            {isStatus ? (
              <span className="ml-3 inline-block size-1.5 rounded-full bg-accent" />
            ) : null}
          </p>
        );
      })}
    </div>
  );
}
