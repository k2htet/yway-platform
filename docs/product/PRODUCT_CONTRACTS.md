# Yway Product Contracts

This document encodes the non-negotiable product rules of Yway as checkable contracts. Every contract is derived from `PRODUCT_VISION.md`, which is the sole authoritative source. If any contract here conflicts with the Product Vision, the Product Vision prevails.

Each contract has a stable ID, source reference, requirement statement, rationale, violation conditions, future verification strategy, and classification.

**Classifications:**
- `DIRECT_PRODUCT_CONTRACT` — explicitly stated in PRODUCT_VISION.md as a product rule.
- `DERIVED_ENFORCEMENT_INVARIANT` — an engineering/architectural enforcement mechanism logically necessary to uphold a direct product contract. Not itself quoted from the Product Vision. Implementation mechanisms proposed here are candidates, not mandates.

---

## YWAY-P001: Try before choosing

- **Source:** §3.1 (Try before choosing)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Do not ask uncertain young people to choose a career from descriptions alone. Let them safely experience realistic parts of the work first.
- **Rationale:** Directly supports the product principle that trials precede choices.
- **What would violate it:** Presenting career selection as a prerequisite before any experiential trial. Requiring users to commit to a direction before attempting realistic work.
- **Future verification strategy:** Flow tests confirming at least one realistic work experience is available before any career-choice prompt.

---

## YWAY-P002: Career experiment structure

- **Source:** §3.6 (Increase reality before commitment)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** A career experiment uses the structure: Question → Action → Timebox → What to notice → Reflection → Next fork. Each next step should increase real-world exposure before it increases commitment.
- **Rationale:** Directly specified by the Product Vision as the method for increasing reality before commitment.
- **What would violate it:** Career exploration flows that skip reflection. Experiments without timeboxes. Commitment escalation before real-world exposure increases.
- **Future verification strategy:** Content schema validation confirming all six structural elements exist in every Career Experience Pack trial component.

---

## YWAY-P003: Primary youth outcome

- **Source:** §1 (Product purpose)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** The primary user outcome is completing a meaningful career experiment and taking a real next action. App opens, time spent, registrations, streaks, and content views are not the main outcome.
- **Rationale:** Directly stated in the Product Vision as the definition of success.
- **What would violate it:** Optimizing for engagement metrics over experiment completion. Treating registrations or streaks as primary success indicators. Designing features whose main purpose is increasing app opens rather than facilitating real next actions.
- **Future verification strategy:** Product metric definitions reviewed against this contract. Feature proposals evaluated for whether their primary measured outcome aligns with experiment completion and next action.

---

## YWAY-P004: Career guidance is non-deterministic and reversible

- **Source:** §3.2 (Guidance, not destiny)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** A trial produces clues, not a permanent career verdict. Direction stays provisional and reversible. The system must not produce a universal best career or deterministic career ranking for any user.
- **Rationale:** Directly supports the product principle "Guidance, not destiny."
- **What would violate it:** Any feature that outputs a single "best career" recommendation, permanently assigns a career direction, or prevents a user from revisiting or reversing a prior choice.
- **Future verification strategy:** Property-based tests asserting no function returns a singular deterministic career output. UI tests confirming reversal paths exist after every trial.

---

## YWAY-P005: No career-fit, employability, or hidden candidate scoring

- **Source:** §3.2, §11 (Explicit exclusions), §12 (Product integrity)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** The system must not produce, compute, store, or display a career-fit percentage, employability score, hidden candidate score, or any composite numeric ranking of a user's career suitability.
- **Rationale:** Directly prohibited by the Product Vision.
- **What would violate it:** Any schema field, API response, UI element, or internal computation that produces a numeric or ordinal score representing career fit, employability, or candidate quality. Any derived aggregate that functions as such a score even if named differently.
- **Future verification strategy:** Schema-level tests rejecting fields matching score/rank patterns. API response validation. Structural invariant checks for forbidden identifiers.

---

## YWAY-P006: Signal separation

