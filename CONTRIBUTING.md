# Contributing to Yway

## Workflow

1. Read [`AGENTS.md`](AGENTS.md).
2. Identify the relevant `YWAY-Pxxx` and `YWAY-Exxx` contracts in [`docs/product/PRODUCT_CONTRACTS.md`](docs/product/PRODUCT_CONTRACTS.md).
3. Use or update an ExecPlan for multi-step work.
4. Create a task branch and, when appropriate, a task worktree.
5. Make the smallest bounded change that satisfies the task.
6. Run the relevant verification commands and record their actual results.
7. Use the product integrity, architecture, security/privacy, and test reviewer roles when relevant.
8. Open a pull request using [the repository template](.github/PULL_REQUEST_TEMPLATE.md).
9. Merge only after the required checks pass and required review is complete.

Follow the repository's EditorConfig, Prettier, ESLint, and TypeScript configuration. Do not claim verification passed unless it actually ran and passed.

## Branches and worktrees

Use a short branch name in this form:

```text
<domain-or-concern>/<type>/<short-description>
```

For example: `foundation/docs/contributor-guide`.

A worktree per task is recommended for substantial agentic work, but is not required for trivial edits. Assign one primary writer to each task/worktree. Parallel reviewer or read-only agents are allowed; avoid multiple agents writing concurrently in the same worktree.

## Risk-based review

Not every change needs the same ceremony. Apply the highest tier that fits the change; these tiers
do not weaken the requirements for high-risk changes.

### Low-risk / reversible

Examples: typo or formatting changes, small refactors, local implementation detail, tests that
preserve existing behavior.

Expected process: author verification, CI, and proportionate review. Full discipline review is not
required.

### Product-semantic / governance-sensitive

Examples: Product Contracts, stage-status changes, `AGENTS.md` files, product-behavior rules.

Expected process: independent product-integrity review, plus owner awareness or approval where
existing authority requires it (see below).

### Architecture / privacy / security significant

Examples: ADRs, authentication/authorization, consent or data boundaries, employer access paths,
physical system boundaries.

Expected process: the applicable independent discipline reviews, the explicit ADR flow where
required, and owner acceptance where authority requires it.

## Verification

| Command                  | Meaning                                      |
| ------------------------ | -------------------------------------------- |
| `pnpm agent:doctor`      | Check environment readiness.                 |
| `pnpm verify:fast`       | Run lint and type checking.                  |
| `pnpm verify:full`       | Run all currently implemented checks.        |
| `pnpm verify:invariants` | Run structural product guardrails only.      |
| `pnpm verify:docs`       | Run documentation/status consistency checks. |

Structural invariant checks are not proof of semantic behavior, privacy, authorization, consent, offline preservation, accessibility, or localization correctness. Those concerns require review and appropriate future tests.

## Product and architecture governance

- Product Vision changes require explicit instruction from the project owner.
- Significant architecture or technology choices require a decision record based on [`docs/decisions/000-TEMPLATE.md`](docs/decisions/000-TEMPLATE.md).
- Only decisions with `ACCEPTED` status are binding.
- Do not silently resolve unresolved product decisions.
- Use canonical documents by reference; do not create competing copies of product rules or architecture decisions.
- Follow the canonical audit-authority rule in `AGENTS.md`; do not infer product rules from audit
  recommendations.

## Governance and control-surface changes

Changes touching these control surfaces require independent review, so an implementing agent cannot
weaken its own guardrails to make work pass:

- root or nested `AGENTS.md` and `CONTRIBUTING.md`
- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- ADR status or decision changes
- product-invariant and verification scripts
- CI workflow definitions

Distinguish three obligations:

- **Independent review** — always required for a change to the surfaces above.
- **Owner awareness** — surface the change to the owner in the pull request or issue.
- **Owner approval** — required only where existing authority already requires it (Product Vision
  changes, Product Contract meaning, stage activation/closure, ADR acceptance, public release).

A documentation typo or formatting fix does not require owner approval.

## Review and pull requests

Codex reviewer adapters live in `.codex/agents/*.toml`, OpenCode reviewer adapters in `.opencode/agents/*.md`, and shared review skills in `.agents/skills/*/SKILL.md`. Use the roles relevant to the change and report their evidence in the pull request template.

GitHub Actions CI exists, is live, and currently passes. The repository is public by owner decision, and `main` protection is active: pull requests and the `Verify` check are required, conversations must be resolved, and force pushes and branch deletion are disabled. Stage 0 and Stage 1 are COMPLETE. Stage 2 is ACTIVE under issue #32; contributors should follow `docs/exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md` and its bounded S2 issues. Stage 3 remains PLANNED until separately activated.
