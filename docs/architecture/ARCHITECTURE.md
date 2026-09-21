# Yway Architecture

## 1. Purpose

This document defines Yway's logical architecture and invariants while keeping implementation mechanisms reversible.

- Normative sections define boundaries and required behavior.
- Provisional hypotheses are not binding.
- Candidate technologies are not accepted decisions.
- Physical app/package mapping is deferred.

Logical domain != physical package != deployable service != database != app. No one-to-one mapping between logical domains and future packages, apps, or services is implied or required.

Repository-wide authority ordering is defined by root AGENTS.md. This document defines architecture boundaries only.

---

## 2. Architecture Principles

- Product contracts drive architecture; no architectural choice may weaken a product invariant. (YWAY-P001 through YWAY-P030)
- Youth value is independent of employer participation. The system must be complete and meaningful with zero employers. (YWAY-P010)
- Privacy boundaries are architectural constraints, not presentation-only hiding. Enforcement must occur at the data/access layer, not solely in UI. (YWAY-P018, YWAY-E001)
- Evidence semantics must remain explicit. Distinct evidence levels must never be silently collapsed, promoted, or conflated. (YWAY-P007)
- Signal types must remain separate. One signal category must never silently replace another. (YWAY-P006)
- Consent is purpose-specific. Each sharing action requires its own explicit consent. (YWAY-P015, YWAY-P016)
- Offline-supported work must survive synchronization without loss. (YWAY-P022)
- Content provenance must survive transformations and sharing. (YWAY-P019)
- Implementation choices remain reversible while evidence is incomplete.
- One canonical source of truth per concern; no domain may silently reinterpret another domain's concepts.
- Guidance is reversible; no deterministic career verdict may be produced by any architectural path. (YWAY-P004)
- No scoring, ranking, or composite suitability metric may exist in any domain. (YWAY-P005, YWAY-E006)
- Public access is 18+. Any future 16–17 pathway remains blocked until separately approved safeguarding, consent, and access boundaries exist. (YWAY-P012)
- Localization and accessibility release outcomes remain binding while their implementation mechanisms stay deferred. (YWAY-P023, YWAY-P024)

---

## 3. Logical Domains

### Youth

Responsibilities: career exploration, trials/career experiments, reflection, direction choices, learning/practice interactions, youth-owned evidence views.

The Youth domain owns the meaning and lifecycle of a young person's exploratory and practice interactions. It does not own evidence categorization semantics (see Evidence) or content definitions (see Content).

### Content

Responsibilities: Career Experience Packs, cumulative content provenance history, content review state and approval semantics, and content-quality eligibility gating.

Content owns the definition and lifecycle of Career Experience Packs including their versioning and provenance. Current review or release status is separate from cumulative AI-assisted, founder-reviewed, and practitioner-reviewed provenance history and must not erase it. Practitioner approval applies only to the content within the reviewed scope; changed content outside that scope cannot inherit earlier practitioner-reviewed or production-quality status. Content does not determine how youth interact with packs — that is the Youth domain's concern. Exact versioning, materiality triggers, and workflow remain deferred. (YWAY-P019, YWAY-E005)

### Evidence

Under accepted decision YWAY-D002, Evidence is an independent logical domain rather than a sub-concern of Youth. The Product Vision and Product Contracts define five semantically distinct evidence categories with lifecycle rules, provenance-preserving correction boundaries, presentation boundaries, and sharing semantics. These concerns cross Youth, Content, Consent/Sharing, Employer, and future assessment contexts and require one logical authority. This logical ownership does not imply a separate package, service, application, schema, database, deployable, API, or network boundary.

Responsibilities: evidence category definitions and their meaning, evidence provenance tracking, evidence lifecycle semantics (creation and any future explicit correction/reclassification), and presentation constraints ensuring category identity, meaning, labeling, and provenance remain explicit whether categories are shown separately or together. Evidence must never be silently or automatically reclassified into a stronger level; if a future correction mechanism is accepted, it must be explicit, auditable, and provenance-preserving. (YWAY-P007, YWAY-P008, YWAY-E002, YWAY-D002)

### Practitioner

Responsibilities: practitioner identity and qualification context, content review workflows, practitioner-contributed experiences, practitioner-specific operational workflows.

Practitioners act as reviewers and contributors within the Content domain's approval pipeline but maintain their own identity and qualification context here.

### Employer

Responsibilities: Employer Quests, opportunities, explicitly submitted youth work within Quest/application contexts, employment applications.

Employers must never gain access to private youth exploration data, reflections, or ordinary unshared practice evidence. This is an architectural boundary, not a UI suggestion. (YWAY-P018, YWAY-E001)

