# S1-03 — Provenance, Practitioner Review, and Evidence Presentation Semantics

## Purpose

Clarify content provenance, practitioner-review meaning, production-quality eligibility, evidence
presentation separation, and the boundary between content provenance and evidence provenance without
introducing unsupported product intent or prematurely defining Stage 2 workflow or physical evidence
representation.

This document records S1-03 analysis and the explicit owner direction supplied for the questions that
Product Vision leaves open. It does not modify Product Vision, Product Contracts, Architecture, or
implementation requirements; dependent Product Contract wording belongs to S1-04.

## Authority reviewed

- `docs/product/PRODUCT_VISION.md`
  - §3.3 signal and evidence separation
  - §4 Career Experience Pack metadata
  - §5 Content provenance
  - §7 Evidence Portfolio
  - §8.1 Practitioner Experiences
  - §9 Trust, privacy, and safety
- `docs/audits/STAGE-1-S1-01-VISION-CONTRACT-TRACEABILITY.md`
- Related Product Contract references:
  - YWAY-P007
  - YWAY-P008
  - YWAY-P009
  - YWAY-P019
  - YWAY-E002
  - YWAY-E005
- Privacy boundaries that remain independently binding:
  - YWAY-P014
  - YWAY-P015
  - YWAY-P016
  - YWAY-P018
  - YWAY-E001

Product Vision is the deciding authority for whether an S1-03 question is already determined.
Existing Product Contract or Architecture wording may describe current interpretations, but it must
not be used circularly to turn an unresolved S1-01 question into settled product intent.

## Findings

### 1. Content provenance markers

Product Vision requires content provenance to distinguish AI-assisted work, founder-reviewed work,
and practitioner-reviewed work. It also states that AI is not a verified practitioner and does not
certify workplace reality.

Those requirements establish truthful provenance distinctions, but Product Vision does not uniquely
define the relationship among the three markers as:

- cumulative facts that may all remain true at once;
- mutually exclusive lifecycle states; or
- a combination of durable provenance facts plus a separate current review or release state.

The owner has now selected a cumulative-history model. AI-assisted, founder-reviewed, and
practitioner-reviewed are durable historical facts that may all remain true for the same Pack. A
separate current review or release status may exist, but changing that current status must not erase
or overwrite the underlying history.

The specific storage shape, workflow state machine, CMS representation, and transition mechanism
remain deferred implementation choices.

### 2. Practitioner review and production-quality eligibility

Product Vision is explicit that a qualified practitioner is the final content-quality gate for a
production-quality Career Experience Pack.

The minimum product meaning is therefore:

- AI assistance or founder review cannot substitute for the qualified-practitioner gate.
- A Pack must not be represented as production-quality with respect to content quality before that
  practitioner gate has been satisfied.
- Practitioner approval applies only to content actually covered by the qualified-practitioner
  review. Changed content that has not itself been covered by qualified-practitioner review cannot
  inherit a prior version's practitioner-reviewed or production-quality status.
- A practitioner-review claim is about Pack content quality. It does not by itself certify a young
  person's capability, turn exploration or practice evidence into verified assessment evidence, or
  create hiring evidence.
- The practitioner gate is necessary for production-quality Pack content, but it is not the complete
  definition of global release readiness. Other independent Product Vision release gates, including
  localization and comprehension requirements, remain in force.

Product Vision does not uniquely define practitioner qualification operations, review granularity,
approval tooling, the exact trigger or materiality rule for re-review after changes, or the workflow
used to establish production eligibility. S1-03 leaves those mechanisms to later operational and
architecture work unless the owner explicitly makes them normative product requirements. That
deferral does not weaken the gate: content changes outside the scope of prior practitioner review must
not be treated as practitioner-reviewed or production-quality merely because an earlier version was
approved.

### 3. Evidence presentation separation

Product Vision requires exploration signals, practice evidence, verified assessment evidence,
user-added work, and Employer Quest work to remain separate in meaning. One evidence level must never
be presented as another, and completion records must state exactly what was completed.

That is a semantic and truthfulness constraint. Product Vision does not state that each category must
live on a different screen, page, physical datastore, package, or service.

