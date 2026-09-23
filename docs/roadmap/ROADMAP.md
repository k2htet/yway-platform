# Yway Production V1 Roadmap

## Purpose and Authority

This roadmap records Yway's directional journey toward Production V1 at the
outcome level. It may evolve as the project learns. Roadmap items are not product
requirements and must not be used to invent or settle unresolved product,
architecture, or technology decisions.

The canonical authority order remains:

1. `docs/product/PRODUCT_VISION.md` — highest product authority.
2. `docs/product/PRODUCT_CONTRACTS.md` — stable product contract layer.
3. `docs/architecture/ARCHITECTURE.md` — logical domain boundaries and
   architectural invariants.
4. ACCEPTED decision records.
5. ExecPlans.
6. Build Report — advisory only.

`ROADMAP.md` is a directional planning and navigation document. It does not
override any canonical authority above and may evolve as evidence emerges. If
roadmap wording conflicts with a higher-authority source, the roadmap must be
corrected. Detailed executable work belongs in ExecPlans and GitHub Issues.

## Planning Policy

| Horizon              | Planning resolution      |
| -------------------- | ------------------------ |
| 12 months            | Outcomes                 |
| 3 months             | Stage-level planning     |
| 4–6 weeks            | Detailed planning        |
| 1–2 weeks            | Executable GitHub Issues |
| Current complex work | ExecPlan                 |

Chat history is not a project source of truth.

Important decisions discovered in chat must be promoted into the appropriate
durable source:

- Product Vision or Product Contracts, when appropriate and with the required
  authority
- decision records
- architecture documentation
- this roadmap
- ExecPlans
- GitHub Issues

## Status Policy

- `COMPLETE`: the documented exit gate has been evidenced.
- `ACTIVE`: work is currently underway.
- `NEXT`: the next stage expected to enter stage-level planning.
- `PLANNED`: direction is recorded, but the stage is not active or next.
- `BLOCKED`: the stage cannot make meaningful progress until a stated dependency
  changes.

Statuses reflect current repository evidence, not aspiration. See
`STAGE-INDEX.md` for the compact status view.

## Stage 0 — Agentic Engineering Foundation

- **Purpose:** Establish a reliable repository, agent workflow, governance
  documents, and verification foundation without implementing product features.
- **Outcome:** Fresh Codex and OpenCode sessions can discover authority, work
  safely, record decisions, and run the repository's checks consistently.
- **Major dependencies:** Product Vision and the established Stage 0 repository,
  governance, verification, and protected-branch foundation.
- **Major product-contract areas:** All product contracts as engineering
  guardrails, especially YWAY-P004–P007, YWAY-P014–P019, YWAY-P022, and
  YWAY-E001–E006.
- **Exit gate:** Every Stage 0 completion criterion in the completed ExecPlan is
  evidenced, including enforced branch protection, onboarding documentation,
  and the fresh-session acceptance test.
- **Status:** COMPLETE.
- **Important unresolved questions:** Stage 0 and Stage 1 are complete. Stage 2 is ACTIVE under issue #32; Stage 3 remains PLANNED.

## Stage 1 — Product Contracts + Domain Architecture Refinement

- **Purpose:** Refine product contracts and logical domain boundaries where
  implementation needs greater precision, while preserving product authority.
- **Outcome:** Near-term product behavior and domain responsibilities are clear
  enough to support bounded implementation planning without silently resolving
  open product questions.
- **Major dependencies:** Stage 0 governance, decision discipline, and
  verification foundation.
- **Major product-contract areas:** YWAY-P001–P030 and YWAY-E001–E006, with
  focused refinement only where Product Vision supports it.
- **Exit gate:** Required refinements are internally consistent, unresolved
  decisions remain explicit, and significant implementation choices have
  appropriately reviewed decision records.
- **Status:** COMPLETE.
- **Completed ExecPlan:** `docs/exec-plans/completed/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md`.
- **Important unresolved questions:** Deferred architecture questions remain open unless separately decided; the first physical application boundary and future product technology choices are not selected. Stage 2 is ACTIVE under issue #32.

## Stage 2 — Content System + Operations Foundation

- **Purpose:** Establish the governed content and operational capabilities needed
  to produce safe, provenance-preserving Career Experience Packs.
- **Outcome:** Content can move through a defined lifecycle with provenance,
  practitioner review, versioning, release eligibility, and operational control
  intact.
- **Major dependencies:** Stage 1 contract and domain refinement; Content,
  Practitioner, and Operations/Safeguarding boundary clarity.
