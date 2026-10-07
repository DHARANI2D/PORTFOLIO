# FACTS — source of truth for all portfolio copy

Everything on the site must be traceable to this file. If a fact is not here, **do not state it**.
When in doubt, leave it out or write the sentence so it only claims what is listed below.

## A. Verified (from the owner's live site or the owner's own messages)

**Identity**

- Name: Dharanidharan Senthilkumar. Goes by "Dharani". GitHub: `DHARANI2D`.
- Based in India (state only "India"). Open to global roles.
- Email: dharanidharan2d@gmail.com · LinkedIn: https://www.linkedin.com/in/dharanidharan-senthilkumar-b4244b232/ · GitHub: https://github.com/DHARANI2D · Hashnode: https://dharani2d.hashnode.dev/
- Resume (PDF download): https://drive.google.com/uc?export=download&id=1D60aoGGH331ehux7CgAmwazP0CVfHhEk
- Avatar: a stylised illustrated portrait (`/helios-avatar.webp`). Not a realistic photo. Used small, on About only.
- Education: B.E. Computer Science & Engineering, Sri Krishna College of Engineering & Technology (Anna University), 2021–2025, CGPA 8.5/10.

**Experience**

- HPE (Hewlett Packard Enterprise) — current. Sep 2025 – present. SOC Analyst, Cybersecurity Design & Engineering. Previously "Cybersecurity Analyst — SOC & Cyber Defense".
  - Triage 100+ daily security alerts in an enterprise SOC and cyber defense environment, improving incident response efficiency and reducing alert backlog.
  - Manage the full incident lifecycle (detection, triage, containment, eradication, remediation) and perform root cause analysis for phishing, malware, account compromise and lateral movement.
  - Map threats to MITRE ATT&CK; design and optimize SIEM correlation rules to improve detection accuracy and reduce false positives.
  - Build Python automation workflows; apply AI-driven anomaly detection to improve alert prioritization and reduce noise.
  - Build log analysis pipelines across Linux systems; support investigations across endpoint, cloud, identity and email.
  - Remediate cloud misconfigurations across AWS and Azure; implement IAM controls including RBAC, MFA and zero-trust architecture.
  - Design dashboards and alert pipelines for security visibility; make risk-based escalation decisions with global teams.
- HPE — Cybersecurity Analyst Intern, Feb 2025 – Aug 2025.
  - Monitored and analyzed alerts across SIEM and endpoint tools; supported continuous threat detection and SOC operations.
  - Assisted in triage and investigation of phishing and malware alerts using Splunk and CrowdStrike.
  - Contributed to incident response playbooks; hands-on experience with Wiz and Azure.
- Facilio — Member of Technical Staff (Intern), 2024. **No other details are known. Do not describe the work.**

**Tools / skills the owner lists**

- Detection / platforms: Splunk, CrowdStrike, Proofpoint, Zscaler, Wiz, threat intelligence platforms.
- Security engineering: SIEM, SOAR, detection engineering, incident response, threat intelligence, malware analysis, DFIR, security automation, threat hunting, alert correlation, root cause analysis.
- Cloud: AWS, Azure, IAM, RBAC, MFA, SSO, cloud security, infrastructure security, DevSecOps, zero-trust architecture.
- AI security: AI security, LLM security, agent security, AI governance, adversarial AI, prompt-injection defense, LLM-based security analysis, anomaly detection, behavioral analytics, AI security controls.
- Engineering: Python, C++, Java, TypeScript, React, Next.js, Spring Boot, Docker, Terraform, Jenkins, MySQL, PostgreSQL, SQL, Bash, Go (basics).
- Frameworks: MITRE ATT&CK, detection pipelines, security observability, policy-as-code (concepts).

