# Yway Agent Instructions

Yway is a youth-first career discovery and growth product for people in Myanmar,
initially ages 18–25. This file applies repository-wide. Put specialized guidance in a
nested `AGENTS.md`; local guidance must not weaken product, privacy, or safety rules.

## Sources of truth

When sources conflict, use this order:

1. `docs/product/PRODUCT_VISION.md`
2. `docs/product/PRODUCT_CONTRACTS.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/decisions/` — only `ACCEPTED` decisions are binding
5. `docs/exec-plans/`
6. Platform Build Report — advisory only

Do not modify `PRODUCT_VISION.md` without explicit owner instruction. Chat is task context,
not durable product authority.

## Product guardrails

Read the exact applicable contracts before changing product behavior. In particular:

- Career exploration must come before choice; guidance stays reversible. Never create
  career-fit, employability, candidate-quality, or equivalent scores or rankings
  (`YWAY-P001`, `YWAY-P004`, `YWAY-P005`, `YWAY-E006`).
- Keep signal types and evidence levels distinct. Exploration is not Practice or Verified
  Assessment (`YWAY-P006`, `YWAY-P007`, `YWAY-E002`).
- The core journey must work without employers, and first value must not require login.
  Public access is 18+; any 16–17 pathway requires separately reviewed safeguarding and
  consent before shipping
  (`YWAY-P010`–`YWAY-P012`).
- Profiles and portfolios are private and have no public URL. Sharing must be explicit and
  purpose-specific. A Quest is not an application and must not create candidate status or
  employer access to private youth data (`YWAY-P014`–`YWAY-P018`, `YWAY-E001`, `YWAY-E003`,
  `YWAY-E004`).
- Preserve content provenance and the practitioner review gate (`YWAY-P019`, `YWAY-E005`).
- Offline-supported youth work must survive synchronization (`YWAY-P022`).

## Architecture and decisions

- Read `docs/architecture/ARCHITECTURE.md` before changing domain, privacy, sync, or physical
  architecture boundaries.
- Logical domains do not imply packages, services, apps, or databases.
- Unresolved product questions require explicit owner authority and an update to the canonical
  product documents.
- Significant architecture or technology choices require the appropriate architecture update
  and, when applicable, an `ACCEPTED` decision using `docs/decisions/000-TEMPLATE.md`.
- `YWAY-D001` accepts the repository tooling only; app, framework, database, auth, and sync
  choices remain undecided.

## Working agreement

- Read the relevant contracts, active ExecPlan, architecture sections, and accepted decisions.
- Multi-step work requires an ExecPlan; trivial edits do not.
- Make the smallest bounded change, preserve user work, and update tests and docs when needed.
- Follow repository TypeScript, ESLint, Prettier, and EditorConfig configuration.
- Never claim a check or review passed unless it ran. Report failures and skipped checks.
- Keep shared rules here or in canonical docs, not in tool-specific reviewer adapters.

## Setup and verification

Requires Node.js 24 and pnpm 11.24.0.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm agent:doctor
```

- `pnpm verify:fast` — lint and typecheck during work.
- `pnpm verify:full` — lint, typecheck, formatting, configured tests, and invariants before
  handoff; it does not replace `agent:doctor`.
- `pnpm verify:invariants` — structural guardrails only; it does not prove semantic, privacy,
  authorization, consent, offline, accessibility, or localization correctness.

## Review

Follow `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md`. After the change is stable,
use the relevant product-integrity, architecture, security/privacy, and test reviewers from
`.agents/skills/`, `.codex/agents/`, or `.opencode/agents/`.