The owner has selected a unified Portfolio presentation: differently labeled evidence categories may
coexist in one Portfolio view when category boundaries, labels, meaning, and provenance remain
explicit. The experience should also support category-specific viewing so a user can narrow the
Portfolio to one evidence category without implying that one category is stronger or more valuable
than another.

The exact interaction control, screen layout, navigation pattern, and visual design remain deferred.
A later design must not use grouping, filtering, aggregation, export, or sharing to make distinct
evidence categories appear equivalent or stronger than they are.

### 4. Content provenance and evidence provenance are different concerns

Product Vision treats content provenance and Evidence Portfolio provenance as related but distinct.

Content provenance answers questions about the Pack itself, such as whether AI assisted with the
content and whether founder or qualified-practitioner review occurred.

Evidence provenance answers questions about a youth evidence item, including its origin, creation
context, and evidence level, and that provenance must survive organization, hiding, export, and
selective sharing.

When youth evidence arises from interaction with a Pack, later architecture must preserve enough
traceability to interpret both sides correctly without conflating them. In particular:

- practitioner review of Pack content does not promote resulting youth evidence into a stronger
  evidence level;
- evidence correction or reclassification, if a later design permits it, must remain explicit and
  provenance-preserving under YWAY-E002; and
- the mechanism by which evidence refers to or carries relevant Pack provenance is an architecture
  and data-design question, not an S1-03 product decision.

### 5. Privacy and security implications

This clarification does not broaden access to youth evidence or change consent boundaries.

- The Evidence Portfolio remains private and has no public URL.
- A presentation that shows multiple evidence categories to the youth does not authorize sharing
  those categories together.
- Export and selective sharing must preserve evidence provenance and category meaning.
- Employers still must not gain access to private exploration, reflections, ordinary unshared
  practice signals, or the wider private portfolio without explicit user action.
- Content provenance or practitioner-review labels must not be repurposed as youth capability,
  employability, candidate-quality, or hiring claims.

No authentication provider, authorization mechanism, persistence model, audit store, CMS, workflow
engine, or UI implementation is selected here.

## Owner decisions

The owner explicitly resolved both S1-03 product questions:

1. **Preserve the full provenance history.** AI-assisted, founder-reviewed, and
   practitioner-reviewed are cumulative historical facts. They must not be collapsed into a single
   mutually exclusive lifecycle label. A separate current review or release status may be maintained,
   but it must not erase the historical provenance record.
2. **Allow clearly separated evidence categories in one Portfolio view.** Different evidence
   categories may appear together when they are visibly grouped and labeled so their meanings remain
   distinct. The product should also support category-specific viewing. Exact UI controls and layout
   remain a later design decision.

These decisions are explicit owner authorization for the corresponding S1-04 Product Contract
refinements. They do not authorize a CMS, workflow engine, schema, storage model, or specific UI
implementation.

The minimum practitioner-review gate and the distinction between content provenance and evidence
provenance remain enforceable. So does the invariant that unreviewed changed content cannot inherit
an earlier version's practitioner approval. Detailed practitioner qualification, version model,
review granularity, materiality or re-review trigger, and workflow remain deferred operational or
architecture questions unless later product authority makes them normative.

## Non-goals preserved

- No Product Vision changes.
- No Product Contract edits.
- No Architecture edits.
- No CMS or workflow-engine choice.
- No practitioner qualification operations.
- No evidence schema or UI implementation.
- No physical separation requirement for evidence categories.
- No automatic evidence strengthening or reclassification.
- No implementation technology decisions.

## Validation status

- The provenance question is resolved by explicit owner direction: full historical provenance is
  preserved, while any current review or release status remains separate.
- The practitioner gate is defined at its minimum Product Vision-supported meaning without treating it
  as capability certification or the complete release-readiness definition; prior approval cannot
  cover changed content that was not within the scope of practitioner review.
- Evidence presentation is resolved by explicit owner direction: categories may coexist in one
  Portfolio view with clear grouping and labels, with category-specific viewing supported; no
  separate-screen or separate-storage requirement is introduced.
- Content provenance and evidence provenance remain distinct, and practitioner-reviewed content does
  not strengthen youth evidence.
- Privacy, sharing, export, and employer-isolation constraints remain independently binding.
- S1-03 analysis and its required owner decisions are complete. S1-04 may apply the corresponding
  Product Contract refinements while preserving the remaining deferred implementation choices.
