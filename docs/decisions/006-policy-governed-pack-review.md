# Decision: Policy-governed AI and owner review for Career Experience Packs

## Metadata

- ID: YWAY-D006
- Date: 2026-09-29
- Status: ACCEPTED
- Owners: Yway project owner
- Acceptance: 2026-09-29, by explicit owner instruction to implement the audited AI-and-owner governance model in Product Vision, contracts, Architecture, and accepted decision records; no operational release authority granted
- Related ExecPlan: docs/exec-plans/active/STAGE-3-YOUTH-EXPLORATION.md
- Related Product Contracts: YWAY-P019, YWAY-P023, YWAY-P024, YWAY-E005
- Amends: YWAY-D003 and YWAY-D005, only as identified below

## Context

Product Vision §5 and YWAY-P019/YWAY-E005 previously made qualified-practitioner review a universal
gate for a production-quality or end-user Pack. The project owner has now explicitly selected AI as
the primary domain/content reviewer and the owner as final release authorizer, without making human
practitioner availability a universal Stage 3 dependency. Product Vision §5 and those contracts are
amended with this decision. The owner retains qualified practitioner eligibility, exact-version
attestations, and truthful practitioner-reviewed provenance as higher assurance.

YWAY-D003 and YWAY-D005 contain accepted mechanism and pilot-trust decisions that remain valuable.
Their universal founder-then-practitioner release sequence conflicts with the new product authority.
This decision records the narrow amendment without rewriting their historical rationale or accepting
new code, artifact formats, practitioner identities, builds, sessions, or public release.

## Decision Drivers

- Truthful, cumulative provenance, including the absence of human practitioner review
- Exact-version and localization scope; no stale approval or fixture promotion
- A real AI-and-owner pilot path that does not depend on practitioner availability
- A preserved, enforceable qualified-practitioner path when selected policy requires it
- A clear boundary between content review, owner authorization, and pilot/public release scope
- Preservation of trusted build, retirement, managed devices, Burmese comprehension, and accessibility gates

## Options Considered

### Option: Keep a universal qualified-practitioner gate

- **Advantages:** Every released Pack has the same human assurance requirement.
- **Disadvantages:** Practitioner availability blocks Stage 3 content and the pilot, contrary to the owner's operating decision.
- **Risks:** A missing reviewer stalls development without improving the truthfulness of AI or owner review claims.
- **Validation evidence available:** The existing pipeline implements this path.
- **Unknowns:** The substantive qualification bar remains unresolved.

### Option: Add a per-Pack human-review bypass flag

- **Advantages:** Small apparent change to the current gate.
- **Disadvantages:** A Pack could select its own weaker assurance and the release reason would be unauditable.
- **Risks:** A flag could silently turn a human-assured release into an AI-only release.
- **Validation evidence available:** No evidence justifies this exception mechanism.
- **Unknowns:** How a future risk policy would override it.

### Option: Versioned, owner-governed release policies

- **Advantages:** Keeps policy selection auditable, permits an AI-and-owner path, and preserves the practitioner path as a mandatory condition when selected.
- **Disadvantages:** Requires a later policy-aware lifecycle and artifact-contract migration.
- **Risks:** A forged actor or mistaken owner selection remains possible in the repository-native pilot; owner-held checks remain necessary.
- **Validation evidence available:** D003's version/digest and provenance controls and D005's pinned-build and clearance design can be adapted without deleting them.
- **Unknowns:** Future risk classes, triggers for human assurance, and production authorization mechanisms require later owner decisions.

## Decision

**Capability requirement:** A released Pack must satisfy the versioned, owner-governed policy selected
for its release scope and applicable risk. The policy and the exact version/content/localization scope
of every required review and approval must be recorded and verified. No Pack-authored Boolean may
disable a required human gate. Selection of `ai-owner` cannot override a human-assurance requirement
set by the governing policy. Content classification (`fixture` or `real`), review assurance, and release
authorization scope (`pilot` or a future `public`) remain separate axes.

**Implementation choice accepted for later work:** Preserve the repository-native D003 lifecycle and
D005 pilot trust boundary while extending them with two policy names:

