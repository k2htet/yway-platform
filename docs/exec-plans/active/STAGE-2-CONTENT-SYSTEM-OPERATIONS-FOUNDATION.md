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
- YWAY-D003 was accepted on 2026-09-22 after four-discipline review, repository verification, and explicit product-owner approval. Its bounded Stage 2 architecture choices are normative; production distribution and trusted-root acquisition remain deferred.

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
- ACCEPTED YWAY-D003 for the bounded repository-native Stage 2 content architecture

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

Completed 2026-09-22. YWAY-D003 is ACCEPTED, and the directly affected Content, Practitioner, Operations/Safeguarding, Content Provenance, invariant, and unresolved-question Architecture text is reconciled. Product-integrity, architecture, security/privacy, and test reviews found no material issue; local `verify:full` and the PR #43 GitHub `Verify` check passed. The local test phase reported no test script, as expected before the later Stage 2 implementation steps.

Review YWAY-D003 against Product Contracts and Architecture. The decision evaluates YAML content-as-code, repository-local lifecycle records, deterministic JSON release artifacts, and the explicit deferral of CMS/database/auth/UI choices.

The proposed choices were not normative implementation authority before acceptance. With YWAY-D003 now ACCEPTED, implementation may rely only on its bounded Stage 2 choices; the reconciled Architecture sections and unresolved-question register preserve all production deferrals.

Validation: product-integrity, architecture, security/privacy, and test perspectives; repository verification appropriate to the documentation change.

### S2-02 — Strict content and governance schemas

Completed 2026-09-23. Strict Zod runtime schemas plus alias-free strict YAML parsing now cover Pack
sources, localized content, practitioner eligibility, review attestations, provenance events and
logs, release manifests, and the artifact snapshot index under `content/schemas/`, with
deterministic draft-2022-12 JSON Schema output committed under `content/generated/` and regenerated
by `pnpm content:schemas`. A recursive prohibited-key scan rejects score/rank-style fields with an
explicit YWAY-P005/YWAY-E006 message in addition to strict unknown-field rejection. Founder and
practitioner attestations must carry six-part-structure and exposure-before-commitment content
review confirmations; localization attestations require a locale; fixtureOnly manifests cannot be
production-classified; snapshot entries are unique per path and per kind/version. `pnpm test` uses
`node:test` (60 tests) and runs under `verify:full`. Local `agent:doctor`, `verify:fast`,
`verify:invariants`, and `verify:full` all passed. Review follow-up corrections added an explicit
Pack `occupations` scope (required input for the S2-04 wrong-scope gate), source-uniqueness by
(pack ID, version) instead of pack ID alone, expressible governance conditionals (attestation
content-review/locale rules, fixture classification) in the generated JSON Schemas under `allOf`,
and a `$comment` on every generated file declaring that cross-array uniqueness, cross-field
equality, and date-window rules remain runtime-enforced; AJV parity tests verify the generated
schemas reject the same cited cases the runtime rejects (suite now 70 tests). Generated
`occupations` arrays also carry `uniqueItems`, matching the runtime uniqueness rule exactly for
string scopes (review follow-up; suite now 71 tests). A second review round asked for the
nonblank-string rule to be expressible in generated schemas and for the duplicated Pack/Localized
experiment shapes to stop drifting: `nonBlankStringSchema` now uses `.regex(/\S/)` (identical
runtime semantics to the previous trim-based refine) so `z.toJSONSchema` emits `pattern: \S`,
and the six-part experiment shape lives once in `common.ts` with `localizedExperimentSchema` as a
shared reference plus a reference-equality test (suite now 74 tests).

Define strict schemas for Pack sources, localization, practitioner eligibility, review attestations, provenance events, release manifests, and the artifact snapshot index. Reject unknown fields, unsafe identifiers, duplicate IDs, invalid versions, incomplete identified experiments, and prohibited score/rank concepts.

For each identified experiment, require content review to confirm both the six-part structure and that its next fork does not increase commitment before increasing real-world exposure. This semantic gate must block artifact eligibility and release; a structurally complete experiment with a commitment-first next fork is invalid under YWAY-P002. The S2-02 schemas make those content-review confirmations mandatory fields on founder/practitioner attestations; gate enforcement that blocks eligibility and release lands with S2-04 and S2-07.

