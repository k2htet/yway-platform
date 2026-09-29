import { contentDigest } from "./digest.js";
import {
  requireReleasePolicy,
  requiresPractitioner,
  sameReleasePolicy,
  type ReleasePolicySelection,
} from "./release-policy.js";
import {
  evidenceReferenceClassificationIssue,
  packIdClassificationIssue,
  requireClassificationIsolation,
} from "./classification.js";
import {
  assertVersionScoped,
  deriveVersionLifecycleStatus,
  selectVersionScopedEvents,
  type VersionScope,
} from "./lifecycle.js";
import {
  assertPolicyPractitionerEligibility,
  verifyRecordedPractitionerApproval,
} from "./practitioner-gate.js";
import { appendProvenanceEvent, verifyProvenanceLog } from "./provenance.js";
import { reviewEventTypes } from "./governance.js";
import { assertFixtureOnlyProvenance } from "./store.js";
import {
  StrictValidationError,
  collectExperimentParityIssues,
  contentAccessibilitySchema,
  dateTimeSchema,
  localizedContentSchema,
  packSourceSchema,
  practitionerEligibilitySchema,
  releaseGateResultSchema,
  reviewAttestationSchema,
  strictParse,
  type LocalizedContent,
  type PackSource,
  type ReleaseGateResult,
  type PractitionerEligibility,
  type ProvenanceEvent,
  type ProvenanceEventLog,
  type ReviewAttestation,
  type StrictValidationIssue,
} from "./schemas/index.js";

export interface ReleaseGateInput {
  readonly pack: PackSource;
  readonly localizedContent?: LocalizedContent;
  readonly provenanceLog: ProvenanceEventLog;
  readonly attestations: readonly ReviewAttestation[];
  readonly practitionerEligibility?: PractitionerEligibility;
  readonly releasePolicy?: ReleasePolicySelection;
  readonly evaluateAt: string;
  readonly expectedHeadEventDigest?: string;
}

function addIssue(
  issues: StrictValidationIssue[],
  path: readonly (string | number)[],
  message: string,
): void {
  issues.push({ path, message });
}

function latestEvent(
  events: readonly ProvenanceEvent[],
  type: ProvenanceEvent["type"],
  beforeSequence = Number.POSITIVE_INFINITY,
): ProvenanceEvent | undefined {
  return events.filter((event) => event.type === type && event.sequence < beforeSequence).at(-1);
}

function latestEventInCycle(
  events: readonly ProvenanceEvent[],
  type: ProvenanceEvent["type"],
  boundarySequence: number,
): ProvenanceEvent | undefined {
  return events.filter((event) => event.type === type && event.sequence > boundarySequence).at(-1);
}

function firstEventInCycle(
  events: readonly ProvenanceEvent[],
  type: ProvenanceEvent["type"],
  boundarySequence: number,
): ProvenanceEvent | undefined {
  return events.find((event) => event.type === type && event.sequence > boundarySequence);
}

function reviewCycleBoundary(events: readonly ProvenanceEvent[]): number {
  return latestEvent(events, "changes-requested")?.sequence ?? 0;
}

function addScopeIssues(
  issues: StrictValidationIssue[],
  record: {
    readonly packId: string;
    readonly packVersion: number;
    readonly contentDigest: string;
  },
  scope: VersionScope,
  label: string,
): void {
  try {
    assertVersionScoped(record, scope, label);
  } catch (error) {
    if (error instanceof StrictValidationError) {
      issues.push(...error.issues);
      return;
    }
    throw error;
  }
}

function boundApprovedAttestation(
  kind: ReviewAttestation["kind"],
  event: ProvenanceEvent,
  attestations: readonly ReviewAttestation[],
  scope: VersionScope,
  localizedContentDigest: string | undefined,
): ReviewAttestation | undefined {
  return attestations.find((attestation) => {
    if (attestation.kind !== kind || attestation.outcome !== "approved") {
      return false;
    }
    if (attestation.actorId !== event.actorId || attestation.recordedAt !== event.recordedAt) {
      return false;
    }
    if (attestation.reviewEventSequence !== event.sequence) {
      return false;
    }
    try {
      assertVersionScoped(attestation, scope, `${kind} attestation`);
    } catch {
      return false;
    }
    if (
      event.localizedContentDigest !== undefined &&
      attestation.localizedContentDigest !== event.localizedContentDigest
    ) {
      return false;
    }
    if (kind === "localization-review") {
      return (
        attestation.locale === "my" && attestation.localizedContentDigest === localizedContentDigest
      );
    }
    return true;
  });
}

