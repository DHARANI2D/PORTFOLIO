import type { Experience } from "@/content/schema";

/**
 * "Sep 2025 — Present", "Feb 2025 — Aug 2025" or a lone year. Dates are display strings owned by
 * content/experience.ts, so nothing here can add precision the content does not have.
 */
export function dateRange(entry: Pick<Experience, "start" | "end" | "current">): string {
  if (entry.end) return `${entry.start} — ${entry.end}`;
  return entry.current ? `${entry.start} — Present` : entry.start;
}
