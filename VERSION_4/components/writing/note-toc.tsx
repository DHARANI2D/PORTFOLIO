"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import type { NoteHeading } from "@/components/writing/headings";
import { cn } from "@/lib/utils";

/**
 * Sticky "on this page" list for desktop. It is a plain list of anchor links, so it works without
 * JavaScript; the client part only marks the section the reader is in (aria-current) as they
 * scroll. Numbers match the "01, 02, ..." counter on each h2.
 */
export function NoteToc({ headings }: { headings: readonly NoteHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // The reader's "line" is the band between just under the sticky header and 40% down the screen.
    // The first heading inside it is current; between headings the last one stays current.
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const current = headings.find((heading) => inBand.has(heading.id));
        if (current) setActive(current.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="On this page">
      <Label className="block text-foreground">ON THIS PAGE</Label>
      <ol className="mt-4 border-l">
        {headings.map((heading, index) => {
          const isActive = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px flex items-baseline gap-3 border-l py-2 pl-4 text-sm leading-5 transition-colors duration-200 motion-reduce:transition-none pointer-coarse:min-h-11",
                  isActive
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                <span aria-hidden className="shrink-0 font-mono text-[0.6875rem]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {heading.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