**Certifications (earned, shown on the owner's current site)**

- Proofpoint AI Data Security Specialist (2025) — no public link
- Proofpoint AI Email Security Specialist (2025) — no public link
- AWS Certified Cloud Practitioner — https://www.credly.com/badges/cc8bf7c0-904d-4c17-b65c-68e85343e29e/public_url
- Microsoft Azure Fundamentals (AZ-900) — https://learn.microsoft.com/en-us/users/dharanidharansenthilkumar-6756/credentials/aad1a5408e695541
- Fortinet NSE 1 Network Security Associate/Fundamental — https://www.credly.com/badges/65f7a98e-7448-4cbe-a487-415b581e9d74/public_url
- Fortinet NSE 2 Associate — https://www.credly.com/badges/3b954dc3-8ae3-4e40-bbac-0d17da9f71fc/public_url
- TigerGraph Associate — https://drive.google.com/file/d/1_sxQoQdSRJzYMeLQkDwJGYQMjtfoWGEH/view?usp=sharing
- Years are only known for the two Proofpoint certs (2025). **Never invent other years.**
- Planned / next (owner's stated direction, NOT earned): AWS Solutions Architect; security-focused certifications; AI security specialization. Show as "planned"/"in progress", never as completed.

**Systems (owner's own descriptions)**

- **WITNESS** — Deterministic AI remediation admission gate. A deterministic admission-control layer for autonomous security and AIOps agents that verifies whether the real environment corroborates an agent's proposed remediation before it executes. Problem: autonomous agents can generate plausible remediation actions without sufficient evidence that their causal claims are true. Approach: separate what an agent _claims_ from what independently observable system state can _prove_, using deterministic evidence checks before allowing high-impact actions. Impact: moves autonomous security from "the AI thinks this is the problem" to "the environment provides sufficient evidence for this specific action." Checks named by owner: Evidence, Corroboration, Policy, Validation (also Risk and Environment State in the earlier plan). Outcome: allow / deny / escalate. Status: Research / Prototype. Domain: AI Security · AIOps · Detection · Agentic security · Zero trust. Flagship (tier 1).
- **SignalFusion Core** — Threat signal correlation and SOC orchestration with AI-assisted investigation. Normalizes telemetry across endpoint, cloud and identity systems, correlates entities across time, models attacker behavior with MITRE ATT&CK to surface multi-stage and lateral-movement attacks. Problem: SOCs see thousands of independent signals while real attacks unfold as sequences across identities, endpoints, applications and cloud infrastructure. Approach: correlate signals into behavioral relationships rather than isolated events. Impact: better signal-to-noise; disconnected alerts become contextual investigations. Inputs: SIEM / IDS / EDR / threat intel. Pipeline: correlation engine → AI investigation → response. Stack named: Python · Elasticsearch · SIEM · AI. Flagship (tier 1).
- **AEGIS** — AI Enforcement & Governance Infrastructure. Zero-trust control plane for AI agents: identity validation, intent-aware authorization, policy-based access control, semantic controls against prompt injection and AI misuse; explicit trust boundaries around autonomous systems. Tier 2.
- **ARGUS** — Agentic autonomous malware analysis. Domain: DFIR · Malware · AI. Tier 2. (No further details known.)
- **Voltrix** — AI-driven incident response platform. Domain: DFIR · Agents · Automation. Tier 2. (No further details known.)
- **DESAS** — Dynamic Email Sandbox Analysis System. Tier 3. (No further details known.)
- **SecureModelGate** — Runtime security enforcement for AI systems: a security enforcement architecture controlling AI model and agent interactions through deterministic policy, trust boundaries and runtime verification; AI security as an enforcement problem, not only a safety discussion. Domain: AI security · policy · trust. Research item.
- **Sentinel AI** (Node.js, TypeScript, React) — detects phishing, scams and malicious URLs by combining rule-based detection with LLM-driven reasoning; real-time threat monitoring. (Earlier/supporting work.)
- **AI DFIR** and **Agentic Security** — research directions only (agentic incident-response architecture; autonomous security agents / trustworthy AI remediation). No papers published.

**Earlier work** (academic / supporting)

- Ransomware Detection and Prevention — Python, behavioral analysis; monitors file-system activity and halts encryption processes on ransomware-like behavior. https://github.com/DHARANI2D/ransomware_detection
- Deep Fake Detection — ML; audio/video spectral analysis. https://github.com/DHARANI2D/Deep_Fake_Detection
- Structured Terraform — Terraform, AWS, Kubernetes; modular, environment-specific configuration, secure state. https://github.com/DHARANI2D/terraform-aws
- QuantCrypt — AWS S3 with quantum-resistant algorithms and secure key management. https://github.com/DHARANI2D/quantum-crypt-encryption
- Named only (no description known; never describe): Health Predictor, Grade Predictor, Celebria, BADAD, Accounting App.

**Writing (Hashnode)**: "Exploring the Future of Blockchain in the Age of Quantum Computing"; "Safeguarding the Future: Quantum Cryptography Unveiled"; "Quantum Odyssey: Unraveling the Mysteries of Tomorrow's Computing" — all via https://dharani2d.hashnode.dev/

## B. Owner-provided direction (treat as intent, use as stated)

- Positioning: "Security Engineer building detection, correlation, and AI security systems from first principles." Themes: DEFEND (SOC, IR, detection, SIEM/SOAR, cloud), BUILD (systems), RESEARCH (AI security, autonomous agents, trustworthy AI remediation).
- Career narrative: software engineering → security → SOC → detection engineering → cloud security → AI security → autonomous security systems.
- Outside security: "Tennis · systems · self-hosting · experimentation" (one small line on About; nothing more).
- Brand: "DS / HELIOS". Helios = observation → illumination → visibility.
- Availability line: "AVAILABLE FOR SECURITY ENGINEERING".

## C. NOT known — never state

- Any metric, count, latency, accuracy, uptime, star count, user count or benchmark for any system.
- Repo URLs for WITNESS, SignalFusion, AEGIS, ARGUS, Voltrix, DESAS, SecureModelGate (omit GitHub links for them).
- Papers, publications, talks, awards, "production" deployments, employers' internal details, customers.
- Why a specific language/tool was chosen for a specific project, unless it follows directly from the descriptions above.
- Exact dates other than those listed. City-level location.

## D. Inference rule for deeper case-study content

Threat models, "engineering decisions", failure modes and security considerations for the systems are **derived by reasoning from the owner's descriptions above** (what a system of that design must defend against). They are drafts for the owner to confirm. Rules:

1. Derive only from what the system is described to do. Never claim an implementation detail ("uses X database", "runs on Y") that is not in section A.
2. Phrase design reasoning as design intent ("The gate is deterministic so the decision can be replayed and audited"), not as measured results.
3. Every inferred statement must be listed in `CONTENT_REVIEW.md` (project → statement) so the owner can verify or delete it.
4. Field-note publication dates are the authoring date (2026-10-04); the owner sets the real date on publication.
