import type { ProjectInput } from "./types";

/**
 * Flagship. Section A of docs/FACTS.md states: what it is, the problem, the approach, the impact,
 * the four named checks, the three outcomes, the status and the domain. The order of the checks,
 * what each one consumes and produces, the pass / fail / insufficient results, the rule that turns
 * them into allow, deny or escalate, the stale-evidence case and the threat model are reasoned
 * from that description and are listed in CONTENT_REVIEW.md for the owner to confirm, edit or
 * delete. No stack is named in FACTS.md, so none is listed.
 *
 * Canonical model, used on every page that describes WITNESS (this file, content/research/witness.ts
 * and the field notes): the checks run in the order Evidence, Corroboration, Policy, Validation,
 * then Decision. Each check returns pass, fail or insufficient. Any fail is deny. All pass is
 * allow. Insufficient evidence, with no fail, is escalate to a person. Evidence asks whether there
 * is independently observable evidence for the claim. Corroboration asks whether separate sources
 * agree with each other and with the claim. tests/unit/content.test.ts holds the pages to it.
 */
export const witness = {
  slug: "witness",
  name: "WITNESS",
  tier: 1,
  category: "AI Security",
  status: "Research / Prototype",
  domain: ["AI Security", "AIOps", "Detection", "Agentic security", "Zero trust"],
  tagline: "A deterministic admission gate for AI remediation.",
  summary:
    "An agent’s plausible remediation is not a proven one, and the actions it takes are high-impact. WITNESS lets an action run only when independently observable state supports that specific action.",
  metaDescription:
    "WITNESS is a research prototype: a deterministic gate that checks an AI agent’s proposed remediation against observable evidence before it runs.",
  overview: [
    "WITNESS is a deterministic admission-control layer for autonomous security and AIOps agents. Before a high-impact remediation executes, it verifies whether the real environment corroborates the agent’s proposal.",
    "It separates what an agent claims from what independently observable system state can prove, using deterministic evidence checks before allowing high-impact actions. The checks are Evidence, Corroboration, Policy and Validation. The outcome is allow, deny or escalate.",
    "The impact is a change in what autonomous security rests on: from “the AI thinks this is the problem” to “the environment provides sufficient evidence for this specific action.”",
  ],
  problem: [
    "Autonomous agents can generate plausible remediation actions without sufficient evidence that their causal claims are true.",
  ],
  flow: ["Agent proposal", "Evidence gate", "Allow / deny / escalate", "Execution"],
  stack: [],
  architecture: {
    nodes: [
      {
        id: "agent",
        label: "Agent proposal",
        sublabel: "A claim, not a fact",
        kind: "actor",
        col: 0,
        row: 1,
        input: "Telemetry and content the agent reads, which an attacker may be able to influence.",
        process: "Forms a causal hypothesis and proposes a remediation.",
        output: "A proposed action and the causal claims behind it.",
        trustBoundary: "Outside the gate. A proposal is a claim and has no authority to execute.",
      },
      {
        id: "environment",
        label: "Environment state",
        sublabel: "Independently observable",
        kind: "source",
        col: 1,
        row: 2,
        input: "The live system the action would change.",
        process: "Exposes state that can be observed without taking the agent’s word for it.",
        output:
          "Observations for the Evidence and Corroboration checks, and the current state again when the action executes.",
        trustBoundary: "Evidence has to come from here, not from the agent.",
      },
      {
        id: "evidence",
        label: "Evidence",
        sublabel: "Is there observable evidence?",
        kind: "gate",
        col: 1,
        row: 1,
        input: "The agent’s causal claims, and observations from the environment.",
        process:
          "Asks whether independently observable evidence exists for each causal claim, evidence the agent did not supply. It does not ask whether sources agree with each other. That is Corroboration.",
        output:
          "Pass (observable evidence supports the claim), fail (observable state contradicts it) or insufficient (nothing observable settles it, because evidence is missing, stale or unavailable).",
      },
      {
        id: "corroboration",
        label: "Corroboration",
        sublabel: "Do separate sources agree?",
        kind: "gate",
        col: 2,
        row: 1,
        input:
          "The claims, the Evidence result and observations from separate sources in the environment.",
        process:
          "Asks whether separate sources agree with each other and with the claim. Evidence asks whether there is evidence. Corroboration asks whether it holds up across sources.",
        output:
          "Pass (the sources agree with each other and with the claim), fail (they conflict with each other or with the claim) or insufficient (too few separate sources to compare).",
      },
      {
        id: "policy",
        label: "Policy",
        sublabel: "Is this action permitted?",
        kind: "gate",
        col: 3,
        row: 1,
        input: "The proposed action and the results of the Evidence and Corroboration checks.",
        process:
          "Applies explicit, deterministic rules for the action, including how much evidence it needs. An action with no rule has no permission.",
        output:
          "Pass (permitted), fail (forbidden, or no rule for this action) or insufficient (the rule needs more evidence than the earlier checks found).",
      },
      {
        id: "validation",
        label: "Validation",
        sublabel: "Final check before the decision",
        kind: "gate",
        col: 4,
        row: 1,
        input: "The proposed action and the results of the three earlier checks.",
        process:
          "Runs the last check on this specific action: whether the evidence found supports the action itself, not only the agent’s diagnosis.",
        output: "Pass, fail or insufficient for this specific action.",
      },
      {
        id: "decision",
        label: "Decision",
        sublabel: "Allow / deny / escalate",
        kind: "gate",
        col: 5,
        row: 1,
        input: "The proposed action and the results of the four checks.",
        process:
          "Combines the four results with fixed rules. Any fail gives deny. All pass gives allow. If nothing failed and some evidence is insufficient, the outcome is escalate.",
        output:
          "Allow, deny or escalate. An allow is bound to the environment state the checks observed.",
        trustBoundary: "The only route to execution passes through this node.",
      },
      {
        id: "escalated",
        label: "Escalated",
        sublabel: "Evidence does not settle it",
        kind: "output",
        col: 6,
        row: 0,
        input: "An escalate decision.",
        process: "The action is held, not run, and handed to a person with the gap stated.",
        output: "A held action and the reason the evidence fell short.",
      },
      {
        id: "denied",
        label: "Denied",
        sublabel: "Does not execute",
        kind: "output",
        col: 6,
        row: 1,
        input: "A deny decision.",
        process: "The action is not run.",
        output: "The proposal ends here.",
      },
      {
        id: "execution",
        label: "Execution",
        sublabel: "After allow, re-validated",
        kind: "output",
        col: 6,
        row: 2,
        input:
          "An allow decision with the state it was checked against, and the current state of the environment.",
        process:
          "Re-validates the environment state immediately before running. If the state no longer matches what the checks observed, the allow is stale and the action does not run.",
        output:
          "A change to the environment, or no change when the allow is stale. A stale allow needs a fresh check.",
        trustBoundary:
          "Outside the gate. Runs only after an allow, and only against the state that was checked.",
      },
    ],
    edges: [
      ["agent", "evidence"],
      ["environment", "evidence"],
      ["environment", "corroboration"],
      ["evidence", "corroboration"],
      ["corroboration", "policy"],
      ["policy", "validation"],
      ["validation", "decision"],
      ["decision", "escalated"],
      ["decision", "denied"],
      ["decision", "execution"],
      ["environment", "execution"],
    ],
    boundaries: [
      { id: "agent-side", label: "Agent proposes", nodeIds: ["agent"] },
      {
        id: "gate",
        label: "WITNESS decides",
        nodeIds: ["evidence", "corroboration", "policy", "validation", "decision"],
      },
      { id: "execution-side", label: "Execution after the gate", nodeIds: ["execution"] },
    ],
    caption:
      "Schematic of the design. The agent proposes and WITNESS decides. The checks run in the order shown and each returns pass, fail or insufficient: any fail denies, all pass allows, insufficient evidence escalates to a person. Execution follows an allow, after the environment state is re-validated.",
  },
  threatModel: {
    assets: [
      "The environment that remediation actions change",
      "The meaning of an allow: the evidence supported this specific action, in the environment state that was checked",
      "The evidence sources and the policy the checks rely on",
      "The record of each decision, so it can be replayed and audited",
    ],
    attackSurface: [
      "The agent’s proposal: its claims and the action it requests",
      "The telemetry and content the agent reads, which an attacker may be able to influence",
      "The evidence sources the checks read",
      "The policy definitions",
      "The path from an allow decision to execution",
      "The window between a check and the execution, in which the environment can change",
    ],
    trustBoundaries: [
      "Agent to gate: a proposal enters as a claim, not as an instruction.",
      "Environment to gate: independently observable state is the only accepted basis for corroboration.",
      "Gate to execution: execution follows an allow decision, and only against the state the checks observed.",
    ],
    threatActors: [
      "An attacker who influences what the agent observes, steering it toward a harmful but plausible remediation",
      "A compromised or malfunctioning agent that proposes actions it has no evidence for",
      "A mistaken agent that is not malicious: plausible causal claims with no evidence behind them",
      "An attacker who tampers with an evidence source so that a false claim is corroborated",
    ],
    assumptions: [
      "Independently observable state exists for the claims being checked",
      "The agent has no write access to the evidence sources",
      "Policy is authored and changed outside the agent’s reach",
      "No route to execution bypasses the gate",
      "The state a check observed can be read again when the action executes",
    ],
    failureModes: [
      "Evidence is missing, stale or ambiguous, so the check returns insufficient and the action goes to a person instead of running on the agent’s word",
      "An evidence source is unavailable, which counts as insufficient evidence, not as a pass",
      "Separate sources conflict, so Corroboration fails and the decision is deny",
      "An action class has no policy rule, so Policy fails and the decision is deny",
      "Policy is too strict and blocks a valid remediation: the action is denied, which costs time rather than safety, and a person can change the policy",
      "The environment changes between the check and the execution (time of check to time of use), so an allow rests on evidence that is no longer true",
      "An execution route that skips the gate removes the protection the gate is meant to give",
    ],
    controls: [
      "Deterministic checks: the same inputs and policy produce the same decision",
      "Claims kept separate from evidence",
      "Each check returns pass, fail or insufficient. Any fail denies, insufficient evidence escalates to a person, and only all-pass allows",
      "An allow is bound to the environment state it was checked against and is re-validated when the action executes. If the state has changed, the action does not run",
      "Execution only after the gate",
      "Replayable decisions, because the checks are deterministic",
    ],
  },
  decisions: [
    {
      question: "Why a deterministic gate?",
      answer:
        "A model that judges another model shares its failure mode: plausible text without proof. A deterministic gate returns the same decision for the same inputs, so a decision can be replayed, audited and explained afterwards. The cost is that it only checks what has been written down as a check.",
    },
    {
      question: "Why separate claims from evidence?",
      answer:
        "A claim is what the agent says is true. Evidence is what the environment shows. If the gate accepts the claim as its own evidence, the check is circular. Keeping them apart means the gate does not rest on what the agent says.",
    },
    {
      question: "Why separate Evidence from Corroboration?",
      answer:
        "Evidence asks whether independently observable evidence exists for a claim. Corroboration asks whether separate sources agree with each other and with the claim. One source can supply evidence, but if that one source is wrong nothing else disagrees with it. Two checks make each gap visible on its own.",
    },
    {
      question: "Why escalate instead of auto-deny?",
      answer:
        "Too little evidence is not the same as a wrong action. A deny discards a remediation that may be correct. When nothing has failed but the evidence is insufficient, the action escalates to a person with the gap stated. A fail, meaning observable state contradicts the claim or policy forbids the action, is a deny.",
    },
    {
      question: "Why not let the agent execute directly?",
      answer:
        "A high-impact action changes a live system, and a wrong action costs more than a delayed one. An agent’s confidence is not evidence, so execution waits for the gate.",
    },
    {
      question: "Why check the specific action, not just the diagnosis?",
      answer:
        "Evidence that a problem exists does not justify every action against it. The gate asks whether the evidence supports this specific action, not whether the agent’s diagnosis is plausible.",
    },
    {
      question: "Why a gate in front of execution instead of better prompting?",
      answer:
        "Prompting changes what an agent is likely to say. It does not change what is true. Admission control sits outside the agent, so it is meant to hold when the agent is wrong or has been manipulated.",
    },
    {
      question: "Why re-validate the environment when the action executes?",
      answer:
        "Design reasoning, not a description of a built mechanism. Evidence describes the environment at the moment it was read. A host can be rebuilt, a service restarted or an attacker can change state before the action runs, so an allow can rest on a state that no longer exists. Binding each allow to the state it was checked against, and reading that state again at execution, is meant to make a stale allow fail to run instead of running on old evidence. The cost is an extra read, and a valid action may need a fresh check.",
    },
  ],
  security: [
    "The gate is a high-value control. Any route to execution that skips it removes the protection it is meant to give, so the execution path should have no such entry.",
    "Evidence sources must be outside the agent’s control. Evidence the agent can write is evidence the agent can forge.",
    "Changing policy is a privileged operation, kept separate from the agent.",
    "Fail closed: missing, stale or conflicting evidence should not resolve to allow. Any fail denies, and insufficient evidence escalates to a person.",
    "Deterministic does not mean correct. A check that is wrong is wrong every time, so the checks themselves need review.",
    "WITNESS is research and prototype work. Read it as a research design, not as a deployed control.",
  ],
  links: {},
  graphNodes: ["ai", "agents", "detection", "automation"],
} satisfies ProjectInput;
