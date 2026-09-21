# Stage 2 — Governed Content System and Operations Foundation

## Status

ACTIVE

Activation date: 2026-09-21

Kickoff issue: #32

## Purpose and outcome

Stage 2 establishes a repository-native, governed content-as-code pipeline that can author, validate, review, version, localize, and release provenance-preserving Career Experience Pack artifacts without claiming that synthetic fixtures are real practitioner endorsements or public-release-ready content.

The exit outcome is a clearly synthetic representative Pack that passes the complete fixture lifecycle and produces byte-deterministic committed JSON artifacts while preserving exact-version review scope, cumulative provenance history, localization/accessibility gates, sponsorship boundaries, and fixture isolation.

## Authority

Follow the repository authority order in `AGENTS.md`.

This ExecPlan is an execution artifact, not binding product or architecture authority.

- Product behavior remains governed by Product Vision and Product Contracts.
- Significant architecture choices become binding only through an ACCEPTED decision record and any required Architecture reconciliation.
- Issue #32 is explicit owner authority to activate Stage 2 and to evaluate the kickoff choices recorded there.
- `PRODUCT_VISION.md` must not change without separate explicit owner instruction.
- Completing Stage 2 must not activate Stage 3.

## Relevant Product Contracts

Primary contracts:

- `YWAY-P002` — every identified career experiment has the six-part structure.
- `YWAY-P005` and `YWAY-E006` — no career-fit, employability, candidate-quality, or composite scoring/ranking.
- `YWAY-P019` and `YWAY-E005` — cumulative content provenance plus qualified-practitioner review covering the exact content published.
- `YWAY-P020` — sponsorship disclosure and non-influence boundaries.
- `YWAY-P023` — Simple English canonical content and Burmese release-gate semantics.
- `YWAY-P024` — accessibility requirements; Stage 2 covers content-level checks only and does not claim runtime/device conformance.

## Current state

- Stage 0 and Stage 1 are COMPLETE.
- Issue #32 supplies explicit owner authority to start Stage 2.
- Stage 3 and all later stages remain PLANNED.
- The repository has no active ExecPlan before this kickoff.
- No CMS, workflow engine, database, authentication system, application framework, hosting platform, or UI implementation is selected.
- Current repository verification has no runtime `test` script; Stage 2 must add `node:test` coverage and include it in `verify:full`.
- YWAY-D003 is created by this kickoff as PROPOSED and must be reviewed before its architecture choices become normative.

## Target state

Stage 2 is complete only when the repository can demonstrate, through tests and the synthetic fixture, an immutable and tamper-detectable content lifecycle:

`authored → founder-reviewed → practitioner-reviewed → artifact-eligible → artifact-released`

with explicit `changes-requested` and `retired` outcomes; exact version/digest binding; cumulative provenance history; practitioner eligibility and independence; Burmese, content-accessibility, and sponsorship gates; deterministic artifact generation; and strict fixture/production separation.

## Scope

- Activate Stage 2 in roadmap/status documentation while leaving Stage 3 PLANNED.
- Review and, if accepted, reconcile YWAY-D003 for the Stage 2 content pipeline.
- Define strict source/governance schemas and generated JSON Schema.
- Implement immutable versioning, canonical SHA-256 digests, chained provenance events, and version-scoped attestations.
- Implement founder/practitioner review gates and practitioner eligibility rules.
- Implement the repository CLI described by issue #32.
- Implement localization, content-accessibility, sponsorship, release, fixture-isolation, and tamper-verification gates.
- Add deterministic committed JSON bundles/manifests for the representative fixture.
- Add authoring templates, qualification policy, role-overlap matrix, lifecycle/recovery/release/retirement runbooks.
- Add `node:test` unit/integration/end-to-end coverage and wire it into `verify:full`.
- Record actual verification and final four-discipline semantic review before closure.

## Non-goals

Do not:

- choose or implement a CMS or workflow engine
- choose or implement a database, API, hosting, deployment, authentication, or authorization system
- choose an application framework or physical app/package/service boundary
- implement Admin, preview, youth-facing, or other product UI
- introduce youth/employer data, scoring, ranking, verified assessment, candidate state, or public publishing
- commit real practitioner credential documents, sensitive identity material, or other personal data
- claim runtime accessibility/device conformance from content-only checks
- claim synthetic localization/review is real fluent/practitioner endorsement
- activate Stage 3

