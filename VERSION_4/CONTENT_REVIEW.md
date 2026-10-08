# CONTENT REVIEW

<!-- prettier-ignore-start -->

Owner review sheet for everything in `content/` that is **inferred or derived**, not stated in `docs/FACTS.md` section A or B. This is the list required by FACTS section D, rule 3.

**How to use it.** Each row has a statement, where it lives and why it is there. For every row do one of three things:

- **Confirm.** It matches your intent. Leave it.
- **Edit.** It is close. Reword it in the source file named in the heading.
- **Delete.** It is wrong, or you would rather not claim it. Remove it from the source file.

The site builds the same either way. Content is validated by `content/schema.ts` at build time.

**Not listed here.** Taglines, problem statements, stack lists, domains named by you, certification names and links, experience bullets and earlier-work notes are restatements of FACTS section A. They add no claim, so they are not rows below. Where one is lightly edited, the edit is listed under its group. Summaries (the 30-second layer, which says why a system matters), meta descriptions, and the overview paragraphs of ARGUS, Voltrix and DESAS are not pure restatements, so they do have rows. The field notes have their own section.

**Rules the data follows.** No metric, count, latency, accuracy, benchmark or user number appears for any system. No repo link, paper, talk or award appears for any system. Design reasoning is written as design intent, not as measured result.

## Experience

Source: `content/experience.ts`. Bullets are yours, lightly edited. Facilio has no bullets because what was built there is not known; its summary says what the company does and names your stack. Action: confirm the light edits, or restore your original wording.

| Where | Statement | Basis |
| --- | --- | --- |
| experience / hpe-soc / team and role | SOC Analyst, Cybersecurity Design & Engineering | FACTS gives the title as SOC Analyst, Cybersecurity Design & Engineering. The data splits it into role and team. |
| experience / hpe-soc / summary | Enterprise SOC and cyber defense. Previously titled Cybersecurity Analyst, SOC & Cyber Defense. | Restates FACTS: enterprise SOC and cyber defense environment, and the earlier title. |
| experience / hpe-soc / bullets[2..6] | Semicolons in the source bullets are split into sentences, for example: Build Python automation workflows. Apply AI-driven anomaly detection to improve alert prioritization and reduce noise. | Light edit for scanning. Meaning is unchanged. |
| experience / hpe-soc / tags | SOC, SIEM, MITRE ATT&CK, Python, AWS, Azure, IAM | Editorial selection of terms that appear in the bullets. |
| experience / hpe-intern / bullets | Same light edit: semicolons split into sentences. | Meaning is unchanged. |
| experience / hpe-intern / tags | SIEM, Splunk, CrowdStrike, Wiz, Azure | Editorial selection of terms that appear in the bullets. |
| experience / facilio-intern / summary | Facilio builds a connected CMMS: cloud software that uses IoT data and AI to run maintenance and operations across commercial buildings. Worked with Redis, Kafka and Apache. | Company description from Facilio's public website (a connected CMMS: IoT and AI software for maintenance and operations in commercial buildings). Redis, Kafka and Apache are from you. Nothing about what you built is claimed. Confirm, or add what you did. |
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

## Field notes

Sources: `content/writing/*.mdx`. The three notes are derived from FACTS section A and from the case studies. They are not stated by you. Every row lists a statement that is inferred, written in your voice, or invented as an example. The case-study rows already cover the threat actors, failure modes and decisions the notes refer to, so the notes now argue the principle and link to the case study instead of repeating those lists. Action: confirm, edit or delete each row. Dates first: The date 2026-10-04 is the authoring date, not a verified publication date. Set the real date in the note's meta block when you publish (FACTS section D, rule 4). The date appears on the notes list and the home page, in the Article JSON-LD (datePublished and dateModified), in article:published_time and as the sitemap lastmod. All three notes carry the same date on purpose, so the site does not show a publishing cadence you did not have. Same-day notes sort by number.

