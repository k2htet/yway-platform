# Decision: Stage 2 repository-native governed content pipeline

## Metadata

- ID: YWAY-D003
- Date: 2026-09-21
- Status: PROPOSED
- Owners: Yway engineering / product owner
- Related ExecPlan: docs/exec-plans/active/STAGE-2-CONTENT-SYSTEM-OPERATIONS-FOUNDATION.md
- Related Product Contracts: YWAY-P002, YWAY-P005, YWAY-P019, YWAY-P020, YWAY-P023, YWAY-P024, YWAY-E005

## Context

Stage 2 must make Career Experience Pack governance executable before any youth-facing delivery work begins. The repository needs a way to author a synthetic representative Pack, validate its structure, preserve cumulative provenance, bind review to an immutable version, enforce founder and qualified-practitioner review, apply localization/content-accessibility/sponsorship gates, and produce deterministic artifacts for later Stage 3 consumption.

Current Architecture explicitly defers content authoring format, review granularity, versioning/materiality, workflow, practitioner qualification, CMS choice, and physical application boundaries to Stage 2. Issue #32 supplies owner-approved kickoff direction: YAML plus schema, repository-native lifecycle records, a synthetic exit fixture, scoped manual practitioner verification, independent practitioner approval, re-review after every source change, a required founder checkpoint, committed canonical bundles, and an artifact-only release boundary.

This decision is intentionally limited to the Stage 2 repository content pipeline. It must not select or imply a future product CMS, database, authentication system, application framework, package/service boundary, hosting model, Admin UI, preview UI, or youth-facing UI.

## Decision Drivers

- Exact enforcement of YWAY-P019/YWAY-E005 review scope and cumulative provenance
- Deterministic, reviewable repository artifacts suitable for protected-branch workflow
- Strict validation of YWAY-P002 experiment structure and YWAY-P005/YWAY-E006 score prohibition
- Clear fixture isolation so synthetic review cannot be mistaken for real endorsement
- Simple English/Burmese and content-level accessibility gates without overclaiming runtime readiness
- Tamper detection and reproducible release outputs
- Low operational complexity for Stage 2
- Reversibility before future product/application architecture is selected

## Options Considered

### Option: YAML content-as-code with strict runtime schemas and generated JSON Schema

- **Advantages:** Human-reviewable diffs; readable authoring format; works naturally with protected Git history; strict runtime validation can reject unknown fields and unsafe/prohibited structures; generated JSON Schema can support editors without becoming a second source of truth.
- **Disadvantages:** YAML has parsing edge cases and requires canonicalization before hashing; repository contribution workflow is less friendly for non-technical authors than a future dedicated CMS.
- **Risks:** Loose parsing or duplicate-key behavior could create ambiguity; generated schema could drift from runtime validation if generation is not deterministic.
- **Validation evidence available:** Stage 2 can test malformed YAML, unknown fields, duplicate identifiers, canonicalization, and schema determinism directly.
- **Unknowns:** Whether later production content operations should retain YAML or migrate to a CMS; intentionally deferred.

### Option: JSON-only content-as-code

- **Advantages:** More directly canonicalizable; fewer parser ambiguities.
- **Disadvantages:** Less comfortable for human authoring and review, especially localized long-form content.
- **Risks:** Authors may create noisy diffs or rely on tooling for basic editing.
- **Validation evidence available:** Technically straightforward but offers no clear Stage 2 benefit over strict YAML plus deterministic JSON artifacts.
- **Unknowns:** Same future-CMS question remains.

### Option: Select a CMS/workflow service now

- **Advantages:** Could provide non-technical authoring/review UI and built-in workflow features.
- **Disadvantages:** Introduces a long-lived vendor/product architecture choice before youth-facing application architecture, identity, authorization, hosting, and production operations are defined.
- **Risks:** Premature coupling; difficulty proving fixture isolation and deterministic repository artifacts; may silently decide deferred auth/database/UI boundaries.
- **Validation evidence available:** None required by Stage 2 that justifies this dependency.
- **Unknowns:** Future authoring scale, operator roles, permissions, vendor constraints, integration boundaries.

