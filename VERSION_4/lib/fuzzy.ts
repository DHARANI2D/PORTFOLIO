/**
 * Small, dependency-free fuzzy scorer shared by the command palette and the terminal.
 *
 * Match tiers, strictly ordered (a higher tier always beats a lower one for the same field):
 *   exact (1000) > prefix (800-899) > word start (600-699) > substring (400-499) > subsequence (1-399)
 * Inside a tier, shorter text and earlier matches score higher, and subsequence matches lose points
 * for every gap between matched characters. A score of 0 means "no match".
 *
 * Case and diacritics are ignored. Pure functions, no state: safe on the server and the client.
 */

const WORD_BREAK = /[^\p{L}\p{N}]/u;

/** Weight applied to every field after the first in a multi-field rank (title first, then keywords). */
const SECONDARY_FIELD_WEIGHT = 0.7;

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || WORD_BREAK.test(text.charAt(index - 1));
}

/** Shortest window of `text` that contains `token` as a subsequence, or null when there is none. */
function subsequenceWindow(token: string, text: string): { start: number; end: number } | null {
  let matched = 0;
  let end = -1;
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) === token.charAt(matched)) {
      matched += 1;
      if (matched === token.length) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  // Walk back from the earliest end to find the tightest start for that end.
  let remaining = token.length - 1;
  let start = end;
  for (let i = end; i >= 0; i--) {
    if (text.charAt(i) === token.charAt(remaining)) {
      if (remaining === 0) {
        start = i;
        break;
      }
      remaining -= 1;
    }
  }
  return { start, end };
}

/** Both arguments must already be normalised. */
function scoreToken(token: string, text: string, allowSubsequence: boolean): number {
  if (text === token) return 1000;
  if (text.startsWith(token)) return 899 - Math.min(text.length - token.length, 99);

  let index = text.indexOf(token);
  const firstSubstring = index;
  while (index !== -1) {
    if (isWordStart(text, index)) return 699 - Math.min(index, 99);
    index = text.indexOf(token, index + 1);
  }
  if (firstSubstring !== -1) return 499 - Math.min(firstSubstring, 99);

  if (!allowSubsequence || token.length < 2) return 0;
  const window = subsequenceWindow(token, text);
  if (!window) return 0;
  const length = window.end - window.start + 1;
  // A subsequence that sprawls across the text is noise, not a match.
  if (length > token.length * 2 + 6) return 0;
  const gaps = length - token.length;
  const bonus = isWordStart(text, window.start) ? 15 : 0;
  const score = 380 - gaps * 10 - Math.min(window.start, 40) + bonus;
  return Math.max(1, Math.min(399, score));
}

/**
 * Scores `text` against `query`. Returns 0 for no match. An empty (or whitespace-only) query scores 0:
 * at this level it matches nothing, and `rankItems` treats it as "show everything".
 * A multi-word query needs every word to match; the score is the mean of the words, or the phrase
 * score when the words appear together in order (whichever is higher).
 */
export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (q === "" || t === "") return 0;

  const tokens = q.split(" ");
  if (tokens.length === 1) return scoreToken(q, t, true);

  let sum = 0;
  for (const token of tokens) {
    const score = scoreToken(token, t, true);
    if (score === 0) return 0;
    sum += score;
  }
  return Math.max(sum / tokens.length, scoreToken(q, t, false));
}

/**
 * Best score across several fields. The first field is the primary one (a title); later fields
 * (keywords, subtitles) are down-weighted so a title hit outranks a keyword hit of the same tier.
 */
export function fuzzyScoreFields(query: string, fields: string | readonly string[]): number {
  if (typeof fields === "string") return fuzzyScore(query, fields);
  let best = 0;
  fields.forEach((field, index) => {
    const score = fuzzyScore(query, field) * (index === 0 ? 1 : SECONDARY_FIELD_WEIGHT);
    if (score > best) best = score;
  });
  return best;
}

export type Ranked<T> = { item: T; score: number };

/** Like `rankItems` but keeps the scores (needed to order groups by their best match). */
export function rankItemsScored<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => string | readonly string[],
): Ranked<T>[] {
  const scored: (Ranked<T> & { index: number })[] = [];
  items.forEach((item, index) => {
    const score = fuzzyScoreFields(query, getText(item));
    if (score > 0) scored.push({ item, score, index });
  });
  // Ties keep the original order, so a curated list stays in its curated order.
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(({ item, score }) => ({ item, score }));
}

/**
 * Items that match `query`, best first (stable on ties). An empty query returns every item in its
 * original order. `getText` may return one string or several (primary field first).
 */
export function rankItems<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => string | readonly string[],
): T[] {
  if (normalize(query) === "") return [...items];
  return rankItemsScored(query, items, getText).map(({ item }) => item);
}
