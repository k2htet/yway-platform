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

| Command                  | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `pnpm verify:fast`       | Run lint and type checking.                  |
| `pnpm verify:full`       | Run all currently implemented checks.        |
| `pnpm verify:invariants` | Run structural product guardrails only.      |
| `pnpm verify:docs`       | Run documentation/status consistency checks. |

Structural invariant checks do not prove semantic, privacy, authorization, consent, offline, accessibility, or localization correctness.

## Where to start

1. Read root [`AGENTS.md`](AGENTS.md).
2. Check the [Stage Index](docs/roadmap/STAGE-INDEX.md) for current stage and status.
3. Read only affected authority sections: [Product Vision](docs/product/PRODUCT_VISION.md) and
   [Product Contracts](docs/product/PRODUCT_CONTRACTS.md) for product behavior changes;
   [Architecture](docs/architecture/ARCHITECTURE.md) and applicable
   [ADRs](docs/decisions/) for architecture decisions; the relevant
   [active ExecPlan](docs/exec-plans/active/) for current complex work.
4. Follow [`CONTRIBUTING.md`](CONTRIBUTING.md) for workflow and review rules.

## Codex and OpenCode support

- Codex reviewer adapters: `.codex/agents/*.toml`
- OpenCode reviewer adapters: `.opencode/agents/*.md`
- Shared reusable skills: `.agents/skills/*/SKILL.md`

The Platform Build Report is advisory only. It does not override the repository's authoritative product, architecture, or accepted decision documents.
