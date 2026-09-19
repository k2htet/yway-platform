# S1-01 — Product Vision-to-Contract Traceability Audit

## Purpose

Create a durable evidence base for Stage 1 clarification work by tracing every registered Stage 1 refinement candidate to authoritative product intent and current architecture.

This audit does not modify Product Vision or Product Contracts and does not resolve unresolved owner decisions.

## Source authority used

- `docs/product/PRODUCT_VISION.md`
- `docs/product/PRODUCT_CONTRACTS.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/exec-plans/active/STAGE-1-PRODUCT-CONTRACTS-DOMAIN-ARCHITECTURE.md`

## Classification rules

Each candidate is classified as:

- Supported clarification — existing authority supports clearer wording or boundaries.
- Possible overstatement — current wording may exceed higher authority.
- Architecture ambiguity — product intent is clear but responsibility needs refinement.
- Deferred decision — insufficient authority exists; requires a future decision, owner direction, or ADR.

## Traceability matrix

The rows below correspond one-for-one with the contract and architecture clarification candidates in the active Stage 1 ExecPlan.

| Candidate                                                                                                 | Vision clause                                                                                                  | Contract clause                                                                     | Architecture clause                                                                                                                   | Classification          | Notes                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meaningful career experiment and real next action                                                         | PRODUCT_VISION §1 product purpose; §3.1 try before choosing; §3.6 increase reality before commitment           | YWAY-P001–YWAY-P003                                                                 | ARCHITECTURE §3 Youth                                                                                                                 | Supported clarification | Vision establishes realistic work before choice and names the primary outcome, but operational meaning and completion boundaries need clarification without turning engagement metrics into the outcome.                                                                                                                                                                            |
| Six-part experiment structure scope: per Pack, per trial, or per experiment within a Pack                 | PRODUCT_VISION §3.6 increase reality before commitment; §4 Career Experience Pack                              | YWAY-P002                                                                           | ARCHITECTURE §3 Youth and Content                                                                                                     | Possible overstatement  | Vision applies the six-part structure to a career experiment and describes a Pack as the content unit; it does not state that a Pack, every trial, and every nested experiment are equivalent. YWAY-P002's future verification wording applies the structure to every Pack trial component, so S1-02 must clarify that scope rather than trace it to provenance contract YWAY-P019. |
| Anonymous first career value                                                                              | PRODUCT_VISION §2 first career value without mandatory login; §4 short realistic trial without mandatory login | YWAY-P011, YWAY-P025                                                                | ARCHITECTURE §7 first value without login                                                                                             | Possible overstatement  | Vision requires meaningful discovery and a short realistic trial before login, but does not explicitly require completion of an entire Pack interaction. S1-02 must clarify the boundary without weakening first value.                                                                                                                                                             |
| Post-trial paths                                                                                          | PRODUCT_VISION §3.5 guided not rigid; §6 learning sequence                                                     | YWAY-P013                                                                           | ARCHITECTURE §3 Youth                                                                                                                 | Possible overstatement  | Vision permits going deeper, another career, comparison when useful, or pausing. Requiring all four paths in every context is not uniquely supported.                                                                                                                                                                                                                               |
| Provenance markers as cumulative facts, lifecycle states, or both                                         | PRODUCT_VISION §5 content provenance                                                                           | YWAY-P019, YWAY-E005                                                                | ARCHITECTURE §3 Content and Practitioner; §6 content provenance                                                                       | Deferred decision       | Authority requires the three provenance distinctions and a practitioner gate, but does not uniquely define their data or lifecycle relationship. S1-03 may clarify semantics; workflow implementation remains deferred.                                                                                                                                                             |
| Differently labeled evidence categories coexisting in one view                                            | PRODUCT_VISION §3.3 signal separation; §7 Evidence Portfolio                                                   | YWAY-P007–YWAY-P009, YWAY-E002                                                      | ARCHITECTURE §3 Evidence; §6 evidence separation                                                                                      | Deferred decision       | Categories must remain semantically distinct, correctly labeled, and provenance-preserving. Authority does not impose a universal ban on a view that presents multiple categories with explicit separation.                                                                                                                                                                         |
| Evidence as an independent logical domain or a concern within Youth                                       | PRODUCT_VISION §3.3 evidence-level separation; §7 Evidence Portfolio                                           | YWAY-P007–YWAY-P009, YWAY-E002                                                      | ARCHITECTURE §3 Youth and Evidence; §11 unresolved questions                                                                          | Architecture ambiguity  | The Evidence invariants are binding; the logical ownership boundary is not settled merely because current Architecture treats Evidence independently. S1-06 requires a technology-neutral ADR.                                                                                                                                                                                      |
| Content / Practitioner / Operations ownership of provenance, review, approval, and production eligibility | PRODUCT_VISION §5 content provenance; §8.1 practitioner experiences; §10 localization release gates            | YWAY-P019, YWAY-P023, YWAY-P029, YWAY-E005                                          | ARCHITECTURE §3 Content, Practitioner, and Operations / Safeguarding; §4 ownership boundaries; §6 content provenance                  | Architecture ambiguity  | Product gates are clear, but responsibility for review decisions, qualification context, operational approval, and production eligibility needs explicit logical ownership.                                                                                                                                                                                                         |
| Employer Quest ownership across Evidence, Employer, and Consent / Sharing                                 | PRODUCT_VISION §7 Employer Quest work; §8.2 Employer Quests; §9 purpose-specific sharing                       | YWAY-P008, YWAY-P015–YWAY-P018, YWAY-P030, YWAY-E003–YWAY-E004                      | ARCHITECTURE §3 Evidence, Employer, and Consent / Sharing; §4 ownership boundaries                                                    | Architecture ambiguity  | Quest definition, evidence meaning, submission consent, and application state must stay distinct. S1-05 must assign logical responsibility without creating package, service, or database boundaries.                                                                                                                                                                               |
| Content provenance handoff into evidence provenance                                                       | PRODUCT_VISION §5 content provenance; §7 evidence provenance                                                   | YWAY-P008–YWAY-P009, YWAY-P019, YWAY-E002, YWAY-E005                                | ARCHITECTURE §3 Content and Evidence; §4 ownership boundaries; §8 provisional hypotheses                                              | Architecture ambiguity  | The handoff must preserve content origin, creation context, evidence level, and later sharing provenance. The collaboration contract and correction authority remain undefined.                                                                                                                                                                                                     |
| Vendor-neutral collaboration boundaries for the near-term Youth–Content–Evidence path                     | PRODUCT_VISION §1 core journey; §3.3 evidence separation; §4 Career Experience Packs; §7 Evidence Portfolio    | YWAY-P001–YWAY-P003, YWAY-P007–YWAY-P009, YWAY-P019                                 | ARCHITECTURE §§3–4; §8 provisional hypotheses                                                                                         | Architecture ambiguity  | S1-05 must define information and responsibility boundaries while leaving APIs, packages, services, schemas, and storage unselected.                                                                                                                                                                                                                                                |
| Privileged / Admin contexts without unrestricted access                                                   | PRODUCT_VISION §9 trust, privacy, and safety                                                                   | YWAY-P014–YWAY-P018, YWAY-E001, YWAY-E003–YWAY-E004                                 | ARCHITECTURE §3 Identity / Access and Operations / Safeguarding; §4 ownership boundaries; §6 authorization; §8 provisional hypotheses | Architecture ambiguity  | Admin is an identity/access context, not a bypass. S1-05 must bound privileged workflows through defined interfaces while preserving private-portfolio, consent, and employer-isolation rules.                                                                                                                                                                                      |
| Classification of existing architecture questions as Stage 1, deferred, or future-ADR work                | Product constraints vary by question; PRODUCT_VISION §§2, 3.3, 5, 7, and 9 bound the affected outcomes         | YWAY-P007–YWAY-P009, YWAY-P012, YWAY-P014–YWAY-P019, YWAY-P022, YWAY-E001–YWAY-E005 | ARCHITECTURE §11 unresolved architecture questions                                                                                    | Deferred decision       | S1-07 must classify each question. Classification does not answer the question or promote a provisional hypothesis into a binding choice.                                                                                                                                                                                                                                           |

