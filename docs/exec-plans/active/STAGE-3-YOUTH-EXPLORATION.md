# Stage 3 — Youth Exploration

## Status

ACTIVE

Activation date: 2026-09-27

Owner authority: The owner approved this plan and explicitly selected “Activate Stage 3 now” in the 2026-09-27 kickoff conversation. The kickoff GitHub issue records that authorization and the bounded direction; neither this plan nor a roadmap label supplies authority on its own.

Kickoff issue: #56.

## Purpose and outcome

Build a private, moderated Android pilot in which an adult young person can discover a career, try a short realistic work task, receive a useful qualitative insight, reflect, and start a reversible next action without logging in. The core journey must work with no employer, job, Quest, or opportunity data.

Stage 3 exits only when the journey works end to end with two genuinely reviewed, non-fixture Career Experience Packs in distinct careers, separate exploration signals, no prohibited scoring, and no login before first value. The first Pack covers retail assistant work. The owner selects the second occupation after confirming a qualified reviewer and a suitable short task. At least five adults participate in supervised sessions on managed Android devices; critical findings are resolved before closure.

## Authority and contracts

Follow `AGENTS.md`, Product Vision, Product Contracts, Architecture, and only directly applicable ACCEPTED decisions. This plan is execution guidance, not product or architecture authority. Significant mobile, local-storage, real-content, and trusted-delivery choices require accepted ADRs and Architecture reconciliation before dependent implementation. Stage 3 closure requires separate explicit owner authority. Product Vision and Product Contract meaning are unchanged.

Primary contracts: `YWAY-P001`–`YWAY-P006`, `YWAY-P010`–`YWAY-P013`, `YWAY-P019`, `YWAY-P022`–`YWAY-P025`, `YWAY-P028`, and `YWAY-E005`–`YWAY-E006`. Preserve the `YWAY-P007`/`YWAY-E002` distinction between exploration and stronger evidence, and `YWAY-P020` sponsorship disclosure where applicable. No private youth data may flow to employers (`YWAY-P018`, `YWAY-E001`).

## Current and target state

- Stage 2 is COMPLETE and supplies a deterministic, reviewed content lifecycle under `YWAY-D003`; its only released Pack is explicitly synthetic and fixture-only. Its release boundary currently refuses real-content artifacts.
- The pilot-scoped delivery and local-state mechanisms are accepted (`YWAY-D004`), and the pilot-scoped real-content and trusted-build mechanism is accepted (`YWAY-D005`, with distribution gated on the `YWAY-D004` device inventory). Production content distribution, a production CMS or authoring workflow, identity and authorization, and synchronization remain unaccepted and keep their later triggers. No real reviewer, real Pack, build, device distribution, or supervised session is authorized by either decision.
- The target is a privately distributed, supervised Android build with complete verified Packs bundled into it. Responses and reflections remain in private app storage on the device, survive app restart, and can be erased after a session. They must not enter cloud/device backup, shared storage, exports, or diagnostic logs. No account, backend, telemetry, or synchronization is added in this stage.

## Scope and boundaries

- Provide age screening for 18+ participants, without collecting birth dates; verify eligibility separately during moderated recruitment.
- Show Pack previews with what the participant will try, expected time, language and connectivity needs, practitioner-review status, and sponsorship where relevant.
- Extend an identified experiment with an optional localized interactive work task: scenario, action prompt, response choices, and contextual qualitative feedback. Keep the six-part experiment structure and exact-version review scope. A response is a clue for reflection, never a career or capability verdict.
- Keep local exploration session records tied to Pack ID, version, digest, and experiment ID. Record task response, what was noticed, reflection, and whether a concrete next action was started. Keep interest, observed behavior, preferences, and constraints distinct wherever collected. Do not represent exploration as practice, verified assessment, or Portfolio evidence.
- Offer pause and a working route to another career after a meaningful trial; offer a deeper task only when suitable content exists. Comparison is optional and never a gate. Viewing or selecting a next-step option is not counted as starting an action.
- Support offline use of bundled content and local work. The app clearly states that notes are stored on this device and are not synchronized. Managed devices are erased between participants, with erasure verified against the private app store and any permitted system data path.

