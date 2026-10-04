# CONTENT REVIEW

<!-- prettier-ignore-start -->

Owner review sheet for everything in `content/` that is **inferred or derived**, not stated in `docs/FACTS.md` section A or B. This is the list required by FACTS section D, rule 3.

**How to use it.** Each row has a statement, where it lives and why it is there. For every row do one of three things:

- **Confirm.** It matches your intent. Leave it.
- **Edit.** It is close. Reword it in the source file named in the heading.
- **Delete.** It is wrong, or you would rather not claim it. Remove it from the source file.

The site builds the same either way. Content is validated by `content/schema.ts` at build time.

**Not listed here.** Taglines, summaries, overview paragraphs, problem statements, stack lists, domains named by you, certification names and links, experience bullets and earlier-work notes are restatements of FACTS section A. They add no claim, so they are not rows below. Where one is lightly edited, the edit is listed under its group.

**Rules the data follows.** No metric, count, latency, accuracy, benchmark or user number appears for any system. No repo link, paper, talk or award appears for any system. Design reasoning is written as design intent, not as measured result.

## Check these first

The statements most likely to be wrong, in priority order:

1. **WITNESS, Validation.** FACTS names the check and nothing else. The node text is a placeholder. Replace it with what Validation actually does.
2. **WITNESS, order and shape of the checks.** FACTS lists Evidence, Corroboration, Policy, Validation. The diagram draws them in that order as a sequence. Say if they run in parallel or in another order.
3. **WITNESS, where escalation goes.** The diagram says an escalated action is held and passed on for a decision with more context. FACTS does not say to whom.
4. **SignalFusion Core, the Analyst node.** FACTS says AI-assisted investigation. It does not say a person reviews every finding before response. The diagram, a trust boundary, a decision and a control assume it.
5. **SignalFusion Core, where ATT&CK modeling sits.** FACTS gives the pipeline as correlation engine, AI investigation, response. ATT&CK mapping is drawn as a stage between correlation and investigation.
6. **AI security skill depth.** Six depth names come from the project brief, not FACTS: Secure AI Architecture, Tool Integrity, Model Governance, Autonomous Remediation, AI Red Teaming, AI Monitoring. Delete any you would not claim.
7. **ARGUS, Voltrix, DESAS flows.** Each card shows a short flow derived from the name and domain only. Replace with the real stages or delete.

## SignalFusion Core (`signalfusion-core`)

Source: `content/projects/signalfusion-core.ts`. Stack (Python, Elasticsearch, SIEM, AI) is as you named it. Elasticsearch is not placed in any diagram node because FACTS does not say what it does here. Action: confirm, edit or delete each row.

