"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/lib/preferences";
import { useTheme } from "@/lib/use-preferences";

type ThemeToggleProps = {
  className?: string;
  /** Text button ("Toggle theme") for the mobile sheet; icon-only otherwise. */
  withLabel?: boolean;
};

/**
 * The accessible name stays "Toggle theme" and the state is carried by aria-pressed
 * (pressed = light theme). The icon is the mode a press switches to. useTheme() returns the dark default during hydration and the stored
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
      {/* The icon shows the mode a press switches to: a sun in the dark theme, a moon in the light one. */}
      {isLight ? <Moon aria-hidden className="size-4" /> : <Sun aria-hidden className="size-4" />}
      {withLabel ? "Toggle theme" : null}
    </Button>
  );
}
