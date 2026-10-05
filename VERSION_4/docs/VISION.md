# VISION — what this site must be (checklist for review)

> "A quiet, sophisticated security engineering lab." Minimal at first glance, deep when explored.
> Not a developer-portfolio cliché. It should say: _this person builds security systems_.

## Positioning

- Security Engineer building detection, correlation and AI security systems from first principles.
- Themes: DEFEND (SOC, IR, detection, cloud), BUILD (systems), RESEARCH (AI security, autonomous agents).
- Mental model: Identity → Signal → Systems → Experience → Research → Knowledge → Contact.
- Career narrative: software engineering → security → SOC → detection engineering → cloud → AI security → autonomous security systems.
- Flagship hierarchy: WITNESS + SignalFusion Core (+ Helios identity) carry the site. Tier 2: ARGUS, Voltrix, AEGIS. Tier 3: DESAS. Academic work lives under "Earlier work". Do not give every project equal weight.

## Information architecture

Nav: `DS / HELIOS` · WORK · SYSTEMS · RESEARCH · WRITING · ABOUT · RESUME, plus a tasteful status line ("● AVAILABLE FOR SECURITY ENGINEERING").
Routes: `/`, `/about`, `/systems` (+ one page per system), `/experience`, `/research` (+ items), `/writing` (+ notes), `/certifications`, `/resume`, `/contact`, `/privacy`, `/.well-known/security.txt`.
Home order: hero → 01 SIGNAL → 02 SYSTEMS ("Systems, not demos.") → 03 EXPERIENCE → 04 RESEARCH → 05 STACK → 06 FIELD NOTES → 07 CONTACT ("Let's build something secure.") → footer ("SYSTEM STATUS ● OPERATIONAL").

## Hero

- Eyebrow `SECURITY ENGINEER · DETECTION · AI SECURITY`; headline "Building security systems that can see, reason, and respond."; support line; four proof labels; CTAs EXPLORE SYSTEMS / VIEW RESUME.
- NOT "Hi, I'm X". Small calm "Helios Security Core" visual (DETECT → CORRELATE → INVESTIGATE → RESPOND), optional occasional boot console. Not a hacker terminal.

## Visual language

- Dark default, light excellent. Off-black / near-white, thin 1px borders, generous whitespace, small mono labels, large sans headlines, accent (violet) used sparingly.
- Geist Sans + Geist Mono. Section numbering "01 / SYSTEMS" in mono. 1200–1280px container, 12-col desktop / 4-col mobile, spacing scale 8·12·16·24·32·48·64·96·128.
- Borders create structure, not shadows. Subtle motion only: opacity + 8–16px, card hover −3px, path drawing, signal flow, count-up. Respect `prefers-reduced-motion`.
- DO NOT: neon/cyberpunk, matrix rain, shield illustrations, glassmorphism, 3D globe, 30 logos, skill percentage bars, fake GitHub stats, fake uptime/metrics, generic AI buzzwords, equal-weight projects, custom cursor that harms usability.
- One signature visual: the ambient **security graph** (SOC, DETECTION, CLOUD, AI, DFIR, AGENTS, AUTOMATION) whose nodes activate with the section/page being viewed.

## Systems / case studies

- Cards look like system components (name, tagline, mini flow diagram, stack, "CASE STUDY →"), not image cards.
- Each system has its own page: hero (status/domain), overview, problem, **threat model** (assets, attack surface, trust boundaries, threat actors, assumptions, failure modes, controls), **interactive architecture diagram** (hover/focus node → INPUT / PROCESS / OUTPUT / TRUST BOUNDARY), **engineering decisions** ("Why …?"), security considerations, links only if real.
- Three layers of information everywhere: 3 seconds (what), 30 seconds (why it matters), 5 minutes (how it works).
- Card diagram morphs into the page diagram via View Transitions where supported.

## Other features

- Recruiter / Engineer view toggle ("VIEW AS"): same content, different depth. Recruiter: current role, experience, flagship systems, skills, certifications, resume, contact. Engineer: architecture, research, threat models, notes, GitHub.
- Command palette (⌘K / Ctrl K) searching pages, systems, research, writing, skills, experience; actions (theme, view, terminal, system overview). Keyboard sequences `g h`, `g s`, `g r`, `g w`, `g c`… not advertised heavily.
- Hidden terminal easter egg: help, about, experience, projects, skills, research, contact, resume, status, matrix (text table of domains, not rain).
- Skills as categories with depth drill-down; no clouds or bars.
- Certifications: VERIFIED vs NEXT/PLANNED, never present unearned certs as complete.
- Research: "Ideas I am turning into systems." Writing: "Field Notes" documentation-style MDX with problem / architecture / threat model / design / failure modes / lessons.
- Resume page: on-page preview + download. Contact: direct, minimal public information, no tracking.
- Metrics panel only from real content counts.

## Engineering quality bars

- Static export, Server Components by default, minimal client JS. LCP < 2.0 s, CLS ≈ 0, excellent INP.
- WCAG 2.2 AA: keyboard, visible focus, semantic HTML, reduced motion, contrast, labelled controls, accessible dialogs/palette.
- Security of the site itself: hash-based CSP (no `unsafe-inline` for scripts), HSTS, nosniff, Referrer-Policy, Permissions-Policy, no third-party scripts/CDN/analytics, `security.txt`, honest privacy page.
- SEO: titles, descriptions, canonical, OpenGraph/Twitter, JSON-LD (Person, WebSite, Article, SoftwareSourceCode), sitemap, robots, manifest, OG image without a face.
- Content lives in typed data + MDX, validated at build; repo tidy with tests (Vitest + Playwright) and CI.
