import type { ResearchInput } from "./types";
import { witnessResearch } from "./witness";
import { secureModelGate } from "./securemodelgate";
import { aiDfir } from "./ai-dfir";
import { agenticSecurity } from "./agentic-security";

/** Raw research entries, in display order. Validated against the ResearchItem schema in lib/content.ts. */
export const researchEntries: ResearchInput[] = [
  witnessResearch,
  secureModelGate,
  aiDfir,
  agenticSecurity,
];
