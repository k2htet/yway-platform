# AGENTS.md Context Audit

Date: 2026-09-21

## Scope and method

This audit is limited to repository instruction surfaces: the root `AGENTS.md`, `.codex/`
configuration and reviewer adapters, the parallel reviewer-instruction pattern under
`.opencode/agents/`, the active ExecPlan needed for this task, and canonical passages required to
verify that product and governance constraints are preserved. It does not inventory application
code or broadly traverse the repository.

## Current problems

### One instruction scope for every task

The repository has a root `AGENTS.md` and no nested `AGENTS.md` files. Product safety rules,
architecture-editing procedure, environment setup, verification commands, and review workflow are
therefore presented together for every task.

The root guardrails and authority order are correctly repository-wide. The following guidance is
task-specific and should be closer to the files it governs:

- product-document editing and source-traceability rules
- architecture and ADR editing procedure
- audit evidence and non-authority rules
- ExecPlan maintenance and Stage-transition rules
- Codex configuration and reviewer-adapter maintenance

### Unbounded prerequisite wording

The root working agreement says to read relevant contracts, the active ExecPlan, architecture
sections, and accepted decisions. “Relevant” is not defined by a trigger, and “the active
ExecPlan” can be interpreted as mandatory even for unrelated work. This encourages exploratory
search across `docs/product/`, `docs/architecture/`, `docs/decisions/`, and
`docs/exec-plans/` before the task scope is known.

The setup and review sections can also imply that environment setup, full verification, the pull
request template, and every reviewer discipline are prerequisites for a small documentation or
instruction edit. Those are useful commands and gates, but they should be selected in proportion
to the changed surface and any matching plan.

### Duplicated reviewer authority text

Each of the four `.codex/agents/*.toml` adapters repeats the six-entry authority hierarchy already
owned by root instructions. The four `.opencode/agents/*.md` adapters repeat the same block again.
These copies are not currently contradictory, but they add drift risk and reviewer context. The
reviewer-specific focus lists are appropriate because they are loaded only when that reviewer is
invoked.

### Broad or outdated phrasing

- “Architecture authority when created” in reviewer adapters is stale because
  `docs/architecture/ARCHITECTURE.md` exists.
- Root review language points at all reviewer locations instead of making review conditional on
  the changed risk surface.
- Root architecture wording combines permanent constraints with procedures that matter only when
  architecture or technology is being changed.
- No root rule currently states the broader governance invariant requested for this audit: a
  roadmap Stage must not be activated, advanced, or closed without explicit owner authority.

No direct conflict was found between the root product summaries and the canonical Product Vision
or Product Contracts.

## Token and context risk areas

| Trigger today          | Unnecessary context risk                                                             | Boundary needed                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Any task               | Root can imply loading product contracts, Architecture, ADRs, and an active ExecPlan | Start from named files; load canonical sections only when the task changes their concern  |
| Any multi-step task    | The only active Stage plan may be mistaken for the task plan                         | Search plan names first; read only a matching plan and create one when required           |
| Any documentation edit | All canonical docs may be treated as prerequisites                                   | Classify the document by authority and follow only its closest instructions               |
| Any handoff            | Full setup and all reviewer disciplines may be inferred                              | Verify proportionately; use only risk-relevant gates unless a matching plan requires more |
| Reviewer invocation    | Adapter repeats repository authority text                                            | Keep reviewer focus local and route shared authority to root/canonical docs               |

The largest expected saving is avoidance of unrelated canonical documents, not removal of a few
sentences from root. Product Vision, Product Contracts, Architecture, accepted decisions, and the
active Stage plan together are much larger than the instruction files.

## Proposed instruction hierarchy

### Root `AGENTS.md`

Keep only repository-wide rules:

- source-of-truth order
- non-negotiable product, privacy, sharing, evidence, provenance, offline, and age boundaries
- architecture/technology decision authority
- explicit Stage-activation authority
- smallest-change, user-work preservation, truthful verification, and plan requirements
- trigger-based context boundaries

### `docs/AGENTS.md`

Define documentation authority classes, narrow source reading, and docs-only validation behavior.
Make clear that audits and ExecPlans are evidence/execution artifacts, not product or architecture
authority.

### `docs/product/AGENTS.md`

Localize Product Vision and Product Contract editing rules, including owner authority and stable
contract traceability.

### `docs/architecture/AGENTS.md`

Localize Architecture reading/editing rules, logical-versus-physical boundaries, and the rule
that accepted decisions—not proposed candidates—authorize significant choices.

### `docs/decisions/AGENTS.md`

Localize ADR template, status, and acceptance rules so decision authors do not need a broad docs
search.

