---
name: yway-pr-review
description: Coordinate Yway code review across product integrity, architecture, security, and testing disciplines before PR submission or merge. Use when a change is ready for review. Works with both Codex and OpenCode reviewer adapters. Do not use to self-approve merges.
---

# Yway PR Review

## Authority

Follow the hierarchy in AGENTS.md. Read it first, then read relevant Product Contracts from `docs/product/PRODUCT_CONTRACTS.md` and ACCEPTED decisions from `docs/decisions/`.

## Reviewer Roles

Use available reviewer adapters for these semantic roles:

1. product-integrity-reviewer
2. architecture-reviewer
3. security-privacy-reviewer
4. test-reviewer

Codex adapters: `.codex/agents/`
OpenCode adapters: `.opencode/agents/`

Do not duplicate their full instructions here. Reference them by role name.

## Fallback Behavior

If the active environment cannot invoke one or more reviewer adapters:

- Do not fail silently.
- Perform the equivalent read-only review directly using the same shared authoritative sources.
- Clearly state which reviewer role used fallback rather than an actual subagent.
- Never claim a reviewer agent ran when it did not.

## Review Inputs

Before reviewing:

- Inspect the actual diff or change set.
- Read `AGENTS.md`.
- Read relevant Product Contracts.
- Read relevant ACCEPTED decisions.
- Read `docs/architecture/ARCHITECTURE.md` if it exists and is relevant.
- Read the active ExecPlan when applicable.
- Inspect verification results that actually exist.

Do not rely only on the author's summary.

## Finding Format

Normalize all findings to:

```
Severity: BLOCKER | HIGH | MEDIUM | LOW
Location: path[:line when available]
Contract/Decision: YWAY-Pxxx / YWAY-Exxx / decision ID / N/A
Finding: concise concrete issue
Why it matters: consequence
Suggested direction: optional
```

If no material findings exist, explicitly say so. Do not manufacture findings.

## Final Synthesis

Produce:

- Blocking findings
- Non-blocking findings
- Reviewer roles executed (by adapter)
- Reviewer roles using fallback
- Verification observed
- Verification still missing
- Unresolved owner decisions
- Merge readiness: READY_FOR_HUMAN_REVIEW or NOT_READY

This skill does not self-approve merges. Human and branch-protection requirements still apply.
