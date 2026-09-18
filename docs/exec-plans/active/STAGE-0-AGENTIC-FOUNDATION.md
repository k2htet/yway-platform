# STAGE 0: Agentic Engineering Foundation

## Purpose

Establish the documentation, configuration, and guardrail infrastructure so that any fresh Codex or OpenCode session can enter this repository, understand Yway's inviolable product rules, locate authoritative sources, plan a bounded task, implement it in the correct domain, run required verification, and prepare a reviewable change — without relying on hidden chat context.

This is not a product feature stage. No application code is built here.

---

## Current State

| Aspect | Status |
|--------|--------|
| Repository contents | Single file: `docs/product/PRODUCT_VISION.md` |
| Git history | One commit (`48e07e9 docs: product vision`) |
| Branches | `main` only |
| Remotes | None configured |
| Package manager | None initialized |
| Monorepo tooling | None |
| CI/CD | None |
| Tests | None |
| AGENTS.md | Does not exist |
| GitHub config | No `.github/` directory |
| Architecture docs | None beyond Product Vision |
| Codex config | None |
| OpenCode config | None |

The Build Report exists as external analysis provided by the project owner. It recommends a technology stack and phased build sequence but is not committed to the repository and is not an authority source — it is supporting analysis.

---

## Target State

After Stage 0 completion:

1. A root `AGENTS.md` provides every entering agent with mandatory product invariants, navigation map, and verification commands.
2. `docs/product/PRODUCT_CONTRACTS.md` encodes the non-negotiable product rules as checkable assertions.
3. `docs/architecture/ARCHITECTURE.md` defines logical domains, ownership boundaries, forbidden access paths, privacy boundaries, capability requirements, and architectural invariants — vendor-neutral, without unvalidated technology names in normative sections. Dependency directions are recorded as provisional hypotheses, not accepted facts.
4. An execution-plan system (`docs/exec-plans/active/` and `docs/exec-plans/completed/`) tracks work.
5. A decision-record system (`docs/decisions/`) captures technology choices with explicit classification status. Only decisions actually made during Stage 0 have records; future candidates are listed as proposals only.
6. Codex configuration (`.codex/`) and OpenCode configuration (`.opencode/`) exist with initial reviewer agents (TOML and Markdown respectively) and shared reusable skills (directory-based SKILL.md under `.agents/skills/`).
7. GitHub issue templates and PR templates enforce structured human+agent workflows.
8. CI foundation runs lint, typecheck, and product-invariant checks on every push — validated against a real GitHub remote, not just syntax-checked.
9. Agent verification commands (`agent:doctor`, fast verify, full verify, invariant check) are documented and runnable.
10. The minimum repository scaffolding needed to support the above exists, using only technologies explicitly accepted during Stage 0's foundation-tooling decision step.

---

## Scope

**In scope:**
- Documentation structure creation (product contracts, architecture, decisions)
- Root AGENTS.md
- Execution plan system
- Decision record system (template + only Stage 0 decisions)
- Codex project configuration (`.codex/config.toml`, `.codex/agents/*.toml`)
- OpenCode project configuration (`.opencode/agents/*.md`)
- Shared reusable skills (`.agents/skills/*/SKILL.md`) for both Codex and OpenCode
- GitHub templates (issue, PR)
- CI foundation with live remote validation
- Agent verification commands
- Structural invariant checks (with explicit limitations documented)
- Minimum foundation tooling decision and initialization
- .gitignore, .editorconfig, shared tsconfig (if TypeScript is accepted as foundation tooling)
- README.md, CONTRIBUTING.md
- GitHub remote configuration and branch protection setup

**Out of scope (non-goals):**
- Any product feature implementation
- UI screens or components
- Authentication logic
- Database schemas or migrations
- Physical app/package shells for surfaces not yet validated (no speculative `apps/employer-web/`, `packages/sync/`, etc.)
- Scoped AGENTS.md files for directories that do not yet have confirmed purpose
- Technology selection finalization beyond what Stage 0 itself requires
- Employer functionality
- Scoring/ranking systems
- Content authoring pipeline implementation
- Decision records for technologies not evaluated during Stage 0

---

## Understanding of Yway

### Core Product Purpose
Youth-first career discovery and growth ecosystem for Myanmar. Young people experience realistic parts of work before making career decisions, then reflect, choose reversible directions, learn, practice, build labeled evidence, and optionally access trusted opportunities.

### Primary User
Young people in Myanmar, ages 18–25. Android-first. Public access 18+. Any 16–17 pathway requires separately reviewed safeguarding (UNRESOLVED).

### Core Journey
Explore careers → Try realistic work → Reflect → Choose direction → Learn → Practice → Build evidence → Access opportunities when available.

The atomic content unit is the **Career Experience Pack** — a versioned, provenance-tracked artifact containing realistic task simulations, reflection prompts, qualitative feedback, and explicit evidence levels.

First career value must be delivered without mandatory login.

### Non-Negotiable Product Boundaries

1. **Exploration ≠ Practice ≠ Verified Assessment** — Three distinct evidence levels. Separate data models, separate UI presentation, no automatic promotion.
2. **Employer Quest ≠ Employment Application** — Completing a Quest does not create candidate status. Applying is a separate explicit action.
3. **No scoring** — No career-fit percentage, employability score, hidden candidate score, deterministic career ranking, or composite score derived from combining evidence categories.
4. **Signals separation** — Self-reported interest, observed behavior, work preferences, and practical constraints are stored as separate attributes. One must never silently replace another.
5. **Private evidence by default** — Evidence Portfolios have no public URL. Sharing is purpose-specific, user-controlled, with explicit consent.
6. **Employer data isolation** — Employers must never gain access to private exploration, reflections, ordinary practice signals, or unshared evidence. This is a required product outcome. Enforcement at the server/API/data-layer is a derived architectural requirement, not directly quoted from the Product Vision.
7. **Content provenance** — Every piece of content carries provenance metadata (AI-assisted, founder-reviewed, practitioner-reviewed). AI-drafted content cannot ship without practitioner review.
8. **Youth value independence** — The product must remain meaningful and complete even if zero employers, jobs, or opportunities exist.
9. **No behavioral advertising. No sale of user data. No pay-to-rank.**
10. **Youth never pay recruitment or placement fees.**
11. **Sponsorship disclosed** but cannot buy editorial control, data access, ranking, or favorable treatment.

### Privacy and Consent Boundaries
- Role-based authorization: Youth, Practitioner, Employer, Admin.
- Attribute-based within roles (practitioner sees only assigned content; employer sees only explicitly submitted Quest/application data).
- Every data-sharing action requires explicit, informed, granular consent.
- Employer Quest submission and employment application are separate consent purposes.
- Users inspect what is shared, with whom, and for what purpose before submission.
- Communication is contextual and scoped, not unrestricted messaging.

### Evidence Boundaries
Five strictly separated Evidence Portfolio categories:
1. Exploration signals (low-stakes)
2. Practice evidence (repeated behavior/improvement)
3. Verified assessment evidence (separately approved process)
4. User-added work (manual uploads)
5. Employer Quest work (contextual, real employer challenge)

Completion records state exactly what was completed. Not presented as professional certification, hiring evidence, or verified capability unless appropriate support exists. Provenance stays intact through any sharing/export.

### Employer/Youth Data Boundaries
Employer-facing data is a strict subset: only what the user explicitly submits for a specific Quest or Application. No query path exists from employer context into private youth exploration/practice data. Browsing opportunities does not make a user a candidate. Exploring, completing Quests, or browsing are NOT applications.

### Offline Requirements
- Owned exploration and practice should remain useful offline.
- Later synchronization must be designed so local youth work is not destroyed.
- Clear offline states and synchronization states in UI.
- The Product Vision requires that local youth work is not destroyed during sync. Whether a particular conflict resolution strategy (including last-write-wins variants) violates this depends on the data model and conflict types; this must be validated per case rather than universally pre-judged.

