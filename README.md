# Yway

Yway is a youth-first career discovery and growth ecosystem for Myanmar, primarily for people ages 18–25. This is its production engineering repository.

## Prerequisites

- Node.js 24
- pnpm 11.24.0, as declared by `packageManager` in `package.json`

## Setup

```sh
git clone git@github.com:k2htet/yway-platform.git
cd yway-platform
pnpm install --frozen-lockfile
pnpm agent:doctor
```

## Verification

| Command                  | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `pnpm verify:fast`       | Run lint and type checking.             |
| `pnpm verify:full`       | Run all currently implemented checks.   |
| `pnpm verify:invariants` | Run structural product guardrails only. |

Structural invariant checks do not prove semantic, privacy, authorization, consent, offline, accessibility, or localization correctness.

## Where to start

Read these sources in order before making changes:

1. [`AGENTS.md`](AGENTS.md)
2. [Product Vision](docs/product/PRODUCT_VISION.md)
3. [Product Contracts](docs/product/PRODUCT_CONTRACTS.md)
4. [Architecture](docs/architecture/ARCHITECTURE.md)
5. [Completed Stage 0 ExecPlan](docs/exec-plans/completed/STAGE-0-AGENTIC-FOUNDATION.md)

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the working and review process.

## Codex and OpenCode support

- Codex reviewer adapters: `.codex/agents/*.toml`
- OpenCode reviewer adapters: `.opencode/agents/*.md`
- Shared reusable skills: `.agents/skills/*/SKILL.md`

The Platform Build Report is advisory only. It does not override the repository's authoritative product, architecture, or accepted decision documents.