- **Source:** §3.3 (Keep different signals separate)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Self-reported interest, observed behavior, work preferences, and practical constraints are separate lenses. One signal type must never silently replace another in any decision, display, or data flow.
- **Rationale:** Directly stated in the Product Vision: "One must not silently replace another."
- **What would violate it:** Storing self-reported interest and observed behavior in a single undifferentiated field. Using observed behavior where only self-reported interest was requested. Silently substituting one signal type for another in any output.
- **Future verification strategy:** Type-level tests ensuring signal categories are distinct types. Data model review confirming separate storage. Integration tests verifying no cross-signal substitution in API responses.

---

## YWAY-P007: Exploration ≠ Practice ≠ Verified Assessment

- **Source:** §3.3, §7 (Evidence Portfolio), §12 (Product integrity)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Exploration signals, practice evidence, and verified assessment evidence are three distinct levels. One evidence level must never be presented as another. There is no automatic promotion between levels.
- **Rationale:** Directly stated in the Product Vision: "One evidence level must never be presented as another."
- **What would violate it:** Displaying exploration completions as practice achievements. Auto-promoting practice results to verified status. Any UI or API that blends categories into a single undifferentiated list without explicit labeling.
- **Future verification strategy:** Presentation-layer tests verifying each category remains explicitly identified wherever categories are shown together or separately. Query/API tests verifying mixed-category results preserve category identity and never collapse evidence levels into an undifferentiated output.

---

## YWAY-P008: Evidence category separation

- **Source:** §7 (Evidence Portfolio)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** The Evidence Portfolio maintains five semantically distinct categories: exploration signals, practice evidence, verified assessment evidence, user-added work, and employer quest work. Completion records state exactly what was completed. They must not be presented as professional certification, hiring evidence, or verified capability unless appropriate support exists. Provenance must remain intact through any sharing or export. Different categories may coexist in one Portfolio view when grouping, labels, meaning, and provenance remain explicit; the product must also support viewing a single category on its own. Semantic separation, correct labeling, and provenance preservation are required regardless of physical storage or presentation approach.
- **Rationale:** Users need to understand what their evidence represents. External parties must not misinterpret exploration as certification.
- **What would violate it:** Presenting one category as another. Combining categories into an undifferentiated Portfolio output. Inflating completion records beyond what was actually done. Stripping provenance metadata during export. Misrepresenting the meaning of an evidence category in any display or export context.
- **Note:** Multiple evidence categories may be stored together or presented together. Neither shared physical storage nor a unified Portfolio view is itself a violation when category identity, meaning, provenance, and boundaries remain explicit. Exact UI controls and layout are deferred.
- **Future verification strategy:** Data model tests enforcing category discriminators. Export pipeline tests verifying provenance preservation. UI tests confirming categories remain visibly distinct in combined views and that category-specific viewing is available.

---

## YWAY-P009: Evidence provenance preservation

- **Source:** §7 (Evidence Portfolio)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** When evidence is organized, hidden, exported, or selectively shared, its provenance metadata must remain intact. Evidence provenance includes origin, creation context, and evidence level. Evidence provenance is distinct from Career Experience Pack content provenance under YWAY-P019; when evidence arises from Pack interaction, later architecture must preserve enough traceability to interpret both without conflating them.
- **Rationale:** Directly stated: "Provenance must remain intact." Product Vision separately defines content provenance and Evidence Portfolio provenance.
- **What would violate it:** Any export or sharing operation that strips origin metadata. Any transformation that discards evidence-level labeling. Treating practitioner review of Pack content as if it strengthened the resulting youth evidence level.
- **Future verification strategy:** Round-trip export/import tests verifying evidence provenance survives all operations. Traceability tests for Pack-derived evidence confirming content-review provenance does not alter evidence-level meaning.

---

## YWAY-P010: Youth value independence from employers

- **Source:** §1 (Product purpose), §3.4 (Youth value before employer value), §12 (Product integrity)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** The core journey must remain meaningful and complete without employers, jobs, Employer Quests, or recruitment opportunities. Employer participation must not distort the career-exploration journey. Employers and opportunities come after useful youth value exists.
- **Rationale:** Directly stated: "The journey must remain meaningful without employers, jobs, Employer Quests, or recruitment opportunities."
- **What would violate it:** Gating core exploration features behind employer availability. Making the journey incomplete or meaningless when no employers exist. Allowing employer presence to alter the exploration experience.
- **Future verification strategy:** End-to-end tests running the full youth journey with zero employer data configured. Feature audit confirming no employer dependency in exploration flows.

