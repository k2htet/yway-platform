# Decision: Foundation Tooling for Stage 0

## Metadata

- ID: YWAY-D001
- Date: 2026-09-18
- Status: ACCEPTED
- Owners: Yway engineering
- Related ExecPlan: docs/exec-plans/completed/STAGE-0-AGENTIC-FOUNDATION.md (Step C1)
- Related Product Contracts: None — this is a development-environment decision only, not a product behavior decision.

## Context

Stage 0 requires initializing a repository that currently contains only documentation (Markdown files, git). No application code exists yet. Both OpenAI Codex and OpenCode agents must be able to enter this repository, install dependencies deterministically, run lint/format/typecheck scripts, and execute verification commands. The choices made here govern the development environment only — they do not constrain the future Yway application architecture or product stack. Build Report recommendations were considered as advisory input only, not as authority.

**Explicitly out of scope:** Expo, React Native, Next.js, databases, ORMs, sync engines, auth providers, deployment platforms, design tooling, analytics, CMS, application package boundaries, and any product-facing technology. These are recorded in the "Deferred" section below.

## Decision Drivers

- Reproducibility across fresh agent sessions (Codex and OpenCode)
- Cross-platform consistency (developer machines and CI)
- Minimum tooling needed for Stage 0 only (no speculative infrastructure)
- Compatibility with both Codex CLI and OpenCode agent harnesses
- Low configuration burden and operational complexity
- Reversibility (choices should be easy to change if evidence demands it)

## Options Considered

### 1. Runtime

#### Option: Node.js LTS minimum version policy

- **Advantages:** Node.js is the runtime for the TypeScript/JavaScript toolchain used in this repository's scripts and development tooling. LTS releases receive security patches and long-term support. A major-version policy (`>=24 <25`) constrains the repository to a single LTS major, reducing cross-major behavioral variation. Future movement to Node 26 LTS should be an explicit environment upgrade, not happen silently because of a loose `>=` constraint.
- **Disadvantages:** Developers on older Node versions must upgrade. Constraining to one major version requires an explicit decision when a new LTS becomes appropriate.
- **Risks:** A future dependency may require a newer Node version than the declared range. This is mitigated by CI enforcement.
- **Validation evidence available:** Local environment confirmed Node.js v24.20.0 installed. Node 24 is the appropriate LTS baseline for a new long-lived repository starting in September 2026.
- **Unknowns:** Whether CI will use the same major version. Mitigated by specifying the range in `package.json` engines field.

#### Option: Exact Node.js version pinning (e.g., 22.x.y)

- **Advantages:** Maximum reproducibility. Every developer and CI run uses identical runtime behavior.
- **Disadvantages:** Brittle — requires updating the pin for every security patch. Creates busywork without proportional benefit at Stage 0's scale.
- **Risks:** Version drift between `.nvmrc`, `package.json` engines, and CI config if multiple pins exist.
- **Validation evidence available:** Not required at Stage 0 scale.
- **Unknowns:** None material.

#### Option: No Node.js standardization

- **Advantages:** Zero configuration.
- **Disadvantages:** Agents cannot reliably run scripts. CI behavior becomes unpredictable. Violates the reproducibility driver entirely.
- **Risks:** Broken verification commands, inconsistent TypeScript compilation.
- **Validation evidence available:** N/A — rejected as non-viable.
- **Unknowns:** None.

### 2. Repository Implementation Language

#### Option: TypeScript

- **Advantages:** Static type checking catches errors before runtime. Compatible with all likely Yway ecosystem candidates (Expo, Next.js, Node scripts). Cross-platform scripts via tsx or ts-node. Coding agents produce more reliable output with type information. Avoids language fragmentation if the future app also uses TypeScript. ESLint natively supports TypeScript via `typescript-eslint`.
- **Disadvantages:** Requires a build/execution step for scripts (tsx or compiled JS). Adds `typescript` as a devDependency. Slightly higher initial configuration than plain JavaScript.
- **Risks:** Over-engineering simple scripts. Mitigated by using TypeScript only where type safety adds value (verification scripts, invariant checks), not for trivial shell replacements.
- **Validation evidence available:** TypeScript is the dominant language in the Expo, Next.js, and Node.js ecosystems that the Build Report evaluates. Both Codex and OpenCode handle TypeScript fluently.
- **Unknowns:** Whether a future non-TypeScript surface (e.g., Python ML pipeline) would need separate tooling. That is outside Stage 0 scope.

