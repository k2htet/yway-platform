# Content lifecycle runbook

Procedures for reviewing, releasing, recovering, and retiring a repository-native Career Experience
Pack under the Stage 2 content pipeline.

## Scope and authority

This runbook is operational documentation. It is not product or architecture authority. The
contracts it protects are `YWAY-P002`, `YWAY-P005`/`YWAY-E006`, `YWAY-P019`/`YWAY-E005`,
`YWAY-P020`, `YWAY-P023`, and `YWAY-P024`; the pipeline is governed by the ACCEPTED decision
[`docs/decisions/003-stage-2-content-pipeline.md`](../decisions/003-stage-2-content-pipeline.md).

Authoring syntax is in [`CONTENT-OPERATIONS-GUIDE.md`](CONTENT-OPERATIONS-GUIDE.md); reviewer
eligibility and role separation are in
[`PRACTITIONER-QUALIFICATION-POLICY.md`](PRACTITIONER-QUALIFICATION-POLICY.md).

Lifecycle status is a projection of cumulative history, not a stored field. Nothing in this runbook
edits, reorders, or deletes a provenance event.

The happy path is
`authored → founder-reviewed → practitioner-reviewed → artifact-eligible → artifact-released`. The
complete set of legal transitions is:

| From                    | May become                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| `authored`              | `founder-reviewed`, `changes-requested`, `retired`                     |
| `founder-reviewed`      | `practitioner-reviewed`, `changes-requested`, `retired`                |
| `practitioner-reviewed` | `artifact-eligible`, `changes-requested`, `retired`                    |
| `artifact-eligible`     | `artifact-released`, `changes-requested`, `retired`                    |
| `artifact-released`     | `retired` only                                                         |
| `changes-requested`     | `founder-reviewed` (a new cycle on the same content digest), `retired` |
| `retired`               | nothing; terminal                                                      |

`localized`, `localization-reviewed`, `accessibility-reviewed`, and `sponsorship-disclosed` are
provenance-only: they add history without changing status, and they are refused before the
`authored` start and after `artifact-released` or `retired`.

So a `changes-requested` version has exactly one way forward — a fresh `founder-reviewed` event on the
_same_ content digest, which starts a new review cycle. Anything that changes the content needs a new
version instead.

## Review scope is the exact version and digest

Every review, every gate, and every artifact binds one `(packId, packVersion, contentDigest)` scope
derived from the committed source, and every localization-scoped review additionally binds the exact
`localizedContentDigest`. A record that does not match that scope is refused as stale — this is how
an approval for edited content is kept from being reused.

Consequences an operator must internalize:

- A review covers one version of one Pack. It never carries forward.
- Every review event and its attestation file are bound to each other by actor, instant, and
  provenance sequence. An attestation from a prior review cycle cannot satisfy a later one, even
  when the actor and the timestamp are identical.
- Founder and practitioner attestations must carry `reviewEventSequence`; the other review kinds
  carry it too, and every kind is refused without it.
- The `contentDigest` is computed over the parsed source object with sorted keys. Reformatting a YAML
  file does not change it; changing any value does.

## Fresh review after every source or localization change

There is no "minor edit" path. A **parsed value** change to a Pack source or its Burmese localization
at an already registered version is refused because the sealed events no longer match the
source-derived digest:

```text
FAIL  events: recorded contentDigest for pack version 3 does not match the source-derived digest: source was tampered with or events bind stale content
```

Comments, key order, and formatting are not in that digest, so the command cannot detect edits to
them. Policy still requires the registered file to remain byte-for-byte unchanged; make even a
comment-only edit in a new version with fresh review. The recovery for an edit to a registered file
is not to re-seal the log. It is to restore the file and author the next version:

1. Restore the registered version's file from version control, byte for byte.
2. Copy it to `<version + 1>.yaml` and make the change there. If the change affects what a
   Burmese-reading young person sees, author `<version + 1>` in `localizations/` too.
3. Run `pnpm content:new-version -- --pack <pack-id> --from <version> --actor <fixture-author>`.
4. Record fresh reviews against the new version. Every prior version keeps its history, its status,
   and its artifacts.