| Where | Statement | Basis |
| --- | --- | --- |
| signalfusion-core / architecture / node `sources` | Telemetry (SIEM / IDS / EDR / threat intel). Input: Endpoint, cloud and identity systems, plus threat intelligence. Output: Independent signals, each describing one event. Trust boundary: Untrusted input. Fields in a log or alert can be influenced by an attacker. | FACTS: inputs are SIEM / IDS / EDR / threat intel, and telemetry spans endpoint, cloud and identity. The Untrusted input note is derived: fields in logs and alerts can be influenced by an attacker. |
| signalfusion-core / architecture / node `normalize` | Normalization (Endpoint, cloud, identity). Input: Raw telemetry from each source. Process: Normalizes telemetry across endpoint, cloud and identity systems. Output: Signals that can be compared and joined. | FACTS: normalizes telemetry across endpoint, cloud and identity systems. Input and output wording is derived. |
| signalfusion-core / architecture / node `correlation` | Correlation engine (Entities across time). Input: Normalized signals. Process: Correlates entities across time, turning isolated events into behavioral relationships. Output: Related signals grouped around an entity. | FACTS: correlates entities across time, into behavioral relationships rather than isolated events. Output wording is derived. |
| signalfusion-core / architecture / node `attack` | ATT&CK mapping (Attacker behavior). Input: Correlated signals. Process: Models attacker behavior with MITRE ATT&CK to surface multi-stage and lateral-movement attacks. Output: Sequences that read as attacker behavior. | FACTS: models attacker behavior with MITRE ATT&CK to surface multi-stage and lateral-movement attacks. FACTS does not place this step in the pipeline. Drawing it after correlation is a choice. |
| signalfusion-core / architecture / node `investigation` | AI investigation (AI-assisted). Input: Correlated, mapped sequences. Process: Assembles disconnected alerts into a contextual investigation. Output: An investigation with its context and the signals behind it. Trust boundary: AI output is an input to a decision, not the decision. | FACTS: pipeline step AI investigation, and disconnected alerts become contextual investigations. The trust-boundary line is derived design intent. |
| signalfusion-core / architecture / node `analyst` | Analyst (Reviews the investigation). Input: The investigation and the signals behind it. Process: Reads the evidence and decides how to respond. Output: A response decision. Trust boundary: Human judgment sits between AI analysis and action. | Not in FACTS. Derived from AI-assisted investigation and from the question Why keep a human in the investigation loop? Confirm a person reviews findings before response, or delete this node and its two edges. |
| signalfusion-core / architecture / node `response` | Response (Act on the finding). Input: A decision on the investigation. Process: Carries the decision into action. | FACTS: the pipeline ends in response. What a response consists of is not stated, so the text stays generic. |
| signalfusion-core / architecture / structure | Edges: telemetry to normalization to correlation to ATT&CK mapping to AI investigation to response; AI investigation to analyst to response. Boundaries: Untrusted input, Automated analysis, Human judgment. Caption: Schematic of the design. Signals are normalized, correlated by entity and time, mapped to ATT&CK, investigated with AI assistance, and acted on after review. | The stated pipeline is correlation engine, AI investigation, response. The extra stages, the analyst branch, the three boundaries and the words acted on after review are derived. |
| signalfusion-core / classification | category: Detection & SOC. domain: Detection, SOC, Correlation, MITRE ATT&CK. graphNodes: soc, detection, cloud, ai. | FACTS gives no domain tags for SignalFusion. Tags use words from its description. graphNodes is an editorial mapping to the ambient graph. |
| signalfusion-core / threatModel.assets[0] | Telemetry from endpoint, cloud and identity systems | Derived: what a correlation system of this design holds and must keep intact. |
| signalfusion-core / threatModel.assets[1] | The relationships correlation builds between entities | Derived: what a correlation system of this design holds and must keep intact. |
| signalfusion-core / threatModel.assets[2] | Integrity of the analysis: what the SOC believes is happening | Derived: what a correlation system of this design holds and must keep intact. |
| signalfusion-core / threatModel.assets[3] | Analyst attention, which better signal-to-noise is meant to protect | Derived from the stated impact, better signal-to-noise. Confirm or delete. |
| signalfusion-core / threatModel.attackSurface[0] | Telemetry ingestion: every source that feeds normalization | Derived: the places where input or logic can be influenced between telemetry and response. |
| signalfusion-core / threatModel.attackSurface[1] | Fields in logs and alerts that an attacker can influence, such as hostnames, usernames and URLs | General property of logs, not a claim about a specific source. Derived. |
| signalfusion-core / threatModel.attackSurface[2] | The correlation and ATT&CK mapping logic and its rules | Derived: the places where input or logic can be influenced between telemetry and response. |
| signalfusion-core / threatModel.attackSurface[3] | Content passed to the AI investigation step | Derived: the places where input or logic can be influenced between telemetry and response. |
| signalfusion-core / threatModel.attackSurface[4] | The path from an investigation to a response | Derived: the places where input or logic can be influenced between telemetry and response. |
| signalfusion-core / threatModel.trustBoundaries[0] | Sources to normalization: telemetry is input. Attacker-influenced fields are handled as data, not instruction. | Derived from the described pipeline and the human-review assumption (see Check these first, item 4). |
| signalfusion-core / threatModel.trustBoundaries[1] | Automated analysis to analyst: AI output is a recommendation that a person reviews against the underlying signals. | Derived from the described pipeline and the human-review assumption (see Check these first, item 4). |
| signalfusion-core / threatModel.trustBoundaries[2] | Investigation to response: a response is a separate decision from a finding. | Derived from the described pipeline and the human-review assumption (see Check these first, item 4). |
| signalfusion-core / threatModel.threatActors[0] | An intruder moving through identities, endpoints and cloud resources over several stages, the sequence this system exists to surface | Restates the problem statement: attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure. |
| signalfusion-core / threatModel.threatActors[1] | An attacker who stays under per-alert thresholds by spreading activity across entities and time | Derived: who a system built to surface multi-stage and lateral-movement attacks has to defend against. |
| signalfusion-core / threatModel.threatActors[2] | An attacker who plants crafted content in logs or alerts to mislead the AI investigation step | Derived: who a system built to surface multi-stage and lateral-movement attacks has to defend against. |
| signalfusion-core / threatModel.threatActors[3] | An attacker who suppresses or tampers with a telemetry source to create a blind spot | Derived: who a system built to surface multi-stage and lateral-movement attacks has to defend against. |
| signalfusion-core / threatModel.assumptions[0] | Telemetry is complete enough to show the sequence of an attack, or its gaps are known | Derived: what correlation by entity and time needs to be true in order to work. |
| signalfusion-core / threatModel.assumptions[1] | An account, host or service can be identified consistently across sources | Derived: what correlation by entity and time needs to be true in order to work. |
| signalfusion-core / threatModel.assumptions[2] | Source clocks are close enough to order events across systems | Derived: what correlation by entity and time needs to be true in order to work. |
| signalfusion-core / threatModel.assumptions[3] | Analysts remain accountable for response decisions | Depends on the Analyst node being correct. See Check these first, item 4. |
| signalfusion-core / threatModel.failureModes[0] | Entity resolution fails: one account or host appears as two entities and the sequence is never joined | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.failureModes[1] | Clock skew between sources reorders events and breaks a sequence | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.failureModes[2] | A source goes silent and the gap is not visible, so absence of signal reads as absence of attack | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.failureModes[3] | Over-correlation joins unrelated signals into a false story | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.failureModes[4] | The AI investigation produces a confident but unsupported reading and the reviewer accepts it without checking the signals | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.failureModes[5] | Attacker behavior outside the ATT&CK model is not surfaced as a sequence | Derived: how a system that correlates by entity and time, maps to ATT&CK and uses AI assistance can go wrong. Written as risks, not as incidents that happened. |
| signalfusion-core / threatModel.controls[0] | Normalize before correlating, so signals are comparable | Derived from the described approach. Written as design intent, not as measured effect. |
| signalfusion-core / threatModel.controls[1] | Correlate by entity and time rather than alert by alert | Derived from the described approach. Written as design intent, not as measured effect. |
| signalfusion-core / threatModel.controls[2] | Map behavior to ATT&CK so sequences read as attacker behavior | Derived from the described approach. Written as design intent, not as measured effect. |
| signalfusion-core / threatModel.controls[3] | Keep the underlying signals attached to every investigation, so a claim can be checked | Design intent. FACTS does not say findings keep their signals attached. |
| signalfusion-core / threatModel.controls[4] | Review between AI investigation and response | Depends on the Analyst node being correct. See Check these first, item 4. |
| signalfusion-core / decisions[0] | Q: Why correlate by entity and time? A: Real attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure. One alert shows one step. Grouping signals by the entity they touch and the time they occur lets the steps be read as a sequence. | Reasoned from the problem statement: attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure, and the approach is to correlate entities across time. |
| signalfusion-core / decisions[1] | Q: Why normalize before correlating? A: Endpoint, cloud and identity systems describe the same activity in different shapes. Correlation across them only works once their records can be compared and joined. | Reasoned from normalizes telemetry across endpoint, cloud and identity systems. The claim that sources use different shapes is general. |
| signalfusion-core / decisions[2] | Q: Why map to MITRE ATT&CK? A: ATT&CK gives a shared vocabulary for attacker behavior. Mapping related signals to it turns “these alerts are connected” into a claim an analyst can check, such as lateral movement, and lets a multi-stage attack be read as stages. | Reasoned from models attacker behavior with MITRE ATT&CK. The shared-vocabulary argument is general, not specific to your build. |
| signalfusion-core / decisions[3] | Q: Why correlate into relationships instead of scoring alerts one by one? A: Each step of a multi-stage attack can look minor on its own. The sequence is where the attack shows up, and where signal-to-noise improves. | Reasoned from the stated approach, correlate signals into behavioral relationships rather than isolated events. |
| signalfusion-core / decisions[4] | Q: Why keep a human in the investigation loop? A: AI assistance speeds up reading the evidence. It does not remove accountability for the response. An analyst who can see the signals behind a finding can catch a story that is plausible but wrong. | Reasoned from AI-assisted investigation. Assumes a person reviews findings. See Check these first, item 4. |
| signalfusion-core / decisions[5] | Q: Why separate investigation from response? A: An investigation says what is happening. A response changes something. Keeping them as separate stages makes the response a deliberate decision, not a side effect of a model’s output. | Reasoned from the stated pipeline order, AI investigation then response. |
| signalfusion-core / decisions[6] | Q: Why treat telemetry as untrusted input? A: Logs and alerts carry fields an attacker can influence. An AI step that reads them can be steered by crafted content. Handling telemetry as data, never as instruction, stops the attacker from directing the investigation. | Derived design reasoning: telemetry carries attacker-influenced fields and an AI step can be steered by them. Not stated by you. |
| signalfusion-core / security[0] | Telemetry is attacker-influenced input. Fields such as hostnames, usernames and URLs should reach the AI investigation step as data, never as instructions. | Derived. Same reasoning as the untrusted-telemetry decision. |
| signalfusion-core / security[1] | The relationships correlation builds between entities describe how accounts, hosts and services connect. They are as useful to an attacker as to a defender, so they need the same protection as the telemetry they come from. | Derived from correlates entities across time. The sensitivity of the relationship data is general reasoning. |
| signalfusion-core / security[2] | Silence from a source looks the same as a quiet network. Missing telemetry needs its own visibility. | Derived: general property of telemetry pipelines. |
| signalfusion-core / security[3] | Every finding should carry the signals behind it, so a reviewer can check the story instead of trusting it. | Derived design intent. Not stated by you. |
| signalfusion-core / security[4] | A response should follow a decision, not a model’s output alone. | Derived design intent. Depends on the human-review assumption. |
| signalfusion-core / security[5] | Correlation rules and ATT&CK mappings are detection logic. Changes to them should be reviewed like code. | Derived from design and optimize SIEM correlation rules (your HPE role). Treating rules as code is a general practice, not a claim about this system. |