### Accessibility/Localization Requirements
- Simple English is canonical working language during design/implementation.
- Natural Burmese for all user-facing launch content, with familiar English retained where it improves comprehension.
- Fluent Burmese review and target-user comprehension validation are mandatory release gates.
- Light theme, dark theme, Android text scaling to 200%, strong contrast, large touch targets, screen-reader support, reduced motion, correct Burmese wrapping, correct reading order.
- Android-first at compact and large-phone sizes.
- Progress uses journey steps, completion moments, meaningful artifacts — NOT points, streaks, or leaderboards.
- Visuals: lightweight distinctive illustration, authentic practitioner portraits — NOT stock photos, video-first, or generic corporate imagery.
- Feel: optimistic, grounded, capable, Myanmar-aware, trusted young mentor. NOT childish gamification, corporate HR, school grading, or generic Silicon Valley.

### Explicit Exclusions
Open creator marketplace, open coaching marketplace, public social feed, followers, popularity metrics, unrestricted messaging, open-ended AI career chatbot, dynamic personality scoring, opaque ranking, universal career-fit scores, employability scores, hidden candidate scores, employer access to private exploration, employer access to ordinary practice signals, automatic applications, automatic candidate rejection, pay-to-rank placement, Employer Quest competition leaderboards, automatic candidate creation, generic course catalog, undifferentiated job-board aggregation, unsupported certificates, unsupported assessment claims, behavioral advertising, sale of user data, mandatory account creation before first value.

---

## Repository Audit Findings

### Existing Structure
- Single file: `docs/product/PRODUCT_VISION.md` (438 lines, canonical authority)
- Single branch: `main`
- Single commit: `48e07e9`
- No remote configured

### Existing Documentation
- Product Vision: complete and authoritative
- Build Report: external analysis (provided by owner, not in repo), treated as recommendations not truth

### Missing Foundations
Everything else is missing:
- No `README.md`
- No `AGENTS.md`
- No `package.json` or workspace configuration
- No TypeScript configuration
- No linting/formatting configuration
- No `.github/` directory
- No CI/CD configuration
- No test infrastructure
- No architecture documentation
- No decision records
- No execution plans
- No product contracts document
- No `.gitignore` or `.editorconfig`
- No Codex configuration
- No application code directories
- No git remote

### Contradictions or Confusions
- None found. The repository is too minimal for contradictions.
- Risk: Without AGENTS.md or architecture docs, future agents have no guidance beyond the Product Vision, which is a product document, not an engineering specification.

### Platform Build Report Classification
The Build Report is **supporting analysis and recommendations**. It is NOT an unquestionable source of truth. Where it recommends technologies, those recommendations are classified below. Where it describes product rules, the Product Vision takes precedence if there is any conflict.

---

## Capability Requirement Classification

This section classifies what the system must be capable of (derived from Product Vision) separately from how those capabilities might be implemented (recommended engineering decisions). Implementation mechanisms are NOT classified as product requirements unless the Product Vision explicitly names them.

### REQUIRED BY PRODUCT VISION
These are mandated directly by the Product Vision text. No implementation mechanism is specified unless the Vision itself specifies one.

| Capability | Source | Notes |
|-----------|--------|-------|
| Android-first youth experience | §2: "The youth experience is Android-first" | REQUIRED. Does not mandate a specific framework or mobile-native implementation approach. Implementation is UNRESOLVED until a mobile architecture decision is made. |
| First career value without mandatory login | §2, §4, §11 | Architectural requirement: anonymous access path must exist. |
| Durable offline capability for exploration and practice | §6: "Owned exploration and practice should remain useful offline" | Requires local persistence. Does not mandate SQLite specifically. |
| Synchronization that preserves local youth work | §6: "later synchronization must be designed so local youth work is not destroyed" | Requires conflict-aware sync. Does not mandate PowerSync specifically. Whether a given conflict strategy (including LWW variants) satisfies this depends on the data/conflict model and must be validated. |
| Strict signal separation | §3.3: signals must stay separate, one must not silently replace another | Requires enforceable schema/domain separation. Does not mandate Zod specifically. |
| Distinct evidence levels with no cross-presentation | §3.3, §7: Exploration ≠ Practice ≠ Verified Assessment | Requires separate data models and UI presentation layers. |
| Multi-role authorization | §8, §9: Youth, Practitioner, Employer, Admin with different data access | Requires role-based + attribute-based access control. Does not mandate Better Auth specifically. |
| Versioned, provenance-tracked content | §5: Content provenance must distinguish AI/founder/practitioner | Requires provenance metadata on every content unit. |
| Private evidence portfolio with no public URL | §7, §9 | Data model invariant. |
| Explicit, purpose-specific sharing consent | §9 | Requires consent tracking per sharing action. |
| Employer data isolation from youth private data | §8.3, §9 | REQUIRED as a product outcome. Server-side/API enforcement is a DERIVED architectural requirement. |
| Content approval workflow with practitioner gate | §5 | Requires lifecycle state machine for content. |
| Burmese localization with fluent review as release gate | §2, §10 | Requires i18n infrastructure. |
| Accessibility: themes, text scaling, screen reader, reduced motion, Burmese typography | §10 | UI-layer requirements. |

### DERIVED CAPABILITY REQUIREMENT
These describe WHAT the system must be capable of, logically derived from Product Vision requirements, without specifying HOW.

| Capability | Derived From |
|-----------|-------------|
| Local durable store on device | Offline capability (§6) |
| Conflict-aware synchronization layer between local store and remote persisted state | Sync preservation (§6). Authority and conflict architecture remain future decisions. |
| Schema-level type discrimination for evidence categories | Signal separation (§3.3) |
| Immutable evidence category discriminator after creation | Evidence integrity (§7) |
| Consent audit trail | Purpose-specific consent (§9) |
| Cross-surface shared business logic | Multiple surfaces operating on same domain entities |
| Dependency isolation between domains | Boundary enforcement (§3.3, §8, §9) |
| Server-side authorization enforcement | Derived from employer data isolation and multi-role privacy requirements |

Note: "Authoritative server datastore" is intentionally not listed as a derived requirement. The system needs remote synchronization and persisted shared-state capability. Authority semantics and conflict resolution architecture are future decisions.

### RECOMMENDED ENGINEERING DECISION
These are recommended by the Build Report but NOT required by the Product Vision. They require explicit evaluation and acceptance before adoption. None are assumed by Stage 0 architecture documents.

| Technology | Recommendation Source | Rationale | Status |
|-----------|----------------------|-----------|--------|
| Turborepo + pnpm | Build Report §M | Task orchestration for multi-surface repo; strict dependency isolation | CANDIDATE — evaluate during Step C |
| Expo + React Native + Expo Router | Build Report §N | Android-first mobile; file-based routing; OTA updates via EAS | CANDIDATE — not decided in Stage 0 |
| Next.js | Build Report §N | Web surfaces (practitioner, employer, ops) | CANDIDATE — not decided in Stage 0 |
| Better Auth | Build Report §E, §N | Multi-role, sessions | CANDIDATE — not decided in Stage 0 |
| Drizzle ORM | Build Report §N | Type-safe ORM | CANDIDATE — not decided in Stage 0 |
| PostgreSQL / Neon | Build Report §N | Serverless database | CANDIDATE — not decided in Stage 0 |
| PowerSync | Build Report §F, §N | Local ↔ server sync | CANDIDATE — highest risk, not decided in Stage 0 |
| Cloudflare R2 | Build Report §N | Asset storage | CANDIDATE — not decided in Stage 0 |
| Vercel | Build Report §N | Web hosting | CANDIDATE — not decided in Stage 0 |
| Zod | Build Report §N | Shared validation schemas | CANDIDATE — not decided in Stage 0 |
| pen.dev | Build Report §L | Design environment | CANDIDATE — referenced in task instructions |
| EAS | Build Report §N | Mobile build/deploy/OTA | CANDIDATE — dependent on Expo decision |