## Explicit implementation deferrals

These registered choices are deliberately outside S1-01. Listing each one here makes the coverage explicit; none is adopted by this audit.

| Deferred choice                                              | Product or architecture constraint preserved                                                                                                  | Future trigger                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Physical application boundary and delivery approach          | Android-first youth experience (PRODUCT_VISION §2); logical domain is not a physical app (ARCHITECTURE §§1, 10)                               | Future delivery-architecture ADR with implementation evidence    |
| Package/service layout and monorepo tooling                  | Logical domains do not imply packages or services (ARCHITECTURE §§1, 4, 10)                                                                   | Future physical-architecture ADR                                 |
| Database, ORM, schema library, and local/remote persistence  | Evidence separation, privacy, consent history, and offline preservation remain required (YWAY-P007–YWAY-P009, YWAY-P014–YWAY-P016, YWAY-P022) | Future data-architecture ADR and validation                      |
| Synchronization engine and conflict strategy                 | Offline-supported youth work must not be lost (YWAY-P022; ARCHITECTURE §6)                                                                    | Future sync ADR backed by conflict scenarios                     |
| Authentication provider and concrete authorization mechanism | Private portfolios, employer isolation, and trusted non-UI enforcement remain required (YWAY-P014, YWAY-P018, YWAY-E001, YWAY-E004)           | Future identity/authorization ADR and boundary tests             |
| Consent/audit persistence model                              | Purpose-specific, separately auditable sharing remains required (YWAY-P015–YWAY-P016, YWAY-E003)                                              | Future consent architecture ADR                                  |
| API protocol, hosting, deployment, and storage               | Cross-domain boundaries and privacy outcomes remain binding (ARCHITECTURE §§4–6)                                                              | Future platform ADRs after delivery constraints are known        |
| CMS, Pack authoring format, and workflow engine              | Provenance and practitioner review gates remain binding (YWAY-P019, YWAY-E005)                                                                | Future content-operations ADR                                    |
| Detailed practitioner operations                             | Review quality, payment boundaries, and non-certification remain binding (YWAY-P019, YWAY-P029)                                               | Later operational design with qualified practitioner input       |
| Partial downloads, analytics, payments, and notifications    | Offline value, privacy, no prohibited scoring, and no recruitment fees remain binding (YWAY-P005, YWAY-P021–YWAY-P022, YWAY-P026, YWAY-E006)  | Separate future product/architecture decisions                   |
| 16–17 pathway                                                | Public access remains 18+ until safeguarding and consent receive separate review (YWAY-P012)                                                  | Explicit safeguarding and owner review                           |
| Verified-assessment implementation                           | Exploration, practice, and verified assessment must remain distinct (YWAY-P007–YWAY-P008)                                                     | Separately approved assessment process and architecture decision |

