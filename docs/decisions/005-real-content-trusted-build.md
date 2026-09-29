# Decision: Real-content pilot eligibility and trusted-build input for the Stage 3 private Android pilot

## Metadata

- ID: YWAY-D005
- Date: 2026-09-28
- Status: ACCEPTED
- Owners: Yway engineering / product owner
- Acceptance: 2026-09-28, by the project owner, with an explicit named residual-risk acceptance
  covering the six items in "Process validation" below, and with distribution gated on the
  `YWAY-D004` managed-device inventory that does not yet exist.
- Related ExecPlan: docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md (S3-02, issue #58)
- Related Product Contracts: YWAY-P002, YWAY-P019, YWAY-P020, YWAY-P023, YWAY-P024, YWAY-E005
- Related Product Contracts preserved by this decision: YWAY-P003, YWAY-P005, YWAY-P006, YWAY-P007,
  YWAY-P009, YWAY-P011, YWAY-P012, YWAY-P013, YWAY-P014, YWAY-P018, YWAY-P022, YWAY-P025, YWAY-E001,
  YWAY-E002, YWAY-E003, YWAY-E004, YWAY-E006
- Related decisions: YWAY-D003 (Stage 2 content pipeline, ACCEPTED), YWAY-D004 (Android delivery and
  device-only local state, ACCEPTED), YWAY-D001 (repository tooling, ACCEPTED)
- Evidence: docs/decisions/evidence/005-issue58-decision-evidence.md

Status note: **ACCEPTED 2026-09-28.** The design is now binding. The substantive claims were challenged
by four independent discipline reviews on 2026-09-28 before acceptance was sought; all material
findings are resolved and the review outcome is recorded under "Independent review outcome".

**Acceptance authorizes the design, not any operation.** No real reviewer, real Pack, build, device
distribution, supervised session, or public release is authorized by this record. The owner also
accepted, by name, the six residual risks in "Process validation" — including that the owner is a
recurring single point of failure, that a forged actor string remains possible and is caught only by a
human check before each session, that fixture-derived content under a new Pack ID is undetectable, that
the private review record has no tamper-evidence, that pinned-commit recency is a human control, and
that the Part D retirement response is inert until the `YWAY-D004` managed-device inventory exists.

## Context

Stage 2 (`YWAY-D003`) built a deterministic, provenance-preserving, version-scoped content lifecycle
and closed with one released Pack that is **explicitly synthetic and fixture-only**. That version was
subsequently retired, so the committed artifact tree currently records a release and a retirement for
`fixture-retail-assistant` version 2 and nothing else
(`artifacts/snapshot-index.json`). Its release boundary is a hard refusal in the opposite direction
from what a real-content path needs: it accepts fixture content only and refuses anything else, before
any other gate runs.

The refusal is unambiguous in source. `evaluateReleaseGates` throws before evaluating a single gate
when `pack.fixtureOnly` is false:

> `Stage 2 release gates accept fixture-only Packs only; production release requires a separately
authorized path` — `content/release-gates.ts:660-668`

Repository commands refuse the same case independently, and refuse a non-`fixture-` actor on fixture
content:

> `pack "<id>" version <n> is not fixture-only; Stage 2 repository commands accept only fixture-only
content (fixture isolation)` — `content/store.ts:274-281`
>
> `actor "<a>" must be a fixture- identity for fixture-only pack "<id>" (synthetic actor identities
only)` — `content/store.ts:282-289`

The artifact schemas make the same pin structural: the release bundle's `classification` is
`z.literal("fixture")` (`content/schemas/release-bundle.ts:33-34`), the release gate result's
`fixtureOnly` is `z.literal(true)` (`content/schemas/release-manifest.ts:39`), a fixture record may not
be classified as production (`content/schemas/release-manifest.ts:68-76`), and the consumer path
refuses anything else:

> `Stage 2 release artifacts must be classified as "fixture" (received "<c>")` —
> `content/artifacts.ts:230-235`

The trusted-snapshot consumer inherits the same pin: `inspectSnapshotVersion` calls
`assertFixtureOnlyProvenance(true, bundle.provenance)`, so every event in a loaded bundle must be
`fixtureOnly: true` with a `fixture-` actor (`content/snapshot-verify.ts:498`). That call is the
single chokepoint, and `loadReleasedBundle` is the only supported consumer path
(`content/snapshot-verify.ts:557-578`; `inspectSnapshotVersion` is deliberately not re-exported from the
public `content` surface — `content/index.ts:14` exposes only `loadReleasedBundle` —
`content/snapshot-verify.ts:409-416`).
There is therefore **no executable path by which non-fixture
content can reach a released artifact or a trusted snapshot today.** Creating one is `S3-04` / #60, not
this decision.

What `YWAY-D003` deliberately left open, and states in its own words, is the production half:

> "Distribution, trusted-commit acquisition, and snapshot refresh remain deferred." —
> `docs/decisions/003-stage-2-content-pipeline.md:87`

> "Revocation, tag verification, and trusted-root acquisition remain deferred beyond Stage 2." —
> `content/snapshot-verify.ts:46-49`

> "Stage 2 practitioner eligibility is repository-governed and synthetic for the exit fixture:
> occupation-scoped, manually verified, active/current, with non-sensitive evidence references only.
> **It does not establish a production identity or credential-verification architecture.**" —
> `docs/decisions/003-stage-2-content-pipeline.md:93`

`YWAY-D004` then bound the Stage 3 runtime and explicitly handed the remaining question to this record:

> "The artifact-embedding and build-trust mechanism — how Packs are embedded, how the build input is
> trusted, and how a retired Pack is handled — belongs to `YWAY-D005` / #58 and #63. This decision
> does not decide it." — `docs/decisions/004-android-delivery-local-state.md:343-345`

The Stage 3 plan (`docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md:46`) makes the requirement
explicit, and this record answers only it: "Accept a real-content pilot ADR covering actual
practitioner identity/qualification evidence, non-fixture release eligibility, protected trusted build
input, fixture isolation, and withdrawal of managed builds after content retirement. Do not store
credential documents or sensitive reviewer material in Git."

### The product outcomes this decision must preserve

- **`YWAY-P019`** — every Pack carries cumulative provenance distinguishing AI-assisted,
  founder-reviewed, and practitioner-reviewed work, preserved as history rather than replaced by a
  single status label; a qualified practitioner is the final content-quality gate; approval applies
  only to the content it covered, and changed content outside that scope cannot inherit an earlier
  approval. This decision is compatible with `YWAY-P019` only because review stays bound to the exact
  released content, because a real Pack establishes its own cumulative history, and because a real
  review is a real person's review rather than a string.
- **`YWAY-E005`** — a Pack must not be publishable without a practitioner review gate covering the
  content being published. Its violation conditions include "publishing changed content under stale
  approval from an earlier reviewed version" and "transitions that drop provenance history."
- **`YWAY-P002`** — the six-part experiment structure (Question → Action → Timebox → What to notice →
  Reflection → Next fork) governs each explicitly identified experiment, and each next step should
  increase real-world exposure before it increases commitment. Real content does not relax this. Note
  precisely what enforces it: a reviewer's confirmation is the control, not a content check — a
  commitment-first fork confirmed as exposure-first passes every remaining gate
  (`docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:153-156`). The real-content path inherits the
  same gate and this decision creates no route around it.
- **`YWAY-P020`** — sponsorship is disclosed and buys no editorial control, private youth data,
  ranking, or favorable treatment. A real Pack may be sponsored, and sponsorship must therefore be
  carried into the embedded content and displayed, not dropped at the artifact boundary. A reviewer
  connected to a Pack's sponsor is therefore named in the independence gaps below.
- **`YWAY-P023`** — Simple English is canonical during shaping; fluent Burmese review and target-user
  comprehension validation are mandatory **public release** gates. This decision does not claim
  comprehension validation, and it must not let a private pilot be represented as satisfying the
  public-release gate.
- **`YWAY-P024`** — themes, 200% Android text scaling, contrast, large touch targets, screen-reader
  support, reduced motion, and correct Burmese wrapping and reading order. `YWAY-D004` recorded an
  **open `YWAY-P024` Burmese line-breaking violation** and stated that "Burmese content is not cleared
  for the pilot while this is open" (`docs/decisions/004-android-delivery-local-state.md:508`). This
  decision does not clear it and creates no path that would let a build with Burmese user-facing text
  reach a participant while it is open.

Preserved structurally rather than newly discharged: `YWAY-P011` (first value without login — the
build has no network and no account, per `YWAY-D004`), `YWAY-P012` (18+, no birth date — content
carries no age data and this decision adds none), `YWAY-P013` (guided, not rigid), `YWAY-P022`
(offline preservation — this decision adds no network path), `YWAY-P014` and `YWAY-E004` (no
publicly addressable identifier for a private record), `YWAY-P025` (explicit exclusions — no ranking,
scoring, or fit measure is introduced), and `YWAY-P018` / `YWAY-E001` / `YWAY-E003` (no employer
surface, no implicit candidate state — a build that embeds content still has no network and no
account). `YWAY-P005` and `YWAY-E006` are preserved unchanged: this decision introduces no score, no
ranking, and no composite measure of a person or a career.

Preserved as constraints, not discharged: `YWAY-P003`, `YWAY-P006`, `YWAY-P007`, `YWAY-E002`, and
`YWAY-P009`. **Practitioner review of a Pack is content provenance and must never be presented as
strengthening the evidence level of anything a young person does.** The Stage 3 plan requires the app
to show practitioner-review status in Pack previews
(`docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md:34`); that is a fact about the content's
provenance, shown as one cumulative provenance category among others, and it is not verified
assessment, not practice, and not Portfolio evidence.

### Explicitly out of scope

Authentication and identity, authorization, synchronization and conflict resolution, server-side or
remote persistence, any network or OTA update path, public or store distribution, take-home installs,
a public-release gate, a 16–17 pathway, a CMS or workflow engine, cryptographic signing of
attestations, the app's UI and runtime implementation (#62, #63), the real Pack authoring and review
work (#59, #61, #64), the real-content release path (#60), runtime accessibility and Burmese
conformance (#66), and the full erase
implementation across permitted system data paths (#68).

Two further things are explicitly out of scope and are recorded here so that no implementation issue
is left to decide them implicitly:

- **The substantive qualification bar.** What "relevant occupation experience" requires in the real
  world — whether current practice suffices or a formal credential is needed, and who may set that
  bar — is a product and policy decision that `YWAY-P019` and `YWAY-D003` both leave open
  (`docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:204-205`) and that
  `docs/architecture/ARCHITECTURE.md` Section 11 schedules for Stage 7. This decision specifies only
  **who performs the check and where the evidence is held**. It does not set the bar.
- **Build tooling placement and the app-to-repository build seam.** Physical monorepo layout, package
  boundaries, and the placement of the build tooling are deferred by
  `docs/architecture/ARCHITECTURE.md` Section 10 and scheduled for Stage 10. See the recorded
  consequence that #63 fires `YWAY-D001`'s task-runner reevaluation trigger.

This decision must not decide the later service or application topology, and it must not imply that
production practitioner identity is settled.

## Security model

Without a named adversary, "trusted build" is unfalsifiable. This decision uses the following model.
It is a **Stage 3 private-pilot** model and does not inherit forward: Stage 4 adds a Portfolio, Stage 6
adds identity/authorization/consent, and Stage 7 revisits practitioner identity. Every property below
must be re-derived there rather than assumed.

**Assets:** the integrity of reviewed content; the truthfulness of the provenance and review claims
traveling with it; the identity and credential material of real practitioners; the young people's
responses and reflections; the installed build and the devices carrying it.

**Premise: the writer set is small and mostly trusted, but that is a premise and not a control.** The
repository is public by owner decision and `main` is protected, requiring a pull request, the
`Verify` check, and resolved conversations (`CONTRIBUTING.md:105`). The ADR does not enumerate who
holds write access, and it does not need to: the security model's forged-actor row is deliberately
split into **owner error** (a wrong pin, a stale pin, a lost record, a mis-cleared session — the likely
case) and **another repository writer forging an approval** (less likely, and much worse). Only the
second is an adversary. Owner error is handled by procedure, and the procedure is named.

### The governing asymmetry

This is the single most important structural fact in this record, and every design choice below
follows from it:

> **Git can prove integrity and scope. Git cannot prove identity, authority, or intent.**

`YWAY-D003` proved this against itself and recorded it plainly. The eligibility record's
`evidenceReferences` field is validated by a character class and then **read by no gate at all**:

> "`evidenceReferences` is read by no gate at all — it is validated by schema and nothing else — so an
> edit to it breaks nothing and is equally undetectable." —
> `docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:532-534`

> "Nothing authenticates the actor. A `fixture-` identity is a string, and any actor that can write
> the repository can write the record that claims it." —
> `docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:126-129`

And a consistent relabelling of fixture records to `fixtureOnly: false` passes every cross-record
check:

> "Relabelling a consistently `fixtureOnly: false` set of records is **not** detectable by these
> commands: flag-based classification cannot authenticate intent while identity remains deferred. It is
> not a permitted operation, and a relabelling is a governance breach regardless of whether a check
> catches it." — `docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:160-165`

> "Fixture classification is a flag, not an authentication. A consistently `fixtureOnly: false` set of
> pack, records, and provenance passes every cross-record check. Nothing binds a `fixture-` identity
> to a human being." — `docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:543-545`

A real-content path that treated a repository record as proof of a real person's qualification would
therefore be **claiming a property the repository does not have**. This decision is built the other
way round: the repository is the integrity and scope boundary, and the owner is the identity and
authority boundary. The two are recorded separately, and this record says which is which rather than
letting a green build imply a vetted human.

### What the repository mechanism does and does not prove

Stated precisely, because the difference is load-bearing:

- **What the pinned-tree comparison proves:** no drift between the build checkout and the tree pinned
  by the trusted commit, for the `artifacts/` subtree. The comparison is exhaustive in both directions
  and byte-for-byte (`content/snapshot-verify.ts:300-407`). Local ref and object-store redirection is
  neutralized (`content/snapshot-verify.ts:63-116`).
- **What it does not prove:** that the pinned bytes are the bytes the authoring sources produce. A
  bundle that is re-sealed and then _committed_ verifies successfully against that new commit, because
  the caller chose to trust it — this is demonstrated by an existing test, not hypothesized
  (`tests/content-snapshot-verify.test.ts:508-512`).
- **What it explicitly cannot prove:** provenance-prefix completeness. The artifact-only consumer
  proves the released version's provenance prefix is self-consistent, digest-pinned, and lifecycle-legal
  and is anchored to the release manifest. It cannot prove the prefix is complete for _earlier_
  versions of the same Pack; that needs the authoring sources and is the repository verifier's job
  (`content/snapshot-verify.ts:474-478`; `docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:552-555`).

Content authenticity within the pin therefore comes from the **repository verifier**, not from the
pinned-tree comparison. Part B requires it, and without it the record's own integrity claim would be
false.

### Adversaries in scope, and the control for each

| Adversary                                                                       | Control                                                                                                                                                                                                                                                                 | Residual risk                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Someone edits reviewed content in Git**                                       | Approvals are bound to pack id, version, and content digest, and re-verified at build time against the pinned tree                                                                                                                                                      | Drift _within_ the pin is caught by the repository verifier (Part B step 3), not by the pinned-tree comparison alone                                                                                                                                                                                                                                                                                                              |
| **Someone swaps or edits a release artifact**                                   | The local `artifacts/` tree is compared file-for-file, byte for byte, against the tree pinned by the trusted commit                                                                                                                                                     | None for the pinned subtree. The comparison is scoped to `artifacts/`; `content/` and app source are covered only transitively, via the bundle's embedded copy                                                                                                                                                                                                                                                                    |
| **Someone rewrites the snapshot index to hide a state**                         | The index must be the canonical deterministic rendering of its entries, must enumerate every pinned file, and each entry's digest must match                                                                                                                            | None. Absence is meaningful only because the comparison is exhaustive                                                                                                                                                                                                                                                                                                                                                             |
| **Someone deletes a retirement notice**                                         | Exhaustive bidirectional comparison: the rewritten tree no longer matches the pinned commit                                                                                                                                                                             | None. Tested for both notice-only deletion and deletion plus index rewrite                                                                                                                                                                                                                                                                                                                                                        |
| **Someone uses a stale approval on changed content**                            | Version and digest scope binding, plus fresh gates after every `changes-requested` cycle                                                                                                                                                                                | None for scope. Extends to real Packs only if the real path preserves the binding                                                                                                                                                                                                                                                                                                                                                 |
| **Another repository writer forges a real practitioner actor**                  | **Not controllable in Git, and this record does not pretend otherwise.** Identity evidence lives in an owner-controlled private record; Git receives only an opaque reference plus a digest-bound approval                                                              | A forged actor string is undetectable. Mitigated by the per-session clearance in Part C item 15, which now explicitly checks each embedded Pack's approving, founding, and releasing actors against that record. The residual remains                                                                                                                                                                                             |
| **The owner in error** (wrong pin, stale pin, lost record, mis-cleared session) | A written, ordered procedure with named stop conditions (Parts B and C)                                                                                                                                                                                                 | Not an adversary, but the most likely failure. Procedure-bound, and every step is recorded                                                                                                                                                                                                                                                                                                                                        |
| **A practitioner approves their own work**                                      | Mechanically refused for the exact version: "practitioner approver \"…\" authored … approval must come from an independent practitioner" (`content/practitioner-gate.ts:516-528`)                                                                                       | Narrow by construction and stated as such: independence is **non-authorship of that exact version only**. Not enforced: separation from the founder role, authorship of the localization, authorship of an earlier version of the same Pack, translator-equals-fluency-reviewer, or connection to the Pack's sponsor. The owner-side record covers these (`docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:114-130,140-143`) |
| **Someone authors a real Pack from fixture-authored content**                   | A real Pack requires a new Pack ID and fresh provenance history, and fixture Pack IDs are permanently fixture-classified, so no fixture _identity_ is reused                                                                                                            | **The dangerous action is not eliminated, only narrowed.** Copying fixture scenario text under a new Pack ID with rewritten actor strings produces a different content digest, trips none of these controls, and is **not detectable by any repository mechanism**. Review-enforced only, and named as such                                                                                                                       |
| **A real Pack carries synthetic evidence**                                      | Today: nothing. The `fixture:` evidence prefix is required _only_ when `fixtureOnly` is true (`content/schemas/practitioner-eligibility.ts:54-73`), and a positive test confirms a non-fixture record may use any reference (`tests/content-schemas.test.ts:603-614`)   | **Part A item 3 requires the inverse rules and assigns them to #60 as blocking checks.** Until #60 lands, a real Pack could cite `fixture:` evidence for its qualification and its Burmese fluency                                                                                                                                                                                                                                |
| **Someone promotes a fixture Pack by relabelling it**                           | A real Pack requires a **new Pack ID**; fixture Pack IDs are permanently fixture-classified by a verifier-side rule rather than a content record; the bundle schema pins `classification`; the real path (#60) must refuse fixture-classified content for a pilot build | The **relabelling itself is not detected**; the _release_ of a relabelled fixture is refused by the approved verifier. A repository change to that rule requires review                                                                                                                                                                                                                                                           |
| **Someone pins an older, still-valid commit**                                   | Nothing in Git. An older commit is a _valid_ trusted root, and a pre-retirement commit is internally consistent                                                                                                                                                         | **Accepted and stated.** This is why the pin is an owner act and why clearance is re-taken per session against the current protected branch, not once per build                                                                                                                                                                                                                                                                   |
| **Someone extracts Packs from a distributed APK**                               | Packs are content intended for the participant; the control is that the bundle must not overclaim                                                                                                                                                                       | Actor handles and review instants are inside the bundle bytes, exactly as they are for the fixture. Real actor identifiers must therefore be opaque owner-issued handles, never names — a normative constraint in Part A, not a preference                                                                                                                                                                                        |
| **Someone tampers with the installed APK**                                      | Post-install content integrity derives from `YWAY-D004`'s local APK signature and its pre-session artifact-hash check (`docs/decisions/004-android-delivery-local-state.md:114,347-351`)                                                                                | A resigned or repackaged APK is **indistinguishable to the content layer**; both bundle and manifest digests are recomputable. The signing key is the trust anchor, and the two decisions are coupled                                                                                                                                                                                                                             |
| **A compromised build host or dependency tree**                                 | Owner-machine build from a verified clean checkout, a frozen lockfile, no network fetch during a pilot build, and `YWAY-D004`'s pre-session artifact-hash check                                                                                                         | A fully compromised build host can emit any bytes and satisfy every step in Part B. Undetectable, accepted                                                                                                                                                                                                                                                                                                                        |
| **Someone adds a Pack to a build**                                              | Explicit Pack allowlist, read from the owner-controlled record; absence from the allowlist is a refusal, not a default                                                                                                                                                  | The allowlist's authorization is an owner act. If it were kept in Git it would be writable by the adversary above; Part B states its home                                                                                                                                                                                                                                                                                         |
| **Retirement status cannot be established**                                     | Fail closed                                                                                                                                                                                                                                                             | None, provided "fail closed" is actually implemented as "do not start"                                                                                                                                                                                                                                                                                                                                                            |
| **Burmese user-facing text ships with the open line-breaking violation**        | Not a content-integrity control — a rendering control owned by #62 and verified in #66                                                                                                                                                                                  | **Open.** `YWAY-D004` recorded this as a `YWAY-P024` violation. No pilot build containing Burmese user-facing text may reach a participant until #66 proves it fixed. This decision does not clear it                                                                                                                                                                                                                             |

**Adversaries explicitly out of scope:** a compromised owner-controlled private record (legitimate —
it is the root of the identity guarantee — but the record has no tamper-evidence, no second copy, and
no defined loss response, and this decision declines to protect it); a repository writer acting with
the owner's direct collusion; forensic recovery of a seized device and physical extraction of
decrypted storage (a residual in `YWAY-D004`); a participant photographing the screen (`FLAG_SECURE`
and supervision are `YWAY-D004` controls); and public-scale scraping, which does not exist without
public distribution.

**Residual risk accepted by construction:** the repository proves that the bytes a build embedded are
the bytes an owner-approved commit pins, and that an opaque-named actor's approval covers those exact
digests. It does **not** prove that the actor is a real, qualified person, that the owner vetted
them, or that the pinned commit is the newest approved one. Those three rest on the owner. This record
makes that division explicit so that no later report can be read as claiming more than it checked.

## Decision Drivers

- **Truthful review claims.** A practitioner-review claim reaching a real young person must be about a
  real practitioner reviewing real content (`YWAY-P019`, `YWAY-E005`). This is the primary driver and
  it outranks build convenience at every conflict.
- **Fixture isolation that survives relabelling.** The Stage 2 plan's first named Stage 3 risk is that
  "Stage 2's fixture release path cannot be relabeled as real content"
  (`docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md:79`).
- **No sensitive reviewer material in Git.** A plan-level constraint, not a preference. Note that a
  real Pack makes this harder than the fixture regime assumed, because a real name and a real
  qualification are exactly the material the Stage 2 schemas were designed to keep out.
- **Exact-scope review.** Approval must be bound to the exact released content, and stale approval
  must be mechanically refused rather than procedurally discouraged.
- **Explicit separation of pilot eligibility from public-release authorization.** Required by this
  issue; also the only way `YWAY-P023`'s public-release gates can stay meaningful while a private
  pilot runs real content.
- **Honest trust boundary.** No component may claim identity, authority, or recency that it does not
  establish. Provenance-prefix incompleteness, actor non-authentication, the unverifiability of the
  owner record, and the absence of revocation must stay visible in the record rather than being
  designed away in prose.
- **Bounded scope and reversibility.** This is a private pilot decision. It must be replaceable by a
  production content and identity architecture without re-authoring content or re-doing review.
- **Agentic implementability.** The decision must be expressible as checks a bounded local toolchain
  can run, so that #60 and #63 are ordinary implementation tasks rather than judgement calls — and
  the ADR must say which checks CI can enforce and which it cannot.

## Options Considered

### Option: Owner-held private review record, with an opaque reference in Git

- **Advantages:**
  - Directly satisfies the plan's "Do not store credential documents or sensitive reviewer material in
    Git", and it is the only option that can hold a real person's identity and qualification evidence
    without exposing it.
  - It makes the trust boundary honest: the human judgment lives with the human; the repository keeps
    integrity and scope.
  - It composes with what `YWAY-D003` already excluded from artifacts — qualification documents,
    attestation notes, and private retirement reasons are already absent from the release bundle
    (`content/schemas/release-bundle.ts:13-25`), and the retirement notice carries only
    `schemaVersion`, `packId`, `packVersion`, `contentDigest`, `releaseManifestDigest`, and
    `retirementEventDigest` — no actor and no reason (`content/schemas/retirement-notice.ts:4-13`).
    That exclusion is tested behaviourally, not just by schema: see
    `tests/content-release.test.ts:334-370` ("the release bundle excludes review notes, eligibility
    records, and retirement reasons").
- **Disadvantages:**
  - Identity and approval live outside the repository, so they cannot be re-verified from the
    repository alone, and an auditor needs the owner's record to audit the review.
  - Manual per-version work. It does not scale, and it is not automatable.
  - It creates a real operational dependency: a pilot cannot start if the owner is unavailable.
- **Risks:**
  - The private record could itself leak. It is a new store of personal data with **no** encryption
    requirement unless one is added, in a repository that is public by owner decision.
  - An opaque reference in Git could be mistaken for a credential or, worse, for proof of identity. It
    is neither; it is a pointer with no resolution mechanism and no integrity control.
  - A repository-side eligibility record can still be forged by a repository writer. The option
    reduces the value of that forgery; it does not make it impossible.
- **Validation evidence available:** the non-sensitive-reference character class forbids paths,
  whitespace, `@`, and `.` (`content/schemas/practitioner-eligibility.ts:11-18`), and
  `actorIdSchema` is lowercase kebab-case (`content/schemas/common.ts:79,90`), so a legal name
  containing a space or non-Latin script cannot be an actor ID. **Both are weaker than they look, and
  this record does not overstate them:** the existing test at `tests/content-schemas.test.ts:562-571`
  cannot isolate the character class, because its fixture record is `fixtureOnly: true` and the
  `fixture:` prefix rule could equally be what rejects the input. A positive test
  (`tests/content-schemas.test.ts:603-614`) demonstrates the permissiveness outright: a
  `fixtureOnly: false` record with `evidenceReferences: ["manual-verification-2026-001"]` parses
  successfully, and nothing in the schema forbids a transliterated name or a numeric identifier
  string. **Name and credential exclusion is therefore an owner-review control, not a schema
  guarantee.** Part A item 2 separately requires #60 to add a secret-scan check before the first real
  reviewer record. The owner-side procedure itself is process, not code, and cannot be validated by a
  test.
- **Unknowns:** where the record is kept, whether it is encrypted, its backup, its retention rule, and
  what happens if it is lost. Part A item 1d states the constraints; the format remains unspecified so
  the record can move to a system of record later.

### Option: Cryptographically signed attestations with a real reviewer key

- **Advantages:**
  - Would make a repository-side approval attributable to a specific key, which is exactly the
    property the current actor string lacks.
  - Machine-verifiable and independent of owner availability.
- **Disadvantages:**
  - Requires a key-issuance, revocation, and rotation model — a production identity architecture that
    `YWAY-D003` explicitly defers and that `docs/architecture/ARCHITECTURE.md` Section 11 schedules
    for Stage 7. A Stage 3 pilot would be first, and per-practitioner key distribution to
    practitioners is a safeguarding-adjacent problem with no answer here.
  - Adds a long-lived cryptographic dependency to a repository whose only integrity mechanism is a
    SHA-256 chain of `previousEventDigest`/`eventDigest` — which proves integrity of a file, not
    authorship.
- **Risks:**
  - A signature checked against the wrong key, or a key trusted by accident, produces a **stronger**
    false assurance than a plain actor string. The _reason_ is scope: a half-verified signature is
  - worse than no signature, and a plausible `practitioner-…` actor string that renders as a green
    verified review in every build already carries most of that risk. Signing does not add the
    failure mode; it only fails to remove it.
  - It would bind Stage 3 to a Stage 7 architecture decision made under time pressure, and reversing it
    would mean re-reviewing content under a new identity model.
- **Validation evidence available:** none in this repository. There is no signing, issuer, or
  key-identifier concept anywhere in the content system; the nearest thing is `YWAY-D004`'s local APK
  signing, which is explicitly outside the content system and is not pilot signing material.
- **Unknowns:** everything about key lifecycle and practitioner onboarding. **Rejected on scope, and
  the two cheaper controls below are accepted or deferred instead — neither is dismissed on grounds of
  principle.**

### Option: Per-session actor check against the owner record (no new key)

- **Advantages:** converts the largest accepted residual — a forged actor string — from "unchecked"
  into "checked before every supervised session", with no key lifecycle, no vendor, and no
  practitioner onboarding. It reuses the procedure Part C already requires.
- **Disadvantages:** it is a human check, so it depends on the owner being present and thorough; it
  cannot be automated and cannot be audited from the repository.
- **Risks:** a clearance performed carelessly re-creates the original problem. It must be recorded
  with the specific Pack IDs, versions, and actor handles it covered.
- **Validation evidence available:** none mechanically. The procedure is Part C item 15.
- **Unknowns:** none blocking. **ACCEPTED** as Part C item 15, on the reasoning that it is the highest
  value control available without a Stage 7 identity architecture.

### Option: Owner-signed build manifest using the existing `YWAY-D004` APK signing key

- **Advantages:** makes the trusted root and the Pack allowlist attributable to a key custodian who
  already exists, and detects a swapped pin. No new key, no rotation model, no practitioner
  onboarding.
- **Disadvantages:** it does not authenticate the practitioner, which is the property actually
  missing; and it couples Part B more tightly to `YWAY-D004`'s key custody, so a change to that
  custody reverses Part B.
- **Risks:** conflating "the key custodian approved this build" with "a practitioner reviewed this
  content" is precisely the false-assurance pattern this record exists to avoid.
- **Validation evidence available:** the key custody and per-session artifact-hash check already exist
  in `YWAY-D004` (`docs/decisions/004-android-delivery-local-state.md:114,347-351`).
- **Unknowns:** whether a detached signature over the build record is wanted. **DEFERRED**, and named
  as a follow-up, with the explicit caution that it attests the build and not the review.

### Option: A private review service or CMS as the system of record

- **Advantages:** could hold identity, credentials, and workflow in one place with real access control.
- **Disadvantages:** introduces a long-lived vendor and hosting decision before identity, consent,
  authorization, and data ownership exist; `YWAY-D003` rejected this shape for Stage 2 and the reasons
  have not changed. It also moves reviewer personal data to a third party during a pilot.
- **Risks:** would silently decide a Stage 6/7 architecture question.
- **Validation evidence available:** none. No Stage 3 criterion needs it.
- **Unknowns:** all vendor, hosting, and retention questions.

### Option: Leave identity with the repository and add more flags

- **Advantages:** minimal work; nothing new to operate.
- **Disadvantages:** it would claim a property the repository provably does not have, and the Stage 2
  record already documents that exact failure mode as a governance breach and a known limit.
- **Risks:** the highest-severity risk in this decision area. A real participant would be shown content
  whose "practitioner-reviewed" status rests on a string any repository writer can write. That is the
  `YWAY-P019` violation the contract names first.
- **Validation evidence available:** the negative evidence already exists and is cited above.
- **Unknowns:** none. **Rejected on recorded evidence, not on preference.**

### Option: For the trusted build input — pin the protected-branch tip at build time

- **Advantages:** no owner record to maintain; always the newest content.
- **Disadvantages:** the tip is mutable, so the build is not reproducible and the trusted root is
  whatever was returned at that moment. `requireFullCommitSha` already refuses to infer trust from
  `HEAD` or a branch name by design (`content/snapshot-verify.ts:43-49`), and doing so at the tip would
  invert that.
- **Risks:** a force-push or an unreviewed merge landing between the owner reading a SHA and the build
  running; a race becomes a content-integrity incident.
- **Validation evidence available:** strong. `trusted snapshot verification refuses invalid pins and
never infers trust` (`tests/content-snapshot-verify.test.ts:116`) already covers `HEAD`, a branch
  name, an abbreviated id, and other non-SHA pins.
- **Unknowns:** none. **Rejected.**

### Option: For the trusted build input — let the build operator choose the commit

- **Advantages:** no owner step at all.
- **Disadvantages:** the trusted root becomes "whatever the build script was told," which is not a
  trust boundary, it is a parameter.
- **Risks:** the same adversarial case as an older valid commit, with no owner record to audit against.
- **Validation evidence available:** the same as above.
- **Unknowns:** none. **Rejected.**

### Option: For on-device verification — reimplement content verification in the app

- **Advantages:** would give the app an independent check of its own embedded content.
- **Disadvantages:** the canonical verifier is Node-only — `spawnSync("git", …)` with
  `--no-replace-objects`, `git ls-tree`, `git cat-file`, and a `node:fs` inventory
  (`content/snapshot-verify.ts:63-208`, `content/snapshot-index.ts:108-165`). On the device there is
  no repository, no Git object database, and no working tree, so "verifies against the pinned commit"
  cannot mean what Part B means by it. A device-side reimplementation would duplicate a security
  control outside the repository's verification scope, and would require the app to import from
  `content/` — a package seam that `docs/architecture/ARCHITECTURE.md` Section 10 defers.
- **Risks:** a second, unverified implementation of the trust boundary is worse than no second
  implementation.
- **Validation evidence available:** none.
- **Unknowns:** whether a future stage needs it. **Rejected for Stage 3.** The on-device trust boundary
  is build-time verification plus the APK signature, and that is what Part B states.

## Decision

**Capability requirement:** The Stage 3 private Android pilot must be able to run **genuinely
reviewed, non-fixture Career Experience Pack content** on an offline device, such that:

1. A real qualified practitioner has reviewed the exact content, and the review is bound to that
   content's identity, version, and digests (`YWAY-P019`, `YWAY-E005`).
2. Every real Pack carries its own cumulative provenance history — AI-assisted, founder-reviewed,
   practitioner-reviewed — established from the Pack's first event and preserved across every later
   status, classification, and authorization change. No classification or authorization value may
   replace that history (`YWAY-P019`).
3. Fixture Pack identity and fixture provenance can never be reused for real content: a real Pack
   requires a new Pack ID, fixture Pack IDs are permanently fixture-classified, and a Pack carrying a
   fixture Pack ID, fixture-classified provenance, or a `fixture-` actor cannot be released for a pilot
   build.
4. No reviewer identity, credential, or sensitive qualification material is stored in Git.
5. Every byte embedded in a pilot build is traceable to an owner-approved, full commit SHA, verified in
   a clean checkout, and checked by the repository verifier before embedding.
6. A build embeds **only** an explicit, owner-approved allowlist of `(packId, packVersion)` pairs —
   never "whatever is in the repository."
7. Pilot eligibility is a distinct state from authorization to publish publicly, and this decision
   grants only the former.
8. Before every supervised session, the owner establishes the current content status **and** the
   identity of every embedded Pack's approving actors against the current protected snapshot; if that
   status cannot be established, the session does not start.
9. Retirement produces a definite, non-optional operational response over inventoried devices, and the
   limits of that response — including that it cannot retract published repository content — are
   stated rather than implied.
10. Practitioner review remains content provenance. It is never presented as strengthening the
    evidence level of a young person's exploration (`YWAY-P007`, `YWAY-E002`, `YWAY-P009`), and a Pack
    preview shows the cumulative provenance categories as distinct labelled facts about the content,
    never a single "reviewed" badge and never an assessment of the participant.

**Implementation choice (ACCEPTED 2026-09-28):**

**Part A — Practitioner vetting and the real-content path**

1. **Owner-led vetting, recorded outside Git.** For each real Pack, the owner meets the reviewer in
   person or by video, independently confirms the reviewer's relevant occupation experience, and
   confirms the reviewer did not author the version they are approving. The identity and the
   qualification check are held in an **owner-controlled private record outside Git**. Git receives
   only: an opaque, non-sensitive reference to that record, and the approval itself, bound to the Pack
   ID, version, and content digests through the existing attestation model.
2. **No credential or identity material in Git, ever — and the enforcement is stated honestly.** The
   existing rules are kept: the eligibility `evidenceReferences` character class
   (`content/schemas/practitioner-eligibility.ts:11-18`) and the lowercase kebab-case `actorIdSchema`
   (`content/schemas/common.ts:79,90`) forbid paths, whitespace, URLs, and non-Latin-script names, and
   the artifact boundary excludes qualification documents and notes. These are **necessary, not
   sufficient**: the class does not forbid a transliterated name or a numeric identifier, no gate reads
   `evidenceReferences` at all, and the repository has **no** secret-scanning or personal-data-detection
   control — `docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:503-506` says so, and the
   `YWAY-D004` follow-up to add a secret-scan check (`docs/decisions/004-android-delivery-local-state.md:615-616`)
   is still unchecked. Therefore: name and credential exclusion is **owner-review-enforced**, and #60
   must add the secret-scan check before the first real reviewer record. Passing that scan does not
   establish that reviewer names or credentials are absent.
3. **Inverse rules required for real records.** A `fixtureOnly: false` record must **not** use a
   `fixture-` actor identity, a `fixture:`-prefixed eligibility evidence reference, or a
   `fixture:`-prefixed localization fluency evidence reference. Today all three are one-directional —
   required for fixture records, unconstrained for real ones (`content/schemas/practitioner-eligibility.ts:54-73`;
   `content/schemas/review-attestation.ts:168-180`) — and a real Pack can therefore currently cite
   synthetic evidence for a real person's qualification and for Burmese fluency. This is assigned to #60
   as a blocking check.
4. **A new Pack ID and fresh provenance history for every real Pack.** A real Pack is authored under a
   new identifier. It does not reuse `fixture-retail-assistant` or any other fixture ID, and it does
   not inherit any part of a fixture Pack's provenance, review, or eligibility history. Per `YWAY-P019`,
   its own cumulative history is established from its own first event. **The fixture Pack IDs are
   permanently fixture-classified**, which is stronger than a flag: changing the classification of an
   existing fixture ID does not create a real Pack, it creates a Pack that no authorized path will
   release. The rule is **verifier-side** — a constant or a rule over the Pack-ID namespace — so that
   changing content records alone cannot change the refusal. The verifier code and its tests remain
   editable through repository changes; repository review is the control for changes to the rule. It
   must also cover fixture Packs added later, not only those existing today.
5. **The scope of the fixture guarantee, stated precisely.** This closes Pack **identity** and
   **provenance** reuse. It does **not** eliminate the dangerous action; it narrows it. Copying
   fixture-authored scenario text under a new Pack ID with rewritten actor strings produces a
   different content digest, trips none of these controls, and is **not detectable by any repository
   mechanism**. That residual is accepted and mitigated by owner review of the content diff plus
   repository review under `CONTRIBUTING.md`, not by a check. A consistent relabelling likewise remains
   undetectable while remaining unreleasable. The inverse rules in item 3 are blocking #60 requirements.
6. **Opaque, owner-issued actor handles for real practitioners.** Real actor identifiers must be
   owner-issued opaque handles that are not derivable from a person. A real name, transliteration,
   workplace, or contact route must not appear in an actor ID, an eligibility record filename, an
   attestation note, a commit message, or a pull-request description. This is normative because every
   review actor identity and every recorded instant for every version of a Pack is inside the bundle
   bytes and therefore extractable by anyone holding the APK
   (`docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:461-463,481-483`; confirmed by
   `tests/content-release.test.ts:334-370`). The kebab-case `actorIdSchema` blocks spaces and non-Latin
   scripts but **not** a transliterated name, so this is an owner-issuance control.
7. **No free-text note on real attestations, or a digest-bound one.** The attestation `note` is
   unbounded, excluded from the artifact boundary, and **not bound by any digest**, so a note-only edit
   is detected by nothing (`docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:535-539`). That was tolerable
   when every note was synthetic; it is not tolerable once notes are real. For non-fixture content the
   note must be digest-bound or excluded entirely — the opaque reference plus the owner record already
   achieves what a note would.
8. **Mechanically preserved existing guarantees.** Version and digest scope binding, fresh gates after
   every `changes-requested` cycle, the attestation-to-event bijection, the occupation-scoped
   eligibility window, and non-authorship of the exact version under review all continue to apply
   unchanged to real Packs. `YWAY-D003` deliberately chose "a new immutable version on every source or
   localization change" over a materiality threshold precisely so stale review cannot cover changed
   content; this decision keeps that and does not reopen it.
9. **Independence is stated precisely, and the gap is named.** The mechanical rule refuses an approver
   who authored the exact version under review. It does **not** refuse separation from the founder
   role, authorship of the localization, authorship of an earlier version of the same Pack,
   translator-equals-fluency-reviewer, or a reviewer connected to the Pack's sponsor
   (`docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md:114-130,140-143,146`). Those are real gaps. The
   owner-side vetting record covers them; making them machine-checkable is a `YWAY-D003` schema
   follow-up and a Stage 7 question, and neither is decided here.
10. **Pilot eligibility is not public-release authorization, and the two are separate fields.** Two
    independent facts are recorded, and **neither field's value domain may be extended to carry the
    other**:
    - **Content classification** — `fixture` or `real` — is a statement about synthetic-versus-genuine
      authenticity of the content and its provenance.
    - **Release authorization scope** — at minimum `pilot` or `public` — is a separate owner-granted
      statement about where the content may be shown.

    The existing manifest `classification` enum is `{fixture, production}`
    (`content/schemas/release-manifest.ts:57`). **The `production` value is retired rather than reused
    as an authorization scope**, because `docs/architecture/ARCHITECTURE.md` Section 6 (Content
    Provenance) already requires that
    "production-quality status and other release-readiness gates remain separate concepts" (Section 6,
    Content Provenance), and reloading that enum with an authorization meaning would produce exactly the single mutually
    exclusive lifecycle label `YWAY-P019` forbids. Where scope is stored — as a new artifact field or
    as a build input — is a `YWAY-D003` artifact-contract amendment and is assigned to #60 with that
    dependency named.

    **Neither field substitutes for provenance.** Wherever a Pack is displayed, the cumulative
    AI-assisted / founder-reviewed / practitioner-reviewed categories remain visible and separately
    labelled, and no classification or authorization value may be rendered as a verification,
    authenticity, capability, quality, or workplace-reality claim about the content or about the young
    person. Passing every gate and obtaining pilot authorization confers **no** public-release
    authority; public release additionally requires the `YWAY-P023` fluent-Burmese-review and
    target-user-comprehension gates, the `YWAY-P024` runtime accessibility evidence from #66, and a
    separate owner authorization. No "approved for release" wording may appear where only pilot
    authorization exists, in any manifest, in the app, or in any report.

11. **`YWAY-P002` and `YWAY-P020` are unchanged for real content.** The six-part experiment structure
    and the exposure-before-commitment rule are enforced by the same gate, where a reviewer's
    confirmation is the control rather than a content check. Sponsorship is disclosed and carries into
    the embedded content and the Pack preview. The real-content path creates no exemption from either.
12. **The private record's own constraints.** The record holding a real person's name and qualification
    evidence is a new store of personal data and is constrained accordingly: it is held outside the
    repository working tree, outside any synchronized or cloud-backed folder, and out of reach of the
    agentic tooling that operates on this repository; a single named custodian mirrors `YWAY-D004`'s key
    custody; an encryption-at-rest position is recorded with its reasons; a backup location is named
    because a backup is a second copy; and loss, retention, and deletion each have a defined response.
    **The record has no tamper-evidence** — no hash chain, no countersignature — and this decision
    declines to add one, so the identity guarantee has a single point of failure that is explicitly
    accepted rather than defended. The repository carries a dangling pointer by design and must not
    attempt to resolve it. Finally, the practitioner is a **data subject**: what is recorded, who holds
    it, for how long, and how they may ask for deletion must be stated to them, and a withdrawal
    mid-pilot must have a defined consequence for content already shipped. `YWAY-P015`/`P016` are
    youth-scoped and are not engaged; this is a gap the ADR names rather than a contract breach.

**Part B — Trusted build input**

13. **The trusted root is an owner-approved, full commit SHA.** Full 40- or 64-character lowercase hex,
    never `HEAD`, never a branch name, never an abbreviated id — the existing `requireFullCommitSha`
    shape check enforces this (`content/snapshot-verify.ts:51-61`). The owner approves it as a
    protected-branch commit, and that approval is **recorded in an owner-controlled record separate
    from Git**, so the repository is never the place where the trusted root can be changed.
14. **"Protected-branch" is an owner assertion, not a verified property, and is recorded as such.**
    Branch containment is deliberately **not** checked by a build-time `merge-base --is-ancestor` test:
    the protected ref is itself local state, forgeable in the same `.git` this decision already defends
    against, so a containment check would produce a stronger false assurance than the honest statement.
    The build record therefore carries the branch and remote ref name and the value the ref resolved to,
    as **provenance for audit**, explicitly not as a verified property.
15. **The build runs from a fresh, isolated checkout at the pinned SHA.** The checkout is created in
    an empty directory. Before dependency setup, its tracked tree and index show no uncommitted
    modification and it contains no untracked or ignored files. Any untracked or ignored input later
    used by the build must be produced by the prescribed build process from the pinned source and
    frozen lockfile; otherwise the build fails. The tracked tree and index are checked again after
    dependency setup, immediately before repository verification, and before packaging; any change
    from the pinned commit fails the build. In particular, an app source, resource, or build
    configuration file outside the pin cannot enter through Git's tracked-file clean check. Git is
    invoked with the existing hardening, which always passes
    `--no-replace-objects` and clears the nine `GIT_*` variables
    (`content/snapshot-verify.ts:63-116`). That hardening neutralizes **ref and object-store
    redirection**; `GIT_CONFIG_*` and `GIT_NAMESPACE`-class inputs are not part of this claim.
16. **Verification order, all of it mandatory, and the last step fails closed:**
    1. The trusted root is a full commit SHA and resolves in this repository.
    2. The fresh, isolated checkout is at exactly that commit, has a clean tracked tree and index,
       and contains no untracked or ignored files before dependency setup. After setup and immediately
       before verification, its tracked tree and index are checked again against the pin. Any later
       untracked or ignored build input satisfies item 15.
    3. **The repository verifier passes against the clean checkout, reading sources from its working
       tree after the tracked-file check against the pinned commit.** This is the step that supplies
       content authenticity and provenance-prefix completeness within the pin, which the pinned-tree
       comparison cannot supply. It already exists as `pnpm content:verify` and is already required by
       `scripts/run-verification.ts:39-40`; the build must call it after the post-setup clean check.
    4. The snapshot verifies exhaustively in **both** directions against the pinned tree, for every file
       under `artifacts/`: every local file present in the pin, every pinned blob present locally and
       byte-identical, the index present, the index a canonical deterministic rendering, every pinned
       file enumerated, and every entry's digest matching (`content/snapshot-verify.ts:300-407`).
    5. For each allowlisted `(packId, packVersion)`: the canonical bundle and release-manifest entries
       are present; the manifest binds the bundle, digests, and deferrals; the bundle's embedded digests
       match its own recorded digests; the provenance prefix is self-consistent, digest-pinned, and
       lifecycle-legal; every release gate is recorded true for that exact scope; and the
       classification is `real` and the recorded authorization scope for that version contains `pilot`.
    6. **Retirement state:** no retirement notice exists for any allowlisted version, and no notice is
       disguised as another artifact kind. `loadReleasedBundle` already refuses a retired version at
       consumption (`content/snapshot-verify.ts:557-578`).
    7. **Explicit Pack allowlist:** the build embeds exactly the `(packId, packVersion)` pairs the owner
       authorized, and nothing else. Absence from the allowlist is a refusal, not a default; an
       allowlist entry with no artifact is refused rather than silently skipped. This is load-bearing
       rather than tidy: the committed artifact tree is shared across all Packs and reflects what has
       _ever_ been released, so a released non-retired Pack would otherwise be embeddable, and no
       allowlist concept exists anywhere in the codebase today. The allowlist is unordered and must
       never become a preference, popularity, or ranking signal (`YWAY-P025`), and a pilot build is
       expected to carry at least two distinct careers for the working try-another route
       (`YWAY-P013`) and the plan's two-Pack exit criterion.
    8. **The build re-verifies its own output.** The tracked tree and index are checked once more
       against the pin immediately before packaging; any change fails the build.
       `verifyArtifactSnapshot` returns byte-verified buffers
       (`content/snapshot-verify.ts:323-344,406`), and **embedding consumes those buffers** rather than
       re-reading the working tree, closing the window between verification and packaging. After the
       APK is produced, it is opened again, its embedded asset set enumerated, each entry hashed, and
       each hash required to equal the corresponding verified buffer's digest. Any mismatch fails the
       build and no build record is written. This is a build-time check on the packaged artifact, and
       it exists because TOCTOU between verify and embed is a real gap in any packaging step.
17. **Embedding is complete, read-only, and offline.** The allowlisted Packs are embedded as complete
    JSON assets in the APK — the release bundle and its release manifest — readable read-only by the
    app and never written at runtime. No partial or streamed download exists, per `YWAY-D004`'s settled
    decision, and the app has no `INTERNET` permission, so the embedded assets are the only content the
    app can ever obtain. **A Pack is present in the artifact or absent; there is no third state.**
    Embedded assets must not be reachable through the `FileProvider` that `YWAY-D004` re-scoped to a
    non-private directory, through SAF grants, any exported component, share/print/clipboard, or the
    media store, and a `logcat` scan must show no actor handle and no Pack digest.
18. **The on-device trust boundary is stated and bounded.** The canonical trusted-root verification is
    Node-only and cannot run in the app, and this record rejects a device-side reimplementation of it.
    Therefore: **the build-time check is the check.** The app performs no independent re-verification of
    the trusted root. Post-install content integrity derives from the APK signature, per `YWAY-D004`'s
    local signing key custody and its per-session artifact-hash check — not from the content layer,
    which can be satisfied by recomputing both digests. The two decisions are coupled: a change to
    `YWAY-D004`'s signing custody reverses this item. `YWAY-D004`'s open requirement for a
    build-time **packaged-manifest assertion** (no `INTERNET`, no storage permission, not debuggable,
    no export path — currently "review-enforced only",
    `docs/decisions/004-android-delivery-local-state.md:435-438`) is **inherited as a mandatory build
    step**, because embedding real content into a build whose privacy boundary is unasserted is the
    most consequential available regression.
19. **The build record.** One immutable, canonically serialized record with its own digest, stating the
    source commit SHA, the branch/remote ref and its resolved value (audit provenance only, per item
    14), each embedded `(packId, packVersion)` and content digest, the artifact digests, the resulting
    APK hash, and the allowlist actually used. The **APK hash is an artifact identity, not a
    reproducibility claim** — two builds from the same pinned commit will not produce the same APK hash,
    because an Android APK carries a signing block and toolchain-dependent ordering. The build record's
    location, canonical form, and clock source must be fixed before the record is testable.
    **Device installation state is deliberately not in the build record**: it changes after the build,
    so including it would make the record not a function of the build. "What is installed where" is the
    `YWAY-D004` managed-device inventory, keyed on the APK hash and maintained by the operator
    (`docs/decisions/004-android-delivery-local-state.md:644-647`). This decision depends on that
    inventory and does not create a second one.
20. **Where the inputs live.** Stated here so that no implementation issue decides it implicitly:
    | Input                       | Home                                                                                                                      | Who writes it             | What binds it                                                                  |
    | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
    | Private review record       | Owner-controlled, outside Git                                                                                             | Owner                     | Nothing; no tamper-evidence (item 12)                                          |
    | Trusted commit pin          | Owner-controlled record, outside Git                                                                                      | Owner                     | The build record's recorded SHA; APK signature and per-session hash check      |
    | Pack allowlist              | The same owner-controlled record as the pin                                                                               | Owner                     | The build record records the allowlist used; the packaged-asset equality check |
    | Release authorization scope | A `YWAY-D003` artifact-contract amendment, or a build input if scope is not stored per version — decided in #60, not here | Owner                     | Read at build time; never a classification value                               |
    | Fixture Pack ID rule        | Verifier-side constant or Pack-ID namespace rule                                                                          | Code, in `content/`       | #60 negative test proving it survives a consistent relabelling                 |
    | Build record                | Owner-controlled record; immutable per build                                                                              | Build                     | Own canonical digest; recorded APK hash                                        |
    | Device inventory            | `YWAY-D004` managed-device inventory, keyed on APK hash                                                                   | Operator, at install time | Per-session hash check                                                         |
21. **The APK carries no revocation channel, and this is stated in the record rather than discovered
    later.** An installed offline APK cannot revoke itself; nothing in the content system changes an
    already-installed build. Enforcement for an already-distributed build is entirely operational, via
    Parts C and D. `YWAY-D003` states the same limit from the content side: "A consumer learns about a
    later retirement only by verifying a later trusted commit"
    (`docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md:273-274`).

**Part C — Per-session clearance**

22. **Fresh owner clearance before every supervised session.** Before each session the owner
    establishes, against the **current** protected content snapshot and not against the build-time
    pin, all of the following. This is re-taken per session, not once per build, precisely because an
    older commit is a perfectly valid trusted root and only freshness is not a Git property.
    1. No embedded Pack version has been retired, and no embedded version has changed.
    2. For every embedded `(packId, packVersion)`: the approving practitioner actor, the founder
       actor, and the release actor each appear in the owner record as vetted for **that exact Pack and
       version**; and the Pack ID is not a fixture ID.
    3. The recorded Pack IDs, versions, and actor handles the clearance covered are written into the
       owner record, so the clearance is auditable and cannot be a blanket assertion.
       Item 2 is what makes the forged-actor residual _checked_ rather than merely described. Without it,
       a Pack with a forged approval on a new Pack ID passes clearance unchallenged, and the mitigations
       this record claims for tabletop case 1 would not exist.
23. **If status cannot be established, the session does not start.** No repository access, a
    verification error, an ambiguous result, an unavailable owner record, and an unresolvable pin all
    produce the identical outcome: stop. There is no "proceed with caution" path.
24. **Clearance is a human act and is recorded as such.** It is the control that actually depends on a
    person. It is not a Git property, it cannot be tested, and it must not be reported as if it were.

**Part D — Retirement response**

25. **On retirement of any version embedded in a distributed build, all of the following are
    mandatory:** stop use of the affected build immediately; quarantine every inventoried device
    carrying it; erase or uninstall the app on those devices; record the action against the build
    record and the device inventory; and resume only with a **newly approved and newly verified** build,
    with a fresh clearance. Reinstalling the same artifact, or a build from a pre-retirement commit,
    does not resume the pilot.
26. **The response is a distribution response, not a content recall, and the limit is stated plainly.**
    Retirement under `YWAY-D003` deliberately **preserves** the historical bundle and manifest, and the
    repository is public. So a retired Pack's full text, its Burmese localization, its provenance, its
    review instants, and its practitioner actor handles **remain permanently readable** in public Git
    history, in `artifacts/`, in build directories, in APKs the operator retains, and in any copy a
    participant already extracted. "Erase or uninstall" removes the app, its local participant data,
    and its embedded assets from a device; it removes none of that. `YWAY-D004`'s file-level erase
    requirement concerns **participant data**, not content — uninstall is the stronger primitive and is
    already named, but neither is a content recall.
27. **Part D is inert until the device inventory and reset runbook exist.** `YWAY-D004` records that
    "A managed-device inventory and runbook do **not yet exist**"
    (`docs/decisions/004-android-delivery-local-state.md:416-417,484`). No build may be distributed and
    no retirement response may be claimed executable until that inventory exists. This decision depends
    on it and does not assign it, because `YWAY-D004` already owns it.
28. **Stated plainly, and not hedged:** an offline installed APK cannot revoke itself. No claim of
    remote withdrawal, kill switch, or revocation is made or implied anywhere in this pilot. The
    honest summary is that content exposure on an installed build is bounded only by device inventory
    and operator discipline, which is why distribution is restricted to inventoried managed devices.
29. **Retirement remains fail-closed at the content layer.** Absence of a notice is meaningful only
    because the comparison against the trusted tree is exhaustive; that property must be preserved by
    every implementation of the real path.

**Part E — Boundary of this decision**

30. Accepting this record authorizes **nothing operational**. It does not authorize a real reviewer, a
    real Pack, a build, device distribution, a supervised session, or public release. It authorizes
    the _design_ so that #59, #60, #61, #63, and #64 can be implemented against an accepted rule rather
    than inventing one.
31. `YWAY-D003` and `YWAY-D004` are unchanged **as decisions**. Two bounded amendments are required
    and are assigned, not assumed: `YWAY-D003`'s release-bundle schema and the artifact consumer's
    classification pin must gain a `real` value while preserving every existing refusal
    (`content/schemas/release-bundle.ts:33-34`; `content/artifacts.ts:230-235`;
    `content/snapshot-verify.ts:498`), plus the `fixture:` inverse rules and the retirement `reason`
    handling. This record supplies only the embedding and build-trust half that `YWAY-D004` explicitly
    deferred.

## Consequences

**Benefits**

- A real Pack can reach a real young person with a practitioner-review claim that is true in the sense
  that matters, because the review is a real person's review of the exact bytes shipped, and the
  identity evidence is not in the repository.
- The fixture boundary becomes structural for real Pack **identity** and **provenance**. There is no
  promotion operation to misperform: the dangerous action is narrowed to re-authoring synthetic content
  under a new identifier with rewritten actor strings, which only owner review of the content diff and
  the per-session actor check address. This record does not claim the action is eliminated.
- The forged-actor residual — the largest one — becomes _checked_ before every session rather than
  merely described, without a key lifecycle, a vendor, or a Stage 7 identity architecture.
- Pilot-versus-public separation means a private pilot can run real content without weakening
  `YWAY-P023`'s public-release gates or implying that comprehension validation happened.
- The build becomes auditable end to end: an owner-approved SHA, an explicit allowlist, a repository
  verifier pass, per-version gate re-evaluation, a retirement check, a packaged-artifact re-check, and
  a record of exactly what was built.
- Retirement gets a definite response instead of an aspiration, and the limit of that response — that
  it cannot retract public repository content — is documented rather than discovered after an incident.

**Costs and tradeoffs**

- Owner effort per real Pack: in-person or video vetting, a private record with its own custody rules,
  a pinned SHA, an allowlist, and a clearance before every session. This is the real, ongoing cost of
  the option and it does not scale. It is bounded here because the pilot is at least five supervised
  sessions.
- A new trusted-content path with real classification must be built and reviewed (#60), and the
  consumer must gain a real classification branch while keeping every existing refusal. That is new
  code on the security boundary, not a configuration change, and it is a `YWAY-D003` amendment.
- Two classification concepts — synthetic-versus-genuine authenticity and release authorization scope —
  where Stage 2 had one, plus the retirement of the existing `production` enum value. This is a real
  increase in conceptual surface, accepted because collapsing them is exactly how a pilot would end up
  implying public-release authority it lacks.
- The owner-controlled private record becomes an unbacked dependency and a **new store of a real
  person's personal data** with no tamper-evidence, on a machine that also runs agentic repository
  tooling. Part A item 12 constrains it; none of the constraints removes the single point of failure.
- The build becomes non-reproducible by construction, since the trusted root is a chosen commit rather
  than a derived one and the APK hash is an identity rather than a deterministic output. That is the
  intended trade for an explicit trusted root.
- Content trust is coupled to `YWAY-D004`'s APK signing custody and to its still-missing
  packaged-manifest assertion.

**New constraints introduced**

- Real Packs require a new Pack ID and their own provenance history; fixture Pack IDs can never become
  real, enforced by a verifier-side rule with a negative test.
- Git may contain an opaque reference to a private review record and nothing more. No name, document,
  or credential. **This is owner-review-enforced**, and the secret-scan check must exist before the
  first real reviewer record.
- Real records may not cite `fixture:` evidence or use `fixture-` actors; real attestations carry no
  unbound free-text note.
- Real actor identifiers must be owner-issued opaque handles, in actor IDs, eligibility filenames,
  notes, commit messages, and pull-request descriptions.
- A pilot build is defined by an owner-approved full commit SHA, an explicit `(packId, packVersion)`
  allowlist, a passing repository verifier, and a build record. A build without all four is not a pilot
  build.
- The verification sequence in item 16 is ordered and mandatory; each step's failure fails the build,
  and the packaged artifact is re-verified after the APK is produced.
- No session starts without a fresh owner clearance covering retirement, recency, **and per-Pack actor
  identity**, and any inability to establish status stops the session.
- Retirement of an embedded version forces stop-use, quarantine, erase-or-uninstall, a record, and a
  newly approved and verified build before resuming — and Part D is inert until the device inventory
  exists.
- Any artifact or report describing pilot readiness must distinguish "pilot authorized" from "approved
  for public release", must not present owner-side process steps as machine-verified, and must not
  claim the build verifies anything beyond the `artifacts/` subtree it actually compares.

**Operational implications**

- The owner is a named, ongoing dependency: for vetting, for the pin and allowlist, and for
  per-session clearance including the per-Pack actor check. Their unavailability stops the pilot. This
  should be stated to the owner before acceptance, not discovered at the first session.
- The `YWAY-D004` managed-device inventory, still unpublished, becomes a hard prerequisite here:
  retirement response is defined in terms of it and Part D is inert without it.
- The pilot is bounded to a small, tracked device set precisely because revocation is impossible. The
  plan's non-goal of take-home installs and the distribution limit hold.
- A repository writer with commit access can still write a plausible real actor string. The mitigations
  are the private record, the new-Pack-ID rule, and the per-session actor check — and the residual must
  be stated in any stage that later introduces real repository access control.
- The private record introduces a **practitioner as data subject**: notice, retention, deletion on
  request, and a defined consequence if a practitioner withdraws mid-pilot.

**Migration and reversal implications**

- Content is a data bundle, so a later CMS, real identity service, or distribution channel can replace
  the authoring and identity mechanisms while preserving Pack/version identity, digests, provenance,
  review scope, and artifact compatibility.
- The private review record's format is not fixed here, so it can move into a system of record later
  without re-reviewing content, provided the opaque references are re-pointed.
- The allowlist and build record are build-time concerns; a later signed-build or attested-distribution
  scheme would replace Part B without touching content or review.
- Part B item 18 couples this decision to `YWAY-D004`'s signing custody; a change there reverses it.
- If this decision is rejected or superseded, no content is orphaned: the fixture path continues to
  work unchanged, and the pilot would need a different trusted-build mechanism, which `YWAY-D004`
  already identified as its own trigger for reconsideration.

## Validation

### Evidence already collected

All existing evidence is synthetic and concerns the Stage 2 fixture path. It is listed because it
establishes which mechanisms are already real and tested, and it must not be read as evidence about
real content.

**Disclosure about Git-gated tests.** Fifteen distinct Git-backed test locations are cited below. All
are `gitTest`, which `tests/git-fixture.ts:83-85` converts to `test.skip` when `gitAvailable()` is
false. Two facts keep this from being a silent gap: a plain, non-skipped test asserts
`gitAvailable() === true` so that a skip is a hard failure rather than a quiet pass
(`tests/content-fixture-lifecycle.test.ts:1079-1089`), and CI runs `verify:full` on `ubuntu-latest`,
where Git is present. One honest caveat: `gitAvailable()` proves `git --version` executes, not that
temporary-repository operations are permitted — the Stage 3 plan records an in-sandbox `verify:full`
that failed in three Git-backed test files for exactly that reason
(`docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md:88`).

| Mechanism exercised                                         | Where it is proven                                                                                                                                                                                                                                                  | Honest scope                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard refusal of non-fixture content at the release gate     | `content/release-gates.ts:660-668`; `tests/content-release-gates.test.ts:901`                                                                                                                                                                                       | Proves fixture content is the **only** thing releasable today. Does not prove a real path exists — it does not                                                              |
| Refusal of a non-`fixture-` actor on fixture content        | `content/store.ts:282-289`; `content/schemas/review-attestation.ts:242-249`; `content/schemas/practitioner-eligibility.ts:54-62`; `tests/content-schemas.test.ts:584,629,644`; `tests/content-cli-authoring.test.ts:187`; `tests/content-release-gates.test.ts:800` | The flag→actor direction only. The inverse is **not** enforced and is assigned to #60                                                                                       |
| Synthetic-evidence confinement to fixture records           | `content/schemas/practitioner-eligibility.ts:54-73`; `content/schemas/review-attestation.ts:168-180`; `tests/content-schemas.test.ts:592`; permissiveness demonstrated at `tests/content-schemas.test.ts:603-614`                                                   | One-directional. A real record may cite `fixture:` evidence today; the inverse rule is assigned to #60                                                                      |
| Structural pin of fixture classification in artifacts       | `content/schemas/release-bundle.ts:33-34`; `content/schemas/release-manifest.ts:39,68-76`; `content/artifacts.ts:230-235`; `content/snapshot-verify.ts:498`                                                                                                         | A relabelled fixture cannot be released or loaded. The relabelling itself is undetectable                                                                                   |
| Artifact boundary excludes identity and free text           | `content/schemas/release-bundle.ts:13-25`; `content/schemas/retirement-notice.ts:4-13`; `tests/content-release.test.ts:334-370`                                                                                                                                     | Behaviourally tested, not merely schema-asserted                                                                                                                            |
| Independence: approver did not author the exact version     | `content/practitioner-gate.ts:516-528`; `tests/content-practitioner-gate.test.ts:608`; `tests/content-cli-authoring.test.ts:607`                                                                                                                                    | Narrow by construction, as stated at `PRACTITIONER-QUALIFICATION-POLICY.md:114-130`. Other role separations are not enforced                                                |
| Stale version or digest refused                             | `content/lifecycle.ts:201-225`; `tests/content-practitioner-gate.test.ts:577`; `tests/content-lifecycle.test.ts:273,284,306`; `tests/content-release-gates.test.ts:1075`                                                                                            | Version and digest scope. Applies unchanged to real Packs only if the real path preserves the binding                                                                       |
| Fresh gates required after a `changes-requested` cycle      | `tests/content-practitioner-gate.test.ts:864`; `tests/content-release-gates.test.ts:490,636`                                                                                                                                                                        | A **separate** mechanism from version/digest scope, listed separately so the two are not conflated                                                                          |
| Tampered artifact or index refused (repository mode)        | `tests/content-verify.test.ts:168,189,206,221,281,292`                                                                                                                                                                                                              | Rebuild-and-compare and index cross-checks in the working tree, **not** against a pinned commit                                                                             |
| Tampered artifact or index refused (pinned tree)            | `tests/content-snapshot-verify.test.ts:326,340,351,396,481`                                                                                                                                                                                                         | Both directions against a pinned tree, for the `artifacts/` subtree                                                                                                         |
| Trusted-snapshot verification, both directions              | `content/snapshot-verify.ts:300-407`; `tests/content-snapshot-verify.test.ts:64,116,211,267,316,447,561,584`                                                                                                                                                        | Byte-for-byte against a pinned tree, with replace-refs and inherited `GIT_*` redirection neutralized                                                                        |
| Local state cannot forge the trusted root                   | `content/snapshot-verify.ts:63-116`; `tests/content-snapshot-verify.test.ts:447,584`                                                                                                                                                                                | Replace-refs and six redirection variables are exercised by test; nine are cleared in code, three untested                                                                  |
| Trusted root is never inferred                              | `content/snapshot-verify.ts:43-61`; `tests/content-snapshot-verify.test.ts:116,177`; `tests/content-verify.test.ts:580`                                                                                                                                             | `HEAD`, branch names, and abbreviated ids are all refused                                                                                                                   |
| Retirement refused at consumption                           | `content/snapshot-verify.ts:557-578`; `tests/content-snapshot-verify.test.ts:185`; `tests/content-fixture-lifecycle.test.ts:1091`                                                                                                                                   | A retired version passes integrity verification but is refused for loading                                                                                                  |
| Retirement notice deletion detected                         | `tests/content-snapshot-verify.test.ts:211,267`; `tests/content-fixture-lifecycle.test.ts:1109,1120`                                                                                                                                                                | Notice-only deletion and deletion plus index rewrite                                                                                                                        |
| Content loads from artifacts with no authoring source       | `tests/content-snapshot-verify.test.ts:80`                                                                                                                                                                                                                          | Confirms the artifact-only consumption boundary this decision builds on                                                                                                     |
| A re-sealed committed artifact verifies against its own pin | `tests/content-snapshot-verify.test.ts:508-512`                                                                                                                                                                                                                     | **Negative evidence for this record's own claim.** A substituted bundle that is committed verifies; the caller's trust is what fails. Requires the repository verifier step |
| Deterministic artifacts                                     | `tests/content-release.test.ts:372,1040`; `tests/content-verify.test.ts:74,357,503`; `content/snapshot-index.ts:21-42`                                                                                                                                              | Byte-identical rebuilds, byte-deterministic notices, rebuild from a sealed prefix, and a locale-independent index comparator                                                |

**Explicitly not claimed:** that a non-fixture Pack can be released today; that a build pins a trusted
commit today; that a consistent fixture relabelling is detected today; that a real record is prevented
from citing `fixture:` evidence today; that the pinned-tree comparison covers anything outside
`artifacts/`; that it proves content authenticity or provenance-prefix completeness within the pin;
that any allowlist, build record, signed approval, private record, or device inventory exists today.
Each was confirmed absent in the current source, not assumed.

### Tabletop refusals

These are documented walkthroughs of the seven cases issue #58 names, evaluated against the system as
it exists plus the requirements this record places on #60 and #63. **None of them is a passing test.**
A tabletop can demonstrate that a refusal is specified and reachable; it cannot demonstrate the
non-existent real path, and it cannot substitute for the executable checks assigned below. The
"Current state" column is the honest status as of this record. The verification run recorded below
exercises the existing suite; it does **not** exercise any of these seven cases.

| #   | Case                                       | What must happen                                                                                                                             | Current state                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Becomes executable in                                                                                                                                                                                               |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Forged actor**                           | Another repository writer writes a real-looking `practitioner-` approval they are not entitled to. It is still bound to version and digests. | **Partly uncontrollable, by design.** A forged actor string is **not detectable** — no mechanism authenticates an actor. What holds: the approval cannot cover unreviewed digests. **Newly, and materially:** Part C item 22.2 makes per-session clearance check the approving, founding, and releasing actors of every embedded Pack against the owner record, so the forgery is caught before a session                                                               | Per-session actor check (**Part C item 22.2**, owner process, mandatory). Machine enforcement of the inverse rule only for the `fixture-`/`fixture:` directions, which is **#60**                                   |
| 2   | **Stale review**                           | A version N approval is used for version N+1, or content is edited after approval. Both refused on version or digest scope.                  | **Already enforced and confirmed by a recorded run.** `assertVersionScoped` rejects a stale version or digest (`content/lifecycle.ts:201-225`); `tests/content-practitioner-gate.test.ts:577` and `tests/content-lifecycle.test.ts:273,284,306` exercise it. **Confirmed by a recorded run** — 440 tests passed, 0 skipped, in the verification run below                                                                                                               | Already executable; the real path must preserve it, and #60 must re-run it against the real classification branch                                                                                                   |
| 3   | **Fixture relabel**                        | A consistently `fixtureOnly: false` record set is presented as a real Pack.                                                                  | **The relabelling is NOT detected** (`PRACTITIONER-QUALIFICATION-POLICY.md:160-165`). It is unreleasable: the gate refuses non-fixture content and the bundle schema pins `classification: "fixture"`. Under this decision it is additionally useless, because real content requires a new Pack ID and fixture IDs stay permanently fixture-classified by a **verifier-side** rule. **The residual is copying fixture _content_ under a new ID, which no rule catches** | Refusal attributable to the Pack-ID rule rather than to a surviving `fixture-` marker: **#60**                                                                                                                      |
| 4   | **Altered artifact or index**              | An artifact byte or an index entry is changed, including whitespace-only and missing/extra/reordered entries.                                | **Already enforced and confirmed by a recorded run**, in two distinct mechanisms: repository-mode rebuild-and-compare (`tests/content-verify.test.ts:168,189,206,221`) and pinned-tree comparison for the `artifacts/` subtree (`tests/content-snapshot-verify.test.ts:326,351,396,481`). **Not applicable to embedded assets**, where there is no Git object database and no working tree. No build path exists to run                                                 | Already executable for the checkout; the **packaged APK** is covered by the Part B item 16.8 re-verification check, assigned to **#63**                                                                             |
| 5   | **Dirty checkout**                         | The build runs from a tree that is not the pinned commit — uncommitted edits, a different commit, or local state substituting for the pin.   | **Partly enforced.** A substituted `artifacts/` file is caught by the byte comparison, and a local `refs/replace` or inherited `GIT_*` redirection is neutralized and tested. **A dirty checkout is not rejected by any existing command** — no `status --porcelain` or equivalent exists in `content/`. No build path exists to run                                                                                                                                    | Clean-checkout assertion in the build: **#63**. Must also cover dirt **outside** `artifacts/`, which the pinned-tree comparison cannot see                                                                          |
| 6   | **Older approved commit after retirement** | The owner pins a pre-retirement commit, which is internally valid, and a build re-embeds a retired version.                                  | **Not controllable by any repository mechanism, and not claimed as controllable.** An older commit is a legitimate trusted root; `loadReleasedBundle` only refuses a notice present in the snapshot it is given. This is precisely why Part C requires a **fresh clearance against the current protected snapshot per session**                                                                                                                                         | Per-session clearance (**process**). A build-time "pin must equal the current tip" rule is **rejected** for Part B item 14: the protected ref is local state and the check would produce a stronger false assurance |
| 7   | **Unavailable retirement status**          | Retirement state cannot be established — no repository access, a verification error, or an ambiguous result.                                 | **Not implemented as a pilot rule.** A verification failure does fail closed inside the verifier, but nothing currently _stops a session_ on it. No build path exists to run                                                                                                                                                                                                                                                                                            | Fail-closed session stop: **owner process**, with the identical-outcome check implemented in **#63**'s build/verify tooling and assigned below                                                                      |

**Reading this table honestly.** Cases 2 and 4 are real, tested mechanisms, and both were exercised in
the recorded verification run below. Cases 1, 3, 5, 6, and 7 each have a part that no
repository mechanism can supply, and this record says so in each row rather than leaving the gap to be
discovered. Case 1 is the one this record most improves: it moves from "residual accepted, no check" to
"residual accepted, checked per session". A reader should not take this ADR as claiming that pilot
content trust is fully automated; it claims that the automated part is precise about its extent and
that the human part is named.

### Tests and checks required

**CI-enforceable now, in `content/`** — these run under `pnpm verify:full` today and are in scope for
#60 and #63: SHA pin enforcement, clean-checkout assertion, allowlist enforcement, retirement check,
per-version gate re-evaluation, and build-record creation and validation.

**Not CI-enforceable** — anything requiring an APK or a device, and therefore not run by
`pnpm test`, `pnpm typecheck`, or `pnpm content:verify` until the toolchain decision
(`docs/decisions/004-android-delivery-local-state.md:430-431`): embedded asset-set equality, packaged
artifact re-verification, post-install tamper evidence, and the packaged-manifest assertion. CI cannot
enforce these; saying so is part of assigning them.

**#60 (S3-04)** — executable non-fixture checks:

- A real Pack releases through an authorized path, and its release manifest records `real`
  classification with a recorded `pilot` authorization scope.
- A **consistently relabelled** `fixtureOnly: false` record set carrying a fixture Pack ID is refused
  for a pilot build, **and the refusal is attributable to the permanent Pack-ID rule rather than to any
  surviving `fixture-` marker or `fixtureOnly` value.** This is the test that proves the ADR's
  strongest structural claim; a check written only as "a fixture-ID Pack is refused" proves nothing,
  because it can pass for the wrong reason.
- The fixture Pack ID rule is verifier-side, and covers fixture Packs added later.
- A `fixtureOnly: false` record using a `fixture-` actor, a `fixture:` eligibility reference, or a
  `fixture:` fluency reference is refused. Each marker has its own negative case with the other two
  valid, exercised through the real release path as well as the relevant schema check.
- A real attestation with an unbound free-text note is refused.
- Stale version and stale digest are refused on the real path.
- The `pilot` scope cannot be serialized or read as `public`; a build requesting `public` scope is
  refused absent the `YWAY-P023` comprehension gates and the #66 accessibility evidence; no
  "approved for release" string is producible from a pilot-scoped record.
- A real Pack's provenance genesis shares no event, digest, or prior-version ancestry with any fixture
  Pack, and cannot be created by deriving from a fixture version.
- A preserved-refusal regression suite re-runs every Stage 2 refusal — fixture isolation, fixture
  provenance, version scope, non-authorship, canonical path, digest binding, retirement refusal —
  against the real classification branch.
- The real path refuses `fixture-` actors, `fixture:` eligibility and fluency references, and unbound
  free-text attestation notes, as specified above. Existing schema character-class refusals remain
  enforced. Before the first real reviewer record, the repository's secret-scan check runs on the
  real-record change and a negative test confirms it rejects a known scanner-detectable secret.

**Separate owner-review gate for #60:** Before the first real reviewer record and each real-content
release, owner review excludes reviewer names, transliterations, document references, and credentials
from real eligibility records, actor IDs, filenames, notes, and repository change text. Passing the
executable checks does not establish that this personal data is absent.

**#63 (S3-08)** — executable APK and build checks:

- The packaged APK's embedded asset set equals the allowlist exactly, in both directions; an allowlist
  entry with no artifact is refused rather than skipped; an entry for a retired version is refused; an
  unauthorized **version** of an allowlisted Pack ID is refused; granularity is `(packId, packVersion)`.
- The packaged artifact is re-verified after the APK is produced: every embedded entry hashed and
  required to equal the corresponding byte-verified buffer's digest, and any mismatch fails the build
  with no build record written.
- A build from a dirty checkout is refused, including dirt **outside** `artifacts/` and a
  staged-but-uncommitted edit to `artifacts/snapshot-index.json`.
- The build record matches the installed artifact, and is present with a canonical form and a self-digest.
- Every inventoried device matches an installed build record and vice versa.
- The build cannot skip any step in Part B item 16 and still succeed.
- A clearance failure, an unavailable owner record, and an unresolvable pin each produce the identical
  stop outcome, and no proceed path exists.
- `YWAY-D004`'s packaged-manifest assertion passes: no `INTERNET`, no storage permission, not
  debuggable, no export path, and embedded assets unreachable through the `FileProvider`.
- A `logcat` scan shows no actor handle and no Pack digest.

**#62 (S3-07)** — Pack-preview review-status wording reviewed against `YWAY-P019` and `YWAY-P009`:
reads as content provenance, not as assessment, capability, or ranking, keeps AI-assisted /
founder-reviewed / practitioner-reviewed distinct, and never presents a single "reviewed" badge.

**#66 (S3-11)** — runtime accessibility and Burmese rendering, including the open `YWAY-D004`
line-breaking violation, before any build with Burmese user-facing text reaches a participant. The
Burmese gate is converted from advisory to mechanical: a build intended for a session embeds no
Burmese user-facing strings until #66 passes.

**#68 (S3-10)** — file-level erase with its sentinel-absence regression test, extended to permitted
system data paths, so the retirement response in Part D is executable rather than aspirational; the
response record must name every inventoried device, not merely prove file deletion.

**Process validation**, which no test can supply. **All six were explicitly accepted by the owner on
2026-09-28**, and the acceptance is what makes this record's own success criteria satisfied:

- [x] The owner accepts the recurring personal dependency: vetting, pinning, allowlisting, per-session
      clearance including the per-Pack actor check, and the pilot stopping when the owner is
      unavailable.
- [x] The owner accepts the residual in tabletop case 1: a repository writer can forge an actor string,
      and it is caught only by a human check before each session.
- [x] The owner accepts that fixture-derived **content** under a new Pack ID is undetectable and
      review-enforced.
- [x] The owner accepts that the private review record is a single point of failure with no
      tamper-evidence.
- [x] The owner accepts residual case 6: the recency of the pinned commit is a human control, and no
      build check establishes it.
- [x] The owner accepts that Part D is inert until the `YWAY-D004` device inventory exists, and gated
      **distribution** rather than implementation on it.

**Success criteria:** the four independent discipline reviews ran and their material findings are
resolved in this record; `pnpm verify:docs` and the applicable repository checks ran and their actual
results are recorded here; the owner accepts the record; and on acceptance the Architecture
reconciliation and Stage 3 plan update are performed as recorded follow-up. **All four are satisfied as
of 2026-09-28.**

**Failure criteria:** the decision requires a real Pack to be released without a qualified
practitioner covering the exact shipped content; it permits a fixture Pack ID or a relabelled fixture
record to reach a pilot build; it requires or permits sensitive reviewer material in Git; it lets pilot
eligibility be read as public-release authorization; it claims any remote revocation of an installed
offline APK or any content recall on retirement; it presents owner-side process steps as
machine-verified; it claims a build verifies content authenticity within the pin without the repository
verifier step; or it decides a Stage 6/7 identity, CMS, distribution, or package-boundary question
implicitly.

## Reversibility

**Difficulty.** Low to reverse at the mechanism layer, moderate once real review has happened. Nothing
in this decision is hard to undo: no architecture, service, or vendor is selected, the private record
format is unspecified, and the fixture path continues to work unchanged. What becomes expensive is the
**re-review cost**: once a real practitioner has reviewed real Packs, reversing the vetting mechanism
does not invalidate those reviews if the replacement preserves review scope, but any weakening of the
exact-version binding would force re-review of content real people have already spent time on, and
that is a real cost paid by the people least able to absorb it.

**What would trigger reconsideration**

- A repository writer forges a real approval and it reaches a participant, or the per-session actor
  check is found to be routinely skipped.
- Fixture-derived content re-authored under a new Pack ID is found in a real pilot build.
- A pilot device is lost or unaccounted for while carrying a build, making device inventory and
  quarantine insufficient in practice.
- A content change after review is not caught, or a stale approval reaches a build.
- `YWAY-D004`'s signing custody changes, which reverses Part B item 18.
- Burmese rendering or runtime accessibility remains unresolved at the point a supervised session is
  needed, which would block the pilot on `YWAY-P024` grounds.
- The owner-side burden is judged unworkable, which would make an authenticated reviewer model or a
  workflow service worth evaluating — under its own decision, with real practitioner identity, key
  lifecycle, and safeguarding answered rather than assumed.
- Distribution outgrows a tracked managed device set, at which point remote withdrawal becomes a real
  requirement rather than an accepted limitation and needs its own decision.
- A later stage requires reviewer identity to be machine-verifiable, which supersedes Part A item 1
  without reopening the trusted-build mechanism in Part B.

**Migration implications if reversed.** Restore the Stage 2 path as the only path and the pilot reverts
to fixture content, which the Stage 3 exit criteria forbid. If a later identity architecture replaces
the private record, preserve Pack/version identity, digests, cumulative provenance, exact review scope,
the fixture-ID prohibition, and the actor-handle rule, and re-point the opaque references; do not
re-review content whose review scope is unchanged. If a later distribution mechanism replaces the local
adb install, the build record and `YWAY-D004` inventory must survive in a form that still answers "what
is installed where", because Part D depends on them.

## Follow-up

Owner-gated:

- [x] Owner explicitly accepts this ADR, including the residual risks named in the tabletop and in
      "Process validation", and the recurring owner dependency. Accepted 2026-09-28, with distribution
      gated on the `YWAY-D004` managed-device inventory rather than on implementation.
- [x] On acceptance, reconcile `docs/architecture/ARCHITECTURE.md` Sections 3 (**Content, Practitioner,
      and Operations / Safeguarding** — whose pre-acceptance text stated that these controls
      "govern synthetic content artifacts only" and is changed by this record), 6 (Content Provenance),
      9, 10, and 11 against it, including the Section 11 preamble paragraph about `YWAY-D004`, which
      recorded that `YWAY-D004` "does not resolve ... content trust" and needed a clause reflecting
      that this record does. The Section 11 row "Production content authoring/workflow replacement,
      artifact distribution, and trusted-root acquisition" is the row this record partially addresses.
      Those three locations are named by section and row rather than by line number, because this
      very reconciliation shifts them. Sections 9 and 10 are expected to produce no normative
      change, and the reconciliation should not read as though it settles anything there. Reconciled
      2026-09-28; the Section 11 rows that remain open are recorded in that document.
- [x] On acceptance, update `docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md`: mark S3-02 in the
      progress checklist, add a decision-log entry, and record this record's verification results.
- [x] On acceptance, record decision evidence under `docs/decisions/evidence/`.

Implementation, assigned to the owning issues:

- [x] **#60** — built the authorized non-fixture release path and the real classification branch in the
      trusted-snapshot consumer, preserving every existing refusal, with the executable non-fixture
      checks listed in Validation. Includes the `YWAY-D003` artifact-contract amendment: the
      release-bundle `classification` value, the consumer's classification pin, the `fixture:` and
      `fixture-` inverse rules, the retirement `reason` handling, and retiring the `production` enum
      value rather than reusing it as an authorization scope. The single change point for the consumer
      is `content/snapshot-verify.ts:498`.
      Implemented 2026-09-28 in `content/classification.ts` (the single home for the classification
      rules), the record schemas, the four lifecycle commands, `content/artifacts.ts`,
      `content/repository-verify.ts`, and the new `inspectPilotSnapshotVersion` consumer seam; the
      secret scan and its pinned Gitleaks CI check are `content/secret-scan.ts`,
      `scripts/gitleaks-scan.sh`, and `pnpm content:secrets:check`. Verification results are recorded in
      the Stage 3 ExecPlan. The committed Stage 2 fixture artifacts are byte-identical: the
      classification values and the absence of `authorizationScope` for fixture content preserve their
      generated bytes and digests. **The implementation authorized nothing operational** — the tests
      use synthetic non-fixture records, no real reviewer, Pack, build, distribution, or session
      exists, and the substantive qualification bar is still an open owner product decision.
- [ ] **#63** — implement the trusted-build input: owner-approved SHA pin enforcement, clean-checkout
      assertion, repository-verifier step, explicit `(packId, packVersion)` allowlist, complete
      read-only JSON embedding from the byte-verified buffers, packaged-artifact re-verification,
      retirement check, build record, the identical-outcome fail-closed check, and the
      packaged-manifest assertion inherited from `YWAY-D004`. Reuse the `gitTest`/`gitAvailable()`
      pattern in `tests/git-fixture.ts` for any Git-dependent assertion so it cannot silently skip.
- [ ] **#62** — Pack-preview review-status wording per `YWAY-P019`/`YWAY-P009`; no embedded asset
      reachable through the re-scoped `FileProvider`.
- [ ] **#66** — clear the open `YWAY-D004` Burmese line-breaking violation and the runtime
      accessibility evidence, and make the Burmese gate mechanical.
- [ ] **#68** — make the Part D retirement response executable with file-level erase and its
      sentinel-absence regression test.
- [ ] **#67 / #69** — carry the per-session clearance, including the per-Pack actor check, and the
      pilot-versus-public distinction into pilot operation and closure evidence.

Recorded but not decided here, two of which #60 made mechanically binding rather than prose:

- [ ] **The localized sponsorship representation for real content.** The localization schema has no
      `sponsorship` field, so a sponsored Pack's disclosure reaches the bundle but not the Burmese text a
      participant reads, which `YWAY-P020` treats as a violation. **#60 refuses to release a sponsored
      real Pack** until this representation is decided, rather than leaving the Stage 2 known limit as
      prose on a newly opened path. Deciding the representation is an owner product decision and is not
      made here.
- [ ] **Add the `Secret scan` CI job to `main`'s required checks** before the first real reviewer
      record, alongside `Verify`. Branch protection is an owner action on GitHub and cannot be
      verified from this repository, so #60's local rules (which do run in `verify:full`) are the only
      enforced layer until the owner does it.

- [ ] **#63 satisfies `YWAY-D001`'s task-runner reevaluation trigger** ("2+ real workspaces/packages
      with interdependent build/test/lint tasks", `docs/decisions/001-foundation-tooling.md:251`),
      because the repository build and the app build become interdependent. `YWAY-D001`'s deferral of
      "application package boundaries and physical monorepo layout" must be respected by #63's
      implementation, and the placement of the build tooling is not decided by this record.
- [ ] Fix the build record's location, canonical serialization, self-digest, and clock source before the
      record is testable.
- [ ] Consider digest-binding or excluding the attestation `note` and the retirement `reason`.
      Part A item 7 makes this binding for non-fixture content; the general fix is still open.
- [ ] Consider an owner-signed build manifest using the existing `YWAY-D004` APK signing key, and
      record explicitly that it would attest the build and not the review.
- [ ] The repository's writer set is never enumerated. Quantifying the forged-actor residual requires
      stating who can push, and a real access-control layer is a Stage 6/7 question.
- [ ] **Route Parts B, C, and D into the operator-facing documents.** `docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md`
      and `docs/operations/PRACTITIONER-QUALIFICATION-POLICY.md` are what an operator actually follows,
      and neither mentions the real-content path, the private review record, the per-session clearance,
      or the retirement response. Those four are mandatory operator procedure currently living only in
      this ADR. This decision did not authorize editing them, so it is assigned to #63 and #67.
- [ ] Record the Section 7 invariant's word "production" as generic English rather than a schema value.
      The invariant "No Pack reaches production without qualified-practitioner review" collides
      lexically with the `production` enum value this record retires. The invariant is correct and was
      deliberately not edited, because this decision did not authorize a Section 7 change — but the
      collision should not later be read as licensing a `production` value back in.

## Independent review outcome (2026-09-28)

Four independent discipline reviews ran against this record before owner acceptance was sought. All
material findings are resolved above. The substantive corrections, recorded because several were
overclaims the record would otherwise have carried into #60 and #63:

| Review            | Material findings and what changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture      | Three HIGH: the build sequence never invoked the repository verifier, so "content integrity" and "a re-sealed chain is detectable" were false against an existing test — a repository-verifier step (Part B item 16.3) was added and the residuals restated; "verifies against the pinned commit at runtime or at install time" was unachievable and hid an undecided architecture choice — the on-device trust boundary is now stated and device-side reimplementation is rejected as an option; four mandated inputs had no stated home, home/writer/binding is now a table. Five MEDIUM: Architecture reconciliation extended to Operations / Safeguarding and the Section 11 preamble; item 31 qualified to name the required `YWAY-D003` amendments; build record split from the device inventory; "protected-branch" restated as an owner assertion with an explanation of why a `merge-base` check would be a _worse_ control; the evidence character class restated. Citations corrected: `retirement-notice.ts:76-85` (file is 15 lines) → `4-13`; `practitioner-gate.test.ts:864`; `cli-authoring.test.ts:871`; `practitioner-gate.test.ts:628`; the allowlist claim (the committed fixture version is retired, and the real reason is that the artifact tree is shared and reflects everything ever released); "seven cases this issue names" now cites issue #58 |
| Security/privacy  | Six blocking, all on **claims weaker than the record's own standard**: the fixture-isolation guarantee was narrowed to Pack identity and provenance reuse and the fixture-content-copy residual named; the inverse rules for `fixture-` and `fixture:` on real records were added (Part A item 3); TOCTOU between verify and embed was closed by embedding the byte-verified buffers and re-verifying the packaged APK (item 16.8); post-install integrity was correctly attributed to `YWAY-D004`'s APK signature, with the packaged-manifest assertion inherited and a compromised-build-host adversary added (items 15, 18); retirement was corrected from a content recall to a distribution response over a public, permanently readable corpus, and Part D was declared inert until the device inventory exists (items 25-27); the per-session clearance now checks approving, founding, and releasing actors against the owner record (item 22.2). Six should-fix: actor handles made normative (item 6), private-record constraints and the practitioner as data subject added (item 12), the character-class claim corrected and the missing secret-scan named (item 2), the real-attestation note made binding (item 7), the writer set stated as a premise, and the signing rejection re-argued on scope with two cheaper controls added as considered options    |
| Product integrity | One HIGH: "the classification matches the build's authorization scope" was undefined between two disjoint domains and invited collapsing the new axis into the existing `production` enum — replaced with an explicit two-field rule, the `production` value retired rather than reused, and a non-substitution clause bound to `YWAY-P019`. Six MEDIUM: cumulative provenance promoted into the capability requirement; "by any route including consistent relabelling" and "the dangerous action does not exist" corrected; the substantive qualification bar recorded as an open product decision instead of being decided implicitly; "protected-branch" no longer read as a verified property; the preview review-status rule promoted to a capability item and assigned to #62. Nits: two misquotes corrected, `YWAY-P002`'s human-confirmation control stated accurately, the prefix-completeness limit added to the record, a sponsor-connected reviewer added to the independence gaps, and allowlist constraints added                                                                                                                                                                                                                                                                                                                                             |
| Test              | Two HIGH: `retirement-notice.ts:76-85` does not exist; and the character-class evidence claim was overstated — the cited test cannot isolate the class, and `tests/content-schemas.test.ts:603-614` demonstrates the permissiveness, so the ADR's control was review-enforced, not mechanical. One further HIGH: #60's fixture-ID refusal check could pass for the wrong reason, so the permanence test now requires the refusal to survive a consistent relabelling and be attributable to the ID rule. Five MEDIUM: wrong test citations corrected and the version-scope and freshness mechanisms separated; tabletop case 4's repository-mode versus pinned-tree conflation and `artifacts/` scope corrected; the build record specified so #63 is actionable; the CI-enforceable versus device-requiring split stated; tabletop case 7's check added to #63's list; "pass today" removed pending a recorded run. Git-gating disclosed, citing the non-skipped guard and the sandbox caveat                                                                                                                                                                                                                                                                                                                                                                               |

### Verification run for this record

Run on 2026-09-28 with Node 24.20.0 and pnpm 11.24.0, on branch `content/plan/real-content-pilot`,
for this documentation-only change:

| Command                         | Result   | Notes                                                                                                                                                               |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm agent:doctor`             | **PASS** | Reported `READY`. Its working-tree warning is this ADR itself                                                                                                       |
| `pnpm verify:docs`              | **PASS** | Documentation/status self-test, in-repository markdown links, roadmap and stage-index status consistency, ExecPlan active/completed placement                       |
| `pnpm verify:invariants`        | **PASS** | Product Contract authority and classification structure, plus the structural invariant checks                                                                       |
| `pnpm verify:fast`              | **PASS** | `eslint .` and `tsc --noEmit`                                                                                                                                       |
| `pnpm verify:full`              | **PASS** | Lint, typecheck, format check, verification-runner self-test, **440 tests passed, 0 failed, 0 skipped**, generated-schema check, `content:verify`, invariants, docs |
| Prettier check of changed files | **PASS** | Formatted with the repository's Prettier configuration and re-checked by `verify:full`'s format step                                                                |
| `git diff --check`              | **PASS** | No whitespace errors                                                                                                                                                |

`content:verify` reported the expected single released version, `fixture-retail-assistant@2`, with
`retired: true`, and three snapshot-index entries.

**Two things this run does and does not establish.** Because 0 tests were skipped, the Git-gated
negative tests cited in the evidence tables above actually executed here rather than being silently
skipped, which is the specific risk the disclosure in that section describes. However, **these are
structural and repository-level checks on a documentation-only change.** They do not exercise any
real-content path, any trusted-build step, any APK, any device, or any of the seven tabletop cases,
all of which are specified here and none of which is implemented. The tabletop "Current state" column
therefore still describes source and test inspection, not a demonstrated run of a pilot build.

## Decision History

| Date       | Change                                                                                                                                                                            | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28 | Initial record created as PROPOSED for issue #58 / S3-02, reserving YWAY-D005                                                                                                     | Stage 3 requires an accepted real-content and trusted-build decision before #60 and #63 can be implemented. `YWAY-D004` reserved YWAY-D005 for #58.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-28 | Independent architecture, security/privacy, product-integrity, and test reviews ran; all material findings resolved; overclaims corrected and missing controls added              | Several normative clauses claimed more than the record's own analysis supported — most importantly content integrity without a repository-verifier step, fixture isolation as absolute, and an evidence character class credited with a property it does not have. Corrections strengthen the record's honesty standard rather than relaxing it; none changed the decision's direction                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-28 | **ACCEPTED** by the owner with an explicit named residual-risk acceptance; Architecture Sections 3, 6, 9, 10, and 11 reconciled; Stage 3 plan updated; decision evidence recorded | Owner decision 2026-09-28. Accepted with the six residuals in "Process validation" named, and with **distribution** rather than implementation gated on the `YWAY-D004` managed-device inventory, which does not yet exist — so no build may be distributed and the Part D retirement response may not be claimed executable until it does. #60 and #63 are unblocked against an accepted rule; the substantive qualification bar remains an open owner product decision, and the private pilot remains gated on the `YWAY-D004` device matrix and the open `YWAY-P024` Burmese violation                                                                                                                                                                                                           |
| 2026-09-28 | Corrected two `content/release-gates.ts` line citations to `660-668` after S3-03 shifted the refusal                                                                              | The quoted refusal and accepted decision are unchanged; both citations now point to the current source lines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-28 | Noted that the evidence tables' `content/` and `tests/` line citations describe the pre-#60 tree, and named the current tests                                                     | #60 added code and tests, so a line citation in "Evidence already collected" no longer resolves even though the mechanism it cites is unchanged. The tables are left as written so the record's evidence claims stay auditable against the tree it was accepted against; the current locations are the Stage 2 fixture suite plus `tests/content-classification.test.ts`, `tests/content-real-lifecycle.test.ts`, and `tests/content-secret-scan.test.ts`                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-28 | Corrected the Context citations that #60 shifted, and recorded that the consumer's fixture pin became a per-bundle classification check                                           | `assertFixtureOnlyProvenance` now runs at `content/snapshot-verify.ts:517` with the bundle's own classification instead of a hard `true`, and `loadPackState`'s guards are at `:414-419` and `:520-533`; the fixture command guard is now `requireClassificationIsolation` in `content/classification.ts`. The accepted requirement is unchanged — the consumer's classification pin **gains** a `real` value while preserving every existing refusal — so `loadReleasedBundle` is now classification-agnostic and is **not** a pilot gate, and `inspectPilotSnapshotVersion` is the only function requiring `real` classification, a `pilot` scope, and no retirement notice. The Context section describes the pre-#60 state and is left as written so the requirement stays auditable against it |
| 2026-09-28 | #60 implemented the real-content path, the artifact-contract amendment, the pilot consumer seam, and the secret scan; the #60 follow-up is marked complete                        | The accepted design is now executable. The record's own limits are unchanged and are stated in the implementation: the relabelled fixture record set is refused by the identifier rule rather than detected as a relabelling, fixture content copied under a new identifier is undetectable, the secret scan is a credential check and not a personal-data detector, and only `pilot` is grantable because the `public` prerequisites do not exist. No operational authority was granted.                                                                                                                                                                                                                                                                                                           |     |