### REQUIRES VALIDATION
Candidates above need proof-of-concept testing before commitment. Highest priority validations identified by the Build Report:
1. PowerSync conflict resolution on low-end Android with Myanmar connectivity patterns
2. Better Auth granular consent-tracking model support
3. Neon latency from Myanmar
4. Burmese font rendering (Zawgyi vs Unicode) on target devices
5. Expo Router deep-linking into Career Experience Pack steps while offline

### UNRESOLVED
These product decisions are genuinely unresolved and must not be assumed:

| Decision | Why Unresolved |
|----------|---------------|
| Mobile-native implementation approach | Product Vision requires Android-first but does not specify native vs hybrid vs web-based delivery |
| 16–17 minor pathway | Product Vision §2 says "requires separately reviewed safeguarding and consent" but doesn't define it |
| Web-based youth surface | Product Vision doesn't define a desktop youth experience |
| Notification/push strategy | Not mentioned in Product Vision; unclear if engagement notifications violate anti-streak principle |
| Analytics stack | Product Vision rejects vanity metrics but doesn't define operational analytics needs |
| Content authoring format | Whether Career Experience Packs are authored in MDX, JSON, custom DSL, or CMS |
| Payment processing | Practitioner compensation and employer billing models undefined |
| Partial pack downloads | Whether text-only download without images is supported for low-storage devices |
| Sync frequency strategy | Opportunistic vs scheduled sync |
| Device storage limits | Storage budget for Myanmar low-end devices |
| Practitioner onboarding workflow | Detailed vetting process undefined |
| Practitioner scheduling/booking | Whether practitioners use same app or separate web surface |
| shadcn/ui applicability | Relevant for web surfaces only; needs evaluation against Myanmar localization |
| CI/CD testing strategy | Unit, integration, e2e scope not defined |
| Conflict resolution authority model | Which node (local vs server) is authoritative for which data types |

---

## Proposed Stage 0 Structure

### Canonical Documentation Structure

Only directories and files that Stage 0 genuinely requires. Physical app/package shells for future surfaces are recorded as proposals in ARCHITECTURE.md, not created as directories.

```
yway-platform/
├── AGENTS.md                          # Root agent instructions
├── README.md                          # Repo onboarding
├── CONTRIBUTING.md                    # Coding standards, PR process, commands
├── .editorconfig                      # Consistent formatting
├── .gitignore                         # Standard ignores (depends on accepted tooling)
├── package.json                       # Root config (depends on accepted tooling)
├── tsconfig.base.json                 # Shared TypeScript config (if TS accepted)
├── .codex/
│   ├── config.toml                    # Codex project configuration
│   └── agents/
│       ├── product-integrity-reviewer.toml
│       ├── architecture-reviewer.toml
│       ├── security-privacy-reviewer.toml
│       └── test-reviewer.toml
├── .opencode/
│   └── agents/
│       ├── product-integrity-reviewer.md
│       ├── architecture-reviewer.md
│       ├── security-privacy-reviewer.md
│       └── test-reviewer.md
├── .agents/
│   └── skills/
│       ├── yway-exec-plan/
│       │   └── SKILL.md
│       ├── yway-product-integrity/
│       │   └── SKILL.md
│       └── yway-pr-review/
│           └── SKILL.md
├── docs/
│   ├── product/
│   │   ├── PRODUCT_VISION.md          # Already exists. NEVER modify casually.
│   │   └── PRODUCT_CONTRACTS.md       # Machine-checkable product invariants
│   ├── architecture/
│   │   └── ARCHITECTURE.md            # Vendor-neutral domain boundaries
│   ├── decisions/
│   │   ├── 000-TEMPLATE.md            # Decision record template
│   │   └── 001-foundation-tooling.md  # Only Stage 0 decision
│   └── exec-plans/
│       ├── active/                    # In-progress plans
│       │   └── STAGE-0-AGENTIC-FOUNDATION.md  # This file
│       └── completed/                 # Finished plans (moved here)
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── task.md                    # Structured task template
│   ├── PULL_REQUEST_TEMPLATE.md       # PR checklist
│   └── workflows/
│       └── ci.yml                     # Lint, typecheck, invariant checks
└── scripts/
    └── check-product-invariants.*     # Structural invariant checks
```

### Root AGENTS.md Strategy

The root AGENTS.md must be concise and directive. Structure:

1. **Project identity** (2-3 sentences): What Yway is, who it serves.
2. **Sources of truth hierarchy**: PRODUCT_VISION.md > PRODUCT_CONTRACTS.md > ARCHITECTURE.md > decision records > Build Report (advisory only).
3. **Non-negotiable product invariants** (bullet list referencing PRODUCT_CONTRACTS.md): The rules that must never be violated.
4. **Repository map**: Directory structure with one-line purpose per directory.
5. **Domain boundaries summary**: Reference to ARCHITECTURE.md for detail.
6. **Technology decision status**: Reference to `docs/decisions/` showing what is accepted vs candidate vs unresolved.
7. **Verification commands**: Exact commands for agent:doctor, fast verify, full verify, invariant check.
8. **Workflow rules**: Branch naming, commit conventions, worktree-per-task expectation, PR requirements.
9. **What agents must NOT do**: List of prohibited actions.
10. **Agent harness**: Reference to `.codex/agents/*.toml`, `.opencode/agents/*.md`, and shared `.agents/skills/*/SKILL.md`.

Target size: under 200 lines. References point to detailed docs rather than inlining everything.

### PRODUCT_CONTRACTS.md

Encodes Product Vision rules as assertions:

```markdown
# Product Contracts

## Evidence Separation (CRITICAL)
- ASSERTION: No type, function, or query may combine exploration signals, practice evidence,
  and verified assessment evidence into a single output for external consumption.
- ASSERTION: EvidenceItem.category is set at creation and is immutable.
- ASSERTION: No "career fit score", "employability score", or composite ranking field exists
  in any schema, type, or API response.

## Consent and Privacy (CRITICAL)
- ASSERTION: EvidencePortfolio has no public URL field.
- ASSERTION: Every data-sharing action requires a ConsentRecord with explicit purpose.
- ASSERTION: Employer Quest submission consent and employment application consent are separate records.

## Employer Isolation (CRITICAL)
- ASSERTION: No API route authenticated as Employer may return youth exploration, reflection,
  or unshared practice data.
- ASSERTION: Employer-facing code cannot import youth-domain types.

## Content Provenance (HIGH)
- ASSERTION: Every CareerExperiencePack carries provenance metadata.
- ASSERTION: No pack with reviewStatus != "practitionerReviewed" or "approved" may be served
  to end users in production.

## Access Without Login (HIGH)
- ASSERTION: At least one complete Career Experience Pack interaction flow is accessible
  without authentication.

## Offline Preservation (HIGH)
- ASSERTION: Youth work created within offline-supported exploration and practice flows
  must not be lost during synchronization.
- NOTE: Future architecture may expand offline capability to additional portfolio operations.
  This contract covers only what the Product Vision explicitly requires.
```

### Architecture Document (Vendor-Neutral)

`docs/architecture/ARCHITECTURE.md` normatively defines:

**Logical Domains** (confirmed by Product Vision):
- Youth Domain: exploration, practice, evidence portfolio, reflections
- Content Domain: Career Experience Packs, provenance, review pipeline
- Practitioner Domain: vetting, content review, structured experiences
- Employer Domain: quests, opportunities, applications
- Consent Domain: consent records, sharing scopes, audit trail
- Identity Domain: users, roles, sessions, authorization
- Ops Domain: platform health, content approval, safeguarding

**Ownership Boundaries:**
Each domain owns its types, validation rules, and business logic. Cross-domain access goes through defined interfaces, never direct data queries.

**Forbidden Access Paths** (normative):
- Employer domain MUST NOT access Youth domain private data (exploration, reflections, unshared practice, evidence portfolio)
- No domain may collapse signal types (interest, behavior, preferences, constraints) into a single composite output
- No domain may promote exploration evidence to practice or verified assessment status automatically

