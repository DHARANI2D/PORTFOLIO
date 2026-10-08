/**
 * The question answerer behind the terminal. Pure: no DOM, no network, no content imports.
 *
 * It is retrieval, not a language model. A question is matched against a list of documents built
 * from the site's own content (lib/knowledge.ts, served as /knowledge.json), and the answer is the
 * most relevant sentences of the best-matching document, with a command that opens it. It can only
 * say what the site already says, and nothing a visitor types leaves the browser.
 *
 * Documents are data, never code: words are looked up in Maps and Sets, so a word such as
 * `constructor` is an ordinary word.
 */

export type KnowledgeKind =
  | "about"
  | "project"
  | "research"
  | "experience"
  | "skills"
  | "certifications"
  | "writing"
  | "contact";

export type KnowledgeDoc = {
  id: string;
  title: string;
  kind: KnowledgeKind;
  /** Plain text. Sentences end with a full stop; lines may be separated by newlines. */
  text: string;
  /** What to type in the terminal to open the full page, e.g. "open helios". */
  open?: string;
};

export type Answer = { found: boolean; lines: string[] };

const STOP = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have how i if in into is it its " +
    "me my of on or our so than that the their them then there these they this to us was we were what when " +
    "where which who whom why will with would you your tell about please give show know want like"
  ).split(" "),
);

/** Question words that point at a kind of document, so "how do I contact you" finds contact details. */
const KIND_HINT = new Map<string, KnowledgeKind>([
  ["who", "about"],
  ["yourself", "about"],
  ["background", "about"],
  ["bio", "about"],
  ["contact", "contact"],
  ["email", "contact"],
  ["mail", "contact"],
  ["reach", "contact"],
  ["hire", "contact"],
  ["hiring", "contact"],
  ["linkedin", "contact"],
  ["github", "contact"],
  ["resume", "contact"],
  ["cv", "contact"],
  ["job", "experience"],
  ["work", "experience"],
  ["worked", "experience"],
  ["role", "experience"],
  ["career", "experience"],
  ["experience", "experience"],
  ["company", "experience"],
  ["intern", "experience"],
  ["education", "experience"],
  ["degree", "experience"],
  ["college", "experience"],
  ["project", "project"],
  ["system", "project"],
  ["built", "project"],
  ["build", "project"],
  ["paper", "research"],
  ["research", "research"],
  ["publication", "research"],
  ["skill", "skills"],
  ["tool", "skills"],
  ["stack", "skills"],
  ["language", "skills"],
  ["tech", "skills"],
  ["certification", "certifications"],
  ["certificate", "certifications"],
  ["cert", "certifications"],
  ["credential", "certifications"],
  ["article", "writing"],
  ["blog", "writing"],
  ["write", "writing"],
  ["writing", "writing"],
  ["post", "writing"],
]);

/** Light stemming: enough to match "projects" with "project" and "investigating" with "investigation". */
function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ion")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#.-]*[a-z0-9+#]|[a-z0-9]/g) ?? []).filter(
    (w) => !STOP.has(w),
  );
}

function stems(text: string): string[] {
  return words(text).map(stem);
}

type Scored = { doc: KnowledgeDoc; score: number };

/** Documents ranked for a question, best first. Documents with no match are left out. */
function rank(question: string, docs: readonly KnowledgeDoc[]): Scored[] {
  const asked = words(question);
  const query = [...new Set(asked.map(stem))];
  if (query.length === 0) return [];
  const hinted = new Set(asked.flatMap((w) => KIND_HINT.get(w) ?? KIND_HINT.get(stem(w)) ?? []));

  const scored: Scored[] = [];
  for (const doc of docs) {
    const title = new Set(stems(doc.title));
    const body = stems(doc.text);
    const counts = new Map<string, number>();
    for (const token of body) counts.set(token, (counts.get(token) ?? 0) + 1);

    let score = 0;
    let hits = 0;
    for (const token of query) {
      const inTitle = title.has(token);
      const inBody = counts.get(token) ?? 0;
      if (inTitle) score += 5;
      if (inBody > 0) score += Math.min(3, inBody);
      if (inTitle || inBody > 0) hits += 1;
    }
    // A kind hint only breaks ties between documents that already match, or answers a bare "contact".
    if (hinted.has(doc.kind)) score += hits > 0 ? 3 : 2;
    if (hits > 0 || (hinted.has(doc.kind) && query.length <= 2)) scored.push({ doc, score });
  }
  return scored.sort((a, b) => b.score - a.score);
}

/** The sentences of a document that best match the question, kept in their original order. */
function bestSentences(question: string, text: string, limit: number): string[] {
  const query = new Set(stems(question));
  const sentences = text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: stems(sentence).filter((t) => query.has(t)).length + (index === 0 ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index);
  return ranked.map((r) => r.sentence);
}

const KIND_LABEL: Record<KnowledgeKind, string> = {
  about: "ABOUT",
  project: "SYSTEM",
  research: "RESEARCH",
  experience: "EXPERIENCE",
  skills: "SKILLS",
  certifications: "CERTIFICATIONS",
  writing: "WRITING",
  contact: "CONTACT",
};

/** Answers a question from the documents, or says it found nothing. Never throws. */
export function answerQuestion(question: string, docs: readonly KnowledgeDoc[]): Answer {
  const ranked = rank(question.slice(0, 300), docs);
  const top = ranked[0];
  if (!top) return { found: false, lines: [] };

  const lines = [
    `${KIND_LABEL[top.doc.kind]} / ${top.doc.title}`,
    ...bestSentences(question, top.doc.text, top.doc.kind === "about" ? 4 : 3),
  ];
  if (top.doc.open) lines.push("", `Type "${top.doc.open}" to open the page.`);

  const related = ranked
    .slice(1, 4)
    .filter((r) => r.score >= top.score * 0.6)
    .map((r) => r.doc.title);
  if (related.length > 0) lines.push(`Related: ${related.join(", ")}.`);
  return { found: true, lines };
}

/** Quick questions offered under the prompt. They are answered by the same code as anything typed. */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  "What do you work on?",
  "Tell me about HELIOS",
  "Which certifications do you have?",
  "How can I contact you?",
];