Under YWAY-D002, Employer receives only the explicitly authorized payload for the recorded purpose and gains no path to the private Portfolio. Employer does not own or reinterpret evidence meaning. (YWAY-P015, YWAY-P018, YWAY-E001, YWAY-E004, YWAY-D002)

### Consent / Sharing

Responsibilities: purpose-specific consent records, sharing scope definition, consent history and auditability, separation of Quest submission consent from employment application consent.

No storage model is prescribed. The domain requires capability for persistent, auditable consent history — not a specific table or event log design.

### Identity / Access

Responsibilities: user identities, role definitions (Youth, Practitioner, Employer, Admin), authentication context, authorization context.

No auth provider is selected. Authorization enforcement must occur outside UI-only hiding and must preserve private-portfolio and employer-isolation boundaries. (YWAY-P014, YWAY-P018, YWAY-E001)

### Operations / Safeguarding

Responsibilities: content approval operations, moderation and safeguarding workflows, release gates (including Burmese fluency review), operational controls.

Operations does not have unrestricted access to every domain. Access follows the same boundary rules as other domains — privileged workflows operate on defined interfaces, not bypass paths.

---

## 4. Ownership Boundaries

- Each domain owns the meaning and invariants of its data and concepts. Another domain must not silently reinterpret those concepts.
- Cross-domain access must happen through explicit contracts or interfaces. Direct data queries across domain boundaries are prohibited.
- Private youth data must not become employer-visible through incidental reuse, shared query paths, or leaked references.
- Evidence category semantics are owned by the Evidence domain. The Youth domain consumes them but does not redefine them.
- Content provenance metadata is owned by the Content domain and must flow intact through any transformation or sharing operation.
- Consent records are owned by the Consent domain. Other domains reference consent state but do not duplicate or reinterpret it.
- Under YWAY-D002, when Pack interaction produces evidence, Youth supplies only the bounded interaction facts needed for evidence creation, Content supplies only the source traceability context needed to interpret Pack-derived evidence, and Evidence owns the resulting evidence category, meaning, provenance, and later explicit correction/reclassification semantics. Practitioner review of Pack content must not strengthen youth evidence.
- Under YWAY-D002, Consent/Sharing owns the disclosure purpose, inspected payload scope, recipient, and auditable consent record. Employer receives only that authorized disclosure and gains no standing path to the private Portfolio; Identity/Access enforces actor and scope boundaries without owning evidence meaning.
- Domain ownership does not imply separate databases, services, packages, or schemas. These are implementation choices deferred to later stages.

---

## 5. Normative Forbidden Access Paths

| Forbidden Flow                                                                                             | Contract Source                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Employer context accessing private youth exploration data                                                  | YWAY-P018, YWAY-E001            |
| Employer context accessing private youth reflections                                                       | YWAY-P018, YWAY-E001            |
| Employer context accessing ordinary unshared practice evidence                                             | YWAY-P018, YWAY-E001            |
| Quest completion automatically creating candidate status                                                   | YWAY-P017                       |
| Quest submission consent being treated as employment application consent                                   | YWAY-P015, YWAY-P016, YWAY-P017 |
| Exploration evidence being automatically promoted to practice or verified assessment                       | YWAY-P007                       |
| Sponsorship influencing editorial control, private data, ranking, or favorable treatment                   | YWAY-P020                       |
| Practitioner payment buying favorable evaluation, better direction, ranking, or hiring priority            | YWAY-P029                       |
| Practitioner participation automatically certifying youth capability                                       | YWAY-P029                       |
| Unauthenticated or public access reaching private portfolio data                                           | YWAY-P014, YWAY-P011            |
| AI-generated content shipping as a production-quality pack without practitioner review                     | YWAY-P019                       |
| Synchronization silently destroying offline-supported youth work                                           | YWAY-P022                       |
| Any system producing a career-fit score, employability score, hidden candidate score, or composite ranking | YWAY-P005, YWAY-E006            |
| One signal type silently replacing another (e.g., interest replacing observed behavior)                    | YWAY-P006                       |
| Evidence Portfolio having a public URL field                                                               | YWAY-P014                       |
| Deterministic career verdict produced by any guidance pathway                                              | YWAY-P004                       |

These describe forbidden outcomes. Specific implementation techniques for enforcement are deferred.

---

## 6. Required Capability Boundaries

### Offline Capability

The system requires capability for:

```
durable local state
    ↕
conflict-aware synchronization capability
    ↕
remote persisted/shared state
```

Neither side is universally authoritative. Conflict resolution strategy and authority semantics remain a future architecture decision. Whether a particular conflict approach (including last-write-wins variants) satisfies the preservation requirement depends on the data model and conflict types — this must be validated per case, not universally pre-judged.

