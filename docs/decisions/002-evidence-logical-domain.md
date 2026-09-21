# Decision: Evidence as an Independent Logical Domain

## Metadata

- ID: YWAY-D002
- Date: 2026-09-20
- Status: ACCEPTED
- Owners: Yway product owner, Yway architecture
- Related ExecPlan:
  `docs/exec-plans/completed/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md` (S1-06)
- Related Product Contracts: YWAY-P007–YWAY-P009, YWAY-P014–YWAY-P019, YWAY-P022,
  YWAY-E001–YWAY-E004

## Context

Yway needs one logical owner for the meaning and lifecycle of youth evidence. The Evidence
Portfolio contains five semantically distinct categories: exploration signals, practice evidence,
verified assessment evidence, user-added work, and Employer Quest work. Those categories must
remain truthful and provenance-preserving through organization, correction, export, and selective
sharing.

Evidence is closely connected to Youth interactions, but its responsibilities also cross Content,
Consent/Sharing, Employer, Identity/Access, and future verified-assessment concerns. In particular:

- Youth interactions and Content provenance may supply the facts needed to create evidence, but
  practitioner review of Pack content must not strengthen the resulting youth evidence.
- Evidence correction or reclassification, if supported later, must be explicit, auditable, and
  provenance-preserving.
- Evidence remains private unless the youth explicitly selects a purpose-specific payload for
  sharing.
- Employer Quest completion may create Employer Quest work evidence, but must not expose the
  private Portfolio, create candidate status, or become employment-application consent.
- Evidence derived from offline-supported youth work must not create a path by which later
  synchronization destroys that work.

Before this decision was accepted, the Architecture document treated Evidence as independent while
also listing its placement as unresolved. Stage 1 therefore needed an explicit decision that would
resolve the logical ownership boundary without implying a package, service, API, schema, database,
deployment, auth, or sync choice.

## Decision Drivers

- Preserve evidence-category meaning and prevent silent strengthening or conflation.
- Keep evidence provenance distinct from Career Experience Pack content provenance.
- Make explicit correction/reclassification ownership auditable and enforceable.
- Preserve private-Portfolio and least-disclosure boundaries across sharing.
- Keep Employer Quest work distinct from employer access, candidate status, and applications.
- Give all five evidence categories a coherent owner, including categories not created solely by
  career-exploration interactions.
- Keep the logical decision reversible and avoid premature physical architecture.
- Preserve offline-supported youth work without selecting synchronization authority or technology.

## Options Considered

### Option: Evidence remains an independent logical domain

- **Advantages:**
  - Establishes one logical authority for category meaning, provenance, creation semantics,
    correction/reclassification, and Portfolio truthfulness.
  - Keeps Youth focused on exploration, reflection, direction, learning, practice interactions, and
    the youth-facing lifecycle of work.
  - Creates an explicit least-disclosure boundary from private evidence to Consent/Sharing rather
    than allowing Employer concerns to reach into Youth-private state.
  - Accommodates user-added work, verified assessment evidence, and Employer Quest work without
    redefining them as career-exploration interactions.
  - Reduces the risk that Content review status, employer context, or presentation concerns silently
    reinterpret evidence level.
- **Disadvantages:**
  - Adds a logical collaboration boundary where Youth creates or displays evidence.
  - Requires future implementations to make ownership and cross-domain contracts explicit.
  - Can create unnecessary operational complexity if maintainers mistake a logical boundary for a
    requirement to deploy or store Evidence separately.
- **Risks:**
  - Premature conversion into a package, service, database, or network boundary.
  - Duplicated Youth and Evidence models if future implementation contracts are poorly designed.
- **Validation evidence available:**
  - Product Contracts already require category discrimination, provenance preservation, explicit
    correction, purpose-specific sharing, and employer isolation.
  - The S1-05 responsibility/collaboration matrix describes a coherent Youth–Content–Evidence and
    Evidence/Youth–Consent/Sharing–Employer flow without choosing a physical mechanism.
  - The five evidence categories have origins and consumers broader than the Youth interaction
    lifecycle alone.