Generate deterministic JSON Schema from the canonical runtime schemas.

### S2-03 — Immutable versions, digests, provenance, and lifecycle

Completed 2026-09-23. Canonical JSON serialization (`content/canonical.ts`) sorts object keys
deterministically at every depth, preserves array order, and fails closed on non-canonicalizable
values (non-finite numbers, `undefined`, sparse arrays, circular references, non-plain objects).
SHA-256 digests (`content/digest.ts`) hash the canonical UTF-8 bytes, giving deterministic
content digests that are sensitive to any field change. Append-only provenance
(`content/provenance.ts`) seals each event's `eventDigest` over the event's full field set
excluding only `eventDigest` itself, chains `previousEventDigest` to the prior sealed event with
`null` only at genesis, binds every event to the exact `packId`/`packVersion`/`contentDigest`,
requires a consistent `fixtureOnly` classification across a version's events (genesis creation
runs full lifecycle verification before returning), and refuses to extend tampered,
pack-mismatched, digest-changed, mixed-classification, or illegally transitioned logs.
Verification detects altered fields, resealed middle events with broken links, reordered or
removed events, non-contiguous sequences, conflicting digests within one immutable version,
fully resealed source bindings when compared against source-derived `expectedContentDigests`,
resealed chains whose lifecycle order is illegal, and tail truncation when the caller pins
`expectedHeadEventDigest`. Lifecycle semantics (`content/lifecycle.ts`) implement
`authored → founder-reviewed → practitioner-reviewed → artifact-eligible → artifact-released`
plus `changes-requested` and `retired` as a projection derived from cumulative history: current
status is computed per immutable version and never rewrites the event log; provenance-only
events (localized, localization-reviewed, accessibility-reviewed, sponsorship-disclosed) do not
change status and are rejected before the `authored` start and after `artifact-released`/
`retired`; `retired` is terminal and `artifact-released` can only retire. Version-scoped gates reject stale-digest and stale-version
records, and source/localization content changes at an existing version number are rejected,
requiring a fresh immutable version with fresh gates while prior versions' history and status
remain intact. Local `agent:doctor`, `verify:fast`, `verify:invariants`, and `verify:full`
passed; `pnpm test` (`node:test`) grew from 74 to 135 tests.

Define canonical serialization and SHA-256 content digests. Bind append-only provenance events to the exact version/content digest and prior event digest. Keep cumulative provenance separate from current lifecycle status.

Every source or localization change creates a new positive immutable version and fresh version-scoped gates; prior history remains intact.

### S2-04 — Practitioner eligibility and review independence

