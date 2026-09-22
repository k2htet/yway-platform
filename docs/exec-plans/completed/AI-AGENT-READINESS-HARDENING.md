# AI-Agent Readiness Hardening Pass

## Status

COMPLETE

Activation date: 2026-09-22
Completion date: 2026-09-22

Completion result: Hardening checklist and completion criteria are satisfied. The README entry
now routes agents to the root instructions, stage index, and only relevant authority sections.
The final `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, and
`pnpm verify:full` checks passed on 2026-09-22. Stage 2 remains ACTIVE under its separate plan;
Stage 3 remains PLANNED.

## Purpose and outcome

A fresh AI-agent session can quickly determine what Yway is, where current stage/status lives,
what work is authorized, what the agent may decide versus escalate, what verification exists, what
"done" means, and how to leave a clean handoff — with root context staying compact and without new
governance bureaucracy or Stage 3 artifacts.

Stage 2 remains ACTIVE under its own ExecPlan; this plan covers only repository instruction,
workflow, and cheap documentation/status consistency checks.

## Relevant Product Contract IDs

None directly. Product-behavior wording in root `AGENTS.md` guardrails must be preserved verbatim
in meaning (YWAY-P001–P030, YWAY-E001–E006 remain engineering guardrails, unchanged).

## Current state

- Stage 0 and Stage 1 COMPLETE; Stage 2 ACTIVE under `docs/exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md`;
  Stage 3 PLANNED.
- Root `AGENTS.md` is a compact guardrail file but lacks current-state, workflow, verification,
  autonomy-tier, and handoff pointers.
- `CONTRIBUTING.md` has workflow and governance bullets but no risk-based review model, no
  governance-surface change rule, and no audit-authority clarification.
- Verification covers lint, typecheck, format, product invariants; no markdown link, roadmap
  status, or ExecPlan placement checks exist.
- Some Product Contracts cite audit files as owner-decision records, risking the inference that
  whole audits are normative.

## Target state

- Root `AGENTS.md` remains a small router/guardrail file (approximately ≤100 lines) with explicit
  autonomy tiers, current-state/workflow/verification pointers, and brief done/handoff rules.
- `CONTRIBUTING.md` carries the risk-based review model and the governance-surface
  independent-review rule (distinguishing independent review, owner awareness, owner approval).
- A deterministic `pnpm verify:docs` check (self-tested, wired into `verify:full`) detects broken
  in-repository markdown links in governed docs, ROADMAP vs STAGE-INDEX status disagreement, and
  active/completed ExecPlan placement inconsistencies.
- Audit authority is clarified once in root `AGENTS.md`: advisory unless separately recorded
  owner-authorized direction.

## Scope

- Root `AGENTS.md`, `CONTRIBUTING.md`, README/CONTRIBUTING verification tables.
- New `scripts/check-doc-consistency.ts` plus `verify:docs` wiring in `package.json` and
  `scripts/run-verification.ts`.
- This ExecPlan.

## Non-goals

Do not:

- activate Stage 3 or create Stage 3 PRDs, thesis, hypotheses, research evidence, or plans
- modify `PRODUCT_VISION.md` or change Product Contract meaning
- make new architecture decisions or select frameworks/databases/auth/hosting/boundaries
- rewrite governance documents broadly or expand root `AGENTS.md` into a handbook
- duplicate contract lists, roadmap narratives, or review templates
- rewrite the six existing contract refinements
- validate arbitrary external URLs
- create a second "AI Agent Operating Model" document

## Dependencies

- Root `AGENTS.md`, `CONTRIBUTING.md`, `README.md`
- `docs/roadmap/ROADMAP.md`, `docs/roadmap/STAGE-INDEX.md`
- `docs/exec-plans/active/` and `docs/exec-plans/completed/`
- Existing verification: `scripts/run-verification.ts`, `scripts/check-product-invariants.ts`
- Issue/PR templates (read only; unchanged unless a concrete gap appears)

## Ordered implementation steps

### H-01 — Root `AGENTS.md` router/guardrail pass

Add concise pointers for current state (`STAGE-INDEX.md`, active ExecPlan convention),
workflow (`CONTRIBUTING.md`), the four standard verification commands, a three-tier autonomy model
(agent-autonomous / ADR required / owner approval required), a brief done/handoff note, the
audit-authority clarification, and a governance-surface independent-review pointer. Preserve all
existing guardrail wording and owner-authority rules. Keep the file compact.

### H-02 — `CONTRIBUTING.md` risk-based operating model

Add a three-tier risk-based review model (low-risk/reversible; product-semantic/governance-
sensitive; architecture/privacy/security significant) with proportionate expected processes that
neither require four-discipline review for trivial edits nor weaken high-risk requirements. Add a
governance/control-surface change rule distinguishing independent review, owner awareness, and
owner approval. Update the verification table for `verify:docs`.

### H-03 — Documentation/status consistency checker

Implement `scripts/check-doc-consistency.ts` with:

- markdown internal-link integrity for governed docs (root md, `docs/**/*.md`, `.github/**/*.md`);
  skip external URLs and fragment-only links; strip code blocks/spans
- ROADMAP vs STAGE-INDEX per-stage status agreement against the published status vocabulary
- ExecPlan placement sanity: `active/` must declare ACTIVE and not COMPLETE; `completed/` must
  not claim ACTIVE
- `--self-test` covering positive and intentionally malformed fixtures

Wire as `verify:docs` in `package.json` and run it in `verify:full`.

### H-04 — Verification and review

Run `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, `pnpm verify:full`, and the
targeted `--self-test`. Record actual results. Obtain proportionate independent reviews for the
governance-sensitive and checker changes.

