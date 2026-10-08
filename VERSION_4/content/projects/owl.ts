import type { ProjectInput } from "./types";

/**
 * Source: the owner's own project summary (docs/FACTS.md section A4). Described qualitatively: the
 * site states no counts or measured results. No architecture, threat model or decisions are written,
 * because none were supplied, so this is an overview page.
 */
export const owl = {
  slug: "owl",
  name: "OWL",
  tier: 2,
  category: "Systems Security",
  domain: ["Systems Security", "Operating Systems", "Capabilities"],
  tagline: "A capability-secured, agent-native operating system.",
  summary:
    "A microkernel in which every authority is a capability, built to contain both ordinary processes and autonomous AI agents.",
  metaDescription:
    "OWL is a capability-secured Rust microkernel for x86-64 designed to contain ordinary processes and autonomous AI agents at the operating-system boundary.",
  overview: [
    "In OWL, authority is held as unforgeable capability tokens. A token can be narrowed when it is handed on, revoking one cascades to everything derived from it, and privileged operations are written to a hash-chained audit log. The aim is for the operating system itself to be the boundary that contains an AI agent, not a policy layered above it. It is written in Rust without the standard library, targets x86-64 under UEFI, includes its own network stack, and has its IPC fuzzed as a state machine and validated in QEMU.",
  ],
  flow: ["Process or agent", "Capability token", "Microkernel check", "Audit log"],
  stack: ["Rust", "x86-64 / UEFI", "QEMU"],
  links: {},
  graphNodes: ["agents", "ai"],
} satisfies ProjectInput;
