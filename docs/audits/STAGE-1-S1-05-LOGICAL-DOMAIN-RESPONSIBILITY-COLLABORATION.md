# S1-05 — Logical Domain Responsibility and Collaboration Matrix

## Purpose

Define the Stage 1 logical ownership and collaboration boundaries needed by Issue #20 without turning logical domains into packages, services, APIs, schemas, databases, deployables, or provider choices.

This audit is an analysis artifact. It does not amend `docs/architecture/ARCHITECTURE.md`, create an accepted architecture decision, or make the unresolved Evidence-placement choice assigned to S1-06.

## Source authority used

- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/audits/STAGE-1-S1-01-VISION-CONTRACT-TRACEABILITY.md`
- `docs/audits/STAGE-1-S1-03-PROVENANCE-REVIEW-EVIDENCE-PRESENTATION.md`
- `docs/exec-plans/active/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md`

Relevant contracts are YWAY-P006–YWAY-P009, YWAY-P012, YWAY-P014–YWAY-P019, YWAY-P022, YWAY-P030, and YWAY-E001–YWAY-E005. YWAY-P023 is also relevant where Operations coordinates independent localization release gates.

## Interpretation rules

- "Owns" means logical authority over the meaning and invariants of a concern. It does not imply storage ownership or a physical module.
- "Collaborates" means another concern may consume or supply explicitly bounded information. It does not prescribe an API, event, table, queue, or package dependency.
- A domain may operate on another domain's information only through a defined logical boundary; it must not silently reinterpret that information.
- The Evidence row assigns evidence responsibilities but deliberately does not decide whether those responsibilities remain an independent logical domain or become a concern within Youth. S1-06 owns that decision.
- Privileged or Admin context is an authorization context, not a domain and not a bypass around privacy, consent, provenance, or employer-isolation rules.

## Responsibility matrix

| Domain / concern          | Owns at the logical level                                                                                                                                                                                                                                                      | Required collaboration                                                                                                                                                                                                                                                                                                                                  | Explicit boundary / does not own                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Youth                     | Career exploration, trials and career experiments, reflection, direction choices, learning/practice interactions, and the youth-facing lifecycle of private work created during those interactions.                                                                            | Consumes eligible Career Experience Pack definitions from Content; supplies bounded interaction/completion context to Evidence when evidence is created; consumes Evidence views; initiates purpose-specific sharing through Consent/Sharing; acts under Identity/Access context.                                                                       | Does not redefine Pack content/provenance, evidence-category meaning, practitioner-review meaning, sharing consent, employer application state, or authorization policy. Private youth work does not become employer-visible merely because it exists or because a Quest was completed.                                                                                                             |
| Content                   | Career Experience Pack definition and lifecycle; Pack provenance history; content-review coverage semantics; the content-quality eligibility meaning required by YWAY-P019/YWAY-E005.                                                                                          | Receives qualified-practitioner review facts from Practitioner; exposes Pack definition/provenance/current eligibility context to Youth and, where needed for traceability, Evidence; participates in release operations without replacing independent Operations gates.                                                                                | Does not classify youth evidence, certify youth capability, define practitioner identity/qualification, grant access, or make employer/private-youth sharing decisions. Practitioner-reviewed Pack content does not strengthen resulting youth evidence.                                                                                                                                            |
| Evidence responsibility   | Evidence-category meaning; evidence provenance; evidence creation semantics; explicit correction/reclassification boundaries; Portfolio truthfulness and category separation, including preserving category identity and provenance through organization, export, and sharing. | Receives bounded youth interaction/artifact context from Youth and relevant Pack-origin/provenance context from Content; exposes categorized evidence to Youth; supplies only user-selected evidence payloads to Consent/Sharing for disclosure.                                                                                                        | Placement as an independent domain vs a Youth concern remains unresolved until S1-06. Evidence does not redefine Pack provenance, practitioner approval, consent purpose, employer application state, or identity/authorization. No silent strengthening or automatic promotion is allowed. Neither sharing nor export creates a public profile or Portfolio URL.                                   |
| Practitioner              | Practitioner-specific qualification context and the meaning of practitioner-contributed/review actions; practitioner experiences and practitioner-facing operational work.                                                                                                     | Supplies qualified review observations/attestations and review coverage to Content; works through Identity/Access; may participate in Operations workflows.                                                                                                                                                                                             | Identity/Access owns authenticated identity/role context. Content owns Pack provenance and content-quality eligibility semantics. Practitioner review of Pack content is not youth certification and cannot upgrade an evidence level.                                                                                                                                                              |
| Operations / Safeguarding | Moderation and safeguarding workflows; operational controls; coordination of independent release gates such as Burmese fluency/comprehension checks; controlled administrative workflows.                                                                                      | Coordinates with Content and Practitioner for release/review operations and with Identity/Access for scoped privileged access; future safeguarding work may also require Consent/Sharing boundaries.                                                                                                                                                    | Does not have unrestricted cross-domain access, does not erase or rewrite Content/Evidence provenance, does not redefine consent, and does not act as an authorization bypass. A future 16–17 pathway remains blocked on separately reviewed safeguarding and consent.                                                                                                                              |
| Employer                  | Employer-related product context: employer-supplied Quest business challenge, opportunities, Quest submission context/workflow, and employment-application lifecycle.                                                                                                          | Provides Quest business context; receives an explicitly authorized Quest/application payload through Consent/Sharing and may process it only within the recorded purpose and scope; relies on Identity/Access for employer context; collaborates with Evidence only through the selected/shared payload boundary, not through private Portfolio access. | Does not own submitted youth work or its evidence meaning, and disclosure does not grant authority to redefine, repurpose, or expand use beyond the consent scope. Does not access the wider private Portfolio, exploration, reflections, ordinary unshared practice evidence, or private youth working state. Quest completion does not create candidate status or employment-application consent. |
| Consent / Sharing         | Purpose-specific consent meaning and records; sharing scope; who receives what, for what purpose, and when; pre-submission inspection of the payload, recipient, and purpose; separation of Quest submission consent from employment-application consent.                      | Receives a user-selected payload and destination/purpose context from Youth/Evidence; presents that scope to Youth for inspection before submission; provides the authorized disclosure boundary used by Employer or other recipients; relies on Identity/Access for actor/context identity.                                                            | Does not own the underlying evidence/content, determine evidence category, define employer candidate/application state, grant blanket future access, or create an unauthenticated public profile/Portfolio access path. One consent purpose must not be reused as another.                                                                                                                          |
| Identity / Access         | User identity, role/context representation, authentication context, and authorization context/enforcement requirements.                                                                                                                                                        | Supplies trusted actor/context information to all logical concerns; enforces access scope needed by Youth privacy, Consent/Sharing, Employer isolation, Practitioner workflows, and Operations.                                                                                                                                                         | A role does not confer data ownership. Admin/privileged context is not universal access. No auth provider, policy engine, middleware, or physical enforcement layout is selected here.                                                                                                                                                                                                              |

## Critical collaboration and handoff matrix

| Collaboration / handoff                                           | Logical responsibility boundary                                                                                                                                                                                                                                                                                                     | Required invariant                                                                                                                                                                                            | Status                                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Content → Youth: Pack use                                         | Content supplies the Pack definition plus provenance and current content-quality eligibility context needed for truthful youth-facing use. Youth owns the interaction, reflection, practice, and direction lifecycle.                                                                                                               | AI/founder/practitioner provenance history remains truthful; production-quality Pack content cannot bypass the qualified-practitioner gate.                                                                   | Clarified from existing authority. No physical mechanism selected.                                                                  |
| Youth + Content → Evidence: Pack-derived evidence                 | Youth supplies the bounded interaction/artifact facts that justify creating evidence. Content supplies enough Pack-origin/provenance context to preserve traceability. Evidence owns the resulting item's evidence level, creation context, origin/provenance, and later correction/reclassification semantics.                     | Practitioner review of Pack content must not promote youth evidence. Evidence category/provenance must remain intact.                                                                                         | Clarified logically. Exact reference/data representation is deferred.                                                               |
| Practitioner → Content: qualified review                          | Practitioner supplies a qualified review fact/attestation and its scope. Content records the corresponding provenance history and determines whether the reviewed content satisfies the content-quality gate.                                                                                                                       | Changed content outside prior review scope cannot inherit stale practitioner-reviewed or production-quality status.                                                                                           | Clarified logically. Qualification operations, review granularity, materiality trigger, and workflow remain deferred.               |
| Content + Practitioner → Operations: release operations           | Content contributes Pack quality/provenance state; Practitioner contributes review facts; Operations coordinates independent operational/release gates.                                                                                                                                                                             | Practitioner review is necessary for Pack content quality but is not the whole release-readiness definition; other Product Vision gates remain independent.                                                   | Clarified logically. No CMS/workflow choice.                                                                                        |
| Employer Quest definition, employer vetting, and Yway structuring | Employer owns the employer-related Quest concept/business context. Product Vision requires the supplying employer to be vetted and each Quest to be reviewed and structured by Yway. Current authority does not uniquely assign employer vetting or Yway-side structuring to Content, Operations, Practitioner, or another concern. | No Employer Quest may proceed without a vetted supplying employer and Yway review/structuring. A Quest remains distinct from ordinary exploration, courses, job posts, hiring competitions, and applications. | Both ownership boundaries are escalated to S1-07 classification or a future architecture/operations decision before implementation. |
| Youth → Evidence: Quest work                                      | Completing Quest work may create an item in the Employer Quest work evidence category. Evidence owns its category meaning and provenance; Youth retains the private Portfolio context until explicit sharing.                                                                                                                       | Quest completion alone must not expose the item to the employer, create candidate status, or imply verified capability.                                                                                       | Clarified from YWAY-P008, P017, P018, P030.                                                                                         |
| Evidence/Youth → Consent/Sharing → Employer: Quest submission     | Youth selects the exact Quest submission payload and inspects the payload, employer recipient, and Quest-specific purpose before submission. Consent/Sharing records that disclosure purpose and scope. Employer receives only that explicitly submitted payload in the Quest context.                                              | Quest consent is separate from application consent; private exploration, reflections, ordinary practice, and unshared evidence remain unavailable. No public profile or Portfolio URL is created.             | Clarified from YWAY-P014–P018 and YWAY-E003–E004.                                                                                   |
| Youth → Consent/Sharing → Employer: employment application        | A voluntary application is a separate action and consent purpose from Quest participation/submission. Employer owns the resulting application workflow.                                                                                                                                                                             | Browsing, exploring, or completing/submitting a Quest must not silently create candidate/application state.                                                                                                   | Clarified from YWAY-P016, P017, P030.                                                                                               |
| Identity/Access → Operations: privileged/Admin workflow           | Identity/Access provides a trusted privileged context; Operations may use only the domain capabilities authorized for the defined workflow.                                                                                                                                                                                         | Admin is not a bypass around private Portfolio, employer isolation, consent purpose, or provenance boundaries.                                                                                                | Boundary clarified. Exact privilege model, emergency access, and audit mechanism remain deferred.                                   |
| Offline-supported Youth work across persistence/sync boundaries   | Youth owns the meaning of offline-supported exploration/practice work; Evidence continues to own evidence semantics if/when evidence is materialized from it.                                                                                                                                                                       | Synchronization must not destroy local youth work. No domain is declared universally authoritative merely by this matrix.                                                                                     | Preserved from YWAY-P022. Sync authority and conflict strategy remain future decisions.                                             |

## Detailed boundary clarifications

### Provenance and review responsibilities

Content provenance and youth evidence provenance remain separate responsibilities.

- Content owns the historical provenance facts and review coverage attached to Pack content.
- Practitioner owns the practitioner-specific qualification/review action context that supports a qualified review claim.
- Content consumes that qualified review fact to determine the Pack's content-quality eligibility; Operations may coordinate the workflow but does not become the semantic owner of practitioner review or Pack provenance.
- Evidence owns provenance for youth evidence items: origin, creation context, evidence level, and the traceability required to interpret Pack-derived evidence.
- No review or operational workflow may convert practitioner-reviewed content into stronger youth evidence.

This division clarifies meaning only. It does not select version identifiers, tables, CMS states, approval APIs, or workflow engines.

### Employer Quest work ownership

"Employer Quest work" has multiple distinct concerns that must not be collapsed into one owner:

- Employer owns the employer-related Quest business context and submission workflow. It may process an explicitly submitted payload only within the recorded Quest purpose and scope; it does not own the youth work itself.
- Youth owns the participation/work lifecycle and underlying youth work. Explicit disclosure does not transfer that ownership.
- Evidence owns the Portfolio category meaning and provenance of Employer Quest work.
- Consent/Sharing owns the disclosure purpose and record.
- Identity/Access owns trusted actor/context and authorization enforcement.

An employer receiving a Quest submission does not acquire access to the source Portfolio or unrelated youth data. Whether a later application reuses any Quest material requires a separate, explicit application action and purpose-specific sharing boundary.

### Content provenance to evidence provenance handoff

When a Pack interaction produces evidence, the handoff must preserve enough logical information for Evidence to truthfully answer where the item came from and what it means.

The minimum handoff is:

1. Youth supplies the relevant interaction/artifact completion context.
2. Content supplies the Pack-origin/provenance context needed to interpret the source.
3. Evidence establishes and owns the youth evidence origin, creation context, and evidence level while retaining traceability to the source context.

This does not require Evidence to copy all Content provenance fields, nor does it require a direct Content→Evidence API. Reference shape, persistence, version linkage, and transport are future data/architecture choices.

### Privileged and Admin context

Admin is a role/context in Identity/Access, not an all-domain super-owner.

A privileged workflow must therefore:

- have a defined operational purpose;
- execute under an explicit authorization context;
- use bounded domain capabilities instead of unrestricted cross-domain reads;
- preserve the original domain's meaning, provenance, and privacy rules; and
- never turn operational access into employer-visible or generally shared access.

The exact privilege model, break-glass/emergency access policy, audit-store design, and safeguarding access rules are not uniquely determined by current authority and remain future decisions. Any future minor pathway also remains subject to YWAY-P012's separate safeguarding and consent review.

### Near-term Youth–Content–Evidence collaboration

The near-term logical path is directional without prescribing a physical dependency graph:

1. Content defines an eligible Pack and its provenance/review state.
2. Youth uses that Pack for exploration/practice and owns the private interaction lifecycle.
3. When an interaction produces evidence, Evidence applies the correct category meaning and evidence provenance while preserving required Pack-source traceability.
4. Youth consumes the resulting categorized Evidence view.
5. Any external disclosure leaves the private Portfolio only through Consent/Sharing under an explicit purpose.

This flow must work whether S1-06 ultimately keeps Evidence independent or places the Evidence responsibility within Youth.

## Escalated questions and explicit deferrals

| Question                                                                                                                              | Disposition                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Should Evidence remain an independent logical domain or become a concern within Youth?                                                | S1-06 / Issue #21 technology-neutral ADR. This matrix is placement-neutral.                                                                                                                                                      |
| Which logical concern owns vetting employers that supply Quests and Yway's review/structuring of employer-supplied Quest definitions? | Both prerequisites are binding, but current authority is insufficiently specific about their logical owner. Classify both in S1-07 and require a later architecture/operations decision if implementation needs a binding owner. |
| What defines practitioner qualification, review granularity, materiality/re-review triggers, and exact approval workflow?             | Remains deferred from S1-03 to later operations/architecture work.                                                                                                                                                               |
| What exact data/reference shape connects Pack provenance to youth evidence provenance?                                                | Future data architecture. No schema, identifier model, or transport is selected here.                                                                                                                                            |
| What are the exact Admin privilege model, emergency/break-glass rules, and operational-access audit mechanism?                        | Future identity/authorization/safeguarding architecture. No blanket Admin bypass is allowed in the meantime.                                                                                                                     |
| What is the physical cross-domain communication mechanism?                                                                            | Explicitly deferred: no package, API, service, event, queue, database, or deployable mapping is implied.                                                                                                                         |
| Which node wins synchronization conflicts?                                                                                            | Future sync/data decision. YWAY-P022 only fixes the preservation outcome.                                                                                                                                                        |

No new owner product decision is required for S1-05. The unresolved items above are architecture/operational choices with named later decision points.

## Findings

- Existing product and architecture authority is sufficient to make the logical responsibility split explicit without changing Product Vision, Product Contracts, or Architecture.
- Content provenance, practitioner review facts, Operations release coordination, and Evidence provenance can be separated cleanly at the responsibility level.
- Employer Quest work requires distinct Youth, Evidence, Consent/Sharing, Employer, and Identity/Access responsibilities; collapsing them would risk private-data leakage or Quest/Application conflation.
- Privileged/Admin work remains bounded by domain ownership and authorization context; it is not a universal cross-domain bypass.
- The near-term Youth–Content–Evidence path can be described without deciding the physical dependency graph or the S1-06 Evidence placement question.
- The employer-vetting and Yway-side review/structuring owners for employer-supplied Quest definitions are materially ambiguous and explicitly escalated rather than silently assigned; both prerequisites remain mandatory.

## Product-integrity assessment

Product contracts affected:

- YWAY-P006–YWAY-P009
- YWAY-P012
- YWAY-P014–YWAY-P019
- YWAY-P022–YWAY-P023
- YWAY-P030
- YWAY-E001–YWAY-E005

Assessment:

- COMPATIBLE

The matrix preserves evidence/category separation, private Portfolio boundaries, purpose-specific consent, Quest/Application separation, employer isolation, content provenance and practitioner review, and offline youth-work preservation. It introduces no scoring/ranking concept and does not strengthen evidence based on Pack review status.

## Non-goals preserved

- No Product Vision or Product Contract change.
- No Architecture normative edit.
- No Evidence-domain placement decision.
- No package/service/API/schema/database mapping.
- No auth, sync, CMS, workflow, or provider choice.
- No physical data model.
- No product/application implementation.
- No 16–17 pathway design.

## Validation targets

Before merge:

- architecture review of ownership boundaries and decision discipline;
- security/privacy review of Employer, Consent/Sharing, privileged/Admin, and private-youth isolation boundaries;
- product-integrity review of evidence, provenance, Quest/Application, and practitioner-review semantics;
- repository verification through the required PR `Verify` workflow.