function addEventOrderIssue(
  issues: StrictValidationIssue[],
  event: ProvenanceEvent | undefined,
  eligibilityEvent: ProvenanceEvent | undefined,
  label: string,
): void {
  if (
    event !== undefined &&
    eligibilityEvent !== undefined &&
    event.sequence >= eligibilityEvent.sequence
  ) {
    addIssue(
      issues,
      ["provenanceLog", label],
      `${label} event at sequence ${event.sequence} must precede artifact-eligible event at sequence ${eligibilityEvent.sequence}`,
    );
  }
}

function attestationMatchesEvent(
  attestation: ReviewAttestation,
  event: ProvenanceEvent,
  scope: VersionScope,
): boolean {
  if (
    attestation.actorId !== event.actorId ||
    attestation.recordedAt !== event.recordedAt ||
    attestation.reviewEventSequence !== event.sequence ||
    attestation.localizedContentDigest !== event.localizedContentDigest ||
    (event.type === "owner-approved" &&
      !sameReleasePolicy(attestation.ownerApproval?.releasePolicy, event.releasePolicy))
  ) {
    return false;
  }
  try {
    assertVersionScoped(attestation, scope, "release-gate attestation");
  } catch {
    return false;
  }
  switch (event.type) {
    case "founder-reviewed":
      return attestation.kind === "founder-review" && attestation.outcome === "approved";
    case "ai-reviewed":
      return attestation.kind === "ai-review" && attestation.outcome === "approved";
    case "owner-approved":
      return attestation.kind === "owner-approval" && attestation.outcome === "approved";
    case "practitioner-reviewed":
      return attestation.kind === "practitioner-review" && attestation.outcome === "approved";
    case "localization-reviewed":
      return (
        attestation.kind === "localization-review" &&
        attestation.outcome === "approved" &&
        attestation.locale === "my"
      );
    case "accessibility-reviewed":
      return attestation.kind === "accessibility-review" && attestation.outcome === "approved";
    case "sponsorship-disclosed":
      return attestation.kind === "sponsorship-disclosure" && attestation.outcome === "approved";
    case "changes-requested":
      return attestation.outcome === "changes-requested";
    default:
      return false;
  }
}

function assertReviewAttestationBindings(
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  scope: VersionScope,
  issues: StrictValidationIssue[],
): void {
  const reviewEvents = events.filter((event) => reviewEventTypes.has(event.type));
  const remaining = [...attestations];
  for (const event of reviewEvents) {
    const index = remaining.findIndex((attestation) =>
      attestationMatchesEvent(attestation, event, scope),
    );
    if (index === -1) {
      addIssue(
        issues,
        ["attestations", event.type],
        `no review attestation binds ${event.type} event at sequence ${event.sequence}`,
      );
      continue;
    }
    remaining.splice(index, 1);
  }
  for (const attestation of remaining) {
    addIssue(
      issues,
      ["attestations"],
      `attestation ${attestation.kind} ${attestation.outcome} by ${attestation.actorId} does not bind one review event in the exact version scope`,
    );
  }
}