## Findings

No Product Vision changes are required from this audit.

No Product Contract changes are proposed directly by S1-01.

All contract clarification candidates, architecture clarification candidates, and explicitly deferred implementation choices registered in the active Stage 1 ExecPlan are accounted for above. The classifications preserve unresolved decisions rather than settling them in the audit.

Later bounded work should address:

1. S1-02: meaningful experiment, six-part structure scope, anonymous first value, and post-trial paths.
2. S1-03: provenance, practitioner review, and evidence-presentation semantics.
3. S1-05–S1-07: logical ownership, collaboration boundaries, Evidence ADR, and classification of remaining architecture questions.

## Product-integrity assessment

Product contracts affected:

- YWAY-P001–YWAY-P003, YWAY-P005, YWAY-P007–YWAY-P009, YWAY-P011–YWAY-P019, YWAY-P021–YWAY-P023, YWAY-P025–YWAY-P026, YWAY-P029–YWAY-P030
- YWAY-E001–YWAY-E006

Assessment:

- COMPATIBLE

Findings:

- The audit preserves Product Vision as the higher authority and does not rewrite it.
- It identifies possible overstatements without weakening the underlying trial, first-value, post-trial choice, evidence-separation, privacy, consent, or practitioner-review outcomes.
- It records owner and architecture ambiguities as unresolved and keeps implementation choices deferred.

Required action:

- Carry each candidate into its named later Stage 1 step; obtain owner direction or an ADR where the cited authority does not uniquely determine an answer.

## Non-goals preserved

- No application implementation.
- No technology selection.
- No schema/API/package/service decisions.
- No scoring or ranking concepts introduced.
- No employer access changes.

## Validation

Completed:

- Product Vision traceability review.
- Stage 1 candidate coverage review.
- Stage 1 scope boundary review.
- Product-integrity review.
- `pnpm agent:doctor` — READY.
- `pnpm verify:full` — passed lint, typecheck, formatting, and structural product-invariant checks; no test script is configured yet.