Completed 2026-09-23. Reusable gate functions `validateProposedPractitionerApproval` and
`verifyRecordedPractitionerApproval` (`content/practitioner-gate.ts`, exported from
`content/index.ts` for the S2-05 review command and S2-07 release verifier) enforce the
practitioner review gate against a source-derived version scope (`pack.id`/`pack.version`/
`contentDigest(pack)`). Both modes require an approved founder-review attestation and a
founder-review provenance event at that exact scope, with the founder checkpoint preceding the
practitioner approval on three bases: founder attestation `recordedAt` ≤ practitioner attestation
`recordedAt`, the checkpoint founder-review event `recordedAt` ≤ practitioner approval
`recordedAt`, and (recorded mode) founder event sequence < practitioner-reviewed event sequence
with matching founder attestation↔event and practitioner attestation↔event actors and `recordedAt`
instants, so a recorded review event cannot be satisfied by an attestation from a different time,
including one reused from a prior cycle after `changes-requested`. The proposed gate also requires
the bound founder event and attestation to have the same `recordedAt` instant. Both founder and practitioner
attestations require `reviewEventSequence` equal to their review event's `sequence` (recorded) or,
for a proposed practitioner approval, the next sequence that will record the event — so an
attestation is bound to its own review event rather than only by actor and timestamp. The proposed
gate additionally requires `founder-reviewed` as the standing status; the recorded gate requires
a standing `practitioner-reviewed`/`artifact-eligible`/`artifact-released` status, so
changes-requested or retired cycles cannot satisfy it. Attestation and eligibility must name the
same actor; eligibility must be manual (schema-enforced), active, verified, cover every Pack
occupation, and be valid at both review time and the explicit `evaluateAt` time on inclusive
windows evaluated against the UTC calendar date of each record's instant, and `evaluateAt` must not
precede the practitioner approval `recordedAt` (equal instants allowed). The authored-event
actor of that exact version cannot be the approver (self-authorship). Stale versions/digests are
rejected for attestations (`assertVersionScoped`) and provenance (`expectedContentDigests`);
mismatched fixture classification across pack, attestations, eligibility, and provenance events
is rejected; an optional `expectedHeadEventDigest` passes through so callers can pin the chain
head against tail truncation. Fixture validation is tightened: fixtureOnly eligibility and
attestations require `fixture-` actor identities and eligibility evidence requires `fixture:`
references (no real identity or credential material); runtime schemas and regenerated JSON
Schemas under `content/generated/` are aligned via matching `allOf` clauses with AJV parity
tests. A follow-up code review on 2026-09-23 found two behavioral gaps despite the then-passing
checks: recorded-mode actor matching alone allowed review events without temporally corresponding
attestations (a later practitioner attestation could satisfy an earlier event, and a pre-
`changes-requested` founder attestation could be reused against a same-actor founder event of a
new cycle), and `evaluateAt` could precede the practitioner approval while both dates still fell
inside the eligibility window. The recorded gate now requires each review event's `recordedAt`
instant to equal its attestation's `recordedAt` instant, and both modes reject an `evaluateAt`
earlier than the practitioner approval `recordedAt`. `pnpm test` grew from 135 to 182 tests, then
to 192 after founder and practitioner `reviewEventSequence` binding (see Discoveries).
Earlier S2-04 verification on 2026-09-23 passed: `pnpm
test` (192/192), `pnpm verify:fast`, `pnpm verify:invariants`, `pnpm verify:full` (lint,
typecheck, format:check, test, invariants, docs), and `pnpm content:schemas:check`. Risk-relevant
product-integrity, security/privacy, and test reviews were obtained (via review-prompted agents
after the dedicated reviewer adapters failed with a provider error); their material findings were
addressed before this record: head-pin passthrough for truncated logs, founder checkpoint event
`recordedAt`/actor binding, UTC-instant eligibility windows (offset-crafting), broadened
fixture- attestation identity rule to all kinds per this step's synthetic-identity scope, and
coverage tests for every flagged branch. Remaining surfaced (not decided here) items are recorded
in the Discoveries log.

Follow-up verification on 2026-09-23 after aligning proposed founder timestamps: `pnpm
verify:full` passed lint, typecheck, format, test, invariants, and docs; its Node test runner
reported six passing test files. `pnpm content:schemas:check` also passed.

Require founder review before practitioner approval. Practitioner eligibility must be manually verified, current, active, and occupation-scoped. Reject stale-digest, wrong-scope, expired, inactive, unverified, or self-authoring practitioner approvals.

Stage 2 stores only synthetic actor identities and non-sensitive qualification evidence references.

### S2-05 — Repository authoring/review CLI

Implement:

- `pnpm content:new-version --pack <id> [--from <version>]`
- `pnpm content:attest --pack <id> --version <n> --kind <kind> --actor <id> --outcome <approved|changes-requested>`
- `pnpm content:status --pack <id> --version <n> [--json]`
- `pnpm content:retire --pack <id> --version <n> --actor <id> --reason <reason>`

`content:retire` appends a retirement event bound to the exact immutable version and digest. If that version was released, it also commits an immutable canonical JSON retirement notice at `retirements/<pack-id>/<version>.json` within the same artifact root as its release and deterministically updates the snapshot index. The notice binds the Pack ID, version, content digest, release-manifest digest, and retirement-event digest; it contains no private actor or reason details. The prior bundle, release manifest, source content, provenance, attestations, and release history remain intact. A retired version is no longer artifact-eligible and cannot be released again. Duplicate retirement and retirement-notice overwrite must be refused.