function assertLocalizationGate(
  pack: PackSource,
  localizedContent: LocalizedContent | undefined,
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  scope: VersionScope,
  issues: StrictValidationIssue[],
): string | undefined {
  if (localizedContent === undefined) {
    addIssue(
      issues,
      ["localizedContent"],
      `Burmese localization is required for ${pack.id} version ${pack.version} before artifact eligibility`,
    );
    return undefined;
  }
  if (localizedContent.packId !== pack.id) {
    addIssue(
      issues,
      ["localizedContent", "packId"],
      `localized content packId "${localizedContent.packId}" does not match "${pack.id}"`,
    );
  }
  if (localizedContent.packVersion !== pack.version) {
    addIssue(
      issues,
      ["localizedContent", "packVersion"],
      `localized content packVersion ${localizedContent.packVersion} does not match ${pack.version}`,
    );
  }
  if (localizedContent.locale !== "my") {
    addIssue(
      issues,
      ["localizedContent", "locale"],
      `localized content must use locale "my" for the Stage 2 release gate`,
    );
  }
  if (localizedContent.fixtureOnly !== pack.fixtureOnly) {
    addIssue(
      issues,
      ["localizedContent", "fixtureOnly"],
      `localized content fixtureOnly ${localizedContent.fixtureOnly} does not match source fixtureOnly ${pack.fixtureOnly}`,
    );
  }

  const localizedDigest = contentDigest(localizedContent);
  const cycleBoundary = reviewCycleBoundary(events);
  const localizedEvent = latestEvent(events, "localized");
  if (localizedEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "localized"],
      `localized provenance event is required for ${pack.id} version ${pack.version}`,
    );
  } else if (localizedEvent.localizedContentDigest !== localizedDigest) {
    addIssue(
      issues,
      ["provenanceLog", "localized", "localizedContentDigest"],
      `localized provenance digest does not match the exact Burmese content digest ${localizedDigest}`,
    );
  }

  const eligibilityEvent = firstEventInCycle(events, "artifact-eligible", cycleBoundary);
  if (
    cycleBoundary > 0 &&
    localizedEvent !== undefined &&
    localizedEvent.sequence > cycleBoundary
  ) {
    addIssue(
      issues,
      ["provenanceLog", "localized"],
      "localized content cannot be introduced after a changes-requested review cycle",
    );
  }
  if (
    localizedEvent !== undefined &&
    eligibilityEvent !== undefined &&
    localizedEvent.sequence >= eligibilityEvent.sequence
  ) {
    addIssue(
      issues,
      ["provenanceLog", "localized"],
      `localized provenance event at sequence ${localizedEvent.sequence} must precede artifact-eligible event at sequence ${eligibilityEvent.sequence}`,
    );
  }
  const localizationEvent = latestEventInCycle(events, "localization-reviewed", cycleBoundary);
  if (localizationEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "localization-reviewed"],
      `fluent Burmese localization review is required for ${pack.id} version ${pack.version}`,
    );
  } else {
    addEventOrderIssue(issues, localizationEvent, eligibilityEvent, "localization-reviewed");
    if (cycleBoundary > 0 && localizationEvent.sequence <= cycleBoundary) {
      addIssue(
        issues,
        ["provenanceLog", "localization-reviewed"],
        "localization review must occur after the latest changes-requested event",
      );
    }
    if (localizedEvent !== undefined && localizationEvent.sequence <= localizedEvent.sequence) {
      addIssue(
        issues,
        ["provenanceLog", "localization-reviewed"],
        "localization review must follow the localized provenance event",
      );
    }
    const attestation = boundApprovedAttestation(
      "localization-review",
      localizationEvent,
      attestations,
      scope,
      localizedDigest,
    );
    if (attestation === undefined) {
      addIssue(
        issues,
        ["attestations", "localization-review"],
        `no approved localization-review attestation binds the exact localized content for ${pack.id} version ${pack.version}`,
      );
    } else {
      if (attestation.localizationReview?.fluentBurmeseConfirmed !== true) {
        addIssue(
          issues,
          ["attestations", "localization-review", "fluentBurmeseConfirmed"],
          "localization review must confirm fluent Burmese review",
        );
      }
      const evidenceIssue = evidenceReferenceClassificationIssue(
        pack.fixtureOnly,
        attestation.localizationReview?.fluentReviewEvidence ?? "",
        ["attestations", "localization-review", "fluentReviewEvidence"],
        "localization-review evidence",
      );
      if (evidenceIssue !== undefined) {
        addIssue(issues, [...evidenceIssue.path], evidenceIssue.message);
      }
    }
  }
  return localizedDigest;
}

function assertAccessibilityGate(
  pack: PackSource,
  localizedContent: LocalizedContent | undefined,
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  issues: StrictValidationIssue[],
): void {
  if (pack.accessibility === undefined) {
    addIssue(
      issues,
      ["accessibility"],
      `authored content accessibility metadata is required for ${pack.id} version ${pack.version}`,
    );
  } else {
    strictParse(contentAccessibilitySchema, pack.accessibility);
    if (localizedContent?.accessibility !== undefined) {
      strictParse(contentAccessibilitySchema, localizedContent.accessibility);
    }
  }

  const cycleBoundary = reviewCycleBoundary(events);
  const eligibilityEvent = firstEventInCycle(events, "artifact-eligible", cycleBoundary);
  const localizedEvent = latestEvent(events, "localized");
  const reviewEvent = latestEventInCycle(events, "accessibility-reviewed", cycleBoundary);
  if (reviewEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "accessibility-reviewed"],
      `content accessibility review is required for ${pack.id} version ${pack.version}`,
    );
    return;
  }
  if (localizedEvent !== undefined && reviewEvent.sequence < localizedEvent.sequence) {
    addIssue(
      issues,
      ["provenanceLog", "accessibility-reviewed"],
      "accessibility review must occur after the localized content binding",
    );
  }
  if (
    localizedEvent !== undefined &&
    reviewEvent.localizedContentDigest !== localizedEvent.localizedContentDigest
  ) {
    addIssue(
      issues,
      ["provenanceLog", "accessibility-reviewed", "localizedContentDigest"],
      "accessibility review must bind the exact localized content digest",
    );
  }
  addEventOrderIssue(issues, reviewEvent, eligibilityEvent, "accessibility-reviewed");
  if (cycleBoundary > 0 && reviewEvent.sequence <= cycleBoundary) {
    addIssue(
      issues,
      ["provenanceLog", "accessibility-reviewed"],
      "accessibility review must occur after the latest changes-requested event",
    );
  }
  const attestation = attestations.find(
    (candidate) =>
      candidate.kind === "accessibility-review" &&
      candidate.outcome === "approved" &&
      candidate.actorId === reviewEvent.actorId &&
      candidate.recordedAt === reviewEvent.recordedAt &&
      candidate.reviewEventSequence === reviewEvent.sequence &&
      candidate.localizedContentDigest === reviewEvent.localizedContentDigest,
  );
  if (attestation === undefined) {
    addIssue(
      issues,
      ["attestations", "accessibility-review"],
      `no approved accessibility-review attestation binds ${pack.id} version ${pack.version}`,
    );
    return;
  }
  if (
    attestation.accessibilityReview?.readingOrderConfirmed !== true ||
    attestation.accessibilityReview.referencedMediaAlternativesConfirmed !== true ||
    attestation.accessibilityReview.runtimeValidationDeferred !== true
  ) {
    addIssue(
      issues,
      ["attestations", "accessibility-review"],
      "accessibility review must confirm authored reading order, media alternatives/transcripts, and defer runtime validation",
    );
  }
}

