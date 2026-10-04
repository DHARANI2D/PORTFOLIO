import type { ProjectInput } from "./types";
import { signalfusionCore } from "./signalfusion-core";
import { witness } from "./witness";
import { aegis } from "./aegis";
import { argus } from "./argus";
import { voltrix } from "./voltrix";
import { desas } from "./desas";

/**
 * Raw project entries, in display order within each tier (lib/content.ts sorts by tier and the
 * sort is stable). Validated against the Project schema in lib/content.ts.
 */
export const projectEntries: ProjectInput[] = [
  signalfusionCore,
  witness,
  aegis,
  argus,
  voltrix,
  desas,
];
