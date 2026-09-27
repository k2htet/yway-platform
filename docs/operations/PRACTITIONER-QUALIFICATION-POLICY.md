# Practitioner qualification policy and role-overlap matrix

Who may approve a Career Experience Pack, on what evidence, and which operational roles may be held
by the same person.

## Scope and authority

This policy is operational documentation. It is not product or architecture authority.

- `YWAY-P019` and `YWAY-E005` require qualified-practitioner review covering the exact content being
  released, with cumulative provenance preserved.
- `YWAY-D003` in
  [`docs/decisions/003-stage-2-content-pipeline.md`](../decisions/003-stage-2-content-pipeline.md)
  governs the Stage 2 eligibility record and the fixture-practitioner boundary.
- Roles and responsibilities are split across the Content, Practitioner, and Operations/Safeguarding
  domains in [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).
- Role separation for content review, and the fixture/real-world boundary, are operating
  authorization from the Stage 2 kickoff issue #32, recorded in the active plan
  [`STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md`](../exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md).
- Authoring and review command syntax is in
  [`CONTENT-OPERATIONS-GUIDE.md`](CONTENT-OPERATIONS-GUIDE.md); procedures are in
  [`CONTENT-LIFECYCLE-RUNBOOK.md`](CONTENT-LIFECYCLE-RUNBOOK.md).

Two things are deliberately separated throughout:

- **Mechanical enforcement** — a rule the commands refuse when broken. A refusal means the rule is
  enforced, not that a human judgement happened.
- **Policy** — a rule the commands cannot see. Policy is enforced by review, by the role matrix
  below, and by a human declining to record a confirmation they have not actually made.

## What Stage 2 qualification means

Stage 2 qualification is a **fixture assertion**. The eligibility record and the review it supports
are synthetic. A passing gate proves that a record claiming manual verification exists, is active, is
date-valid, and covers the Pack's occupations. It does not prove that a real practitioner holds the
qualification claimed, or that any person exists behind a `fixture-` identity.

Real-world vetting and identity controls are deferred to a later decision. Until that decision
exists, no Stage 2 artifact, note, or commit message may describe a fixture approval as a real
endorsement.

## The eligibility record

One record per practitioner actor, at `content/eligibility/<actor-id>.json`. The author writes it;
no command writes it.

```json
{
  "schemaVersion": 1,
  "actorId": "fixture-practitioner-one",
  "fixtureOnly": true,
  "occupations": ["retail-assistant"],
  "status": "active",
  "verification": {
    "method": "manual",
    "status": "verified",
    "verifiedOn": "2026-09-01"
  },
  "validFrom": "2026-01-01",
  "validUntil": "2031-12-31",
  "evidenceReferences": ["fixture:synthetic-no-credential-001"]
}
```

Rules:

- `actorId` is a lowercase kebab-case identifier and must equal the practitioner actor on the
  attestation. A record cannot lend its qualification to another identity.
- `occupations` is non-empty and unique, and must cover **every** occupation listed on the Pack being
  approved. A practitioner scoped to one occupation cannot approve a Pack listing two.
- `status` is `active` or `inactive`. An `inactive` record refuses every approval.
- `verification.method` is the literal `manual`. There is no automated qualification path, by design.
- `verification.verifiedOn` is a date and must not be later than the UTC calendar date of the approval
  being recorded. A practitioner cannot be approved on the strength of a verification that had not
  happened yet.
- `validFrom` and `validUntil` are dates with an inclusive window, evaluated against the UTC calendar
  date of both the approval and the later gate evaluation. `validUntil` must not precede `validFrom`.
- `evidenceReferences` is a non-empty list of opaque references matching
  `[a-z0-9][a-z0-9:_-]*` (128 characters maximum). They point at a controlled record elsewhere. They
  never carry a name, a credential number, a scan, a contact detail, or a path into a personal
  store. For `fixtureOnly` records every reference must start with `fixture:`.

The committed example is
[`content/eligibility/fixture-practitioner-one.json`](../../content/eligibility/fixture-practitioner-one.json).

## Mechanically enforced eligibility rules

`content:attest` runs the proposed gate before writing a practitioner approval, and
`content:release` and `content:verify` run the recorded gate. Both modes refuse when:

- the eligibility record's `actorId` differs from the approving actor;
- `status` is not `active`, or `verification.status` is not `verified`;
- `verification.verifiedOn` is later than the approval's review date;
- the approval date or the gate evaluation date falls outside the inclusive `validFrom`/`validUntil`
  window, in either direction;