## WITNESS (`witness`)

Source: `content/projects/witness.ts`. Status Research / Prototype and the domain tags are as you gave them. No stack is listed. Action: confirm, edit or delete each row, starting with Validation.

| Where | Statement | Basis |
| --- | --- | --- |
| witness / architecture / node `agent` | Agent proposal (A claim, not a fact). Input: Signals the agent has observed. Process: Forms a causal hypothesis and proposes a remediation. Output: A proposed action and the causal claims behind it. Trust boundary: Outside the gate. A proposal has no authority to execute. | FACTS: an agent's proposal is a claim. No authority to execute is derived from execution only after the gate, which is wording from the project brief and not from FACTS. Input, process and output wording is derived from the problem statement. |
| witness / architecture / node `environment` | Environment state (Independently observable). Input: The live system the action would change. Process: Exposes state that can be observed without taking the agent’s word for it. Output: Observations the checks compare claims against. Trust boundary: Evidence has to come from here, not from the agent. | FACTS: independently observable system state. The rest is derived. Confirm that evidence is meant to come only from the environment. |
| witness / architecture / node `evidence` | Evidence (Is the claim supported?). Input: The agent’s causal claims. Process: Looks for supporting evidence for each claim in observable state. Output: Supported or unsupported, per claim. | FACTS names the check Evidence. What it consumes and returns is derived. |
| witness / architecture / node `corroboration` | Corroboration (Does the environment agree?). Input: The claims and the observed environment state. Process: Checks whether the real environment corroborates each claim. Output: Corroborated or not, per claim. | FACTS: verifies whether the real environment corroborates an agent's proposed remediation. Per-claim wording is derived. |
| witness / architecture / node `policy` | Policy (Is this action permitted?). Input: The proposed action and the evidence found. Process: Applies explicit, deterministic rules for the action, including how much evidence it needs. Output: Permitted or not under policy. | FACTS names the check Policy. How much evidence an action needs is derived from deterministic evidence checks before allowing high-impact actions. |
| witness / architecture / node `validation` | Validation (Final check before the decision). Input: The proposal and the results of the earlier checks. Process: Runs the last check on the specific action before a decision is made. Output: Pass or fail for the specific action. | HIGH PRIORITY. FACTS names the check Validation and says nothing more. This text is a placeholder. Replace it with what Validation actually checks. |
| witness / architecture / node `decision` | Decision (Allow / deny / escalate). Input: The results of all four checks. Process: Combines the results deterministically into one outcome. Output: Allow, deny or escalate. Trust boundary: The only route to execution passes through this node. | FACTS: the outcome is allow, deny or escalate. Combining four check results deterministically into one outcome is derived. |
| witness / architecture / node `execution` | Execution (Only after allow). Input: An allowed action. Process: Runs the remediation. Output: A change to the environment. Trust boundary: Outside the gate. Runs only after an allow decision. | Derived from the project brief's trust boundary: execution happens only after the gate. Not in FACTS. |
| witness / architecture / node `denied` | Denied (Does not execute). Input: A deny decision. Process: The action is not run. Output: The proposal ends here. | Derived from the deny outcome. What a deny leaves behind (a log, an alert) is deliberately not stated. |
| witness / architecture / node `escalated` | Escalated (Evidence does not settle it). Input: An escalate decision. Process: The action is held, not run, and passed on for a decision with more context. Output: A held action and the reason the evidence fell short. | Derived from the escalate outcome. FACTS does not say where an escalation goes. Confirm or reword. |
| witness / architecture / structure | Check order Evidence, Corroboration, Policy, Validation drawn as a sequence. Environment state feeds Evidence and Corroboration. Decision fans out to Execution, Denied, Escalated. Boundaries: Agent proposes, WITNESS decides, Execution after the gate. Caption: Schematic of the design. The agent proposes, WITNESS decides, and execution happens only after the gate. The order of the checks is illustrative. | FACTS lists the four checks but not their order or whether they run in sequence. The boundary wording comes from the project brief (Agent proposes, WITNESS decides, execution happens only after the gate), not from FACTS. Confirm it is how you describe WITNESS. The caption says the order is illustrative. |
| witness / flow | Agent proposal > Evidence gate > Allow / deny / escalate > Execution | Card flow from the project brief. Evidence gate compresses your four checks into one stage. The other three stages follow your description: proposal, outcome, execution. |
| witness / classification | category: AI Security. graphNodes: ai, agents, detection, automation. stack: none listed. | Domain tags are as you gave them. category and graphNodes are editorial. FACTS names no stack for WITNESS. |
| witness / threatModel.assets[0] | The environment that remediation actions change | Derived: what the described gate must protect. |
| witness / threatModel.assets[1] | The meaning of an allow: the evidence supported this specific action | Derived: what the described gate must protect. |
| witness / threatModel.assets[2] | The evidence sources and the policy the checks rely on | Derived: what the described gate must protect. |
| witness / threatModel.assets[3] | The record of each decision, so it can be replayed and audited | Derived from the example in FACTS section D (a deterministic decision can be replayed and audited). FACTS does not say decisions are recorded. |
| witness / threatModel.attackSurface[0] | The agent’s proposal: its claims and the action it requests | Derived: where an attacker or an error can enter the path from proposal to evidence to decision to execution. |
| witness / threatModel.attackSurface[1] | The telemetry and content the agent reads, which an attacker may be able to influence | Derived: an agent that reads attacker-influenced content can be steered. General reasoning about agents, not a claim about your build. |
| witness / threatModel.attackSurface[2] | The evidence sources the checks read | Derived: where an attacker or an error can enter the path from proposal to evidence to decision to execution. |
| witness / threatModel.attackSurface[3] | The policy definitions | Derived: where an attacker or an error can enter the path from proposal to evidence to decision to execution. |
| witness / threatModel.attackSurface[4] | The path from an allow decision to execution | Derived: where an attacker or an error can enter the path from proposal to evidence to decision to execution. |
| witness / threatModel.trustBoundaries[0] | Agent to gate: a proposal enters as a claim, never as an instruction. | First and third rows use the project brief's trust-boundary wording. The second is derived from independently observable system state. |
| witness / threatModel.trustBoundaries[1] | Environment to gate: independently observable state is the only accepted basis for corroboration. | First and third rows use the project brief's trust-boundary wording. The second is derived from independently observable system state. |
| witness / threatModel.trustBoundaries[2] | Gate to execution: execution happens only after the gate returns allow. | First and third rows use the project brief's trust-boundary wording. The second is derived from independently observable system state. |
| witness / threatModel.threatActors[0] | An attacker who influences what the agent observes, steering it toward a harmful but plausible remediation | Derived: who a gate in front of autonomous remediation has to defend against. |
| witness / threatModel.threatActors[1] | A compromised or malfunctioning agent that proposes actions it cannot justify | Derived: who a gate in front of autonomous remediation has to defend against. |
| witness / threatModel.threatActors[2] | A mistaken agent that is not malicious: plausible causal claims with no evidence behind them | Restates the problem statement: agents can produce plausible actions without sufficient evidence. Not an adversary. |
| witness / threatModel.threatActors[3] | An attacker who tampers with an evidence source so that a false claim is corroborated | Derived: who a gate in front of autonomous remediation has to defend against. |
| witness / threatModel.assumptions[0] | Independently observable state exists for the claims being checked | Derived: what separating claims from evidence needs to be true in order to work. |
| witness / threatModel.assumptions[1] | The agent cannot write to the evidence sources | Derived: what separating claims from evidence needs to be true in order to work. |
| witness / threatModel.assumptions[2] | Policy is authored and changed outside the agent’s reach | Derived: what separating claims from evidence needs to be true in order to work. |
| witness / threatModel.assumptions[3] | No route to execution bypasses the gate | Derived: what separating claims from evidence needs to be true in order to work. |
| witness / threatModel.failureModes[0] | Evidence is missing or ambiguous, so the claim cannot be corroborated and the action must not run on the agent’s word alone | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.failureModes[1] | An evidence source is unavailable, which must not resolve to allow | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.failureModes[2] | The checks disagree, which must not resolve to allow | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.failureModes[3] | An action class has no policy rule, leaving a gap the gate has to treat as no permission | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.failureModes[4] | Policy is too strict and blocks a valid remediation, which costs time rather than safety | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.failureModes[5] | An execution route that skips the gate removes the guarantee | Derived design reasoning. Fail-closed behavior (no allow on missing or conflicting evidence) is not stated by you. Confirm that is the intended behavior. |
| witness / threatModel.controls[0] | Deterministic checks: the same inputs and policy produce the same decision | Derived from the described design. Written as design intent, not as measured effect. |
| witness / threatModel.controls[1] | Claims kept separate from evidence | Derived from the described design. Written as design intent, not as measured effect. |
| witness / threatModel.controls[2] | Explicit allow, deny and escalate outcomes, with no execution unless the outcome is allow | No execution unless allow is derived. FACTS states the outcomes but not the default. |
| witness / threatModel.controls[3] | Execution only after the gate | Derived from the described design. Written as design intent, not as measured effect. |
| witness / threatModel.controls[4] | Replayable decisions, because the checks are deterministic | Derived from deterministic. FACTS does not say decisions are recorded. |
| witness / decisions[0] | Q: Why a deterministic gate? A: A model that judges another model shares its failure mode: plausible text without proof. A deterministic gate returns the same decision for the same inputs, so a decision can be replayed, audited and explained afterwards. The cost is that it only checks what has been written down as a check. | Reasoned from deterministic evidence checks. The argument that a model judging a model shares its failure mode is general reasoning. The cost sentence is derived. |
| witness / decisions[1] | Q: Why separate claims from evidence? A: A claim is what the agent says is true. Evidence is what the environment shows. If the gate accepts the claim as its own evidence, the check is circular. Keeping them apart means an agent cannot talk its way past the gate. | Closely follows your own phrasing: separate what an agent claims from what independently observable system state can prove. The circularity argument is derived. |
| witness / decisions[2] | Q: Why escalate instead of auto-deny? A: Too little evidence is not the same as a wrong action. A deny discards a remediation that may be correct. Escalation keeps it, with the gap stated, for a decision with more context. Deny fits actions that policy forbids or that the evidence contradicts. | Derived. The brief asks for this question. FACTS lists escalate as an outcome but not why it exists. The rule of when to deny is reasoned, not stated. |
| witness / decisions[3] | Q: Why not autonomous execution? A: A high-impact action changes a live system, and a wrong action costs more than a delayed one. An agent’s confidence is not evidence, so execution waits for the gate. | Derived. The brief asks for this question. Follows from execution only after the gate and high-impact actions. |
| witness / decisions[4] | Q: Why check the specific action, not just the diagnosis? A: Evidence that a problem exists does not justify every action against it. The gate asks whether the evidence supports this specific action, not whether the agent’s diagnosis is plausible. | Reasoned from your impact line: sufficient evidence for this specific action. The distinction between diagnosis and action is derived. |
| witness / decisions[5] | Q: Why a gate in front of execution instead of better prompting? A: Prompting changes what an agent is likely to say. It does not change what is true. Admission control sits outside the agent, so it still holds when the agent is wrong or has been manipulated. | Derived design reasoning: admission control sits outside the agent. General argument, not specific to your build. |
| witness / security[0] | The gate is a high-value control. Any route to execution that skips it removes the guarantee, so the execution path should have no such entry. | Derived design intent. FACTS does not describe the execution path. |
| witness / security[1] | Evidence sources must be outside the agent’s control. Evidence the agent can write is evidence the agent can forge. | Derived design intent following from independently observable system state. |
| witness / security[2] | Changing policy is a privileged operation, kept separate from the agent. | Derived design intent. FACTS does not describe how policy is managed. |
| witness / security[3] | Fail closed: missing or conflicting evidence should never resolve to allow. | Derived design intent (fail closed). Confirm. |
| witness / security[4] | Deterministic does not mean correct. A check that is wrong is wrong every time, so the checks themselves need review. | General reasoning about deterministic checks. Not stated by you. |
| witness / security[5] | WITNESS is research and prototype work. Read it as a research design, not as a deployed control. | Follows from Status: Research / Prototype. Not a deployment claim. Reword if you prefer. |