function assertSponsorshipGate(
  pack: PackSource,
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  issues: StrictValidationIssue[],
): "disclosed" | "not-applicable" {
  const cycleBoundary = reviewCycleBoundary(events);
  const eligibilityEvent = firstEventInCycle(events, "artifact-eligible", cycleBoundary);
  const localizedEvent = latestEvent(events, "localized");
  const disclosureEvent = latestEventInCycle(events, "sponsorship-disclosed", cycleBoundary);
  const anyDisclosureEvent = latestEvent(events, "sponsorship-disclosed");
  if (pack.sponsorship === undefined) {
    if (anyDisclosureEvent !== undefined) {
      addIssue(
        issues,
        ["provenanceLog", "sponsorship-disclosed"],
        `sponsorship disclosure was recorded for an unsponsored pack ${pack.id} version ${pack.version}`,
      );
    }
    return "not-applicable";
  }

  // The localization schema has no `sponsorship` field and this gate reads
  // `pack.sponsorship` from the canonical source only, so a sponsored Pack's
  // disclosure reaches the release boundary but not the Burmese text a
  // participant reads. Real content must not be released into that gap
  // (`YWAY-P020`: sponsored content must be disclosed to the reader). Fixture
  // content may still be released here, and its committed disclosure is repeated
  // in the Burmese limitations and asserted by the test suite.
  if (!pack.fixtureOnly) {
    addIssue(
      issues,
      ["sponsorship"],
      `sponsored real content is not releasable: the localization schema has no sponsorship disclosure field, so the disclosure for ${pack.id} version ${pack.version} would not reach a Burmese-reading participant (YWAY-P020). The localized sponsorship representation is an open owner decision; do not work around it by leaving the disclosure out of the Burmese text`,
    );
  }
  if (pack.sponsorship.editorialControl !== "independent") {
    addIssue(
      issues,
      ["sponsorship", "editorialControl"],
      "sponsored content must preserve independent editorial control",
    );
  }
  if (pack.sponsorship.orderingInfluence !== "none") {
    addIssue(
      issues,
      ["sponsorship", "orderingInfluence"],
      "sponsored content must have no ordering influence",
    );
  }
  if (disclosureEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "sponsorship-disclosed"],
      `sponsorship disclosure is required for sponsored pack ${pack.id} version ${pack.version}`,
    );
    return "disclosed";
  }
  if (localizedEvent !== undefined && disclosureEvent.sequence < localizedEvent.sequence) {
    addIssue(
      issues,
      ["provenanceLog", "sponsorship-disclosed"],
      "sponsorship disclosure must occur after the localized content binding",
    );
  }
  if (
    localizedEvent !== undefined &&
    disclosureEvent.localizedContentDigest !== localizedEvent.localizedContentDigest
  ) {
    addIssue(
      issues,
      ["provenanceLog", "sponsorship-disclosed", "localizedContentDigest"],
      "sponsorship disclosure must bind the exact localized content digest",
    );
  }
  addEventOrderIssue(issues, disclosureEvent, eligibilityEvent, "sponsorship-disclosed");
  if (cycleBoundary > 0 && disclosureEvent.sequence <= cycleBoundary) {
    addIssue(
      issues,
      ["provenanceLog", "sponsorship-disclosed"],
      "sponsorship disclosure must occur after the latest changes-requested event",
    );
  }
  const attestation = attestations.find(
    (candidate) =>
      candidate.kind === "sponsorship-disclosure" &&
      candidate.outcome === "approved" &&
      candidate.actorId === disclosureEvent.actorId &&
      candidate.recordedAt === disclosureEvent.recordedAt &&
      candidate.reviewEventSequence === disclosureEvent.sequence &&
      candidate.localizedContentDigest === disclosureEvent.localizedContentDigest,
  );
  if (attestation === undefined) {
    addIssue(
      issues,
      ["attestations", "sponsorship-disclosure"],
      `no approved sponsorship-disclosure attestation binds ${pack.id} version ${pack.version}`,
    );
  } else if (
    attestation.sponsorshipReview?.disclosureConfirmed !== true ||
    attestation.sponsorshipReview.editorialControlPreserved !== true ||
    attestation.sponsorshipReview.orderingInfluence !== "none"
  ) {
    addIssue(
      issues,
      ["attestations", "sponsorship-disclosure"],
      "sponsorship review must confirm disclosure, editorial independence, and no ordering influence",
    );
  }
  return "disclosed";
}

