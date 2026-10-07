"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { applyView, type View } from "@/lib/preferences";
import { useView } from "@/lib/use-preferences";

const OPTIONS: readonly { value: View; label: string }[] = [
  { value: "engineer", label: "ENGINEER" },
  { value: "recruiter", label: "RECRUITER" },
];

type ViewToggleProps = {
  className?: string;
  /**
   * Compact (header): tighter segments, and the "VIEW AS" label is visually hidden below xl, where
   * the header has no room for it. From xl up it is spelled out so the pills read as a control.
   */
  compact?: boolean;
  /** Fill the available width (mobile sheet). */
  stretch?: boolean;
};

/**
 * "VIEW AS [ ENGINEER ] [ RECRUITER ]". The preference only flips <html data-view>, so the same
 * HTML serves both views and CSS decides what shows. Selection is shown by fill, border and text
 * brightness, and exposed as aria-pressed. In forced-colors mode the pressed segment gets a
 * Highlight fill (button[aria-pressed="true"] in app/globals.css). The group is always named by
 * the "VIEW AS" text, visible or not.
 */
export function ViewToggle({ className, compact = false, stretch = false }: ViewToggleProps) {
  const view = useView();
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn("items-center gap-3", stretch ? "flex w-full" : "inline-flex", className)}
    >
      <span
        id={labelId}
        className={
          compact ? "sr-only xl:not-sr-only xl:label-mono xl:text-muted" : "label-mono text-muted"
        }
      >
        VIEW AS
      </span>
      <div
        className={cn(
          "inline-flex items-center rounded-md border border-border-strong p-0.5",
          stretch && "flex-1",
        )}
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={view === option.value}
            onClick={() => applyView(option.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-sm border label-mono transition-colors duration-200 motion-reduce:transition-none",
              compact ? "min-h-7 px-2 pointer-coarse:min-h-11" : "min-h-11 px-3",
              stretch && "flex-1",
              view === option.value
                ? "border-accent/60 bg-accent-soft text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