## AEGIS (`aegis`)

Source: `content/projects/aegis.ts`. FACTS gives the expansion, the four controls and the trust-boundary phrase. Everything below is reasoned from those. Action: confirm, edit or delete each row.

| Where | Statement | Basis |
| --- | --- | --- |
| aegis / architecture / node `agent` | AI agent (Autonomous system). Process: Requests access to a resource on behalf of a task. Trust boundary: Outside the control plane. Every request crosses the boundary. | Derived. FACTS says AEGIS is a control plane for AI agents with explicit trust boundaries around autonomous systems. The request wording is general. |
| aegis / architecture / node `identity` | Identity validation (Who is asking?). Process: Validates the identity of the agent making the request. | FACTS names identity validation. One-line process wording derived from the name. |
| aegis / architecture / node `intent` | Intent-aware authorization (What is it for?). Process: Authorizes the request against the intent behind it, not only the identity. | FACTS names intent-aware authorization. Wording derived from the name. |
| aegis / architecture / node `policy` | Policy-based access control (Is it permitted?). Process: Evaluates the request against policy. | FACTS names policy-based access control. Wording derived from the name. |
| aegis / architecture / node `semantic` | Semantic controls (Prompt injection and misuse). Process: Applies controls to the meaning of a request, against prompt injection and AI misuse. | FACTS: semantic controls against prompt injection and AI misuse. Wording follows it closely. |
| aegis / architecture / node `resource` | Resource (Reached only after the controls). Process: Receives only requests that passed every control. Trust boundary: Protected side of the boundary. | Derived from the project brief's flow, ending at the resource. Not in FACTS. |
| aegis / architecture / structure | Layers drawn in order: identity validation, intent-aware authorization, policy, semantic controls, then the resource. Boundary: AEGIS control plane around the four layers. Caption: Schematic of the design. Each layer answers a different question about a request from an agent. | FACTS lists the four controls in this order and states explicit trust boundaries. Treating them as a request-time chain, and the resource node, are derived from the project brief. |
| aegis / flow | Identity validation > Intent-aware authorization > Policy > Semantic controls > Resource | The first four stages are your four controls in your order, with Policy shortened from policy-based access control. Resource is added from the project brief. |
| aegis / classification | category: AI Security. domain: AI Security, Zero trust, Governance, Policy. graphNodes: ai, agents. stack and problem: none given. | FACTS gives no domain tags for AEGIS. Tags use words from its name and description. graphNodes is editorial. |
| aegis / threatModel.assets[0] | The resources agents can reach | Derived: what an agent control plane protects. |
| aegis / threatModel.assets[1] | The policy that defines what each agent may do | Derived: what an agent control plane protects. |
| aegis / threatModel.assets[2] | Agent identities | Derived: what an agent control plane protects. |
| aegis / threatModel.attackSurface[0] | Requests from agents to resources | Derived from the described control layers. |
| aegis / threatModel.attackSurface[1] | Prompts and inputs that can steer an agent | Derived from the described control layers. |
| aegis / threatModel.attackSurface[2] | The intent an agent declares for a request | Derived from the described control layers. |
| aegis / threatModel.attackSurface[3] | The policy definitions | Derived from the described control layers. |
| aegis / threatModel.trustBoundaries[0] | Agent to control plane: every request crosses it. | Derived from explicit trust boundaries around autonomous systems. |
| aegis / threatModel.trustBoundaries[1] | Control plane to resource: access follows only after the controls pass. | Derived from explicit trust boundaries around autonomous systems. |
| aegis / threatModel.threatActors[0] | An attacker who steers an agent with injected instructions | Derived: who prompt-injection and misuse controls exist to stop. |
| aegis / threatModel.threatActors[1] | A compromised or impersonated agent identity | Derived: who prompt-injection and misuse controls exist to stop. |
| aegis / threatModel.threatActors[2] | An agent acting outside its intended purpose | Derived: who prompt-injection and misuse controls exist to stop. |
| aegis / threatModel.assumptions[0] | Agent requests are routed through the control plane | Derived: what a control plane needs to be true in order to work. |
| aegis / threatModel.assumptions[1] | Policy is authored outside the agent’s reach | Derived: what a control plane needs to be true in order to work. |
| aegis / threatModel.failureModes[0] | Authorization on identity alone lets a valid agent use its access for the wrong purpose | Derived design reasoning. Written as risks, not as incidents that happened. |
| aegis / threatModel.failureModes[1] | A policy gap leaves a request with no rule to evaluate it | Derived design reasoning. Written as risks, not as incidents that happened. |
| aegis / threatModel.failureModes[2] | A semantic control misses a new phrasing of an injection | Derived design reasoning. Written as risks, not as incidents that happened. |
| aegis / threatModel.failureModes[3] | The control plane is unavailable, and bypassing it to keep agents running defeats the control | Derived design reasoning. Written as risks, not as incidents that happened. |
| aegis / threatModel.controls[0] | Identity validation | Restates the four controls and the trust boundaries from FACTS. Listed because the grouping as controls is derived. |
| aegis / threatModel.controls[1] | Intent-aware authorization | Restates the four controls and the trust boundaries from FACTS. Listed because the grouping as controls is derived. |
| aegis / threatModel.controls[2] | Policy-based access control | Restates the four controls and the trust boundaries from FACTS. Listed because the grouping as controls is derived. |
| aegis / threatModel.controls[3] | Semantic controls against prompt injection and misuse | Restates the four controls and the trust boundaries from FACTS. Listed because the grouping as controls is derived. |
| aegis / threatModel.controls[4] | Explicit trust boundaries around autonomous systems | Restates the four controls and the trust boundaries from FACTS. Listed because the grouping as controls is derived. |
| aegis / decisions[0] | Q: Why validate identity before authorizing? A: Authorization on an unverified identity is authorization for whoever claims it. Identity comes first so every later decision has a subject it can trust. | Derived design reasoning. FACTS names identity validation but not why it comes first. |
| aegis / decisions[1] | Q: Why authorize by intent as well as identity? A: Identity says who is asking, not what for. An agent with legitimate access can still be steered into using it for the wrong purpose. Checking intent narrows access to what the task needs. | Reasoned from intent-aware authorization. |
| aegis / decisions[2] | Q: Why add semantic controls on top of policy? A: Policy decides what is structurally allowed. Prompt injection and misuse act through meaning, which resource-level rules do not see. Semantic controls look at what is being asked. | Reasoned from semantic controls against prompt injection and AI misuse. |
| aegis / decisions[3] | Q: Why a control plane instead of controls inside each agent? A: A control inside the agent can be bypassed by an agent that is compromised or steered. A separate plane keeps the trust boundary outside the system it constrains. | Reasoned from zero-trust control plane and explicit trust boundaries around autonomous systems. |
| aegis / security[0] | The control plane becomes a critical dependency. It needs its own protection and a defined behavior when it fails. | Derived: general property of a control plane. |
| aegis / security[1] | Semantic controls reduce risk. They do not replace identity and policy checks. | Derived: general reasoning about semantic controls. |
| aegis / security[2] | Policy is the source of truth for what an agent may do, so changes to it should be restricted and reviewed. | Derived design intent. FACTS does not describe how policy is managed. |

