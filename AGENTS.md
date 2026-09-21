# Yway Agent Instructions

Yway is a youth-first career discovery and growth product for people in Myanmar, initially ages
18–25. These rules apply repository-wide. A closer `AGENTS.md` may add but not weaken them.

## Sources of truth

When sources conflict, use this order:

1. `docs/product/PRODUCT_VISION.md`
2. `docs/product/PRODUCT_CONTRACTS.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/decisions/` — only `ACCEPTED` decisions are binding
5. `docs/exec-plans/`
6. Platform Build Report — advisory only

Chat is not durable product authority. Changing `PRODUCT_VISION.md` requires explicit owner
instruction.

## Product, privacy, and safety guardrails

Before changing product behavior, read the exact applicable contract sections. Preserve:

- exploration before choice and reversible guidance; no career-fit, employability,
  candidate-quality, composite, or equivalent scores or rankings (`YWAY-P001`, `YWAY-P004`,
  `YWAY-P005`, `YWAY-E006`)
- separate signal types and evidence levels; Exploration is not Practice or Verified Assessment,
  and evidence is never silently strengthened (`YWAY-P006`, `YWAY-P007`, `YWAY-E002`)
- an employer-independent core journey and first career value without login; public access is 18+,
  and any 16–17 pathway needs separate safeguarding and consent review (`YWAY-P010`–`YWAY-P012`)
- private profiles and portfolios with no public URL; explicit, purpose-specific sharing; Quest
  and application separation; no implicit candidate state or employer access to private youth data
  (`YWAY-P014`–`YWAY-P018`, `YWAY-E001`, `YWAY-E003`, `YWAY-E004`)
- evidence/content provenance and the qualified-practitioner review gate (`YWAY-P019`, `YWAY-E005`)
- preservation of offline-supported youth work during synchronization (`YWAY-P022`)

## Decision and Stage authority

- Logical domains do not imply physical boundaries.
- Significant architecture or technology choices need an applicable `ACCEPTED` decision and
  architecture update. `YWAY-D001` accepts repository tooling only; app framework, database,
  authentication, and synchronization remain undecided.
- Surface unresolved product or architecture questions instead of deciding them implicitly.
- Do not activate, advance, close, or begin work from a new roadmap Stage without explicit owner
  authority. An audit, roadmap label, or ExecPlan is not that authority.

## Context boundaries

- Start with named files and the applicable `AGENTS.md` chain; do not broadly scan or preload
  context.
- Load exact Product Vision/Contract sections only for affected product, privacy, sharing, consent,
  evidence, safeguarding, or offline semantics.
- Load relevant Architecture sections for affected domain, privacy, synchronization, or physical
  boundaries.
- For decision discovery, start from changed files and referenced decision IDs or filenames. Check
  status headers, then read only directly applicable `ACCEPTED` decisions. Do not enumerate or
  preload all decisions.
- Use ExecPlan requirements only when a matching plan is already identified or the task requires
  one. Inspect filenames first and read only the matching plan; do not search plans for trivial
  tasks.
- Follow nested instructions; do not inspect unrelated application, test, or tooling trees.

## Working agreement

- Make the smallest bounded change and preserve user work.
- Multi-step work needs an ExecPlan; trivial edits do not.
- Follow repository format/tool configuration for affected files.
- Verify proportionately to the change and matching plan. Structural checks do not prove semantic,
  privacy, authorization, consent, offline, accessibility, or localization correctness.
- Report actual results and skipped checks; never claim an unrun check or review passed.
- After stabilization, use only risk-relevant product, architecture, security/privacy, and test
  reviews. Adapters do not replace canonical sources.
