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

## Verification

| Command                  | Meaning                                 |
| ------------------------ | --------------------------------------- |
| `pnpm agent:doctor`      | Check environment readiness.            |
| `pnpm verify:fast`       | Run lint and type checking.             |
| `pnpm verify:full`       | Run all currently implemented checks.   |
| `pnpm verify:invariants` | Run structural product guardrails only. |

Structural invariant checks are not proof of semantic behavior, privacy, authorization, consent, offline preservation, accessibility, or localization correctness. Those concerns require review and appropriate future tests.

## Product and architecture governance

- Product Vision changes require explicit instruction from the project owner.
- Significant architecture or technology choices require a decision record based on [`docs/decisions/000-TEMPLATE.md`](docs/decisions/000-TEMPLATE.md).
- Only decisions with `ACCEPTED` status are binding.
- Do not silently resolve unresolved product decisions.
- Use canonical documents by reference; do not create competing copies of product rules or architecture decisions.

## Review and pull requests

Codex reviewer adapters live in `.codex/agents/*.toml`, OpenCode reviewer adapters in `.opencode/agents/*.md`, and shared review skills in `.agents/skills/*/SKILL.md`. Use the roles relevant to the change and report their evidence in the pull request template.

GitHub Actions CI exists, is live, and currently passes. The repository is public by owner decision, and `main` protection is active: pull requests and the `Verify` check are required, conversations must be resolved, and force pushes and branch deletion are disabled. Stage 0 is COMPLETE. Stage 1 is ACTIVE and contributors should follow the active Stage 1 ExecPlan and associated GitHub Issues. Stage 2 remains PLANNED until Stage 1 completion.