| Where | Statement | Basis |
| --- | --- | --- |
| note 001 (siem-alerts-to-correlated-investigations) / meta | date: 2026-10-04. number: 1. tags: Detection, SOC, Correlation, SignalFusion Core. title: From SIEM alerts to correlated investigations. The summary is two sentences. | The date 2026-10-04 is the authoring date, not a verified publication date. Set the real date in the note's meta block when you publish (FACTS section D, rule 4). The date appears on the notes list and the home page, in the Article JSON-LD (datePublished and dateModified), in article:published_time and as the sitemap lastmod. All three notes carry the same date on purpose, so the site does not show a publishing cadence you did not have. Same-day notes sort by number. The tag SignalFusion Core matches the system name so the case study and the note can link to each other. Title and summary are editorial. |
| note 001 / Problem | I triage security alerts every day in an enterprise SOC. | FACTS section A: triage daily security alerts in an enterprise SOC. Restated in the first person, with no count. |
| note 001 / Problem | The decision is rarely about that event alone. It is about what else happened to the same account, host or mailbox before and after it. | First-person practice claim, not in FACTS. Derived from root cause analysis and incident lifecycle work in FACTS and from general SOC reasoning. Confirm this is how you triage, or delete. |
| note 001 / Problem | A hypothetical chain: a phishing email is delivered, a sign-in follows from a new location, a mailbox rule is created, an internal login appears on a server. Four alerts from four tools. | Labelled hypothetical on the page. Built from the FACTS list of phishing, account compromise and lateral movement. Not a real incident. |
| note 001 / Problem | Rebuilding that story by hand is slow, repetitive work. Pivot from the alert to the entity, then to every other source that mentions it, then put the results in order. | First-person practice claim, not in FACTS. Derived from support investigations across endpoint, cloud, identity and email. Confirm this is how you work, or delete. |
| note 001 / Architecture | Stages: normalize, resolve entities, correlate by entity inside a time window, map to ATT&CK, assemble an AI-assisted investigation, analyst reviews and decides, then response. Caption: Entity resolution as its own step, the ATT&CK position and the analyst step are illustrative. | FACTS gives the pipeline as correlation engine, AI investigation, response. Entity resolution as a stage, the time window, the ATT&CK position and the analyst are derived (Check these first, items 4 and 5). There is no path from the investigation to a response that skips the analyst, the same as the SignalFusion Core diagram. Keep the two in sync. |
| note 001 / Architecture | One account has different names in different tools. If two names for the same account are never joined, the sequence is never seen. | General reasoning about telemetry from several tools. Same idea as the entity-resolution failure mode in the case study. |
| note 001 / Threat model | Fields in a log are written by whoever caused the event, and a hostname can contain instructions. The design is meant to have the investigation step read telemetry as data, not as instruction. That is an aim, not a guarantee, so the analyst review and the signals behind each finding stay in the loop. | Derived design intent. Not stated by you. Same reasoning as signalfusion-core decisions[6]. The earlier wording said the step reads telemetry as data and never as instruction, which was a behavior claim. |
| note 001 / Design | Correlate by entity and time, because one alert shows one step and the steps only read as a sequence once they are grouped. Keep the signals attached to every finding, so a reviewer can open the evidence behind a conclusion. | Derived design intent. FACTS does not say findings keep their signals attached. Same as signalfusion-core controls[3]. |
| note 001 / Design | A normalized event as JSON: time, source, entities (host, account), action, attack tactic, raw_ref. The paragraph after it says what entities and raw_ref are for. | Invented example of a data shape, labelled ILLUSTRATIVE on the page. FACTS says telemetry is normalized but not into what. The paragraph is written as in this illustrative shape. Nothing says this is the shape SignalFusion Core uses. Delete if you would rather not show a shape. |
| note 001 / Failure modes | Over-correlation through a shared service account or jump host. A fluent AI summary that is unsupported. | Derived design reasoning. Same ideas as signalfusion-core failureModes[3] and [4], with examples. The two examples (service account, jump host) are general. |
| note 001 / Lessons | Correlation is a context problem before it is a scoring problem. A conclusion without its evidence can only be trusted, not reviewed. Help with reading evidence is not help with accountability. The analyst still owns the response. | Derived. Positions, not facts. Confirm they are yours. |
| note 001 / Lessons | Detection quality has two sides. Designing and optimizing SIEM correlation rules is as much about cutting false positives as about catching more. | FACTS section A: design and optimize SIEM correlation rules to improve detection accuracy and reduce false positives. Restated in the first person. |
| note 002 (evidence-boundaries-for-autonomous-security) / meta | date: 2026-10-04. number: 2. tags: AI security, Agentic security, Zero trust, WITNESS, AEGIS. title: Why autonomous security systems need evidence boundaries. | The date 2026-10-04 is the authoring date, not a verified publication date. Set the real date in the note's meta block when you publish (FACTS section D, rule 4). The date appears on the notes list and the home page, in the Article JSON-LD (datePublished and dateModified), in article:published_time and as the sitemap lastmod. All three notes carry the same date on purpose, so the site does not show a publishing cadence you did not have. Same-day notes sort by number. The tags WITNESS and AEGIS match the system names so the case studies and the note can link to each other. Title and summary are editorial. |
| note 002 / Problem | SOC work already runs on this distinction. The description in an alert is a claim about a system. Before I contain anything, I look at the system. | First-person practice claim, not in FACTS. FACTS says only manage the full incident lifecycle (detection, triage, containment, eradication, remediation). That containment follows triage is derivable. looking at the system first is not stated. Confirm this is your practice, or delete. |
| note 002 / Problem | Plausible is what a language model is good at. Proof is a different property, and the model does not supply it by itself. | General reasoning about language models, derived from the WITNESS problem statement. Reworded from nothing in the model supplies it. |
| note 002 / Architecture | An evidence boundary between the agent side and the system side. Nothing the agent says carries authority. The environment feeds the checks directly, not through the agent. WITNESS is one design of this boundary, with four checks in a fixed order: Evidence, Corroboration, Policy and Validation. | Derived from the WITNESS trust boundaries. The order is the model in Check these first, item 2. The diagram is labelled a design sketch. |
| note 002 / Threat model | The premise is short. Anything an agent reads can be influenced, so anything it concludes from that input is a claim. An attacker can shape that input: telemetry, tickets, emails, web pages, file names. The agent can also be compromised, or simply mistaken. | General reasoning about agents. The examples are general. This section no longer repeats the WITNESS threat-actor list. It points to the case study instead. |
| note 002 / Threat model | Once an agent holds tools, prompt injection stops being only a content problem and becomes an access-control problem. | General reasoning. Same as research / agentic-security / notes[2]. |
| note 002 / Design | Four rules: trust per action, not per agent. Evidence has to be independent (could the agent have caused this observation). Claims have to be checkable. Fail closed, with three outcomes. | Derived positions, not facts. Rule 1 matches research / agentic-security / notes[1]. Rule 2 matches research / witness / notes[0]. Confirm they are yours. |
| note 002 / Design | A check can pass, fail or come back insufficient. Missing, stale or unavailable evidence is insufficient and escalates to a person. Contradicting or conflicting evidence is a fail and denies. Only a full set of passes allows. | Derived. Must match the WITNESS model (Check these first, item 2). The earlier version of this note sent conflicting evidence to escalate. It now denies, to agree with the case study. |
| note 002 / Design | Decision table: at least one check fails, deny. No check fails and at least one is insufficient, escalate to a person. Every check passes, allow. Labelled illustrative. | Derived. Same rule as the WITNESS decision node. The earlier table put Policy first and merged Evidence and Corroboration. It no longer does. |
| note 002 / Failure modes | Evidence that looked independent but was not. A stale allow. A boundary that is too strict (valid remediations get denied, which costs time rather than safety, and someone has to own the rule). A route around the boundary. | Derived design reasoning. The stale allow is the time-of-check to time-of-use case (Check these first, item 8). The too-strict row used to say escalate keeps the action alive, which contradicted the deny rule. |
| note 002 / Lessons | Escalation is an ordinary outcome in SOC work: I make risk-based escalation decisions with global teams. A system limited to allow and deny has no way to say not enough evidence. | FACTS section A: make risk-based escalation decisions with global teams. The second sentence is general reasoning. |
| note 002 / Lessons | The same premise runs through SecureModelGate and WITNESS: control sits outside the model, at the point where action happens. | Editorial synthesis. FACTS does not relate the three. Same as research / securemodelgate / notes[4]. Confirm or delete. |
| note 002 / Lessons | An evidence boundary is meant to contain the cost of a wrong agent. It is not a way to make the agent right. | Derived position, not a fact. Same idea as research / witness / notes[6], in different words. Confirm it is yours. |
| note 003 (deterministic-evidence-gate-for-remediation) / meta | date: 2026-10-04. number: 3. tags: WITNESS, AI security, Remediation. title: Why remediation agents need a deterministic evidence gate (shortened from the first version so it fits a search result). | The date 2026-10-04 is the authoring date, not a verified publication date. Set the real date in the note's meta block when you publish (FACTS section D, rule 4). The date appears on the notes list and the home page, in the Article JSON-LD (datePublished and dateModified), in article:published_time and as the sitemap lastmod. All three notes carry the same date on purpose, so the site does not show a publishing cadence you did not have. Same-day notes sort by number. The tag WITNESS matches the system name so the case study and the note can link to each other. Title and summary are editorial. This is the newest note by number, so it sorts first on the same date. |
| note 003 / Problem | The host is beaconing, so isolate it. A claim, an action and an unstated step between them. | Hypothetical example. Built from the WITNESS problem statement. Not a real incident. |
| note 003 / Problem | Two obvious fixes do not hold: ask a second model to check the first, or prompt the agent more carefully. | General reasoning. Same argument as witness decisions[0] and [6], in different words. Derived, not stated by you. |
| note 003 / Architecture | WITNESS runs four checks in a fixed order, each returning pass, fail or insufficient: Evidence (is there independently observable evidence for each claim), Corroboration (do separate sources agree with each other and with the claim), Policy (is this action permitted, and how much evidence does it need), Validation (a last check that the evidence supports this specific action). A single fail is a deny. Insufficient evidence with no fail goes to a person. Only a full set of passes is an allow. Execution happens after allow and re-validates the state. | Derived. Identical to the model in Check these first, items 1, 2 and 8, and to the case study nodes. Keep them in sync. |
| note 003 / Design | A proposal as JSON: action isolate_host, target host-a, one claim with an observable field. 203.0.113.7 is a documentation address. | Invented example of a data shape, labelled ILLUSTRATIVE on the page. The observable field is how the note argues that a claim must be checkable. Nothing says WITNESS uses this shape. Delete if you would rather not show a shape. |
| note 003 / Design | The decide() pseudocode: four results, any fail returns deny, any insufficient returns escalate, otherwise allow. Comment: no clock, no randomness, no model call. | Derived. It is the decision node of the case study written as code. The earlier version evaluated Policy first and merged Evidence and Corroboration. It now follows the canonical order. It is labelled pseudocode and ILLUSTRATIVE. The no clock, no randomness, no model call comment is a design property of a pure function, not a claim about an implementation. |
| note 003 / Design | Store the inputs and the policy version with each decision and every past decision becomes a test case. | Derived design advice. Extends witness threatModel.assets[3] (the record of each decision). FACTS does not say decisions are stored. |
| note 003 / Design | The design therefore re-validates the environment at execution time. | Design reasoning. Not in FACTS (Check these first, item 8). Links to the engineering decision on the case study. |
| note 003 / Failure modes | A check that is deterministically wrong. A stale allow. Escalation as a queue: if most proposals come back insufficient, the gate hands a person a backlog instead of a decision. | Derived design reasoning. The escalation-queue point is a new inference about a consequence of the three-result model. Delete if you would rather not raise it. |
| note 003 / Lessons | In incident response, containment follows triage. The gate asks an autonomous agent to keep that order. | Practice claim, now written without I. Derived from the FACTS lifecycle order (detection, triage, containment, eradication, remediation). The earlier text said I contain after triage, with evidence in hand, and with evidence in hand is not in FACTS. Confirm or delete. |
| note 003 / Lessons | Keeping claims and evidence apart is the cheapest step and the most important one. Three outcomes carry more information than two. Making the agent right is a separate job. The gate is meant to bound the cost of the agent being wrong. The open question is what counts as independent evidence. | Derived positions, not facts. They restate research / witness / notes[0], [4] and [6]. Confirm they are yours. |
| note 003 / Lessons | I am not claiming results or production use. | A disclaimer. Matches FACTS section C. |
| field notes / keep in sync | Notes 002 and 003 and the research page restate the WITNESS check model (order, results, decision rule, stale-allow rule). Note 001 restates the SignalFusion Core analyst step. | If you change the answer to Check these first items 2, 3, 4 or 8, edit the case study first, then the lines named in those items. The unit tests check the check order, that no edge bypasses the Analyst, and that the dates match, but they do not read the prose. |