5. Release the new version. Prior releases stay valid and byte-identical.

A version registered with no localization cannot have one added later: the localization event must
precede the first review, and a localization introduced after a `changes-requested` cycle is refused.
A Pack that will be released needs its localization present at registration time.

## Requesting changes

Any review kind accepts `--outcome changes-requested`; the command records a `changes-requested` event
and a matching attestation. The event ends the current review cycle for that version, and the
version can no longer be released, no matter how much review it accumulated:

```text
$ pnpm content:attest -- --pack fixture-retail-assistant --version 3 --kind founder-review \
    --actor fixture-founder-one --outcome changes-requested \
    --six-part-confirmed true --exposure-before-commitment-confirmed false \
    --note "The next fork still asks for a paid course before a second observation."
PASS  recorded founder-review changes-requested for fixture-retail-assistant version 3 at sequence 15 (actor fixture-founder-one)

$ pnpm content:release -- --pack fixture-retail-assistant --version 3 --actor fixture-operator-one
FAIL  version: release requires standing practitioner-reviewed or artifact-eligible status for fixture-retail-assistant version 3 (current status "changes-requested")
```

A `changes-requested` version can only be re-reviewed if the content is unchanged, because a fresh
cycle cannot inherit a stale digest. Record a new `founder-review` on the same version to start the
next cycle; author a new version as soon as the content has to change, which is the usual outcome.

### Confirmations are the control, not the text

An approved content review cannot record a confirmation it cannot make:

```text
$ pnpm content:attest -- --pack fixture-retail-assistant --version 3 --kind founder-review \
    --actor fixture-founder-one --outcome approved \
    --six-part-confirmed true --exposure-before-commitment-confirmed false --note "refusal probe"
FAIL  contentReview: approved founder/practitioner attestations must confirm both six-part structure and exposure before commitment
```

No command reads the `nextFork` text. A commitment-first fork confirmed as exposure-first would pass
every remaining gate. The reviewer is the control; the flag is the record of that judgement.

## Release gates

`pnpm content:release` re-evaluates every gate at one release instant against the exact version and
digest. It refuses, listing everything it found:

```text
$ pnpm content:release -- --pack fixture-retail-assistant --version 5 --actor fixture-operator-one
FAIL  provenanceLog.localization-reviewed: fluent Burmese localization review is required for fixture-retail-assistant version 5; provenanceLog.accessibility-reviewed: content accessibility review is required for fixture-retail-assistant version 5; provenanceLog.sponsorship-disclosed: sponsorship disclosure is required for sponsored pack fixture-retail-assistant version 5
```

A refused release writes nothing: no `artifact-eligible` event, no `artifact-released` event, no
bundle, no manifest, no index entry. Confirm with `pnpm content:status` and `pnpm content:verify`.

The gates, in the order they block:

1. **Standing status** — `practitioner-reviewed` or `artifact-eligible` only. A retired version, an
   `authored` version, and a `changes-requested` version are all refused before gate evaluation.
2. **Localization** — a Burmese source for that exact version, a `localized` event whose digest
   matches the file, and an approved `localization-review` attestation that confirms fluency and
   cites evidence, binding the exact `localizedContentDigest`.
3. **Content accessibility** — authored `accessibility` metadata on the source, plus an approved
   `accessibility-review` attestation confirming the reading order and media alternatives with the
   runtime deferral recorded.
4. **Sponsorship** — for a sponsored Pack, `editorialControl: independent`, `orderingInfluence:
none`, and an approved `sponsorship-disclosure` attestation. An unsponsored Pack must have no
   disclosure event at all.
5. **Practitioner approval** — the recorded gate: exact version scope, an approved founder checkpoint
   in the same cycle, a non-authoring practitioner, and a qualifying, date-valid, occupation-scoped
   eligibility record valid both at the review instant and at the release instant.
6. **Artifact boundary** — fixture-only classification, `fixture-` actors, and a canonical, fully
   indexed artifact root with no unindexed files.

