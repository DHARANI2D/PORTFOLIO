import type { ResearchInput } from "./types";

/**
 * Name only. The abstract, notes and framing of this research are deliberately not on the site (or
 * in the repository): it is not published in detail, so it cannot be copied from here.
 */
export const maestro = {
  slug: "maestro",
  title: "MAESTRO",
  kind: "paper",
  graphNodes: ["dfir", "agents", "ai", "detection"],
} satisfies ResearchInput;