### Option: Repository-local lifecycle records and commands

- **Advantages:** Review/attestation/provenance changes are inspectable in Git; Stage 2 can enforce atomic no-overwrite semantics and deterministic behavior without external infrastructure; keeps the release boundary artifact-only.
- **Disadvantages:** Not a production identity/authorization system; concurrent human workflow is limited to repository/GitHub mechanics.
- **Risks:** Repository actors could be mistaken for authenticated real-world practitioner identity if documentation is unclear.
- **Validation evidence available:** Stage 2 can exercise all lifecycle transitions and tamper cases with synthetic identities.
- **Unknowns:** Future real practitioner identity, authorization, and workflow system; deferred.

### Option: External database/workflow state for Stage 2

- **Advantages:** Closer to a conventional production workflow system.
- **Disadvantages:** Prematurely selects persistence, hosting, auth/integration, migration, and operational concerns outside Stage 2.
- **Risks:** Creates product-architecture inertia without Stage 3–7 requirements.
- **Validation evidence available:** No Stage 2 acceptance criterion requires it.
- **Unknowns:** Database topology, identity, permissions, deployment, retention, backup, and future service boundaries.

### Option: Deterministic canonical JSON bundles/manifests as release artifacts

- **Advantages:** Stable machine-consumable boundary for later stages; easy byte-level reproducibility and digest verification; separates human YAML source from consumption artifacts.
- **Disadvantages:** Requires explicit canonicalization and committed generated artifacts.
- **Risks:** Source/artifact drift unless verification reconstructs and compares outputs.
- **Validation evidence available:** Rebuild-and-compare tests and manifest tamper tests can prove determinism.
- **Unknowns:** Stage 3 runtime loading/storage mechanism; deferred.

## Decision

**Capability requirement:** Stage 2 must provide a strict, tamper-detectable, provenance-preserving, version-scoped content lifecycle that enforces founder review, independent qualified-practitioner review, localization/content-accessibility/sponsorship gates, fixture isolation, and deterministic release artifacts.

**Implementation choice:** PROPOSED — use YAML content-as-code validated by strict runtime schemas (with generated JSON Schema); store versioned sources, attestations, eligibility records, provenance events, and release manifests as repository-local files; expose lifecycle operations through repository commands; bind records to canonical SHA-256 digests and chained prior-event digests; generate committed deterministic canonical JSON bundles/manifests and immutable retirement notices as the only Stage 2 release boundary. A post-release retirement emits a notice at `retirements/<pack-id>/<version>.json` within the same artifact root as its release, binding the content, release manifest, and retirement event digests while preserving the historical bundle and manifest.

Each committed artifact snapshot also contains a deterministic canonical snapshot index that enumerates every consumable bundle, release manifest, and retirement notice by path and digest. Stage 2 uses the protected Git commit/tree containing that index as the trusted snapshot root; a consumer must establish that trust before interpreting either presence or absence in the index. Before loading a version, the consumer must verify the index and referenced files against that trusted tree, require the bundle and release manifest entries, inspect the exact retirement-notice entry, and reject the version when the notice is present or when the trusted-root, index, required-entry, digest, or absence check cannot be verified. Deleting a notice and rewriting the index cannot turn a retired version into a valid snapshot because the resulting tree no longer matches the trusted root. Distribution, trusted-commit acquisition, and snapshot refresh remain deferred.

The following remain explicitly UNRESOLVED and are not selected by this decision: CMS/workflow engine, production database, application framework, physical packages/services/apps, API protocol, authentication, authorization, production practitioner identity, hosting/deployment, Admin/preview/youth UI, and Stage 3 artifact consumption/storage architecture.

A source or localization edit is treated as a new immutable positive-integer version requiring fresh version-scoped gates. This is intentionally stricter than a materiality-difference mechanism and avoids allowing stale review to cover changed content.

Stage 2 practitioner eligibility is repository-governed and synthetic for the exit fixture: occupation-scoped, manually verified, active/current, with non-sensitive evidence references only. It does not establish a production identity or credential-verification architecture.

