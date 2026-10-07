"use client";

import { Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleTheme } from "@/lib/preferences";
import { useTheme } from "@/lib/use-preferences";

type ThemeToggleProps = {
  className?: string;
  /** Text button ("Toggle theme") for the mobile sheet; icon-only otherwise. */
  withLabel?: boolean;
};

/**
 * The accessible name stays "Toggle theme" and the state is carried by aria-pressed
 * (pressed = light theme). useTheme() returns the dark default during hydration and the stored
 * value right after, so server and client markup always match.
 */
export function ThemeToggle({ className, withLabel = false }: ThemeToggleProps) {
  const isLight = useTheme() === "light";
  return (
    <Button
      variant="secondary"
      size={withLabel ? "md" : "icon"}
      aria-label={withLabel ? undefined : "Toggle theme"}
      aria-pressed={isLight}
      onClick={() => toggleTheme()}
      className={className}
    >
      <Contrast
        aria-hidden
        className={cn(
          "size-4 transition-transform duration-300 motion-reduce:transition-none",
          isLight && "rotate-180",
        )}
      />
      {withLabel ? "Toggle theme" : null}
    </Button>
  );
}
