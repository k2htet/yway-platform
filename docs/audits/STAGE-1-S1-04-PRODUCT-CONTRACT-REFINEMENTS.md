# S1-04 — Approved Product Contract Refinements

## Purpose

Apply only the Product Contract refinements that are already supported by Product Vision or explicitly
authorized by the owner through completed S1-03 work. This record is the source-traceability and
stable-ID audit for the current S1-04 subset.

S1-02 still has unresolved owner decisions. This change therefore does not edit the S1-02-affected
contracts or claim S1-04 is fully complete.

## Authority

- `docs/product/PRODUCT_VISION.md`
- `docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md`
- Issue / PR #18, including the recorded owner decisions
- `docs/product/PRODUCT_CONTRACTS.md`

## Applied refinements

| Contract | Refinement | Authority |
| --- | --- | --- |
| YWAY-P007 | Verification wording now permits mixed-category results when category identity remains explicit; only undifferentiated blending is prohibited. | Product Vision §3.3 and §7; S1-03 evidence-presentation clarification |
| YWAY-P008 | Replaces the ambiguous phrase “strictly separated categories” with semantic distinction; explicitly permits multiple categories in one Portfolio view when clearly grouped/labeled and requires category-specific viewing. | Product Vision §7 plus explicit S1-03 owner direction |
| YWAY-P009 | Clarifies that evidence provenance is distinct from Pack content provenance and that Pack review must not strengthen youth evidence level. | Product Vision §5 and §7; S1-03 content-vs-evidence provenance analysis |
| YWAY-P019 | Records AI-assisted, founder-reviewed, and practitioner-reviewed as cumulative provenance history; current status may be separate; prior practitioner approval cannot cover changed content outside the reviewed scope. | Product Vision §5 plus explicit S1-03 owner direction and existing practitioner gate |
| YWAY-E005 | Aligns enforcement with YWAY-P019 so publication approval must cover the content actually being published; stale approval cannot carry over to unreviewed changes. | Derived from YWAY-P019; S1-03 code-review correction |

## Stable-ID audit

- No Product Contract or derived-invariant ID was added, removed, or renumbered.
- Existing IDs YWAY-P001–YWAY-P030 and YWAY-E001–YWAY-E006 remain stable.
- The change only refines wording and verification expectations for existing IDs.

## Explicitly not applied

S1-02 owner decisions remain unresolved, so this change does not alter contract wording for:

- meaningful career experiment / real next action;
- the governed unit for the six-part experiment structure;
- the minimum anonymous-first-value interaction; or
- simultaneous versus contextual post-trial route availability.

Those refinements remain blocked until explicit owner direction is recorded in authoritative product
documentation.

## Product-integrity check

- Evidence levels remain distinct.
- No evidence category is strengthened by presentation, content review, or provenance metadata.
- A unified Portfolio view is permitted only when category meaning and labels remain explicit.
- Practitioner review remains a required gate for production-quality Pack content.
- Unreviewed changed content cannot inherit stale practitioner approval.
- No implementation technology, schema, CMS, workflow engine, or UI control is selected.

## Completion status

The approved S1-03 subset of S1-04 is applied. S1-04 as a whole remains open because the S1-02 owner
decisions are still pending.