### H-05 — Round-3 review hardening

Close the remaining review gaps: make `verify:docs` fail closed in `verify:full`; handle Markdown
fences and multiline code spans correctly; reject ambiguous duplicate Stage, status, and Active
ExecPlan declarations; enforce canonical-path containment across symlinks; add regression fixtures;
and resolve the compact-root-instructions and duplicated audit-authority follow-ups.

### H-06 — Markdown and stage-status parser corrections

Exclude indented Markdown code blocks from link scanning, parse internal-link destinations with
balanced parentheses, and validate complete ROADMAP/STAGE-INDEX status fields. Add focused
self-test cases for each reported failure, rerun verification, and obtain an independent review of
the verification-script change.

## Affected files and domains

- `AGENTS.md`
- `CONTRIBUTING.md`
- `README.md` (verification table row)
- `scripts/check-doc-consistency.ts` (new)
- `scripts/run-verification.ts`
- `package.json`
- This ExecPlan (now under `docs/exec-plans/completed/`)

Logical domains: none product-facing; repository governance/tooling only.

## Validation strategy

- `pnpm verify:docs` passes on the repository and its self-test fails on intentionally malformed
  fixtures (broken link, status mismatch, misplaced plan).
- `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, `pnpm verify:full` all pass.
- Root `AGENTS.md` line count stays compact (target ≤100 lines).
- Proportionate product-integrity, architecture, security/privacy, and test reviews report actual
  findings.

## Privacy/security implications

- No product data, youth/employer data, or permissions changes.
- The governance-surface rule reduces the ability of an implementation agent to weaken its own
  guardrails (invariant scripts, CI, instruction files) without independent review.
- CI workflow unchanged except that `verify:full` gains the new deterministic check via existing
  script wiring; no new CI job and no permission widening.

## Offline implications

N/A. No youth interaction or synchronization surface is touched. YWAY-P022 unchanged.

## Localization/accessibility implications

N/A. Documentation and verification tooling only; no user-facing content.

## Risks

- Over-broad link parsing could flag false positives; mitigated by skipping external URLs,
  fragments, and code spans, and validated against the current repository.
- Status parsing could be brittle; mitigated by limiting parsing to stable `## Status`,
  `**Status:**`, `**Completed:**`, roadmap `- **Status:**`, and stage-index table-row patterns.