- the gate evaluation time precedes the practitioner approval;
- `occupations` does not cover every occupation on the Pack;
- no approved founder-review event and attestation exist for that exact version and digest, or the
  founder checkpoint does not precede the approval — the founder attestation's `reviewEventSequence`
  must bind the founder event, and the founder actor, instant, and sequence must line up with it;
- the standing version status is not `founder-reviewed` at approval time, or not
  `practitioner-reviewed`, `artifact-eligible`, or `artifact-released` at evaluation time, so a
  `changes-requested` or `retired` version can never satisfy the gate;
- the approver is the recorded author of that exact version;
- the approving attestation, the founder attestation, the eligibility record, the source, and the
  provenance events disagree about fixture classification;
- the approval's `packId`, `packVersion`, or `contentDigest` does not match the source-derived scope,
  which is how a stale approval for edited content is refused;
- a `fixtureOnly` record names an actor that is not a `fixture-` identity, or a `fixtureOnly`
  eligibility record carries evidence that is not a `fixture:` reference.

Exit code `1` means one of these refused, and nothing was written.

## Mechanically enforced independence, and its exact boundary

The enforced independence rule is narrow and worth stating precisely:

> **No practitioner approval of a version that the approving practitioner authored.**

The check compares the practitioner actor against the actor on the `authored` event for that exact
version. Three things follow, and none of them is enforced:

- Independence is **non-authorship only**. It is not separation from the founder role, from the
  other reviewers, or from the content maintainers.
- Only the exact version's `authored` event is checked. A practitioner who authored the Burmese
  localization, or an earlier version of the same Pack, is not mechanically refused.
- Nothing authenticates the actor. A `fixture-` identity is a string, and any actor that can write
  the repository can write the record that claims it.

The role matrix below is how the unmechanical part is handled.

## Role-overlap matrix

Roles are the distinct jobs one person could hold in a single Pack's lifecycle. "Enforced" means the
commands refuse the overlap; "Policy" means a human must not record a confirmation that the overlap
would make false.

| Role                            | Records                                                                                                                                                                                      | Must not also be                                           | Enforced overlap rules                                                                                                                                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Author                          | The `authored` event. `content:new-version` also records its `--actor` on the `localized` event when a localization exists; that actor is the registrar, not a verified translator identity. | The practitioner reviewer of that same version             | Author ≠ practitioner reviewer **of the same version** is enforced. Every other combination in this row is policy.                                                                                                                                 |
| Founder reviewer                | An approved or `changes-requested` `founder-review` attestation and event                                                                                                                    | —                                                          | The founder checkpoint must precede the practitioner approval, and both must bind the exact version and digest. Whether the founder authored the content is **not** enforced; policy says do not approve your own work as founder.                 |
| Practitioner reviewer           | An approved or `changes-requested` `practitioner-review` attestation and event, against a qualifying eligibility record                                                                      | The author of that same version                            | Non-authorship of that version and occupational eligibility are enforced. Holding the founder role in the same cycle, authoring another version of the same Pack, or authoring the localization are **not** enforced; policy says avoid all three. |
| Localizer                       | The Burmese content in `localizations/<version>.yaml`; translator identity is not captured by the `localized` event.                                                                         | —                                                          | No command ties a translator to a version's review. Policy says the translator and the fluency reviewer should be different people, because a fluency confirmation by the author of the text is not a fluency review.                              |
| Localization (fluency) reviewer | An approved `localization-review` attestation binding the exact `localizedContentDigest`                                                                                                     | —                                                          | An approval must confirm fluency and cite evidence, and fixture-only evidence must be a `fixture:` reference. The gate cannot tell whether the evidence is real.                                                                                   |
| Accessibility reviewer          | An approved `accessibility-review` attestation with the mandatory runtime deferral                                                                                                           | —                                                          | Confirmations are enforced as fields. Coverage of every authored section is **not** enforced; see the runbook's known limits.                                                                                                                      |
| Sponsorship reviewer            | An approved `sponsorship-disclosure` attestation                                                                                                                                             | —                                                          | Only applicable to a sponsored Pack. An unsponsored Pack must not carry a disclosure event.                                                                                                                                                        |
| Release operator                | The `artifact-eligible` and `artifact-released` events                                                                                                                                       | —                                                          | The release actor must be a `fixture-` identity and every gate must pass at the release instant. The operator may be the same person as any reviewer; policy prefers a distinct operator for the release step.                                     |
| Retiring operator               | The `retired` event, the source-side retirement record, and the artifact notice                                                                                                              | —                                                          | Retirement is terminal and refuses a duplicate. The operator may be any authorized role.                                                                                                                                                           |
| Repository maintainer           | Schemas, commands, verification scripts, and generated output                                                                                                                                | The sole reviewer of their own change to a control surface | Separation is a review requirement under [`CONTRIBUTING.md`](../../CONTRIBUTING.md), not a command rule. A maintainer who authored a version may still not be its practitioner reviewer.                                                           |