- **Unknowns:**
  - Physical application, package, storage, transaction, API, and synchronization boundaries.
  - Exact evidence creation, correction, and provenance-reference representations.

### Option: Evidence becomes a concern within Youth

- **Advantages:**
  - Keeps the near-term interaction and evidence lifecycle under one logical owner.
  - May reduce conceptual handoffs while early evidence is created mainly through Youth flows.
  - Could be simpler for an initial implementation if the product has few evidence producers.
- **Disadvantages:**
  - Broadens Youth from interaction ownership into category semantics, provenance, correction,
    export, sharing preparation, and Portfolio truthfulness.
  - Makes non-interaction sources such as user-added work, verified assessment evidence, and
    Employer Quest work fit under Youth even when their origin and lifecycle cross other concerns.
  - Weakens the clarity of the least-disclosure boundary between private Youth state and selected
    evidence supplied to Consent/Sharing.
  - Increases the chance that Youth interaction state and evidence classification evolve together
    even though one must not silently reinterpret the other.
- **Risks:**
  - Evidence levels or provenance become presentation details rather than governed semantics.
  - Employer Quest submission logic gains incidental access to broader Youth-private state.
  - Content practitioner-review status is accidentally treated as strengthening youth capability
    evidence.
- **Validation evidence available:**
  - Youth owns the source interaction and private work lifecycle for much near-term exploration and
    practice evidence.
  - Product Contracts do not mandate an independent domain or any physical separation.
- **Unknowns:**
  - Whether a sufficiently strong internal Evidence boundary within Youth would remove the apparent
    simplicity advantage and effectively reproduce the independent logical responsibility.
  - Whether Youth would remain cohesive once all five evidence categories and sharing/correction
    workflows exist.

## Decision

Evidence will remain an **independent logical domain**.

The decision is about semantic ownership only. It does not require or authorize a separate package,
service, application, schema, database, deployable, team, API, or network boundary. Evidence may be
physically colocated with Youth or other concerns until later accepted decisions establish physical
architecture.

**Capability requirement:** The system must have one explicit logical authority for evidence-category
meaning, evidence provenance, creation semantics, any future explicit correction/reclassification,
and Portfolio truthfulness. That authority must preserve category and provenance through
organization, export, and purpose-specific sharing while preventing employer access to private or
unshared youth data.

**Implementation choice:** UNRESOLVED. No physical boundary, persistence model, communication
mechanism, authorization mechanism, consent storage, or synchronization design is selected.

The logical collaboration boundaries are:

- Youth owns the source interaction, reflection, practice, and private-work lifecycle and supplies
  only the bounded facts needed for evidence creation.
- Content owns Pack definition, content provenance, and review eligibility and supplies only the
  traceability context required to interpret Pack-derived evidence.
- Evidence owns the resulting evidence item's category, meaning, provenance, and any later explicit
  correction/reclassification semantics.
- Consent/Sharing owns the disclosure purpose, inspected payload scope, recipient, and auditable
  consent record.
- Employer receives only the explicitly authorized payload for the recorded purpose and gains no
  path to the private Portfolio.
- Identity/Access enforces trusted actor and scope boundaries without becoming an owner of evidence
  meaning.

## Consequences

### Benefits

- Evidence semantics remain stable across different producers, views, exports, and recipients.
- Privacy review can reason about a narrow selected-evidence handoff rather than employer access to
  general Youth state.
- Correction and provenance rules have one owner and cannot be silently redefined by Content,
  Youth, Employer, or presentation code.
- Future evidence sources can be added without turning them into career-exploration interactions.

### Costs and tradeoffs

- Future implementation planning must define explicit collaboration contracts between Youth,
  Content, Evidence, and Consent/Sharing.
- Cross-domain consistency and transaction needs must be evaluated once physical architecture and
  persistence are selected.
- Maintainers must distinguish logical ownership from physical separation.

### New constraints

