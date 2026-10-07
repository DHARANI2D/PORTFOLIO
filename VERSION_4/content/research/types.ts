import type { z } from "zod";
import type { ResearchItem } from "@/content/schema";

/** Authoring type for a research entry: the schema's input side. Parsed in lib/content.ts. */
export type ResearchInput = z.input<typeof ResearchItem>;
