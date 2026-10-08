import type { ProjectInput } from "./types";
import { signalfusionCore } from "./signalfusion-core";
import { witness } from "./witness";
import { desas } from "./desas";
import { owl } from "./owl";
import { secureModelGateProject } from "./securemodelgate";
import { helios } from "./helios";
import { silentstorm } from "./silentstorm";
import { mlIncidentResponse } from "./ml-incident-response";

/**
 * Raw project entries, in display order within each tier (lib/content.ts sorts by tier and the
 * sort is stable). Validated against the Project schema in lib/content.ts.
 */
export const projectEntries: ProjectInput[] = [
  signalfusionCore,
  witness,
  desas,
  owl,
  secureModelGateProject,
  helios,
  silentstorm,
  mlIncidentResponse,
];