### `docs/audits/AGENTS.md`

Localize evidence, scope, exact-citation, and truthful-check requirements. Prevent audits from
silently becoming authority.

### `docs/exec-plans/AGENTS.md`

Localize matching-plan discovery, progress updates, and explicit Stage-transition authority.

### `.codex/AGENTS.md`

Localize Codex configuration rules: opt-in optional tools, no duplicated shared policy, and
read-only reviewer adapters with risk-specific focus.

No `src/AGENTS.md` or `packages/AGENTS.md` should be created now because neither directory exists.
When those trees are introduced by an authorized implementation decision, add local instructions
only for rules that genuinely differ by boundary.

## Files to move or create

No canonical content should move. Instruction responsibilities should move by rewriting the root
and creating:

- `docs/AGENTS.md`
- `docs/product/AGENTS.md`
- `docs/architecture/AGENTS.md`
- `docs/decisions/AGENTS.md`
- `docs/audits/AGENTS.md`
- `docs/exec-plans/AGENTS.md`
- `.codex/AGENTS.md`

The repeated authority block in each `.codex/agents/*.toml` file should be replaced by a concise
route to root and canonical sources. Reviewer-specific focus lists should remain.

## Before and after structure

Before:

```text
AGENTS.md
.codex/config.toml
.codex/agents/*.toml       # repeats shared authority hierarchy
docs/**                    # no local instruction boundaries
```

After:

```text
AGENTS.md                  # repository-wide invariants and context triggers
.codex/
  AGENTS.md                # Codex configuration/adapter rules
  config.toml
  agents/*.toml            # reviewer-specific focus only
docs/
  AGENTS.md                # documentation authority and bounded reading
  product/AGENTS.md        # product-source editing
  architecture/AGENTS.md   # architecture editing
  decisions/AGENTS.md      # ADR lifecycle
  audits/AGENTS.md         # audit evidence
  exec-plans/AGENTS.md     # plan lifecycle and Stage authority
```

## Expected context reduction

- Non-documentation tasks receive a shorter root file and no documentation workflow details.
- Small tasks are explicitly told not to preload canonical product, architecture, decision, or
  Stage-plan documents unless their behavior or authority is implicated.
- Multi-step tasks read one matching ExecPlan instead of treating every active plan as a
  prerequisite.
- Reviewer invocations avoid four repeated copies of the authority hierarchy in Codex adapters.
- Documentation tasks add only the short instructions on their path; they still load exact
  canonical sections when product, privacy, security, or architecture meaning is at stake.

This is a qualitative reduction because actual context assembly depends on the agent host. Word
counts before and after should be recorded during validation, but fewer words alone are not the
success criterion; avoided unrelated document loads are.

Measured after implementation:

- root instructions: 485 words before, 481 after
- four Codex reviewer adapters: 901 words before, 806 after (about 10.5% fewer)
- nested instruction files: 74–132 words each and loaded only for their applicable subtree

The root reduction is deliberately small because all repository-wide safety and authority rules
remain there. The expected material saving is the removal of unconditional discovery/loading of
unrelated canonical documents and plans.

## Implementation review

- Product integrity: `COMPATIBLE`; no material findings.
- Security/privacy: no material findings.
- Test/verification: no material findings; documentation-only scope and guardrail preservation
  received targeted review in addition to generic repository checks.
- Architecture: two medium ambiguities in decision routing were found, corrected, and confirmed
  resolved in focused re-review. No material architecture findings remain.

No reviewer self-approved a merge; human and branch-protection gates remain.

## Deferred questions

1. Should `.opencode/agents/` be normalized in a separate cross-tool change? It duplicates the
   same authority block, but is outside the Codex-specific implementation requested here.
2. What local instructions will `src/` or `packages/` need once an accepted decision introduces
   those directories? Do not pre-decide their boundaries now.
3. Should a future invariant script check that required root guardrail topics and nested
   instruction files remain present? This audit does not introduce a new enforcement mechanism or
   architecture decision.

## Guardrail preservation checklist

The implementation must retain repository-wide coverage for:

- exploration before choice and reversible guidance
- no fit, employability, candidate-quality, ranking, or composite scoring
- signal and evidence-level separation
- employer-independent core value and first value without mandatory login
- 18+ public access and separate review before any 16–17 pathway
- private profiles/portfolios, no public URL, and explicit purpose-specific sharing
- Quest/application separation and no implicit candidate state or employer access
- content/evidence provenance and the qualified-practitioner review gate
- offline preservation of youth work during synchronization
- server/data-layer authorization outcomes
- accepted-decision authority for significant architecture or technology choices
- explicit owner authority before any roadmap Stage transition