Non-goals: public release, take-home installs, 16–17 access, account or anonymous-to-account migration, remote youth-data storage, synchronization, portfolio, verified assessment, employer features, applications, scoring, generic career ranking, or a production CMS. Stage 4–6 boundaries remain open. Public-release Burmese comprehension and operations gates are not claimed by a private pilot.

## Dependencies and decision gates

1. Record owner activation in the kickoff issue and keep the roadmap, stage index, and active-plan reference aligned.
2. Accept a mobile-delivery ADR covering the first physical app boundary, Android implementation, local durable storage, backup/export/shared-storage and diagnostic-log boundaries, offline behavior, accessibility feasibility, and managed-device distribution. The ADR evaluates candidates rather than treating Architecture's candidate table as accepted.
3. **Satisfied 2026-09-28 by `YWAY-D005`** (`docs/decisions/005-real-content-trusted-build.md`, ACCEPTED): a real-content pilot ADR covering actual practitioner identity/qualification evidence, non-fixture release eligibility, protected trusted build input, fixture isolation, and withdrawal of managed builds after content retirement, with no credential documents or sensitive reviewer material in Git. Acceptance gated **distribution** on the `YWAY-D004` managed-device inventory, which does not yet exist.
4. The content team secures real qualified practitioner and fluent Burmese review for each Pack. The owner selects the second occupation after reviewer access and task suitability are demonstrated. A missing reviewer blocks the Pack, pilot, and closure.
5. The pilot operator can supervise managed Android devices, obtain separate research consent, and erase local participant data after each session. If this operating condition fails, do not distribute the build to participants.

## GitHub issue map and ordered work

Each issue uses `.github/ISSUE_TEMPLATE/task.md`, cites this plan and applicable contracts, and keeps its own acceptance criteria small or medium in size. The kickoff issue is #56.

| Step | Bounded outcome | Dependencies |
| --- | --- | --- |
| S3-01 — #57 | Decide Android delivery and local-state ADR, including backup and logging boundaries; validate representative device risks before acceptance. | Activation |
| S3-02 — #58 | Decide real-content pilot and trusted-build ADR, including retirement response. | Activation |
| S3-03 — #59 | Add optional localized interactive-trial content and exact-version validation/review coverage. | S3-02 |
| S3-04 — #60 | Permit genuinely reviewed non-fixture pilot artifacts while rejecting fixtures, stale review, tampering, and retirement. | S3-02–03 |
| S3-05 — #61 | Author and review a real retail assistant Pack with a short work task. | S3-04; real reviewers |
| S3-06 — #64 | Obtain owner selection, then author and review a second distinct career Pack. | S3-04; owner selection; real reviewers |
| S3-07 — #62 | Build Android age screen, discovery, previews, and accessible navigation without login. | S3-01 |
| S3-08 — #63 | Verify and bundle complete Packs from a pinned trusted source; refuse invalid or retired content. | S3-01–02; S3-04–06 |
| S3-09 — #65 | Deliver the short task, noticing, qualitative feedback, and reflection flow. | S3-03; S3-07–08 |
| S3-10 — #68 | Add reversible next steps, local session recovery, and verified erase across permitted device data paths. | S3-06; S3-09 |
| S3-11 — #66 | Validate offline recovery, Burmese rendering, themes, 200% text, contrast, touch targets, screen reader, reduced motion, and reading order. | S3-07–10 |
| S3-12 — #67 | Prepare and run at least five moderated 18+ sessions with consent, comprehension notes, and device-data erasure. | S3-05–11 |
| S3-13 — #69 | Resolve critical findings, run full verification and risk-relevant independent reviews, record evidence, and seek owner closure authority. | S3-12 |

## Validation strategy

- Automated tests cover anonymous first value; the identified experiment's six parts; qualitative feedback without score or verdict; signal separation; pause, deeper-when-available, and working try-another paths; started action versus selected option; local recovery and erase; exclusion of private responses from app-managed exports and diagnostics; offline task completion; artifact digest/version/provenance checks; and rejection of fixture, unreviewed, tampered, mismatched, or retired content.
- Manual Android checks cover compact and large phones, light/dark themes, 200% text scaling, contrast, touch targets, screen reader, reduced motion, Burmese wrapping/reading order, clear offline/no-sync states, backup/shared-storage/log inspection, and reset/erase verification. Record device and software versions actually used.
- Moderated pilot evidence covers at least five 18+ participants, whether they can complete the short task and understand its insight and next step, and any critical comprehension, accessibility, privacy, or safeguarding finding. Discovery notes are non-authoritative and do not change contracts by themselves.
- Run `pnpm agent:doctor`, `pnpm verify:fast`, `pnpm verify:invariants`, and `pnpm verify:full` at the relevant integration/closure points; report actual outcomes. Structural checks do not substitute for semantic, device, privacy, or practitioner review.