## Release

```sh
pnpm content:release -- --pack fixture-retail-assistant --version 4 --actor fixture-operator-one
```

```text
PASS  released fixture-retail-assistant version 4 at sequence 24 (actor fixture-operator-one, 2026-09-27T06:11:34.014Z); recorded artifact-eligible at sequence 23
```

One release reads the clock once and uses that instant for both `artifact-eligible` and
`artifact-released`. It then writes, in order and through one in-process transaction: the provenance
log, the exclusive bundle, the exclusive release manifest, and the deterministically re-rendered
snapshot index. Existing files are never overwritten:

```text
$ pnpm content:release -- --pack fixture-retail-assistant --version 4 --actor fixture-operator-one
FAIL  version: release requires standing practitioner-reviewed or artifact-eligible status for fixture-retail-assistant version 4 (current status "artifact-released")
```

Artifacts are byte-deterministic from the committed records. `pnpm content:verify` rebuilds every
historical release at its recorded release time and compares the regenerated bytes, then requires
exact agreement between release and retirement history, snapshot-index entries, and artifact files:

```text
$ pnpm content:verify
{
  "indexEntries": 5,
  "mode": "repository",
  "packs": [
    "fixture-retail-assistant"
  ],
  "releases": [
    ...
  ]
}
```

A repository with no releases and no artifact files passes and reports zero releases explicitly.

## Inspecting status

```sh
pnpm content:status -- --pack fixture-retail-assistant --version 4
pnpm content:status -- --pack fixture-retail-assistant --version 4 --json
```

```text
pack: fixture-retail-assistant
version: 4
status: artifact-released
contentDigest: 0ae56cb285cecb3824d81a9ef9cde34974d9b7967668e523b846f9258d24be30
fixtureOnly: true
events: 9
attestations: 5
attestation: founder-review approved by fixture-founder-one at sequence 18
attestation: practitioner-review approved by fixture-practitioner-one at sequence 19
attestation: localization-review approved by fixture-localizer-one at sequence 20
attestation: accessibility-review approved by fixture-accessibility-reviewer-one at sequence 21
attestation: sponsorship-disclosure approved by fixture-sponsorship-reviewer-one at sequence 22
```

`content:status` is a governance check, not a report. It exits `1` rather than printing a status when
a record and its provenance event disagree, when an attestation is missing or detached, when a
retirement record or notice does not match its sealed event, or when a released version's manifest is
missing. Treat any `content:status` failure as a repository-integrity incident and go to _Failure
recovery_.

## Verifying an artifact snapshot against a trusted commit

A repository checkout is not a distribution channel. When a consumer validates the artifact
boundary, it supplies the protected commit it trusts. The commit below belongs to the throwaway
rehearsal copy described at the end of this document, not to this repository.

```sh
pnpm content:verify -- --trusted-commit c25301a7e590cb3628b3948fcfa2fbf29b495536
```

```text
{
  "artifacts": [
    "bundles/fixture-retail-assistant/2/bundle.json",
    "bundles/fixture-retail-assistant/4/bundle.json",
    "manifests/fixture-retail-assistant/2/manifest.json",
    "manifests/fixture-retail-assistant/4/manifest.json",
    "retirements/fixture-retail-assistant/2.json",
    "retirements/fixture-retail-assistant/4.json",
    "snapshot-index.json"
  ],
  "indexEntries": 6,
  "mode": "trusted-snapshot",
  "trustedCommit": "c25301a7e590cb3628b3948fcfa2fbf29b495536"
}
```

Rules for that check:

- The commit must be a full 40- or 64-character lowercase hex SHA. Trust is never inferred from
  `HEAD`, a branch name, an abbreviated id, or agreement with local digests:

  ```text
  FAIL  trustedCommit: trusted commit "c25301a7" must be a full immutable commit SHA (40 or 64 lowercase hex characters); Stage 2 never resolves trust from HEAD, a branch name, or an abbreviated id
  ```