## ARGUS, Voltrix and DESAS

Sources: `content/projects/argus.ts`, `voltrix.ts`, `desas.ts`. FACTS gives one line each. These entries carry only that, plus the rows below. Action: supply detail (see the last section) or confirm these stay short.

| Where | Statement | Basis |
| --- | --- | --- |
| argus / flow | Malware sample > Autonomous agents > Analysis | FACTS gives only agentic autonomous malware analysis. Malware sample is implied by malware analysis. Autonomous agents restates the description. Replace with the real stages, or delete. |
| argus / classification | category: DFIR & Malware. graphNodes: dfir, ai, agents. stack, architecture, threat model and decisions: none. | Domain (DFIR, Malware, AI) is as you gave it. category and graphNodes are editorial. Nothing else is written because FACTS has nothing else. |
| argus / overview[1] | This page is intentionally short. No implementation detail is published here. | A statement about the page, not about the system. Keep it, reword it, or replace it once you supply detail. |
| voltrix / flow | Incident > Agents > Automated response | FACTS gives only AI-driven incident response platform and the domain DFIR, Agents, Automation. The three stages use those domain words. Replace with the real stages, or delete. |
| voltrix / classification | category: DFIR & Automation. graphNodes: dfir, agents, automation. stack, architecture, threat model and decisions: none. | Domain is as you gave it. category and graphNodes are editorial. |
| voltrix / overview[1] | This page is intentionally short. No implementation detail is published here. | A statement about the page, not about the system. Keep, reword or replace. |
| desas / flow | Email > Sandbox > Analysis | Restates the words of the name: Dynamic Email Sandbox Analysis System. No further stage is claimed. |
| desas / classification | category: Email Security. domain: Email, Sandbox, Analysis. graphNodes: detection, dfir. stack, architecture, threat model and decisions: none. | FACTS gives no domain for DESAS. Domain tags are the words of the name. category and graphNodes are editorial. |
| desas / summary | Analyzes email in a dynamic sandbox. | Restates the name. No capability is claimed beyond it. |
| desas / overview[1] | This page is intentionally short. No implementation detail is published here. | A statement about the page, not about the system. Keep, reword or replace. |