function assertPractitionerGate(
  pack: PackSource,
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  provenanceLog: ProvenanceEventLog,
  eligibility: PractitionerEligibility | undefined,
  evaluateAt: string,
  expectedHeadEventDigest: string | undefined,
  issues: StrictValidationIssue[],
): void {
  const cycleBoundary = reviewCycleBoundary(events);
  const founderEvent = latestEventInCycle(events, "founder-reviewed", cycleBoundary);
  const practitionerEvent = latestEventInCycle(events, "practitioner-reviewed", cycleBoundary);
  const localizedEvent = latestEvent(events, "localized");
  if (founderEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "founder-reviewed"],
      `founder review is required for ${pack.id} version ${pack.version}`,
    );
  }
  if (practitionerEvent === undefined) {
    addIssue(
      issues,
      ["provenanceLog", "practitioner-reviewed"],
      `practitioner review is required for ${pack.id} version ${pack.version}`,
    );
  }
  if (founderEvent === undefined || practitionerEvent === undefined || eligibility === undefined) {
    return;
  }
  if (localizedEvent !== undefined) {
    if (founderEvent.sequence < localizedEvent.sequence) {
      addIssue(
        issues,
        ["provenanceLog", "founder-reviewed"],
        "founder review must occur after the localized content binding",
      );
    }
    if (practitionerEvent.sequence < localizedEvent.sequence) {
      addIssue(
        issues,
        ["provenanceLog", "practitioner-reviewed"],
        "practitioner review must occur after the localized content binding",
      );
    }
  }
  const founderAttestation = boundApprovedAttestation(
    "founder-review",
    founderEvent,
    attestations,
    {
      packId: pack.id,
      packVersion: pack.version,
      contentDigest: contentDigest(pack),
    },
    undefined,
  );
  const practitionerAttestation = boundApprovedAttestation(
    "practitioner-review",
    practitionerEvent,
    attestations,
    {
      packId: pack.id,
      packVersion: pack.version,
      contentDigest: contentDigest(pack),
    },
    undefined,
  );
  if (founderAttestation === undefined || practitionerAttestation === undefined) {
    addIssue(
      issues,
      ["attestations"],
      `founder and practitioner attestations must bind the exact reviewed version for ${pack.id} version ${pack.version}`,
    );
    return;
  }
  try {
    verifyRecordedPractitionerApproval({
      pack,
      provenanceLog,
      founderAttestation,
      practitionerAttestation,
      eligibility,
      evaluateAt,
      expectedHeadEventDigest,
    });
  } catch (error) {
    if (error instanceof StrictValidationError) {
      issues.push(
        ...error.issues.map((issue) => ({
          path: ["practitionerGate", ...issue.path],
          message: issue.message,
        })),
      );
      return;
    }
    throw error;
  }
}