### Matrix rules that hold regardless of the table

1. **A confirmation is a human statement.** Recording `sixPartStructureConfirmed: true` or
   `exposureBeforeCommitmentConfirmed: true` asserts that a reviewer examined the content. No
   pipeline step reads the `nextFork` text. A commitment-first fork confirmed as exposure-first
   passes every remaining gate, which is why the confirmation is the control.
2. **One person, one confirmation per cycle.** Review cycles after `changes-requested` are separate
   attestations bound to separate sequences. A prior cycle's approval cannot satisfy a later one, and
   a reviewer may not carry an earlier cycle's confirmation forward.
3. **Fixture identities imply fixture content.** A `fixture-` actor is a synthetic identity, so any
   record naming one is fixture-only by definition and must be marked `fixtureOnly: true`. Relabelling
   a consistently `fixtureOnly: false` set of records is **not** detectable by these commands:
   flag-based classification cannot authenticate intent while identity remains deferred. It is not a
   permitted operation, and a relabelling is a governance breach regardless of whether a check
   catches it.
4. **Notes and reasons are audited text.** The attestation `note` and the retirement `reason` are
   unbounded free text; the localization `fluentReviewEvidence` and the qualification
   `evidenceReferences` are capped at 128 characters and pattern-restricted. Write all of them as
   synthetic, opaque, and safe to publish. See the runbook's privacy section.

## The eligibility record is effectively frozen

`pnpm content:verify` rebuilds every historical release by re-running the practitioner gate against
the **current** eligibility record. That makes `status`, `verification.status`, `verification.verifiedOn`,
and `occupations` load-bearing for releases that already happened: changing any of them breaks the
rebuild for a release in the past. The occupation failure names the occupation; the status and
verification failures surface as a practitioner-gate error that does not name the fixture.

`evidenceReferences` is the opposite case and worth knowing about: no gate reads it. It is validated
by schema and nothing else, so editing it breaks nothing and is equally undetectable.

The only edits that cannot break a rebuild are ones that leave every already-recorded review date
inside the window: letting `validUntil` lapse, or moving `validFrom` or `verifiedOn` earlier.
Narrowing the window, deactivating, re-verifying later, or narrowing occupations are all unsafe.

Treat the committed record as append-only. A practitioner needs a new actor identity, not an edited
record.

## What this policy does not establish

- That a real practitioner exists, is who they claim to be, or holds the qualification claimed.
- That a real Burmese-speaking reviewer checked real Burmese text.
- That accessibility, comprehension, or safety were established for real young people.
- That a real employer, sponsor, or workplace was described accurately.
- Any authorization to publish. Public release, real practitioner approval, and Stage 3 activation all
  require separate owner authority and separate gates.

## Follow-ups

These are recorded, not decided here. Each needs its own authority.

1. **Identity and authorization controls.** Nothing binds an actor identity to a person, and no
   authorization layer restricts who may run a command. That is a significant architecture decision.
2. **Real qualification vetting.** What "qualified practitioner" requires in the real world, and who
   verifies it, is a product and policy decision that YWAY-P019 and YWAY-D003 both leave open.
3. **Enforcing the role matrix.** Making founder/practitioner separation, translator/reviewer
   separation, and reading-order coverage machine-checkable is a schema and gate change.
4. **Classifying `fixture-` identities as fixture-only.** An inverse rule
   (`fixture-` identity ⇒ `fixtureOnly: true`) would close the relabelling path described in matrix
   rule 3.
5. **Sealing eligibility into history.** Historical verification re-evaluates the practitioner gate
   against the current record, so a later status change breaks a release that already happened. Either
   sealing an eligibility digest at `artifact-eligible`, or separating "eligibility no longer
   satisfies the historical evaluation" from artifact mismatch, is a governance decision that
   YWAY-D003 and the Product Contracts do not cover. The same decision would give
   `evidenceReferences` a real integrity control.