- Root `AGENTS.md` could balloon; mitigated by the ≤100-line target and link-not-copy discipline.
- Wording edits could accidentally alter product meaning; mitigated by preserving guardrail text
  and product-integrity review.

## Unresolved questions

- Deferred recommendation only (no structure created): a future owner-authorized
  discovery/research namespace for Stage 3. Stage 3 remains PLANNED until separately activated.

## Progress checklist

- [x] H-00 ExecPlan created.
- [x] H-01 Root `AGENTS.md` router/guardrail pass.
- [x] H-02 `CONTRIBUTING.md` risk-based operating model.
- [x] H-03 Documentation/status consistency checker wired into verification.
- [x] H-04 Verification and proportionate independent reviews recorded.
- [x] H-05 Round-3 review findings fixed, regression-tested, and independently re-reviewed.
- [x] H-06 Markdown and stage-status parser corrections verified and independently reviewed.

## Discoveries log

- 2026-09-22: H-06 review found three remaining checker gaps: indented code examples were scanned
  for links, valid link destinations containing parentheses were skipped, and status parsers
  accepted a valid prefix of an invalid value such as `ACTIVE_PENDING`. The checker now excludes
  indented code lines, parses balanced inline destinations, and compares complete normalized
  ROADMAP/STAGE-INDEX status fields against the published vocabulary. Focused review also exposed
  angle-wrapped reference definitions and malformed repeated link openers; these were addressed
  with normalization, bounded nesting/forward scanning, and specific regression fixtures.
  Independent product-integrity, architecture, security/privacy, and test reviews report no
  unresolved material H-06 findings. The plan remains ACTIVE; no stage closure was inferred.

- 2026-09-22: Completed ExecPlans use three status styles (`COMPLETE`, `Completed — date`,
  `**Completed:**`); placement checks must accept all three while rejecting ACTIVE claims under
  `completed/`.
- 2026-09-22: `LONG-TERM-PLANNING-LAYER.md` has no status declaration; placement check must not
  require one for `completed/` but must require ACTIVE for `active/`.
- 2026-09-22: ROADMAP prose and CONTRIBUTING prose also restate stage status; they are excluded
  from deterministic parsing to avoid brittle prose matching.
- 2026-09-22: Status markers mentioned inside inline code or fences must not count as plan status
  declarations; code segments are stripped before link and plan-status extraction, and before
  roadmap/stage-index parsing.
