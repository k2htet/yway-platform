# YWAY-D005 decision evidence (issue #58)

Evidence supporting
[`005-real-content-trusted-build.md`](../005-real-content-trusted-build.md) (`YWAY-D005`,
**ACCEPTED 2026-09-28**).

This issue is a **decision** issue, not an implementation issue, so this document records different
evidence from the `YWAY-D004` spike evidence. There is no spike, no device, no APK, and no build.

**Everything here is structural or documentary.** No real reviewer, no real Career Experience Pack, no
non-fixture artifact, no device, and no APK was created, reviewed, released, bundled, or installed under
this issue. Nothing in this document is evidence about real content, a real build, or a real session,
and none of it should be read that way.

## 1. Environment and verification run

| Item          | Value                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date          | 2026-09-28                                                                                                                                           |
| Node / pnpm   | v24.20.0 / 11.24.0                                                                                                                                   |
| Branch        | `content/plan/real-content-pilot`                                                                                                                    |
| Changed files | `docs/decisions/005-real-content-trusted-build.md` (new), `docs/architecture/ARCHITECTURE.md`, `docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md` |

Commands actually run, with their actual results:

| Command                                 | Result             | What it establishes here                                                                                                                                                           |
| --------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm agent:doctor`                     | **PASS** (`READY`) | Repository tooling and reviewer adapters present. Its working-tree warning is this change.                                                                                         |
| `pnpm verify:docs`                      | **PASS**           | Documentation/status self-test, in-repository markdown links, roadmap and stage-index status consistency, ExecPlan active/completed placement.                                     |
| `pnpm verify:invariants`                | **PASS**           | Product Contract authority and classification structure, plus the structural invariant checks.                                                                                     |
| `pnpm verify:fast`                      | **PASS**           | `eslint .`, `tsc --noEmit`.                                                                                                                                                        |
| `pnpm verify:full`                      | **PASS**           | Lint, typecheck, format check, verification-runner fail-closed self-test, **440 tests passed / 0 failed / 0 skipped**, generated-schema check, `content:verify`, invariants, docs. |
| `prettier --write` on the changed files | **PASS**           | Applied with the repository's Prettier configuration; re-checked by `verify:full`'s format step.                                                                                   |
| `git diff --check`                      | **PASS**           | No whitespace errors.                                                                                                                                                              |

`content:verify` output, verbatim and unedited, reporting the expected single released and retired
version:

```json
{
  "indexEntries": 3,
  "mode": "repository",
  "packs": ["fixture-retail-assistant"],
  "releases": [
    {
      "bundleDigest": "fa053a0e642ae72b8216bf15e71634dbc26ff8fcfed041cb39ba5d5f6825f23b",
      "bundleRelativePath": "bundles/fixture-retail-assistant/2/bundle.json",
      "contentDigest": "ae30f63e0b9568d03f0e025138da10a1ef96a158a8d697703cebba7384419a8f",
      "manifestDigest": "df5691427ec242f13203bd37481d7433253647c984df9846a2c1650a9103d032",
      "manifestRelativePath": "manifests/fixture-retail-assistant/2/manifest.json",
      "packId": "fixture-retail-assistant",
      "packVersion": 2,
      "releasedAt": "2026-09-27T04:52:59.338Z",
      "retired": true
    }
  ]
}
```

### What this run does not establish

These are structural and repository-level checks on a documentation-only change. They do **not**
exercise:

- any real-content release path — none exists; the Stage 2 release gate still refuses all non-fixture
  content
- any trusted-build step, build record, or Pack allowlist — none is implemented
- any APK, embedded asset, or device
- any of the seven tabletop cases, all of which are specified in the ADR and none of which is
  demonstrated
- any semantic, privacy, accessibility, Burmese, or practitioner-review correctness

The ADR's tabletop "Current state" column therefore describes **source and test inspection**, not a
demonstrated run of a pilot build.

### One thing the run does confirm

**0 tests were skipped.** The trusted-snapshot negative tests cited as existing evidence in the ADR are
Git-gated: `tests/git-fixture.ts:83-85` converts `gitTest` to `test.skip` when `gitAvailable()` is
false. A skip would have meant that evidence table described code that did not run. Two mechanisms
guard against that, and both held here:

- `tests/content-fixture-lifecycle.test.ts:1079-1089` is a plain, non-skipped test asserting
  `gitAvailable() === true`, so a skip becomes a hard failure rather than a quiet pass.
- CI runs `verify:full` on `ubuntu-latest`, where Git is present.

The remaining caveat is recorded in the ADR: `gitAvailable()` proves `git --version` executes, not that
temporary-repository operations are permitted. The Stage 3 plan records an in-sandbox `verify:full` that
failed in three Git-backed test files for exactly that reason.

## 2. Independent review outcome

Four independent discipline reviews ran on 2026-09-28 **before** owner acceptance was sought, as
`CONTRIBUTING.md` requires for a change to ADR status. All material findings are resolved in the ADR and
summarised in its "Independent review outcome" section. Condensed here so the acceptance is auditable:

| Review            | Substantive findings that changed the record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture      | **3 HIGH.** The build sequence never invoked the repository verifier, so the record's content-integrity claim was false against an existing test. "Verifies at runtime or at install time" was unachievable — the canonical verifier is Node-only — and the "or" hid an undecided architecture choice. Four mandated inputs (fixture-ID set, authorization scope, allowlist, build record) had no stated home. **5 MEDIUM**, including Architecture reconciliation extended to Operations / Safeguarding and the Section 11 preamble, and the build record split from the device inventory. 6 citations corrected. |
| Security/privacy  | **6 blocking.** Fixture isolation claimed as absolute when copying fixture _content_ under a new Pack ID is undetectable; a real record can today cite `fixture:` evidence; verify-then-embed has a TOCTOU window; post-install integrity was unattributed to the `YWAY-D004` APK signature; retirement was treated as a content recall; and the per-session clearance did not check approving actors, leaving the largest residual unchecked. **6 should-fix**, including normative opaque actor handles, private-record constraints, and the practitioner as a data subject.                                     |
| Product integrity | **1 HIGH.** The classification/authorization-scope rule was undefined between two disjoint domains and invited collapsing into the existing `production` enum — exactly the single mutually exclusive lifecycle label `YWAY-P019` forbids. **6 MEDIUM**, including recording the qualification bar as an open product decision instead of deciding it implicitly, and correcting two overclaims about fixture isolation.                                                                                                                                                                                           |
| Test              | **2 HIGH + 1 HIGH.** One citation pointed at a file region that does not exist (`retirement-notice.ts:76-85`; the file is 15 lines). The evidence character class was credited with a property it lacks. #60's headline refusal check could pass for the wrong reason, so the permanence test now requires the refusal to survive a consistent relabelling. **5 MEDIUM**, including the CI-enforceable versus device-requiring split and correcting "pass today" before a run existed.                                                                                                                             |

Every disputed citation was independently re-verified against source before the correction was applied.
Not one review finding was accepted on the reviewer's word alone, and two review claims were themselves
corrected after checking — one reviewer's proposed "fix" for the protected-branch gap (a
`git merge-base --is-ancestor` check) was **rejected** in the ADR, because the protected ref is local
state that can be forged in the same `.git` the record already defends against, so the check would
produce a stronger false assurance than the honest owner-assertion statement.

## 3. Citations that were wrong and are now corrected

Recorded because a governance record's evidence base is only as good as its pointers, and no automated
check in this repository validates a `file:line` range in Markdown.

| Claim in the draft                                          | Was                                                                                         | Now                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Retirement notice carries only digests, no actor, no reason | `content/schemas/retirement-notice.ts:76-85` (file is 15 lines)                             | `:4-13`                                                                                           |
| Non-`fixture-` actor refused on fixture content, cited test | `tests/content-practitioner-gate.test.ts:628` — a mismatched-classification test            | `tests/content-schemas.test.ts:584,629,644` and others that actually exercise the actor direction |
| Stale version/digest refused, cited test                    | `tests/content-practitioner-gate.test.ts:864` — prior-cycle reuse, not version/digest scope | `:577`, `tests/content-lifecycle.test.ts:273,284,306`                                             |
| Non-authorship, cited role-gap list                         | `PRACTITIONER-QUALIFICATION-POLICY.md:114-130` — covers three of the four gaps              | `:114-130,140-143`                                                                                |
| Runbook on consumer trust                                   | Quoted "being handed a later commit"                                                        | Quoted verbatim: "verifying a later trusted commit"                                               |
| `YWAY-D004` on Burmese content                              | Quoted "not cleared for the private pilot"                                                  | Quoted verbatim: "not cleared for the pilot"                                                      |
| Evidence character class blocks personal data               | Claimed; `tests/content-schemas.test.ts:603-614` proves the opposite                        | Restated as review-enforced, with the permissive test cited                                       |

## 4. Owner acceptance

The owner accepted the record on **2026-09-28** with six residual risks named explicitly rather than
implied, and with **distribution** rather than implementation gated on the `YWAY-D004` managed-device
inventory — which `docs/decisions/004-android-delivery-local-state.md:416-417,484` records as **not
existing**. The accepted residuals:

1. The owner is a recurring single point of failure — vetting, pinning, allowlisting, and per-session
   clearance including the per-Pack actor check. The pilot stops when the owner is unavailable.
2. A forged practitioner actor string remains possible for another repository writer. It is caught by a
   human check before each session, not prevented.
3. Fixture-derived **content** re-authored under a new Pack ID is undetectable and review-enforced only.
4. The private review record is a single point of failure with no tamper-evidence, no required backup,
   and no defined loss response at acceptance time.
5. Pinned-commit recency is a human control; no build check establishes it.
6. The Part D retirement response is inert until the `YWAY-D004` device inventory exists.

Accepting the ADR authorized the **design only**. It authorized no real reviewer, real Pack, build, device
distribution, supervised session, or public release, and it did not settle the substantive qualification
bar for a real practitioner, which remains an open owner product decision.

## 5. Reconciliation re-review

After the Architecture and plan reconciliation was applied, a second independent architecture review ran
against the reconciled documents. It returned **no blocking finding and no contradiction with an accepted
decision**, and confirmed the reconciliation decides nothing the ADR did not decide — including that the
Sections 9 and 10 no-ops are honest rather than lazy, and that no Stage 6/7/10 answer is implied
anywhere. Its material findings were all pointer or fidelity defects in the change just made, and all
were fixed:

- The ADR cited `ARCHITECTURE.md:168` for the "production-quality status ... remain separate concepts"
  requirement, which the reconciliation itself had shifted. Replaced with a section anchor, since a line
  number in a document the same change edits is self-invalidating. The same treatment was applied to
  three further `ARCHITECTURE.md` line references in the Follow-up section.
- `004-android-delivery-local-state.md:415-416` → `416-417` for the device-inventory sentence. This is
  the one fact acceptance was gated on, so its pointer is the one most likely to be re-checked by a #63
  reviewer.
- The Architecture and plan both narrowed the per-session actor check from the ADR's three roles
  ("approving, founding, and releasing") to "approving actors". Corrected in both, so the accepted
  mitigation for residual #2 is not under-implemented by anyone working from the summary.
- The Stage 3 plan still asserted that "no trusted-root acquisition mechanism is accepted" — self-contradicting
  the same document's checklist. Rewritten to current state.
- The Architecture recorded no open `YWAY-P024` Burmese gate although this ADR makes it a pilot
  precondition, and omitted the `YWAY-D004` packaged-manifest assertion the ADR inherits as a mandatory
  build step. Both added; both are backed by ACCEPTED records, so the refinement is permitted.
- The Section 11 disposition said "the production trigger is unchanged" in a cell that no longer stated
  one. The explicit production trigger is now written into the cell so the preservation is visible rather
  than asserted.

Two of the review's suggestions were **rejected on the merits**: it proposed a `git
merge-base --is-ancestor` containment check for the protected-branch property (already rejected in the
first review round, for the same reason — the protected ref is forgeable local state and the check would
produce a stronger false assurance than the honest owner-assertion statement), and it proposed editing
the Section 7 invariant, which this decision did not authorize. The Section 7 lexical collision with the
retired `production` enum value was instead recorded as a follow-up.

## 6. Follow-through recorded on acceptance

| Action                                                                                                                                                                         | Where                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Record marked `ACCEPTED` with a dated acceptance and the named residual-risk acceptance                                                                                        | `docs/decisions/005-real-content-trusted-build.md` Metadata, Status note, Decision History, and "Process validation" |
| Architecture Sections 3 (**Content**, **Practitioner**, **Operations / Safeguarding**), 6 (**Content Provenance**), 9, 10, and 11 reconciled                                   | `docs/architecture/ARCHITECTURE.md`                                                                                  |
| Section 11 preamble updated to record that `YWAY-D005` resolves the pilot content-trust question `YWAY-D004` deferred, and the two couplings between them                      | `docs/architecture/ARCHITECTURE.md`                                                                                  |
| The "Production content authoring/workflow…" Section 11 row marked **partially resolved for the Stage 3 private pilot**, with what remains open listed                         | `docs/architecture/ARCHITECTURE.md`                                                                                  |
| The Stage 7 practitioner-identity row marked so the `YWAY-D005` pilot arrangement is not read as resolving it                                                                  | `docs/architecture/ARCHITECTURE.md`                                                                                  |
| Sections 9 and 10 reconciled with **no normative change**, and recorded as such so the reconciliation does not read as settling anything there                                 | `docs/architecture/ARCHITECTURE.md`                                                                                  |
| Stage 3 plan dependency gate 3 satisfied; risks sharpened; four new Discoveries logged; decision-log entry added; S3-02 verification section added; progress checklist updated | `docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md`                                                                |