---

## YWAY-P011: First career value without mandatory login

- **Source:** §2 (Audience, language, and access), §4 (Core exploration experience), §11 (Explicit exclusions)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** At least one complete Career Experience Pack interaction must be accessible without account creation or authentication. The user must receive real career discovery value before being asked to register.
- **Rationale:** Directly stated: "First career value must be available without mandatory login."
- **What would violate it:** Requiring authentication to view any Career Experience Pack. Placing registration walls before the first meaningful trial interaction.
- **Future verification strategy:** Automated flow test completing a Career Experience Pack without any auth token or session. Architecture review confirming anonymous access path exists.

---

## YWAY-P012: Age and safeguarding boundary

- **Source:** §2 (Audience, language, and access)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Public access is 18+. Any 16–17 pathway requires separately reviewed safeguarding and consent before it can ship.
- **Rationale:** Directly stated in the Product Vision. The 16–17 pathway is explicitly unresolved until safeguarding is defined.
- **What would violate it:** Allowing unreviewed access by 16–17 year olds. Shipping a minor pathway without separately reviewed safeguarding and consent boundaries.
- **Future verification strategy:** Access control tests verifying age gating. Release gate checklist confirming no 16–17 pathway ships without documented safeguarding review.
- **Note:** The specific safeguarding model for 16–17 year olds is UNRESOLVED. This contract prohibits shipping that pathway until it is defined and reviewed.

---

## YWAY-P013: Guided, not rigid

- **Source:** §3.5 (Guided, not rigid)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** After a meaningful trial, a user may go deeper, try another career, compare when useful, or pause. Comparison is not a mandatory gate.
- **Rationale:** Directly stated in the Product Vision.
- **What would violate it:** Forcing comparison before allowing progression. Blocking a user from trying another career. Requiring completion of a comparison step as a prerequisite for any subsequent action.
- **Future verification strategy:** Flow tests confirming all four post-trial options (deeper, another, compare, pause) are available without mandatory gates. Navigation tests verifying comparison is optional.

---

## YWAY-P014: Private portfolio, no public URL

- **Source:** §7 (Evidence Portfolio), §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Youth profiles and Evidence Portfolios are private. They have no public URL.
- **Rationale:** Directly stated: "Youth profiles and Evidence Portfolios are private and have no public URL."
- **What would violate it:** Generating shareable public links to portfolios. Any route that serves portfolio data to unauthenticated or unauthorized parties. Leaking portfolio URLs in search indexes or metadata.
- **Future verification strategy:** Route-level tests confirming no public portfolio endpoints exist. Penetration testing for unauthorized access paths.

---

## YWAY-P015: Purpose-specific sharing consent

- **Source:** §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Sharing is purpose-specific and user-controlled. Users must be able to inspect what is being shared, with whom, and for what purpose before submission.
- **Rationale:** Directly stated: "Users should be able to inspect what is being shared, with whom, and for what purpose before submission."
- **What would violate it:** Pre-checked sharing consent boxes. Sharing data for a purpose not explicitly selected by the user. Bundling multiple sharing purposes into a single consent action. Preventing users from inspecting shared data before submission.
- **Future verification strategy:** Consent flow tests verifying explicit opt-in per purpose. UI tests confirming inspection step before submission.

---

## YWAY-P016: Separate consent purposes for Quest submission and employment application

- **Source:** §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Submitting work for an Employer Quest and applying for employment are separate consent purposes. Consenting to one does not imply consenting to the other.
- **Rationale:** Directly stated: "Employer Quest submission and employment application are separate consent purposes."
- **What would violate it:** A single consent checkbox covering both Quest submission and job application. Auto-submitting a Quest entry as a job application. Treating Quest completion as implicit application consent.
- **Future verification strategy:** Consent flow tests verifying two distinct consent actions for Quest vs application. Data flow tests confirming Quest submissions do not enter application pipelines without separate consent.

---

## YWAY-P017: Employer Quest ≠ Employment Application

