import {
  StrictValidationError,
  type StrictValidationIssue,
  dateTimeSchema,
  packSourceSchema,
  practitionerEligibilitySchema,
  reviewAttestationSchema,
  strictParse,
  type PackSource,
  type PractitionerEligibility,
  type ProvenanceEvent,
  type ProvenanceEventLog,
  type ReviewAttestation,
} from "./schemas/index.js";
import { contentDigest } from "./digest.js";
import {
  assertVersionScoped,
  deriveVersionLifecycleStatus,
  selectVersionScopedEvents,
  type LifecycleStatus,
  type VersionScope,
} from "./lifecycle.js";
import { verifyProvenanceLog } from "./provenance.js";

export interface PractitionerApprovalGateInput {
  readonly pack: PackSource;
  readonly provenanceLog: ProvenanceEventLog;
  readonly founderAttestation: ReviewAttestation;
  readonly practitionerAttestation: ReviewAttestation;
  readonly eligibility: PractitionerEligibility;
  readonly evaluateAt: string;
  readonly expectedHeadEventDigest?: string;
}

export interface PractitionerApprovalGateResult {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
  readonly practitionerActorId: string;
  readonly founderActorId: string;
  readonly fixtureOnly: boolean;
  readonly evaluateAt: string;
}

type GateMode = "proposed" | "recorded";

const recordedStandingStatuses: readonly LifecycleStatus[] = [
  "practitioner-reviewed",
  "artifact-eligible",
  "artifact-released",
];

function calendarDate(dateTime: string): string {
  return new Date(Date.parse(dateTime)).toISOString().slice(0, 10);
}

function captureIssues(target: StrictValidationIssue[], run: () => unknown): void {
  try {
    run();
  } catch (error) {
    if (error instanceof StrictValidationError) {
      target.push(...error.issues);
      return;
    }
    throw error;
  }
}

function pushIssue(
  issues: StrictValidationIssue[],
  path: readonly (string | number)[],
  message: string,
): void {
  issues.push({ path, message });
}

function assertFounderCheckpointPrecedes(
  founderAttestation: ReviewAttestation,
  practitionerAttestation: ReviewAttestation,
  issues: StrictValidationIssue[],
): void {
  const founderTime = Date.parse(founderAttestation.recordedAt);
  const approvalTime = Date.parse(practitionerAttestation.recordedAt);
  if (
    !Number.isFinite(founderTime) ||
    !Number.isFinite(approvalTime) ||
    founderTime > approvalTime
  ) {
    pushIssue(
      issues,
      ["founderAttestation", "recordedAt"],
      `founder attestation recordedAt ${founderAttestation.recordedAt} must precede practitioner approval recordedAt ${practitionerAttestation.recordedAt}`,
    );
  }
}

function assertFounderCheckpointRecord(
  checkpoint: ProvenanceEvent | undefined,
  founderAttestation: ReviewAttestation,
  practitionerAttestation: ReviewAttestation,
  issues: StrictValidationIssue[],
): void {
  if (checkpoint === undefined) {
    return;
  }
  if (checkpoint.actorId !== founderAttestation.actorId) {
    pushIssue(
      issues,
      ["founderAttestation", "actorId"],
      `recorded founder-review event actor "${checkpoint.actorId}" does not match founder attestation actor "${founderAttestation.actorId}"`,
    );
  }
  if (founderAttestation.reviewEventSequence !== checkpoint.sequence) {
    pushIssue(
      issues,
      ["founderAttestation", "reviewEventSequence"],
      `founder attestation reviewEventSequence ${founderAttestation.reviewEventSequence ?? "missing"} does not match founder-review event sequence ${checkpoint.sequence}; the attestation must bind to its own review event, not a prior cycle's event`,
    );
  }
  const checkpointTime = Date.parse(checkpoint.recordedAt);
  const approvalTime = Date.parse(practitionerAttestation.recordedAt);
  if (
    !Number.isFinite(checkpointTime) ||
    !Number.isFinite(approvalTime) ||
    checkpointTime > approvalTime
  ) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `founder-review event recordedAt ${checkpoint.recordedAt} must precede practitioner approval recordedAt ${practitionerAttestation.recordedAt}`,
    );
  }
}