- **Major product-contract areas:** YWAY-P002, YWAY-P019, YWAY-P020, YWAY-P023,
  YWAY-P024, and YWAY-E005.
- **Exit gate:** A representative pack can pass the governed content lifecycle
  with its provenance and review eligibility demonstrably preserved.
- **Status:** ACTIVE.
- **Active ExecPlan:** `docs/exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md`.
- **Kickoff:** Issue #32 provides explicit owner activation authority and the bounded Stage 2 direction.
- **Accepted decision and next step:** YWAY-D003 governs the bounded repository-native Stage 2 content pipeline; S2-01 through S2-03 are complete and S2-04 is next.
- **Important unresolved questions:** Production CMS/database/auth/UI, artifact distribution, trusted-root acquisition, and Stage 3 delivery choices remain deferred.

## Stage 3 — Youth Exploration

- **Purpose:** Deliver the core youth-first experience of trying realistic work,
  reflecting, and choosing a reversible next direction before commitment.
- **Outcome:** A young person can receive first career value without mandatory
  login and complete a meaningful, guided career experiment using eligible
  content.
- **Major dependencies:** Stage 2 governed content supply; Stage 1 youth/content
  boundaries; an accepted delivery approach when implementation requires it.
- **Major product-contract areas:** YWAY-P001–P006, YWAY-P010–P013, YWAY-P019,
  YWAY-P022–P025, YWAY-P028, and YWAY-E006.
- **Exit gate:** The core exploration journey works end to end with qualitative,
  reversible guidance, correct signal separation, no prohibited scoring, and no
  login before first value.
- **Status:** PLANNED.
- **Important unresolved questions:** Mobile delivery approach, first physical
  application boundary, detailed anonymous-to-identified continuity, and partial
  pack download strategy remain undecided.

## Stage 4 — Practice + Evidence

- **Purpose:** Extend exploration into practice and a private evidence experience
  without conflating evidence levels or overstating what completion proves.
- **Outcome:** Youth can practice, improve, and organize correctly labeled,
  provenance-preserving evidence in a private portfolio.
- **Major dependencies:** Stage 3 exploration semantics and interactions; Stage 1
  Evidence domain refinement; governed content from Stage 2.
- **Major product-contract areas:** YWAY-P007–P009, YWAY-P014, YWAY-P022,
  YWAY-P024, YWAY-P025, YWAY-P028, and YWAY-E002.
- **Exit gate:** Exploration signals, practice evidence, verified assessment
  evidence, user-added work, and Employer Quest work remain distinguishable, and
  no public portfolio or silent evidence promotion exists.
- **Status:** PLANNED.
- **Important unresolved questions:** Physical evidence representation and
  lifecycle mechanisms remain undecided; no verified assessment process may be
  inferred before it is separately approved.

## Stage 5 — Offline + Synchronization

- **Purpose:** Make supported youth exploration and practice resilient to
  intermittent connectivity while preserving locally created work.
- **Outcome:** Supported youth work remains usable offline and synchronizes
  without silent loss or semantic corruption.
- **Major dependencies:** Stage 3 and Stage 4 state and evidence semantics;
  representative connectivity and conflict scenarios.
- **Major product-contract areas:** YWAY-P007–P009, YWAY-P022, YWAY-P024, and
  YWAY-E002.
- **Exit gate:** Validated offline and synchronization scenarios demonstrate that
  supported local youth work and provenance survive interruption, retry, and
  relevant conflicts.
- **Status:** PLANNED.
- **Important unresolved questions:** Local and remote authority by data type,
  conflict-resolution policy, offline scope beyond exploration and practice, and
  synchronization technology remain undecided.

## Stage 6 — Identity + Consent + Sharing

- **Purpose:** Add identity, authorization, private portfolio access, and explicit
  purpose-specific sharing without weakening anonymous first value.
- **Outcome:** Users can move into protected, auditable identity and sharing flows
  while controlling what is shared, with whom, for what purpose, and when.
- **Major dependencies:** Stage 3 anonymous first-value journey; Stage 4 private
  evidence semantics; Stage 5 continuity and synchronization constraints.
- **Major product-contract areas:** YWAY-P011–P016, YWAY-P018, YWAY-P026,
  YWAY-P030, and YWAY-E001, YWAY-E003, YWAY-E004.
- **Exit gate:** Authorization is enforced outside UI-only hiding, portfolios have
  no public URL, and each supported sharing purpose has explicit, inspectable,
  auditable consent.
