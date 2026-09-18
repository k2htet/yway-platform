---
name: yway-product-integrity
description: Evaluate proposed or implemented changes against Yway product contracts before or during implementation. Use when changes touch career exploration, evidence, scoring, consent, sharing, employer access, Quests, applications, Career Experience Packs, practitioner review, offline behavior, age safeguarding, or localization. Do not use for unrelated mechanical changes unless product behavior may change.
---

# Yway Product Integrity

## Authority

Follow the hierarchy in AGENTS.md. The canonical product sources are `docs/product/PRODUCT_VISION.md` (highest authority) and `docs/product/PRODUCT_CONTRACTS.md` (stable contracts, YWAY-Pxxx / YWAY-Exxx). This skill references them; it never replaces them.

## Workflow

1. Read `AGENTS.md`.
2. Read the relevant section of `docs/product/PRODUCT_VISION.md`.
3. Read relevant contract IDs in `docs/product/PRODUCT_CONTRACTS.md`.
4. Identify all directly affected product contracts.
5. Identify applicable derived enforcement invariants.
6. Classify the proposed change: COMPATIBLE, NEEDS_CLARIFICATION, or CONFLICT.
7. Identify unresolved product decisions touched by the change. Do not resolve them silently.

## High-Risk Checks

Check for these regressions without duplicating full contract text:

- Deterministic career verdicts or irreversible guidance (YWAY-P004)
- Prohibited scoring, ranking, or composite scores (YWAY-P005, YWAY-E006)
- Signal type conflation — interest, behavior, preferences, constraints merged (YWAY-P006)
- Evidence-level conflation — Exploration presented as Practice or Verified Assessment (YWAY-P007)
- Employer Quest conflated with employment application (YWAY-P017)
- Implicit candidate creation from browsing or Quest completion
- Employer access to private youth data (YWAY-P018, YWAY-E001)
- Public portfolio URL exposure (YWAY-P014)
- Sharing without explicit purpose-specific consent (YWAY-P015, YWAY-P016)
- Practitioner review or provenance bypass (YWAY-P019)
- Login required before first career value (YWAY-P011)
- Loss of offline-supported youth work during sync (YWAY-P022)

## Output Format

```
Product contracts affected:
- YWAY-Pxxx / YWAY-Exxx

Assessment:
- COMPATIBLE | NEEDS_CLARIFICATION | CONFLICT

Findings:
- Only concrete findings. Do not manufacture.

Required action:
- What must change or what owner decision is needed
```

This skill may analyze and recommend. It must not rewrite PRODUCT_VISION.md or weaken PRODUCT_CONTRACTS.md.