function assertTemporalCorrespondence(
  eventKind: string,
  event: ProvenanceEvent,
  attestationKind: string,
  attestation: ReviewAttestation,
  pack: PackSource,
  issues: StrictValidationIssue[],
): void {
  const eventTime = Date.parse(event.recordedAt);
  const attestationTime = Date.parse(attestation.recordedAt);
  if (
    !Number.isFinite(eventTime) ||
    !Number.isFinite(attestationTime) ||
    eventTime !== attestationTime
  ) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `recorded ${eventKind} event recordedAt ${event.recordedAt} does not temporally correspond to ${attestationKind} attestation recordedAt ${attestation.recordedAt} for ${pack.id} version ${pack.version}`,
    );
  }
}

function assertPractitionerEventBinding(
  expectedSequence: number,
  bindingLabel: string,
  practitionerAttestation: ReviewAttestation,
  issues: StrictValidationIssue[],
): void {
  if (practitionerAttestation.reviewEventSequence !== expectedSequence) {
    pushIssue(
      issues,
      ["practitionerAttestation", "reviewEventSequence"],
      `practitioner attestation reviewEventSequence ${practitionerAttestation.reviewEventSequence ?? "missing"} does not match ${bindingLabel} sequence ${expectedSequence}; the attestation must bind to its own review event, not a prior cycle's event`,
    );
  }
}

function assertEvaluationTimeCoversApproval(
  evaluateAt: string,
  practitionerAttestation: ReviewAttestation,
  issues: StrictValidationIssue[],
): void {
  const evaluationTime = Date.parse(evaluateAt);
  const approvalTime = Date.parse(practitionerAttestation.recordedAt);
  if (
    !Number.isFinite(evaluationTime) ||
    !Number.isFinite(approvalTime) ||
    evaluationTime < approvalTime
  ) {
    pushIssue(
      issues,
      ["evaluateAt"],
      `gate evaluation time ${evaluateAt} must not precede practitioner approval recordedAt ${practitionerAttestation.recordedAt}`,
    );
  }
}

function assertFixtureClassification(
  label: string,
  fixtureOnly: boolean,
  pack: PackSource,
  issues: StrictValidationIssue[],
): void {
  if (fixtureOnly !== pack.fixtureOnly) {
    pushIssue(
      issues,
      ["fixtureOnly"],
      `mismatched fixture classification: ${label} is fixtureOnly ${fixtureOnly} while source-derived scope ${pack.id}@${pack.version} is fixtureOnly ${pack.fixtureOnly}`,
    );
  }
}

function assertProposedFounderCheckpoint(
  status: LifecycleStatus,
  founderEventCount: number,
  pack: PackSource,
  issues: StrictValidationIssue[],
): void {
  if (founderEventCount === 0) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `founder-review provenance event is missing for ${pack.id} version ${pack.version} at the source-derived digest; founder checkpoint must precede practitioner approval`,
    );
    return;
  }
  if (status !== "founder-reviewed") {
    pushIssue(
      issues,
      ["provenanceLog"],
      `founder checkpoint is not the standing review state for ${pack.id} version ${pack.version} (current status "${status}"); a practitioner approval can only be recorded after founder review`,
    );
  }
}

function assertRecordedFounderCheckpoint(
  status: LifecycleStatus,
  founderEvents: readonly ProvenanceEvent[],
  practitionerEvent: ProvenanceEvent | undefined,
  practitionerAttestation: ReviewAttestation,
  pack: PackSource,
  founderAttestation: ReviewAttestation,
  issues: StrictValidationIssue[],
): void {
  if (practitionerEvent === undefined) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `practitioner-reviewed provenance event is missing for ${pack.id} version ${pack.version} at the source-derived digest`,
    );
    return;
  }
  if (practitionerEvent.actorId !== practitionerAttestation.actorId) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `recorded practitioner-reviewed event actor "${practitionerEvent.actorId}" does not match practitioner attestation actor "${practitionerAttestation.actorId}" for ${pack.id} version ${pack.version}`,
    );
  }
  assertPractitionerEventBinding(
    practitionerEvent.sequence,
    "practitioner-reviewed event",
    practitionerAttestation,
    issues,
  );
  assertTemporalCorrespondence(
    "practitioner-reviewed",
    practitionerEvent,
    "practitioner",
    practitionerAttestation,
    pack,
    issues,
  );
  const checkpoint = founderEvents
    .filter((event) => event.sequence < practitionerEvent.sequence)
    .at(-1);
  if (checkpoint === undefined) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `founder-review event must precede the recorded practitioner approval (sequence ${practitionerEvent.sequence}) for ${pack.id} version ${pack.version}`,
    );
    return;
  }
  assertFounderCheckpointRecord(checkpoint, founderAttestation, practitionerAttestation, issues);
  assertTemporalCorrespondence(
    "founder-review",
    checkpoint,
    "founder",
    founderAttestation,
    pack,
    issues,
  );
  if (!recordedStandingStatuses.includes(status)) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `practitioner approval is not the standing review state for ${pack.id} version ${pack.version} (current status "${status}"); changes-requested or retired versions require a fresh founder checkpoint and practitioner approval`,
    );
  }
}

