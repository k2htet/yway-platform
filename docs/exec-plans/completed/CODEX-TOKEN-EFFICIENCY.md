# Codex Token Efficiency

## Status

Completed — 2026-09-20.

## Purpose and outcome

Reduce Yway's fixed Codex context and repeated review cost without weakening the
project's product, architecture, privacy, or testing review disciplines.

## Relevant Product Contracts

None. This is development-tooling configuration and does not change product
behavior. YWAY-D001 remains the relevant accepted tooling decision.

## Current state and target state

- Current: Yway sessions expose 106 skills, including large packs that are not
  needed for current repository work; routine sessions inherit high reasoning
  effort; review guidance permits repeated broad document reads and duplicate
  reviewer cycles.
- Target: unused local plugins are disabled for Yway, unused remote plugin packs
  are removed from the Codex account, routine reasoning uses medium effort, and
  review work uses one scoped four-discipline cycle with focused follow-ups.

## Scope and non-goals

- Keep repository settings project-local where Codex supports that scope. Remote
  marketplace plugins require account-level removal to stop skill injection.
- Tighten context hygiene in shared project instructions and reviewer guidance.
- Preserve all four reviewer roles and authority ordering.
- Do not change Product Vision, Product Contracts, application architecture, or
  future technology decisions.

## Ordered implementation steps

1. Add project-local Codex plugin/MCP restrictions and medium reasoning effort.
2. Add concise context-hygiene rules to `AGENTS.md`.
3. Scope the shared PR-review workflow and keep Codex/OpenCode reviewer semantics
   aligned.
4. Validate configuration parsing, agent harness readiness, formatting, lint,
   type checking, and structural invariants.
5. Record results and close this plan.

## Affected files and domains

- `.codex/config.toml`
- `AGENTS.md`
- `.agents/skills/yway-pr-review/SKILL.md`
- This ExecPlan

No product logical domain is affected.

## Validation strategy

- `codex plugin list --json`
- `codex mcp list`
- `codex debug prompt-input "test"` with bounded skill-count inspection
- `pnpm agent:doctor`
- `pnpm verify:full`
- Confirm Codex/OpenCode reviewer guidance remains semantically aligned.
- Confirm the worktree contains only intended changes.

## Cross-cutting implications

- Privacy/security: no product or user data behavior changes.
- Offline: no product sync behavior changes.
- Localization/accessibility: no user interface changes.

## Risks

- A removed remote capability may be needed for a future task. Mitigation: each
  plugin can be reinstalled deliberately with `codex plugin add`.
- Plugin Management is installed by default and cannot be uninstalled.
  Mitigation: suppress its single skill with a documented user-level
  `[[skills.config]]` entry.

## Unresolved questions

None blocking.

## Progress checklist

- [x] Audit current token and skill usage.
- [x] Add project-local Codex restrictions.
- [x] Add context-hygiene rules.
- [x] Scope reviewer workflow and align adapters.
- [x] Run validation.
- [x] Record completion and move this plan to completed.

## Discoveries log

- 2026-09-20: Current sessions expose 106 skills; 90 come from Vercel, Figma,
  Expo, Product Design, and Notion packs. They are not needed for the current
  stage; several correspond to technology/design choices explicitly deferred by
  YWAY-D001.
- 2026-09-20: Recent telemetry is dominated by cached context replay and repeated
  reviewer/tool calls rather than generated output.
- 2026-09-20: Codex CLI 0.155.1 does not support `--strict-config` for the
  `plugin` subcommand; supported listing and prompt-render diagnostics provide
  the applicable configuration evidence.
- 2026-09-20: `codex plugin list --json` could not refresh the remote catalog
  because network access was unavailable, but it successfully resolved all nine
  locally installed plugins as disabled. The model-visible prompt renderer is
  the stronger end-state check for remote skill-pack exclusion.
- 2026-09-20: A true fresh desktop session still exposed 99 skills. With remote
  catalog access, the CLI confirmed that project `[plugins]` flags did not
  disable account-installed remote marketplace plugins.
- 2026-09-20: Expo, Figma, Notion, Product Design, and Vercel were uninstalled
  from the Codex account. Plugin Management returned 403 because installed-by-
  default plugins cannot be uninstalled, so its single skill was disabled in
  the user Codex configuration instead.

## Decision log

- 2026-09-20: Use repository-local restrictions for local plugins. Use supported
  account-level removal for unused remote plugins because project flags do not
  control their skill discovery in the desktop session.
- 2026-09-20: Preserve the four-discipline review gate; reduce duplicate cycles
  and broad context inheritance instead.

## Completion result

- `codex plugin list --json`: exit 0; 9 locally installed plugins found, 0
  enabled. A later network-enabled check confirmed the five removable remote
  skill packs were uninstalled. Plugin Management remains installed by default,
  with its skill separately disabled.
- `codex mcp list`: exit 0; Pencil is disabled and the core Node REPL remains
  enabled.
- `codex debug prompt-input "test"`: exit 0; 8 active skills and a 3,633-byte
  skill catalog, down from 106 skills and approximately 22.2 KB.
- `pnpm agent:doctor`: exit 0 (`READY`).
- `pnpm verify:full`: exit 0; lint, typecheck, formatting, and structural
  invariant checks passed; no test script is configured yet.
- One coordinated four-discipline review ran after verification. Product and
  architecture LOW findings were corrected and rechecked; security/privacy had
  no findings; test review confirmed the supported validation strategy and its
  stated coverage limit.
- A running Codex session retains its startup catalog. Restart Codex before the
  next Yway task so the compact project configuration becomes active.

## Completion criteria

- [x] Project Codex configuration parses successfully and reports local plugins
  as disabled.
- [x] Shared instructions require bounded reads and outputs.
- [x] Reviewer adapters remain read-only and semantically aligned across tools.
- [x] Required verification passes.
