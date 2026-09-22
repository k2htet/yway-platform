# Yway Agent Instructions

Yway is a youth-first career discovery and growth product for people in Myanmar, initially ages
18–25. These rules apply repository-wide. A closer `AGENTS.md` may add but not weaken them.

## Sources of truth

When sources conflict, use this order: `docs/product/PRODUCT_VISION.md` →
`docs/product/PRODUCT_CONTRACTS.md` → `docs/architecture/ARCHITECTURE.md` → `docs/decisions/`
(only `ACCEPTED` decisions bind) → `docs/exec-plans/` → Platform Build Report (advisory only).

Chat is not durable product authority. Changing `PRODUCT_VISION.md` requires explicit owner
instruction.

Audit files are advisory analysis unless they separately record an explicitly identified
owner-authorized product refinement; only that recorded direction is durable supporting authority
where a Product Contract cites it. Do not infer product rules from audit recommendations.

## Product learning / discovery

For user research, experiments, hypotheses, and product-learning evidence, see
`docs/discovery/README.md`. Discovery artifacts are non-authoritative and do not override Product
Vision or Product Contracts. Evidence informs hypotheses; hypotheses inform decisions. Only
approved decisions can change authoritative product documents.

## Current state and workflow

- Compact stage/status: `docs/roadmap/STAGE-INDEX.md` (authority: `docs/roadmap/ROADMAP.md`).
- Authorized complex work: an active ExecPlan under `docs/exec-plans/active/`; the ACTIVE roadmap
  stage's plan is cited in ROADMAP.md. Stage activation, advancement, and closure always require
  explicit owner authority.
- Branch, PR, review, and collaboration workflow: `CONTRIBUTING.md`.

## Verification

`pnpm agent:doctor` (environment), `pnpm verify:fast` (lint+typecheck), `pnpm verify:invariants`
(structural product guardrails), `pnpm verify:full` (all checks incl. documentation/status).

## Autonomy tiers

- **Agent-autonomous:** Reversible implementation detail preserving existing authority: local
  naming, small code/test organization, reversible refactors, contract-preserving bug fixes, and
  formatting/docs corrections.
- **ADR required:** Long-lived, cross-cutting, hard-to-reverse technical or architecture choices;
  existing triggers govern application/framework, database/storage, authentication, physical
  app/service/package boundaries, synchronization, and security architecture.
- **Owner approval required:** Changes to product meaning or authority: Product Vision or Contract
  meaning, target population, safeguarding, employer/youth access, scoring/ranking, stage
  activation/closure, significant ADR acceptance, and public release authority.

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

- Start with named files and the applicable `AGENTS.md` chain; do not broadly preload context.
- Load exact Product Vision/Contract sections only for affected semantics, and Architecture sections
  only for affected domain, privacy, synchronization, or physical boundaries.
- For decision discovery, start from changed files and referenced decision IDs or filenames. Check
  status headers, then read only directly applicable `ACCEPTED` decisions. Do not enumerate or
  preload all decisions.
- Use ExecPlan requirements only when a matching plan is already identified or the task requires
  one. Inspect filenames first and read only the matching plan; do not search plans for trivial
  tasks.
- Follow nested instructions; do not inspect unrelated application, test, or tooling trees.

## Working agreement

- Preserve user work, make the smallest bounded change, and use an ExecPlan for multi-step work.
- Follow repository format/tool configuration for affected files; trivial edits need no ExecPlan.
- Verify proportionately to the change and matching plan. Structural checks do not prove semantic,
  privacy, authorization, consent, offline, accessibility, or localization correctness.
- Report actual results and skipped checks; never claim an unrun check or review passed.
- Changes to governance control surfaces (`AGENTS.md` and `CONTRIBUTING.md` files, Product Vision,
  Product Contracts, Architecture, ADR statuses, invariant/verification scripts, CI workflows)
  require independent review; owner approval applies only where existing authority requires it.
  See `CONTRIBUTING.md`.
- Done means acceptance criteria are met, required verification actually ran, results are recorded
  truthfully, unresolved questions stay explicit, and durable knowledge is written into repository
  sources rather than left only in chat. Workflow detail: `CONTRIBUTING.md`.
- After stabilization, use only risk-relevant product, architecture, security/privacy, and test
  reviews. Adapters do not replace canonical sources.