No specific technology is selected for local storage, sync engine, remote database, or conflict resolution strategy.

### Authorization

Authorization enforcement must be trusted and occur outside UI-only hiding. The architecture requires authorization decisions to enforce role/context/scope boundaries at the server/API/data-access layer, including employer isolation and explicit sharing scope. Employer-context operations must have no authorized path to private Youth or Evidence data outside the exact user-approved disclosure. Role-based plus attribute-based access control is one candidate mechanism, not a required policy model. No specific auth provider, policy model, library, middleware design, or data-layer enforcement mechanism is selected. (YWAY-P014, YWAY-P018, YWAY-E001, YWAY-E004)

### Consent

The system requires capability for explicit purpose-specific consent. Before submission, the youth must be able to inspect the selected payload, recipient, and purpose. Consent history must remain auditable with a retrievable record of what was shared, with whom, for what purpose, and when. Quest submission consent and employment application consent must be separately auditable. No specific persistence model (tables, event sourcing, etc.) is prescribed. (YWAY-P015, YWAY-P016, YWAY-E003)

### Evidence Separation

Evidence categories must be semantically and structurally distinguishable to prevent accidental conflation. The architecture requires enforceable category discrimination without prescribing a type, schema, table, package, or storage layout. Categories may coexist in one view when their grouping, labels, meaning, and provenance remain explicit, and category-specific viewing must also be supported. (YWAY-P007, YWAY-P008, YWAY-E002)

### Content Provenance

Provenance history and practitioner-review eligibility must remain enforceable through the publishing pipeline. A Career Experience Pack must not be publishable to end users unless qualified-practitioner review covers the content being published. Production-quality status and other release-readiness gates remain separate concepts. Changed content outside earlier review scope must not inherit that approval. No specific CMS, workflow engine, version model, materiality rule, or state-machine library is selected. (YWAY-P019, YWAY-E005)

---

## 7. Architectural Invariants

| Invariant                                  | Source Contracts                | Architectural Consequence                                                                                                                                        |
| ------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No composite suitability scoring           | YWAY-P005, YWAY-E006            | No field, query, or aggregation may produce a career-fit, employability, or candidate ranking value                                                              |
| Evidence levels remain distinct            | YWAY-P007, YWAY-P008, YWAY-E002 | Enforceable category discrimination; no automatic promotion; explicit, auditable, provenance-preserving correction only                                          |
| Employer isolation from private youth data | YWAY-P018, YWAY-E001            | No query path from employer context into youth exploration/reflection/unshared practice                                                                          |
| No implicit candidate creation             | YWAY-P017, YWAY-P030            | Browsing, exploring, or completing Quests does not create application or candidate state; recruitment starts only with a separate explicit voluntary application |
| No public portfolio URL                    | YWAY-P014                       | Evidence Portfolio has no publicly addressable identifier                                                                                                        |
| Purpose-specific sharing only              | YWAY-P015, YWAY-P016            | Every share action carries its own consent record with explicit purpose                                                                                          |
| Practitioner review gate                   | YWAY-P019, YWAY-E005            | No Pack reaches production without qualified-practitioner review covering the published content; provenance history remains cumulative                           |
| Offline work preservation                  | YWAY-P022                       | Sync capability must not destroy locally created youth work                                                                                                      |
| Youth value independence                   | YWAY-P010                       | Core youth journey functions without employer, job, or opportunity entities                                                                                      |
| Signal separation                          | YWAY-P006                       | Interest, behavior, preferences, and constraints stored as distinct attributes                                                                                   |
| Reversible guidance                        | YWAY-P004                       | No pathway produces a deterministic career verdict                                                                                                               |
| First value without login                  | YWAY-P011                       | At least one complete interaction flow accessible without authentication                                                                                         |

---

## 8. Provisional Architecture Hypotheses

**NON-NORMATIVE / NOT YET ACCEPTED**

These are hypotheses recorded for future evaluation. They are not dependency rules and must not be treated as normative.

- Logical domains may be physically colocated until accepted decisions establish application, package, service, or storage boundaries.
- Consent may function as shared infrastructure while Consent/Sharing retains semantic ownership of consent purpose, scope, and history.
- Identity may serve as shared infrastructure while Identity/Access retains authorization-context ownership.
- Operations may require privileged workflows that cross domain boundaries under controlled interfaces.
- Cross-domain collaboration may use direct calls, events, queues, shared transactions, or other mechanisms; none is selected.

These will be validated or rejected through future decision records. Do not write code that assumes these as facts.

---

## 9. Candidate Implementations