#### Option: Plain JavaScript

- **Advantages:** No compilation step. Simpler initial setup.
- **Disadvantages:** No static checking. Agent-generated scripts lack type guardrails. Diverges from the likely future application language, creating two languages to maintain.
- **Risks:** Silent type errors in verification scripts could produce false-pass results.
- **Validation evidence available:** N/A.
- **Unknowns:** None material.

### 3. Package Manager

#### Option: pnpm via Corepack

- **Advantages:** Deterministic installs via strict lockfile (`pnpm-lock.yaml`). Content-addressable store reduces disk usage. Native workspace support for future monorepo needs. Strong CI performance. Corepack (v0.35.0 observed locally) provides version management without global installs — the `packageManager` field in `package.json` declares the exact pnpm version, and Corepack ensures it. Both Codex and OpenCode can run `pnpm` commands. Build Report recommends pnpm but this decision is based on independent evaluation, not deference.
- **Disadvantages:** Requires Corepack enablement or pnpm installation. Slightly different resolution semantics than npm (strict by default, which is actually a correctness advantage but can surprise developers used to npm's hoisting).
- **Risks:** Corepack behavior changes across Node versions. Mitigated by declaring the minimum Node version. If Corepack is unavailable in a CI image, pnpm can be installed via `npm install -g pnpm@<version>` as fallback.
- **Validation evidence available:** Local environment has pnpm 11.24.0 and Corepack 0.35.0. Both function correctly.
- **Unknowns:** Whether a future CI provider image includes Corepack by default. Most major providers (GitHub Actions, etc.) now include it.

#### Option: npm

- **Advantages:** Ships with Node.js. Zero additional setup. Lockfile (`package-lock.json`) is well understood.
- **Disadvantages:** Historically less strict dependency resolution than pnpm (phantom dependencies possible). Workspace support exists but is less mature. Slower installs on large dependency trees. No built-in content-addressable store.
- **Risks:** Phantom dependencies could mask import issues that later break in stricter environments. At Stage 0 scale, this risk is low but grows with project complexity.
- **Validation evidence available:** npm 11.19.0 observed locally. Functional.
- **Unknowns:** None material.

#### Option: Yarn

- **Advantages:** Plug-and-Play mode enforces strict resolution. Mature workspace support.
- **Disadvantages:** Additional tool to install and maintain. Yarn v1 and v3+ have incompatible behaviors. Community momentum has shifted toward pnpm. No material reason to prefer over pnpm for this project.
- **Risks:** Version confusion (classic vs berry). Smaller ecosystem alignment with Expo/React Native tooling compared to pnpm/npm.
- **Validation evidence available:** Not installed locally. Not evaluated further because no material advantage over pnpm was identified.
- **Unknowns:** N/A.

### 4. Task Runner

#### Option A: Package-manager scripts only

- **Advantages:** Zero additional dependencies. `package.json` scripts are universally understood by humans and agents. Sufficient for Stage 0 tasks (lint, typecheck, run scripts). No configuration overhead.
- **Disadvantages:** No cross-package task graph. No caching. Scripts must be manually orchestrated if multiple packages exist later.
- **Risks:** None at Stage 0. Risk emerges only when multiple real workspaces need coordinated builds.
- **Validation evidence available:** The current repository has zero application packages. There is nothing to orchestrate.
- **Unknowns:** Future package count.

#### Option B: Turborepo now

- **Advantages:** Parallel task execution. Caching. Cross-package dependency graph. Recommended by Build Report.
- **Disadvantages:** Requires `turbo.json` configuration. Adds a dependency with no current consumers. Configuration would be speculative since no packages exist. Increases cognitive load for agents entering the repo.
- **Risks:** Premature abstraction. Configuring Turborepo pipelines for hypothetical packages violates the "minimum boring foundation" principle. Could create false expectations about package structure.
- **Validation evidence available:** No application packages exist. Turborepo's value proposition requires multiple real workspaces.
- **Unknowns:** When and whether multiple packages will exist.

### 5. Linting

#### Option: ESLint with typescript-eslint (flat config)

- **Advantages:** Industry-standard linter for TypeScript/JavaScript. Flat config (`eslint.config.ts` or `eslint.config.mjs`) is the current supported approach — legacy `.eslintrc` is deprecated. Provides correctness rules (no unused vars, no implicit any, etc.). Agent-readable diagnostics (structured JSON output via `--format json`). Works in editors and CI identically. Extensible for future framework-specific rules without replacing the base.
- **Disadvantages:** Requires initial configuration. Flat config format is newer and some older guides reference `.eslintrc`.
- **Risks:** Configuration drift if team members add conflicting rules. Mitigated by keeping the config minimal and committed.
- **Validation evidence available:** ESLint v9+ flat config is the documented current approach per official ESLint docs. typescript-eslint v8+ supports flat config natively.
- **Unknowns:** None material.

#### Option: Biome as combined linter/formatter

- **Advantages:** Single tool for linting and formatting. Faster than ESLint + Prettier. Growing ecosystem.
- **Disadvantages:** Smaller rule set than ESLint. Plugin ecosystem is immature compared to ESLint. Some TypeScript-specific rules lag behind typescript-eslint. Agent familiarity may be lower.
- **Risks:** Missing a lint rule needed for product invariant enforcement. Having to fall back to ESLint later creates churn.
- **Validation evidence available:** Biome is viable but its TypeScript rule coverage is narrower than typescript-eslint as of mid-2026.
- **Unknowns:** Long-term rule completeness for Yway's specific needs.

#### Option: No linter

- **Advantages:** Zero configuration.
- **Disadvantages:** No automated correctness checks. Agents have no structured feedback mechanism. Violates the maintainability and agent-readability drivers.
- **Risks:** Silent bugs in verification scripts. Inconsistent code quality.
- **Validation evidence available:** N/A — rejected as non-viable.
- **Unknowns:** None.

### 6. Formatting

#### Option: Prettier

- **Advantages:** Deterministic formatting. Zero policy debate once configured. Integrates with ESLint via `eslint-config-prettier` to avoid conflicts. Supports Markdown, JSON, YAML, and TypeScript — all formats present in this repo. Editor and CI consistency.
- **Disadvantages:** Separate tool from linter. Requires `eslint-config-prettier` to prevent rule conflicts.
- **Risks:** None material. Prettier is stable and widely adopted.
- **Validation evidence available:** Prettier is the de facto standard for deterministic formatting in the TypeScript ecosystem.
- **Unknowns:** None.

#### Option: Biome (combined formatter/linter)

- **Advantages:** One tool instead of two. Faster execution.
- **Disadvantages:** Same limitations as described in the linting section. Formatting edge cases may differ from Prettier's well-tested behavior.
- **Risks:** Adopting Biome for formatting means committing to it for linting too, or running two formatters. Evaluated above under linting.
- **Validation evidence available:** See linting evaluation.
- **Unknowns:** See linting evaluation.

#### Option: ESLint formatting rules only (no dedicated formatter)

- **Advantages:** Fewer tools.
- **Disadvantages:** ESLint formatting rules are slower and less comprehensive than Prettier. The ESLint team itself recommends using a dedicated formatter. More configuration to achieve equivalent results.
- **Risks:** Incomplete formatting coverage. Agent time spent configuring formatting rules instead of writing product logic.
- **Validation evidence available:** ESLint documentation explicitly defers formatting to tools like Prettier.
- **Unknowns:** None.

### 7. Stage 0 Script Implementation

#### Option: TypeScript scripts executed via tsx

- **Advantages:** Cross-platform (works on Linux, macOS, Windows). Type-safe. Consistent with the repository language choice. `tsx` runs `.ts` files directly without a separate compile step. Suitable for `agent:doctor`, `verify:fast`, `verify:full`, `verify:invariants`. Both Codex and OpenCode can execute the scripts through Node's `--import tsx` hook without a compile step.
- **Disadvantages:** Requires `tsx` as a devDependency. Slightly more setup than a bash script.
- **Risks:** `tsx` ESM/CJS interop edge cases. Mitigated by using `"type": "module"` in `package.json`.
- **Validation evidence available:** tsx is actively maintained and widely used for exactly this purpose.
- **Unknowns:** None material.

#### Option: Bash scripts only

- **Advantages:** No dependencies. Fast execution.
- **Disadvantages:** Not cross-platform (Windows developers, some CI images). Harder for agents to generate reliably. No type safety. Complex string parsing is error-prone.
- **Risks:** Scripts fail on non-Linux developer machines. Violates the cross-platform driver.
- **Validation evidence available:** The ExecPlan explicitly prefers cross-platform scripts.
- **Unknowns:** None.

#### Option: Compiled TypeScript (tsc then node)

- **Advantages:** No runtime dependency on tsx.
- **Disadvantages:** Requires a build step before running scripts. Overkill for Stage 0. Adds complexity.
- **Risks:** Stale compiled output if build step is forgotten.
- **Validation evidence available:** N/A — unnecessary overhead for Stage 0.
- **Unknowns:** None.

### 8. Version Pinning Strategy

#### Option: Declared minimums + committed lockfile + Corepack packageManager field

- **Advantages:** `package.json` `engines` field declares minimum Node and pnpm versions. `pnpm-lock.yaml` is committed for deterministic installs. `packageManager` field enables Corepack to auto-provision the correct pnpm version. Dependencies use semver ranges (not exact pins) for flexibility, while the lockfile provides exactness. Fresh Codex/OpenCode sessions discover the expected environment via `engines` and `packageManager` fields — no README spelunking required.
- **Disadvantages:** Lockfile merge conflicts when branches diverge. Mitigated by regenerating rather than hand-editing.
- **Risks:** Developers ignoring the engines field. Mitigated by CI checking it.
- **Validation evidence available:** Corepack 0.35.0 on local machine supports `packageManager` field. pnpm 11.24.0 generates lockfiles correctly.
- **Unknowns:** None material.

#### Option: Exact pins everywhere

- **Advantages:** Maximum reproducibility.
- **Disadvantages:** Every security patch requires manual version bumps. Excessive toil for Stage 0.
- **Risks:** Dependency update fatigue leading to stale, insecure packages.
- **Validation evidence available:** N/A.
- **Unknowns:** None.

#### Option: No lockfile

- **Advantages:** No merge conflicts.
- **Disadvantages:** Non-deterministic installs. Different agents get different dependency trees. Violates the reproducibility driver entirely.
- **Risks:** "Works on my machine" failures in CI.
- **Validation evidence available:** N/A — rejected as non-viable.
- **Unknowns:** None.

## Decision

These are repository-development-environment choices. They are NOT product requirements and do not constrain the Yway application architecture.

### 1. Runtime

**Capability requirement:** A consistent JavaScript/TypeScript runtime available to all developers and CI.

**Implementation choice:** ACCEPTED — Node.js 24 LTS major version policy. The `engines` field in `package.json` will declare `"node": ">=24 <25"`. This constrains the repository to a single LTS major, reducing cross-major behavioral variation. Future movement to Node 26 LTS should be an explicit environment upgrade, not happen silently because of a loose `>=` constraint. An exact patch pin is unnecessary at Stage 0 scale.

### 2. Repository Implementation Language

**Capability requirement:** A typed language for repository scripts and tooling that coding agents can work with reliably.

**Implementation choice:** ACCEPTED — TypeScript for all Stage 0 scripts and repository tooling. This provides static checking, aligns with all likely future Yway ecosystem candidates, and avoids maintaining two languages.

### 3. Package Manager

**Capability requirement:** Deterministic, reproducible dependency installation across agent sessions and CI.

**Implementation choice:** ACCEPTED — pnpm as the package manager. The `packageManager` field in `package.json` will declare the exact pnpm version (e.g., `"packageManager": "pnpm@11.24.0"`). Corepack is used as the current provisioning mechanism for the accepted Node 24 environment to ensure any fresh session automatically uses the correct version. Corepack is not treated as a permanent Node platform guarantee; future Node-major upgrades may require an explicit pnpm/Corepack setup strategy. The `pnpm-lock.yaml` lockfile is committed.

This decision is based on pnpm's strict dependency resolution, native workspace support, content-addressable store, and CI suitability — not merely because the Build Report recommends it. npm was evaluated and found adequate but less strict. Yarn was evaluated and found to offer no material advantage over pnpm.

### 4. Task Runner

**Capability requirement:** Ability to run lint, typecheck, format, and script commands.

**Implementation choice:** ACCEPTED — Package-manager scripts only (`pnpm run <script>`). DEFERRED — Turborepo. The repository currently has zero application packages. A dedicated task runner provides no meaningful value until multiple real workspaces exist with cross-package task dependencies.

**Reevaluation trigger:** When the repository contains 2+ real workspaces/packages with interdependent build/test/lint tasks, or when CI orchestration complexity makes sequential script execution impractical.

### 5. Linting

**Capability requirement:** Automated correctness checking for TypeScript code with agent-readable diagnostics.

**Implementation choice:** ACCEPTED — ESLint with typescript-eslint using flat config (`eslint.config.mjs` or `eslint.config.ts`). Minimal rule set focused on correctness (no unused variables, no implicit any, etc.). No framework-specific rules. `eslint-config-prettier` to prevent conflicts with the formatter.

### 6. Formatting

**Capability requirement:** Deterministic code formatting with zero policy debate.

**Implementation choice:** ACCEPTED — Prettier. Covers TypeScript, Markdown, JSON, and YAML. Integrated with ESLint via `eslint-config-prettier`. Biome was evaluated as a combined alternative but deferred due to narrower TypeScript rule coverage.

### 7. Stage 0 Script Implementation

**Capability requirement:** Cross-platform execution of verification and maintenance scripts.

**Implementation choice:** ACCEPTED — TypeScript scripts executed via `tsx`. All scripts under `scripts/` remain `.ts` files executed through the `tsx` runtime hook. Repository entry points use `node --import tsx scripts/<name>.ts` so managed agent sandboxes do not depend on the `tsx` CLI's local IPC server. This preserves cross-platform TypeScript execution while keeping the accepted runtime choice unchanged. Bash-only scripts are rejected as the default approach.

### 8. Version Pinning Strategy

**Capability requirement:** Any fresh Codex or OpenCode session can discover and provision the expected development environment without manual investigation.

**Implementation choice:** ACCEPTED — Committed lockfile (`pnpm-lock.yaml`) + `packageManager` field in `package.json` (Corepack) + `engines` field declaring minimum Node version. Dependencies use semver ranges in `package.json`; the lockfile provides exact resolution. The discovery path for agents is: read `package.json` → check `engines.node` → check `packageManager` → Corepack provisions pnpm → `pnpm install` → deterministic tree.

## Consequences

**Benefits:**

- Reproducible environment for both Codex and OpenCode sessions
- Cross-platform scripts that work on developer machines and CI identically
- Static type checking catches errors in verification scripts before they produce false passes
- Minimal tooling surface — no premature task runners or speculative infrastructure
- Clear discovery path for agents entering the repository fresh

**Costs/tradeoffs:**

- Requires `pnpm` and `tsx` as devDependencies (small footprint)
- Corepack must be available (standard in Node 22+; fallback is `npm install -g pnpm@<version>`)
- ESLint flat config is newer syntax; developers familiar only with `.eslintrc` need brief orientation
- Lockfile merge conflicts require regeneration rather than manual resolution

**New constraints introduced:**

- All Stage 0 scripts must be TypeScript, not Bash
- `pnpm` is the required package manager; `npm install` will not produce the correct lockfile
- Node.js 24 LTS major (>=24 <25) is required

**Operational implications:**

- CI must use a Node 24 image with Corepack enabled or pnpm pre-installed
- `pnpm install --frozen-lockfile` in CI ensures lockfile integrity

**Migration/reversal implications:**

- Switching from pnpm to npm later requires deleting `pnpm-lock.yaml`, changing `packageManager` field, and running `npm install`. Low cost at Stage 0 scale.
- Switching from TypeScript to JavaScript for scripts requires removing `tsx`, renaming files, and dropping `tsconfig.base.json`. Low cost.
- Adding Turborepo later is additive only — does not require undoing any C1 decisions.

## Validation

**Evidence already collected:**

- Local environment inspection: Node v24.20.0, Corepack 0.35.0, pnpm 11.24.0, npm 11.19.0, git 2.43.0, Codex CLI 0.154.0, OpenCode installed
- Repository state: no `package.json`, no dependencies, no application code — confirming Stage 0 scope
- ESLint flat config is the documented current approach per ESLint v9+ official documentation
- Prettier and typescript-eslint are stable, widely adopted tools with active maintenance
- Corepack `packageManager` field is supported in Node 16.9+ and stabilized in Node 22+

**Tests/prototypes required before acceptance:**

- D1 must create `package.json` with the declared fields and verify `pnpm install` succeeds
- D1 must verify `pnpm run lint`, `pnpm run typecheck`, and `pnpm run format` execute (may pass trivially on empty codebase)
- F1 must verify `agent:doctor` exits 0 after tooling is initialized

**Success criteria:**

- Fresh clone + `corepack enable` + `pnpm install` produces identical dependency tree
- `pnpm run lint` and `pnpm run typecheck` complete without errors
- Both Codex and OpenCode can invoke all scripts successfully
- No application framework, database, or auth technology was selected or installed

**Failure criteria:**

- `pnpm install` produces different trees on different machines
- ESLint flat config fails to parse TypeScript files
- Scripts written in TypeScript cannot execute via `tsx`
- Either Codex or OpenCode cannot run the verification commands

## Reversibility

All C1 decisions are highly reversible at Stage 0 scale. Changing the package manager requires swapping one lockfile and one field. Changing the script runner requires renaming file extensions. Adding a task runner later is purely additive. No decision here creates an expensive-to-reverse commitment.

**What would trigger reconsideration:**

- A validated requirement that forces a non-Node.js runtime for repository tooling (unlikely given the ecosystem alignment)
- Evidence that pnpm causes irreconcilable issues with a required future tool (none known)
- ESLint flat config being deprecated or replaced by the ESLint project (no current signal)

## Follow-up

- [ ] D1: Create `package.json` with `engines`, `packageManager`, `scripts`, and `devDependencies` (typescript, eslint, prettier, tsx, typescript-eslint, eslint-config-prettier)
- [ ] D1: Create `tsconfig.base.json` for repository-level TypeScript configuration
- [ ] D1: Create `.gitignore` including `node_modules/`, `dist/`
- [ ] D1: Create `.editorconfig` for baseline editor consistency
- [ ] D1: Create `eslint.config.mjs` with minimal typescript-eslint flat config
- [ ] D1: Create `.prettierrc` with project formatting rules
- [ ] F1: Wire up `agent:doctor`, `verify:fast`, `verify:full`, `verify:invariants` as pnpm scripts
- [ ] F2: Implement `scripts/check-product-invariants.ts` using tsx
- [ ] Update ExecPlan progress checklist to mark C1 and D1 complete

## Explicitly Deferred Decisions

The following technologies are explicitly outside the scope of this decision record. They are neither accepted nor rejected here. They will be evaluated in future decision records when the relevant Stage requires them:

- Expo / React Native / React Native Web
- Native vs hybrid youth implementation approach
- Next.js
- Turborepo (deferred until multi-workspace trigger is met)
- Database technology (PostgreSQL, Neon, SQLite, etc.)
- ORM / Drizzle
- Sync engine / PowerSync
- Better Auth or any authentication provider
- Zod as product/domain validation architecture
- Vercel or any deployment platform
- EAS (Expo Application Services)
- Cloudflare R2 or any asset storage
- Design tooling (pen.dev, Figma integration)
- Analytics stack
- Content CMS or authoring format
- Application package boundaries and physical monorepo layout

These are recorded as DEFERRED, not REJECTED. The Build Report's recommendations regarding these technologies remain classified as advisory candidates per the ExecPlan's capability classification.

## Decision History

| Date       | Change                                                                                                                                                                         | Reason                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 2026-09-18 | Initial record created                                                                                                                                                         | Step C1 evaluation completed during Stage 0                                           |
| 2026-09-18 | Node policy amended to >=24 <25; Corepack wording corrected; agent runtime rationale removed; workspace yaml removed from follow-up; .turbo/ removed from .gitignore follow-up | Owner amendment after C1 approval                                                     |
| 2026-09-19 | Script invocation clarified to use `node --import tsx` rather than the `tsx` CLI                                                                                               | Post-Stage-0 portability fix for managed agent sandboxes; technology choice unchanged |

</content>