## Risks and operational limits

- Stage 2's fixture release path cannot be relabeled as real content. The new path must prove actual reviewer qualification and exact-scope approval before a Pack reaches a participant. `YWAY-D005` closes Pack **identity** and **provenance** reuse: a real Pack needs a new Pack ID, and fixture Pack IDs are permanently fixture-classified by a verifier-side rule. It does **not** close copying fixture *content* under a new Pack ID with rewritten actor strings, which no repository mechanism detects and which is review-enforced only.
- Reviewer identity is not established by the repository. Nothing authenticates an actor, a real Pack's qualification evidence may today be any string the `fixture:` rule does not constrain, and the evidence character class does not forbid a name or a numeric identifier. `YWAY-D005` requires the inverse rules, opaque owner-issued actor handles, and a per-session check of the approving, founding, and releasing actors of every embedded Pack against the owner record, and makes the secret-scan check a precondition for the first real reviewer record.
- The substantive qualification bar for a real practitioner — what relevant occupation experience requires, and who may set it — is an open owner product decision. `YWAY-D005` specifies who performs the check and where evidence is held; it does not set the bar, and a missing reviewer still blocks the Pack, the pilot, and closure.
- Bundled Packs can remain on an installed build after a later retirement. Limit distribution to tracked managed devices; withdraw or replace affected builds and stop sessions promptly. This does not claim an offline remote-revocation mechanism or authorize take-home distribution. `YWAY-D005` makes the response explicit and adds the limit that is easy to miss: retirement is a **distribution** response over inventoried devices, not a content recall. Retired content stays permanently readable in public Git history, in `artifacts/`, in retained APKs, and in any copy a participant already extracted. The response is also **inert** until the `YWAY-D004` managed-device inventory exists, so no build may be distributed before then.
- Device-only records avoid a remote youth-data path only if OS backup, shared storage, exports, and diagnostics do not copy private responses. Verify those boundaries and managed-device erasure. Do not erase until the participant's session and any consented research capture are complete; explain local-only behavior plainly.
- A single career cannot satisfy the working try-another route. If the second Pack is unavailable, do not claim the Stage 3 exit gate has passed.

## Kickoff verification

On 2026-09-27 with Node 24.20.0 and pnpm 11.24.0, `pnpm agent:doctor` reported READY, `pnpm verify:docs` and Prettier check passed, and `pnpm verify:full` passed outside the managed filesystem sandbox: 440 tests passed, generated schemas and content verification passed, and structural invariant and documentation checks passed. The first in-sandbox `verify:full` run failed in three Git-backed test files because the sandbox blocks temporary Git repository operations; the supported-environment rerun passed. These checks verify repository consistency, not the future pilot behavior or independent semantic review.

After the focused review edits, `pnpm verify:docs`, Prettier check of changed files, and `git diff --check` passed. Full verification was not rerun for those documentation-only edits.

## Kickoff independent review

Product integrity and architecture reviewers found no material issue. Security/privacy review identified a missing backup, shared-storage, export, and diagnostic-log boundary for private youth responses; the plan and issues #57/#68 now make exclusion and erase verification explicit, and the same reviewer confirmed the finding resolved. Test review identified that S3-08 could not satisfy its two-Pack build criterion before S3-05 and S3-06; the plan and issue #63 now state those dependencies, and the same reviewer confirmed resolution. No material review finding remained. The owner authorized merging PR #70 after the required GitHub `Verify` check passed; PR #70 merged on 2026-09-27.

## S3-02 verification and acceptance (2026-09-28)

S3-02 is a decision issue, so its verification is documentation, review, and owner authority rather than
device or content evidence. Device evidence is out of scope here and belongs to #62/#66; no real content
was authored, reviewed, released, bundled, or installed under this issue.

