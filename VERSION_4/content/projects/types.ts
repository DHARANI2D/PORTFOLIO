import type { z } from "zod";
import type { Project } from "@/content/schema";

/**
 * Authoring type for a project entry: the schema's input side, so fields that have defaults
 * (overview, stack, links, ...) can be left out. The strict parse happens in lib/content.ts.
 */
export type ProjectInput = z.input<typeof Project>;
