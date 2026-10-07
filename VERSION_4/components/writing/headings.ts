import { isValidElement, type ReactNode } from "react";

/**
 * Heading ids for field notes. The MDX heading components and the table of contents must agree on
 * the id of every h2, so both derive it here: the components from the rendered children, the table
 * of contents from the raw MDX source. Pure functions, no I/O, safe on server and client.
 */

export type NoteHeading = { id: string; text: string };

/** Plain text of a React node: strings and numbers, recursing into element children. */
export function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/** URL-safe, ASCII, lowercase id. Empty when the text has no letters or digits. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Reduces the markdown of a heading to the text that React renders for it. Only the syntax that
 * disappears on render is removed (backticks, asterisks, link targets); characters that slugify
 * turns into hyphens are left alone so both paths produce the same id.
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .trim();
}

const FENCE = /^\s*(```|~~~)/;
const H2 = /^##\s+(.+?)\s*#*\s*$/;

/**
 * The h2 headings of an MDX source, in order. Fenced code is skipped so a `## ` inside an example
 * is not mistaken for a heading. Duplicated ids are dropped (the first wins) so the contents list
 * never links to an anchor that does not exist.
 */
export function extractHeadings(source: string): NoteHeading[] {
  const headings: NoteHeading[] = [];
  const seen = new Set<string>();
  let fence: string | null = null;

  for (const line of source.split(/\r?\n/)) {
    const marker = FENCE.exec(line)?.[1];
    if (marker) {
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const match = H2.exec(line);
    if (!match?.[1]) continue;
    const text = stripInlineMarkdown(match[1]);
    const id = slugify(text);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    headings.push({ id, text });
  }
  return headings;
}