- **Status:** PLANNED.
- **Important unresolved questions:** Authentication approach, authorization
  enforcement architecture, consent/audit persistence model, and
  anonymous-to-account data ownership remain undecided; any 16–17 pathway stays
  outside scope until separately reviewed.

## Stage 7 — Practitioner System

- **Purpose:** Support qualified practitioners in governed review and structured
  youth learning experiences without turning payment or participation into
  certification.
- **Outcome:** Practitioner identities and workflows can contribute trustworthy
  content review and scoped experiences while keeping provenance and product
  boundaries explicit.
- **Major dependencies:** Stage 2 content operations; Stage 6 identity,
  authorization, and scoped sharing foundations.
- **Major product-contract areas:** YWAY-P007–P009, YWAY-P019, YWAY-P027,
  YWAY-P029, and YWAY-E001, YWAY-E002, YWAY-E005.
- **Exit gate:** Practitioner review and contribution flows preserve qualification
  context, provenance, access boundaries, and the rule that payment cannot buy
  outcomes.
- **Status:** PLANNED.
- **Important unresolved questions:** Practitioner qualification, vetting,
  compensation, review accountability, and detailed experience formats require
  later definition within existing contracts.

## Stage 8 — Employer Quest System

- **Purpose:** Introduce vetted, reviewed Employer Quests as real-world challenges
  that remain distinct from exploration and employment applications.
- **Outcome:** Youth can engage with and explicitly submit work to an Employer
  Quest without becoming a candidate or exposing unrelated private data.
- **Major dependencies:** Stage 4 evidence separation; Stage 6 consent and employer
  isolation; Stage 7 governed review capabilities.
- **Major product-contract areas:** YWAY-P010, YWAY-P015–P020, YWAY-P027,
  YWAY-P030, and YWAY-E001, YWAY-E003–E005.
- **Exit gate:** Quest creation, review, participation, and submission preserve
  explicit consent, provenance, employer isolation, sponsorship boundaries, and
  non-candidate status.
- **Status:** PLANNED.
- **Important unresolved questions:** Employer vetting, Quest eligibility and
  review operations, submission scope, feedback rules, and physical employer
  access paths remain undecided.

## Stage 9 — Opportunity + Application System

- **Purpose:** Enable voluntary access to trusted opportunities and clearly
  separate employment applications from exploration and Quest activity.
- **Outcome:** A young person can deliberately apply to a real opportunity with a
  distinct consent action and a bounded, inspectable evidence submission.
- **Major dependencies:** Stage 6 purpose-specific consent and authorization;
  Stage 8 employer boundaries; trusted opportunity operations.
- **Major product-contract areas:** YWAY-P009, YWAY-P015–P018, YWAY-P021,
  YWAY-P026, YWAY-P027, YWAY-P030, and YWAY-E001, YWAY-E003, YWAY-E004.
- **Exit gate:** Only explicit application creates candidate status; selectively
  shared portfolio evidence remains limited to the explicitly authorized sharing
  scope and preserves its required provenance, including origin, creation
  context, and evidence level; recruitment fees and automatic applications are
  absent. Authorized sharing does not satisfy the gate if provenance is stripped
  or collapsed.
- **Status:** PLANNED.
- **Important unresolved questions:** Opportunity vetting, application lifecycle,
  withdrawal and retention behavior, scoped communication workflows, and
  employer operational controls require later definition.

## Stage 10 — Cross-Surface Integration

- **Purpose:** Make youth, content, practitioner, employer, consent, identity, and
  operations capabilities work as one coherent system without erasing domain
  boundaries.
- **Outcome:** Supported journeys cross surfaces reliably while preserving domain
  ownership, authorization, evidence semantics, provenance, and consent.
- **Major dependencies:** Stage 2 through Stage 9 capability outcomes and validated
  cross-domain contracts.
- **Major product-contract areas:** Cross-cutting application of YWAY-P001–P030
  and YWAY-E001–E006, especially evidence, consent, employer isolation, and
  provenance boundaries.
- **Exit gate:** End-to-end cross-surface scenarios pass without forbidden access
  paths, implicit candidate creation, evidence conflation, or loss of consent and
  provenance context.
- **Status:** PLANNED.
- **Important unresolved questions:** Physical app, package, service, API, and
  data-ownership boundaries remain subject to validated architecture decisions;
  logical domains do not decide their mapping.

## Stage 11 — Localization + Accessibility Hardening

- **Purpose:** Harden the complete experience for natural Burmese use, Myanmar
  context, accessibility needs, and supported device conditions.
