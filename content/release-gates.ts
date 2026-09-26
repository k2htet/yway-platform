import { contentDigest } from "./digest.js";
import {
  assertVersionScoped,
  deriveVersionLifecycleStatus,
  selectVersionScopedEvents,
  type VersionScope,
} from "./lifecycle.js";
import { verifyRecordedPractitionerApproval } from "./practitioner-gate.js";
import { appendProvenanceEvent, verifyProvenanceLog } from "./provenance.js";
import { reviewEventTypes } from "./governance.js";
import { assertFixtureOnlyProvenance, requireFixtureIsolation } from "./store.js";
import {
  StrictValidationError,
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
  readonly practitionerEligibility: PractitionerEligibility;
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
    attestation.localizedContentDigest !== event.localizedContentDigest
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
  const sourceExperimentIds = pack.experiments.map((experiment) => experiment.id);
  const localizedExperimentIds = localizedContent.experiments.map((experiment) => experiment.id);
  if (
    sourceExperimentIds.length !== localizedExperimentIds.length ||
    sourceExperimentIds.some((id, index) => id !== localizedExperimentIds[index])
  ) {
    addIssue(
      issues,
      ["localizedContent", "experiments"],
      "localized content must cover the same ordered experiment IDs as the canonical source",
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
      if (
        pack.fixtureOnly &&
        !/^fixture:[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(
          attestation.localizationReview?.fluentReviewEvidence ?? "",
        )
      ) {
        addIssue(
          issues,
          ["attestations", "localization-review", "fluentReviewEvidence"],
          "fixture localization review must use synthetic fixture: evidence",
        );
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

export function evaluateReleaseGates(input: ReleaseGateInput): ReleaseGateResult {
  const pack = strictParse(packSourceSchema, input.pack);
  if (!pack.fixtureOnly) {
    throw new StrictValidationError([
      {
        path: ["fixtureOnly"],
        message:
          "Stage 2 release gates accept fixture-only Packs only; production release requires a separately authorized path",
      },
    ]);
  }
  const localizedContent =
    input.localizedContent === undefined
      ? undefined
      : strictParse(localizedContentSchema, input.localizedContent);
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
  const parsedEligibility = strictParse(
    practitionerEligibilitySchema,
    input.practitionerEligibility,
  );
  assertReviewAttestationBindings(events, attestations, scope, issues);

  const evaluateAt = strictParse(dateTimeSchema, input.evaluateAt);
  const gateEvidenceEvents = events.filter((event) =>
    [
      "localized",
      "founder-reviewed",
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
    founderApproved: true,
    practitionerApproved: true,
    localizationApproved: true,
    accessibilityApproved: true,
    sponsorship,
    runtimeAccessibilityDeferred: true,
    targetUserComprehensionDeferred: true,
  });
}

export function releaseGateManifestFields(result: ReleaseGateResult): {
  readonly founderApproved: true;
  readonly practitionerApproved: true;
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
  requireFixtureIsolation(
    {
      id: result.packId,
      version: result.packVersion,
      fixtureOnly: result.fixtureOnly,
    },
    input.actorId,
  );
  const status = deriveVersionLifecycleStatus(input.provenanceLog, result.packVersion);
  if (status.currentStatus !== "practitioner-reviewed") {
    throw new StrictValidationError([
      {
        path: ["provenanceLog"],
        message: `artifact eligibility requires standing practitioner-reviewed status for ${result.packId} version ${result.packVersion}`,
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
