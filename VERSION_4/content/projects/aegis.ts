import type { ProjectInput } from "./types";

/**
 * Tier 2. Section A of docs/FACTS.md gives the expansion, the four control layers in order and the
 * "explicit trust boundaries" phrase. The node text, threat model, decisions and security notes are
 * reasoned from that and are listed in CONTENT_REVIEW.md. No stack, status or problem statement is
 * given in FACTS.md, so none is listed.
 */
export const aegis = {
  slug: "aegis",
  name: "AEGIS",
  tier: 2,
  category: "AI Security",
  domain: ["AI Security", "Zero trust", "Governance", "Policy"],
  tagline: "A zero-trust control plane for AI agents.",
  summary:
    "Identity validation, intent-aware authorization, policy-based access control and semantic controls, with explicit trust boundaries around autonomous systems.",
  overview: [
    "AEGIS stands for AI Enforcement & Governance Infrastructure. It is a zero-trust control plane for AI agents.",
    "It validates identity, authorizes by intent, applies policy-based access control, and adds semantic controls against prompt injection and AI misuse. It puts explicit trust boundaries around autonomous systems.",
  ],
  flow: [
    "Identity validation",
    "Intent-aware authorization",
    "Policy",
    "Semantic controls",
    "Resource",
  ],
  stack: [],
  architecture: {
    nodes: [
      {
        id: "agent",
        label: "AI agent",
        sublabel: "Autonomous system",
        kind: "actor",
        col: 0,
        row: 1,
        process: "Requests access to a resource on behalf of a task.",
        trustBoundary: "Outside the control plane. Every request crosses the boundary.",
      },
      {
        id: "identity",
        label: "Identity validation",
        sublabel: "Who is asking?",
        kind: "gate",
        col: 1,
        row: 1,
        process: "Validates the identity of the agent making the request.",
      },
      {
        id: "intent",
        label: "Intent-aware authorization",
        sublabel: "What is it for?",
        kind: "gate",
        col: 2,
        row: 1,
        process: "Authorizes the request against the intent behind it, not only the identity.",
      },
      {
        id: "policy",
        label: "Policy-based access control",
        sublabel: "Is it permitted?",
        kind: "gate",
        col: 3,
        row: 1,
        process: "Evaluates the request against policy.",
      },
      {
        id: "semantic",
        label: "Semantic controls",
        sublabel: "Prompt injection and misuse",
        kind: "gate",
        col: 4,
        row: 1,
        process:
          "Applies controls to the meaning of a request, against prompt injection and AI misuse.",
      },
      {
        id: "resource",
        label: "Resource",
        sublabel: "Reached only after the controls",
        kind: "output",
        col: 5,
        row: 1,
        process: "Receives only requests that passed every control.",
        trustBoundary: "Protected side of the boundary.",
      },
    ],
    edges: [
      ["agent", "identity"],
      ["identity", "intent"],
      ["intent", "policy"],
      ["policy", "semantic"],
      ["semantic", "resource"],
    ],
    boundaries: [
      {
        id: "control-plane",
        label: "AEGIS control plane",
        nodeIds: ["identity", "intent", "policy", "semantic"],
      },
    ],
    caption:
      "Schematic of the design. Each layer answers a different question about a request from an agent.",
  },
  threatModel: {
    assets: [
      "The resources agents can reach",
      "The policy that defines what each agent may do",
      "Agent identities",
    ],
    attackSurface: [
      "Requests from agents to resources",
      "Prompts and inputs that can steer an agent",
      "The intent an agent declares for a request",
      "The policy definitions",
    ],
    trustBoundaries: [
      "Agent to control plane: every request crosses it.",
      "Control plane to resource: access follows only after the controls pass.",
    ],
    threatActors: [
      "An attacker who steers an agent with injected instructions",
      "A compromised or impersonated agent identity",
      "An agent acting outside its intended purpose",
    ],
    assumptions: [
      "Agent requests are routed through the control plane",
      "Policy is authored outside the agent’s reach",
    ],
    failureModes: [
      "Authorization on identity alone lets a valid agent use its access for the wrong purpose",
      "A policy gap leaves a request with no rule to evaluate it",
      "A semantic control misses a new phrasing of an injection",
      "The control plane is unavailable, and bypassing it to keep agents running defeats the control",
    ],
    controls: [
      "Identity validation",
      "Intent-aware authorization",
      "Policy-based access control",
      "Semantic controls against prompt injection and misuse",
      "Explicit trust boundaries around autonomous systems",
    ],
  },
  decisions: [
    {
      question: "Why validate identity before authorizing?",
      answer:
        "Authorization on an unverified identity is authorization for whoever claims it. Identity comes first so every later decision has a subject it can trust.",
    },
    {
      question: "Why authorize by intent as well as identity?",
      answer:
        "Identity says who is asking, not what for. An agent with legitimate access can still be steered into using it for the wrong purpose. Checking intent narrows access to what the task needs.",
    },
    {
      question: "Why add semantic controls on top of policy?",
      answer:
        "Policy decides what is structurally allowed. Prompt injection and misuse act through meaning, which resource-level rules do not see. Semantic controls look at what is being asked.",
    },
    {
      question: "Why a control plane instead of controls inside each agent?",
      answer:
        "A control inside the agent can be bypassed by an agent that is compromised or steered. A separate plane keeps the trust boundary outside the system it constrains.",
    },
  ],
  security: [
    "The control plane becomes a critical dependency. It needs its own protection and a defined behavior when it fails.",
    "Semantic controls reduce risk. They do not replace identity and policy checks.",
    "Policy is the source of truth for what an agent may do, so changes to it should be restricted and reviewed.",
  ],
  links: {},
  graphNodes: ["ai", "agents"],
} satisfies ProjectInput;