Use exit code 0 for success, 1 for validation/gate failure, and 2 for invalid invocation. Writes must be atomic and refuse overwrite.

### S2-06 — Localization, accessibility, and sponsorship gates

Require Burmese localization plus fluent-review evidence for artifact eligibility in the representative fixture. Add content-level accessibility review for authored reading order and alternatives/transcripts for referenced media. Require sponsorship disclosure when applicable and preserve editorial independence.

Runtime themes, scaling, screen readers, reduced motion, Burmese rendering, target-user comprehension, and device behavior remain later release gates.

### S2-07 — Deterministic release and verification

Implement:

- `pnpm content:release --pack <id> --version <n>`
- `pnpm content:verify`

Generate byte-deterministic canonical JSON bundles/manifests and a canonical snapshot index enumerating every consumable bundle, release manifest, and retirement notice by path and digest. Reject unmet gates, refuse release overwrite, isolate fixture artifacts from production classification, and detect tampering. Retirement notices are part of the same artifact-only boundary as bundles/manifests.

The protected Git commit/tree containing the index is the Stage 2 trusted snapshot root. Before loading a released bundle, a consumer must verify the snapshot index and referenced files against that trusted tree, require the bundle and release-manifest entries, and inspect the exact retirement-notice entry for the Pack ID/version. It must reject a retired version and fail closed if the trusted root, index, required entries, file digests, or notice absence cannot be verified. Tests must prove that deleting only a retirement notice, or deleting it and rewriting the index, is detected. A consumer must refresh to a later trusted snapshot to learn about later retirements; Stage 2 does not select a distribution, trusted-commit acquisition, or refresh mechanism.

### S2-08 — Synthetic representative lifecycle

Create one clearly synthetic Pack with Simple-English canonical content and Burmese localization. Mark all representative actors, attestations, and content `fixtureOnly`. Exercise the happy path through artifact release and separately exercise `changes-requested` and `retired` outcomes through repository commands. Add a negative experiment fixture that contains all six required fields but increases commitment before real-world exposure; review, artifact eligibility, and release must reject it. Retirement coverage must confirm that current status becomes `retired`, prior provenance/release history remains intact, a released version gains a deterministic retirement notice visible through the artifact boundary, artifact consumers reject that version, notice deletion is detected against the trusted snapshot root, and further release is refused. Commit the deterministic fixture artifact/manifests, snapshot index, and any retirement notice generated for a released fixture version.

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
- YWAY-P002 semantic-gate tests, including a six-field experiment whose next fork increases commitment before exposure
- digest and canonicalization tests
- audit-chain tamper tests
- lifecycle transition, changes-requested, retirement, and stale-approval tests
- practitioner eligibility/scope/expiry/self-author tests
- localization/accessibility/sponsorship gate tests
- atomic-write and overwrite-refusal tests
- deterministic release/manifest tests
- snapshot-index determinism and protected-Git-tree binding tests
- retirement-notice determinism, binding, tamper, deletion, and artifact-consumer rejection tests
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
- A structurally complete experiment could still violate YWAY-P002 if its next fork escalates commitment before real-world exposure.
- A retirement notice could be deleted undetectably unless its presence or absence is evaluated within an index bound to a trusted snapshot root.

## Unresolved questions

No kickoff product decision remains unresolved in issue #32. Implementation must stop and surface any newly discovered product or significant architecture decision that is not covered by Product Contracts or an ACCEPTED ADR.

YWAY-D003 is ACCEPTED. S2-02, S2-03, and S2-04 are complete; S2-05 (authoring/review CLI) is the next active plan step. Stage 2 remains ACTIVE, and Stage 3 remains PLANNED.