- **Source:** §8.2 (Employer Quests), §12 (Product integrity)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** An Employer Quest is a real-world business challenge, not a job post or hiring competition. Completing a Quest does not automatically create candidate status, prove capability, or guarantee hiring. Recruitment begins only upon explicit voluntary application.
- **Rationale:** Directly stated: "Completing a Quest does not automatically create candidate status, prove capability, or guarantee hiring."
- **What would violate it:** Auto-creating candidate records from Quest completions. Presenting Quest results as hiring evidence. Making Quest completion a prerequisite for job applications.
- **Future verification strategy:** Flow tests confirming Quest completion does not trigger candidate-status transitions. Tests verifying application is always a separate explicit action.

---

## YWAY-P018: Employer isolation from private youth data

- **Source:** §8.3 (Opportunities and hiring), §9 (Trust, privacy, and safety), §11 (Explicit exclusions)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Employers must not gain access to private exploration data, reflections, ordinary practice signals, or the wider private portfolio without explicit user action. Exploring a career, browsing opportunities, or completing an Employer Quest does not make a user a candidate. Private exploration, reflections, ordinary practice signals, and unshared evidence must not automatically reach employers.
- **Rationale:** Directly stated: "Employers must not gain access to private exploration, reflections, ordinary practice signals, or the wider private portfolio without explicit user action."
- **What would violate it:** Any employer-authenticated request returning youth exploration, reflection, or unshared practice data. Implicit data sharing triggered by browsing or Quest completion.
- **Future verification strategy:** Authorization boundary tests attempting cross-domain access with valid employer credentials (must fail). API contract tests verifying employer endpoints return only explicitly submitted data.

---

## YWAY-P019: Content provenance and practitioner review gate

- **Source:** §5 (Content provenance)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Every Career Experience Pack carries provenance metadata distinguishing AI-assisted work, founder-reviewed work, and practitioner-reviewed work. These are cumulative historical provenance facts and must remain preserved rather than being replaced by a single mutually exclusive lifecycle label. A separate current review or release status may exist, but it must not erase provenance history. AI is not a verified practitioner and does not certify workplace reality. A qualified practitioner remains the final content-quality gate for production-quality packs. Practitioner approval applies only to the content covered by that review; changed content outside that review scope cannot inherit an earlier version's practitioner-reviewed or production-quality status.
- **Rationale:** Product Vision requires the provenance distinctions and states: "A qualified practitioner remains the final content-quality gate for a production-quality Career Experience Pack." The cumulative-history interpretation and separate-current-status rule are explicit owner direction recorded by S1-03.
- **What would violate it:** Shipping a Career Experience Pack to end users without practitioner review. Labeling AI-drafted content as practitioner-reviewed. Replacing provenance history with only the latest review label. Treating changed, unreviewed content as still practitioner-reviewed because an earlier version was approved. Missing or falsified provenance metadata on any pack.
- **Future verification strategy:** Content pipeline tests verifying no pack reaches production status without practitioner approval covering the published content. Provenance-history tests confirming AI/founder/practitioner facts remain intact across review and release transitions. Revision tests confirming unreviewed changed content cannot inherit prior practitioner approval.

---

## YWAY-P020: Sponsorship boundaries

- **Source:** §4 (Core exploration experience), §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Sponsorship must be disclosed. Sponsorship must not buy editorial control, private youth data, ranking, or favorable treatment.
- **Rationale:** Directly stated in the Product Vision.
- **What would violate it:** Sponsored content without disclosure. Sponsors influencing pack content or ordering. Sponsors accessing private youth data. Pay-to-rank placement of any kind.
- **Future verification strategy:** Content rendering tests verifying sponsorship disclosure appears. Access control tests confirming sponsors cannot query youth data.

---

## YWAY-P021: Recruitment fee prohibition

- **Source:** §8.3 (Opportunities and hiring)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Youth must never pay recruitment or placement fees.
- **Rationale:** Directly stated: "Youth must never pay recruitment or placement fees."
- **What would violate it:** Any payment flow charging youth for applying to opportunities, accessing employer connections, or receiving placement services.
- **Future verification strategy:** Payment flow audit confirming no youth-facing charges related to recruitment.

---

## YWAY-P022: Offline preservation of youth work