- The local artifact tree is compared file for byte against the tree the commit pins, so a missing,
  extra, or altered artifact fails:

  ```text
  FAIL  retirements/fixture-retail-assistant/4.json: artifact file artifacts/retirements/fixture-retail-assistant/4.json pinned by trusted commit c25301a7e590cb3628b3948fcfa2fbf29b495536 is missing locally
  ```

  Deleting the retirement notice and rewriting the index to match produces the same failure, because
  the pinned tree still contains the file.

- Every index entry's declared kind, Pack ID, and version must match its canonical path, and its
  digest must match the file. The index bytes must be the canonical rendering of their own entries.
- A consumer loading a released version must refuse a version whose retirement notice is present.
  Integrity verification and consumption are separate calls, and only the loader refuses.

Stage 2 selects no distribution, no refresh mechanism, and no trusted-root acquisition. A consumer
learns about a later retirement only by verifying a later trusted commit.

## Failure recovery

Committed provenance and artifacts are append-only: **never re-seal, rewrite, or delete committed
history to make a check pass.** First determine whether the missing file was previously committed or
whether the process stopped before the transaction was committed. Preserve unrelated work in either
case.

### A validation failure wrote nothing

Gate and validation refusals happen before the first write. A later write failure triggers best-effort
in-process rollback. Check `git status --short` and run the relevant `content:status` or
`content:verify` command before retrying; if state is incomplete, use the interrupted-write path
below.

### A previously committed file was deleted or altered

If a file exists in the last verified commit but is now missing, `content:status` or
`content:verify` detects the mismatch. For example, deleting a committed attestation gives:

```text
$ rm content/packs/fixture-retail-assistant/attestations/4/22-sponsorship-disclosure.json
$ pnpm content:status -- --pack fixture-retail-assistant --version 4
FAIL  attestations: no review attestation binds sponsorship-disclosed event at sequence 22 for fixture-retail-assistant version 4; attestation files must match their provenance events
```

Check that the path has no other intended work, then restore **only that path** from the verified
commit and re-verify. Do not append a replacement review: the committed event is legitimate history
and a new event would leave the original one unbound. The example uses `HEAD` only when it is the
verified commit containing the file:

```text
$ git restore --source=HEAD -- content/packs/fixture-retail-assistant/attestations/4/22-sponsorship-disclosure.json
$ pnpm content:status -- --pack fixture-retail-assistant --version 4
pack: fixture-retail-assistant
version: 4
status: retired
...
```

(elided: the same command also prints `contentDigest`, `fixtureOnly`, the event and attestation
counts, and one line per bound attestation)

### A process stopped during an uncommitted transaction

An interrupted `content:attest` can leave a new provenance event without its attestation;
`content:release` can leave a release event plus a bundle or manifest that is absent from the
snapshot index; `content:retire` can leave a retirement event without its record, notice, or index
entry. These files may never have existed in Git. **Do not use `git restore` to claim they were
recovered, rerun a command against the partial state, or hand-build an attestation or artifact to
match the event.**

1. Stop content writes. Record `git status --short`, the failing command and output, and the affected
   Pack/version. Preserve a copy of the affected working tree outside the repository before changing
   it, including untracked files and any unrelated edits.
2. Identify the last verified commit before the interrupted command and inspect the diff from that
   commit. If any part of the incomplete event or derived output was committed, or the previous
   complete state cannot be identified, stop for an integrity review; this procedure cannot infer a
   safe rollback.
3. Start from that verified commit in a separate clean worktree. Keep the interrupted worktree intact
   for investigation. Reapply only independently authored source and localization changes from the
   preserved copy. Recreate any later **uncommitted** reviews, release, or retirement through the
   normal commands and human checkpoints, in order; their new event times and digests will differ.
   Do not copy the partial provenance log, attestations, bundle, manifest, notice, or index into the
   clean worktree.
4. Run `pnpm content:status -- --pack <id> --version <n>` for affected registered versions and
   `pnpm content:verify`. Review the diff and confirm no unrelated work was lost before committing
   the complete result. Retain the interrupted copy until the integrity review is closed.

