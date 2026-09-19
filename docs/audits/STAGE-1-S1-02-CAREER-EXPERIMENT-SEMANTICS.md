# S1-02 — Career Experiment and Anonymous First-Value Semantics

## Purpose

Clarify the relationship among Career Experience Packs, realistic trials, career experiments,
anonymous first value, primary-outcome terms, and post-trial paths without introducing unsupported
product intent.

This document records S1-02 analysis. It does not modify Product Vision, Product Contracts, or
implementation requirements, and it does not resolve owner decisions that Product Vision leaves
open.

## Authority reviewed

- `docs/product/PRODUCT_VISION.md`
- `docs/audits/STAGE-1-S1-01-VISION-CONTRACT-TRACEABILITY.md`
- Related Product Contract references:
  - YWAY-P001
  - YWAY-P002
  - YWAY-P003
  - YWAY-P011
  - YWAY-P013

Product Vision is the deciding authority for whether an S1-02 question is already determined.
Existing Product Contract wording is evidence under review and must not be used circularly to settle
a possible overstatement identified by S1-01.

## Findings

### 1. Career Experience Pack, realistic trial, and career experiment

Product Vision defines the Career Experience Pack as the core exploration content unit. It separately
defines a career experiment through the six-part structure and describes a short realistic work trial
as part of the youth exploration experience.

The terms should not be treated as interchangeable:

- A Career Experience Pack is a structured exploration content unit.
- A realistic work trial lets a young person safely try aspects of work before choosing a direction.
- A career experiment uses Question → Action → Timebox → What to notice → Reflection → Next fork.

A Pack may support one or more realistic trials or career experiments. Product Vision does not state
that every Pack, every trial component, and every career experiment are the same governed unit.

### 2. Meaningful career experiment and real next action

Product Vision names the primary user outcome as completing a meaningful career experiment and taking
a real next action. It also states that app opens, time spent, registrations, streaks, and content
views are not the main outcome.

Product Vision does not uniquely define:

- the minimum completion boundary that makes a career experiment "meaningful"; or
- the exact set of actions that qualify as a "real next action" for contract or metric purposes.

Any later definition must remain consistent with the Vision constraints that users try realistic work
before choosing, reflection remains part of the experiment structure, direction stays reversible, and
real-world exposure should increase before commitment.

Because the operational thresholds are not uniquely determined by Product Vision, S1-02 defers them
to explicit owner direction. S1-04 must not refine YWAY-P003 around those thresholds until that
direction is recorded in authoritative product documentation.

### 3. Six-part experiment structure scope

S1-01 identified a possible overstatement in applying the six-part experiment structure to every Pack
trial component.

Product Vision says that a career experiment uses the six-part structure. It does not uniquely say
whether the governed completion unit is a whole Pack, a trial within a Pack, or another explicitly
defined experiment unit.

Do not resolve this by assuming:

- every Pack equals exactly one experiment;
- every trial component independently equals an experiment; or
- every nested activity has the same completion meaning.

The governed unit therefore remains an owner decision.

### 4. Anonymous first value

Product Vision requires first career value without mandatory login and states that the youth
experience begins with immediate career discovery and a short realistic work trial without mandatory
login.

This supports the clarification that first value cannot be gated on account creation. Product Vision
does not uniquely define the exact minimum completion threshold for that anonymous experience.

Any later threshold must preserve:

- meaningful career discovery before login;
- realistic exposure before commitment; and
- no mandatory registration gate before first value.

The exact minimum interaction for contract purposes remains an owner decision.

### 5. Post-trial paths

Product Vision states that after a meaningful trial a user may:

- go deeper;
- try another career;
- compare when useful; or
- pause.

It also states that comparison is not a mandatory gate. This supports treating the routes as
non-sequential possibilities rather than a mandatory four-step sequence.

Product Vision does not uniquely determine whether all four routes must always be simultaneously
available or whether a context may expose only a permitted subset. That availability rule remains an
owner decision. This audit does not select contextual routing or universal simultaneous availability.

## Owner decision candidates

Explicit owner direction is required wherever Product Vision does not uniquely determine the answer:

1. What minimum completion boundary makes a career experiment "meaningful," and what qualifies as a
   "real next action" for YWAY-P003?
2. What is the governed unit for the six-part career experiment structure: Pack-level, trial-level,
   or another explicitly defined experiment unit?
3. What minimum interaction constitutes anonymous first value for product-contract purposes?
4. Must all four post-trial routes always be simultaneously available, or may context expose a
   permitted subset?

No dependent Product Contract wording should change until required owner decisions are recorded in
the appropriate authoritative product document.

## Non-goals preserved

- No Product Vision changes.
- No Product Contract edits.
- No UI flow specification.
- No storage or content-authoring schema.
- No implementation technology decisions.

## Validation status

- Every registered S1-02 clarification candidate is now either bounded by Product Vision or explicitly
  deferred to owner direction.
- No possible-overstatement contract wording was used to resolve the disputed semantics.
- No unresolved post-trial availability decision was silently selected.
- Stage 1 scope boundaries remain preserved.
- S1-02 remains open while the owner-decision candidates above are unresolved; dependent S1-04 edits
  must remain blocked on the relevant decisions.