- **Source:** §6 (Learning, practice, and evidence)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Owned exploration and practice should remain useful offline. Later synchronization must be designed so local youth work is not destroyed. Youth work created within offline-supported exploration and practice flows must not be lost during synchronization.
- **Rationale:** Directly stated: "later synchronization must be designed so local youth work is not destroyed."
- **What would violate it:** Exploration or practice features that become completely unusable offline. Sync operations that overwrite or discard locally created work. Whether a specific conflict resolution strategy (including last-write-wins variants) satisfies this depends on the data model and conflict types; each must be validated per case.
- **Future verification strategy:** Offline simulation tests creating work without connectivity, then syncing. Conflict scenario tests with simultaneous edits.
- **Note:** This contract covers exploration and practice flows as specified in the Product Vision. Future architecture may expand offline capability to additional portfolio operations, but Stage 0 must not assume that expansion.

---

## YWAY-P023: Localization release gates

- **Source:** §2 (Audience, language, and access), §10 (Experience and accessibility)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Simple English is the canonical working language during product shaping, design, and implementation. Before public release, all user-facing launch content is localized into natural Burmese, with familiar English retained where it improves comprehension. Fluent Burmese review and target-user comprehension validation are mandatory release gates.
- **Rationale:** Directly stated: "Fluent Burmese review and target-user comprehension validation are mandatory release gates."
- **What would violate it:** Launching without fluent Burmese review. Ignoring comprehension testing with target users.
- **Future verification strategy:** Release checklist gating deployment on Burmese review sign-off. Comprehension test records.

---

## YWAY-P024: Accessibility requirements

- **Source:** §10 (Experience and accessibility)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Yway requires light theme, dark theme, Android text scaling to 200%, strong contrast, large touch targets, screen-reader support, reduced motion option, correct Burmese wrapping, correct reading order, clear offline states, and clear synchronization states. Motion should be brief and explanatory. Youth layouts are Android-first at compact and large-phone sizes.
- **Rationale:** Directly listed as requirements in §10.
- **What would violate it:** Missing theme support. Layout breakage at 200% text scale. Touch targets below minimum size. Screen reader incompatibility. Incorrect Burmese line wrapping. Missing offline/sync state indicators. Unreduced motion animations.
- **Future verification strategy:** Automated accessibility scans. Manual testing on target Android devices at 200% scale. Screen reader walkthrough tests. Burmese typography rendering tests. Theme toggle tests.

---

## YWAY-P025: Explicit product exclusions

- **Source:** §11 (Explicit exclusions)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Yway does not include: open creator marketplace, open coaching marketplace, public social feed, followers, popularity metrics, unrestricted messaging, open-ended AI career chatbot, dynamic personality scoring, opaque ranking, universal career-fit scores, employability scores, hidden candidate scores, employer access to private exploration, employer access to ordinary practice signals, automatic applications, automatic candidate rejection, pay-to-rank placement, Employer Quest competition leaderboards, automatic candidate creation, generic course catalog, undifferentiated job-board aggregation, unsupported certificates, unsupported assessment claims, behavioral advertising, sale of user data, or mandatory account creation before first value.
- **Rationale:** Directly enumerated in §11.
- **What would violate it:** Implementing any listed exclusion. Adding features that functionally replicate an exclusion under a different name.
- **Future verification strategy:** Periodic feature audit against exclusion list. Architecture review confirming no data models or API routes supporting excluded features.

---

## YWAY-P026: No behavioral advertising or data sale

- **Source:** §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** There is no behavioral advertising. User data is not sold.
- **Rationale:** Directly stated in §9.
- **What would violate it:** Integrating ad networks that track user behavior. Selling or licensing user data to third parties. Any revenue model dependent on youth data exploitation.
- **Future verification strategy:** Dependency audit for ad SDKs. Data flow mapping confirming no outbound data sales.

---

## YWAY-P027: Communication is contextual and scoped

- **Source:** §9 (Trust, privacy, and safety)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Communication should be contextual and scoped rather than unrestricted private messaging.
- **Rationale:** Directly stated: "Communication should be contextual and scoped rather than unrestricted private messaging."
- **What would violate it:** Open-ended private messaging between arbitrary users. Communication channels not tied to a specific context.
- **Future verification strategy:** Messaging feature audit confirming all communication is scoped to a defined context.

