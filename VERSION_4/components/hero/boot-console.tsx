"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINES = [
  "initializing security profile",
  "loading detection systems",
  "loading AI systems",
  "loading research",
  "status: operational",
] as const;

const SESSION_KEY = "ds-boot-typed";
const CHAR_MS = 22;
const LINE_PAUSE_MS = 260;

// Fallback guard for when sessionStorage is blocked: still types once per page session in this tab.
let typedInThisTab = false;

function alreadyTyped(): boolean {
  if (typedInThisTab) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markTyped(): void {
  typedInThisTab = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* storage unavailable: the module flag above still stops a replay in this tab */
  }
}

type Progress = { line: number; chars: number };

/**
 * Five status lines under the Helios panel. Quiet, not a hacker terminal: small mono text, no
 * glow, no blinking.
 *
 * The server HTML and every repeat visit show the five lines complete. On the first visit of a
 * browser session (and only if motion is allowed) the lines are typed once. Decorative: the same
 * information is in the hero copy, so it is hidden from assistive tech and from recruiter view.
 */
export function BootConsole({ className }: { className?: string }) {
  // null = show every line complete.
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    if (alreadyTyped()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let line = 0;
    let chars = 0;
    let timer = 0;
    const step = () => {
      const current = LINES[line] ?? "";
      if (chars < current.length) {
        chars += 1;
        setProgress({ line, chars });
        timer = window.setTimeout(step, CHAR_MS);
      } else if (line < LINES.length - 1) {
        line += 1;
        chars = 0;
        timer = window.setTimeout(step, LINE_PAUSE_MS);
      } else {
        markTyped();
        setProgress(null);
      }
    };
    // The server-rendered lines are already on screen; the first keystroke replaces them.
    timer = window.setTimeout(step, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden
      data-engineer-only
      className={cn("font-mono text-xs leading-6 text-muted", className)}
    >
      {LINES.map((text, index) => {
        const shown =
          progress === null || index < progress.line
            ? text
            : index === progress.line
              ? text.slice(0, progress.chars)
              : "";
        const typingHere = progress !== null && index === progress.line;
        const isStatus = index === LINES.length - 1;
        return (
          // Fixed row height: typing never moves the layout.
          <p key={text} className="flex h-6 items-center whitespace-pre">
            <span>{"> "}</span>
            <span className={cn(isStatus && progress === null && "text-foreground")}>{shown}</span>
            {typingHere ? <span className="ml-px inline-block h-3.5 w-[0.5ch] bg-muted" /> : null}
            {isStatus && progress === null ? (
              <span className="ml-3 inline-block size-1.5 rounded-full bg-accent" />
            ) : null}
          </p>
        );
      })}
    </div>
  );
}