## Consequences

- Pack sources become reviewable YAML while canonical release artifacts are deterministic JSON.
- Protected Git history and repository review become part of the Stage 2 operational control surface.
- Stage 2 can prove lifecycle semantics without external infrastructure.
- Every content/localization change requires a new version and fresh release gates, increasing review work but making stale-scope behavior unambiguous.
- Fixture identities and attestations require explicit classification so they cannot be interpreted or emitted as production approval.
- Canonicalization becomes security/integrity-sensitive code and requires focused tests.
- Released-version retirement remains visible at the artifact boundary through an immutable notice and trusted-root-bound snapshot index; consumers must refresh to a later trusted snapshot to observe later notices.
- Future CMS/database/identity systems may replace repository-local authoring/workflow while preserving the version/provenance/review/artifact semantics.
- No physical product/application boundary follows from the repository directory layout created by Stage 2.

## Validation

Before ACCEPTED status:

- product-integrity review confirms YWAY-P002, P005, P019, P020, P023, P024, and YWAY-E005 are preserved
- architecture review confirms the scope does not select future app/service/database/auth/UI boundaries
- security/privacy review confirms fixture data and qualification references do not introduce sensitive real identity material or false authentication claims
- test review confirms the proposed digest/version/lifecycle/determinism choices are testable and failure modes are explicit
- repository documentation verification passes

After acceptance, implementation validation must include:

- strict parser/schema rejection tests
- YWAY-P002 semantic-gate tests that reject a six-field experiment whose next fork increases commitment before real-world exposure
- canonical digest and deterministic JSON tests
- chained provenance tamper tests
- fresh-version-on-source/localization-change tests
- stale approval and practitioner eligibility tests
- fixture/production classification tests
- release rebuild/manifest tamper tests
- snapshot-index determinism and trusted-tree binding tests
- retirement-notice determinism, digest binding, tamper, deletion, and artifact-consumer rejection tests
- complete synthetic lifecycle test

**Success criteria:** all Stage 2 issue #32 acceptance criteria can be demonstrated without external CMS/database/auth/UI infrastructure and without weakening canonical Product Contracts.

**Failure criteria:** the approach permits stale review reuse, provenance loss, non-deterministic artifacts, fixture-to-production promotion, prohibited scoring fields, or requires silently selecting a deferred product/application architecture.

## Reversibility

This decision is deliberately reversible at the authoring/workflow layer.

A future CMS or database can replace YAML/repository-local workflow if it preserves stable Pack/version identity, canonical content digests, cumulative provenance, exact review scope, practitioner eligibility semantics, localization/accessibility/sponsorship gates, fixture isolation, and deterministic artifact compatibility (or provides an explicitly migrated replacement contract).

Reconsider when repository-native content operations become a material bottleneck, real practitioner identity/authorization is introduced, production operator workflows require concurrency/permissions beyond GitHub, or Stage 3+ requirements demonstrate that the artifact boundary must change.

Migration must preserve all historical provenance and review scope; no migration may silently strengthen review status or erase the fixture classification of synthetic records.

## Follow-up

- [ ] S2-01 (#33): complete review and change this ADR to ACCEPTED, REJECTED, or DEFERRED.
- [ ] If accepted, reconcile the directly affected Content/Practitioner/Operations Architecture text and Stage 2 unresolved questions.
- [ ] S2-02 through S2-09 implement and document the accepted semantics.
- [ ] S2-10 validates the complete synthetic lifecycle and closes Stage 2 without activating Stage 3.

## Decision History

| Date       | Change                                            | Reason                                                                                                                |
| ---------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-09-21 | Initial record created as PROPOSED                | Issue #32 activates Stage 2 and requires architecture review before implementation choices become normative           |
| 2026-09-21 | Clarified post-release retirement signaling       | Artifact-only consumers need a deterministic notice while historical release artifacts remain immutable               |
| 2026-09-22 | Bound retirement state to a trusted snapshot root | Notice absence is meaningful only when a canonical snapshot index and its files verify against the protected Git tree |