function assertEligibility(
  eligibility: PractitionerEligibility,
  practitionerAttestation: ReviewAttestation,
  pack: PackSource,
  evaluateAt: string,
  issues: StrictValidationIssue[],
): void {
  if (eligibility.status !== "active") {
    pushIssue(
      issues,
      ["eligibility", "status"],
      `practitioner eligibility must be active (received "${eligibility.status}")`,
    );
  }
  if (eligibility.verification.status !== "verified") {
    pushIssue(
      issues,
      ["eligibility", "verification", "status"],
      `practitioner eligibility must be verified (received "${eligibility.verification.status}")`,
    );
  }

  const reviewDate = calendarDate(practitionerAttestation.recordedAt);
  const evaluationDate = calendarDate(evaluateAt);
  if (eligibility.verification.verifiedOn > reviewDate) {
    pushIssue(
      issues,
      ["eligibility", "verification", "verifiedOn"],
      `practitioner manual verification on ${eligibility.verification.verifiedOn} occurred after the approval review date ${reviewDate}`,
    );
  }
  for (const [when, date] of [
    ["review time", reviewDate],
    ["gate evaluation time", evaluationDate],
  ] as const) {
    if (date < eligibility.validFrom) {
      pushIssue(
        issues,
        ["eligibility", "validFrom"],
        `practitioner eligibility is not valid at ${when} ${date}: validFrom is ${eligibility.validFrom}`,
      );
    }
    if (date > eligibility.validUntil) {
      pushIssue(
        issues,
        ["eligibility", "validUntil"],
        `practitioner eligibility is not valid at ${when} ${date}: validUntil is ${eligibility.validUntil} (inclusive window has ended)`,
      );
    }
  }

  for (const occupation of pack.occupations) {
    if (!eligibility.occupations.includes(occupation)) {
      pushIssue(
        issues,
        ["eligibility", "occupations"],
        `practitioner eligibility occupation scope does not cover pack occupation "${occupation}"; eligibility must cover every occupation listed on the Pack`,
      );
    }
  }
}