## Research items

Sources: `content/research/*.ts`. Abstracts restate FACTS section A. Notes are reasoned from each concept and are flagged here as inferred. They are written as questions and design reasoning, not as findings. No paper or link is listed because none exists. Action: confirm, edit or delete each row.

| Where | Statement | Basis |
| --- | --- | --- |
| research / witness / notes[0] | Open question: what counts as independent evidence. An observation is independent only if the agent cannot influence it, so the evidence boundary matters as much as the checks. | Derived: reasoned from the concept of separating claims from evidence. Presented as an open question. |
| research / witness / notes[1] | A claim is only checkable if it is specific. “The host is compromised” has to be reduced to observable facts before the environment can corroborate it. | Derived: reasoned from corroborates an agent's proposed remediation. |
| research / witness / notes[2] | Determinism is worth protecting. With fixed inputs and fixed policy the decision should replay identically, which makes it testable and auditable. | Derived from deterministic. Replay and audit follow the FACTS section D example. |
| research / witness / notes[3] | Three outcomes carry more information than two. Escalate is the honest answer when the evidence neither supports nor contradicts the action. | Derived from the allow / deny / escalate outcomes. |
| research / witness / notes[4] | The gate bounds the damage of a wrong agent. It does not make the agent right. | Derived design reasoning. |
| research / witness / tagline | Evidence before autonomous action. | Condensed from your impact line (the environment provides sufficient evidence for this specific action). No new claim. Reword if you prefer. |
| research / witness / relatedProjects | witness | Editorial link to the project page of the same name. |
| research / witness / abstract | Last sentence: Status: research prototype. | FACTS: Status Research / Prototype. Reworded. |
| research / securemodelgate / notes[0] | Enforcement happens at runtime, at the interaction between a model or agent and what it touches, because that is where an unsafe action becomes real. | Derived from runtime security enforcement. |
| research / securemodelgate / notes[1] | A safety discussion asks what a model should do. Enforcement asks what it is able to do. The second question has an answer that can be checked. | Derived from AI security as an enforcement problem, not only a safety discussion. The checkable-answer claim is reasoning. |
| research / securemodelgate / notes[2] | Deterministic policy is the point. A rule enforced the same way every time can be tested, reviewed and audited, which a probabilistic safeguard cannot. | Derived from deterministic policy. |
| research / securemodelgate / notes[3] | Trust boundaries have to be explicit. An interaction that crosses one needs a verifiable reason to be allowed. | Derived from trust boundaries. The verifiable-reason claim is reasoning. |
| research / securemodelgate / notes[4] | Shares a premise with AEGIS and WITNESS: control sits outside the model, at the point where action happens. | Editorial. FACTS does not relate SecureModelGate to AEGIS or WITNESS. Confirm the shared premise or delete. |
| research / securemodelgate / relatedProjects | aegis, witness | Editorial. FACTS does not link them. Confirm or delete. |
| research / ai-dfir / notes[0] | Incident response is a sequence of decisions under time pressure. An agentic design has to say which steps are safe to automate and which need a person, and that boundary moves with the cost of being wrong. | Derived: general reasoning about incident response and automation. Not stated by you. |
| research / ai-dfir / notes[1] | Evidence handling constrains the design. An agent that touches a system during an investigation can change what it is investigating. | Derived: general forensic principle. Not stated by you. |
| research / ai-dfir / notes[2] | An investigation has to be reconstructable afterwards, so auditability matters as much as speed. | Derived: general principle. Not stated by you. |
| research / ai-dfir / notes[3] | An agent that proposes containment is making a remediation claim. That is the question WITNESS is built around. | Editorial link to WITNESS. Confirm or delete. |
| research / ai-dfir / relatedProjects | voltrix, argus, witness | Editorial. Linked through the DFIR domain tags on ARGUS and Voltrix, and through agent remediation. Confirm or delete. |
| research / ai-dfir / abstract | how autonomous agents could take part in digital forensics and incident response. It is a direction, not a published result. | FACTS: research direction only, no papers. DFIR expanded to digital forensics and incident response, which is the standard meaning. |
| research / agentic-security / notes[0] | An agent that can act has a larger attack surface than one that only answers, because its inputs can now cause actions. | Derived: general reasoning about agents. Not stated by you. |
| research / agentic-security / notes[1] | Trust should be earned per action, not granted per agent. | Derived: a position, not a fact. Confirm it is yours. |
| research / agentic-security / notes[2] | Once an agent holds tools, prompt injection becomes an access-control problem. | Derived: general reasoning. Not stated by you. |
| research / agentic-security / notes[3] | Identity, intent and evidence are three different questions. AEGIS asks the first two. WITNESS asks the third. | Editorial synthesis of AEGIS (identity validation, intent-aware authorization) and WITNESS (evidence). Confirm or delete. |
| research / agentic-security / notes[4] | Remediation is the hard case. It changes state, so being wrong costs more than being late. | Derived from trustworthy AI remediation. |
| research / agentic-security / relatedProjects | witness, aegis | Editorial. Confirm or delete. |
| research / agentic-security / abstract | how to let agents act on security problems without trusting their claims by default. It is a direction, not a published result. | FACTS: autonomous security agents / trustworthy AI remediation, research direction only. The clause on not trusting claims by default is derived from the WITNESS premise. |
| research / all / graphNodes | witness: ai, agents, detection. securemodelgate: ai, agents. ai-dfir: dfir, agents, ai. agentic-security: agents, ai, automation. | Editorial mapping to the ambient graph. |