**Product Invariants:**
- All invariants from PRODUCT_CONTRACTS.md apply architecturally
- Evidence categories are architecturally isolated (not just presentationally)
- Employer-facing data is a strict subset of what user explicitly consents to share

**Privacy Boundaries:**
- Private evidence portfolio has no public URL
- Consent is purpose-specific and auditable
- Sponsorship disclosure is mandatory; sponsorship cannot buy data access

**Required Capability Boundaries:**
- Durable local store → conflict-aware synchronization layer → remote persisted shared-state
- Schema-level type discrimination for evidence categories
- Server-side authorization enforcement (derived architectural requirement)
- Consent audit trail

**Provisional Architecture Hypotheses** (NOT normative — to be validated or rejected in future stages):
- Youth domain depends on Content, Consent, Identity
- Employer domain depends on Content, Consent, Identity
- Practitioner domain depends on Content, Identity
- Ops domain depends on all domains (read-only for monitoring, write for approval workflows)
- Consent domain is depended upon by all others but depends on none except Identity

These hypotheses are recorded for future evaluation. They are not accepted facts and must not constrain implementation decisions until validated.

**Candidate Implementations** (explicitly marked as proposals, not architecture):
- For durable local store: SQLite is a candidate
- For sync layer: PowerSync is a candidate
- For remote persisted state: PostgreSQL/Neon is a candidate
- For auth: Better Auth is a candidate
- For validation: Zod is a candidate
- For ORM: Drizzle is a candidate

**Proposed Future Physical Mapping** (not created in Stage 0):
The Build Report proposes mapping these domains to specific apps/packages. That mapping is recorded here as a proposal for future architecture decisions to validate. Stage 0 creates only the scaffolding needed for Stage 0 itself.

### Execution Plan System

- `docs/exec-plans/active/` — Plans currently being worked on
- `docs/exec-plans/completed/` — Finished plans moved here with completion date
- Each plan is a self-contained markdown file following a standard template (this file is the template instance)
- Plans reference PRODUCT_CONTRACTS.md rules they must satisfy
- Plans include progress checklists that agents update as they work

### Decision Record System

- `docs/decisions/` — One file per significant decision
- Naming: `NNN-short-title.md`
- Template includes: Status (ACCEPTED/CANDIDATE/REJECTED/DEFERRED), Context, Decision, Consequences, Validation Steps
- Stage 0 creates ONLY:
  - `000-TEMPLATE.md` — The template itself
  - `001-foundation-tooling.md` — The decision about what minimum tooling to initialize the repo with (package manager, language, task runner IF needed for Stage 0)
- Future technology decisions get records when they are actually evaluated or accepted, not before.
- An unvalidated candidate MUST NOT look like an adopted architectural decision.

### Codex Configuration

**`.codex/config.toml`**: Project-level Codex settings. Minimal — only settings genuinely needed for the Stage 0 agent harness. No model is hard-coded unless technically required; prefer inheritance from the active Codex session.

**`.codex/agents/`**: Custom read-only reviewer agents as standalone TOML files. Each follows the Codex custom agent schema:

| File | Agent Name | Purpose | Permissions | When Invoked |
|------|-----------|---------|-------------|--------------|
| `product-integrity-reviewer.toml` | product-integrity-reviewer | Checks changes against PRODUCT_CONTRACTS.md assertions | `sandbox_mode = "read-only"` | On every PR touching domain logic, evidence types, consent, or employer-facing code |
| `architecture-reviewer.toml` | architecture-reviewer | Checks dependency direction violations, domain boundary crossings | `sandbox_mode = "read-only"` | On every PR adding/changing imports between packages or creating new modules |
| `security-privacy-reviewer.toml` | security-privacy-reviewer | Checks for data leakage paths, missing authorization, secret exposure | `sandbox_mode = "read-only"` | On every PR touching auth, API routes, employer endpoints, or consent logic |
| `test-reviewer.toml` | test-reviewer | Evaluates test coverage adequacy, especially for product invariants | `sandbox_mode = "read-only"` | On every PR |

Each TOML file contains: `name`, `description`, `developer_instructions`, `sandbox_mode = "read-only"`.

### OpenCode Configuration

**`.opencode/agents/`**: Read-only reviewer agents as Markdown files with YAML frontmatter. Each uses `mode: subagent` with `permission: edit: deny`. The Markdown body serves as the system instruction. Semantic responsibilities match the corresponding Codex reviewers. No provider/model is pinned unless technically required; prefer inheriting the active session model.

| File | Agent Name | Purpose | Permissions | When Invoked |
|------|-----------|---------|-------------|--------------|
| `product-integrity-reviewer.md` | product-integrity-reviewer | Checks changes against PRODUCT_CONTRACTS.md assertions | `mode: subagent`, `permission: edit: deny` | On every PR touching domain logic, evidence types, consent, or employer-facing code |
| `architecture-reviewer.md` | architecture-reviewer | Checks dependency direction violations, domain boundary crossings | `mode: subagent`, `permission: edit: deny` | On every PR adding/changing imports between packages or creating new modules |
| `security-privacy-reviewer.md` | security-privacy-reviewer | Checks for data leakage paths, missing authorization, secret exposure | `mode: subagent`, `permission: edit: deny` | On every PR touching auth, API routes, employer endpoints, or consent logic |
| `test-reviewer.md` | test-reviewer | Evaluates test coverage adequacy, especially for product invariants | `mode: subagent`, `permission: edit: deny` | On every PR |

### Reviewer Output Convention

All reviewer agents, in both Codex and OpenCode, produce findings using a consistent format:

```
Severity: BLOCKER | HIGH | MEDIUM | LOW
Location: file/path[:line when available]
Contract/Decision: relevant YWAY-Pxxx / YWAY-Exxx / ADR if applicable
Finding: concise description
Why it matters: concrete consequence
Suggested direction: optional, without directly editing
```

If there are no material findings, the reviewer says so explicitly. Reviewers do not manufacture findings to produce output.

### Semantic Drift Prevention

For each reviewer pair (Codex + OpenCode), the tool-specific files differ in syntax but agree on: purpose, scope, what counts as a finding, read-only behavior, authoritative sources, and expected output style. Each reviewer explicitly treats `PRODUCT_VISION.md`, `PRODUCT_CONTRACTS.md`, accepted decision records, and later `ARCHITECTURE.md` according to the authority hierarchy in AGENTS.md. Product contracts are referenced, not duplicated into reviewer files.

### Shared Agent Skills

| Directory | Skill Name | Purpose | When Used |
|-----------|-----------|---------|-----------|
| `yway-exec-plan/SKILL.md` | yway-exec-plan | Creates, updates, and closes execution plans following the standard template | When starting or completing any multi-step task |
| `yway-product-integrity/SKILL.md` | yway-product-integrity | Evaluates proposed changes against PRODUCT_CONTRACTS.md before implementation | Before writing code that touches evidence, consent, employer isolation, or scoring |
| `yway-pr-review/SKILL.md` | yway-pr-review | Orchestrates the four reviewer agents and synthesizes their findings into a unified review comment | When preparing a PR for human review |

Each SKILL.md contains valid skill metadata including `name` and `description` plus concise instructions.

Do not create additional speculative agents or skills. Add more only when a recurring need is demonstrated during actual development.

### GitHub Configuration

**Issue template** (`task.md`):
- Title format: `[DOMAIN] Short description`
- Fields: Domain (youth/content/practitioner/employer/ops/consent/identity/shared), Related Product Contract, Acceptance Criteria, Dependencies, Estimated Scope
- Reminders: Do not create scoring features. Do not mix evidence categories. Check PRODUCT_CONTRACTS.md.

**PR template**:
- Checklist: Runs verification commands, no Product Vision modifications, no evidence category mixing, no cross-domain violations, product-integrity-reviewer passed, decision record updated if applicable
- Required sections: What changed, Why, Product contract compliance statement, Testing performed

