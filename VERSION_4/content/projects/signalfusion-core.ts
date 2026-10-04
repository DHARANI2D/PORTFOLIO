import type { ProjectInput } from "./types";

/**
 * Flagship. Section A of docs/FACTS.md states: what it does, the problem, the approach, the
 * impact, the inputs, the pipeline and the stack. Everything else here (architecture node text,
 * threat model, decisions, security notes) is reasoned from that description and is listed in
 * CONTENT_REVIEW.md for the owner to confirm, edit or delete.
 */
export const signalfusionCore = {
  slug: "signalfusion-core",
  name: "SignalFusion Core",
  tier: 1,
  category: "Detection & SOC",
  domain: ["Detection", "SOC", "Correlation", "MITRE ATT&CK"],
  tagline: "From disconnected alerts to contextual investigations.",
  summary:
    "Normalizes endpoint, cloud and identity telemetry, correlates entities across time, and maps behavior to MITRE ATT&CK to surface multi-stage and lateral-movement attacks.",
  overview: [
    "SignalFusion Core is threat signal correlation and SOC orchestration with AI-assisted investigation. It normalizes telemetry across endpoint, cloud and identity systems and correlates entities across time.",
    "It correlates signals into behavioral relationships rather than isolated events, and models attacker behavior with MITRE ATT&CK to surface multi-stage and lateral-movement attacks.",
    "Inputs are SIEM, IDS, EDR and threat intelligence. The pipeline runs from a correlation engine to AI investigation to response. The aim is better signal-to-noise: disconnected alerts become contextual investigations.",
  ],
  problem: [
    "SOCs see thousands of independent signals, while real attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure.",
  ],
  flow: ["SIEM / IDS / EDR / Threat Intel", "Correlation engine", "AI investigation", "Response"],
  stack: ["Python", "Elasticsearch", "SIEM", "AI"],
  architecture: {
    nodes: [
      {
        id: "sources",
        label: "Telemetry",
        sublabel: "SIEM / IDS / EDR / threat intel",
        kind: "source",
        col: 0,
        row: 1,
        input: "Endpoint, cloud and identity systems, plus threat intelligence.",
        output: "Independent signals, each describing one event.",
        trustBoundary:
          "Untrusted input. Fields in a log or alert can be influenced by an attacker.",
      },
      {
        id: "normalize",
        label: "Normalization",
        sublabel: "Endpoint, cloud, identity",
        kind: "process",
        col: 1,
        row: 1,
        input: "Raw telemetry from each source.",
        process: "Normalizes telemetry across endpoint, cloud and identity systems.",
        output: "Signals that can be compared and joined.",
      },
      {
        id: "correlation",
        label: "Correlation engine",
        sublabel: "Entities across time",
        kind: "process",
        col: 2,
        row: 1,
        input: "Normalized signals.",
        process:
          "Correlates entities across time, turning isolated events into behavioral relationships.",
        output: "Related signals grouped around an entity.",
      },
      {
        id: "attack",
        label: "ATT&CK mapping",
        sublabel: "Attacker behavior",
        kind: "process",
        col: 3,
        row: 1,
        input: "Correlated signals.",
        process:
          "Models attacker behavior with MITRE ATT&CK to surface multi-stage and lateral-movement attacks.",
        output: "Sequences that read as attacker behavior.",
      },
      {
        id: "investigation",
        label: "AI investigation",
        sublabel: "AI-assisted",
        kind: "process",
        col: 4,
        row: 1,
        input: "Correlated, mapped sequences.",
        process: "Assembles disconnected alerts into a contextual investigation.",
        output: "An investigation with its context and the signals behind it.",
        trustBoundary: "AI output is an input to a decision, not the decision.",
      },
      {
        id: "analyst",
        label: "Analyst",
        sublabel: "Reviews the investigation",
        kind: "actor",
        col: 4,
        row: 2,
        input: "The investigation and the signals behind it.",
        process: "Reads the evidence and decides how to respond.",
        output: "A response decision.",
        trustBoundary: "Human judgment sits between AI analysis and action.",
      },
      {
        id: "response",
        label: "Response",
        sublabel: "Act on the finding",
        kind: "output",
        col: 5,
        row: 1,
        input: "A decision on the investigation.",
        process: "Carries the decision into action.",
      },
    ],
    edges: [
      ["sources", "normalize"],
      ["normalize", "correlation"],
      ["correlation", "attack"],
      ["attack", "investigation"],
      ["investigation", "response"],
      ["investigation", "analyst"],
      ["analyst", "response"],
    ],
    boundaries: [
      { id: "input", label: "Untrusted input", nodeIds: ["sources"] },
      {
        id: "analysis",
        label: "Automated analysis",
        nodeIds: ["normalize", "correlation", "attack", "investigation"],
      },
      { id: "oversight", label: "Human judgment", nodeIds: ["analyst"] },
    ],
    caption:
      "Schematic of the design. Signals are normalized, correlated by entity and time, mapped to ATT&CK, investigated with AI assistance, and acted on after review.",
  },
  threatModel: {
    assets: [
      "Telemetry from endpoint, cloud and identity systems",
      "The relationships correlation builds between entities",
      "Integrity of the analysis: what the SOC believes is happening",
      "Analyst attention, which better signal-to-noise is meant to protect",
    ],
    attackSurface: [
      "Telemetry ingestion: every source that feeds normalization",
      "Fields in logs and alerts that an attacker can influence, such as hostnames, usernames and URLs",
      "The correlation and ATT&CK mapping logic and its rules",
      "Content passed to the AI investigation step",
      "The path from an investigation to a response",
    ],
    trustBoundaries: [
      "Sources to normalization: telemetry is input. Attacker-influenced fields are handled as data, not instruction.",
      "Automated analysis to analyst: AI output is a recommendation that a person reviews against the underlying signals.",
      "Investigation to response: a response is a separate decision from a finding.",
    ],
    threatActors: [
      "An intruder moving through identities, endpoints and cloud resources over several stages, the sequence this system exists to surface",
      "An attacker who stays under per-alert thresholds by spreading activity across entities and time",
      "An attacker who plants crafted content in logs or alerts to mislead the AI investigation step",
      "An attacker who suppresses or tampers with a telemetry source to create a blind spot",
    ],
    assumptions: [
      "Telemetry is complete enough to show the sequence of an attack, or its gaps are known",
      "An account, host or service can be identified consistently across sources",
      "Source clocks are close enough to order events across systems",
      "Analysts remain accountable for response decisions",
    ],
    failureModes: [
      "Entity resolution fails: one account or host appears as two entities and the sequence is never joined",
      "Clock skew between sources reorders events and breaks a sequence",
      "A source goes silent and the gap is not visible, so absence of signal reads as absence of attack",
      "Over-correlation joins unrelated signals into a false story",
      "The AI investigation produces a confident but unsupported reading and the reviewer accepts it without checking the signals",
      "Attacker behavior outside the ATT&CK model is not surfaced as a sequence",
    ],
    controls: [
      "Normalize before correlating, so signals are comparable",
      "Correlate by entity and time rather than alert by alert",
      "Map behavior to ATT&CK so sequences read as attacker behavior",
      "Keep the underlying signals attached to every investigation, so a claim can be checked",
      "Review between AI investigation and response",
    ],
  },
  decisions: [
    {
      question: "Why correlate by entity and time?",
      answer:
        "Real attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure. One alert shows one step. Grouping signals by the entity they touch and the time they occur lets the steps be read as a sequence.",
    },
    {
      question: "Why normalize before correlating?",
      answer:
        "Endpoint, cloud and identity systems describe the same activity in different shapes. Correlation across them only works once their records can be compared and joined.",
    },
    {
      question: "Why map to MITRE ATT&CK?",
      answer:
        "ATT&CK gives a shared vocabulary for attacker behavior. Mapping related signals to it turns “these alerts are connected” into a claim an analyst can check, such as lateral movement, and lets a multi-stage attack be read as stages.",
    },
    {
      question: "Why correlate into relationships instead of scoring alerts one by one?",
      answer:
        "Each step of a multi-stage attack can look minor on its own. The sequence is where the attack shows up, and where signal-to-noise improves.",
    },
    {
      question: "Why keep a human in the investigation loop?",
      answer:
        "AI assistance speeds up reading the evidence. It does not remove accountability for the response. An analyst who can see the signals behind a finding can catch a story that is plausible but wrong.",
    },
    {
      question: "Why separate investigation from response?",
      answer:
        "An investigation says what is happening. A response changes something. Keeping them as separate stages makes the response a deliberate decision, not a side effect of a model’s output.",
    },
    {
      question: "Why treat telemetry as untrusted input?",
      answer:
        "Logs and alerts carry fields an attacker can influence. An AI step that reads them can be steered by crafted content. Handling telemetry as data, never as instruction, stops the attacker from directing the investigation.",
    },
  ],
  security: [
    "Telemetry is attacker-influenced input. Fields such as hostnames, usernames and URLs should reach the AI investigation step as data, never as instructions.",
    "The relationships correlation builds between entities describe how accounts, hosts and services connect. They are as useful to an attacker as to a defender, so they need the same protection as the telemetry they come from.",
    "Silence from a source looks the same as a quiet network. Missing telemetry needs its own visibility.",
    "Every finding should carry the signals behind it, so a reviewer can check the story instead of trusting it.",
    "A response should follow a decision, not a model’s output alone.",
    "Correlation rules and ATT&CK mappings are detection logic. Changes to them should be reviewed like code.",
  ],
  links: {},
  graphNodes: ["soc", "detection", "cloud", "ai"],
} satisfies ProjectInput;