## Site-wide editorial choices

Action: confirm, or change in `content/projects/index.ts`.

| Where | Statement | Basis |
| --- | --- | --- |
| projects / ordering | SignalFusion Core, then WITNESS (tier 1). AEGIS, HELIOS, Voltrix (tier 2). DESAS (tier 3). | Tiers are as you gave them. The order inside a tier is editorial. Swap the array order in content/projects/index.ts. |
| projects / links | Every project has links: {}. | FACTS: no repo URL is known for any of the six systems. None is shown. |
| projects / status | Only WITNESS has a status, Research / Prototype. | FACTS gives no status for the other five. None is invented. |
| projects and research / metaDescription | Each system and each research item has a metaDescription of at most 155 characters, one complete sentence. | Editorial. The page text and the search snippet are written separately, so a snippet is never cut mid-clause. Each restates your description. |
| projects / summary | The 30-second summary of WITNESS, SignalFusion Core and AEGIS says why the system matters. Voltrix and DESAS keep a short factual summary. | FACTS has no reason-it-matters for Voltrix or DESAS, so none is written. |

## What to supply to improve the site

Each item is something the site cannot say today because FACTS has no answer. Send any of these and the matching rows above can be firmed up or removed.

**Per system (WITNESS, SignalFusion Core, AEGIS, HELIOS, Voltrix, DESAS)**

