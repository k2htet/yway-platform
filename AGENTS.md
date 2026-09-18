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
3. `docs/architecture/ARCHITECTURE.md` — architecture authority when created
4. `docs/decisions/` — only ACCEPTED decisions are binding
5. `docs/exec-plans/` — task execution plans
6. Platform Build Report — advisory only

Higher authority wins.

Do not modify `PRODUCT_VISION.md` unless the project owner explicitly asks.

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

PROPOSED and DEFERRED decisions are not adopted choices.

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

Verification tooling is added in Stage 0 Step F1.

Planned concepts:

- `agent:doctor`
- fast verification
- full verification
- product invariant verification