**CI workflow** (`ci.yml`):
- Triggers: push to main, pull requests
- Steps: install dependencies, lint, typecheck, run agent:doctor, run invariant checks, run tests (when they exist)

### Agent Verification Commands

Three tiers, documented in root AGENTS.md and CONTRIBUTING.md:

**`agent:doctor`** (environment readiness):
Tells a fresh Codex or OpenCode session whether the repository environment is ready. Checks: declared runtime and package manager policy, installed dependencies, key shared sources, and both agent harnesses. Dirty git state and missing remotes are reported without blocking readiness. Exit 0 = ready. Non-zero = lists what is missing.

**Fast verification** (`verify:fast` or equivalent):
Lint + typecheck only. Runs in seconds. Appropriate for small changes.

**Full verification** (`verify:full` or equivalent):
Runs all currently implemented checks: lint + typecheck + format check, then tests and product-invariant verification when their package scripts exist. A missing future check is reported as skipped, not passed. Required before PR submission.

**Product invariant verification** (`verify:invariants` or equivalent):
Runs conservative AST-based checks for clear prohibited scoring, automatic Quest-to-candidate/application, and public-portfolio identifiers. It is a structural guardrail, not a comprehensive guarantee.

The accepted command names are `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:full`, and `pnpm verify:invariants`.

### Structural Invariant Checks

Implementation: Prefer a cross-platform approach (e.g., a Node.js script using the accepted tooling) over a bash-only grep script, so it works identically across developer machines and CI.