- Youth may create and consume evidence but must not redefine evidence-category meaning.
- Content provenance may be referenced by evidence but must not be substituted for evidence
  provenance or used to strengthen evidence level.
- Consent/Sharing may disclose user-selected evidence but must not become an evidence owner or a
  standing access path to the Portfolio.
- Employer workflows must not query or traverse private Evidence or Youth state outside explicit
  user-approved sharing scope.
- Any future correction/reclassification operation must be explicit, auditable, and
  provenance-preserving.

### Operational implications

No immediate runtime or deployment implication exists because Yway has no product implementation and
this decision selects no physical mechanism. Future operational tooling must respect scoped access
and may not treat Admin context as a bypass.

### Migration and reversal implications

There is no current product data or code to migrate. Reversal before implementation is a documentation
change. After implementation, reversal could require moving semantic ownership and revalidating
provenance, correction, sharing, authorization, and Employer Quest boundaries.

## Validation

Evidence already collected:

- Product Vision and Product Contracts define five distinct categories, provenance preservation,
  explicit consent, private Portfolios, and employer isolation.
- S1-03 clarified evidence presentation and provenance without requiring separate storage or screens.
- S1-05 established placement-neutral responsibility and collaboration boundaries.
- The product owner explicitly selected the independent-logical-domain recommendation for S1-06.

Acceptance evidence:

- Product-integrity review found no material issues and classified the decision as COMPATIBLE with
  the affected contracts.
- Architecture review approved the independent logical boundary and confirmed that no physical
  architecture was selected.
- Security/privacy review found no material issues with private-Portfolio, least-disclosure,
  purpose-specific consent, or employer-isolation boundaries.
- Test review found the future validation targets concrete and correctly bounded; no product runtime
  exists against which to run those future tests.
- `pnpm verify:fast`, `pnpm verify:invariants`, and `pnpm verify:full` passed on 2026-09-20. The full
  verification correctly reported that no test script is configured and that structural checks do
  not prove semantic, privacy, authorization, consent, or offline behavior.

Future implementation success criteria include:

- category-discriminated representations and presentation;
- provenance-preserving export and sharing;
- explicit and auditable correction/reclassification if that capability is introduced;
- authorization tests denying employer access to private or unshared evidence;
- consent tests proving Quest submission and employment application remain separate purposes;
- tests confirming Quest completion creates neither candidate nor application state; and
- offline/synchronization tests proving supported local youth work is not destroyed.

Failure criteria include any path that silently promotes evidence, strips provenance, exposes the
private Portfolio, treats Quest activity as application consent, or converts this logical decision
into an unreviewed physical architecture choice.

## Reversibility

This decision is easy to reverse while it remains documentation-only and progressively harder once
multiple evidence producers, correction workflows, and sharing paths depend on it.

Reconsideration should be triggered by implementation evidence showing that:

- Evidence has no lifecycle or semantic invariants independent from Youth;
- the boundary creates repeated duplication or consistency failures that cannot be corrected through
  better collaboration contracts; or
- a different logical ownership model preserves all Product Contracts more clearly.

Any reversal must re-evaluate provenance, correction, consent, Employer Quest, employer isolation,
and offline-preservation implications before changing ownership.

## Follow-up

- [x] Complete product-integrity, architecture, security/privacy, and test reviews.
- [x] Change this decision to ACCEPTED only after owner and architecture approval are both recorded.
- [x] Reconcile the Evidence-placement sections of `docs/architecture/ARCHITECTURE.md` while leaving
      broader S1-07 work open.
- [x] Keep physical Evidence implementation choices deferred to later implementation planning and,
      where significant, later ADRs.
- [ ] Add the listed semantic, authorization, consent, provenance, and synchronization tests when the
      corresponding product implementation exists.

## Decision History

| Date       | Change                                      | Reason                                                                                                |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2026-09-20 | Initial record created with status PROPOSED | Product owner selected the independent logical-domain recommendation; architecture review pending     |
| 2026-09-20 | Status changed to ACCEPTED                  | Owner and architecture approval recorded; all four reviewer disciplines reported no material findings |
