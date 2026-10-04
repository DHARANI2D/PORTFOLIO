import { rankItemsScored } from "@/lib/fuzzy";
import type { SearchGroup, SearchItem } from "@/lib/search-index";

/**
 * Pure result model for the command palette: which items show, in which groups, in which order.
 * Kept out of the component so it is testable and so the client never imports lib/search-index.ts
 * at runtime (that module reads the file system; only its types are used here).
 */

/** Canonical group order. Typed as Record so a new group cannot be forgotten. */
const GROUP_RANK: Readonly<Record<SearchGroup, number>> = {
  NAVIGATE: 0,
  SYSTEMS: 1,
  RESEARCH: 2,
  WRITING: 3,
  SKILLS: 4,
  EXPERIENCE: 5,
  LINKS: 6,
  ACTIONS: 7,
};

const PER_GROUP_LIMIT = 6;

export type PaletteGroup = { group: SearchGroup; items: SearchItem[] };

export type PaletteResults = {
  groups: PaletteGroup[];
  /** The same items in on-screen order. Keyboard navigation indexes into this. */
  flat: SearchItem[];
};

/** What the palette matches against, primary field first: title, then keywords, then subtitle. */
export function searchText(item: SearchItem): string[] {
  return [item.title, (item.keywords ?? []).join(" "), item.subtitle ?? ""];
}

function groupItems(entries: readonly { item: SearchItem; score: number }[]): PaletteResults {
  const byGroup = new Map<SearchGroup, { items: SearchItem[]; best: number }>();
  for (const { item, score } of entries) {
    const bucket = byGroup.get(item.group);
    if (!bucket) {
      byGroup.set(item.group, { items: [item], best: score });
    } else if (bucket.items.length < PER_GROUP_LIMIT) {
      bucket.items.push(item);
    }
  }
  const groups = [...byGroup.entries()]
    // Groups with the strongest match first; ties fall back to the canonical order.
    .sort(([ga, a], [gb, b]) => b.best - a.best || GROUP_RANK[ga] - GROUP_RANK[gb])
    .map(([group, { items }]): PaletteGroup => ({ group, items }));
  return { groups, flat: groups.flatMap((g) => g.items) };
}

/**
 * @param view the current view mode. The "view as" action for the mode already active is hidden.
 * An empty query shows the curated (featured) items in canonical group order.
 */
export function buildPaletteResults(
  items: readonly SearchItem[],
  query: string,
  view: "engineer" | "recruiter",
): PaletteResults {
  const available = items.filter((item) => item.action !== `view-${view}`);

  if (query.trim() === "") {
    const featured = available.filter((item) => item.featured);
    const groups = [...new Set(featured.map((item) => item.group))]
      .sort((a, b) => GROUP_RANK[a] - GROUP_RANK[b])
      .map((group): PaletteGroup => ({ group, items: featured.filter((i) => i.group === group) }));
    return { groups, flat: groups.flatMap((g) => g.items) };
  }

  return groupItems(rankItemsScored(query, available, searchText));
}
