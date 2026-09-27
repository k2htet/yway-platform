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
- No youth-facing app, mobile delivery approach, local youth-state mechanism, production content distribution, or trusted-root acquisition mechanism is accepted. Stage 3 is the trigger for those bounded decisions.
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
3. Accept a real-content pilot ADR covering actual practitioner identity/qualification evidence, non-fixture release eligibility, protected trusted build input, fixture isolation, and withdrawal of managed builds after content retirement. Do not store credential documents or sensitive reviewer material in Git.
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

- Stage 2's fixture release path cannot be relabeled as real content. The new path must prove actual reviewer qualification and exact-scope approval before a Pack reaches a participant.
- Bundled Packs can remain on an installed build after a later retirement. Limit distribution to tracked managed devices; withdraw or replace affected builds and stop sessions promptly. This does not claim an offline remote-revocation mechanism or authorize take-home distribution.
- Device-only records avoid a remote youth-data path only if OS backup, shared storage, exports, and diagnostics do not copy private responses. Verify those boundaries and managed-device erasure. Do not erase until the participant's session and any consented research capture are complete; explain local-only behavior plainly.
- A single career cannot satisfy the working try-another route. If the second Pack is unavailable, do not claim the Stage 3 exit gate has passed.

## Kickoff verification

On 2026-09-27 with Node 24.20.0 and pnpm 11.24.0, `pnpm agent:doctor` reported READY, `pnpm verify:docs` and Prettier check passed, and `pnpm verify:full` passed outside the managed filesystem sandbox: 440 tests passed, generated schemas and content verification passed, and structural invariant and documentation checks passed. The first in-sandbox `verify:full` run failed in three Git-backed test files because the sandbox blocks temporary Git repository operations; the supported-environment rerun passed. These checks verify repository consistency, not the future pilot behavior or independent semantic review.

After the focused review edits, `pnpm verify:docs`, Prettier check of changed files, and `git diff --check` passed. Full verification was not rerun for those documentation-only edits.

## Kickoff independent review

Product integrity and architecture reviewers found no material issue. Security/privacy review identified a missing backup, shared-storage, export, and diagnostic-log boundary for private youth responses; the plan and issues #57/#68 now make exclusion and erase verification explicit, and the same reviewer confirmed the finding resolved. Test review identified that S3-08 could not satisfy its two-Pack build criterion before S3-05 and S3-06; the plan and issue #63 now state those dependencies, and the same reviewer confirmed resolution. No material review finding remains. Human PR review and branch-protection checks are still required before merge.

## Progress checklist

- [x] Owner explicitly activated Stage 3 and approved the bounded plan on 2026-09-27.
- [x] Kickoff issue #56 and S3-01 through S3-13 published and mapped here on 2026-09-27.
- [ ] Roadmap and stage index activation merged with required review.
- [ ] S3-01–S3-02 accepted and Architecture reconciled.
- [ ] S3-03–S3-06 content and real review gates complete.
- [ ] S3-07–S3-11 youth flow and device validation complete.
- [ ] S3-12 moderated pilot evidence complete and critical findings resolved.
- [ ] S3-13 verification, independent review, documentation, and owner closure authority recorded.

## Discoveries log

| Date | Discovery | Effect |
| --- | --- | --- |
| 2026-09-27 | Stage 2 release artifacts and verifier are fixture-only; the retail example is synthetic. | Stage 3 needs a separately authorized non-fixture path and genuinely reviewed Packs before any youth pilot. |
| 2026-09-27 | Stage 3 has no prior GitHub issues or active ExecPlan. | Create one kickoff issue, this plan, and bounded child issues; do not duplicate existing work. |

## Decision log

| Date | Decision | Authority and limit |
| --- | --- | --- |
| 2026-09-27 | Activate Stage 3 and target a private moderated Android pilot on managed devices. | Explicit owner selection in kickoff conversation; does not authorize public release or accept an architecture ADR. |
| 2026-09-27 | Bundle complete Packs and keep pilot responses device-only, with no login or telemetry. | Owner-approved Stage 3 planning direction; storage and delivery mechanisms still require accepted ADRs. |
| 2026-09-27 | Start with a real retail assistant Pack and a second owner-selected career Pack; require real practitioner and fluent Burmese review. | Owner-approved scope; exact second occupation and reviewer eligibility are gated before authoring/release. |

## Completion criteria

Stage 3 may close only when both accepted ADRs and real-content gates are evidenced; two distinct reviewed Packs are valid for the private build; the no-login 18+ journey works end to end offline with qualitative, reversible guidance and a started next-action path; local youth work survives restart and can be erased; required Android accessibility and Burmese checks pass; at least five moderated adult sessions have no unresolved critical finding; repository verification and risk-relevant independent review results are recorded truthfully; and the owner explicitly authorizes closure. Stage 4 remains PLANNED.