## Dependencies

- Stage 1 completion evidence in `docs/exec-plans/completed/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md`
- `AGENTS.md` and nested documentation instructions
- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- ACCEPTED decisions YWAY-D001 and YWAY-D002
- protected `main` and required `Verify` check
- YWAY-D003 review before the proposed repository-native content architecture becomes normative

## GitHub issue map

| Step | Issue |
| --- | --- |
| S2-01 | #33 — Review and accept the Stage 2 content-pipeline ADR |
| S2-02 | #34 — Define strict Pack and governance schemas |
| S2-03 | #35 — Implement immutable version digests and cumulative provenance |
| S2-04 | #36 — Enforce practitioner eligibility and independent approval |
| S2-05 | #37 — Implement content authoring and review CLI |
| S2-06 | #38 — Implement localization, accessibility, and sponsorship release gates |
| S2-07 | #39 — Implement deterministic artifact release and tamper verification |
| S2-08 | #40 — Exercise the complete synthetic representative Pack lifecycle |
| S2-09 | #41 — Add content operations policies and lifecycle runbooks |
| S2-10 | #42 — Validate and close Stage 2 without activating Stage 3 |

## Ordered implementation steps

### S2-01 — Architecture decision review

Review YWAY-D003 against Product Contracts and Architecture. The decision evaluates YAML content-as-code, repository-local lifecycle records, deterministic JSON release artifacts, and the explicit deferral of CMS/database/auth/UI choices.

Do not use the proposed choices as normative implementation authority until the ADR is ACCEPTED. If accepted, reconcile only the directly affected Architecture sections and unresolved-question register.

Validation: product-integrity, architecture, security/privacy, and test perspectives; repository verification appropriate to the documentation change.

### S2-02 — Strict content and governance schemas

Define strict schemas for Pack sources, localization, practitioner eligibility, review attestations, provenance events, and release manifests. Reject unknown fields, unsafe identifiers, duplicate IDs, invalid versions, incomplete identified experiments, and prohibited score/rank concepts.

Generate deterministic JSON Schema from the canonical runtime schemas.

### S2-03 — Immutable versions, digests, provenance, and lifecycle

Define canonical serialization and SHA-256 content digests. Bind append-only provenance events to the exact version/content digest and prior event digest. Keep cumulative provenance separate from current lifecycle status.

Every source or localization change creates a new positive immutable version and fresh version-scoped gates; prior history remains intact.

### S2-04 — Practitioner eligibility and review independence

Require founder review before practitioner approval. Practitioner eligibility must be manually verified, current, active, and occupation-scoped. Reject stale-digest, wrong-scope, expired, inactive, unverified, or self-authoring practitioner approvals.

Stage 2 stores only synthetic actor identities and non-sensitive qualification evidence references.

### S2-05 — Repository authoring/review CLI

Implement:

- `pnpm content:new-version --pack <id> [--from <version>]`
- `pnpm content:attest --pack <id> --version <n> --kind <kind> --actor <id> --outcome <approved|changes-requested>`
- `pnpm content:status --pack <id> --version <n> [--json]`
- `pnpm content:retire --pack <id> --version <n> --actor <id> --reason <reason>`

`content:retire` appends a retirement event bound to the exact immutable version and digest. If that version was released, it also commits an immutable canonical JSON retirement notice at `retirements/<pack-id>/<version>.json` within the same artifact root as its release. The notice binds the Pack ID, version, content digest, release-manifest digest, and retirement-event digest; it contains no private actor or reason details. The prior bundle, release manifest, source content, provenance, attestations, and release history remain intact. A retired version is no longer artifact-eligible and cannot be released again. Duplicate retirement and retirement-notice overwrite must be refused.

Use exit code 0 for success, 1 for validation/gate failure, and 2 for invalid invocation. Writes must be atomic and refuse overwrite.

### S2-06 — Localization, accessibility, and sponsorship gates

Require Burmese localization plus fluent-review evidence for artifact eligibility in the representative fixture. Add content-level accessibility review for authored reading order and alternatives/transcripts for referenced media. Require sponsorship disclosure when applicable and preserve editorial independence.

Runtime themes, scaling, screen readers, reduced motion, Burmese rendering, target-user comprehension, and device behavior remain later release gates.

### S2-07 — Deterministic release and verification

