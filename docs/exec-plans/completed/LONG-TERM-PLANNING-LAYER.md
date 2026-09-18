# Long-Term Planning Layer

## Purpose and Outcome

Create a durable, outcome-level Production V1 roadmap and compact stage index so
future sessions can understand Yway's direction without relying on chat history.

## Relevant Product Contracts

This documentation-only task references all contract areas at a high level. It
must not change, reinterpret, or supersede any `YWAY-Pxxx` or `YWAY-Exxx`
contract. The highest-risk boundaries are YWAY-P004 through YWAY-P007,
YWAY-P010 through YWAY-P019, YWAY-P022 through YWAY-P024, YWAY-P029,
YWAY-P030, and YWAY-E001 through YWAY-E006.

## Current State and Target State

- Current: long-term staged direction is not represented by a canonical roadmap
  or compact stage index in the repository.
- Target: `docs/roadmap/ROADMAP.md` records directional stage outcomes and
  planning policy; `docs/roadmap/STAGE-INDEX.md` provides a compact status view;
  `AGENTS.md` links to both.

## Scope and Non-Goals

In scope: documentation and navigation only.

Out of scope: product features, product or contract changes, architecture or
technology selection, detailed plans for distant stages, and changes to
`PRODUCT_VISION.md` or `PRODUCT_CONTRACTS.md`.

## Dependencies

- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- ACCEPTED decisions
- The active Stage 0 ExecPlan as status evidence

## Implementation Steps

1. Establish authority, status evidence, and product-integrity constraints.
2. Create the outcome-level roadmap and compact stage index.
3. Add concise roadmap navigation to `AGENTS.md`.
4. Run repository verification and close this plan if all criteria pass.

## Validation Strategy

- Confirm all 16 supplied stages appear in both roadmap documents.
- Confirm every roadmap stage contains only the seven requested fields.
- Confirm status values are from the approved vocabulary and match evidence.
- Confirm no product source or technology decision was modified or introduced.
- Run `pnpm verify:full`.

## Cross-Cutting Implications

No runtime privacy, security, offline, localization, or accessibility behavior
changes. The roadmap must keep those contract areas visible without prescribing
implementation.

## Risks and Unresolved Questions

- Risk: directional outcomes could be mistaken for requirements. Mitigation:
  state the authority and non-requirement policy explicitly.
- Risk: distant-stage detail could silently resolve open decisions. Mitigation:
  keep descriptions at outcome level and preserve open questions.
- No product question is resolved by this task.

## Progress Checklist

- [x] Authority and status evidence reviewed
- [x] Roadmap created
- [x] Stage index created
- [x] AGENTS.md navigation updated
- [x] Verification passed
- [x] Plan closed

## Discoveries Log

- 2026-09-18: Stage 0 remains active. Its live-CI validation passed, but enforced
  branch protection is blocked on an owner/account prerequisite and later Stage
  0 steps remain incomplete.
- 2026-09-18: YWAY-D001 is the only ACCEPTED decision and governs Stage 0
  foundation tooling only; future product technologies remain undecided.
- 2026-09-18: The first sandboxed verification attempt could not create the
  `tsx` IPC socket. The approved rerun outside that restriction passed every
  implemented check. Both runs warned that the execution environment exposed
  Node 22 rather than the repository-required Node 24.

## Decision Log

- 2026-09-18: Represent Stage 0 as `ACTIVE`, Stage 1 as `NEXT`, and Stages 2–15
  as `PLANNED`. The blocked Stage 0 sub-step is disclosed but does not make all
  Stage 0 work impossible.
- 2026-09-18: Treat roadmap dependencies as sequencing guidance, not physical
  architecture or technology commitments.

## Completion Criteria

- Both requested roadmap documents exist and contain the requested information.
- `AGENTS.md` contains only a short navigation addition for them.
- Product authority files remain unchanged.
- Full verification passes.
- No product or technology decision is introduced.

## Completion

- **Date:** 2026-09-18
- **Result:** Complete. Both roadmap documents and concise AGENTS.md navigation
  were created. `pnpm verify:full` passed all currently implemented checks. The
  product-integrity assessment is `COMPATIBLE`; no product or technology decision
  was introduced, and the product authority files were not modified.
