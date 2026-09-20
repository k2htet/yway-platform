# Codex Remote Skill Discovery Fix

## Status

Completed — 2026-09-20.

## Purpose and outcome

Correct the token-efficiency setup after a fresh-session audit showed that six
remote plugin packs still inject 91 skills even though repository-local plugin
flags mark them disabled.

## Relevant Product Contracts

None. This changes developer tooling only and does not affect product behavior.

## Current state and target state

- Current: the desktop session exposes 99 skills: 5 system, 3 Yway, and 91 from
  Expo, Figma, Notion, Plugin Management, Product Design, and Vercel.
- Target: five removable remote plugins are no longer installed and the sixth
  installed-by-default plugin's skill is suppressed, leaving the 5 system and 3
  Yway skills in a fresh Yway session.

## Scope and non-goals

- Remove the five removable remote plugins and suppress Plugin Management's
  single skill because the service does not allow uninstalling that plugin.
- Remove misleading repository-local overrides for those remote plugins.
- Preserve GitHub, GitLab, OpenAI Templates, Sites, local artifact plugins, and
  the Node REPL configuration.
- Do not change product, architecture, or application behavior.

## Ordered implementation steps

1. Confirm remote plugin state and the limits of repository-local overrides.
2. Remove the five removable plugins through the supported Codex CLI and
   suppress the installed-by-default Plugin Management skill in user config.
3. Correct repository configuration and the prior audit record.
4. Verify plugin state, prompt rendering, formatting, and repository checks.
5. Record the result and move this plan to completed.

## Affected files and domains

- Codex account plugin installation state
- `/home/thz/.codex/config.toml` (user-level, not version-controlled)
- `.codex/config.toml`
- `docs/exec-plans/completed/CODEX-TOKEN-EFFICIENCY.md`
- This ExecPlan

No product logical domain is affected.

## Validation strategy

- `codex plugin list --json` with remote catalog access
- `codex debug prompt-input "test"` with bounded skill-count inspection
- `pnpm agent:doctor`
- `pnpm verify:full`
- Fresh desktop session audit after Codex restart

## Cross-cutting implications

- Privacy/security: removing unused connectors reduces available external tool
  surface; no user or product data is changed.
- Offline, localization, accessibility: no product impact.

## Risks

- Removed plugins become unavailable in other repositories for this account.
  They can be reinstalled individually with `codex plugin add` when needed.
- Plugin Management may be installed by default and could be restored by the
  service; the final remote catalog check will make that limitation explicit.
- The Plugin Management skill override uses its absolute, versioned cache path.
  A plugin update can invalidate that path and requires the user config entry to
  be refreshed and the skill-count checks rerun.

## Progress checklist

- [x] Reproduce and diagnose the mismatch.
- [x] Remove the five removable remote plugins and suppress the remaining
  installed-by-default skill.
- [x] Correct repository configuration and documentation.
- [x] Run validation.
- [x] Record completion and close the plan.

## Discoveries log

- 2026-09-20: With network access, `codex plugin list --json` reports all six
  remote plugins enabled even though `.codex/config.toml` sets them false.
- 2026-09-20: Official plugin documentation describes repository overrides for
  plugins from a repository-local marketplace; it does not establish that those
  overrides control account-installed remote marketplace plugins.
- 2026-09-20: An explicit CLI config override likewise leaves Vercel's remote
  plugin enabled, confirming the local flag is not an effective control.
- 2026-09-20: The service removed Expo, Figma, Notion, Product Design, and
  Vercel. Plugin Management returned 403 because installed-by-default plugins
  cannot be uninstalled; its single skill is now disabled in user configuration.

## Decision log

- 2026-09-20: Use supported account-level plugin removal for the five removable
  packs. For installed-by-default Plugin Management, use the documented
  user-level `[[skills.config]]` mechanism for its single cached skill path.

## User-level Plugin Management exception

The service does not allow this installed-by-default plugin to be uninstalled.
The current machine therefore contains this non-version-controlled entry in
`/home/thz/.codex/config.toml`:

```toml
[[skills.config]]
path = "/home/thz/.codex/plugins/cache/openai-curated-remote/plugin-management/0.1.0/skills/plugin-management/SKILL.md"
enabled = false
```

On a new workstation or after a Plugin Management update, locate the current
`plugin-management/<version>/skills/plugin-management/SKILL.md` below the Codex
plugin cache, replace the entry's absolute path, restart Codex, then rerun both
the bounded `codex debug prompt-input "test"` skill count and a fresh desktop
session catalog audit. The expected count for Yway is 8.

## Completion result

- Expo, Figma, Notion, Product Design, and Vercel were removed from the remote
  catalog for this account.
- Plugin Management could not be removed because the service marks it
  installed-by-default; its single skill is disabled in user configuration.
- `codex debug prompt-input "test"` reports 8 active skills.
- `pnpm agent:doctor` reports `READY` under the required Node v24.20.0.
- `pnpm verify:full` passes lint, typecheck, formatting, and structural product
  invariant checks. No test script is configured yet.
- The live desktop session catalog reloaded after the account changes and now
  exposes exactly 8 skills: 5 system and 3 Yway.
- One coordinated four-discipline review completed. Product integrity and
  security/privacy reported no findings; architecture and testing documentation
  findings were corrected and rechecked with no material findings remaining.

## Completion criteria

- [x] Remote catalog no longer reports the five removable plugins installed;
  Plugin Management's documented service restriction is recorded.
- [x] Effective CLI prompt contains 8 active skills.
- [x] Live desktop session exposes 8 active skills.
- [x] Repository configuration no longer claims remote flags disable the packs.
- [x] Required repository verification passes.
