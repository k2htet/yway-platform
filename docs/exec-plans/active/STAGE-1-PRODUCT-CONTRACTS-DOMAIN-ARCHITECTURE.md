# Stage 1 — Product Contracts + Domain Architecture Refinement

## Status

ACTIVE

Kickoff issue: #15

## Purpose and outcome

Stage 1 refines product contracts and logical domain boundaries where implementation needs greater precision, without weakening Product Vision or silently deciding open product, architecture, or technology questions.

The target outcome is that near-term product behavior and domain responsibilities are precise enough for bounded implementation planning, especially for Stages 2–4.

## Authority

Follow the repository authority order in `AGENTS.md`.

This ExecPlan is an execution artifact, not binding product or architecture authority.

- Product decisions must land in Product Vision or Product Contracts as appropriate.
- Architecture decisions must land in an ADR and/or `ARCHITECTURE.md` as appropriate.
- Notes in this plan's decision log do not become authoritative merely because they are recorded here.
- `PRODUCT_VISION.md` must not change without explicit owner instruction.

## Relevant Product Contracts

All direct contracts `YWAY-P001`–`YWAY-P030` and derived invariants `YWAY-E001`–`YWAY-E006` remain in force.

Focused refinement is expected around:

- `YWAY-P001`–`YWAY-P003`: career experiment meaning and structure
- `YWAY-P007`–`YWAY-P009`, `YWAY-E002`: evidence separation, provenance, and correction boundaries
- `YWAY-P011`: first value without mandatory login
- `YWAY-P013`: guided but non-rigid post-trial paths
- `YWAY-P019`, `YWAY-E005`: content provenance and practitioner review gate
- `YWAY-P014`–`YWAY-P018`, `YWAY-E001`, `YWAY-E003`, `YWAY-E004`: privacy, sharing, employer isolation, and access boundaries

## Current state

- Stage 0 is COMPLETE.
- A fresh post-remediation acceptance audit returned `READY_FOR_STAGE_1_KICKOFF`.
- Repository verification passed under supported Node 24 and pnpm 11.24.0.
- No product/application implementation exists.
- Stage 1 was `NEXT` before this kickoff.
- Stage 2 remains `PLANNED`.

## Target state

Stage 1 is complete only when near-term contract and logical-domain ambiguities are resolved, corrected, or explicitly deferred without adopting unapproved implementation choices.

## Scope

- Documentation and decision work only.
- Audit Product Vision-to-contract traceability for Stage 1 refinement candidates.
- Surface narrow product-owner decisions without deciding them implicitly.
- Refine Product Contracts only where supported by Product Vision or separately authorized owner intent.
- Refine logical domain responsibilities and collaboration boundaries.
- Review the Evidence logical-domain boundary through a technology-neutral ADR if warranted.
- Reconcile Architecture after approved contract/domain decisions.
- Keep all implementation and technology choices explicitly deferred unless a separately reviewed ADR accepts them.

## Non-goals

Do not:

- add application code, UI, schema, API, package, database, authentication, synchronization, CMS, or deployment implementation
- select mobile-native, hybrid, web, Expo/React Native, package/service boundaries, Turborepo, database/ORM, sync technology, auth provider, consent persistence, API protocol, hosting, storage, CMS, workflow engine, analytics, payment processing, or verified-assessment implementation
- start Stage 2
- implement a 16–17 pathway
- modify `PRODUCT_VISION.md` without separate explicit owner instruction

## Dependencies

- Stage 0 governance and verification foundation
- `AGENTS.md`
- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- ACCEPTED decisions
- `.agents/skills/yway-exec-plan/SKILL.md`
- protected `main` with required `Verify` CI

## GitHub issue map

| Step | Issue |
| --- | --- |
| S1-01 | #16 — Audit Product Vision-to-contract traceability |
| S1-02 | #17 — Clarify career experiment and anonymous-first-value semantics |
| S1-03 | #18 — Clarify provenance, practitioner review, and evidence presentation |
| S1-04 | #19 — Apply approved Product Contract refinements |
| S1-05 | #20 — Define logical domain responsibility and collaboration matrix |
| S1-06 | #21 — Decide Evidence logical-domain boundary |
| S1-07 | #22 — Reconcile Architecture and classify remaining questions |
| S1-08 | #23 — Validate and close Stage 1 |

## Classified decision register

### Contract clarification candidates