Implement:

- `pnpm content:release --pack <id> --version <n>`
- `pnpm content:verify`

Generate byte-deterministic canonical JSON bundle/manifests, reject unmet gates, refuse release overwrite, isolate fixture artifacts from production classification, and detect tampering. Retirement notices are part of the same artifact-only boundary as bundles/manifests. A consumer must check the retirement-notice path for the exact Pack ID/version in its current artifact snapshot before loading a released bundle, verify any notice against the bundle and release manifest, and reject a retired version. If the notice check cannot be completed or verified, loading fails closed. A consumer must refresh its artifact snapshot to learn about later retirements; Stage 2 does not select a distribution or refresh mechanism.

### S2-08 — Synthetic representative lifecycle

Create one clearly synthetic Pack with Simple-English canonical content and Burmese localization. Mark all representative actors, attestations, and content `fixtureOnly`. Exercise the happy path through artifact release and separately exercise `changes-requested` and `retired` outcomes through repository commands. Retirement coverage must confirm that current status becomes `retired`, prior provenance/release history remains intact, a released version gains a deterministic retirement notice visible through the artifact boundary, artifact consumers reject that version, and further release is refused. Commit the deterministic fixture artifact/manifests and any retirement notice generated for a released fixture version.

Synthetic evidence must never be described as real practitioner endorsement, production-quality content, or public-release readiness.

### S2-09 — Operations documentation

Add authoring templates, qualification policy, role-overlap matrix, review-scope and re-review rules, failure recovery, release/retirement procedures, and repository privacy guidance.

### S2-10 — Closure validation

After S2-01 through S2-09 are complete:

- run `pnpm test`
- run `pnpm agent:doctor`
- run `pnpm verify:fast`
- run `pnpm verify:invariants`
- run `pnpm verify:full`
- run final product-integrity, architecture, security/privacy, and test reviews
- record actual results
- move this plan to `completed/` only when every completion criterion is evidenced
- mark Stage 2 COMPLETE only then
- leave Stage 3 PLANNED

## Affected domains and likely repository areas

Logical domains: Content, Practitioner, Operations/Safeguarding. Product guardrails also touch localization/accessibility and score prohibition.

Expected repository areas after YWAY-D003 acceptance may include content source/artifact directories, repository scripts/libraries, tests, generated schemas, operations documentation, and package scripts. Exact physical paths must be chosen as bounded repository implementation details without implying future application/service boundaries.

## Validation strategy

Every implementation issue must add proportionate automated coverage. Stage 2 closure requires:

- schema rejection and generated-schema determinism tests
- digest and canonicalization tests
- audit-chain tamper tests
- lifecycle transition, changes-requested, retirement, and stale-approval tests
- practitioner eligibility/scope/expiry/self-author tests
- localization/accessibility/sponsorship gate tests
- atomic-write and overwrite-refusal tests
- deterministic release/manifest tests
- retirement-notice determinism, binding, tamper, and artifact-consumer rejection tests
- fixture-isolation tests
- end-to-end synthetic lifecycle through repository commands
- `pnpm test` using `node:test`, included in `pnpm verify:full`
- all repository verification commands required by issue #32
- final four-discipline semantic review

Verification results must be recorded as actually observed; structural checks do not substitute for semantic review.

## Privacy/security implications

- No youth or employer data is introduced.
- No real practitioner credential documents or sensitive identity data are committed.
- Hash/event chaining detects repository tampering but does not authenticate real-world identity.
- Trusted identity and authorization remain deferred.
- Fixture data must be clearly and mechanically distinguishable from production-classified data.

## Offline implications

N/A for youth interaction and synchronization. Stage 2 produces governed content artifacts only. YWAY-P022 remains unchanged.

## Localization/accessibility implications

- Simple English is canonical authoring content.
- The representative fixture includes Burmese localization and synthetic fluent-review evidence.
- Stage 2 verifies content-level accessibility metadata/reading-order requirements only.
- Runtime accessibility, Burmese rendering, target-user comprehension, and device validation are not satisfied by this stage and remain future release gates.

## Risks

- A repository-native pipeline could accidentally be treated as a future CMS/application architecture; YWAY-D003 must explicitly prevent that inference.
- Synthetic approvals could be mistaken for real endorsement; fixture classification and wording must make this impossible in release outputs.
- Canonicalization mistakes could make digests unstable or permit stale review reuse.
- Over-broad schema fields could introduce prohibited scoring semantics.
- Review/lifecycle status could overwrite provenance history unless modeled separately.
- Content-only localization/accessibility checks could be overclaimed as public-release readiness.