| Policy          | Required review and approval before artifact eligibility                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ai-owner`      | Recorded AI domain/content review, then explicit project-owner approval of the same immutable Pack version                     |
| `human-assured` | The `ai-owner` requirements plus qualified human practitioner review covering the same immutable content before owner approval |

The Stage 3 private pilot may use `ai-owner` after its executable policy path is implemented and
verified. `human-assured` remains available when selected by an owner-governed policy. Policy versions
must identify the applicable scope and risk rule; a stricter applicable requirement takes precedence.
No risk classification or public-release policy is chosen by this decision. Public authorization
remains separately blocked until its own owner decision and YWAY-P023/YWAY-P024 evidence exist.

The target lifecycle is `authored → ai-reviewed → owner-approved → artifact-eligible →
artifact-released`, with `changes-requested` and terminal retirement retained. Qualified
`practitioner-reviewed` is a distinct cumulative assurance fact, required before owner approval under
`human-assured` and optional under `ai-owner`; it is not a substitute for either AI review or owner
approval. Founder-reviewed history remains intact where it exists but is not owner authorization.
Review history and current lifecycle status remain separate. A new source or localization version
requires fresh applicable approvals. Later supplemental practitioner review must not rewrite a sealed
release artifact or retroactively describe its original release as human-assured.

AI review must be explicitly identified as AI review, distinct from `aiAssisted` drafting metadata.
Its future attestation must identify the exact source and localization digests, review criteria,
outcome, AI system/model, and a controlled reference to findings and limitations. It cannot claim to
certify workplace reality. Owner approval is a human decision on the reviewed exact version and
selected policy, distinct from the former founder content checkpoint and from the release operator's
artifact action. Neither approval may be labelled practitioner review. A release without qualified
human review must say so plainly in provenance and youth-facing review status.

The fluent project owner may perform Burmese review. If the owner authored or translated the Burmese
text, the record must say owner fluent/self-review and must not claim independent localization review.
This does not relax fluent review, target-user comprehension validation, or runtime accessibility
requirements. The current D004 Burmese line-breaking restriction remains in force.

### Narrow supersession of accepted decisions

| Earlier authority statement                                                                                                                  | Superseding rule                                                                                                                                                               | What remains binding                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D003's capability requirement and lifecycle make founder review followed by independent qualified-practitioner review universal for release. | The selected policy requires AI review and owner approval; practitioner review is additionally mandatory under `human-assured`.                                                | Immutable versions, fresh gates after source/localization change, exact digest binding, practitioner eligibility and attestations, cumulative provenance, fixture isolation, deterministic artifacts, and retirement.                       |
| D005's real-Pack eligibility and failure criteria require a real practitioner for every pilot Pack.                                          | A real Stage 3 Pack may use `ai-owner` once the policy path is implemented; no practitioner claim may be made without a real qualified review.                                 | Real/fixture separation, opaque references and private records when practitioners participate, owner-approved pin and allowlist, clean checkout, repository verification, byte matching, packaged-asset verification, and pilot-only scope. |
| D005's per-session actor check always requires a practitioner approver and founder reviewer.                                                 | Clearance checks the required AI-review and owner-approval records and release actor for every embedded Pack, and a qualified practitioner actor when `human-assured` applies. | Fresh fail-closed owner clearance, retirement and recency checks, managed-device inventory and withdrawal, actor-handle/identity limits, and no claim of machine-authenticated persons.                                                     |
| The D003/D005 pipeline treats the founder checkpoint as release-sequence authority.                                                          | Founder review is preserved historical content provenance; a separate owner approval is the final release authorization.                                                       | Existing founder records and sealed artifacts retain their original meaning and bytes.                                                                                                                                                      |

All other D003/D005 decisions remain accepted. Their recorded tests and historical observations are
evidence of the old executable path, not evidence that this policy-aware path exists today.

## Consequences

- Practitioner eligibility records, qualification evidence, attestations, and exact-version protection remain supported and cannot be fabricated or silently removed.
- The repository's current lifecycle, schemas, gates, runbooks, and artifacts still require practitioner review. This documentation phase authorizes a later implementation; it does not make `ai-owner` executable or authorize bypassing a failing gate.
- AI review and owner approval concentrate quality judgment and need truthful limitations, source checking, recorded findings, and supervised pilot feedback. They provide no practitioner endorsement or youth capability assessment.
- D005's private reviewer data protections apply whenever a real practitioner is involved; no fake reviewer or synthetic human approval may satisfy either policy.
- The exact format, storage, verifier, and display migration belongs to a later implementation phase and needs its own tests and review. Historical artifacts remain immutable.

## Validation

This phase requires documentation consistency and structural invariant checks and independent review
of the changed governance control surfaces. Those checks cannot establish that a policy-aware release
is executable, that an AI review is substantively correct, or that public-release gates pass.

Phase 1 verification on 2026-09-29: the documentation/status consistency and structural product
invariant scripts both passed when run directly with `node --import tsx`; Prettier check of every
changed Markdown file and `git diff --check` passed. The initial `pnpm exec prettier` attempt failed
because pnpm could not open its cache SQLite database in the isolated worktree; the installed
Prettier binary was run directly. No lifecycle tests, device tests, AI review, Pack approval, build,
or session were performed for this documentation-only change.

Independent product-integrity, architecture, security/privacy, and test reviewer adapters inspected
the Phase 1 diff. Architecture found a conflicting translator/reviewer instruction in the operational
qualification policy; it was corrected to allow truthfully labelled owner fluent/self-review only
after policy-aware implementation, and the architecture reviewer confirmed resolution. No material
finding remained in the four reviews. These reviews assess the documents, not a future release path.

Before any `ai-owner` Pack reaches a participant, later implementation must demonstrate both policy
paths, stale/mismatched review refusal, truthful practitioner absence, fixture isolation, exact-version
binding, historical artifact reproduction, trusted build, retirement, and per-session clearance. The
managed-device inventory and Burmese rendering/accessibility gates remain distribution blockers.

## Reversibility

Policy rules can be tightened prospectively, including requiring `human-assured` for a future scope or
risk class. A policy change must be versioned and cannot rewrite the policy, provenance, or assurance
claim under which an earlier immutable artifact was released. Returning to a universal practitioner
gate would require a new owner product decision and corresponding contract amendment.

## Follow-up

- [ ] Implement versioned policy selection, exact-version AI and owner attestations, policy-aware lifecycle and verification, generated schemas, commands, runbooks, artifact/consumer checks, and focused tests in a separate PR.
- [ ] Update Stage 3 preview language to show AI review, owner approval, and explicit practitioner-review presence or absence.
- [ ] Define future risk triggers and any public-release policy through separate owner authority; do not infer them from Pack data.
- [ ] Resolve the open substantive practitioner qualification bar before any real `human-assured` claim is used.

## Decision History

| Date       | Change                                 | Reason                                                                                                                                                                       |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-29 | ACCEPTED by explicit owner instruction | Authorize the AI-and-owner model while retaining qualified practitioner assurance and all existing pilot trust controls; implementation and release remain separately gated. |
