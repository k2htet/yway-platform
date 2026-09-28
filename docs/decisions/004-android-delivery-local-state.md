# Decision: Android delivery and device-only local state for the Stage 3 youth pilot

## Metadata

- ID: YWAY-D004
- Date: 2026-09-28
- Status: PROPOSED
- Owners: Yway engineering / product owner
- Related ExecPlan: docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md (S3-01, issue #57)
- Related Product Contracts: YWAY-P010, YWAY-P011, YWAY-P012, YWAY-P013, YWAY-P014, YWAY-P018,
  YWAY-P022, YWAY-P023, YWAY-P024, YWAY-P025, YWAY-E001, YWAY-E003, YWAY-E004
- Related decisions: YWAY-D001 (repository tooling), YWAY-D003 (Stage 2 content pipeline)
- Evidence: docs/decisions/evidence/004-spike57-evidence.md

Status note: this record is **PROPOSED** and must not be read as a settled boundary while it
remains so. Independent architecture, security/privacy, product-integrity, and test reviews have run
(see Validation); the representative-device precondition in the Stage 3 plan is **not** yet
satisfied, so owner acceptance is being sought against a named, recorded risk.

ID reservation: this record reserves YWAY-D004 for issue #57 (S3-01). Issue #58 (S3-02, real-content
and trusted-build) must use the next free ID, YWAY-D005.

## Context

Stage 3 needs a first physical Android application and a durable anonymous local state mechanism
before #62 (youth flow) and #63 (bundled Pack verification) can be built. Architecture
`docs/architecture/ARCHITECTURE.md` records `Expo + React Native or alternative` for mobile delivery
and `SQLite or equivalent` for durable local storage as **candidates only** (Section 9), and lists
"first physical application boundary and mobile delivery approach" as an unresolved question triggered
in Stage 3 (Section 11). `docs/architecture/ARCHITECTURE.md` Section 10 defers the mobile/web
implementation framework, package boundaries, and deployment topology. Android-first is binding;
native/hybrid/web is not selected.

Required product outcomes this decision must preserve:

- `YWAY-P011` — a short realistic trial yields a useful insight and a next step with no
  authentication, so the app must be a single locally runnable installable artifact with no account
  or server dependency on the first-value path. **This decision supplies the preconditions
  (offline artifact, no account, no network); `YWAY-P011` itself is verified in #62 and #66 against
  the plan's anonymous-flow check, not here.**
- `YWAY-P012` — public access is 18+, a 16–17 pathway stays out of scope, and the local store must
  not acquire a birth date, age, or age-derived identifier. Eligibility is established by moderated
  recruitment, not by the app.
- `YWAY-P023` — Simple English is canonical during shaping; Burmese rendering and wrapping must be
  feasible in the chosen UI stack before it is bound to later work.
- `YWAY-P024` — light/dark theme, 200% Android text scaling, contrast, large touch targets,
  screen-reader support, reduced motion, correct Burmese wrapping and reading order must be
  achievable on compact and large Android phones.

`YWAY-P010`, `YWAY-P014`, `YWAY-P018`, `YWAY-E001`, and `YWAY-E004` are satisfied _structurally_ by
this decision rather than by any new mechanism: with no network, no account, no server, and no
employer surface, no employer, job, Quest, or opportunity data can reach the app, and no private
record can acquire a publicly addressable identifier. That is a consequence of the constraints
below, not a new product claim. `YWAY-P015`, `YWAY-P016`, and `YWAY-E003` (purpose-specific consent
and a retrievable sharing record) are **not** discharged in Stage 3 because no sharing path exists
at all; the first sharing feature must carry them, and device-only storage must never be read as a
substitute for consent.

`YWAY-P013` (guided, not rigid) is preserved by the boundary not presupposing a single linear funnel
— pause and try-another remain available — and places no constraint on framework or storage choice.

Offline durability of local work (surviving force-stop and reboot) is required by the Stage 3 plan
and by `YWAY-P022`'s offline intent. Note that `YWAY-P022`'s substantive requirement is that _later
synchronization_ must not destroy local youth work, and that remains a Stage 5 concern; this decision
does not decide synchronization.

Privacy constraints specific to this decision, from the Stage 3 plan and kickoff security/privacy
review: private youth responses must not enter cloud/device backup, device-to-device transfer, shared
storage, app-managed exports, or diagnostic logs, and must be erasable from the device. The
Stage 3 plan also requires that no account, backend, telemetry, or synchronization is added in this
stage.

Relevant risk called out by the kickoff review: `allowBackup=false` alone is not sufficient evidence
that private data cannot move off the device on some Android 12+ devices, so backup rules, backup
XML, and device-transfer behavior must be inspected and verified rather than assumed. The spike
confirmed why this matters: `allowBackup=false` blocking device transfer is an **API 31+**
behaviour, so on API 30 and below the pre-Android-12 `fullBackupContent` path governs instead.

`YWAY-D003` is ACCEPTED and explicitly hands the Stage 3 runtime loading, storage, and artifact
consumption mechanism to a later decision. This record is that decision for the runtime; the
content-authoring, provenance, and eligibility mechanism stays with `YWAY-D003` and `YWAY-D005`.