---

## YWAY-P028: Progress representation

- **Source:** §10 (Experience and accessibility)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Progress should use journey steps, completion moments, and meaningful work artifacts. It should not use points, competitive streaks, or leaderboards.
- **Rationale:** Directly stated in §10.
- **What would violate it:** Point systems, streak counters, leaderboards, or any competitive ranking mechanic.
- **Future verification strategy:** UI audit confirming absence of gamification metrics.

---

## YWAY-P029: Practitioner payment must not buy outcomes

- **Source:** §8.1 (Practitioner Experiences)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Payment must not buy favorable evaluation, better direction, ranking, or hiring priority. Participation in a practitioner experience does not automatically certify capability.
- **Rationale:** Directly stated: "Payment must not buy favorable evaluation, better direction, ranking, or hiring priority."
- **What would violate it:** Paid tiers that influence evaluation results. Payment-gated ranking boosts. Practitioner sessions that auto-certify skills.
- **Future verification strategy:** Business logic tests confirming payment events do not modify evaluation or ranking data.

---

## YWAY-P030: Actions that do not create candidate status

- **Source:** §8.3 (Opportunities and hiring)
- **Classification:** DIRECT_PRODUCT_CONTRACT
- **Requirement:** Exploring a career, browsing opportunities, and completing an Employer Quest do not make a user a candidate. Recruitment begins only when a user explicitly and voluntarily applies for a real opportunity.
- **Rationale:** Directly stated: "The following actions do not make a user a candidate: exploring a career, browsing opportunities, completing an Employer Quest."
- **What would violate it:** Auto-creating candidate records from any of these actions. Treating browsing history as application intent.
- **Future verification strategy:** State transition tests confirming none of these actions trigger candidate-status changes.

---

## Derived Enforcement Invariants

These are engineering and architectural enforcement mechanisms derived from the direct product contracts above. They describe implementation constraints necessary to uphold the product contracts. They are NOT themselves quoted from the Product Vision. Proposed implementation mechanisms are candidates subject to future validation.

---

## YWAY-E001: Server-side authorization enforcement

- **Derived from:** YWAY-P018 (Employer isolation), YWAY-P014 (Private portfolio)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** Authorization must be enforced at the server/API/data-access layer, not solely through UI hiding. Employer-context operations must have no authorized data path to private youth data outside explicit user-approved sharing scope.
- **Rationale:** The Product Vision states employer isolation as a product outcome (YWAY-P018). Server-side enforcement is the derived architectural requirement to achieve that outcome. Client-side-only restrictions are bypassable.
- **What would violate it:** Relying exclusively on frontend conditional rendering to hide employer access. API endpoints that return youth data to any authenticated role without scope checking.
- **Future verification strategy:** Authorization integration tests with employer tokens attempting youth data access. API contract tests. Penetration testing.
- **Candidate mechanisms:** Role-based + attribute-based access control at the API layer. Package-level import isolation preventing employer code from referencing youth domain types. Specific library choices are deferred.

---

## YWAY-E002: No silent evidence reclassification

- **Derived from:** YWAY-P007 (Exploration ≠ Practice ≠ Verified Assessment), YWAY-P008 (Evidence category separation)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** Evidence must never be silently or automatically reclassified into a stronger evidence level. If future architecture permits correction or reclassification, it must be an explicit action and must preserve provenance.
- **Rationale:** The Product Vision requires that one evidence level must never be presented as another (YWAY-P007). Preventing silent reclassification is the derived enforcement outcome. Universal immutability of category assignment is not required by the Product Vision; explicit, provenance-preserving correction may be architecturally valid if designed later.
- **What would violate it:** Background jobs that auto-promote evidence levels based on thresholds. Silent category mutation during sync or migration. Any reclassification that drops or alters original provenance metadata.
- **Future verification strategy:** Data model tests rejecting silent category mutation. Audit trail tests confirming any reclassification is explicit and provenance-preserving.
- **Candidate mechanisms:** Immutable category discriminator at the schema level. Event-sourced append-only evidence records. Explicit reclassification operations with audit logging. Specific database technology is deferred.

---

## YWAY-E003: Consent audit trail

