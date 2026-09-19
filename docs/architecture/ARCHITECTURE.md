# Yway Architecture

## 1. Purpose

This document defines Yway's logical architecture and invariants while keeping implementation mechanisms reversible.

- Normative sections define boundaries and required behavior.
- Provisional hypotheses are not binding.
- Candidate technologies are not accepted decisions.
- Physical app/package mapping is deferred.

Logical domain != physical package != deployable service != database != app. No one-to-one mapping between logical domains and future packages, apps, or services is implied or required.

Authority hierarchy: `PRODUCT_VISION.md` > `PRODUCT_CONTRACTS.md` > this document > accepted decision records > Build Report (advisory only).

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

---

## 3. Logical Domains

### Youth

Responsibilities: career exploration, trials/career experiments, reflection, direction choices, learning/practice interactions, youth-owned evidence views.

The Youth domain owns the meaning and lifecycle of a young person's exploratory and practice interactions. It does not own evidence categorization semantics (see Evidence) or content definitions (see Content).

### Content

Responsibilities: Career Experience Packs, content provenance metadata, content review state and approval semantics, production eligibility gating.

Content owns the definition and lifecycle of Career Experience Packs including their versioning and provenance. It does not determine how youth interact with packs — that is the Youth domain's concern.

### Evidence

Evidence is treated as an independent logical domain rather than a sub-concern of Youth. Rationale: the Product Vision and Product Contracts define five strictly separated evidence categories with distinct lifecycle rules, provenance-preserving correction boundaries, presentation boundaries, and sharing semantics. These concerns cross-cut Youth interactions and require their own invariants. Collapsing Evidence into Youth would risk silent conflation of evidence levels — the exact failure mode YWAY-P007 exists to prevent.

Responsibilities: evidence category definitions and their meaning, evidence provenance tracking, evidence lifecycle semantics (creation and any future explicit correction/reclassification), and presentation constraints ensuring distinct evidence levels are never combined for external consumption. Evidence must never be silently or automatically reclassified into a stronger level; if a future correction mechanism is accepted, it must be explicit, auditable, and provenance-preserving. (YWAY-P007, YWAY-P008, YWAY-E002)

### Practitioner

Responsibilities: practitioner identity and qualification context, content review workflows, practitioner-contributed experiences, practitioner-specific operational workflows.

Practitioners act as reviewers and contributors within the Content domain's approval pipeline but maintain their own identity and qualification context here.

### Employer

Responsibilities: Employer Quests, opportunities, explicitly submitted youth work within Quest/application contexts, employment applications.

Employers must never gain access to private youth exploration data, reflections, or ordinary unshared practice evidence. This is an architectural boundary, not a UI suggestion. (YWAY-P018, YWAY-E001)

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
| Sponsorship or payment influencing ranking or favorable treatment                                          | YWAY-P020                       |
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

Authorization enforcement must be trusted and occur outside UI-only hiding. The architecture requires authorization decisions to enforce role/context/scope boundaries at the server/API/data-access layer, including employer isolation and explicit sharing scope. Role-based plus attribute-based access control is one candidate mechanism, not a required policy model. No specific auth provider, policy model, library, middleware design, or data-layer enforcement mechanism is selected. (YWAY-P014, YWAY-P018, YWAY-E001)

### Consent

The system requires capability for explicit purpose-specific consent with sufficient history and auditability to prove what was shared, with whom, for what purpose, and when. Quest submission consent and employment application consent must be separately auditable. No specific persistence model (tables, event sourcing, etc.) is prescribed.

### Evidence Separation

Evidence categories must be semantically and structurally distinguishable to prevent accidental conflation. The architecture requires type-level or schema-level discrimination sufficient to enforce separation. One table per category or one package per category is not required.

### Content Provenance

Provenance metadata and practitioner-review eligibility must remain enforceable through the publishing pipeline. AI-drafted content must not reach end users without passing the practitioner review gate. No specific CMS, workflow engine, or state-machine library is selected.

---

## 7. Architectural Invariants