Surfaced follow-ups from S2-04 reviews (not decided in that step): founder/practitioner role
overlap is not gate-enforced — independence in S2-04 means non-author only, and the role-overlap
matrix remains S2-09; a consistent `fixtureOnly: false` relabeling of pack, governance records,
and provenance together passes cross-record consistency (flag-based classification cannot
authenticate intent while identity/authorization remain deferred under YWAY-D003) — an inverse
`fixture-`-identity ⇒ `fixtureOnly` rule and qualification-policy wording are deferred to S2-09;
`verification.verifiedOn` is not window-checked against review/evaluation time (not required by
issue #36); the attestation `note` field remains unbounded free text for S2-09 privacy guidance.

## Progress checklist

- [x] Stage 2 owner activation authority recorded in #32.
- [x] Active ExecPlan created.
- [x] Bounded S2 task issues #33–#42 created.
- [x] YWAY-D003 drafted as PROPOSED.
- [x] Roadmap and Stage Index activation change prepared.
- [x] S2-01 ADR reviewed and accepted/rejected/deferred.
- [x] S2-02 strict schemas complete.
- [x] S2-03 immutable versions/digests/provenance complete.
- [x] S2-04 practitioner eligibility/review independence complete.
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
- 2026-09-22: Checking an optional retirement-notice path cannot authenticate absence; the snapshot needs a canonical inventory bound to the protected Git tree, plus deletion tests.
- 2026-09-22: Six-field completeness alone does not enforce YWAY-P002; experiment review and release must reject a next fork that escalates commitment before real-world exposure.
- 2026-09-22: Four-discipline review found no material issue in YWAY-D003, local and GitHub verification passed, and the product owner explicitly accepted the bounded Stage 2 recommendation. Production artifact distribution and trusted-root acquisition remain deferred.
- 2026-09-23: S2-02 implemented with Zod strict objects, a recursive prohibited-key scan, alias-free strict YAML (`uniqueKeys`, `maxAliasCount: 0`), and draft-2022-12 JSON Schema generation under `content/schemas/` + `content/generated/`. `pnpm test` (`node:test`, 60 tests) was added and now runs inside `verify:full` without changing the verification runner. Generated schema files are excluded from Prettier so committed artifacts stay byte-identical to the deterministic renderer.
- 2026-09-23: S2-02 review corrections: Pack sources now carry required occupation scope so S2-04 can compare practitioner eligibility against the Pack; source uniqueness is (pack ID, version) because immutable versions share a pack ID; generated JSON Schemas carry the expressible governance conditionals under `allOf` (not emitted by `z.toJSONSchema` from `superRefine`) plus a `$comment` limiting non-expressible rules to runtime validation, with AJV tests proving parity on the cited cases.
- 2026-09-23: S2-03: event digests are sealed over the event's full field set excluding `eventDigest`, so verification recomputes from the stored fields directly and a partially resealed chain still fails on link or lifecycle checks. Provenance verification runs lifecycle transition validation as part of chain verification, so a fully resealed log with an illegal status order is still rejected; hashes detect tampering but do not authenticate actor identity (identity/authorization remain deferred per YWAY-D003). Tail truncation of an otherwise valid chain is undetectable from the log alone; `expectedHeadEventDigest` lets a caller pin the head, and post-release anchoring arrives with the S2-07 release manifest and snapshot index.
- 2026-09-23: S2-04: eligibility validity windows are evaluated against the UTC calendar date of each record's instant (`Date.parse` basis), so offset-crafted wall-clock dates cannot move an approval outside its window, and equal founder/practitioner attestation timestamps are accepted because provenance event sequence and standing status carry the authoritative ordering. Eligibility stays occupation/time-scoped with no embedded pack coordinates (matching YWAY-D003's eligibility definition); its binding to the source-derived scope is through same-actor attestation linkage, fixture classification consistency, and Pack occupation coverage rather than version fields on the eligibility record itself.
- 2026-09-23: S2-04 reviews surfaced rather than decided: founder/practitioner role overlap is not gate-enforced (non-author independence only; matrix is S2-09); a fully consistent `fixtureOnly: false` relabeling across pack, records, and provenance passes cross-record checks because flag-based classification cannot authenticate intent while identity remains deferred — an inverse fixture-identity rule and qualification-policy wording are recommended for S2-09; the recorded gate validates the latest practitioner event actor with superseded cycle events governed by standing-status semantics; `verifiedOn` is not window-checked and attestation `note` is unbounded free text (both for S2-09 guidance).
- 2026-09-23: S2-04 follow-up code review found the recorded gate binding attestations to events only by actor, not time — a practitioner-reviewed event could be satisfied by an attestation recorded after it, and a founder attestation from before a `changes-requested` cycle could be reused against a new same-actor founder event — and both gates could evaluate at a time preceding the approval while both dates still sat inside the eligibility window. Fixes: recorded mode now requires attestation `recordedAt` instants to equal the corresponding event `recordedAt` instants (instant comparison, so offset-equivalent timestamps match), and both modes reject `evaluateAt` earlier than the practitioner approval `recordedAt` (equal allowed). The inclusive-window boundary test now uses a same-window-open approval because an earlier evaluation is correctly refused. Suite grew 176 → 182 tests.
- 2026-09-23: A second S2-04 follow-up found two remaining founder-attestation reuse paths that timestamp matching alone cannot close: (1) after `changes-requested`, the proposed gate accepted a prior-cycle founder attestation against a new same-actor founder event because it only checked actor and ordering, and (2) the recorded gate's actor+timestamp match could be satisfied when a new founder event reused the prior cycle's `recordedAt`. Fix: founder-review attestations now require `reviewEventSequence` (schema-required, forbidden on non-gate kinds, expressible under generated JSON Schema `allOf`), and both gates require it to equal the checkpoint founder-reviewed event's `sequence`. Sequence is unique and immutable in the chain, so an old attestation cannot bind a new cycle's event even when actor and timestamp match.
- 2026-09-23: A third S2-04 follow-up closed the parallel practitioner-attestation reuse path: practitioner attestations could not carry `reviewEventSequence`, so the recorded gate matched them only by actor and timestamp, and a new practitioner event could reuse the prior cycle's `recordedAt` (provenance does not require increasing timestamps). Practitioner attestations now also require `reviewEventSequence`; the recorded gate requires it to equal the practitioner-reviewed event's `sequence`, and the proposed gate requires it to equal the next sequence that will record the approval. Suite grew 182 → 192 tests.
- 2026-09-23: A later S2-04 review found proposed mode accepted a bound founder attestation whose `recordedAt` differed from its founder event, although recorded mode rejected the same pair. Proposed mode now checks instant correspondence too; the co-timestamped founder/practitioner approval test uses a founder event at the same instant, and a regression test rejects mismatched founder times. The latest `verify:full` and `content:schemas:check` runs passed.