## Experience

Source: `content/experience.ts`. Bullets are yours, lightly edited. Facilio has no description because none is known. Action: confirm the light edits, or restore your original wording.

| Where | Statement | Basis |
| --- | --- | --- |
| experience / hpe-soc / team and role | SOC Analyst, Cybersecurity Design & Engineering | FACTS gives the title as SOC Analyst, Cybersecurity Design & Engineering. The data splits it into role and team. |
| experience / hpe-soc / summary | Enterprise SOC and cyber defense. Previously titled Cybersecurity Analyst, SOC & Cyber Defense. | Restates FACTS: enterprise SOC and cyber defense environment, and the earlier title. |
| experience / hpe-soc / bullets[2..6] | Semicolons in the source bullets are split into sentences, for example: Build Python automation workflows. Apply AI-driven anomaly detection to improve alert prioritization and reduce noise. | Light edit for scanning. Meaning is unchanged. |
| experience / hpe-soc / tags | SOC, SIEM, MITRE ATT&CK, Python, AWS, Azure, IAM | Editorial selection of terms that appear in the bullets. |
| experience / hpe-intern / bullets | Same light edit: semicolons split into sentences. | Meaning is unchanged. |
| experience / hpe-intern / tags | SIEM, Splunk, CrowdStrike, Wiz, Azure | Editorial selection of terms that appear in the bullets. |
| experience / facilio-intern / dates | start: 2024, no end. | FACTS gives only the year. No month and no end are claimed. Add dates if you want them shown. |
| experience / education / entry | B.E. Computer Science & Engineering, Sri Krishna College of Engineering & Technology, 2021 to 2025, Anna University, CGPA 8.5/10. | FACTS A, restated. Listed so pages know education is stored as an experience entry with id education. |

## Skills

Source: `content/skills.ts`. Group names and items follow the project brief. Action: confirm, edit or delete each row.