Explicitly out of scope: authentication and identity, synchronization and conflict resolution,
server-side or remote persistence, public or store distribution, OTA update delivery, telemetry and
analytics, the production content/trusted-build pipeline (issue #58, YWAY-D005), the real production
youth app implementation (#62, #63), the final erase implementation across all permitted system data
paths (#68), and the full accessibility/localization validation (#66). This decision must not decide
the later service or application topology.

## Security model

Without a named adversary, "private" and "erasable" are not falsifiable. This decision uses the
following model. It is a Stage 3 pilot model and **does not inherit forward** — Stage 4 adds a
Portfolio and Stage 6 adds identity, authorization, and consent, and the "OS-enforced device-only"
properties below must be re-derived rather than assumed there.

**Assets:** participant responses, notices, and reflections; the Pack/identifier linkage needed to
interpret them; the signing key; the device.

**Adversaries in scope, and the control for each:**

| Adversary                                    | Control                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cloud backup transport                       | `allowBackup=false`, packaged `dataExtractionRules` excluding every domain, OS-level `ALLOW_BACKUP` absent                                                                                       |
| Device-to-device transfer                    | `<device-transfer>` exclusion block in the same packaged rules, plus the compensating control that managed devices carry no cloud account and have cloud backup and D2D disabled at the OS layer |
| Other apps on the device                     | no exported provider over private data, no URI grants, no share/print/clipboard path; `FileProvider` re-scoped away from the private store                                                       |
| Shared-storage leakage                       | no `INTERNET`, no storage permissions, app-private `0600` files only; explicit prohibition on SAF/MediaStore writes for private records                                                          |
| Diagnostic logs                              | no logging of private text; `logcat` scan evidence; `ApplicationExitInfo`/tombstone traces in scope for the #68 erase check                                                                      |
| Screen capture on a shared supervised device | `FLAG_SECURE` on any window rendering private content; no private text in window titles or notification text                                                                                     |
| An adb-authorized host                       | pilot builds are **non-debuggable**; `install -r` is banned; adb authorizations revoked when a device is not supervised                                                                          |
| A host holding the signing key               | passphrase-protected keystore, single named custodian, no CI or shared-machine copies, and an operator artifact-hash check before each session                                                   |

**Adversaries explicitly out of scope:** forensic flash recovery and physical extraction of
decrypted storage from a seized device. In-place overwriting is therefore not required — flash
wear-levelling and file-based encryption make it neither reliable nor meaningful. The erase
requirement is _logical_ erasure, proven by byte-level absence of a unique sentinel, which is what
the spike demonstrated.

**Residual risk accepted:** a stolen or returned device is only as protected as its screen lock and
credential-encrypted storage, and a compromised operator host is not addressed by any application
control. Managed devices must therefore be locked, supervised, and not left unattended.

## Decision Drivers

- Offline durability: bundled content and local work must function with no network and survive
  force-stop and reboot (`YWAY-P022`).
- Privacy boundary: no private response data in OS/cloud backup, device transfer, shared storage,
  exports, or diagnostic logs, with verifiable erase.
- No-login first value: the first-value path must run entirely from the installed artifact
  (`YWAY-P011`).
- Accessibility and localization feasibility: 200% text, Burmese wrapping and reading order,
  screen reader, themes, and touch targets must be reachable, not assumed (`YWAY-P024`, `YWAY-P023`).
- Managed-device operability: locally installable, locally signed, hashable, resettable builds
  distributed to an inventoried device set for supervised sessions.
- Agentic implementation fit: the repository is documentation- and tool-driven; the app boundary
  should be buildable and testable by agents with a bounded local toolchain.
- Reversibility: content model, local-state mechanism, and delivery approach should be replaceable
  without re-authoring content.
- Honest limits: the decision must not claim device/OS coverage that was not actually exercised.

## Options Considered

### Option: Expo / React Native with app-private `expo-sqlite`

- **Advantages:**
  - Matches the candidate recorded in Architecture Section 9. (A chat-stated owner preference is
    not durable authority and is not relied on here; the five gate results are the basis for the
    recommendation.)
  - One TypeScript/React codebase for the future youth app, the pilot operator tooling, and future
    non-Android surfaces; the repository is already TypeScript with lint/typecheck/test scripts, so an
    agent-driven workflow extends naturally.
  - `expo-sqlite` writes to the app-private databases directory, not shared storage, which is the
    platform boundary Stage 3 needs.
  - Local Android builds (`expo run:android` / Gradle) can be produced on this machine without an
    Expo account, an EAS project, or network delivery, matching the no-OTA/no-store constraint.
  - Android text scaling, `accessibilityLabel`/`accessibilityRole`, and reduced-motion (`AccessibilityInfo`)
    are reachable primitives in this stack.
- **Disadvantages:**
  - Adds React Native, Metro, Gradle, and Android build tooling to a repository that currently has no
    application code; the smallest bounded change principle is traded for a single-language app.
  - Framework and Expo SDK upgrade pressure on a dependency that will carry a long-lived private data
    store.
  - Native module behavior (backup rules, file modes) is mediated by the framework, so the privacy
    boundary must be verified in the _built_ artifact rather than in configuration intent.
- **Risks:**
  - Expo SDK line selected may be a preview rather than a stable release, binding a significant
    long-lived decision to an unstable line.
  - React Native text scaling and Burmese line breaking may not honor 200% scale or wrap correctly
    without explicit work, which is exactly what `YWAY-P024` forbids assuming.
  - EAS/Expo services could become an implicit dependency for builds; local Gradle builds avoid this
    only if kept as the documented path.
- **Validation evidence available:** Full local spike on an Android emulator: standalone APK build,
  install, airplane-mode launch, save/force-stop/reboot recovery, sentinel inspection, backup
  rules, erase, and accessibility feasibility recording. See the Validation section.
- **Unknowns:** Physical managed-device behavior; device-to-device transfer on the managed device;
  long-term SDK support; TalkBack Burmese reading order on a physical device.

### Option: Kotlin / Jetpack Compose with Room

- **Advantages:**
  - Platform-native storage with direct control over `AndroidManifest.xml` backup attributes,
    `res/xml/backup_rules.xml`, `dataExtractionRules`, and file modes; no framework mediation of the
    privacy boundary.
  - Direct, predictable Android accessibility and text-scaling semantics; native rendering of Burmese
    shaping is the platform's own text stack.
  - No cross-platform abstraction to reason about when the pilot is Android-only.
  - Long-lived platform support independent of a JavaScript framework release cycle.
- **Disadvantages:**
  - A second language and toolchain (Kotlin, Gradle, Android build) in a repository whose verification
    scripts are Node/TypeScript; agentic iteration and repository-level checks are weaker.
  - More code for the discovery/preview/reflection surfaces than a React-style declarative UI.
  - Slower to reach a working pilot for a small, bounded, supervised session.
- **Risks:**
  - If Expo fails a hard gate, a Kotlin fallback must be proven on the _same_ failed gate, which
    costs a second spike.
  - A native app boundary raises the long-term cost of any future non-Android surface.
- **Validation evidence available:** Contingency only. Per the issue sequence, this option is tested
  only if Expo fails a hard gate, and accepted only if it passes that same gate.
- **Unknowns:** Room schema/migration ergonomics for the eventual session model; agent ergonomics for
  a Kotlin codebase; the shared gate result if a fallback is triggered.

### Option: WebView-hosted Android application (single WebView shell over bundled web assets)

- **Advantages:**
  - Smallest possible Android shell; UI content is plain web technology.
  - Bundled assets can be read offline from the APK with no network dependency.
- **Disadvantages:**
  - The framework-level storage boundary is the weakest of the three: there is no framework-level
    guarantee of the erase and backup behaviour used as the privacy control in this decision, and no
    per-app store whose backup eligibility and erase semantics can be inspected without
    engine-specific work. A WebView configured for app-private storage still sits under the same
    manifest rules, so the disqualifier is the absence of a verifiable per-app store, not the
    location of the files.
  - `YWAY-P024` compliance becomes an app-level retrofit rather than a platform capability:
    accessibility semantics, 200% text scaling (web CSS zoom is not Android font scaling), Burmese
    wrapping, reduced motion, and TalkBack reading order would each need explicit, per-screen work
    with no framework defaults to fall back on.
  - Adds a web stack to the repository and a second physical surface without a decision on whether
    Yway wants a web surface at all.
  - Bundled-content update and retirement handling, already constrained by `YWAY-D003` and issue
    #58, becomes an app-shell asset problem rather than a content-artifact problem.
- **Risks:**
  - Accessibility feasibility is not demonstrable from a spike without effectively building the
    journey, which is #62's work, not a feasibility check.
  - Shared-storage and cache behavior varies by Android version, so any claim would be device-
    version-specific.
- **Validation evidence available:** No device spike. The issue sequence requires this option be
  documented, not spiked, unless both the first two options fail a hard gate. Its disqualifying
  property is storage and accessibility behavior that cannot be demonstrated at spike scale, so it is
  not recommended and not spiked.
- **Unknowns:** Whether a future web surface is wanted at all; a correct future web delivery decision
  would belong to a later ADR, not this one.

### Storage sub-options for short, structured session records

The application framework choice above does not by itself settle the local-state mechanism. Three were
compared for the same short, structured, device-only records.

#### Option: Ordinary SQLite in app-private storage

- **Advantages:** app-private, structured, transactional; recovery and erase are verifiable;
  `expo-sqlite`/Room both map to a single app-private database file; survives process death and
  reboot without extra work; supports the "no export of private responses" rule because nothing is
  written outside the app sandbox.
- **Disadvantages:** auxiliary journal/WAL files exist alongside the database and must be covered by
  the erase check; migration discipline begins immediately.
- **Risks:** if OS backup copies the app data directory, the database leaves the device unless backup
  rules exclude it. This is why backup rules are a gate, not a detail.
- **Validation evidence available:** full spike — sentinel absence from backup-eligible paths, erase
  and relaunch, restart recovery.
- **Unknowns:** later session schema is deliberately not fixed here.

#### Option: App-private files (JSON per record)

- **Advantages:** trivially inspectable, human-readable, easy to erase by unlinking, no auxiliary
  sidecar files.
- **Disadvantages:** no atomicity guarantees without extra work; concurrent or interrupted writes can
  corrupt or truncate a record; resume-after-crash correctness becomes an app-level concern; query
  and partial-update cost grows.
- **Risks:** a partial write at force-stop is exactly the failure mode the durability gate targets.
- **Validation evidence available:** not spiked separately; rejected on durability reasoning for
  "short structured records that must survive force-stop and reboot" plus the marginal simplicity
  benefit.
- **Unknowns:** none blocking.

#### Option: Key-value storage (SharedPreferences / AsyncStorage / MMKV)

- **Advantages:** simplest API; adequate for flat preference values.
- **Disadvantages:** not a good fit for the short structured multi-field session records this stage
  will hold; read-modify-write races, whole-blob rewrites, and no real query or partial-update story.
- **Risks:** SharedPreferences files are also backup-eligible by default, and `allowBackup`/backup
  rules must exclude them too; mixing preferences and private responses in one store would blur the
  privacy boundary.
- **Validation evidence available:** not spiked; rejected on data-shape fit. (This entry evaluates
  the data shape, not the three named implementations individually; none of them was tested.)
- **Unknowns:** whether a later stage needs a large preferences surface; that is a separate concern
  from private responses.

**Storage sub-conclusion:** recommend ordinary SQLite in app-private storage if its recovery and erase
checks pass, because the records are structured and must survive force-stop. Private responses must
not be mixed with non-private preferences in a shared store.

## Decision

**Capability requirement:** The Stage 3 youth app must be a single, locally installable Android
application that runs with no network and no account, reads Career Experience Packs from the
installed artifact with intact provenance and release eligibility under `YWAY-D003` and the
trusted-build decision, and stores short structured exploration session records in private
app-local storage that:

- survives process force-stop and device reboot, with resume after restart;
- carries enough Pack and experiment linkage — Pack ID, Pack version, Pack digest, and experiment
  ID — to keep a local record interpretable against the exact reviewed content that produced it
  (`YWAY-P009`, `YWAY-P019`). The concrete session schema is **not** fixed here;
- is stored and presented as exploration only. Signal types (interest, observed behavior,
  preferences, constraints) stay distinct; a started next action stays distinct from a viewed or
  selected option; no points, streaks, or counters are stored or derived; and Pack review
  provenance is never surfaced as strengthening the evidence level of a local youth record
  (`YWAY-P003`, `YWAY-P006`, `YWAY-P007`, `YWAY-P009`, `YWAY-P028`, `YWAY-E002`);
- holds no birth date, age, or age-derived identifier (`YWAY-P012`, Stage 3 plan);
- carries no externally addressable identifier for a private record (`YWAY-P014`);
- can be erased completely for the app-private store. The **validated minimum** is removal of the
  database file _and_ its `-wal`/`-shm` sidecars; erasure must then be verified byte-level against
  every permitted system data path, which #68 owns;
- cannot be exported or copied out of the app by the app itself: no export, share, print, or
  clipboard path for private responses, no storage-access-framework or media-store write of private
  records, and no content provider scoped over the private store;
- is excluded from OS/cloud backup and device-to-device transfer by explicit manifest and packaged
  backup rules — **not** by relying on `allowBackup=false` alone, which is an API 31+ behaviour and
  does not govern the pre-Android-12 `fullBackupContent` path;
- never writes private text to diagnostic logs;
- renders no private content without `WindowManager.LayoutParams.FLAG_SECURE`, and places no private
  text in window titles, notification text, or accessibility window names, so that neither the
  recents thumbnail nor a screenshot or recording retains a previous participant's reflection;
- states plainly, before and after capture, that notes are stored only on this device, are not
  synchronized, and are removed by the documented reset between participants (`YWAY-P024`, Stage 3
  plan);
- offers no account, server, telemetry, or synchronization path in Stage 3.

**Implementation choice (proposed, pending owner acceptance):**

1. **One future youth application boundary at `apps/youth`.** A single Android application, built
   with Expo / React Native, using a prebuild-generated native Android project. This is a candidate
   physical boundary within the Architecture Section 11 Stage 3 row, not a commitment to a package
   or service topology. The path is the first application workspace only; workspace layout,
   monorepo convention, and task-runner reevaluation remain separate decisions under Section 10 and
   `YWAY-D001`.
2. **A stable Expo SDK line at implementation time.** The preview SDK used for the spike is
   feasibility evidence only and does not transfer to the accepted build. The accepted build uses a
   stable Expo SDK with a matching stable `expo-sqlite`; an SDK change must re-run the packaged
   manifest and backup-rule checks, not only the offline smoke test, because autolinking can change
   merged manifest output and permissions.
3. **App-private SQLite as the only store for exploration state.** `expo-sqlite`, writing to the
   app-private `files/SQLite/` directory, **unencrypted at rest**, relying on Android file-based
   encryption and device credential-encrypted storage. Private responses are not kept in shared
   preferences or key-value storage. No Android keystore key is created or used, so no key is
   destroyed on erase — which is precisely why the erase requirement is file deletion plus
   sentinel-absence proof.
4. **The pilot build performs no network fetch; the build carries a complete Pack set for offline
   use.** The artifact-embedding and build-trust mechanism — how Packs are embedded, how the build
   input is trusted, and how a retired Pack is handled — belongs to `YWAY-D005` / #58 and #63. This
   decision does not decide it. If `YWAY-D005` selects a different embedding or build-input
   mechanism, items 4 and 5 are superseded by it without reopening the framework or storage choice.
5. **Locally signed APK installed by `adb` on inventoried managed devices.** No app store, no
   public distribution, no OTA/update delivery in Stage 3. Signing material is passphrase-protected,
   held outside Git under a single named custodian, and never copied to shared, development, or CI
   machines. Re-signing with a different key forces `adb uninstall`, which erases local data — that
   is the acceptable outcome.
6. **No network capability.** The pilot build removes `android.permission.INTERNET` and other
   unnecessary permissions so "no backend, no telemetry, no synchronization" is enforced by the OS
   rather than by convention. This blocks in-process sockets only; it is not, and is not claimed to
   be, a complete egress guarantee — hence the parallel constraints on SAF/media writes, share
   paths, and provider scope.
7. **Non-debuggable pilot builds.** `android:debuggable` and `android:testOnly` must be `false`.
   Because delivery is by `adb install`, a debuggable package would let any authorized adb host read
   the private store directly, bypassing every other control in this record.
8. **Explicit backup, transfer, and export exclusions.** `allowBackup=false` **plus** a packaged
   `dataExtractionRules` excluding every storage domain from both `cloud-backup` and
   `device-transfer`, **plus** a packaged pre-Android-12 `fullBackupContent` with the same
   exclusions. The rules are declared **in-repo** in a local Expo config plugin, not by hand-editing
   a generated project, so regeneration cannot silently drop them. The `FileProvider` is re-scoped
   to a dedicated non-private directory.
9. **Erasure means removing the database file and its sidecars**, not issuing SQL `DELETE`. This is
   the validated requirement for the app-private store; cross-system-path verification is #68's.
   An app-reported erase success is never evidence — a byte-level scan is.
10. **Managed delivery is reset-safe.** `adb uninstall` or `pm clear` before every install;
    `install -r` is banned for pilot distribution, because it preserves the previous participant's
    data. USB debugging is disabled and adb authorizations revoked whenever a device is not actively
    supervised.
11. **Pilot use is limited to devices and OS versions actually exercised**, and no
    `device-transfer` or backup/restore behavior may be relied upon until the compensating control
    (no cloud account, backup and D2D disabled at the OS layer) is recorded in the device inventory
    and the transfer itself has been exercised.

The later session schema, real content and trusted-build mechanisms, and the production erase
implementation across all permitted system data paths remain undecided in their own issues.

**Deliberately not decided here:** Architecture Section 11 records "Partial Pack download behavior"
as a Stage 3 product-scope question that must be settled before any material delivery/storage ADR.
This record settles the _runtime_ fact that the pilot performs no network fetch and therefore has
no partial or streamed download path. Whether partial or streamed Pack delivery is acceptable
product scope for a later stage remains **unresolved** and is not decided by this ADR; the owner
should settle it explicitly before any ADR that would depend on it.

## Consequences

**Benefits**

- The preconditions `YWAY-P011` depends on — a single offline artifact with no account, server, or
  network dependency — were demonstrated end to end. `YWAY-P011` itself remains to be verified in
  #62/#66.
- Durable anonymous local work is real: sessions survived force-stop and full reboot with no
  network.
- Privacy stops depending on discipline for the enumerated paths. Removing `INTERNET` and excluding
  every backup and transfer domain moves "device-only" from a promise toward an OS-enforced
  property for those paths specifically. It is **not** an OS-enforced guarantee against device
  access, an adb-authorized host, or screen capture; those are handled by the security model, and
  residual risk remains.
- Employer isolation and the absence of a remote youth-data path follow structurally from having no
  network, no account, and no employer surface at all.
- One TypeScript language across the future app, pilot operator tooling, and the existing
  repository tooling keeps agent-driven work practical — **provided** the app's own tsconfig, lint
  and format ignore rules, and workspace registration are set up so `pnpm verify:*` still pass with
  the app present. That interaction is unverified and is a follow-up.
- Managed delivery mechanics were exercised: build, local signing, install, reset, uninstall, and
  reinstall of a hashed artifact all succeeded on one emulator. The command sequence, artifact hash,
  and reset procedure are recorded in the evidence document. A **managed-device inventory and
  runbook do not yet exist**.

**Costs and tradeoffs**

- A large toolchain addition (React Native, Metro, Gradle, Android SDK) to a repository that had no
  application code. This is the single largest cost of the chosen option and it is real.
- The spike ran on `expo 58.0.0-preview.7` with `react-native 0.88.0-rc.1` — a preview SDK and a
  release candidate. Acceptable for a bounded feasibility spike; unacceptable as the accepted
  build, which is why item 2 of the implementation choice requires a stable line.
- Accessibility and Burmese line breaking still require deliberate work. The spike proved
  _feasibility_, not conformance, and recorded an open `YWAY-P024` Burmese-wrapping defect.
- The evidence base is a **single emulator on one Android version, with no physical device**. The
  supported-configuration list is currently a single entry.
- The app sits outside the repository's existing typecheck, test, and content-verification scope
  until a toolchain decision is made. That is a real verification gap, not a formality.

**New constraints introduced**

- Any build that re-adds `INTERNET`, a backup-eligible data domain, an exported provider over the
  private store, or a share/export path invalidates the privacy boundary and must be rejected. A
  build-time packaged-manifest assertion is required; none exists yet, so these constraints are
  currently **review-enforced only**.
- Erase must be file-level database deletion including `-wal` and `-shm`. A `DELETE`-based erase is
  known to be insufficient and must not be reintroduced.
- `FLAG_SECURE` is required on any window rendering private content.
- Pilot builds must be non-debuggable; `install -r` is banned; adb authorizations are revoked when
  unsupervised.
- Signing key custody rules apply, and a different signing key forces `adb uninstall` and therefore
  data erasure.
- The app must be registered in the pnpm workspace with its own tsconfig and explicit lint/format
  ignores, and `pnpm verify:fast` and `pnpm verify:full` must pass with the app present.

**Operational implications**

- Managed devices must be locked, non-shared, credential-encrypted, and erased between participants,
  with erasure verified against the private app store and every permitted system data path.
  Supervision remains a precondition from the Stage 3 plan; this decision does not satisfy it.
- USB debugging stays enabled only while a device is actively supervised.
- Bundled Packs cannot be withdrawn remotely. Build withdrawal and replacement, per `YWAY-D005`,
  remains the only mechanism, which is why distribution must stay on tracked devices. That is a
  content-exposure limit, not participant-data exposure, and this record does not attempt to solve
  it.

**Migration and reversal implications**

- Pack content is a data bundle, not code, so moving to a different app framework does not require
  re-authoring content.
- Local state is disposable by design; a framework change means migrating or discarding local
  records, acceptable only while records remain device-only pilot data.
- Replacing the framework after #66 invalidates the accessibility, Burmese, and offline evidence and
  requires that validation again.

## Validation

All evidence is synthetic and is recorded in
[`004-spike57-evidence.md`](evidence/004-spike57-evidence.md), which holds the commands, versions,
sanitized outputs, artifact hashes, and screenshots. The spike source tree, keystores, and APKs were
held **outside** the repository and are not part of this decision PR. A single emulator was used:
Pixel 9 AVD, `sdk_gphone64_x86_64`, Android 16 / API 36, security patch 2025-07-05, `user` build
type. **No physical device and no second Android version were available.**

| Gate                      | Required evidence                                                                                                  | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline and durability    | Standalone APK works with no network or Metro; work survives force-stop and reboot                                 | **PASS.** Airplane mode confirmed (`Active default network: none`, ping unreachable). Cold launch from the JS-bundled release APK with no dev client. Save, force-stop recovery, and full-reboot recovery verified, then re-verified on the final hardened APK.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Privacy                   | Built configuration and device checks exclude private data from backup/transfer, shared storage, exports, and logs | **PARTIAL.** Passes: packaged `allowBackup=false` with `ALLOW_BACKUP` absent from `dumpsys package`; packaged `dataExtractionRules` excluding all nine domains under both `cloud-backup` and `device-transfer`; packaged pre-Android-12 `fullBackupContent` with the same exclusions; final APK permission list free of `INTERNET`, `SYSTEM_ALERT_WINDOW`, and storage permissions; shared-storage scan 0 matches; `logcat` scan 0 matches for sentinel, reflection text, Pack ID and digest; no export/share/print path; the one `FileProvider` is `exported=false`. **Not exercised: device-to-device transfer, cloud backup/restore at runtime, any OEM build.** |
| Erasure                   | Response absent from app-managed data paths; no recovery after relaunch or tested restore                          | **PARTIAL — PASS for the app-private store.** First attempt (row-level `DELETE` + `VACUUM`) **failed**: the app reported success while the sentinel remained in the `yway-spike57.db-wal` sidecar. Second attempt (file-level database deletion) passed: whole-tree scan 0 matches, and 0 matches after force-stop relaunch and after reboot relaunch. **Not exercised: restore**, because no transport accepted a backup.                                                                                                                                                                                                                                          |
| Accessibility feasibility | Compact/large, 200% text, Burmese, and screen-reader results with no blocking defect                               | **PARTIAL — feasibility only, one open `YWAY-P024` defect.** 360 dp and 432 dp at font scale 1.0 and 2.0, light and dark. 200% text wrapped correctly. Burmese shaped correctly at both scales but **broke at arbitrary grapheme boundaries — an open `YWAY-P024` violation, not a cosmetic issue.** All interactive targets ≥ 48 dp. TalkBack traversal order matched visual order with tab selection state exposed. Reduced motion detected via `AccessibilityInfo`. **Not exercised: contrast ratios, screen-reader traversal of Burmese strings, 200% scale with the screen reader active.**                                                                    |
| Managed delivery          | Reproducible hash, local installation, device inventory, removal/reset                                             | **PARTIAL.** Build, local signing, `adb install`, `pm clear`, `adb uninstall`, and reinstall of a hashed artifact all succeeded; hashes recorded. **No managed-device inventory and no reset runbook exist**, and removal/reset was exercised on the emulator only.                                                                                                                                                                                                                                                                                                                                                                                                 |
| Governance                | Independent reviews, explicit owner acceptance, Architecture reconciliation, passing PR Verify                     | **PARTIAL.** All four independent reviews have run and their findings are resolved in this record. Owner acceptance, Architecture reconciliation, and the PR `Verify` result are pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Overall result: the technology choice is supported; acceptance is not yet evidenced.** Three of
the five technical gates are partial, and the Stage 3 plan makes representative device-risk
validation a precondition for accepting this issue. The residual gaps are device availability, not
technology risk: no physical device, no device-to-device transfer, no backup/restore transport, and
no pre-Android-12 execution path.

**Independent review outcome (2026-09-28)**

| Review            | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture      | Resolved: the Section 11 partial-download question is no longer settled implicitly; `apps/youth` is scoped as a first application workspace; a stable-SDK condition, the `YWAY-D005` boundary, the in-repo source of truth for backup rules, and the repository-verification interaction are now stated. Its blocking finding on unmet acceptance preconditions is **retained and escalated to the owner**.                           |
| Security/privacy  | Resolved: security model added, `debuggable` recorded and constrained, `FLAG_SECURE` added, erase restated as a minimum, `install -r` banned, key custody, FileProvider re-scoping, SAF and log constraints added, `0600` demoted to a supporting note, `bmgr` refusal demoted. Its blocking finding on device-to-device transfer is **retained and escalated to the owner**.                                                         |
| Product integrity | Resolved: `YWAY-P011` demoted to preconditions, Pack/experiment traceability keys added, the plain local-only statement added, `verified` wording corrected, record-semantics clauses added, `apps/youth` scope noted, file-level delete restated as the app-private minimum.                                                                                                                                                         |
| Test              | Resolved: evidence moved into the repository with commands, outputs, and hashes; gate outcomes changed to PARTIAL where evidence was missing; the reproducibility claim corrected; contrast and combined screen-reader gaps added to the not-exercised list; the erase regression test and the "app-reported success is not evidence" rule recorded. Its blocking finding on gate honesty is **retained and escalated to the owner**. |

**Defects and open risks recorded by the spike**

1. **Open `YWAY-P024` risk — Burmese line breaking.** Burmese has no inter-word spaces and lines
   break at arbitrary grapheme boundaries. This matches a contract violation condition, not a
   polish item. It must be fixed before any build carrying Burmese user-facing text reaches a
   participant, which includes the private pilot — not only public release. Remediation in #62,
   verification in #66. **Burmese content is not cleared for the pilot while this is open.**
2. **Screen-reader duplication.** Each `Pressable` exposes both its label and its inner text as
   separate focus targets, so labels are announced twice.
3. **Window insets.** At 432 dp with 200% text the first heading draws under the status bar; the
   spike has no safe-area handling.
4. **Tab-row overflow risk.** Three short tab labels just fit 360 dp at 200% text; a fourth tab or
   Burmese labels would overflow.
5. **Erase regression risk.** A `DELETE`-based erase reports success while data persists in the
   `-wal` sidecar. Nothing in the repository currently prevents a later implementer from
   reintroducing it; the regression test below is the fix.

**Defects in the test harness itself, recorded for honesty**

The first shared-storage sweep reported sentinel matches in `/storage/emulated/0/ui*.xml`. Those
files were written by the harness (`adb shell uiautomator dump /sdcard/ui.xml`), not by the app.
They were deleted, later dumps were redirected to `/data/local/tmp`, and the clean re-scan returned
0 matches.

**Not exercised, therefore not claimed**

- Any physical Android device; any OS version other than Android 16 / API 36; any OEM-modified build.
- Device-to-device transfer at runtime.
- Cloud backup and restore at runtime, because the transport refused the backup. `bmgr backupnow`
  returning "Backup is not allowed" is **not** treated as proof on its own: on an emulator with no
  transport it cannot distinguish a correct app configuration from an absent transport. The
  probative evidence is `ALLOW_BACKUP` absent plus the packaged rule files.
- The pre-Android-12 `full-backup-content` execution path — packaged and inspected statically only.
  This matters because `allowBackup=false` blocking device transfer is an API 31+ behaviour.
- Contrast ratios; screen-reader traversal of Burmese strings; 200% scale with the screen reader
  active.
- `run-as` against the final non-debuggable APK — impossible by construction, which is itself the
  evidence that the shipped artifact is not debuggable.

**Success / failure criteria:** the recommended choice succeeds if all five technical gates pass
within the tested configuration. Offline/durability passes. Privacy, erasure, accessibility, and
managed delivery are partial with named gaps. No gate **failed**, so the Kotlin/Compose fallback
was **not** triggered and no evidence for it is claimed.

**Residual risk the owner is being asked to accept:** the entire device matrix is one emulator on
one Android version, with device-to-device transfer and backup/restore unexercised. Per the Stage 3
plan, the compensating control — managed devices carry no cloud account and have cloud backup and
device-to-device transfer disabled at the OS layer, recorded in the device inventory — must be in
force before any supervised session, and no unverified device/OS combination may be used.

## Reversibility

**Difficulty.** Moderate to reverse at Stage 3, because no real participant data and no production
content depend on the framework yet. It becomes expensive once #66 has run: the accessibility,
Burmese, and offline evidence in #66 is framework-specific, and #66 precedes the moderated sessions
in #67. After that, the local schema is something real participants have used.

**What would trigger reconsideration**

- The pilot build cannot be reproduced on a stable Expo SDK, or SDK churn threatens the local data
  store.
- A gate that passed on the emulator fails on an inventoried physical managed device, or
  device-to-device transfer is shown to move app data despite the packaged exclusions.
- `expo-sqlite` cannot meet the file-level erase requirement on a target device, or the erase
  requirement is judged unachievable under a security review.
- Burmese line breaking or screen-reader duplication proves worse than a defect in practice, and
  the platform text stack cannot be corrected within the app boundary.
- `YWAY-D005` (#58) selects a different artifact-embedding or build-trust mechanism.
- A later stage needs any network capability — content refresh, telemetry, or sync — which would
  reverse the `INTERNET` removal and several exclusions together.
- Supervised managed-device access fails, which would invalidate the device-only, no-account
  posture as a viable pilot model.
- A future requirement makes a single app framework insufficient, such as a mandatory
  non-Android surface.

**Migration implications if reversed.** Reimplement the UI in the alternative framework and
re-validate accessibility, Burmese, and offline behavior. Migrate or discard local records — safe
only while they are device-only pilot data. Re-bundle Packs as data, which does not require
re-authoring content. Repeat the privacy and erase checks against the new build. Expect the #66
validation to run again in full.

## Follow-up

Owner-gated:

- [ ] Owner explicitly accepts or rejects this ADR, including the named residual device risk.
      Implementation in #62 and #63 stays blocked until then.
- [ ] On acceptance, reconcile Architecture Sections 9, 10, and 11 against this record and record
      which Section 11 rows remain open (partial Pack download scope is one of them).

Build and enforcement (owner: #62 unless noted):

- [ ] Build the app on a **stable** Expo SDK with a matching stable `expo-sqlite`, and re-run the
      packaged-manifest and backup-rule checks — an SDK change can alter merged manifest output and
      permissions through autolinking, not just runtime behavior.
- [ ] Add a build-time assertion over the **packaged** manifest that fails if `INTERNET`,
      `SYSTEM_ALERT_WINDOW`, storage permissions, `android:debuggable=true`, or `android:testOnly`
      reappear; if any of the nine storage domains becomes included in `cloud-backup` or
      `device-transfer`; or if the `FileProvider` is exported, granted URI permissions, or scoped
      over the private store. Also assert the full exported-component and permission inventory.
- [ ] Add a source-level check that no module handling private records calls `console.log`/
      `console.error`, and that no code requests storage-access-framework or media-store writes for
      private records.
- [ ] Register `apps/youth` in the pnpm workspace with its own tsconfig and explicit lint/format
      ignores; keep signing material out of Git with ignore rules for `*.keystore`, `*.jks`, and
      `*.apk`; add a secret-scan check.
- [ ] Implement `FLAG_SECURE` on every window that can render private content, and keep private text
      out of window titles, notification text, and accessibility window names.
- [ ] Fix the four recorded accessibility defects and prove each in #66 by a stated criterion:
      Burmese line breaking (no break inside a Burmese syllable or cluster, verified at 1.0 and 2.0
      scale on 360 dp and 432 dp), single screen-reader announcement per control, correct
      safe-area/inset handling, and a tab pattern that reflows at 360 dp / 200% with Burmese labels.
- [ ] Record a dependency and permission inventory for the new third-party tree.

Erasure (owner: #68):

- [ ] Implement erase as file-level database deletion including `-wal`/`-shm`, and add the
      **regression test**: write a unique sentinel, invoke the production erase API, then scan the
      entire app-private tree (all sidecars) and `logcat` for it. This test must **fail** for any
      `DELETE`-based implementation.
- [ ] Extend erase verification to app cache, code cache, `ApplicationExitInfo`/tombstone traces,
      SAF grants, and media store, plus confirmation that no shared-preferences or keystore artifact
      holds private data.

Device matrix and pilot operations (owner: #66 for the device matrix, #67/#69 for operations):

- [ ] Repeat the device matrix on an inventoried **physical** managed device and at least one
      additional Android version, including one below API 31 so `full-backup-content` executes
      rather than merely being inspected. Measure contrast ratios, and exercise screen-reader
      traversal of Burmese strings and 200% scale with the screen reader active.
- [ ] Verify device-to-device transfer on two managed devices and confirm the packaged
      `device-transfer` exclusions actually prevent app data from moving.
- [ ] Verify cloud backup and restore end to end on a device with a real backup transport.
- [ ] Publish the managed-device inventory — model, Android version, build hash, display
      configuration, cloud-account state, backup/D2D OS settings — plus the artifact-hash check and
      reset runbook, including `adb uninstall` before every install, adb-authorization revocation
      when unsupervised, and the key-custody record.

## Decision History

| Date       | Change                                                                                                                                                                                    | Reason                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-28 | Initial record created, YWAY-D004 reserved for issue #57, status PROPOSED                                                                                                                 | Stage 3 S3-01 delivery and local-state decision required before #62/#63.                                                                                                                                                                    |
| 2026-09-28 | Full option comparison, spike evidence, and proposed decision recorded                                                                                                                    | Expo/React Native + app-private SQLite passed every gate that could be exercised; no gate failed, so the Kotlin/Compose fallback was not triggered.                                                                                         |
| 2026-09-28 | Independent architecture, security/privacy, product-integrity, and test reviews run; findings resolved; gate outcomes corrected to PARTIAL; security model added; status held at PROPOSED | No gate failed, so the technology choice is supported. Representative device-risk validation is incomplete because no physical device was available, so acceptance is escalated to the owner as a named risk rather than claimed as passed. |