- **Derived from:** YWAY-P015 (Purpose-specific sharing), YWAY-P016 (Separate consent purposes)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** Every purpose-specific sharing action must produce a retrievable record of what was shared, with whom, for what purpose, and when. Consent records must distinguish between Quest submission consent and employment application consent.
- **Rationale:** The Product Vision requires purpose-specific, user-controlled sharing with inspection before submission (YWAY-P015). An auditable record is the derived enforcement mechanism to verify compliance.
- **What would violate it:** Sharing data without recording the consent event. Consent records missing purpose specificity. No mechanism to query consent history.
- **Future verification strategy:** Audit log completeness tests. Consent query tests verifying historical traceability.
- **Candidate mechanisms:** Append-only consent event log. Specific storage technology is deferred.

---

## YWAY-E004: Employer-youth data path isolation

- **Derived from:** YWAY-P018 (Employer isolation), YWAY-P006 (Signal separation), YWAY-P007 (Evidence levels)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** Employer-context operations must have no authorized data path to private youth exploration, reflection, or practice data outside explicit user-approved sharing scope. This is an access-path invariant, not a specific module-layout requirement.
- **Rationale:** The Product Vision prohibits employer access to private youth data (YWAY-P018). Ensuring no authorized data path exists is the derived enforcement outcome. The specific mechanism (package isolation, API scoping, etc.) is an implementation choice.
- **What would violate it:** Employer API handlers querying youth evidence stores. Shared database queries without domain scoping that allow employer context to read youth-private rows. Any code path from employer-authenticated entry to youth-private data retrieval.
- **Future verification strategy:** Authorization boundary tests. Data flow analysis from employer entry points. Import graph analysis if package-level isolation is adopted.
- **Candidate mechanisms:** Package-level import isolation. Monorepo workspace dependency rules. API route scoping. Specific tooling is deferred.

---

## YWAY-E005: Practitioner review gate enforcement

- **Derived from:** YWAY-P019 (Content provenance and practitioner review gate)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** A Career Experience Pack must not be publishable to end users without passing through a practitioner review gate that covers the content being published. Provenance history must be attached and preserved through publishing transitions. Content changes outside the scope of prior practitioner review must lose eligibility to rely on that prior approval until the changed content is covered by qualified-practitioner review. The exact version model, review granularity, materiality trigger, and workflow are deferred.
- **Rationale:** The Product Vision requires a qualified practitioner as the final content-quality gate (YWAY-P019). Enforcing that gate against the content actually published is the derived requirement; an older approval cannot truthfully cover later unreviewed changes. The specific workflow mechanism remains an implementation choice.
- **What would violate it:** Publishing workflow that skips practitioner review. Publishing changed content under stale approval from an earlier reviewed version. Transitions that drop provenance history. No enforceable distinction between content eligible for production and content still awaiting required review.
- **Future verification strategy:** Pipeline tests verifying all publishing paths require practitioner approval covering the published content. Revision tests confirming changed, unreviewed content cannot inherit prior approval. Provenance-history preservation tests across publishing transitions.
- **Candidate mechanisms:** Explicit state machine in domain logic. Workflow engine. CMS with approval gates. Version-linked review records. Specific approach is deferred.

---

## YWAY-E006: No composite score derivation

- **Derived from:** YWAY-P005 (No scoring), YWAY-P006 (Signal separation)
- **Classification:** DERIVED_ENFORCEMENT_INVARIANT
- **Requirement:** No computation, aggregation, or derivation may combine multiple signal types or evidence categories into a single numeric or ordinal output representing career fit, employability, or candidate quality. This applies regardless of whether the output is displayed to users or used internally.
- **Rationale:** The Product Vision prohibits all forms of scoring (YWAY-P005) and requires signal separation (YWAY-P006). Preventing composite derivation is the derived enforcement outcome.
- **What would violate it:** Weighted combination of signals into a single number. Internal analytics computing aggregate career-fit metrics. ML models trained to produce a single suitability score.
- **Future verification strategy:** Code scan for aggregation patterns over signal types. Data flow analysis confirming no composite score fields exist. Algorithm audit.
- **Candidate mechanisms:** Type-level restrictions preventing cross-signal arithmetic. Specific enforcement tooling is deferred.