Scope at Stage 0: Parse `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, and `.cjs` files and inspect executable identifier and ECMAScript private-identifier nodes for three conservative rule sets:
- `YINV-SCORE-001` detects only clear prohibited scoring identifiers mapped to YWAY-P005 and YWAY-E006.
- `YINV-CANDIDATE-001` detects only clear automatic Quest-to-candidate/application identifiers mapped to YWAY-P017 and YWAY-P030.
- `YINV-PORTFOLIO-001` detects only clear public-portfolio identifiers mapped to YWAY-P014.

Markdown, comments, string literals, dependencies, generated/build output, and the checker itself are excluded. Generic identifiers such as `score`, `rank`, `rating`, `percentage`, `url`, `slug`, and `share` are allowed.

Explicit limitation: These checks are structural guardrails only. Semantic behavior, authorization, consent, privacy, evidence semantics, offline preservation, safeguarding, accessibility, and localization correctness require future typed, integration, property, flow, security, and UI tests. Employer/private-youth access enforcement under YWAY-P018, YWAY-E001, and YWAY-E004 also remains future architecture-fitness work; no physical import or package boundary is enforced before physical architecture is accepted.

### Worktree-Per-Task Workflow

Documented in CONTRIBUTING.md:
- Each task gets its own git worktree or branch
- Branch naming: `{domain}/{type}/{short-description}` (e.g., `youth/feat/anonymous-exploration`, `shared/chore/init-foundation`)
- One exec-plan per branch
- PR merges back to main after CI passes and review

### Security Baseline

- No secrets in repository (enforced by .gitignore patterns)
- Environment variable templates documented but values never committed
- Authorization enforced server-side (documented as derived architectural rule)
- Employer data isolation enforced at domain boundary level

---

## Ordered Stage 0 Task List

Execute in this order. Each step has validation criteria. The sequence follows dependency logic: authority first, then agent harness, then tooling decisions, then scaffolding, then architecture, then verification, then CI, then documentation, then live GitHub validation, then acceptance test, then closure.

### Step A1: Create PRODUCT_CONTRACTS.md
**Phase: A — Establish authority and product contracts**
**Action:** Extract and encode all non-negotiable product rules from the Product Vision as checkable assertions. Offline preservation contract must state: "Youth work created within offline-supported exploration and practice flows must not be lost during synchronization." Do not require all Evidence Portfolio mutations to work offline. Do not claim the Product Vision explicitly rejects last-write-wins.
**Dependencies:** None.
**Files created:** `docs/product/PRODUCT_CONTRACTS.md`.
**Validation:** Covers all 6 assertion categories (evidence separation, consent/privacy, employer isolation, content provenance, login-free access, offline preservation). Offline contract matches Product Vision scope. Each assertion is specific enough to write a test against. Does not modify PRODUCT_VISION.md.

### Step A2: Create decision record template
**Phase: A — Establish authority and product contracts**
**Action:** Write `docs/decisions/000-TEMPLATE.md` with fields: Status (ACCEPTED/CANDIDATE/REJECTED/DEFERRED), Context, Decision, Consequences, Validation Steps.
**Dependencies:** None.
**Files created:** `docs/decisions/000-TEMPLATE.md`.
**Validation:** Template is usable by future agents to record decisions consistently.

### Step B1: Create root AGENTS.md
**Phase: B — Establish agent instructions and harness for Codex + OpenCode**
**Action:** Write root AGENTS.md with project identity, source-of-truth hierarchy, product invariants summary, repository map (placeholder until Step D), domain boundaries reference, verification commands (placeholder until Step F), workflow rules, prohibitions, and agent harness reference pointing to `.codex/agents/*.toml`, `.opencode/agents/*.md`, and shared `.agents/skills/*/SKILL.md`.
**Dependencies:** A1.
**Files created:** `AGENTS.md` at root.
**Validation:** Under 200 lines. References PRODUCT_VISION.md and PRODUCT_CONTRACTS.md. Contains prohibition list. Contains placeholder sections for verification commands and repo map to be filled after Steps D and F.

### Step B2: Create Codex and OpenCode reviewer agents
**Phase: B — Establish agent instructions and harness for Codex + OpenCode**
**Action:** Create `.codex/config.toml` with minimal project-level settings. Create `.codex/agents/` with four reviewer agent definitions as standalone TOML files. Create `.opencode/agents/` with four equivalent reviewer agent definitions as Markdown files with YAML frontmatter. Each Codex file contains: `name`, `description`, `developer_instructions`, `sandbox_mode = "read-only"`. Each OpenCode file uses `mode: subagent` with `permission: edit: deny` and a Markdown body serving as the system instruction. Both tool-specific sets enforce the same Yway review contracts, referencing canonical shared docs rather than duplicating product rules. All reviewers produce findings using a consistent output format (Severity / Location / Contract-Decision / Finding / Why it matters / Suggested direction). No model is pinned unless technically required.
**Dependencies:** A1, B1.
**Files created:** `.codex/config.toml`, `.codex/agents/product-integrity-reviewer.toml`, `.codex/agents/architecture-reviewer.toml`, `.codex/agents/security-privacy-reviewer.toml`, `.codex/agents/test-reviewer.toml`, `.opencode/agents/product-integrity-reviewer.md`, `.opencode/agents/architecture-reviewer.md`, `.opencode/agents/security-privacy-reviewer.md`, `.opencode/agents/test-reviewer.md`.
**Validation:** Each TOML file follows Codex custom agent schema with required fields and `sandbox_mode = "read-only"`. Each OpenCode Markdown file has valid frontmatter with `mode: subagent` and `permission: edit: deny`. Reviewer semantics match across both tools. No product rules are duplicated as a competing source of truth.

### Step B3: Create reusable agent skills
**Phase: B — Establish agent instructions and harness for Codex + OpenCode**
**Action:** Create `.agents/skills/` with three skill directories, each containing a SKILL.md. These are the SHARED skill location for BOTH Codex and OpenCode. Do NOT create duplicate copies under `.opencode/skills/` or `.codex/skills/` unless a future validated limitation requires it. Each SKILL.md contains valid skill metadata including `name` and `description` plus concise instructions.
**Dependencies:** B1.
**Files created:** `.agents/skills/yway-exec-plan/SKILL.md`, `.agents/skills/yway-product-integrity/SKILL.md`, `.agents/skills/yway-pr-review/SKILL.md`.
**Validation:** Each SKILL.md contains `name` and `description` fields. Instructions are concise. No speculative skills beyond these three. Files are inside directories, not flat under `.agents/skills/`. Skills are loadable by both Codex and OpenCode from the single shared location.

### Step C1: Evaluate and decide foundation tooling
**Phase: C — Make only the minimum foundation technology decisions required**
**Action:** Evaluate the minimum technologies needed to initialize the repository for Stage 0. This is NOT a product architecture decision — it is a development-environment decision. Questions to answer:
- What language/runtime? (TypeScript/Node.js is the near-universal choice for the ecosystems described in the Build Report, but this should be explicitly accepted.)
- What package manager? (pnpm is recommended for strict dependency isolation, but npm or yarn could suffice for Stage 0.)
- What task runner? (Turborepo is recommended for multi-package orchestration, but for Stage 0's minimal scaffolding, npm scripts alone may suffice.)
- What formatter/linter? (Prettier + ESLint is standard for TypeScript.)

Write `docs/decisions/001-foundation-tooling.md` recording the evaluation and the accepted choices. Mark alternatives as DEFERRED, not rejected, since they may be revisited.

**Dependencies:** A2.
**Files created:** `docs/decisions/001-foundation-tooling.md`.
**Validation:** Decision record follows template. Accepted technologies are explicitly marked ACCEPTED. Alternatives are marked DEFERRED. Rationale explains why each is needed for Stage 0 specifically.

### Step D1: Initialize repository scaffolding
**Phase: D — Initialize repository/tooling based on accepted decisions**
**Action:** Based on the accepted tooling from C1, create the minimum files needed to initialize the repo. If TypeScript + pnpm are accepted: `package.json`, `pnpm-workspace.yaml` (even if initially empty), `tsconfig.base.json`, `.gitignore`, `.editorconfig`. Do NOT create app/package subdirectories for future surfaces — only the root scaffolding and `docs/` directories.
**Dependencies:** C1.
**Files created:** Depends on accepted tooling. Typically 4-6 root config files.
**Validation:** Package manager install succeeds. TypeScript base config resolves. Lint/format commands work (may pass trivially). No errors.

### Step D2: Create remaining documentation directory structure
**Phase: D — Initialize repository/tooling based on accepted decisions**
**Action:** Create only directories that do not already contain files from prior steps: `docs/architecture/`, `docs/exec-plans/completed/`, `.github/ISSUE_TEMPLATE/`, `.github/workflows/`, `scripts/`. Do NOT recreate `.codex/agents/`, `.opencode/agents/`, or `.agents/skills/*/` — those are populated by Steps B2 and B3 respectively. Only add `.gitkeep` files to directories that will remain empty after all prior steps. Do not add `.gitkeep` files to directories that already contain files.
**Dependencies:** D1.
**Files created:** Directories, with `.gitkeep` only in genuinely empty directories.
**Validation:** Directory tree matches the Stage 0 structure defined above (without speculative app/package directories). No `.gitkeep` in `.codex/agents/`, `.opencode/agents/`, or `.agents/skills/*/`.

### Step E1: Create ARCHITECTURE.md
**Phase: E — Define vendor-neutral architecture and domain boundaries**
**Action:** Write `docs/architecture/ARCHITECTURE.md` defining logical domains, ownership boundaries, forbidden access paths, privacy boundaries, capability requirements, and architectural invariants. Dependency directions are recorded as "Provisional Architecture Hypotheses" — not normative. Candidate implementations (PowerSync, Neon, Better Auth, etc.) are listed in a clearly marked "Candidate Implementations" section, NOT in normative architecture text. Proposed future physical app/package mapping is listed in a "Proposed Future Physical Mapping" section marked as proposals.
**Dependencies:** A1, D2.
**Files created:** `docs/architecture/ARCHITECTURE.md`.
**Validation:** Uses vendor-neutral language for all normative sections (e.g., "durable local store" not "SQLite", "conflict-aware sync layer" not "PowerSync"). Candidate implementations are clearly separated. All 7 logical domains from Product Vision are defined. Forbidden access paths are explicit. Dependency directions are marked as provisional hypotheses, not accepted facts. Employer isolation boundary is explicit. No speculative rules like "Consent depends only on Identity" appear as normative.

### Step E2: Update root AGENTS.md with repository map
**Phase: E — Define vendor-neutral architecture and domain boundaries**
**Action:** Fill in the placeholder repository map section in AGENTS.md with the actual directory structure from D1/D2/E1.
**Dependencies:** D2, E1.
**Files modified:** `AGENTS.md`.
**Validation:** Repository map accurately reflects current structure. Still under 200 lines total.

### Step F1: Create agent verification commands
**Phase: F — Add agent verification commands and structural invariant checks**
**Action:** Define and wire up `agent:doctor`, `verify:fast`, `verify:full`, and their cross-platform verification orchestration using the accepted tooling from C1. `verify:full` must automatically run tests and `verify:invariants` later when those package scripts exist. Document the available commands in AGENTS.md.
**Dependencies:** C1, D1.
**Files created/modified:** `scripts/agent-doctor.ts`, `scripts/run-verification.ts`, `package.json`, `tsconfig.json`, `AGENTS.md`.
**Validation:** `agent:doctor` exits 0 on current repo state. `verify:fast` completes in under 10 seconds. `verify:full` completes and reports product invariants as skipped pending F2. No `verify:invariants` package script exists yet.

### Step F2: Create structural invariant checks
**Phase: F — Add agent verification commands and structural invariant checks**
**Action:** Implement cross-platform, AST-based checks for the conservative YINV-SCORE-001, YINV-CANDIDATE-001, and YINV-PORTFOLIO-001 identifier sets in `scripts/check-product-invariants.ts`; add the `verify:invariants` package script; and thereby activate invariant checking inside `verify:full` through F1's conditional orchestration. Exclude prose, comments, strings, dependencies, generated/build output, and the checker itself. Document that these are structural guardrails, not comprehensive guarantees.
**Dependencies:** F1, A1.
**Files created/modified:** `scripts/check-product-invariants.ts`, `package.json`, `AGENTS.md`, this ExecPlan.
**Validation:** Script exits 0 on the current repository. Its self-test catches forbidden ordinary and private identifiers, allows a normal identifier, and ignores comment/string mentions. `verify:full` discovers and runs it while tests remain skipped because no test script exists. Semantic, authorization, consent, privacy, evidence, offline, safeguarding, accessibility, localization, and physical domain-boundary verification remain future work.

### Step G1: Create GitHub templates
**Phase: G — Add GitHub workflow and CI**
**Action:** Write issue template and PR template with product-contract compliance reminders.
**Dependencies:** A1.
**Files created:** `.github/ISSUE_TEMPLATE/task.md`, `.github/PULL_REQUEST_TEMPLATE.md`.
**Validation:** Issue template includes domain selector and product contract reference. PR template includes invariant compliance checklist and reviewer agent references.

### Step G2: Create CI workflow
**Phase: G — Add GitHub workflow and CI**
**Action:** Create `.github/workflows/ci.yml` with one Ubuntu verification job for pull requests and pushes to `main`. Use read-only repository permissions, superseded-run cancellation, a 15-minute timeout, Node.js 24, and the current officially supported `actions/checkout@v7` and `actions/setup-node@v7`. Provision the exact pnpm version declared by `packageManager` through Corepack, install with a frozen lockfile, then run `pnpm agent:doctor` and `pnpm verify:full`. Do not add caching, secrets, deployment, artifacts, matrices, or separate commands already owned by `verify:full`.
**Dependencies:** F1.
**Files created:** `.github/workflows/ci.yml`.
**Validation:** Local YAML parsing and repository formatting checks pass. The workflow references actual package scripts, uses `pnpm install --frozen-lockfile`, and local runs of `pnpm agent:doctor` and `pnpm verify:full` pass. Tests remain explicitly skipped by `verify:full` because no test script exists. A live GitHub Actions run and branch-protection validation remain owned by Step G3.

### Step G3: Configure GitHub remote and validate CI
**Phase: G — Add GitHub workflow and CI**
**Action:** Configure the GitHub remote for this repository. Push the foundation work. Verify the CI workflow actually executes successfully on GitHub Actions. Configure appropriate main-branch protection rules requiring CI checks to pass.
**Dependencies:** G2, D1.
**Prerequisite:** Owner must provide a GitHub repository URL and ensure the executing agent has push access. If this prerequisite is not met, Stage 0 cannot fully complete.
**Files modified:** Git remote configuration (not a file, but `git remote add origin`).
**Validation:** `git remote -v` shows configured origin. `git push origin main` succeeds. GitHub Actions run is visible and passes. Branch protection rules are configured requiring CI checks. If owner action is pending, this step is explicitly blocked and documented as such.

### Step H1: Create README.md and CONTRIBUTING.md
**Phase: H — Add minimal contributor/onboarding documentation**
**Action:** Write minimal README (what this repo is, prerequisites, how to run agent:doctor and verification commands) and CONTRIBUTING (coding standards, branch naming, worktree workflow, PR process, Codex agent usage referencing `.codex/agents/*.toml` and `.agents/skills/*/SKILL.md`).
**Dependencies:** F1, B1.
**Files created:** `README.md`, `CONTRIBUTING.md`.
**Validation:** README explains how to run `agent:doctor` and verification commands. CONTRIBUTING documents branch naming convention, worktree workflow, and references Codex reviewer agents and skills.

### Step I1: Fresh-session acceptance test
**Phase: I — Run a fresh-session acceptance test**
**Action:** Start a fresh agent session and verify it can discover all authoritative docs, run verification commands, and understand prohibitions. Document results in the acceptance test table below.
**Dependencies:** H1.
**Files created:** None.
**Validation:** All checks in the acceptance test table pass.

#### Acceptance Test Results
_To be filled during Step I1._

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Discovers AGENTS.md | | |
| Locates PRODUCT_VISION.md | | |
| Locates PRODUCT_CONTRACTS.md | | |
| Finds ARCHITECTURE.md | | |
| Understands prohibitions | | |
| Runs agent:doctor successfully | | |
| Runs verification commands | | |
| Identifies how to start a task | | |
| Locates Codex agents (.toml) | | |
| Locates OpenCode agents (.md) | | |
| Locates shared skills (SKILL.md) | | |

### Step J1: Finalize and close Stage 0
**Phase: J — Close Stage 0 only after all objective completion criteria pass**
**Action:** Verify all completion criteria below are met. Move this execution plan to `docs/exec-plans/completed/` with completion date. Update progress checklist.
**Dependencies:** I1, G3.
**Files modified:** This file relocated to completed.
**Validation:** All completion criteria checked and passing.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AGENTS.md becomes too long and agents ignore it | Agents miss critical rules | Keep root under 200 lines. Point to detailed docs. |
| Product contracts not enforced beyond structural checks | Violations slip through | Step F2 documents limitations explicitly. Future stages add typed tests. |
| Foundation tooling decision delays Stage 0 | Blocked scaffolding | Step C1 evaluates only what Stage 0 needs, not the full product stack. Keep scope minimal. |
| Architecture doc accidentally locks in technologies | Agents treat candidates as decisions | Step E1 separates normative architecture from candidate implementations. Reviewer agents check for this. |
| Build Report recommendations treated as Product Vision | Agents implement employer features prematurely or adopt unvalidated tech | Root AGENTS.md explicitly states Build Report is advisory. Decision records classify each technology. |
| No remote configured blocks CI validation | Cannot confirm CI actually works | Step G3 explicitly requires live CI validation. Owner action is a blocking prerequisite. |
| Codex agents/skills are defined but not yet wired into actual review flow | False sense of automation | Document in each agent definition that wiring into CI/PR review is a post-Stage-0 task. |
| Provisional dependency hypotheses treated as normative | Agents follow unvalidated edges | Step E1 labels them explicitly as provisional. Architecture reviewer agent checks for this. |

---

## Completion Criteria

Stage 0 is complete when ALL of the following are true:

1. [ ] `docs/product/PRODUCT_CONTRACTS.md` exists and covers all 6 assertion categories with corrected offline contract
2. [ ] `docs/decisions/000-TEMPLATE.md` exists with correct fields
3. [ ] `docs/decisions/001-foundation-tooling.md` exists with ACCEPTED status for chosen tooling
4. [ ] Root `AGENTS.md` exists, is under 200 lines, and contains: source-of-truth hierarchy, product invariants summary, repository map, verification commands, prohibition list, agent harness reference for both Codex and OpenCode
5. [ ] `.codex/config.toml` exists with valid project configuration
6. [ ] Four reviewer agents exist in `.codex/agents/` as `.toml` files with `name`, `description`, `developer_instructions`, `sandbox_mode = "read-only"`
7. [ ] Four reviewer agents exist in `.opencode/agents/` as `.md` files with `mode: subagent`, `permission: edit: deny`, matching Codex reviewer semantics
8. [ ] Three reusable skills exist in `.agents/skills/` as directories each containing `SKILL.md` with `name` and `description`
9. [ ] `docs/architecture/ARCHITECTURE.md` exists, uses vendor-neutral language for normative sections, clearly separates candidate implementations, marks dependency directions as provisional hypotheses, and does not include speculative normative edges
9. [ ] Repository scaffolding initializes successfully using accepted tooling from Step C1
10. [ ] `agent:doctor` executes and exits 0
11. [ ] `verify:fast`, `verify:full`, and `verify:invariants` execute successfully
12. [ ] Structural invariant checks exist with documented limitations
13. [ ] GitHub issue template and PR template exist with product contract compliance reminders
14. [x] CI workflow file exists and has been validated against a live GitHub remote (Step G3)
15. [x] GitHub remote is configured and CI has executed successfully at least once
16. [ ] Main-branch protection rules are configured requiring CI checks
17. [x] `README.md` and `CONTRIBUTING.md` exist and document verification commands and workflow
18. [ ] Fresh-session acceptance test (Step I1) passed with documented results in this plan
19. [ ] No application code, UI components, auth logic, database schemas, or product features have been implemented
20. [ ] No speculative app/package directories were created beyond what Stage 0 requires
21. [ ] PRODUCT_VISION.md has not been modified
22. [ ] No decision records exist for technologies not evaluated during Stage 0 (only 001-foundation-tooling)

---

## Progress Checklist

- [x] Step A1: Create PRODUCT_CONTRACTS.md
- [x] Step A2: Create decision record template
- [x] Step B1: Create root AGENTS.md
- [x] Step B2: Create Codex + OpenCode configuration and reviewer agents
- [x] Step B3: Create shared reusable agent skills (.agents/skills/*/SKILL.md)
- [x] Step C1: Evaluate and decide foundation tooling
- [x] Step D1: Initialize repository scaffolding
- [x] Step D2: Create remaining documentation directory structure
- [x] Step E1: Create vendor-neutral ARCHITECTURE.md
- [x] Step E2: Update AGENTS.md with the D1 root tooling, D2 directories, and E1 architecture document
- [x] Step F1: Create agent verification commands
- [x] Step F2: Create structural invariant checks
- [x] Step G1: Create GitHub templates
- [x] Step G2: Create CI workflow
- [ ] Step G3: Configure GitHub remote and validate CI live
- [x] Step H1: Create README.md and CONTRIBUTING.md
- [ ] Step I1: Fresh-session acceptance test
- [ ] Step J1: Finalize and close Stage 0

---

## Step G3 Execution Record

**Status:** BLOCKED on enforced `main` protection; Step G3 remains incomplete.

- Existing remote retained: `origin` → `git@github.com:k2htet/yway-platform.git`.
- `main` was pushed with normal, non-force pushes. The remote had no conflicting branch history.
- Pre-push verification passed: `pnpm agent:doctor` and `pnpm verify:full`.
- GitHub Actions run #1 (`35334035853`) failed during dependency installation because the existing pnpm `esbuild` build allowlist was in an ignored `pnpm-workspace.yaml` and therefore was not present on GitHub. The failed run remains visible.
- The smallest G2/G3-related fix stopped ignoring and committed `pnpm-workspace.yaml`; no dependency or technology choice changed.
- GitHub Actions run #2 (`35334782520`) completed successfully on `main`. Dependency installation, `pnpm agent:doctor`, and `pnpm verify:full` all passed. The required job/check name is `Verify` (workflow `CI`).
- GitHub's branch-protection page reports that rules will not be enforced on this private repository unless it is moved to a GitHub Team or Enterprise organization account. No unenforced rule was treated as protection.
- Owner action required: move the private repository to an eligible GitHub Team or Enterprise organization account, then configure `main` to require a pull request, require the `Verify` CI check, require conversation resolution, and keep force pushes and deletion disabled.
- `PRODUCT_VISION.md` and `PRODUCT_CONTRACTS.md` were unchanged by G1, G2, and G3 work.

---

## Step H1 Execution Record

**Status:** COMPLETE. Step G3 remains independently blocked and incomplete; Steps I1 and J1 remain incomplete.

- Created `README.md` with a concise repository description, prerequisites, setup, verification commands, source-of-truth entry points, agent harness locations, and the Build Report's advisory status.
- Created `CONTRIBUTING.md` with the task workflow, simple branch naming, worktree and writer guidance, verification meanings and limitations, product/decision governance, reviewer references, pull request process, and accurate GitHub/G3 status.
- `pnpm agent:doctor` passed under Node v24.20.0 with pnpm 11.24.0.
- `pnpm verify:full` passed: lint, typecheck, formatting, and structural invariant checks passed; tests were skipped because no test script exists.
- Structural invariant checks remain guardrails only and are not proof of semantic, privacy, authorization, consent, offline, accessibility, or localization correctness.
- `PRODUCT_VISION.md` and `PRODUCT_CONTRACTS.md` were unchanged. No product requirement, application code, dependency, architecture choice, technology choice, or decision record was introduced.

---

## Decision Log

| Date | Decision | Status | Rationale |
|------|----------|--------|-----------|
| 2026-09-18 | Stage 0 scope limited to agentic foundation | ACCEPTED | User instruction: do not build product features yet |
| 2026-09-18 | Build Report classified as advisory, not authoritative | ACCEPTED | User instruction: Product Vision is highest authority |
| 2026-09-18 | Architecture document must be vendor-neutral | ACCEPTED | User instruction: do not lock in unvalidated technologies |
| 2026-09-18 | Physical app/package shells deferred until validated | ACCEPTED | User instruction: separate logical domain from physical package |
| 2026-09-18 | Decision records created only for Stage 0 decisions | ACCEPTED | User instruction: avoid speculative decision records |
| 2026-09-18 | Foundation tooling evaluated and decided in Step C1 | PENDING | Must be done before scaffolding |
| 2026-09-18 | Codex agents use TOML format | ACCEPTED | User instruction: match Codex custom agent schema |
| 2026-09-18 | OpenCode agents use Markdown with YAML frontmatter | ACCEPTED | User instruction: dual-agent support for B2 |
| 2026-09-18 | Shared skills under .agents/skills/ for both tools | ACCEPTED | User instruction: one shared source of truth |
| 2026-09-18 | Codex skills use directory/SKILL.md format | ACCEPTED | User instruction: match skill metadata requirements |
| 2026-09-18 | Dependency directions are provisional hypotheses | ACCEPTED | User instruction: do not lock in speculative edges |
| 2026-09-18 | GitHub remote and live CI validation required in Stage 0 | ACCEPTED | User instruction: CI must actually execute, not just pass syntax check |
| 2026-09-18 | D2 creates only remaining empty directories; .codex/agents/, .opencode/agents/, .agents/skills/ excluded (created in B2/B3) | ACCEPTED | Corrected outdated D2 wording to avoid recreating existing directories |
| 2026-09-18 | AGENTS.md created with 114 lines, all 10 sections, referencing contract IDs YWAY-P001 through YWAY-P030 and YWAY-E001 through YWAY-E006 | ACCEPTED | Step B1 implementation |
| 2026-09-18 | B2 creates both Codex (.toml) and OpenCode (.md) reviewer agents with matching semantics | ACCEPTED | Dual-agent harness per user instruction |
| 2026-09-18 | No model or provider pinned in any agent definition or config | ACCEPTED | Prefer session inheritance per user instruction |
| 2026-09-18 | F1 owns readiness and verification orchestration; F2 owns structural invariant implementation and activation | ACCEPTED | Avoid claiming invariant verification exists before Step F2 |
| 2026-09-18 | F2 uses conservative AST identifier checks only; semantic and physical-boundary enforcement remains deferred | ACCEPTED | Structural guardrails can reject explicit prohibited implementation names without claiming proof or inventing package boundaries |
| 2026-09-18 | F2 inspects both ordinary and ECMAScript private identifiers | ACCEPTED | TypeScript represents names such as `#careerScore` as `PrivateIdentifier`, so both declaration and access must be normalized before rule lookup |