Crash-journal recovery, where a crashed process is resumed automatically rather than repaired by
hand, is deferred beyond Stage 2.

### A sealed record was altered

Altering a provenance event breaks the seal and is refused:

```text
FAIL  events.20.eventDigest: eventDigest mismatch at sequence 21: event fields were altered after sealing
```

Altering a review attestation's meaning-bearing field is refused too — by the event binding, by the
schema, or by the re-evaluated gate:

```text
FAIL  attestations: no review attestation binds founder-reviewed event at sequence 18 for fixture-retail-assistant version 4; attestation files must match their provenance events

FAIL  contentReview: approved founder/practitioner attestations must confirm both six-part structure and exposure before commitment
```

An altered bundle, manifest, notice, or snapshot index is caught by the byte comparison in
`pnpm content:verify` and by the trusted-tree comparison in `pnpm content:verify -- --trusted-commit`.

Restore the record from version control and re-run `pnpm content:status` and `pnpm content:verify`.
If the alteration cannot be explained by a legitimate authoring change, treat it as a suspected
integrity incident and follow the exposure response below.

### A command is refused for a reason you did not expect

`FAIL` messages name the exact record and the rule that refused it. Common causes:

| Message fragment                                        | Cause                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `is not registered; run content:new-version`            | The target version was never sealed                                               |
| `already registered; registered versions are immutable` | The version number exists                                                         |
| `must be a fixture- identity`                           | A real-looking actor id on fixture-only content                                   |
| `is not fixture-only`                                   | A production-classified source in a Stage 2 command                               |
| `has no retirement record` / `has no retirement notice` | Missing committed file or interrupted write; identify which recovery path applies |
| `refusing to overwrite existing file`                   | The target already exists; commands never overwrite                               |
| `does not cover exact version scope`                    | A stale approval for edited content                                               |
| `occupation scope does not cover pack occupation`       | Practitioner eligibility is too narrow                                            |
| `is not valid at gate evaluation time`                  | Eligibility expired between review and evaluation                                 |

Exit code `2` means the invocation was wrong — a missing, unknown, repeated, or malformed flag. The
usage line is printed with the message. No repository state is read or written.

## Retirement

Retirement is terminal for a version. It preserves the version's history and artifacts and makes the
version unusable going forward.

```sh
pnpm content:retire -- --pack fixture-retail-assistant --version 4 --actor fixture-operator-one \
  --reason "Synthetic fixture retirement after the lifecycle walkthrough."
```

```text
PASS  retired fixture-retail-assistant version 4 at sequence 25 (actor fixture-operator-one); retirement notice written to artifacts/retirements/fixture-retail-assistant/4.json
```

What retirement writes, in order: the `retired` provenance event, the source-side retirement record
at `content/packs/<pack-id>/retirements/<version>.json` (which holds the actor and the reason, because
the event schema has no reason field), and — for a previously released version — the immutable
retirement notice at `artifacts/retirements/<pack-id>/<version>.json` plus its snapshot-index entry.

The notice carries the Pack ID, version, content digest, release-manifest digest, and retirement-event
digest. It deliberately carries **no** actor and **no** reason, because it crosses the artifact
boundary.

What retirement does not do:

- It does not change the bundle, the release manifest, the release event, the source, the provenance
  history, or the attestations. Those stay byte-identical.
- It does not remove the version from history. A released-and-retired version still verifies.
- It is irreversible. A duplicate retirement is refused, and a retired version can never be released
  again:

  ```text
  FAIL  version: pack "fixture-retail-assistant" version 4 is already retired; duplicate retirement is refused
  FAIL  version: pack "fixture-retail-assistant" version 4 is retired; a retired version is no longer artifact-eligible and cannot be released
  ```

  Correcting a mistaken retirement means authoring a new version.

For a version that was never released, no notice and no index entry are written; only the event and
the source-side record. For a version that was released, the command fails closed before any write
unless the release manifest, both required snapshot-index entries, the bundle bytes, and the fixture
classification all agree.

