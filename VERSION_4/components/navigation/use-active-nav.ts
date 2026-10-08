"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { primaryNav } from "@/lib/site";

/** Detail pages belong to a section of the home page: /systems/witness/ lights up SYSTEMS. */
const SECTION_OF_PATH: readonly (readonly [string, string])[] = [
  ["/systems/", "/#systems"],
  ["/research/", "/#research"],
  ["/writing/", "/#writing"],
];

/** The id of a section link such as "/#about". */
const idOf = (href: string) => href.slice(2);

/**
 * Which primary-nav item is current, as its href ("/#about"), or null.
 * On the home page this follows the scroll: the section crossing a line a little above the middle
 * of the viewport is the current one, and nothing is current while the hero is on screen. On a
 * detail page it is the section that page belongs to.
 */
export function useActiveNav(): string | null {
  const pathname = usePathname();
  const [spied, setSpied] = useState<string | null>(null);
  const onHome = pathname === "/";

  useEffect(() => {
    if (!onHome) return;
    const sections = primaryNav
      .map((item) => document.getElementById(idOf(item.href)))
      .filter((el): el is HTMLElement => el !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Page order decides if two sections are crossing the line at once.
        const current = sections.find((el) => visible.has(el.id));
        setSpied(current ? `/#${current.id}` : null);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [onHome]);

  if (onHome) return spied;
  return SECTION_OF_PATH.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}
