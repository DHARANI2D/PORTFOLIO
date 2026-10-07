/**
 * Pure cross-linking between field notes, systems and research. A note is "about" a system or a
 * research direction when one of its tags equals that name (case-insensitive), so a new note needs
 * no extra metadata. Both directions are derived from the same rule, so the links are reciprocal.
 */

type Named = { name: string };
type Titled = { title: string };

const norm = (value: string) => value.trim().toLowerCase();

/** Notes (newest first, as given) whose tags include any of the names. */
export function notesTaggedWith<T extends { meta: { tags: readonly string[] } }>(
  posts: readonly T[],
  names: readonly string[],
): T[] {
  const wanted = new Set(names.map(norm));
  return posts.filter((post) => post.meta.tags.some((tag) => wanted.has(norm(tag))));
}

/** The systems a note is tagged with, in the order of `projects`. */
export function systemsForTags<T extends Named>(
  tags: readonly string[],
  projects: readonly T[],
): T[] {
  const own = new Set(tags.map(norm));
  return projects.filter((project) => own.has(norm(project.name)));
}

/**
 * Research directions a note belongs to: tagged with the direction's title, or tagged with a
 * system that the direction lists as related. Order follows `research`.
 */
export function researchForTags<T extends Titled & { relatedProjects: readonly string[] }>(
  tags: readonly string[],
  research: readonly T[],
  tagged: readonly { slug: string }[],
): T[] {
  const own = new Set(tags.map(norm));
  const slugs = new Set(tagged.map((project) => project.slug));
  return research.filter(
    (item) => own.has(norm(item.title)) || item.relatedProjects.some((slug) => slugs.has(slug)),
  );
}