- A repository link, if one is public. No project shows a code link today.
- A status you are comfortable stating (for example prototype, in use, archived). Only WITNESS has one.
- A paper, write-up or talk link, if one exists. Research items link to nothing today.
- The real stages of the pipeline, if different from the flows drawn here.

**WITNESS**

- What the Validation check does.
- Whether the four checks run in sequence or in parallel, and in what order, and what each check returns (the site says pass, fail or insufficient).
- What turns the check results into an outcome (the site says any fail is deny, all pass is allow, insufficient evidence is escalate).
- Where an escalated action goes (the site says to a person).
- Whether an allow is re-validated against the environment when the action executes.
- A stack, if you want one listed.

**SignalFusion Core**

- Whether a person reviews findings before a response runs.
- Where ATT&CK modeling sits in the pipeline.
- What the response stage does.
- What Elasticsearch is used for, so it can be placed in the diagram.

**Voltrix, DESAS**

- One paragraph each on what the system does. They are one line today. With enough detail an architecture diagram can be added.

**Field notes**

- The real publication date of each note.
- Whether the first-person statements about how you triage, contain and escalate are accurate.

**Numbers**

- Any metric you are comfortable publishing, with its source and date. The site shows none today. For example, alert volume handled, rule count, detection coverage, or the size of a dataset. Each needs a statement of what was measured and where.

**Career and credentials**

- What you built at Facilio, if you want it shown (only the stack and the company are described now).
- Months for the Facilio dates.
- Exact titles for the two Fortinet badges.
- Years for the certifications that have none.
- A link for the two Proofpoint certifications, if one exists.
- A link for Sentinel AI, and a line for each name-only earlier project.

**Skills**

- Which of the six AI security depth names you want to keep.

<!-- prettier-ignore-end -->


## Research, Oct 2026

Research is published as names only (docs/FACTS.md section A2). There is no abstract, note or description on the site or in the repository, so there is nothing to review here.

## Systems and research, Oct 2026

Systems are published as cards (a name, one line, domains) and research as names only. How they work is not published: there is no case study, architecture, threat model, abstract or notes on the site, in the repository or in the assistant. WITNESS, SecureModelGate and SilentStorm are research and appear only under Research. ARGUS is merged into HELIOS. Voltrix, AEGIS, AEGIS-AI and AEGIS-DFIR were removed. The site brand is "DS / TRACE" (Threat, Response, Automation, Cloud, Evidence), renamed from "DS / HELIOS". Confirm the brand, or give me another name.