Consumers must check for the notice. `loadReleasedBundle` refuses a retired version even though the
snapshot itself still verifies; a repository-only retirement event would otherwise be invisible past
the artifact boundary.

## Repository privacy rules

**Prohibited in this repository, in every branch and every commit:**

- Real practitioner credential documents — certificates, licences, transcripts, certificates of
  completion, ID cards, photographs, signatures, or scans of any of them.
- Personal data of any person: names, contact details, addresses, national identifiers, dates of
  birth, employment history, or anything that identifies a young person, practitioner, employer, or
  reviewer.
- Youth data of any kind, in any form, including examples, test data, and anonymised-looking data.
- Anything that would let a reader contact or identify a real person from the repository.

This applies to Pack sources, localizations, eligibility `evidenceReferences`, localization
`fluentReviewEvidence`, attestation `note` fields, retirement `reason` fields, commit messages, pull
request descriptions, review comments, and Git history. Git history counts: a deleted file is still
in the object store, and a rewritten branch leaves the old objects reachable through reflogs and
forks.

### What crosses the artifact boundary

`artifacts/` is the distribution boundary, so treat every byte under it as publishable. A release
bundle embeds the **entire** Pack source and the **entire** Burmese localization as free text,
including `title`, `summary`, every `limitations` line, every experiment part, every
`alternativeText` and `transcript`, and `sponsorship.sponsorName` and `disclosure`. It also embeds the
whole sealed provenance prefix, so **every review actor identity and every recorded instant for every
version of that Pack is in the bundle bytes**. Use a `fixture-` identity for anything you do not want
published, and keep real names out of authored prose entirely.

What deliberately does **not** cross: review attestations, attestation `note` text, localization
`fluentReviewEvidence`, eligibility records, and the retiring actor and reason on the retirement
notice. Those stay in the repository, which is why the privacy rules above still apply to them
even though they never reach an artifact.

### Writing safely

- **Eligibility evidence** — an opaque reference only: at most 128 characters, matching
  `[a-z0-9][a-z0-9:_-]*`, which cannot express a path, a name with spaces, or a URL. For fixture
  records, `fixture:` prefixed. Never a name, a credential number, or anything that resolves to a
  document.
- **Localization review evidence** — the same discipline, and the same 128-character cap. For fixture
  content, a `fixture:` reference.
- **Notes and reasons** — describe the review decision, not the person. "Reviewed for exposure before
  commitment" is useful; a reviewer's name, contact route, or account is not. These two fields are
  unbounded by schema, so the discipline is the only control.
- **Actor identities** — a lowercase kebab-case identifier. For Stage 2 it must start with
  `fixture-`, which is a deliberate marker that the identity is synthetic. It is also what you want,
  because actor identities are published inside the bundle.
- **A finding you cannot write safely is a finding to escalate, not to record.** Summarise it in the
  pull request and cite the controlled record by its non-sensitive reference identifier — never by a
  URL, a path, or a ticket link that resolves to it.

### Suspected exposure

If personal data or a credential document reaches the repository, in any branch, in any commit, or in
a pull request:

1. **Stop.** Do not push further, do not "fix" it with another commit, and do not delete the file
   locally as the response.
2. **Do not copy the data anywhere else** — not into an issue, a chat message, a test fixture, or a
   local note.
3. **Notify the repository owner immediately**, naming the file, the branch or commit, and when it
   landed. Do not assess severity yourself.
4. **Follow the owner's direction** for the repository history and for any notification obligations.
   Rewriting published history is a coordination decision, not a local cleanup.
5. **Record the outcome in the repository** as a synthetic summary, with no copy of the exposed data.

Stage 2 has no secret-scanning or personal-data-detection control. The prohibition above rests on
review, on the fixture-isolation gate that requires a `fixture-` actor identity on every fixture-only
record, and on the two schemas that require `fixture:`-prefixed evidence references for
`fixtureOnly` eligibility records and localization reviews. It does not rest on an automated scanner.

## Known limits of the current implementation

Record these accurately in any report about this pipeline. Each is a real gap, not a caveat about
wording.

