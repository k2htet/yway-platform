# S1-02 — Career Experiment and Anonymous First-Value Semantics

## Purpose

Clarify the relationship among Career Experience Packs, realistic trials, career experiments, anonymous first value, and post-trial paths without introducing unsupported product intent.

This document records clarification findings from S1-02. It does not modify Product Vision, Product Contracts, or implementation requirements.

## Authority reviewed

- `docs/product/PRODUCT_VISION.md`
- `docs/audits/STAGE-1-S1-01-VISION-CONTRACT-TRACEABILITY.md`
- Related Product Contract references:
  - YWAY-P001
  - YWAY-P002
  - YWAY-P003
  - YWAY-P011
  - YWAY-P013

## Findings

### 1. Career Experience Pack, trial, and experiment relationship

**Current authority**

Product Vision defines the Career Experience Pack as the core exploration content unit. It also states that the primary user outcome is completing a meaningful career experiment and taking a real next action.

**Clarification**

The terms should not be treated as interchangeable:

| Term | Product meaning |
| --- | --- |
| Career Experience Pack | A structured exploration content unit containing realistic career context, activities, reflection, and possible next experiments. |
| Realistic work trial | A short experience inside the exploration journey that lets a young person try aspects of work before choosing a direction. |
| Career experiment | The user-centered journey of increasing reality before commitment through question, action, timebox, observation, reflection, and next fork. |

A Pack may support a career experiment, but the existence of a Pack does not by itself prove that every contained element is a complete career experiment.

### 2. Six-part experiment structure scope

S1-01 identified that Product Vision supports clarifying whether the six-part structure applies to a Pack, a trial component, or another governed unit.

**Disposition**

Do not resolve this by assuming:

- every Pack equals exactly one experiment;
- every trial component independently equals an experiment; or
- every nested activity has the same completion meaning.

A later owner decision is required if Product Contracts need a more precise governed unit.

### 3. Anonymous first value

**Current authority**

Product Vision requires first career value without mandatory login and describes a short realistic work trial without mandatory login.

**Clarification**

Anonymous first value means a young person can receive meaningful career discovery value before account creation. It does not require completing every possible Pack interaction anonymously.

The minimum anonymous experience boundary should preserve:

- meaningful discovery;
- realistic exposure before commitment;
- no mandatory registration gate before first value.

The exact completion threshold remains a product decision if not determined by existing authority.

### 4. Post-trial paths

**Current authority**

After a meaningful trial, Product Vision allows a user to:

- go deeper;
- try another career;
- compare when useful;
- pause.

**Clarification**

These are available directions, not a mandatory sequence that every user must complete.

The experience should preserve guidance without becoming rigid. Context may determine which next fork is presented.

## Owner decision candidates

The following questions require explicit owner direction only if existing Product Vision and contracts do not uniquely determine the answer:

1. What is the governed completion unit for the six-part career experiment structure?
   - Pack-level
   - trial-level
   - another explicitly defined unit

2. What minimum interaction constitutes anonymous first value for product-contract purposes?

3. Are post-trial paths represented as contextually available options rather than a fixed universal set?

No dependent Product Contract wording should change until required owner decisions are recorded in the appropriate authority.

## Non-goals preserved

- No Product Vision changes.
- No Product Contract edits.
- No UI flow specification.
- No storage/content-authoring schema.
- No implementation technology decisions.

## Validation

- S1-01 traceability findings addressed.
- Product semantics clarified without resolving unsupported decisions.
- Stage 1 scope boundaries preserved.