1. What constitutes a meaningful career experiment and a real next action? (`YWAY-P001`–`YWAY-P003`)
2. Is the six-part experiment structure governed per Pack, per trial, or per experiment within a Pack? (`YWAY-P002`)
3. Does anonymous first value require a short meaningful trial or completion of an entire Pack interaction? (`YWAY-P011`)
4. Are all four post-trial paths always required, or are they contextual permitted paths? (`YWAY-P013`)
5. RESOLVED by owner direction: AI-assisted, founder-reviewed, and practitioner-reviewed provenance are cumulative historical facts; any current review/release status is separate and must not erase history. (`YWAY-P019`, `YWAY-E005`)
6. RESOLVED by owner direction: differently labeled evidence categories may coexist in one Portfolio view when separation is explicit; category-specific viewing should also be supported. (`YWAY-P007`–`YWAY-P009`, `YWAY-E002`)

### Architecture clarification candidates

- Whether Evidence remains an independent logical domain or becomes a concern within Youth
- Content / Practitioner / Operations responsibility split for provenance, review, approval, and production eligibility
- Employer Quest work ownership across Evidence, Employer, and Consent/Sharing
- How content provenance becomes evidence provenance without losing origin or level
- Vendor-neutral collaboration boundaries for the near-term Youth–Content–Evidence path
- Privileged/Admin contexts without unrestricted access
- Classification of existing architecture questions as Stage 1, deferred, or future-ADR work

### Explicitly deferred implementation choices

- physical application boundary and delivery approach
- package/service layout and monorepo tooling
- database, ORM, schema library, local/remote persistence
- synchronization engine and conflict strategy
- authentication provider and concrete authorization mechanism
- consent/audit persistence model
- API protocol, hosting, deployment, storage
- CMS, Pack authoring format, workflow engine
- detailed practitioner operations
- partial downloads, analytics, payments, notifications
- 16–17 pathway
- verified-assessment implementation

## Ordered steps

### S1-01 — Vision-to-contract refinement audit

Create a durable evidence base for all later Stage 1 decisions.

- Trace proposed clarifications to exact Product Vision support.
- Classify findings as supported clarification, possible overstatement, architecture ambiguity, or deferred decision.
- Do not edit Product Contracts during the audit.

Validation: product-integrity review and exact source traceability.

### S1-02 — Career experiment and anonymous-first-value semantics

Clarify:

- Career Experience Pack vs realistic trial vs six-part career experiment
- "meaningful career experiment" and "real next action" primary-outcome terms
- anonymous first value within the existing age and safeguarding boundary
- post-trial path semantics

Owner decisions are required where Product Vision does not uniquely determine the answer. Existing
Product Contract wording that S1-01 classified as a possible overstatement must not be used to decide
whether owner direction is needed.

Validation: product-integrity review; exact Vision traceability; no unsupported expansion of Product
Vision.

### S1-03 — Provenance, practitioner-review, and evidence-presentation semantics

Clarify:

- provenance meaning and production eligibility
- practitioner-review boundary
- evidence presentation separation without introducing unsupported physical/presentation prohibitions

Validation: product-integrity and security/privacy review.

### S1-04 — Apply approved Product Contract refinements

Apply only Vision-supported or owner-authorized corrections.

- Preserve stable IDs.
- Do not invent new product intent.
- Do not treat ExecPlan notes as binding authority.

Validation: stable-ID audit, source traceability, product-integrity review, `pnpm verify:full`.

### S1-05 — Logical domain responsibility and collaboration matrix

Cover Youth, Content, Evidence, Practitioner, Operations/Safeguarding, Employer, Consent/Sharing, and Identity/Access.

Keep logical ownership distinct from package/service/schema choices.

Validation: architecture and security/privacy review.

### S1-06 — Evidence logical-domain boundary ADR

Draft a technology-neutral ADR evaluating Evidence as:

- an independent logical domain
- a concern within Youth

Cover provenance, correction, sharing, and Employer Quest implications.

Do not mark the ADR ACCEPTED without owner and architecture approval.

Validation: product-integrity, architecture, security/privacy, and test review.

### S1-07 — Reconcile Architecture and unresolved questions

Update Architecture only after relevant product/domain decisions are approved.

- remove contradictions
- keep implementation choices deferred
- classify remaining architecture questions by future stage / ADR need