1. **The accessibility gate does not prove reading-order coverage.** `accessibility.readingOrder` must
   be non-empty and unique, and every media `id` must appear in it, but nothing requires it to
   cover every authored section or every experiment. An accessibility approval can therefore confirm
   an order that silently omits an experiment. The committed fixture's reading order is complete and
   is asserted in both locales by the test suite, which pins this fixture only; the gate does not
   require it. Reviewers must check coverage themselves.
2. **Sponsored Burmese content has no localized disclosure field.** The localization schema has no
   `sponsorship` field and the gate reads `pack.sponsorship` from the canonical source only, so a
   sponsored Pack can reach release with the disclosure present solely in the source while a
   Burmese-reading young person sees none. The committed fixture does not rely on that: its
   disclosure, no-money and no-youth-data boundary, and editorial-control boundary are all repeated in
   the Burmese `limitations` and asserted. No non-fixture sponsored localized content may be emitted
   before the localization representation is decided.
3. **Historical verification depends on the current eligibility record.** `pnpm content:verify`
   rebuilds every historical release against the _current_ eligibility record. `status`,
   `verification.status`, `verification.verifiedOn`, and `occupations` are gate-load-bearing, so a
   later deactivation, re-verification, or occupation amendment breaks an already-released version.
   The occupation failure names the occupation; the others surface as a practitioner-gate error that
   does not name the fixture. The `validFrom` / `validUntil` window is evaluated at the recorded
   release time, so later expiry does not break a historical rebuild. `evidenceReferences` is read by
   no gate at all — it is validated by schema and nothing else — so an edit to it breaks nothing and
   is equally undetectable. All of this is why the record must be treated as frozen.
4. **Attestation free text is not covered by any digest.** The `note` field is excluded from the
   artifact boundary and is not bound by the provenance chain, so editing a note is detected by
   nothing. A note-only edit passes `content:status` and `content:verify`. Only the
   meaning-bearing fields are bound: actor, instant, outcome, sequence, digests, and the review
   confirmations.
5. **`fluentBurmeseConfirmed` reads as a real confirmation even for fixtures.** Only the `fixture-`
   actor, the `fixture:` evidence reference, the classification, and the note mark it synthetic. The
   same applies to `localizationApproved: true` in a release manifest.
6. **Fixture classification is a flag, not an authentication.** A consistently `fixtureOnly: false`
   set of pack, records, and provenance passes every cross-record check. Nothing binds a `fixture-`
   identity to a human being.
7. **A whitespace-only change to a governance record is not detected.** The four artifact files are
   compared byte for byte; a JSON governance record is re-parsed, so reformatting it changes nothing
   semantically and nothing observable.
8. **Snapshot index ordering is lexical, not numeric.** `10` sorts before `2`. It is deterministic,
   identical for every writer and reader, and pinned by a test, but a numeric expectation would be a
   trap for a future maintainer.
9. **The artifact-only consumer cannot prove prefix completeness.** It can prove the released
   version's provenance prefix is self-consistent, digest-pinned, lifecycle-legal, and anchored to the
   release manifest. It cannot prove the prefix is complete for _earlier_ versions of the same Pack;
   that needs the authoring sources and is the repository verifier's job.
10. **Trusted-root acquisition is out of scope.** Verification requires a local checkout whose
    artifact tree matches the pinned commit. That is not a distribution or trust decision, and any
    later distribution choice must revisit it knowingly.

Each numbered limit is a candidate follow-up. Fixing any of them is a schema, gate, or product
decision with its own authority, and none of them is in scope for this documentation.

## Operational checks

Routine, in this order:

| When                                  | Check                                                | What it proves                                                                          |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Before opening a change               | `pnpm verify:fast`                                   | Lint and typecheck                                                                      |
| After authoring or recording anything | `pnpm content:status -- --pack <id> --version <n>`   | That version's records are internally consistent and bound                              |
| Before a release, and in CI           | `pnpm content:verify`                                | Every historical release rebuilds byte-identically; artifacts, index, and history agree |
| Before a release, and in CI           | `pnpm content:schemas:check`                         | Generated JSON Schemas match the runtime schemas                                        |
| Before trusting an artifact boundary  | `pnpm content:verify -- --trusted-commit <full-sha>` | The local artifact tree is the tree the trusted commit pins                             |
| Before requesting review              | `pnpm verify:full`                                   | Everything above plus the test suite, product invariants, and documentation checks      |