| Where | Statement | Basis |
| --- | --- | --- |
| skills / ai-security / depth | Secure AI Architecture, Tool Integrity, Model Governance, Autonomous Remediation, AI Red Teaming, AI Monitoring | Not in FACTS section A or B. They come from the project brief's AI security depth list. Delete any you would not claim. AI Red Teaming and Tool Integrity are the most specific. |
| skills / ai-security / depth | Prompt Injection | FACTS says prompt-injection defense. Shortened to a topic name. Confirm. |
| skills / ai-security / depth | LLM-based security analysis, Anomaly detection, Behavioral analytics | FACTS section A. Listed because they were moved into depth. |
| skills / ai-security / depth | Agent Security is not repeated in depth. | The project brief lists it in both items and depth. The duplicate is dropped. |
| skills / ai-security / items | AI Security, LLM Security, Agent Security, AI Governance, Adversarial AI, Security Automation | As specified in the project brief. Security Automation also appears under Security Engineering. FACTS lists AI governance and adversarial AI. |
| skills / cloud-security / depth | Cloud misconfiguration remediation | Derived from your HPE bullet: remediate cloud misconfigurations across AWS and Azure. |
| skills / cloud-security / depth | Policy-as-code (concepts) | FACTS lists it under Frameworks. Placed under Cloud Security because DevSecOps sits there. Move if you prefer. |
| skills / security-engineering / depth | Threat hunting, Alert correlation, Root cause analysis, MITRE ATT&CK, Detection pipelines, Security observability | FACTS section A (security engineering and Frameworks lists). Grouping is editorial. |
| skills / engineering / depth | SQL, Bash, Go (basics) | FACTS section A. Go is listed as basics, as you wrote it. |
| skills / platforms | Splunk, CrowdStrike, Proofpoint, Zscaler, Wiz, Threat intelligence platforms | FACTS section A (Detection / platforms). Shown as its own group. No depth list because FACTS does not say what you used each for beyond the HPE intern bullets. |
| skills / all / levels | No levels, ratings or percentages anywhere. | By design. |

## Certifications

Source: `content/certifications.ts`. Seven verified, three planned. Action: confirm the exact titles and add years if you want them shown.

| Where | Statement | Basis |
| --- | --- | --- |
| certifications / Fortinet NSE 1 | Fortinet NSE 1 Network Security Associate | FACTS: Fortinet NSE 1 Network Security Associate/Fundamental. Shortened to the first form. Confirm the exact title on the badge. |
| certifications / issuer | Proofpoint AI Data Security Specialist: Proofpoint; Proofpoint AI Email Security Specialist: Proofpoint; AWS Certified Cloud Practitioner: Amazon Web Services; Microsoft Azure Fundamentals (AZ-900): Microsoft; Fortinet NSE 1 Network Security Associate: Fortinet; Fortinet NSE 2 Associate: Fortinet; TigerGraph Associate: TigerGraph; AWS Solutions Architect: Amazon Web Services; Security-focused certifications: none; AI security specialization: none | Issuer is derived from each certification name. Not separately stated in FACTS. |
| certifications / AWS Solutions Architect | AWS Solutions Architect | FACTS: planned, level not stated. No level (Associate or Professional) is claimed. Shown as planned, never as earned. |
| certifications / planned | AWS Solutions Architect; Security-focused certifications; AI security specialization | Your stated direction. Shown as planned with no year or link. |
| certifications / years | Only the two Proofpoint certifications carry a year, 2025. | FACTS: no other year is known. None is invented. |

## Earlier work

Source: `content/earlier-work.ts`. Action: confirm, or add notes and links for the name-only entries.

| Where | Statement | Basis |
| --- | --- | --- |
| earlier-work / notes | Notes restate FACTS with light edits, for example Machine learning for ML and Audio and video spectral analysis for audio/video spectral analysis. | No new claim. Confirm wording. |
| earlier-work / Sentinel AI | No link. | FACTS gives no URL for Sentinel AI. |
| earlier-work / name-only entries | Health Predictor, Grade Predictor, Celebria, BADAD, Accounting App | FACTS names them with no description. None is written. |
| earlier-work / ordering | Four linked projects first, then Sentinel AI, then the five name-only entries. | Editorial. |

## Site-wide editorial choices

Action: confirm, or change in `content/projects/index.ts`.

| Where | Statement | Basis |
| --- | --- | --- |
| projects / ordering | SignalFusion Core, then WITNESS (tier 1). AEGIS, ARGUS, Voltrix (tier 2). DESAS (tier 3). | Tiers are as you gave them. The order inside a tier is editorial. Swap the array order in content/projects/index.ts. |
| projects / links | Every project has links: {}. | FACTS: no repo URL is known for any of the six systems. None is shown. |
| projects / status | Only WITNESS has a status, Research / Prototype. | FACTS gives no status for the other five. None is invented. |

## What to supply to improve the site

Each item is something the site cannot say today because FACTS has no answer. Send any of these and the matching rows above can be firmed up or removed.

**Per system (WITNESS, SignalFusion Core, AEGIS, ARGUS, Voltrix, DESAS)**

- A repository link, if one is public. No project shows a code link today.
- A status you are comfortable stating (for example prototype, in use, archived). Only WITNESS has one.
- A paper, write-up or talk link, if one exists. Research items link to nothing today.
- The real stages of the pipeline, if different from the flows drawn here.

**WITNESS**

- What the Validation check does.
- Whether the four checks run in sequence or in parallel, and in what order.
- Where an escalated action goes.
- A stack, if you want one listed.

**SignalFusion Core**

- Whether a person reviews findings before a response runs.
- Where ATT&CK modeling sits in the pipeline.
- What the response stage does.
- What Elasticsearch is used for, so it can be placed in the diagram.

**ARGUS, Voltrix, DESAS**

- One paragraph each on what the system does. They are one line today. With enough detail an architecture diagram can be added.

**Numbers**

- Any metric you are comfortable publishing, with its source and date. The site shows none today. For example, alert volume handled, rule count, detection coverage, or the size of a dataset. Each needs a statement of what was measured and where.

**Career and credentials**

- A description of the Facilio internship, if you want it shown.
- Months for the Facilio dates.
- Exact titles for the two Fortinet badges.
- Years for the certifications that have none.
- A link for the two Proofpoint certifications, if one exists.
- A link for Sentinel AI, and a line for each name-only earlier project.

**Skills**

- Which of the six AI security depth names you want to keep.

<!-- prettier-ignore-end -->