- **Outcome:** Launch content and critical journeys are comprehensible in natural
  Burmese and usable across required accessibility modes and Android layouts.
- **Major dependencies:** Stable representative journeys from Stage 3 through
  Stage 10; fluent Burmese reviewers and target-user validation access.
- **Major product-contract areas:** YWAY-P012, YWAY-P023, YWAY-P024, YWAY-P025,
  and YWAY-P028.
- **Exit gate:** Fluent Burmese review and target-user comprehension validation
  pass, and required accessibility behaviors pass across critical journeys.
- **Status:** PLANNED.
- **Important unresolved questions:** Validation methodology, acceptance
  thresholds, content review operations, device coverage, and remediation
  sequencing must be defined closer to execution without weakening release gates.

## Stage 12 — Security + Reliability + Observability

- **Purpose:** Demonstrate that privacy boundaries, authorization, data integrity,
  resilience, and operational visibility hold under production-like conditions.
- **Outcome:** The platform can detect, resist, diagnose, and recover from
  relevant failures without exposing private youth data or losing supported work.
- **Major dependencies:** Integrated system from Stage 10; hardened user journeys
  from Stage 11; defined operational risks and service expectations.
- **Major product-contract areas:** YWAY-P005–P009, YWAY-P014–P018, YWAY-P022,
  YWAY-P026, YWAY-P030, and YWAY-E001–E006.
- **Exit gate:** Risk-based security, privacy-boundary, recovery, reliability, and
  observability validation passes with no unresolved release-critical findings.
- **Status:** PLANNED.
- **Important unresolved questions:** Threat model detail, service objectives,
  hosting and security technologies, telemetry boundaries, retention policy, and
  incident thresholds remain to be decided through appropriate processes.

## Stage 13 — Production Operations

- **Purpose:** Establish the human and technical operating capability needed to
  run Yway safely and sustainably in production.
- **Outcome:** Release, support, content governance, safeguarding, incident
  response, access review, and recovery processes are owned and rehearsed.
- **Major dependencies:** Stage 12 reliability and observability capabilities;
  Stage 2, Stage 7, Stage 8, and Stage 9 operational workflows.
- **Major product-contract areas:** YWAY-P012, YWAY-P018–P021, YWAY-P023,
  YWAY-P024, YWAY-P026, YWAY-P027, YWAY-P029, and YWAY-E001, YWAY-E003–E005.
- **Exit gate:** Named owners can execute and evidence the required production,
  safeguarding, content, privacy, support, incident, and recovery procedures.
- **Status:** PLANNED.
- **Important unresolved questions:** Operating roles, support model, escalation
  paths, response targets, release authority, and production vendor choices
  remain to be established without changing product contracts.

## Stage 14 — Release Candidate

- **Purpose:** Freeze a candidate Production V1 scope long enough to validate the
  complete product and operating system against authoritative gates.
- **Outcome:** A traceable release candidate has passed required product,
  technical, content, localization, accessibility, privacy, and operational
  validation or has explicit release-blocking findings.
- **Major dependencies:** Exit outcomes from Stage 0 through Stage 13; an approved
  release-candidate scope and evidence set.
- **Major product-contract areas:** YWAY-P001–P030 and YWAY-E001–E006.
- **Exit gate:** Every Production V1 release criterion has current evidence, all
  release-critical issues are closed, and no open finding conflicts with Product
  Vision, Product Contracts, architecture, or ACCEPTED decisions.
- **Status:** PLANNED.
- **Important unresolved questions:** Exact candidate scope, evidence thresholds,
  rollout criteria, and release-blocker policy must be defined through nearer-term
  planning and approved authority.

## Stage 15 — Production V1

- **Purpose:** Release and operate the first production version of Yway as a
  youth-first career discovery and growth ecosystem.
- **Outcome:** Eligible users can complete the validated Production V1 journeys
  safely in the real operating environment, with monitoring and support active.
- **Major dependencies:** Stage 14 release-candidate approval; Stage 13 production
  readiness; current launch authority and operational ownership.
- **Major product-contract areas:** YWAY-P001–P030 and YWAY-E001–E006 as applicable
  to the approved Production V1 scope.
- **Exit gate:** Production V1 is released through the approved rollout, required
  controls and support remain operational, and initial production evidence shows
  no unresolved release-critical contract or safety breach.
- **Status:** PLANNED.
- **Important unresolved questions:** Launch scope details, rollout pacing,
  production learning priorities, and post-V1 sequencing remain future decisions;
  the roadmap does not settle them.