The decision is recorded in `docs/decisions/005-real-content-trusted-build.md` (`YWAY-D005`,
**ACCEPTED 2026-09-28**), with review and verification evidence in
`docs/decisions/evidence/005-issue58-decision-evidence.md`.

Independent reviews: architecture, security/privacy, product-integrity, and test reviewers all ran on
2026-09-28 before acceptance was sought, and all material findings are resolved in the ADR. The
security/privacy review returned blocking findings, and they were substantive rather than editorial: the
draft claimed content integrity that the pinned-tree comparison does not provide (no repository-verifier
step), claimed fixture isolation was absolute when copying fixture content under a new Pack ID is
undetectable, credited an evidence character class with a property it does not have, and omitted that a
real record can currently cite `fixture:` evidence and that verify-then-embed has a TOCTOU window. The
architecture review found that "verifies at runtime" was unachievable and hid an undecided architecture
choice. The product-integrity review found that the classification/authorization-scope rule risked
collapsing into the single lifecycle label `YWAY-P019` forbids. The test review found one citation
pointing at a non-existent file range and that #60's headline refusal check could pass for the wrong
reason. None of the corrections changed the decision's direction; each strengthened the record's honesty
about its own extent.

Repository verification actually run on 2026-09-28 (Node 24.20.0, pnpm 11.24.0): `pnpm agent:doctor`
READY; `pnpm verify:docs` passed; `pnpm verify:invariants` passed; `pnpm verify:fast` passed;
`pnpm verify:full` passed (lint, typecheck, format check, verification-runner self-test, 440 tests
passed / 0 failed / 0 skipped, generated-schema check, content verify, invariants, docs); Prettier
check of the changed file passed; `git diff --check` passed. Because 0 tests were skipped, the
Git-gated negative tests cited as existing evidence actually ran rather than being silently skipped.
These are structural repository-level checks on a documentation-only change. They do not exercise any
real-content path, trusted-build step, APK, device, or tabletop case, all of which are specified in the
ADR and none of which is implemented.

The owner accepted on 2026-09-28 with six residual risks named, and with **distribution** rather than
implementation gated on the `YWAY-D004` managed-device inventory, which does not yet exist. Consequences
recorded in the plan's Discoveries and Risks sections: the owner is a recurring single point of failure for
vetting, pinning, allowlisting, and per-session clearance, and the pilot stops when the owner is
unavailable; the fixture-content-copy residual; the forged-actor residual caught only by a human
check; the untamper-proof private review record; the human-only control over pinned-commit recency;
and an inert Part D until the device inventory exists.

## S3-01 verification (2026-09-28)

Device evidence for S3-01 is recorded in `docs/decisions/evidence/004-spike57-evidence.md`, with the
decision itself in `docs/decisions/004-android-delivery-local-state.md` (`YWAY-D004`, ACCEPTED
2026-09-28, with Architecture Sections 6, 9, 10, and 11 reconciled against it).
The spike source, keystores, and APKs were held outside this repository. All data was synthetic.

Device results: offline/durability PASS on a standalone JS-bundled release APK in airplane mode
(save, force-stop recovery, reboot recovery). Privacy, erasure, accessibility feasibility, and
managed delivery are PARTIAL. Erasure first FAILED with a row-level `DELETE` that left the sentinel
in the `-wal` sidecar and passed only with file-level database deletion. Device-to-device transfer,
backup/restore at runtime, any pre-Android-12 execution path, contrast ratios, screen-reader
traversal of Burmese strings, any physical device, and any OS version other than Android 16 /
API 36 were not exercised and are not claimed. No gate failed, so the Kotlin/Compose fallback was
not triggered.

Independent reviews: architecture, security/privacy, product-integrity, and test reviewers all ran
on 2026-09-28 and their findings are resolved in the ADR. Three of them retained a blocking finding
about unmet acceptance preconditions and unexercised device-to-device transfer. The owner accepted
the decision on 2026-09-28 with that residual risk explicitly named, gating **distribution rather
than implementation** on the device matrix: no supervised session may use a device or OS
combination that has not been exercised and inventoried, and managed devices must carry no cloud
account with cloud backup and device-to-device transfer disabled at the OS layer, recorded in the
device inventory. Architecture Section 11 "Partial Pack download behavior" was settled as
decided-against on the same date.