## Decision log

| Date | Entry | Authority status |
| --- | --- | --- |
| 2026-09-21 | Activate Stage 2 under issue #32 and create S2-01 through S2-10 | Explicit owner execution direction |
| 2026-09-21 | Draft YWAY-D003 for YAML content-as-code, repository-local lifecycle records, deterministic JSON artifacts, and explicit deferrals | PROPOSED architecture decision; not binding until accepted |
| 2026-09-21 | Use a synthetic representative Pack for Stage 2 exit evidence and prevent fixture data from production classification | Explicit owner execution direction from #32; implementation shape subject to accepted architecture |
| 2026-09-22 | Bind the canonical artifact snapshot index to its protected Git commit/tree and fail closed when absence of a retirement notice cannot be verified | Proposed YWAY-D003 integrity mechanism; resolves artifact-boundary deletion ambiguity without selecting distribution architecture |
| 2026-09-22 | Make exposure-before-commitment a semantic review, eligibility, and release gate with a commitment-first negative fixture | Direct enforcement of YWAY-P002; no new product rule introduced |
| 2026-09-22 | Accept YWAY-D003 for Stage 2, reconcile Architecture, complete S2-01, and advance the active plan to S2-02 only | Explicit product-owner approval after four-discipline review and passing repository verification |
| 2026-09-23 | Implement S2-02 strict schemas with Zod runtime validation, alias-free strict YAML parsing, and deterministic generated JSON Schema; add `pnpm test` via `node:test` | Bounded implementation detail under ACCEPTED YWAY-D003; no new product or deferred architecture choice |
| 2026-09-23 | Add Pack occupation scope, (pack ID, version) source uniqueness, and expressible governance conditionals in generated JSON Schemas per S2-02 review | Bounded S2-02 review correction under ACCEPTED YWAY-D003; enables the S2-04 wrong-scope gate without deciding gate semantics |
| 2026-09-23 | Implement S2-03 canonical JSON/SHA-256 digests, chained append-only provenance with source-binding verification, derived per-version lifecycle status, and version-scoped gate/immutability checks under `content/` | Bounded implementation detail under ACCEPTED YWAY-D003; no new product rule or deferred architecture choice |
| 2026-09-23 | Implement S2-04 proposed/recorded practitioner approval gates with founder checkpoint precedence, same-actor eligibility binding, UTC-window validity at review and explicit evaluation time, self-authorship rejection, fixture- identity/evidence rules for fixtureOnly records, and head-pin passthrough | Bounded implementation detail under ACCEPTED YWAY-D003 enforcing YWAY-P019/YWAY-E005; independence means non-author per issue #36 with founder/practitioner role overlap explicitly deferred to the S2-09 role-overlap matrix |
| 2026-09-23 | Bind recorded-mode attestations to their review events' `recordedAt` instants and reject `evaluateAt` times preceding the practitioner approval per S2-04 follow-up review | Bounded S2-04 review correction under ACCEPTED YWAY-D003; strengthens the YWAY-P019/YWAY-E005 exact-content checkpoint without introducing a new product rule |
| 2026-09-23 | Bind founder-review attestations to the checkpoint founder event by required `reviewEventSequence` in both gate modes so prior-cycle attestations cannot satisfy a new cycle even when actor and timestamp match | Bounded S2-04 follow-up correction under ACCEPTED YWAY-D003; closes residual founder-attestation reuse without introducing a new product rule |
| 2026-09-23 | Bind practitioner attestations to their review events by required `reviewEventSequence` (recorded event sequence, or next sequence when proposed) | Bounded S2-04 follow-up correction under ACCEPTED YWAY-D003; closes residual practitioner-attestation reuse without introducing a new product rule |
| 2026-09-23 | Require proposed-mode founder attestation and bound founder event to share the same `recordedAt` instant | Bounded S2-04 review correction; proposed approval must not pass a founder checkpoint that recorded verification rejects |