**CANDIDATES — NOT ACCEPTED BY THIS DOCUMENT**

These candidates originate from project analysis and Build Report recommendations. They are recorded here for future evaluation via decision records. None are adopted.

| Capability                             | Candidates                         |
| -------------------------------------- | ---------------------------------- |
| Durable local storage                  | SQLite or equivalent               |
| Conflict-aware synchronization         | PowerSync or alternative           |
| Remote persisted state                 | PostgreSQL / Neon or alternative   |
| Authentication and multi-role sessions | Better Auth or alternative         |
| Schema validation                      | Zod or alternative                 |
| Type-safe data access                  | Drizzle ORM or alternative         |
| Mobile delivery                        | Expo + React Native or alternative |
| Web surfaces                           | Next.js or alternative             |
| Asset storage                          | Cloudflare R2 or alternative       |
| Web hosting                            | Vercel or alternative              |
| Mobile build/deploy/OTA                | EAS or alternative                 |
| Design environment                     | pen.dev or alternative             |

No ranking is implied. No winner is recommended. Acceptance requires a future decision record following the template in `docs/decisions/000-TEMPLATE.md`.

---

## 10. Deferred Physical Architecture

This architecture does not decide:

- Number of applications
- Mobile/web implementation framework
- Package boundaries
- Monorepo physical layout
- Service boundaries
- Database topology
- Deployment topology
- API protocol (REST, GraphQL, RPC, etc.)
- Queue/event architecture
- Synchronization engine
- Auth provider
- CMS or workflow engine

Logical domains defined in this document must not be converted into directories, packages, or services simply because they appear here. Physical architecture will be decided later based on validated needs.

---

## 11. Classified Unresolved Architecture Questions

| Question                                                                                      | Disposition                                                                 | Decision trigger / preserved constraint                                                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content authoring format, review granularity, materiality, re-review, and publishing workflow | Stage 2                                                                     | Future content/operations decision or ADR; cumulative provenance and qualified-practitioner coverage remain mandatory.                                    |
| Minimum practitioner qualification for the Stage 2 content-quality gate                       | Stage 2                                                                     | Define the minimum criteria needed to validate Stage 2 content review without pre-deciding the broader practitioner system.                               |
| First physical application boundary and mobile delivery approach                              | Stage 3                                                                     | Future delivery-architecture ADR before implementation; Android-first is binding, native/hybrid/web is not selected.                                      |
| Partial Pack download behavior                                                                | Stage 3                                                                     | Product scope remains unresolved and must be settled before any material delivery/storage ADR.                                                            |
| Pack-content provenance to evidence-reference shape                                           | Stage 4                                                                     | Future evidence/data ADR; source traceability must not strengthen evidence level or strip provenance.                                                     |
| Local/server authority, conflict handling, synchronization, and server data ownership         | Stage 5                                                                     | Future sync/data ADR backed by representative conflict scenarios; local youth work must not be destroyed.                                                 |
| Authentication, authorization, consent persistence, Admin privileges, and access auditing     | Stage 6                                                                     | Future identity/consent/authorization ADR; private Portfolio, least-disclosure, and no-bypass outcomes remain binding and are hardened again in Stage 12. |
| Broader practitioner identity, vetting operations, and accountability workflows               | Stage 7                                                                     | Future practitioner-operations decision; payment cannot buy outcomes and participation does not certify capability.                                       |
| Employer vetting and Yway ownership of Quest review/structuring                               | Stage 8                                                                     | Future architecture/operations decision before Quest implementation; vetted employer and Yway review/structuring remain mandatory.                        |
| Physical cross-domain communication, packages, services, APIs, deployment, and data topology  | Stage 10 or the first earlier implementation stage that requires the choice | Future physical-architecture ADR; logical domains do not determine physical boundaries.                                                                   |
| Safeguarding architecture for a future 16–17 pathway                                          | Outside the current 18+ scope                                               | The pathway cannot ship without separately approved safeguarding, consent, and access review; future design and ADR sequencing remain unresolved.         |

Classification does not answer these questions. Do not decide them in implementation code before their stated trigger and required decision process.

---

## 12. Architecture Change Discipline

- Product Vision changes require explicit owner action. This document cannot initiate them.
- Product Contract changes must remain aligned with the Product Vision.
- Significant architecture choices require decision records in `docs/decisions/` following the template.
- Accepted architecture decisions may refine this document. Update normative sections only when backed by an ACCEPTED decision record.
- Speculative implementation ideas must not be silently promoted to normative architecture.
- Historical accepted decisions should not be rewritten silently. Decision history tables preserve the record.
- Candidate implementations in Section 9 move to normative status only through the decision record process, never through gradual documentation drift.