Repository verification actually run on 2026-09-28 (Node 24.20.0, pnpm 11.24.0): `pnpm
agent:doctor` READY; `pnpm verify:docs` passed; `pnpm verify:invariants` passed; `pnpm verify:fast`
passed; `pnpm verify:full` passed (lint, typecheck, format check, repository tests, content schema
check, content verify, invariants, docs). These structural checks do not substitute for the device,
privacy, or accessibility evidence above, and they did not cover any application behavior.

## S3-03 implementation and verification (2026-09-28)

Issue #59 changes content modeling and validation only. It adds no youth-facing task flow, no
response storage, and no app code, and it does not touch the retired
`fixture-retail-assistant` release or any committed artifact. The combined S3-03–S3-06 milestone is
**not** marked complete: the content model is in place, but the real practitioner and fluent Burmese
reviewers, the real retail assistant Pack, and the second Pack are all still absent.

What exists now:

- `content/schemas/common.ts` carries an optional `interactiveTask` on the shared experiment schema:
  `scenario`, `actionPrompt`, and at least two ordered `choices`, each with `id`, `text`, and
  qualitative `feedback`. Every field is non-blank and every object is strict; choice IDs are unique
  safe identifiers. There is no field for an answer key, a correct choice, a score, a rank, or a
  capability assessment, and a field named like a score or ranking concept is still rejected by the
  existing prohibited-key scan. All six parts stay required and an experiment without a task stays
  valid.
- `content/schemas/experiment-parity.ts` holds the single shared paired-content check for ordered
  experiment IDs, task presence, and ordered choice IDs. It is used at all three boundaries:
  `loadPackState` in `content/store.ts`, `evaluateReleaseGates` in `content/release-gates.ts`, and
  `releaseBundleSchema` in `content/schemas/release-bundle.ts`. The two hand-written experiment-ID
  comparisons that previously existed in the loader and the release gate were removed in favour of
  it, so the rule exists once.
- Schema version stays 1 because the field is optional, and the strict pack-source,
  localized-content, and release-bundle JSON Schemas were regenerated. The generated `$comment` now
  also names cross-document identifier and order parity as a rule only runtime validation can
  enforce, because one document's schema cannot compare identifiers with another document.
- Governance is unchanged and no parallel mechanism was added. The task rides the existing canonical
  and localized content digests, the existing provenance events, and the existing version-scoped
  founder, practitioner, localization, and accessibility reviews. An edit to the scenario, prompt,
  choice text, or feedback under a registered version fails that version's digest check, and a new
  version cannot reuse the old review records.
- `docs/operations/CONTENT-OPERATIONS-GUIDE.md` documents the task shape, the choice-ID matching rule
  and authored reading order, the qualitative-feedback review expectation, and the new-version
  requirement, and states the limits below. Its worked template now carries the task in both
  languages, with an exploration-only limitation naming a task response in each language, and the
  documentation test registers, approves, releases, and verifies that template.

Independent product-integrity review on 2026-09-28 returned **COMPATIBLE** with no blocking finding
and required no product-semantics change: `YWAY-P001`, `YWAY-P002`, `YWAY-P004`, `YWAY-P005`,
`YWAY-P006`, `YWAY-P007`, `YWAY-P019`, `YWAY-P022`, `YWAY-P023`, `YWAY-P024`, `YWAY-E002`,
`YWAY-E005`, and `YWAY-E006` were checked; no verdict, score, rank, or capability field is
representable, no evidence-level field is added, the task is inside both content digests so all four
version-scoped reviews bind it, all six experiment parts stay required, and no privacy, consent, or
employer-facing surface is touched. Its four non-blocking findings were resolved as follows: the
single-versus-multiple response question is now recorded as an open owner product decision for #65
rather than as a settled limit; both worked templates gained an exploration-only limitation naming a
task response; the cross-language feedback-meaning limit is now stated in the guide and the plan;
and choice-order reading order is now listed as a property no schema or attestation binds, with
screen-reader validation carried by #66. Its one check it could not run — that no path outside
`content/`, `tests/`, and `docs/` is modified — was confirmed afterwards: `git status` shows only
content schema and pipeline code, the regenerated `content/generated/` schemas, tests, and docs, and
nothing under `artifacts/` or `content/packs/`.

