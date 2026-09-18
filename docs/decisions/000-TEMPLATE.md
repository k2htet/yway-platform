# Decision: <short title>

## Metadata

- ID: YWAY-Dxxx
- Date: YYYY-MM-DD
- Status: PROPOSED | ACCEPTED | REJECTED | DEFERRED | SUPERSEDED
- Owners: <comma-separated names or roles>
- Related ExecPlan: <link to execution plan, if any>
- Related Product Contracts: <YWAY-Pxxx IDs from PRODUCT_CONTRACTS.md, if any>

Allowed status values: PROPOSED, ACCEPTED, REJECTED, DEFERRED, SUPERSEDED.
Do not use CANDIDATE as a decision status. Candidate technologies may be discussed in Context or Options Considered while the decision itself remains PROPOSED or DEFERRED.

## Context

Explain:

- What problem requires a decision
- Why the decision is needed now
- Relevant constraints
- Relevant Product Contract IDs (e.g., YWAY-P001)
- What is explicitly out of scope

## Decision Drivers

List the criteria that matter for this decision. Include only criteria relevant to the specific decision; do not pad with generic items. Examples:

- Product integrity
- Privacy/security
- Offline reliability
- Accessibility/localization
- Maintainability
- Agentic development compatibility
- Operational complexity
- Cost
- Performance

## Options Considered

For each serious option, record:

### Option: <name>

- **Advantages:**
- **Disadvantages:**
- **Risks:**
- **Validation evidence available:**
- **Unknowns:**

Do not create fake precision, numeric scoring, or weighted decision matrices unless a future task explicitly requires one.

## Decision

State exactly what is accepted, rejected, or deferred.

Separate the capability requirement (what the system must do) from the implementation choice (how it does it). Do not present Product Vision requirements as technology decisions.

**Capability requirement:** <what must be achieved, independent of implementation>

**Implementation choice:** <the specific approach selected, or "UNRESOLVED" if deferred>

## Consequences

Record:

- Benefits
- Costs/tradeoffs
- New constraints introduced
- Operational implications
- Migration/reversal implications

## Validation

Record:

- Evidence already collected
- Tests/prototypes required before acceptance
- Success criteria
- Failure criteria

A technology recommendation must not become ACCEPTED until its required validation has actually passed or the owner explicitly accepts the risk.

## Reversibility

State:

- How difficult this decision is to reverse
- What would trigger reconsideration
- Migration implications if reversed

## Follow-up

List concrete follow-up work, if any:

- [ ] <task>

## Decision History

| Date | Change | Reason |
|------|--------|--------|
| YYYY-MM-DD | Initial record created | Decision proposed |

## Template Rules

1. `PRODUCT_VISION.md` is the highest product authority. No decision record may contradict it.
2. `PRODUCT_CONTRACTS.md` translates that authority into stable contracts. A decision record may choose HOW to satisfy those contracts but must not weaken or override them.
3. Build Report recommendations are advisory only. They are not decisions until evaluated and recorded here with ACCEPTED status.
4. Do not create a decision record for trivial implementation details.
5. Create a decision record when a choice:
   - Materially affects architecture
   - Creates a long-lived dependency
   - Affects privacy/security/data boundaries
   - Affects offline behavior
   - Affects release/operations
   - Would be expensive to reverse
6. A SUPERSEDED decision remains in the repository for history and links to the replacing decision.
7. Never silently edit historical rationale after a decision is accepted; append decision-history entries instead.