Validation: authority-order audit, contract-to-architecture traceability, all four reviewer disciplines, `pnpm verify:full`.

### S1-08 — Validate and close Stage 1

Confirm exit criteria, record final verification/review evidence, update roadmap status, and move this ExecPlan to completed.

Do not activate Stage 2 as part of closure.

Validation: clean scope audit, `pnpm agent:doctor`, `pnpm verify:full`, and Yway PR review.

## Affected documents and logical domains

Likely documents:

- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/decisions/`
- this ExecPlan
- `docs/roadmap/ROADMAP.md`
- `docs/roadmap/STAGE-INDEX.md`

Logical domains in view:

- Youth
- Content
- Evidence
- Practitioner
- Operations/Safeguarding
- Employer
- Consent/Sharing
- Identity/Access

## Validation and review strategy

Use the repository's reviewer disciplines as appropriate:

- product-integrity
- architecture
- security/privacy
- test

Required repository checks at major integration points:

- `pnpm agent:doctor`
- `pnpm verify:fast`
- `pnpm verify:invariants`
- `pnpm verify:full`

Never claim a check passed unless it actually ran and passed.

## Cross-cutting implications

### Privacy/security

Stage 1 must preserve private portfolios, purpose-specific sharing, employer isolation, explicit candidate/application boundaries, and server/data-layer authorization outcomes without choosing a provider or physical enforcement mechanism.

### Offline

`YWAY-P022` remains binding. Stage 1 must not select sync authority, conflict-resolution, or storage technology.

### Localization/accessibility

`YWAY-P023` and `YWAY-P024` remain binding. Stage 1 may clarify semantics needed by later implementation but does not implement UI or content delivery.

## Risks

- Product clarification accidentally invents intent not present in Product Vision.
- Logical-domain discussion silently becomes package/service architecture.
- Evidence separation becomes an unsupported presentation ban.
- Provenance semantics overreach into Stage 2 operational workflow.
- ADRs are treated as accepted before owner review.
- Stage 1 drifts into technology selection or Stage 2 work.

## Unresolved questions

The classified decision register above remains unresolved until the corresponding issue produces reviewed evidence and, where necessary, explicit owner decisions or ADR status.

## Progress checklist

- [x] Stage 1 kickoff scaffold created
- [x] S1-01 Vision-to-contract refinement audit
- [ ] S1-02 Career experiment / Pack / anonymous-first-value / post-trial semantics — analysis
  complete; owner decisions pending
- [x] S1-03 Provenance / practitioner review / evidence presentation semantics — analysis and
  required owner decisions complete
- [ ] S1-04 Apply approved Product Contract refinements — approved S1-03 subset applied; S1-02
  owner decisions still block the remaining refinements
- [ ] S1-05 Logical domain responsibility/collaboration matrix
- [ ] S1-06 Evidence logical-domain boundary ADR
- [ ] S1-07 Reconcile Architecture and classify remaining questions
- [ ] S1-08 Validate and close Stage 1

## Discoveries log

- 2026-09-19: Fresh post-remediation acceptance audit returned `READY_FOR_STAGE_1_KICKOFF` with no findings and all required verification passing.
- 2026-09-19: S1-01 review found that the initial audit omitted registered contract and architecture candidates and traced the Pack/experiment ambiguity to provenance contract YWAY-P019 instead of experiment-structure contract YWAY-P002.
- 2026-09-19: The remediated S1-01 audit accounts for all six contract clarification candidates, all seven architecture clarification candidates, and every explicitly deferred implementation choice in this plan. `pnpm agent:doctor` and `pnpm verify:full` passed after the audit update.
- 2026-09-19: Product-integrity review identified one low-severity omission of YWAY-P005/YWAY-E006 from the affected-contract inventory; the trace was corrected and rechecked. Final product-integrity, architecture, security/privacy, and test reviews reported no material findings.
- 2026-09-19: S1-02 analysis confirmed that Product Vision does not uniquely define the operational thresholds for "meaningful career experiment," "real next action," the governed six-part experiment unit, the minimum anonymous-first-value interaction, or simultaneous-versus-contextual post-trial route availability. These remain explicit owner decisions, so S1-02 stays open and dependent S1-04 edits remain blocked on the relevant decisions.
- 2026-09-19: Security/privacy re-review found that the S1-02 anonymous-first-value analysis omitted the independent YWAY-P012 age and safeguarding boundary. The audit now states that login-free first value preserves 18+ public access and keeps any 16–17 pathway blocked on separate safeguarding and consent review, without selecting an enforcement mechanism. `pnpm verify:full` passed after the correction.
- 2026-09-20: S1-03 analysis separated content provenance from youth evidence provenance, bounded the qualified-practitioner gate as a necessary content-quality condition rather than capability certification or complete release readiness, and confirmed that evidence separation does not itself require separate screens or physical storage. Product Vision does not uniquely decide whether provenance markers are cumulative facts or lifecycle states, or whether multiple evidence categories should be normatively permitted in one view; those remain owner decisions for any dependent S1-04 contract wording.
- 2026-09-20: Code review found that the initial S1-03 wording deferred version invalidation and re-review rules too broadly, allowing stale practitioner approval to appear transferable to changed content. The analysis now preserves the binding YWAY-P019/YWAY-E005 invariant that practitioner approval covers only reviewed content; changed content outside that review scope cannot inherit prior practitioner-reviewed or production-quality status. Exact versioning, materiality triggers, review granularity, and workflow remain deferred.
- 2026-09-20: The owner resolved both S1-03 product questions. Provenance history is cumulative and preserved across AI assistance, founder review, and practitioner review, with any current status kept separately. Evidence categories may coexist in one Portfolio view when clearly grouped and labeled, and category-specific viewing should also be supported; exact UI controls remain deferred to later design.
- 2026-09-20: S1-04 applied the approved S1-03 refinements to YWAY-P007–P009, YWAY-P019, and YWAY-E005 without adding or renumbering contract IDs. S1-02 owner decisions remain unresolved, so the corresponding career-experiment, anonymous-first-value, and post-trial contract refinements remain intentionally blocked and S1-04 stays open.
- 2026-09-20: Code review found that YWAY-P008 and YWAY-P019 still used DIRECT_PRODUCT_CONTRACT even though their new S1-03 requirements came from explicit owner direction rather than Product Vision alone. Product Contracts now distinguish OWNER_AUTHORIZED_PRODUCT_CONTRACT from direct Vision contracts, cite the durable S1-03 owner-decision record, and preserve Product Vision as the highest authority.

## Decision log

Entries here document execution history only. They are not binding product or architecture authority.

| Date | Entry | Authority status |
| --- | --- | --- |
| 2026-09-19 | Stage 1 kickoff plan approved; activate Stage 1 and create S1-01 through S1-08 | Execution direction only; does not resolve product or architecture questions |
| 2026-09-19 | S1-01 audit completed with exact Product Vision, Product Contract, and Architecture traceability; unresolved semantics and implementation choices remain assigned to later Stage 1 steps or explicit future triggers | Audit evidence only; does not resolve product or architecture questions |
| 2026-09-19 | S1-02 analysis bounded all registered clarification candidates against Product Vision and identified the remaining owner decisions; no disputed contract wording is treated as authority for resolving those questions | Analysis evidence only; S1-02 remains open pending owner direction |
| 2026-09-20 | S1-03 analysis bounded content/evidence provenance, practitioner-review, production-quality, and evidence-presentation semantics against Product Vision | Analysis evidence |
| 2026-09-20 | Owner direction: preserve cumulative provenance history with separate current status; allow clearly separated evidence categories to coexist in one Portfolio view with category-specific viewing | Explicit owner product direction for S1-04 contract refinement |
| 2026-09-20 | Apply the approved S1-03 contract subset now while leaving all unresolved S1-02-dependent wording unchanged | Execution step only; S1-04 remains open pending S1-02 owner direction |

## Completion criteria

Stage 1 is complete only when:

- every Stage 1 audit finding is resolved, corrected, or explicitly deferred with a future trigger
- Evidence, provenance, practitioner review, operations, consent, and Employer Quest ownership are internally consistent
- significant architecture decisions have reviewed ADRs with valid statuses
- unresolved implementation choices remain visibly deferred
- no physical app, package, service, database, API, auth, sync, CMS, or deployment choice has been adopted
- no product/application code has been added
- `PRODUCT_VISION.md` remains unchanged unless separately authorized by the owner
- required reviews have no unresolved blockers
- `pnpm agent:doctor` and `pnpm verify:full` pass and are recorded
- Roadmap and Stage Index show Stage 1 COMPLETE and Stage 2 NEXT