Independent architecture and test reviews on 2026-09-28 found no blocking item and confirmed the
shared seam, the layering, and the fail-closed direction of the gate reordering. Their non-blocking
findings were resolved in the same change: the parity module now derives its experiment type from
`experimentSchema` instead of restating a hand-maintained subset, so a rename becomes a type error;
the paired-content tests gained a multi-experiment fixture so experiment *reordering* and a defect on
the second experiment are both exercised, which a single-experiment fixture could not detect; the
version-reuse test now gives version 2 its own task text and asserts the released bundle carries it;
the unknown-field test now asserts the exact rejection reason per case, so the prohibited-key scan is
no longer satisfied by strict parsing alone; and the generated release-bundle schema is now compiled
and validated for both polarities. One finding was **not** actioned and needs owner direction: this
change shifted the fixture-isolation refusal that `YWAY-D005` cites by line number from
`content/release-gates.ts:672-680` to `:660-668`, so the citation is now stale. The quoted message
text is byte-identical, the refusal is still the first throw in `evaluateReleaseGates`, and the
substantive `YWAY-D005` claim is unaffected, but correcting a line citation inside an `ACCEPTED`
decision is a control-surface edit that `CONTRIBUTING.md` reserves for independent review and owner
awareness, and Architecture forbids silently rewriting an accepted decision. It is therefore
recorded here and left for the owner rather than edited in this change.

One behaviour change beyond adding the field: `evaluateReleaseGates` now checks parity immediately
after parsing the pair and before verifying the localized digest, so an out-of-parity pair is
refused by naming the specific defect rather than only as a digest mismatch. An in-parity pair faces
the same digest, version-scope, and review gates as before. This was found while testing: the
digest binding threw first and made the required direct-call check unreachable.

Recorded limits, none of which this change resolves:

