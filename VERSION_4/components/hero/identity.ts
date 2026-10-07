import type { Experience } from "@/content/schema";

/**
 * Who, what, where: the one identity row in the hero. Pure functions, so the row is derived from
 * content (the current role) and the site config (location) and is unit-tested without React.
 */

/** Docs/FACTS.md section A: "Based in India. Open to global roles." */
const OPEN_TO = "Open to global roles";

export type HeroIdentity = {
  /** "SOC ANALYST · CYBERSECURITY DESIGN & ENGINEERING · HPE" */
  role: string;
  /** "INDIA · OPEN TO GLOBAL ROLES" */
  place: string;
};

/** "Hewlett Packard Enterprise (HPE)" becomes "HPE". An org without a short form is kept whole. */
export function shortOrg(org: string): string {
  const short = /\(([^()]+)\)\s*$/.exec(org)?.[1]?.trim();
  return short && short.length > 0 ? short : org.trim();
}

/**
 * Builds the identity row from the current role in `experience`. Returns null when no role is
 * marked current, so the hero never states a role the content does not mark as current.
 */
export function buildIdentity(
  experience: readonly Experience[],
  location: string,
): HeroIdentity | null {
  const current = experience.find((entry) => entry.current);
  if (!current) return null;
  const role = [current.role, current.team, shortOrg(current.org)]
    .filter((part): part is string => Boolean(part))
    .join(" · ")
    .toUpperCase();
  const place = [location, OPEN_TO].join(" · ").toUpperCase();
  return { role, place };
}