function assertPolicyReviewGate(
  pack: PackSource,
  events: readonly ProvenanceEvent[],
  attestations: readonly ReviewAttestation[],
  eligibility: PractitionerEligibility | undefined,
  localizedDigest: string | undefined,
  evaluateAt: string,
  selected: ReleasePolicySelection,
  issues: StrictValidationIssue[],
): boolean {
  const policy = requireReleasePolicy(selected, pack.fixtureOnly);
  const boundary = reviewCycleBoundary(events);
  const ai = latestEventInCycle(events, "ai-reviewed", boundary);
  const owner = latestEventInCycle(events, "owner-approved", boundary);
  const practitioner = latestEventInCycle(events, "practitioner-reviewed", boundary);
  const eligible = firstEventInCycle(events, "artifact-eligible", boundary);
  const scope = { packId: pack.id, packVersion: pack.version, contentDigest: contentDigest(pack) };
  const aiAttestation =
    ai === undefined
      ? undefined
      : boundApprovedAttestation("ai-review", ai, attestations, scope, localizedDigest);
  const ownerAttestation =
    owner === undefined
      ? undefined
      : boundApprovedAttestation("owner-approval", owner, attestations, scope, localizedDigest);
  if (
    ai === undefined ||
    aiAttestation?.aiReview === undefined ||
    aiAttestation.localizedContentDigest !== localizedDigest ||
    aiAttestation.aiReview.reviewCycle !== boundary
  ) {
    addIssue(
      issues,
      ["ai-review"],
      "completed AI review of exact content and current review cycle is missing",
    );
  }
  const localization = latestEventInCycle(events, "localization-reviewed", boundary);
  const localizationAttestation =
    localization === undefined
      ? undefined
      : boundApprovedAttestation(
          "localization-review",
          localization,
          attestations,
          scope,
          localizedDigest,
        );
  if (localizationAttestation !== undefined) {
    const authorOrTranslator = events
      .filter((event) => event.type === "authored" || event.type === "localized")
      .some((event) => event.actorId === localizationAttestation.actorId);
    const relationship = localizationAttestation.localizationReview?.reviewerRelationship;
    if (relationship !== (authorOrTranslator ? "owner-fluent-self-review" : "independent"))
      addIssue(
        issues,
        ["localization-review", "reviewerRelationship"],
        "policy-aware Burmese review must truthfully state owner fluent/self-review or independent review",
      );
  }
  if (
    owner === undefined ||
    ownerAttestation?.ownerApproval === undefined ||
    ownerAttestation.localizedContentDigest !== localizedDigest ||
    ownerAttestation.ownerApproval.reviewCycle !== boundary ||
    !sameReleasePolicy(ownerAttestation.ownerApproval.releasePolicy, policy) ||
    !sameReleasePolicy(owner?.releasePolicy, policy)
  ) {
    addIssue(
      issues,
      ["owner-approval"],
      "owner approval of exact content, policy ID/version, scope, and current review cycle is missing or mismatched",
    );
  }
  if (
    ai !== undefined &&
    owner !== undefined &&
    (ai.sequence >= owner.sequence || Date.parse(ai.recordedAt) > Date.parse(owner.recordedAt))
  ) {
    addIssue(issues, ["owner-approval"], "owner approval must follow completed AI review");
  }
  if (owner !== undefined) {
    for (const requiredType of [
      "localization-reviewed",
      "accessibility-reviewed",
      ...(pack.sponsorship === undefined ? [] : ["sponsorship-disclosed"]),
    ]) {
      const priorReview = latestEventInCycle(
        events,
        requiredType as ProvenanceEvent["type"],
        boundary,
      );
      if (
        priorReview === undefined ||
        priorReview.sequence >= owner.sequence ||
        Date.parse(priorReview.recordedAt) > Date.parse(owner.recordedAt)
      )
        addIssue(issues, ["owner-approval"], `owner approval must follow ${requiredType} evidence`);
    }
  }
  if (owner !== undefined) addEventOrderIssue(issues, owner, eligible, "owner-approved");
  if (practitioner !== undefined) {
    const attestation = boundApprovedAttestation(
      "practitioner-review",
      practitioner,
      attestations,
      scope,
      localizedDigest,
    );
    if (attestation === undefined || attestation.localizedContentDigest !== localizedDigest)
      addIssue(
        issues,
        ["practitioner-review"],
        "practitioner review does not bind exact localized content",
      );
    const authored = events.find((event) => event.type === "authored");
    if (authored?.actorId === practitioner.actorId)
      addIssue(issues, ["practitioner-review"], "practitioner cannot review their authored Pack");
    if (
      eligibility === undefined ||
      eligibility.actorId !== practitioner.actorId ||
      eligibility.fixtureOnly !== pack.fixtureOnly ||
      eligibility.status !== "active" ||
      eligibility.verification.status !== "verified" ||
      pack.occupations.some((occupation) => !eligibility.occupations.includes(occupation)) ||
      eligibility.verification.verifiedOn > practitioner.recordedAt.slice(0, 10) ||
      eligibility.validFrom > practitioner.recordedAt.slice(0, 10) ||
      eligibility.validUntil < evaluateAt.slice(0, 10)
    ) {
      addIssue(
        issues,
        ["practitioner-review"],
        "practitioner eligibility, qualification, occupation coverage, or validity is missing or invalid",
      );
    }
    if (
      attestation !== undefined &&
      eligibility !== undefined &&
      authored !== undefined &&
      localizedDigest !== undefined
    ) {
      try {
        assertPolicyPractitionerEligibility({
          pack,
          attestation,
          eligibility,
          authoredActorId: authored.actorId,
          evaluateAt,
          localizedContentDigest: localizedDigest,
        });
      } catch (error) {
        if (error instanceof StrictValidationError)
          issues.push(
            ...error.issues.map((issue) => ({
              path: ["practitioner-review", ...issue.path],
              message: issue.message,
            })),
          );
        else throw error;
      }
    }
    if (
      ai !== undefined &&
      (practitioner.sequence <= ai.sequence ||
        Date.parse(practitioner.recordedAt) < Date.parse(ai.recordedAt))
    )
      addIssue(issues, ["practitioner-review"], "practitioner review must follow AI review");
    if (owner !== undefined && practitioner.sequence >= owner.sequence)
      addIssue(issues, ["practitioner-review"], "practitioner review must precede owner approval");
    addEventOrderIssue(issues, practitioner, eligible, "practitioner-reviewed");
  } else if (requiresPractitioner(policy)) {
    addIssue(
      issues,
      ["practitioner-review"],
      "human-assured policy requires qualified practitioner review",
    );
  }
  return practitioner !== undefined;
}