- The content model encodes no selection mode, and nothing here stores a response. Whether a task
  accepts one selected choice or several, and what a response then means, is an **open owner product
  question** for #65, not something this issue or this plan settles. Recording a response, and any
  screen-reader behaviour of the task screen, belong to the later youth UI issues (#63, #65, #66).
- Array order supplies content reading order only. No runtime, device, or screen-reader behaviour is
  implemented or tested here, and no schema or attestation field binds a task's choice order, so
  screen-reader validation of the task screen is carried by #66.
- Generated JSON Schema validates each document's own shape. It cannot compare identifiers across
  two documents and cannot enforce uniqueness by an object property, so the runtime paired-content
  check is the only place those rules live, and a tool validating a single document against a
  generated schema alone is weaker than the pipeline.
- Parity stops at identifiers and order. Nothing binds the Burmese feedback for a choice ID to the
  canonical feedback for that same ID. The localization reviewer attests Burmese fluency, not
  cross-language meaning, so reviewers must read both languages' feedback for the same choice ID
  together. This is a human review obligation the repository cannot check.
- No schema check can establish that a feedback line is genuinely contextual rather than a verdict.
  That remains a human review obligation for the founder, practitioner, and localization reviewers,
  in the language they review. The task is digest-bound and version-scoped like the rest of the
  content, so `YWAY-P019` and `YWAY-E005` are satisfied by the existing mechanism; whether the
  practitioner review should additionally carry an explicit task-feedback confirmation is a further
  **open owner product question** and is not decided here.
- The task rides the fixture-only Stage 2 release path. It does not make non-fixture content
  releasable; that remains #60 and the accepted `YWAY-D005` path.

Repository verification actually run on 2026-09-28 (Node 24.20.0, pnpm 11.24.0): focused schema,
localization, paired-content, lifecycle, and release tests passed (117 tests in
`tests/content-schemas.test.ts`, `tests/content-json-schema.test.ts`, and
`tests/content-interactive-task.test.ts`); `pnpm agent:doctor` READY; `pnpm content:schemas:check`
passed; `pnpm content:verify` passed with the committed retired fixture release unchanged;
`pnpm verify:invariants` passed; `pnpm verify:fast` passed; `pnpm verify:full` passed (lint,
typecheck, format check, verification-runner self-test, 462 tests passed / 0 failed / 0 skipped,
generated-schema check, content verify, invariants, docs). All fixtures are synthetic; no test
fixture claims a real practitioner approved anything, and the eligibility record used in these tests
is the committed `fixture-` identity.

These are structural repository checks on a content-model and validation change. They do not
establish that any real feedback is contextual, that any real practitioner or fluent Burmese reviewer
has reviewed a task, or that the later youth flow can present a task accessibly.

## Progress checklist

- [x] Owner explicitly activated Stage 3 and approved the bounded plan on 2026-09-27.
- [x] Kickoff issue #56 and S3-01 through S3-13 published and mapped here on 2026-09-27.
- [x] Roadmap and stage index activation merged in PR #70 on 2026-09-27 after required review and CI.
- [x] S3-01–S3-02 accepted and Architecture reconciled. S3-01 accepted 2026-09-28
      (`YWAY-D004`) and Architecture reconciled; S3-02 accepted 2026-09-28
      (`YWAY-D005`, `docs/decisions/005-real-content-trusted-build.md`) with an explicit named
      residual-risk acceptance, and Architecture Sections 3, 6, 9, 10, and 11 reconciled.
- [ ] S3-03–S3-06 content and real review gates complete.
- [ ] S3-07–S3-11 youth flow and device validation complete.
- [ ] S3-12 moderated pilot evidence complete and critical findings resolved.
- [ ] S3-13 verification, independent review, documentation, and owner closure authority recorded.

## Discoveries log

| Date | Discovery | Effect |
| --- | --- | --- |
| 2026-09-27 | Stage 2 release artifacts and verifier are fixture-only; the retail example is synthetic. | Stage 3 needs a separately authorized non-fixture path and genuinely reviewed Packs before any youth pilot. |
| 2026-09-27 | Stage 3 has no prior GitHub issues or active ExecPlan. | Create one kickoff issue, this plan, and bounded child issues; do not duplicate existing work. |
| 2026-09-28 | The #57 device spike could exercise only one emulator on one OS version (Android 16 / API 36); no physical managed device was available, and device-to-device transfer, backup/restore, and any pre-Android-12 path could not be run. | The S3-01 ADR records four of five technical gates as partial. Representative device-risk validation remains open, and no unverified device/OS combination may be used in a session. |
| 2026-09-28 | An in-app SQL `DELETE` followed by `VACUUM` reports erase success while the response text remains in the SQLite `-wal` sidecar. Erasure by deleting the database file removed it. | Erase must be file-level database deletion including `-wal`/`-shm`, and must be proven by byte-level sentinel absence, never by the app's own success message. Assigned to #68 with a required regression test. |
| 2026-09-28 | The default Expo build ships `INTERNET`, `SYSTEM_ALERT_WINDOW`, and legacy storage permissions; removing them via `tools:node="remove"` left a working offline build. | Pilot builds must strip these so the no-network property is OS-enforced, and a packaged-manifest assertion is required in #62. |
| 2026-09-28 | Burmese line breaking breaks at arbitrary grapheme boundaries because Burmese has no inter-word spaces. | An open YWAY-P024 violation, not a polish item. Burmese content is not cleared for the private pilot until fixed; remediation #62, verification #66. |
| 2026-09-28 | Expo SDK 58 exists only as `58.0.0-preview.7` on npm tag `next`, with react-native 0.88.0-rc.1. | The spike is feasibility evidence only. The accepted build must use a stable SDK line, and any SDK change must re-run the packaged-manifest checks because autolinking can change merged permissions. |

| 2026-09-28 | The trusted-snapshot verifier compares only the `artifacts/` subtree against the pinned commit, and a bundle that is re-sealed and then *committed* verifies successfully against that new commit. | The pinned-tree comparison proves no drift from the pin, not content authenticity within it. Provenance-prefix completeness needs the authoring sources and is the repository verifier's job. `YWAY-D005` therefore makes a passing repository verifier, reading sources from the pinned commit, a mandatory build step. |
| 2026-09-28 | A `fixtureOnly: false` record may use any eligibility evidence reference and any fluency evidence reference, and a transliterated name or a numeric identifier passes both the evidence and actor-ID schemas. The existing negative test cannot isolate the character class, because its fixture record is `fixtureOnly: true` and the `fixture:` rule could equally reject the input. | Name and credential exclusion in Git is **review-enforced, not mechanical**, and the repository has no secret or personal-data scanner. `YWAY-D005` requires the inverse `fixture-`/`fixture:` rules in #60, opaque owner-issued actor handles, and the `YWAY-D004` secret-scan check before the first real reviewer record. |
| 2026-09-28 | Stage 2's only released version, `fixture-retail-assistant@2`, is retired, and the artifact tree is shared across all Packs and reflects what has *ever* been released. | The allowlist is load-bearing for a stronger reason than "a fixture is sitting in the tree": any released non-retired Pack would otherwise be embeddable. Allowlist granularity is `(packId, packVersion)`, unordered, and must never become a preference or ranking signal. See `docs/decisions/005-real-content-trusted-build.md`. |
| 2026-09-28 | Retirement preserves the historical bundle and manifest, and the repository is public. | Retirement cannot retract published content. The `YWAY-D005` response is a distribution control over inventoried devices; the corpus stays permanently readable. Stated plainly so no later report implies a recall that does not exist. |
| 2026-09-28 | `evaluateReleaseGates` verified the localized digest before any content-parity rule, so a pair with a mismatched interactive task was reported only as a digest mismatch, and the required direct-call check could not be exercised. | The gate now checks parity right after parsing, naming the specific defect. A digest mismatch is still the second line of defence, not the first, and neither check weakens the other. |

## Decision log

| Date | Decision | Authority and limit |
| --- | --- | --- |
| 2026-09-27 | Activate Stage 3 and target a private moderated Android pilot on managed devices. | Explicit owner selection in kickoff conversation; does not authorize public release or accept an architecture ADR. |
| 2026-09-27 | Bundle complete Packs and keep pilot responses device-only, with no login or telemetry. | Owner-approved Stage 3 planning direction; storage and delivery mechanisms still require accepted ADRs. |
| 2026-09-27 | Start with a real retail assistant Pack and a second owner-selected career Pack; require real practitioner and fluent Burmese review. | Owner-approved scope; exact second occupation and reviewer eligibility are gated before authoring/release. |
| 2026-09-28 | S3-02: accept real-content pilot eligibility and a trusted-build input for the private pilot. Owner-led reviewer vetting with identity and qualification evidence in an owner-controlled private record outside Git; a new Pack ID and fresh provenance history for real content with fixture Pack IDs permanently fixture-classified; pilot eligibility held separate from public-release authorization; an owner-approved full commit SHA as the build's trusted root, built from a clean checkout, verified by the repository verifier and an exhaustive `artifacts/` comparison, and embedding only an explicit `(packId, packVersion)` allowlist; a fresh fail-closed owner clearance before every supervised session; and a retirement response stating plainly that an offline installed APK cannot revoke itself and that retirement cannot retract public repository content. Recorded as `docs/decisions/005-real-content-trusted-build.md` (`YWAY-D005`, **ACCEPTED**); Architecture Sections 3, 6, 9, 10, and 11 reconciled. | Explicit owner acceptance on 2026-09-28 of six named residual risks, with **distribution** rather than implementation gated on the `YWAY-D004` managed-device inventory, which does not yet exist. #60 and #63 are unblocked against an accepted rule. Accepting the ADR authorized no real reviewer, Pack, build, device distribution, session, or public release. The substantive qualification bar for a real practitioner remains an open owner product decision. |
| 2026-09-28 | S3-01: accept Expo/React Native with app-private `expo-sqlite` as the Android delivery and device-only local state boundary, with `adb`-installed locally signed builds on inventoried managed devices. Recorded as `docs/decisions/004-android-delivery-local-state.md` (`YWAY-D004`, **ACCEPTED**); Architecture Sections 6, 9, 10, and 11 reconciled. | Explicit owner acceptance on 2026-09-28 of the named residual risk, gating **distribution rather than implementation** on the physical-device matrix. Architecture Section 11 "Partial Pack download behavior" settled as decided-against on the same date. #62 and #63 are unblocked; supervised sessions remain gated on the real device matrix. YWAY-D004 is reserved for #57, so #58 uses YWAY-D005. |

## Completion criteria

Stage 3 may close only when both accepted ADRs and real-content gates are evidenced; two distinct reviewed Packs are valid for the private build; the no-login 18+ journey works end to end offline with qualitative, reversible guidance and a started next-action path; local youth work survives restart and can be erased; required Android accessibility and Burmese checks pass; at least five moderated adult sessions have no unresolved critical finding; repository verification and risk-relevant independent review results are recorded truthfully; and the owner explicitly authorizes closure. Stage 4 remains PLANNED.
