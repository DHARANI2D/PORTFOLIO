import type { ProjectInput } from "./types";
import { signalfusionCore } from "./signalfusion-core";
import { owl } from "./owl";
import { helios } from "./helios";
import { desas } from "./desas";
import { mlIncidentResponse } from "./ml-incident-response";

/** Raw project entries, in display order. Validated against the Project schema in lib/content.ts. */
export const projectEntries: ProjectInput[] = [
  signalfusionCore,
  owl,
  helios,
  desas,
  mlIncidentResponse,
];
