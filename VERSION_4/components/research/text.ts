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