## Unresolved questions

No kickoff product decision remains unresolved in issue #32. Implementation must stop and surface any newly discovered product or significant architecture decision that is not covered by Product Contracts or an ACCEPTED ADR.

YWAY-D003 remains PROPOSED until S2-01 review is complete.

## Progress checklist

- [x] Stage 2 owner activation authority recorded in #32.
- [x] Active ExecPlan created.
- [x] Bounded S2 task issues #33–#42 created.
- [x] YWAY-D003 drafted as PROPOSED.
- [x] Roadmap and Stage Index activation change prepared.
- [ ] S2-01 ADR reviewed and accepted/rejected/deferred.
- [ ] S2-02 strict schemas complete.
- [ ] S2-03 immutable versions/digests/provenance complete.
- [ ] S2-04 practitioner eligibility/review independence complete.
- [ ] S2-05 authoring/review CLI complete.
- [ ] S2-06 localization/accessibility/sponsorship gates complete.
- [ ] S2-07 deterministic release/verification complete.
- [ ] S2-08 synthetic lifecycle fixture complete.
- [ ] S2-09 operations documentation complete.
- [ ] S2-10 closure validation complete.

## Discoveries log

- 2026-09-21: Stage 1 is COMPLETE and its closure explicitly leaves Stage 2 requiring separate activation authority. Issue #32 supplies that authority.
- 2026-09-21: The repository currently has no active ExecPlan and no runtime test script; Stage 2 closure explicitly requires adding `node:test`.
- 2026-09-21: Architecture currently defers content authoring format, review granularity, materiality, versioning/workflow details, and minimum practitioner qualification to Stage 2. YWAY-D003 is therefore required before those choices become normative.
- 2026-09-21: Issue #32 intentionally chooses an artifact-only boundary and synthetic fixture, while leaving future product/application delivery choices deferred.
- 2026-09-21: A repository-only retirement event is invisible to artifact-only consumers after release; a committed retirement notice and mandatory artifact-side check close that gap without rewriting historical artifacts.

## Decision log

| Date | Entry | Authority status |
| --- | --- | --- |
| 2026-09-21 | Activate Stage 2 under issue #32 and create S2-01 through S2-10 | Explicit owner execution direction |
| 2026-09-21 | Draft YWAY-D003 for YAML content-as-code, repository-local lifecycle records, deterministic JSON artifacts, and explicit deferrals | PROPOSED architecture decision; not binding until accepted |
| 2026-09-21 | Use a synthetic representative Pack for Stage 2 exit evidence and prevent fixture data from production classification | Explicit owner execution direction from #32; implementation shape subject to accepted architecture |

## Completion criteria

Stage 2 closes only when:

- YWAY-D003 or a replacement decision is ACCEPTED before its architecture choices are relied on normatively
- strict source/governance schemas reject malformed, unknown, duplicate, unsafe, incomplete, and prohibited scoring content
- exact immutable version/digest binding and cumulative tamper-detectable provenance are enforced
- founder and independent eligible practitioner approvals cover the exact released version/digest
- stale, ineligible, wrong-scope, expired, unverified, or self-authoring practitioner approval cannot satisfy the gate
- every source/localization edit creates a fresh version-scoped review/release path without erasing history
- Burmese, content-accessibility, and applicable sponsorship gates block release when missing
- the synthetic fixture passes the release path, exercises changes-requested and retirement paths through repository commands, and produces byte-deterministic committed artifacts
- retired versions preserve prior provenance/release history and cannot be released again
- retirement of a released version emits a deterministic artifact-boundary notice without rewriting its historical bundle/manifest, and consumers reject the retired version
- fixture records cannot produce production-classified artifacts or imply real/public approval
- source, audit-chain, manifest, and artifact tampering are detected
- `pnpm test` uses `node:test` and runs under `pnpm verify:full`
- `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, and `pnpm verify:full` pass and are recorded
- final product-integrity, architecture, security/privacy, and test reviews have no unresolved material finding
- Stage 2 is marked COMPLETE only after the exit evidence exists
- Stage 3 remains PLANNED until separately activated