`pnpm verify:full` already runs `content:schemas:check` and `content:verify`, so a single full run
covers the whole chain.

## What a green check means

Every procedure above runs against synthetic fixture content. A passing result establishes fixture
lifecycle validity only: the records are schema-valid, the digest chain is intact, the recorded
reviews bind the exact version and digest, and the artifacts rebuild byte-identically from those
records.

It is not a real practitioner endorsement, not a real qualification check, not evidence of real
Burmese fluency, not a comprehension or accessibility result for young people, and not public-release
approval. No command here can tell a synthetic actor from a person, and no gate here authorises
publication. Real practitioner approval, real-world vetting, public release, and Stage 3 activation
each require their own owner authority and their own gates.

## Rehearsal: the full lifecycle on a throwaway copy

The commands below were run against a throwaway copy of this repository, on new versions of the
committed fixture Pack, to produce the transcripts in this document. **The committed fixture is
frozen**: its records are reproducible only from the committed records, never by re-running the
commands, because every `recordedAt` is a real wall-clock instant and a replay produces a different
chain and therefore different artifact bytes. Rehearse on a copy; append a new version to the real
repository only when you mean to.

| Step                      | Command                                                                                                 | Observed                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Author and register       | `content:new-version -- --pack fixture-retail-assistant --from 2 --actor fixture-author-one`            | `PASS registered … version 3 at sequence 14` — the reported sequence is the head, which is the `localized` event when a localization exists             |
| Release too early         | `content:release -- --pack fixture-retail-assistant --version 3 --actor fixture-operator-one`           | `FAIL … current status "authored"`, provenance still at sequence 14                                                                                     |
| Request changes           | `content:attest … --version 3 --kind founder-review --outcome changes-requested …`                      | `PASS … at sequence 15`; release then refused with `current status "changes-requested"`                                                                 |
| Edit a registered version | edit `3.yaml` in place                                                                                  | `FAIL events: recorded contentDigest for pack version 3 does not match the source-derived digest`                                                       |
| Fix it properly           | restore `3.yaml`, author `4.yaml`, `content:new-version --from 3`                                       | `PASS registered … version 4 at sequence 17`                                                                                                            |
| Record the five reviews   | `content:attest` for each kind with its full flag set                                                   | sequences 18 to 22                                                                                                                                      |
| Release                   | `content:release -- --pack fixture-retail-assistant --version 4 --actor fixture-operator-one`           | `PASS released … at sequence 24; recorded artifact-eligible at sequence 23`                                                                             |
| Re-release                | same command again                                                                                      | `FAIL … current status "artifact-released"`                                                                                                             |
| Verify                    | `pnpm content:verify`                                                                                   | both releases rebuild; 5 index entries                                                                                                                  |
| Retire                    | `content:retire -- --pack fixture-retail-assistant --version 4 --actor fixture-operator-one --reason …` | `PASS retired … at sequence 25; retirement notice written to artifacts/retirements/fixture-retail-assistant/4.json`; bundle and manifest byte-identical |
| Re-retire                 | same command again                                                                                      | `FAIL … already retired; duplicate retirement is refused`                                                                                               |
| Pin and verify            | commit, then `content:verify -- --trusted-commit <full-sha>`                                            | `PASS mode: "trusted-snapshot"`; notice deletion, with or without an index rewrite, fails                                                               |
| Restore committed file    | delete a committed attestation file, then `content:status`                                              | `FAIL … no review attestation binds sponsorship-disclosed event at sequence 22`; path-scoped `git restore` restores it                                  |
| Gate refusal              | release with only founder and practitioner approved                                                     | `FAIL` naming all three missing gates, with no artifact and no new event written                                                                        |