function runPractitionerApprovalGate(
  input: PractitionerApprovalGateInput,
  mode: GateMode,
): PractitionerApprovalGateResult {
  const evaluateAt = strictParse(dateTimeSchema, input.evaluateAt);
  const pack = strictParse(packSourceSchema, input.pack);
  const founderAttestation = strictParse(reviewAttestationSchema, input.founderAttestation);
  const practitionerAttestation = strictParse(
    reviewAttestationSchema,
    input.practitionerAttestation,
  );
  const eligibility = strictParse(practitionerEligibilitySchema, input.eligibility);

  const scope: VersionScope = {
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: contentDigest(pack),
  };

  const log = verifyProvenanceLog(input.provenanceLog, {
    expectedContentDigests: { [pack.version]: scope.contentDigest },
    expectedHeadEventDigest: input.expectedHeadEventDigest,
  });

  if (log.packId !== pack.id) {
    throw new StrictValidationError([
      {
        path: ["provenanceLog", "packId"],
        message: `provenance log packId "${log.packId}" does not match source-derived pack id "${pack.id}"`,
      },
    ]);
  }

  const issues: StrictValidationIssue[] = [];

  if (founderAttestation.kind !== "founder-review") {
    pushIssue(
      issues,
      ["founderAttestation", "kind"],
      `founder attestation must have kind "founder-review" (received "${founderAttestation.kind}")`,
    );
  }
  if (founderAttestation.outcome !== "approved") {
    pushIssue(
      issues,
      ["founderAttestation", "outcome"],
      `an approved founder attestation is required (received outcome "${founderAttestation.outcome}")`,
    );
  }
  if (practitionerAttestation.kind !== "practitioner-review") {
    pushIssue(
      issues,
      ["practitionerAttestation", "kind"],
      `practitioner attestation must have kind "practitioner-review" (received "${practitionerAttestation.kind}")`,
    );
  }
  if (practitionerAttestation.outcome !== "approved") {
    pushIssue(
      issues,
      ["practitionerAttestation", "outcome"],
      `an approved practitioner attestation is required (received outcome "${practitionerAttestation.outcome}")`,
    );
  }

  captureIssues(issues, () =>
    assertVersionScoped(founderAttestation, scope, "founder attestation"),
  );
  captureIssues(issues, () =>
    assertVersionScoped(practitionerAttestation, scope, "practitioner attestation"),
  );

  assertFixtureClassification("founder attestation", founderAttestation.fixtureOnly, pack, issues);
  assertFixtureClassification(
    "practitioner attestation",
    practitionerAttestation.fixtureOnly,
    pack,
    issues,
  );
  assertFixtureClassification("eligibility record", eligibility.fixtureOnly, pack, issues);

  const versionEvents = log.events.filter(
    (event) => event.packId === pack.id && event.packVersion === pack.version,
  );
  const firstVersionEvent = versionEvents[0];
  if (firstVersionEvent !== undefined) {
    assertFixtureClassification("provenance events", firstVersionEvent.fixtureOnly, pack, issues);
  }

  let status: LifecycleStatus;
  try {
    status = deriveVersionLifecycleStatus(log, pack.version).currentStatus;
  } catch (error) {
    if (error instanceof StrictValidationError) {
      throw new StrictValidationError([
        ...issues,
        ...error.issues.map((issue) => ({
          path: ["provenanceLog", ...issue.path],
          message: issue.message,
        })),
      ]);
    }
    throw error;
  }

  const scopedEvents = selectVersionScopedEvents(log, scope);
  const founderEvents = scopedEvents.filter((event) => event.type === "founder-reviewed");
  const practitionerEvents = scopedEvents.filter((event) => event.type === "practitioner-reviewed");
  const latestPractitionerEvent = practitionerEvents[practitionerEvents.length - 1];
  const authoredEvent = scopedEvents.find((event) => event.type === "authored");

  assertFounderCheckpointPrecedes(founderAttestation, practitionerAttestation, issues);

  if (mode === "proposed") {
    assertProposedFounderCheckpoint(status, founderEvents.length, pack, issues);
    const checkpoint = founderEvents.at(-1);
    assertFounderCheckpointRecord(checkpoint, founderAttestation, practitionerAttestation, issues);
    if (checkpoint !== undefined) {
      assertTemporalCorrespondence(
        "founder-review",
        checkpoint,
        "founder",
        founderAttestation,
        pack,
        issues,
      );
    }
    const nextSequence = (log.events[log.events.length - 1]?.sequence ?? 0) + 1;
    assertPractitionerEventBinding(
      nextSequence,
      "next provenance event that will record this approval",
      practitionerAttestation,
      issues,
    );
  } else {
    assertRecordedFounderCheckpoint(
      status,
      founderEvents,
      latestPractitionerEvent,
      practitionerAttestation,
      pack,
      founderAttestation,
      issues,
    );
  }

  if (practitionerAttestation.actorId !== eligibility.actorId) {
    pushIssue(
      issues,
      ["eligibility", "actorId"],
      `practitioner attestation actor "${practitionerAttestation.actorId}" does not match eligibility actor "${eligibility.actorId}"; the attestation and eligibility record must name the same actor`,
    );
  }

  assertEvaluationTimeCoversApproval(evaluateAt, practitionerAttestation, issues);
  assertEligibility(eligibility, practitionerAttestation, pack, evaluateAt, issues);

  if (authoredEvent === undefined) {
    pushIssue(
      issues,
      ["provenanceLog"],
      `authored provenance event is missing for ${pack.id} version ${pack.version} at the source-derived digest`,
    );
  } else if (authoredEvent.actorId === practitionerAttestation.actorId) {
    pushIssue(
      issues,
      ["practitionerAttestation", "actorId"],
      `practitioner approver "${practitionerAttestation.actorId}" authored ${pack.id} version ${pack.version}; approval must come from an independent practitioner`,
    );
  }

  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }

  return {
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: scope.contentDigest,
    practitionerActorId: practitionerAttestation.actorId,
    founderActorId: founderAttestation.actorId,
    fixtureOnly: pack.fixtureOnly,
    evaluateAt,
  };
}

export function validateProposedPractitionerApproval(
  input: PractitionerApprovalGateInput,
): PractitionerApprovalGateResult {
  return runPractitionerApprovalGate(input, "proposed");
}

export function verifyRecordedPractitionerApproval(
  input: PractitionerApprovalGateInput,
): PractitionerApprovalGateResult {
  return runPractitionerApprovalGate(input, "recorded");
}
