# Yway — Agent Instructions

## Project

Yway is a youth-first career discovery and growth ecosystem for Myanmar,
primarily for ages 18–25.

The product helps young people try realistic parts of work before making
career decisions, then reflect, choose reversible directions, learn,
practice, build evidence, and optionally access opportunities.

This is a long-term production project, not a throwaway MVP.

## Authority

Use this order when sources disagree:

1. `docs/product/PRODUCT_VISION.md` — highest product authority
2. `docs/product/PRODUCT_CONTRACTS.md` — stable product contracts
3. `docs/architecture/ARCHITECTURE.md` — logical domain boundaries and architectural invariants
4. `docs/decisions/` — only ACCEPTED decisions are binding
5. `docs/exec-plans/` — task execution plans
6. Platform Build Report — advisory only

Higher authority wins. ARCHITECTURE.md cannot override Product Contracts or Product Vision.

Do not modify `PRODUCT_VISION.md` unless the project owner explicitly asks.

## Architecture Guidance

Read `docs/architecture/ARCHITECTURE.md` before changing domain boundaries, privacy
boundaries, synchronization assumptions, or physical architecture.

- Logical domain does NOT imply package, service, app, or database.
- Provisional architecture hypotheses in ARCHITECTURE.md are non-binding.
- Candidate technologies are not adopted until an ACCEPTED decision record says so.

## Critical Product Rules

Read the relevant contract IDs before changing product behavior.

High-risk rules include:

- Try before choosing — `YWAY-P001`
- Guidance is reversible; no deterministic career verdict — `YWAY-P004`
- No career-fit, employability, hidden candidate, or equivalent scoring — `YWAY-P005`, `YWAY-E006`
- Signal types remain separate — `YWAY-P006`
- Exploration ≠ Practice ≠ Verified Assessment — `YWAY-P007`
- Youth value must work without employers — `YWAY-P010`
- First value without mandatory login — `YWAY-P011`
- Public access is 18+; 16–17 requires separate safeguarding review — `YWAY-P012`
- Private portfolio; no public URL — `YWAY-P014`
- Sharing is explicit and purpose-specific — `YWAY-P015`, `YWAY-P016`
- Employer Quest ≠ Employment Application — `YWAY-P017`
- Employers cannot access private youth data — `YWAY-P018`, `YWAY-E001`
- Content provenance and practitioner review gate must be preserved — `YWAY-P019`
- Offline-supported youth work must not be lost during sync — `YWAY-P022`

For the complete rules, read:
`docs/product/PRODUCT_CONTRACTS.md`.

## Decision Discipline

Separate product requirements from implementation choices.

Do not adopt a technology because it appears in the Build Report.

Use `docs/decisions/000-TEMPLATE.md` for significant architecture or
technology decisions.

- Only ACCEPTED decision records are binding.
- PROPOSED, DEFERRED, REJECTED, and SUPERSEDED records are not active choices.
- YWAY-D001 (`docs/decisions/001-foundation-tooling.md`) is the accepted Stage 0 foundation tooling decision.
- Future app, database, auth, sync, and framework choices remain undecided unless a future ACCEPTED record exists.

Do not silently resolve unresolved product decisions.

## Working Method

For each task:

1. Read this file.
2. Read the relevant Product Contract IDs.
3. Read the active ExecPlan.
4. Read relevant architecture and ACCEPTED decisions when they exist.
5. Make the smallest bounded change.
6. Run required verification when available.
7. Update the ExecPlan and affected documentation.
8. Leave the repository in a reviewable state.

Multi-step work requires an ExecPlan.

Chat history is not a source of truth.

## Context Hygiene

- Read only the relevant contract IDs and document sections; use targeted search
  before loading a whole authoritative document.
- Keep command and tool output bounded. Do not print entire documents, logs,
  generated files, or dependency inventories when a focused excerpt is enough.
- Batch related read-only checks when that does not obscure failures.
- Start a fresh session between unrelated tasks and after a large completed
  review cycle rather than carrying unrelated history forward.
- Run the coordinated PR review after the change set is stable. Give reviewers
  the diff, changed files, relevant contract/decision IDs, and minimal task
  context; use focused follow-ups instead of spawning duplicate review rounds.

## Do Not

Do not:

- weaken or bypass Product Contracts
- invent product requirements
- introduce prohibited scoring or ranking
- mix evidence levels
- create candidate status from browsing, exploration, or Quest completion
- expose private youth data to employers
- create public portfolio URLs
- bypass consent boundaries
- create speculative app/package architecture
- adopt unvalidated technologies
- claim tests or verification passed unless they were actually run
- hide failures, uncertainty, or unresolved risks

## Repository Map

- Root package, pnpm, TypeScript, ESLint, Prettier, editor, and Git files define
  the development toolchain and repository commands.
- `docs/product/` — Product Vision and Contracts
- `docs/architecture/`, `docs/decisions/`, `docs/roadmap/` — Architecture,
  accepted choices, and stage direction
- `docs/exec-plans/` — Active and completed execution plans
- `.codex/agents/`, `.opencode/agents/`, `.agents/skills/` — Reviewer adapters
  and shared reusable skills
- `scripts/` — Verification scripts
- `.github/` — Issue templates and CI workflows

## Agent Harness

Tool-specific reviewer adapters:

- Codex: `.codex/agents/*.toml`
- OpenCode: `.opencode/agents/*.md`

Shared reusable Yway skills:

- `.agents/skills/*/SKILL.md`

Shared project rules live in AGENTS.md and authoritative docs, not inside
tool-specific agent definitions.

Do not assume an agent or skill exists until its Stage 0 step creates it.

## Verification

- `pnpm agent:doctor` — Check environment readiness.
- `pnpm verify:fast` — Run lint and typecheck.
- `pnpm verify:full` — Run all currently implemented checks. Tests and product-invariant
  verification are included automatically once their package scripts exist.
- `pnpm verify:invariants` — Run structural product guardrails only; this is not proof of
  semantic, authorization, consent, privacy, offline, accessibility, or localization correctness.

Never claim a check passed unless it was actually executed.