| Invariant                                  | Source Contracts     | Architectural Consequence                                                                           |
| ------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------- |
| No composite suitability scoring           | YWAY-P005, YWAY-E006 | No field, query, or aggregation may produce a career-fit, employability, or candidate ranking value |
| Evidence levels remain distinct            | YWAY-P007            | Separate data representations; no automatic promotion path between levels                           |
| Employer isolation from private youth data | YWAY-P018, YWAY-E001 | No query path from employer context into youth exploration/reflection/unshared practice             |
| No implicit candidate creation             | YWAY-P017            | Browsing, exploring, or completing Quests does not create application or candidate state            |
| No public portfolio URL                    | YWAY-P014            | Evidence Portfolio has no publicly addressable identifier                                           |
| Purpose-specific sharing only              | YWAY-P015, YWAY-P016 | Every share action carries its own consent record with explicit purpose                             |
| Practitioner review gate                   | YWAY-P019            | No content reaches production without provenance metadata confirming practitioner review            |
| Offline work preservation                  | YWAY-P022            | Sync capability must not destroy locally created youth work                                         |
| Youth value independence                   | YWAY-P010            | Core youth journey functions without employer, job, or opportunity entities                         |
| Signal separation                          | YWAY-P006            | Interest, behavior, preferences, and constraints stored as distinct attributes                      |
| Reversible guidance                        | YWAY-P004            | No pathway produces a deterministic career verdict                                                  |
| First value without login                  | YWAY-P011            | At least one complete interaction flow accessible without authentication                            |

---

## 8. Provisional Architecture Hypotheses

**NON-NORMATIVE / NOT YET ACCEPTED**

These are hypotheses recorded for future evaluation. They are not dependency rules and must not be treated as normative.

- Youth domain may consume Content capabilities to deliver exploration and practice experiences.
- Employer domain may consume explicitly shared Consent and Opportunity capabilities.
- Consent may function as a cross-cutting capability depended upon by all domains.
- Identity may serve as shared infrastructure across all domains.
- Operations may require privileged workflows that cross domain boundaries under controlled interfaces.
- Evidence domain may depend on Content for provenance metadata and on Consent for sharing rules.

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

Stage 0 does NOT decide:

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

Logical domains defined in this document must not be converted into directories, packages, or services simply because they appear here. Physical architecture will be decided later based on validated needs.

---

## 11. Unresolved Architecture Questions

| Question                                                       | Why Unresolved                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Evidence as independent logical domain vs concern within Youth | Treated as independent domain in this document based on contract separation requirements; validate during implementation |
| Authority/conflict model for synchronized data                 | Which node (local vs server) is authoritative for which data types remains undefined                                     |
| First real physical application boundary                       | No app/package structure chosen yet                                                                                      |
| Mobile implementation approach                                 | Product Vision requires Android-first but does not specify native vs hybrid vs web delivery                              |
| Server data ownership model                                    | Centralized vs distributed data authority is undefined                                                                   |
| Consent/audit persistence model                                | Tables, event sourcing, append logs — none selected                                                                      |
| Authorization enforcement architecture                         | Middleware, policy engine, data-layer filters — none selected                                                            |
| Safeguarding architecture for future 16–17 pathway             | Requires separate safeguarding review per YWAY-P012; no design exists yet                                                |
| Content authoring format                                       | MDX, JSON, custom DSL, CMS — undefined                                                                                   |
| Partial pack download strategy                                 | Whether text-only download is supported for low-storage devices is undefined                                             |

Do not answer these questions in implementation code until a decision record accepts a specific choice.

---

## 12. Architecture Change Discipline

- Product Vision changes require explicit owner action. This document cannot initiate them.
- Product Contract changes must remain aligned with the Product Vision.
- Significant architecture choices require decision records in `docs/decisions/` following the template.
- Accepted architecture decisions may refine this document. Update normative sections only when backed by an ACCEPTED decision record.
- Speculative implementation ideas must not be silently promoted to normative architecture.
- Historical accepted decisions should not be rewritten silently. Decision history tables preserve the record.
- Candidate implementations in Section 9 move to normative status only through the decision record process, never through gradual documentation drift.