- 2026-09-22: The plan-status parser was hardened after review to classify only the first
  non-empty line of the `## Status` block, so later prose in the block (for example "final
  completion pending") cannot flip the declared status.
- 2026-09-22: Proportionate four-discipline reviews found no material finding. Minor follow-ups
  applied in this plan: singular-ExecPlan pointer wording in root `AGENTS.md`, adding
  `CONTRIBUTING.md` to the governance control-surface lists, and three added self-test fixtures
  (reverse missing-stage direction, bold `**Status:**` branch, missing active-ExecPlan reference)
  plus a fenced-roadmap-row fixture.
- 2026-09-22: Live negative fixtures were exercised end-to-end: a broken markdown link, a
  ROADMAP/STAGE-INDEX status mismatch, and a COMPLETE plan under `active/` each failed
  `pnpm verify:docs` with the expected rule ID, and the tree was restored afterward.
- 2026-09-22: Round-2 code review of the checker reported five P2 defects, all fixed and
  re-verified: (1) ACTIVE stages now must cite an existing `**Active ExecPlan:**` path that lives
  under `docs/exec-plans/active/` and declares ACTIVE (previously only cited paths were
  existence-checked, so a missing citation or a `completed/` citation passed); (2) roadmap parsing
  for stage sections and ExecPlan references now strips code fences first, so fenced
  `**Active ExecPlan:**`/stage examples are not live metadata; (3) inline-code stripping now uses a
  run-aware scanner so multi-backtick spans are removed intact (the reference check strips fences
  only, because the reference path itself is written in single backticks); (4) link and ExecPlan
  targets resolving outside the repository are rejected before any existence/read check; (5)
  duplicate stage declarations in ROADMAP.md and STAGE-INDEX.md are reported instead of silently
  overwriting the first status. Live negative fixtures for each fix failed with the expected
  message and the tree was restored; self-test covers all five plus escape (`/etc/passwd`,
  `../../`), duplicate-row, no-citation, wrong-location, and fenced-example cases.
- 2026-09-22: Markdown link scanning is intentionally bounded to `rootMarkdownFiles`
  (`AGENTS.md`, `CONTRIBUTING.md`, `README.md`) plus `markdownScanDirectories` (`docs/`,
  `.github/`) — a temporary root-level fixture file outside that list is not scanned, which is
  why live escape-link fixtures must be appended to a whitelisted file.
- 2026-09-22: A live negative fixture on `CONTRIBUTING.md` was cleaned up with
  `git checkout -- CONTRIBUTING.md`, which reverted uncommitted hardening changes (risk-based
  review, governance/control-surface rule, audit-authority note, `verify:docs` row). The exact
  prior content was recovered from the Codex round-1 review session read output
  (`~/.codex/sessions/2026/09/22/rollout-2026-09-22T14-15-27-*.jsonl`) and restored byte-for-byte;
  prettier, `verify:fast`, `verify:invariants`, `verify:full`, and `agent:doctor` all re-passed.
  Lesson: clean up negative fixtures with a saved copy or targeted edit — never `git checkout` a
  tracked file that has uncommitted intended changes.
- 2026-09-22: Round-3 review found additional parser, verification-wiring, and filesystem
  containment gaps. `verify:full` now requires and runs both invariant and documentation checks;
  its fail-closed self-test uses the production full-mode script definitions. Markdown parsing now
  handles mixed/long fences and multiline code spans; Stage, status, and Active ExecPlan metadata
  reject duplicate or conflicting declarations. Canonical paths are validated for governed source
  files, roots, links, status files, and plans, including dangling symlinks. File size, aggregate
  bytes, file count, traversal depth/entries, and referenced-plan processing are bounded; repeated
  canonical plan references reuse cached placement results. Regression fixtures cover these paths.
  Root `AGENTS.md` is 99 lines; `CONTRIBUTING.md` now points to its canonical audit-authority rule.
- 2026-09-22: H-05 verification reran successfully: targeted documentation self-test,
  `pnpm verify:fast`, `pnpm verify:invariants`, `pnpm verify:full` (including `verify:docs` and
  Prettier), `pnpm agent:doctor`, and `git diff --check`. `verify:full` still reports that no general
  `test` script is configured. Focused independent product-integrity, architecture,
  security/privacy, and test reviews were completed; follow-up findings were fixed and returned to
  the relevant reviewer roles, with no unresolved material findings. The plan remains ACTIVE; no
  stage activation or closure was inferred.

## Decision log

| Date | Entry | Authority status |
| --- | --- | --- |
| 2026-09-22 | Create this bounded hardening plan independent of Stage 2 product/content work | Task instruction; no product, architecture, or stage-status authority exercised |
| 2026-09-22 | Wire `verify:docs` into `verify:full` as a third deterministic check family alongside product invariants | Bounded repository tooling under existing verification patterns; no new CI job or permission |

## Completion criteria

- Root `AGENTS.md` exposes current state, workflow, verification, autonomy tiers, and handoff
  guidance while staying compact and preserving existing guardrails.
- `CONTRIBUTING.md` defines the risk-based review model and governance-surface rule without
  weakening existing high-risk requirements.
- `pnpm verify:docs` self-test and repository check pass; malformed fixtures fail as designed.
- `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, and `pnpm verify:full` pass
  and are recorded truthfully.
- Proportionate independent reviews report no unresolved material finding.
- Stage 2 remains governed by its own ExecPlan; Stage 3 remains PLANNED; no Product Vision change;
  no Product Contract meaning change; no new architecture decision.