## Completion criteria

Stage 2 closes only when:

- YWAY-D003 or a replacement decision is ACCEPTED before its architecture choices are relied on normatively
- strict source/governance schemas reject malformed, unknown, duplicate, unsafe, incomplete, and prohibited scoring content
- every identified experiment passes both six-field completeness and exposure-before-commitment review, including rejection of a structurally complete commitment-first next fork
- exact immutable version/digest binding and cumulative tamper-detectable provenance are enforced
- founder and independent eligible practitioner approvals cover the exact released version/digest
- stale, ineligible, wrong-scope, expired, unverified, or self-authoring practitioner approval cannot satisfy the gate
- every source/localization edit creates a fresh version-scoped review/release path without erasing history
- Burmese, content-accessibility, and applicable sponsorship gates block release when missing
- the synthetic fixture passes the release path, exercises changes-requested and retirement paths through repository commands, and produces byte-deterministic committed artifacts
- retired versions preserve prior provenance/release history and cannot be released again
- retirement of a released version emits a deterministic artifact-boundary notice without rewriting its historical bundle/manifest, updates the canonical snapshot index, and consumers reject the retired version
- artifact consumers verify the canonical snapshot index and referenced files against the protected Git tree, and detect deletion of a retirement notice even when the index is also rewritten
- fixture records cannot produce production-classified artifacts or imply real/public approval
- source, audit-chain, manifest, and artifact tampering are detected
- `pnpm test` uses `node:test` and runs under `pnpm verify:full`
- `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, and `pnpm verify:full` pass and are recorded
- final product-integrity, architecture, security/privacy, and test reviews have no unresolved material finding
- Stage 2 is marked COMPLETE only after the exit evidence exists
- Stage 3 remains PLANNED until separately activated