---

## Files Expected to Be Created

| File | Purpose | Step |
|------|---------|------|
| `docs/product/PRODUCT_CONTRACTS.md` | Checkable product invariants | A1 |
| `docs/decisions/000-TEMPLATE.md` | Decision record template | A2 |
| `docs/decisions/001-foundation-tooling.md` | Foundation tooling decision | C1 |
| `AGENTS.md` | Root agent instructions | B1, E2 |
| `.codex/config.toml` | Codex project configuration | B2 |
| `.codex/agents/product-integrity-reviewer.toml` | Reviewer agent definition | B2 |
| `.codex/agents/architecture-reviewer.toml` | Reviewer agent definition | B2 |
| `.codex/agents/security-privacy-reviewer.toml` | Reviewer agent definition | B2 |
| `.codex/agents/test-reviewer.toml` | Reviewer agent definition | B2 |
| `.opencode/agents/product-integrity-reviewer.md` | Reviewer agent definition | B2 |
| `.opencode/agents/architecture-reviewer.md` | Reviewer agent definition | B2 |
| `.opencode/agents/security-privacy-reviewer.md` | Reviewer agent definition | B2 |
| `.opencode/agents/test-reviewer.md` | Reviewer agent definition | B2 |
| `.agents/skills/yway-exec-plan/SKILL.md` | Reusable skill | B3 |
| `.agents/skills/yway-product-integrity/SKILL.md` | Reusable skill | B3 |
| `.agents/skills/yway-pr-review/SKILL.md` | Reusable skill | B3 |
| Root config files (depend on C1) | Scaffolding | D1 |
| `docs/architecture/ARCHITECTURE.md` | Vendor-neutral domain boundaries | E1 |
| `scripts/agent-doctor.ts` | Environment readiness diagnostics | F1 |
| `scripts/run-verification.ts` | Cross-platform verification orchestration | F1 |
| `scripts/check-product-invariants.ts` | Structural invariant checks | F2 |
| `.github/ISSUE_TEMPLATE/task.md` | Issue template | G1 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template | G1 |
| `.github/workflows/ci.yml` | CI workflow | G2 |
| `README.md` | Repo onboarding | H1 |
| `CONTRIBUTING.md` | Standards and workflow | H1 |

---

## Owner Prerequisites

The following owner actions are required before Stage 0 can fully complete:

1. **GitHub repository setup — satisfied**: `git@github.com:k2htet/yway-platform.git` is configured as `origin`.
2. **Push access — satisfied**: normal pushes to `main` succeeded.
3. **Enforced branch protection — blocked**: GitHub reports that rules will not be enforced on this private repository unless it is moved to a GitHub Team or Enterprise organization account. The owner must make that account/repository change, then configure the required `main` protections.

Until enforced branch protection is available and configured, Step G3 remains explicitly blocked and unchecked. Step H1 is complete; Steps I1 and J1 remain incomplete.
