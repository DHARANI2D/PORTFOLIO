/** "01" from 1. */
export const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * The first sentence of a paragraph, for card blurbs and meta descriptions. A sentence ends at a
 * full stop, question mark or exclamation mark followed by a space and a capital or an opening
 * quote. If that sentence is longer than `max`, it is cut at a word boundary with an ellipsis.
 */
export function firstSentence(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const end = clean.search(/[.!?](?=\s+[A-Z“"‘'])/);
  const sentence = end === -1 ? clean : clean.slice(0, end + 1);
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

/** Only https URLs become links; anything else in content is ignored rather than rendered. */
export const isHttps = (url: string | undefined): url is string =>
  typeof url === "string" && /^https:\/\//i.test(url);

const SENTENCE_END = /[.!?]["”’']?$/;

/**
 * A meta description that always ends on a complete thought. An explicit `metaDescription` wins.
 * Otherwise whole sentences are taken from `text` while they fit in `max` characters; if even the
 * first sentence is too long, it is cut at the last clause break (comma, semicolon, colon or dash)
 * or word that fits and closed with a full stop. Never an ellipsis.
 */
export function metaDescription(text: string, explicit?: string, max = 155): string {
  const given = explicit?.replace(/\s+/g, " ").trim();
  if (given && given.length <= max + 5 && SENTENCE_END.test(given)) return given;

  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max && SENTENCE_END.test(clean)) return clean;

  let out = "";
  for (const sentence of clean.match(/[^.!?]+[.!?]["”’']?(?=\s|$)/g) ?? []) {
    const next = out ? `${out} ${sentence.trim()}` : sentence.trim();
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;

  const cut = clean.slice(0, max - 1);
  const clause = Math.max(
    cut.lastIndexOf(", "),
    cut.lastIndexOf("; "),
    cut.lastIndexOf(": "),
    cut.lastIndexOf(" — "),
  );
  const space = cut.lastIndexOf(" ");
  const end = clause > max / 2 ? clause : space > 0 ? space : cut.length;
  return `${cut.slice(0, end).replace(/[\s,;:.—-]+$/, "")}.`;
}
