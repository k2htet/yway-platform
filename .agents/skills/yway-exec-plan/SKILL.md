---
name: yway-exec-plan
description: Create, update, resume, and close execution plans for multi-step Yway tasks. Use when starting implementation work requiring 3+ steps, resuming an existing plan, updating progress, or closing a completed plan. Do not use for trivial single-file edits.
---

# Yway Execution Plans

## Authority

Follow the hierarchy in AGENTS.md. Read it first. Then read relevant Product Contract IDs from `docs/product/PRODUCT_CONTRACTS.md` before planning.

## Starting Work

1. Read `AGENTS.md`.
2. Identify the active task and relevant Product Contract IDs.
3. Search `docs/exec-plans/active/` for an existing matching plan.
4. If one exists, continue it. Do not create duplicates.
5. If a new multi-step plan is needed, create a self-contained markdown file in `docs/exec-plans/active/`.

## Plan Structure

Include only what is relevant to the task. Avoid boilerplate.

- Purpose and outcome (user-visible or engineering)
- Relevant Product Contract IDs
- Current state and target state
- Scope and non-goals
- Dependencies
- Ordered implementation steps
- Affected files and domains
- Validation strategy
- Privacy/security implications (if any)
- Offline implications (if any)
- Localization/accessibility implications (if any)
- Risks
- Unresolved questions
- Progress checklist
- Discoveries log
- Decision log
- Completion criteria

## During Execution

- Update the progress checklist as work actually completes.
- Record discoveries that affect later steps in the discoveries log.
- Record decisions in the decision log. Chat history is not a source of truth.
- Create or reference an ADR in `docs/decisions/` when a significant architecture decision is needed.
- Stop and surface unresolved product decisions rather than silently deciding them.
- Do not proceed past the current step's dependencies.

## Closing a Plan

Before moving from `docs/exec-plans/active/` to `docs/exec-plans/completed/`:

- All completion criteria must pass.
- Required verification must have actually been run (not assumed).
- Unresolved blockers must not be hidden.
- Relevant documentation must be updated.
- Record completion date and result in the plan.