export function evaluateReleaseGates(input: ReleaseGateInput): ReleaseGateResult {
  const pack = strictParse(packSourceSchema, input.pack);
  // The version, digest, review-cycle, practitioner-independence, localization,
  // accessibility, and sponsorship gates below are one shared set for both
  // classifications. What differs is only the classification rules in
  // `content/classification.ts`, which `requireClassificationIsolation` applies and
  // the record schemas enforce per record.
  const classificationIssue = packIdClassificationIssue(pack.id, pack.fixtureOnly, ["id"]);
  if (classificationIssue !== undefined) {
    throw new StrictValidationError([{ path: ["id"], message: classificationIssue.message }]);
  }
  const localizedContent =
    input.localizedContent === undefined
      ? undefined
      : strictParse(localizedContentSchema, input.localizedContent);
  // Checked before the digest binding so that a pair which is not in parity is
  // refused as such, naming the specific defect, instead of being reported only
  // as a localized digest mismatch. A pair in parity still faces the digest,
  // version-scope, and review gates below.
  if (localizedContent !== undefined) {
    const parityIssues = collectExperimentParityIssues(
      pack.experiments,
      localizedContent.experiments,
      "localized content",
      ["localizedContent", "experiments"],
    );
    if (parityIssues.length > 0) {
      throw new StrictValidationError(parityIssues);
    }
  }
  const sourceDigest = contentDigest(pack);
  const scope: VersionScope = {
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: sourceDigest,
  };
  const localizedContentDigest =
    localizedContent === undefined ? undefined : contentDigest(localizedContent);
  const expectedLocalizedContentDigests =
    localizedContentDigest === undefined ? undefined : { [pack.version]: localizedContentDigest };
  const provenanceLog = verifyProvenanceLog(input.provenanceLog, {
    expectedContentDigests: { [pack.version]: sourceDigest },
    expectedLocalizedContentDigests,
  });
  if (provenanceLog.packId !== pack.id) {
    throw new StrictValidationError([
      {
        path: ["provenanceLog", "packId"],
        message: `provenance log packId "${provenanceLog.packId}" does not match source-derived pack id "${pack.id}"`,
      },
    ]);
  }
  assertFixtureOnlyProvenance(pack.fixtureOnly, provenanceLog);
  const events = selectVersionScopedEvents(provenanceLog, scope);
  const issues: StrictValidationIssue[] = [];
  const attestations = input.attestations.map((attestation) =>
    strictParse(reviewAttestationSchema, attestation),
  );
  const parsedEligibility =
    input.practitionerEligibility === undefined
      ? undefined
      : strictParse(practitionerEligibilitySchema, input.practitionerEligibility);
  assertReviewAttestationBindings(events, attestations, scope, issues);

  const evaluateAt = strictParse(dateTimeSchema, input.evaluateAt);
  const gateEvidenceEvents = events.filter((event) =>
    [
      "localized",
      "founder-reviewed",
      "ai-reviewed",
      "owner-approved",
      "practitioner-reviewed",
      "localization-reviewed",
      "accessibility-reviewed",
      "sponsorship-disclosed",
      "changes-requested",
    ].includes(event.type),
  );
  for (const event of gateEvidenceEvents) {
    if (Date.parse(event.recordedAt) > Date.parse(evaluateAt)) {
      addIssue(
        issues,
        ["evaluateAt"],
        `gate evaluation time ${evaluateAt} must not precede ${event.type} event recordedAt ${event.recordedAt}`,
      );
    }
  }

  const localizedDigest = assertLocalizationGate(
    pack,
    localizedContent,
    events,
    attestations,
    scope,
    issues,
  );
  assertAccessibilityGate(pack, localizedContent, events, attestations, issues);
  const sponsorship = assertSponsorshipGate(pack, events, attestations, issues);
  const selectedPolicy =
    input.releasePolicy ??
    [...attestations]
      .reverse()
      .find(
        (attestation) =>
          attestation.kind === "owner-approval" &&
          attestation.outcome === "approved" &&
          attestation.ownerApproval !== undefined,
      )?.ownerApproval?.releasePolicy;
  const practitionerApproved =
    selectedPolicy === undefined
      ? true
      : assertPolicyReviewGate(
          pack,
          events,
          attestations,
          parsedEligibility,
          localizedContentDigest,
          evaluateAt,
          selectedPolicy,
          issues,
        );
  if (selectedPolicy === undefined)
    assertPractitionerGate(
      pack,
      events,
      attestations,
      provenanceLog,
      parsedEligibility,
      evaluateAt,
      input.expectedHeadEventDigest,
      issues,
    );

  if (localizedDigest === undefined) {
    if (issues.length === 0) {
      addIssue(issues, ["localizedContent"], "localized content digest could not be established");
    }
  } else {
    for (const attestation of attestations) {
      addScopeIssues(issues, attestation, scope, "release-gate attestation");
      if (attestation.fixtureOnly !== pack.fixtureOnly) {
        addIssue(
          issues,
          ["attestations", "fixtureOnly"],
          `attestation fixtureOnly ${attestation.fixtureOnly} does not match source fixtureOnly ${pack.fixtureOnly}`,
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }

  return strictParse(releaseGateResultSchema, {
    schemaVersion: 1,
    scope,
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: sourceDigest,
    localizedContentDigest: localizedDigest!,
    fixtureOnly: pack.fixtureOnly,
    founderApproved:
      selectedPolicy === undefined
        ? true
        : events.some((event) => event.type === "founder-reviewed"),
    practitionerApproved,
    ...(selectedPolicy === undefined
      ? {}
      : { aiReviewed: true, ownerApproved: true, releasePolicy: selectedPolicy }),
    localizationApproved: true,
    accessibilityApproved: true,
    sponsorship,
    runtimeAccessibilityDeferred: true,
    targetUserComprehensionDeferred: true,
  });
}

export function releaseGateManifestFields(result: ReleaseGateResult): {
  readonly founderApproved: boolean;
  readonly practitionerApproved: boolean;
  readonly aiReviewed?: true;
  readonly ownerApproved?: true;
  readonly releasePolicy?: ReleasePolicySelection;
  readonly localizationApproved: true;
  readonly accessibilityApproved: true;
  readonly sponsorship: "disclosed" | "not-applicable";
  readonly localizedContentDigest: string;
  readonly runtimeAccessibilityDeferred: true;
  readonly targetUserComprehensionDeferred: true;
} {
  return {
    founderApproved: result.founderApproved,
    practitionerApproved: result.practitionerApproved,
    ...(result.releasePolicy === undefined
      ? {}
      : {
          aiReviewed: true as const,
          ownerApproved: true as const,
          releasePolicy: result.releasePolicy,
        }),
    localizationApproved: result.localizationApproved,
    accessibilityApproved: result.accessibilityApproved,
    sponsorship: result.sponsorship,
    localizedContentDigest: result.localizedContentDigest,
    runtimeAccessibilityDeferred: result.runtimeAccessibilityDeferred,
    targetUserComprehensionDeferred: result.targetUserComprehensionDeferred,
  };
}

export interface ArtifactEligibilityInput extends ReleaseGateInput {
  readonly actorId: string;
  readonly recordedAt: string;
}

export function appendArtifactEligibilityEvent(
  input: ArtifactEligibilityInput,
): ProvenanceEventLog {
  const evaluateAt = strictParse(dateTimeSchema, input.evaluateAt);
  const recordedAt = strictParse(dateTimeSchema, input.recordedAt);
  if (Date.parse(recordedAt) < Date.parse(evaluateAt)) {
    throw new StrictValidationError([
      {
        path: ["recordedAt"],
        message: `artifact eligibility recordedAt ${recordedAt} must not precede gate evaluation time ${evaluateAt}`,
      },
    ]);
  }
  const result = evaluateReleaseGates(input);
  if (Date.parse(recordedAt) !== Date.parse(evaluateAt)) {
    // Qualification may expire between evaluation and recording eligibility.
    evaluateReleaseGates({ ...input, evaluateAt: recordedAt });
  }
  requireClassificationIsolation(
    {
      id: result.packId,
      version: result.packVersion,
      fixtureOnly: result.fixtureOnly,
    },
    input.actorId,
  );
  const status = deriveVersionLifecycleStatus(input.provenanceLog, result.packVersion);
  if (
    status.currentStatus !==
    (result.releasePolicy === undefined ? "practitioner-reviewed" : "owner-approved")
  ) {
    throw new StrictValidationError([
      {
        path: ["provenanceLog"],
        message: `artifact eligibility requires standing ${result.releasePolicy === undefined ? "practitioner-reviewed" : "owner-approved"} status for ${result.packId} version ${result.packVersion}`,
      },
    ]);
  }
  return appendProvenanceEvent(input.provenanceLog, {
    packId: result.packId,
    packVersion: result.packVersion,
    type: "artifact-eligible",
    actorId: input.actorId,
    fixtureOnly: result.fixtureOnly,
    contentDigest: result.contentDigest,
    localizedContentDigest: result.localizedContentDigest,
    recordedAt,
  });
}

export const appendArtifactEligibleEvent = appendArtifactEligibilityEvent;
