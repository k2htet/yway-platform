# AGENTS.md Context Architecture Refactor

## Status

COMPLETE

## Purpose and outcome

Audit and refactor repository agent instructions so routine work loads only the context it
needs while repository-wide product, privacy, security, architecture, and governance constraints
remain binding.

## Relevant Product Contracts

This work does not change product behavior. It must preserve the root summaries and routing for
`YWAY-P001`, `YWAY-P004`–`YWAY-P007`, `YWAY-P010`–`YWAY-P019`, `YWAY-P022`, and
`YWAY-E001`–`YWAY-E006`.

## Scope and non-goals

In scope:

- `AGENTS.md` and new nested `AGENTS.md` files
- Codex configuration and reviewer instruction patterns
- a durable audit in `docs/audits/`
- instruction-specific validation

Out of scope:

- product or application behavior
- canonical product, architecture, roadmap, or decision content
- new technology or architecture decisions
- activation of any roadmap Stage

## Ordered steps

1. Inventory repository instruction files and identify unconditional context-loading risks.
2. Write the audit and proposed hierarchy before changing instructions.
3. Refactor root and nested instructions; reduce Codex adapter duplication where safe.
4. Validate scope, guardrail preservation, formatting, and repository checks.
5. Record review evidence and close this plan without changing roadmap Stage state.

## Affected files and domains

- `AGENTS.md`
- nested instruction files under `docs/` and `.codex/`
- `.codex/agents/*.toml` if adapter duplication can be removed without weakening review
- `docs/audits/AGENTS-MD-CONTEXT-AUDIT.md`
- this ExecPlan

No product logical domain or application code is changed.

## Validation strategy

- compare all root product/privacy guardrail topics and contract IDs before and after
- confirm only instruction, audit, and this execution-plan file changed for this task
- confirm no Stage status or canonical product/architecture content changed
- run formatting and repository verification required for documentation handoff
- perform product-integrity, architecture, security/privacy, and test-scope review

## Risks

- moving a rule could make a critical guardrail path-local when it must remain repository-wide
- duplicated reviewer instructions could drift from canonical authority
- too many nested files could increase, rather than reduce, context for documentation work

## Unresolved questions

- Whether non-Codex reviewer adapters should be normalized in a separate cross-tool task.
- Whether future `src/` or `packages/` trees need local instructions once they exist.

## Progress checklist

- [x] Instruction inventory completed
- [x] Audit written
- [x] Instruction hierarchy refactored
- [x] Guardrail and documentation-only scope validated
- [x] Relevant reviews completed
- [x] Plan closed

## Discoveries log

- 2026-09-21: The repository has one root `AGENTS.md` and no nested instruction files.
- 2026-09-21: `src/` and `packages/` do not exist; creating rules for them now would be speculative.
- 2026-09-21: Root wording can prompt every task to load contracts, an active ExecPlan,
  Architecture, and accepted decisions even when the task does not touch those concerns.
- 2026-09-21: `.codex/config.toml` already disables unrelated plugins by default; the four Codex
  reviewer adapters duplicate the full authority list.
- 2026-09-21: Root instructions changed from 485 to 481 words. The four Codex reviewer adapters
  changed from 901 to 806 words; path-specific instructions are 74–132 words each.
- 2026-09-21: Initial full verification found formatting issues in six new Markdown files. Prettier
  was applied only to those files, and the next full verification passed all configured checks.
- 2026-09-21: Product-integrity, security/privacy, and test reviewers found no material issues.
  Architecture review found two medium decision-routing ambiguities; both were corrected and the
  same reviewer confirmed no material findings remain.

## Decision log

- 2026-09-21: Keep non-negotiable product, privacy, decision-authority, and Stage-activation rules
  in root instructions; move file-type workflows to existing directory boundaries.
- 2026-09-21: Do not create `src/` or `packages/` instructions until those directories exist.
- 2026-09-21: Keep OpenCode adapter normalization deferred; this implementation changes Codex
  adapters only and records the cross-tool duplication for a future scoped decision.

## Completion criteria

- the requested audit exists and precedes the implemented hierarchy in task history
- critical Yway guardrails remain repository-wide
- context-loading triggers are explicit and bounded
- changes are documentation/instruction-only
- actual validation and review results are recorded

## Completion result

Completed 2026-09-21. The audit and nested instruction hierarchy are implemented without changing
product, application, canonical product/architecture, decision, or roadmap content. No roadmap
Stage was activated, advanced, or closed.

Final evidence:

- `pnpm agent:doctor`: `READY` with the expected dirty-working-tree warning
- `pnpm verify:full`: passed lint, typecheck, formatting, and structural invariants; tests skipped
  because no test script is configured
- `git diff --check`: passed
- four-role review: no material findings remain; two initial architecture findings were corrected
  and confirmed resolved
