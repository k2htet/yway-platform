# Yway Architecture

## 1. Purpose and authority

This document defines Yway's logical architecture and invariants while keeping implementation mechanisms reversible.

Authority order remains:

`PRODUCT_VISION.md` > `PRODUCT_CONTRACTS.md` > this document > accepted ADRs > advisory reports.

Logical domain ownership does not imply packages, services, schemas, databases, APIs, or deployment boundaries.

## 2. Architecture principles

- Product contracts drive architecture and architectural choices must not weaken product invariants.
- Youth value is independent of employer participation.
- Evidence meaning, category identity, and provenance must remain explicit.
- Consent is purpose-specific and auditable.
- Offline-supported youth work must survive synchronization without silent loss.
- Content provenance must survive transformations and sharing.
- Implementation choices remain reversible until separately accepted.

## 3. Logical domains and responsibilities

### Youth

Owns youth exploration, practice interactions, reflection, direction choices, and youth-facing evidence views. Youth does not redefine Content or Evidence meaning.

### Content

Owns Career Experience Pack definitions, content provenance history, review-scope validity, release eligibility, and content lifecycle semantics.

Content provenance is cumulative historical information. Current release status is separate. A reviewed release status applies only to the reviewed scope; changed content outside that scope cannot inherit eligibility without the required review process. Exact versioning, materiality rules, and workflow remain future decisions.

### Evidence

Accepted decision YWAY-D002 establishes Evidence as an independent logical domain. This establishes semantic ownership only; it does not require a separate package, service, schema, database, API, or application.

Evidence owns evidence-category meaning, evidence provenance, lifecycle semantics, and presentation constraints. Categories may be displayed together when labels, meaning, and provenance remain explicit. Category-specific viewing remains supported.

### Practitioner

Owns practitioner identity and qualification context, practitioner contribution context, and practitioner-specific operational workflows. Practitioner review provides content review authority within the approved review boundary; it does not create unrestricted capability certification.

### Operations / Safeguarding

Owns operational controls, moderation, safeguarding workflows, content approval operations, and release gates. Operations access is bounded by authorization and explicit workflows.

### Employer

Owns Employer Quest/application context and employer workflows. Employer does not own submitted youth work meaning, evidence semantics, or youth evidence provenance. Employer access to youth material requires explicit sharing boundaries and consent.

### Consent / Sharing

Owns purpose-specific sharing scope, consent records, consent history, and auditability. Quest submission consent and employment application consent remain distinct purposes.

### Identity / Access

Owns identity context, roles, and authorization context. Authorization is not satisfied by UI hiding and must preserve access boundaries.

## 4. Provenance and sharing boundaries

The Content/Youth-to-Evidence provenance handoff preserves origin, meaning, and applicable provenance history without selecting a storage schema or transport.

The Evidence-to-Consent/Sharing boundary exposes only explicitly selected evidence and approved sharing scope. Consent determines what may be shared; Evidence retains ownership of meaning.

## 5. Ownership constraints

- Domains own concepts and invariants; another domain must not silently reinterpret them.
- Cross-domain collaboration uses explicit contracts or interfaces.
- Employer context must not access private youth exploration, reflections, or ordinary unshared practice evidence.
- Admin and Operations workflows do not bypass domain authorization boundaries.
- Privileged access is controlled access, not an exception path.

## 6. Required capabilities

### Offline preservation

The architecture requires durable preservation of offline-supported youth work and future conflict handling without selecting local/server authority, synchronization technology, or conflict strategy.

### Authorization and consent

The architecture requires enforceable authorization, purpose-specific consent, and auditability. It does not select providers, policy engines, persistence models, or middleware designs.

### Content provenance

The architecture requires provenance and review eligibility to remain enforceable. It does not select CMS, workflow, or state-machine implementations.

## 7. Architectural invariants

- No career-fit, employability, candidate score, ranking, or composite suitability metric.
- Evidence categories are not silently collapsed or promoted.
- Employer workflows do not create candidate state automatically.
- Private youth data is not exposed through incidental reuse.
- Consent remains purpose-specific.
- Practitioner-reviewed status applies only to reviewed content scope.
- Offline work is preserved.

## 8. Non-normative candidates

Technology candidates remain non-normative and require separate ADRs before adoption.

## 9. Deferred physical architecture

This document does not decide:

- application boundaries
- package/service topology
- database topology
- APIs
- deployment topology
- synchronization mechanisms
- authentication providers
- CMS or workflow technology

## 10. Classified unresolved questions

| Question group | Disposition |
| --- | --- |
| Content authoring, review granularity, materiality, publishing workflow | Stage 2; future content/operations architecture decision or ADR |
| First application boundary, mobile delivery, partial Pack downloads | Stage 3; delivery ADR before implementation |
| Pack-content provenance to evidence-reference shape | Stage 4; future evidence/data architecture ADR |
| Local/server authority, conflicts, synchronization, server ownership | Stage 5; future sync/data ADR with representative scenarios |
| Authentication, authorization, consent persistence, Admin privileges, access auditing | Stage 6; future identity/consent/authorization ADR; hardened later in Stage 12 |
| Practitioner qualification, vetting, accountability | Stage 7; future practitioner-operations decision |
| Employer vetting and Yway ownership of Quest review/structuring | Stage 8; future architecture/operations decision before Quest implementation |
| Physical communication, packages, services, APIs, deployment/data topology | Stage 10 or first implementation stage requiring it; future physical architecture ADR |
| Future 16–17 pathway | Outside current 18+ scope until owner-approved safeguarding, consent, and access review |

## 11. Change discipline

Accepted decisions may refine this document. Speculative mechanisms must not become normative through documentation drift.
