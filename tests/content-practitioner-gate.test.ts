import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StrictValidationError,
  appendProvenanceEvent,
  contentDigest,
  createGenesisProvenanceLog,
  packSourceSchema,
  practitionerEligibilitySchema,
  reviewAttestationSchema,
  strictParse,
  validateProposedPractitionerApproval,
  verifyRecordedPractitionerApproval,
  type PackSource,
  type PractitionerApprovalGateInput,
  type PractitionerEligibility,
  type ProvenanceEventDraft,
  type ProvenanceEventLog,
  type ReviewAttestation,
} from "../content/index.js";

function packObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "fixture-local-guide",
    version: 1,
    fixtureOnly: true,
    canonicalLanguage: "en-simple",
    aiAssisted: true,
    title: "Try being a local guide",
    summary: "A clearly synthetic pack for exercising the Stage 2 content pipeline.",
    occupations: ["local-guide"],
    preview: {
      headline: "Try a short guide trial",
      description: "Talk to one local guide about a normal working day.",
    },
    limitations: ["This synthetic pack does not replace real workplace experience."],
    experiments: [
      {
        id: "exp-talk-to-worker",
        title: "Talk to a local worker",
        question: "What is it really like to do this work day to day?",
        action: "Interview one person who already does this job.",
        timebox: "45 minutes this week",
        whatToNotice: "Which parts of the work felt energizing or draining.",
        reflection: "Write three sentences about what you noticed.",
        nextFork: "Shadow the same role for half a day before any course or application.",
      },
    ],
    authoredAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

const pack: PackSource = strictParse(packSourceSchema, packObject());
const digest = contentDigest(pack);
const staleDigest = "b".repeat(64);

function draft(overrides: Partial<ProvenanceEventDraft> = {}): ProvenanceEventDraft {
  return {
    packId: pack.id,
    packVersion: pack.version,
    type: "authored",
    actorId: "fixture-author-one",
    fixtureOnly: true,
    contentDigest: digest,
    recordedAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

function buildLog(
  steps: readonly Partial<ProvenanceEventDraft>[] = [],
  genesisOverrides: Partial<ProvenanceEventDraft> = {},
): ProvenanceEventLog {
  let log = createGenesisProvenanceLog(draft(genesisOverrides));
  for (const step of steps) {
    log = appendProvenanceEvent(log, draft(step));
  }
  return log;
}

const founderStep: Partial<ProvenanceEventDraft> = {
  type: "founder-reviewed",
  actorId: "fixture-founder-one",
  recordedAt: "2026-09-23T01:00:00Z",
};

const practitionerStep: Partial<ProvenanceEventDraft> = {
  type: "practitioner-reviewed",
  actorId: "fixture-practitioner-one",
  recordedAt: "2026-09-23T02:00:00Z",
};

function authoredOnlyLog(): ProvenanceEventLog {
  return buildLog();
}

function founderApprovedLog(): ProvenanceEventLog {
  return buildLog([founderStep]);
}

function recordedApprovalLog(): ProvenanceEventLog {
  return buildLog([founderStep, practitionerStep]);
}

function founderAttestation(overrides: Record<string, unknown> = {}): ReviewAttestation {
  return strictParse(reviewAttestationSchema, {
    schemaVersion: 1,
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: digest,
    kind: "founder-review",
    outcome: "approved",
    actorId: "fixture-founder-one",
    fixtureOnly: true,
    recordedAt: "2026-09-23T01:00:00Z",
    reviewEventSequence: 2,
    contentReview: {
      sixPartStructureConfirmed: true,
      exposureBeforeCommitmentConfirmed: true,
    },
    ...overrides,
  });
}

function practitionerAttestation(overrides: Record<string, unknown> = {}): ReviewAttestation {
  return strictParse(reviewAttestationSchema, {
    schemaVersion: 1,
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: digest,
    kind: "practitioner-review",
    outcome: "approved",
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    recordedAt: "2026-09-23T02:00:00Z",
    reviewEventSequence: 3,
    contentReview: {
      sixPartStructureConfirmed: true,
      exposureBeforeCommitmentConfirmed: true,
    },
    ...overrides,
  });
}

function eligibilityFixture(overrides: Record<string, unknown> = {}): PractitionerEligibility {
  return strictParse(practitionerEligibilitySchema, {
    schemaVersion: 1,
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: {
      method: "manual",
      status: "verified",
      verifiedOn: "2026-09-01",
    },
    validFrom: "2026-09-01",
    validUntil: "2027-09-01",
    evidenceReferences: ["fixture:eligibility-reference-001"],
    ...overrides,
  });
}

function proposedInput(
  overrides: Partial<PractitionerApprovalGateInput> = {},
): PractitionerApprovalGateInput {
  return {
    pack,
    provenanceLog: founderApprovedLog(),
    founderAttestation: founderAttestation(),
    practitionerAttestation: practitionerAttestation(),
    eligibility: eligibilityFixture(),
    evaluateAt: "2026-09-23T12:00:00Z",
    ...overrides,
  };
}

function recordedInput(
  overrides: Partial<PractitionerApprovalGateInput> = {},
): PractitionerApprovalGateInput {
  return {
    ...proposedInput(),
    provenanceLog: recordedApprovalLog(),
    ...overrides,
  };
}

function expectGateFailure(run: () => unknown, fragment: string): StrictValidationError {
  try {
    run();
  } catch (error) {
    assert.ok(
      error instanceof StrictValidationError,
      `expected StrictValidationError, received ${error instanceof Error ? error.message : String(error)}`,
    );
    assert.ok(
      error.message.includes(fragment),
      `expected error to include "${fragment}", received: ${error.message}`,
    );
    return error;
  }
  assert.fail("expected practitioner approval gate to fail, but it succeeded");
}

test("accepts a valid proposed practitioner approval", () => {
  const result = validateProposedPractitionerApproval(proposedInput());
  assert.equal(result.packId, pack.id);
  assert.equal(result.packVersion, pack.version);
  assert.equal(result.contentDigest, digest);
  assert.equal(result.practitionerActorId, "fixture-practitioner-one");
  assert.equal(result.founderActorId, "fixture-founder-one");
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.evaluateAt, "2026-09-23T12:00:00Z");
});

test("accepts a valid recorded practitioner approval", () => {
  const result = verifyRecordedPractitionerApproval(recordedInput());
  assert.equal(result.practitionerActorId, "fixture-practitioner-one");
  assert.equal(result.contentDigest, digest);
});

test("refuses a proposed approval when the founder review event is missing", () => {
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ provenanceLog: authoredOnlyLog() })),
    "founder-review provenance event is missing",
  );
});

test("refuses approval without an approved founder attestation", () => {
  const unapprovedFounder = founderAttestation({
    outcome: "changes-requested",
    contentReview: {
      sixPartStructureConfirmed: true,
      exposureBeforeCommitmentConfirmed: false,
    },
  });
  for (const run of [
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ founderAttestation: unapprovedFounder }),
      ),
    () =>
      verifyRecordedPractitionerApproval(recordedInput({ founderAttestation: unapprovedFounder })),
  ]) {
    expectGateFailure(run, "an approved founder attestation is required");
  }
});

test("refuses approval when the founder checkpoint is recorded after the practitioner approval", () => {
  const lateFounder = founderAttestation({ recordedAt: "2026-09-23T03:00:00Z" });
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ founderAttestation: lateFounder })),
    "must precede practitioner approval",
  );
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ founderAttestation: lateFounder })),
    "must precede practitioner approval",
  );
});

test("refuses approval when the founder review event postdates the practitioner approval", () => {
  const lateFounderEventLog = buildLog([
    { ...founderStep, recordedAt: "2026-09-23T05:00:00Z" },
    practitionerStep,
  ]);
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(proposedInput({ provenanceLog: lateFounderEventLog })),
    "founder-review event recordedAt 2026-09-23T05:00:00Z must precede practitioner approval",
  );
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: lateFounderEventLog })),
    "founder-review event recordedAt 2026-09-23T05:00:00Z must precede practitioner approval",
  );
});

test("refuses approval when the founder review event actor differs from the founder attestation", () => {
  const mismatchedFounder = founderAttestation({ actorId: "fixture-founder-two" });
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ founderAttestation: mismatchedFounder }),
      ),
    "does not match founder attestation actor",
  );
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(recordedInput({ founderAttestation: mismatchedFounder })),
    "does not match founder attestation actor",
  );
});

test("accepts co-timestamped founder and practitioner attestations", () => {
  const result = validateProposedPractitionerApproval(
    proposedInput({
      provenanceLog: buildLog([{ ...founderStep, recordedAt: "2026-09-23T02:00:00Z" }]),
      founderAttestation: founderAttestation({ recordedAt: "2026-09-23T02:00:00Z" }),
    }),
  );
  assert.equal(result.founderActorId, "fixture-founder-one");
});

test("refuses a proposed approval when its founder attestation and event times differ", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          founderAttestation: founderAttestation({ recordedAt: "2026-09-23T02:00:00Z" }),
        }),
      ),
    "does not temporally correspond to founder attestation",
  );
});

test("refuses a proposed approval when founder review is not the standing state", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(proposedInput({ provenanceLog: recordedApprovalLog() })),
    "not the standing review state",
  );
});

test("refuses a recorded approval when the practitioner review event is missing", () => {
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: founderApprovedLog() })),
    "practitioner-reviewed provenance event is missing",
  );
});

test("refuses a provenance log whose pack id does not match the source", () => {
  const foreignPackLog = buildLog([{ ...founderStep, packId: "fixture-other-pack" }], {
    packId: "fixture-other-pack",
  });
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ provenanceLog: foreignPackLog })),
    "does not match source-derived pack id",
  );
});

test("refuses a recorded approval after changes-requested invalidates the standing state", () => {
  const changesRequestedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
  ]);
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: changesRequestedLog })),
    "not the standing review state",
  );
});

test("keeps the recorded approval standing through eligibility and release, but not retirement", () => {
  const eligibleStep = {
    type: "artifact-eligible",
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-23T03:00:00Z",
  } as const;
  const releasedStep = {
    type: "artifact-released",
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-23T04:00:00Z",
  } as const;
  const eligibleLog = buildLog([founderStep, practitionerStep, eligibleStep]);
  assert.equal(
    verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: eligibleLog }))
      .practitionerActorId,
    "fixture-practitioner-one",
  );
  const releasedLog = buildLog([founderStep, practitionerStep, eligibleStep, releasedStep]);
  assert.equal(
    verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: releasedLog }))
      .practitionerActorId,
    "fixture-practitioner-one",
  );
  const retiredLog = buildLog([
    founderStep,
    practitionerStep,
    { type: "retired", actorId: "fixture-operator-one", recordedAt: "2026-09-23T05:00:00Z" },
  ]);
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: retiredLog })),
    "not the standing review state",
  );
});

test("refuses eligibility that does not cover every pack occupation", () => {
  const wrongScope = eligibilityFixture({ occupations: ["tailor"] });
  for (const run of [
    () => validateProposedPractitionerApproval(proposedInput({ eligibility: wrongScope })),
    () => verifyRecordedPractitionerApproval(recordedInput({ eligibility: wrongScope })),
  ]) {
    expectGateFailure(run, 'does not cover pack occupation "local-guide"');
  }
});

test("refuses inactive eligibility", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ eligibility: eligibilityFixture({ status: "inactive" }) }),
      ),
    "practitioner eligibility must be active",
  );
});

test("refuses unverified eligibility", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          eligibility: eligibilityFixture({
            verification: { method: "manual", status: "unverified", verifiedOn: "2026-09-01" },
          }),
        }),
      ),
    "practitioner eligibility must be verified",
  );
});

test("refuses eligibility that is not manually verified", () => {
  const notManual = {
    schemaVersion: 1,
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: { method: "automated", status: "verified", verifiedOn: "2026-09-01" },
    validFrom: "2026-09-01",
    validUntil: "2027-09-01",
    evidenceReferences: ["fixture:eligibility-reference-001"],
  } as unknown as PractitionerEligibility;
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ eligibility: notManual })),
    "manual",
  );
});

test("refuses approval recorded before the eligibility window opens", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          founderAttestation: founderAttestation({ recordedAt: "2026-08-14T00:00:00Z" }),
          practitionerAttestation: practitionerAttestation({ recordedAt: "2026-08-15T00:00:00Z" }),
        }),
      ),
    "not valid at review time 2026-08-15",
  );
});

test("refuses a gate evaluation before the eligibility window opens", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(proposedInput({ evaluateAt: "2026-08-15T00:00:00Z" })),
    "not valid at gate evaluation time 2026-08-15",
  );
});

test("refuses a gate evaluation time before the practitioner approval", () => {
  for (const evaluateAt of ["2026-09-01T00:00:00Z", "2026-09-23T01:00:00Z"]) {
    expectGateFailure(
      () => validateProposedPractitionerApproval(proposedInput({ evaluateAt })),
      "must not precede practitioner approval",
    );
    expectGateFailure(
      () => verifyRecordedPractitionerApproval(recordedInput({ evaluateAt })),
      "must not precede practitioner approval",
    );
  }
});

test("accepts a gate evaluation time equal to the practitioner approval time", () => {
  const evaluateAt = "2026-09-23T02:00:00Z";
  assert.equal(
    validateProposedPractitionerApproval(proposedInput({ evaluateAt })).evaluateAt,
    evaluateAt,
  );
  assert.equal(
    verifyRecordedPractitionerApproval(recordedInput({ evaluateAt })).evaluateAt,
    evaluateAt,
  );
});

test("refuses offset-crafted review times whose UTC instant falls outside the window", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          founderAttestation: founderAttestation({ recordedAt: "2026-08-30T00:00:00Z" }),
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-01T01:00:00+23:00",
          }),
        }),
      ),
    "not valid at review time 2026-08-31",
  );
});

test("refuses approval recorded after the eligibility window closes", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          founderAttestation: founderAttestation({ recordedAt: "2027-09-15T00:00:00Z" }),
          practitionerAttestation: practitionerAttestation({ recordedAt: "2027-09-16T00:00:00Z" }),
          evaluateAt: "2027-09-16T12:00:00Z",
        }),
      ),
    "not valid at review time 2027-09-16",
  );
});

test("accepts eligibility boundaries as inclusive at gate evaluation time", () => {
  const onOpen = validateProposedPractitionerApproval(
    proposedInput({
      provenanceLog: buildLog([{ ...founderStep, recordedAt: "2026-09-01T00:00:00Z" }]),
      founderAttestation: founderAttestation({ recordedAt: "2026-09-01T00:00:00Z" }),
      practitionerAttestation: practitionerAttestation({ recordedAt: "2026-09-01T00:00:00Z" }),
      evaluateAt: "2026-09-01T00:00:00Z",
    }),
  );
  assert.equal(onOpen.evaluateAt, "2026-09-01T00:00:00Z");
  const onClose = validateProposedPractitionerApproval(
    proposedInput({ evaluateAt: "2027-09-01T23:59:59Z" }),
  );
  assert.equal(onClose.evaluateAt, "2027-09-01T23:59:59Z");
});

test("an approval that was valid when recorded stops satisfying a later gate after eligibility expires", () => {
  const atRecordTime = verifyRecordedPractitionerApproval(
    recordedInput({ evaluateAt: "2026-09-23T12:00:00Z" }),
  );
  assert.equal(atRecordTime.practitionerActorId, "fixture-practitioner-one");

  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ evaluateAt: "2027-09-02T00:00:00Z" })),
    "not valid at gate evaluation time 2027-09-02",
  );
});

test("refuses stale attestation versions and digests", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          practitionerAttestation: practitionerAttestation({ packVersion: 2 }),
        }),
      ),
    "stale version",
  );
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          practitionerAttestation: practitionerAttestation({ contentDigest: staleDigest }),
        }),
      ),
    "stale digest",
  );
});

test("refuses a provenance log bound to a stale source digest", () => {
  const staleLog = buildLog([{ ...founderStep, contentDigest: staleDigest }], {
    contentDigest: staleDigest,
  });
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ provenanceLog: staleLog })),
    "source-derived digest",
  );
});

test("refuses an approver who authored the exact version under review", () => {
  const selfAuthoredLog = buildLog([founderStep], { actorId: "fixture-practitioner-one" });
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ provenanceLog: selfAuthoredLog })),
    "approval must come from an independent practitioner",
  );
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: selfAuthoredLog })),
    "approval must come from an independent practitioner",
  );
});

test("refuses an attestation that does not name the same actor as the eligibility record", () => {
  const mismatched = eligibilityFixture({ actorId: "fixture-practitioner-two" });
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ eligibility: mismatched })),
    "must name the same actor",
  );
});

test("refuses mismatched fixture classification across gate records", () => {
  const productionEligibility = eligibilityFixture({ fixtureOnly: false });
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(proposedInput({ eligibility: productionEligibility })),
    "mismatched fixture classification: eligibility record",
  );

  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ founderAttestation: founderAttestation({ fixtureOnly: false }) }),
      ),
    "mismatched fixture classification: founder attestation",
  );

  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ practitionerAttestation: practitionerAttestation({ fixtureOnly: false }) }),
      ),
    "mismatched fixture classification: practitioner attestation",
  );

  const productionProvenance = buildLog([{ ...founderStep, fixtureOnly: false }], {
    fixtureOnly: false,
  });
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(proposedInput({ provenanceLog: productionProvenance })),
    "mismatched fixture classification: provenance events",
  );
});

test("head pinning detects a truncated provenance log", () => {
  const fullLog = recordedApprovalLog();
  const head = fullLog.events[fullLog.events.length - 1]!.eventDigest;
  const pinned = verifyRecordedPractitionerApproval(
    recordedInput({ expectedHeadEventDigest: head }),
  );
  assert.equal(pinned.practitionerActorId, "fixture-practitioner-one");
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          provenanceLog: founderApprovedLog(),
          expectedHeadEventDigest: head,
        }),
      ),
    "pinned expected head",
  );
});

test("refuses a recorded practitioner-review event whose actor differs from the attestation", () => {
  const mismatchedEventLog = buildLog([
    founderStep,
    { ...practitionerStep, actorId: "fixture-practitioner-two" },
  ]);
  expectGateFailure(
    () => verifyRecordedPractitionerApproval(recordedInput({ provenanceLog: mismatchedEventLog })),
    "does not match practitioner attestation actor",
  );
});

test("refuses a recorded practitioner attestation that does not temporally correspond to the review event", () => {
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T03:00:00Z",
          }),
        }),
      ),
    "does not temporally correspond to practitioner attestation",
  );
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T01:00:00Z",
          }),
        }),
      ),
    "does not temporally correspond to practitioner attestation",
  );
});

test("refuses a recorded approval that reuses a founder attestation from a prior review cycle", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T04:00:00Z" },
    { ...practitionerStep, recordedAt: "2026-09-23T05:00:00Z" },
  ]);
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          provenanceLog: renewedLog,
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T05:00:00Z",
          }),
        }),
      ),
    "does not temporally correspond to founder attestation",
  );
});

test("refuses a proposed approval that reuses a founder attestation from a prior review cycle", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T04:00:00Z" },
  ]);
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          provenanceLog: renewedLog,
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T05:00:00Z",
          }),
        }),
      ),
    "does not match founder-review event sequence",
  );
});

test("refuses a recorded approval when the new founder event reuses the prior cycle's timestamp", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T01:00:00Z" },
    { ...practitionerStep, recordedAt: "2026-09-23T05:00:00Z" },
  ]);
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          provenanceLog: renewedLog,
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T05:00:00Z",
          }),
        }),
      ),
    "does not match founder-review event sequence",
  );
});

test("accepts a renewed review cycle whose attestations match the current cycle events", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T04:00:00Z" },
    { ...practitionerStep, recordedAt: "2026-09-23T05:00:00Z" },
  ]);
  const result = verifyRecordedPractitionerApproval(
    recordedInput({
      provenanceLog: renewedLog,
      founderAttestation: founderAttestation({
        recordedAt: "2026-09-23T04:00:00Z",
        reviewEventSequence: 5,
      }),
      practitionerAttestation: practitionerAttestation({
        recordedAt: "2026-09-23T05:00:00Z",
        reviewEventSequence: 6,
      }),
    }),
  );
  assert.equal(result.practitionerActorId, "fixture-practitioner-one");
});

test("accepts a renewed proposed cycle whose founder attestation binds the current cycle event", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T04:00:00Z" },
  ]);
  const result = validateProposedPractitionerApproval(
    proposedInput({
      provenanceLog: renewedLog,
      founderAttestation: founderAttestation({
        recordedAt: "2026-09-23T04:00:00Z",
        reviewEventSequence: 5,
      }),
      practitionerAttestation: practitionerAttestation({
        recordedAt: "2026-09-23T05:00:00Z",
        reviewEventSequence: 6,
      }),
    }),
  );
  assert.equal(result.founderActorId, "fixture-founder-one");
});

test("refuses a founder attestation whose reviewEventSequence does not name the checkpoint event", () => {
  for (const run of [
    () =>
      validateProposedPractitionerApproval(
        proposedInput({ founderAttestation: founderAttestation({ reviewEventSequence: 99 }) }),
      ),
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({ founderAttestation: founderAttestation({ reviewEventSequence: 99 }) }),
      ),
  ]) {
    expectGateFailure(run, "does not match founder-review event sequence");
  }
});

test("refuses a proposed approval that reuses a practitioner attestation from a prior review cycle", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T01:30:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T01:00:00Z" },
  ]);
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          provenanceLog: renewedLog,
          founderAttestation: founderAttestation({
            recordedAt: "2026-09-23T01:00:00Z",
            reviewEventSequence: 5,
          }),
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T05:00:00Z",
            reviewEventSequence: 3,
          }),
        }),
      ),
    "does not match next provenance event",
  );
});

test("refuses a recorded approval when the new practitioner event reuses the prior cycle's timestamp", () => {
  const renewedLog = buildLog([
    founderStep,
    practitionerStep,
    {
      type: "changes-requested",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    { ...founderStep, recordedAt: "2026-09-23T01:00:00Z" },
    { ...practitionerStep, recordedAt: "2026-09-23T02:00:00Z" },
  ]);
  expectGateFailure(
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          provenanceLog: renewedLog,
          founderAttestation: founderAttestation({
            recordedAt: "2026-09-23T01:00:00Z",
            reviewEventSequence: 5,
          }),
          practitionerAttestation: practitionerAttestation({
            recordedAt: "2026-09-23T02:00:00Z",
            reviewEventSequence: 3,
          }),
        }),
      ),
    "does not match practitioner-reviewed event sequence",
  );
});

test("refuses a practitioner attestation whose reviewEventSequence does not name its event", () => {
  for (const run of [
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          practitionerAttestation: practitionerAttestation({ reviewEventSequence: 99 }),
        }),
      ),
    () =>
      verifyRecordedPractitionerApproval(
        recordedInput({
          practitionerAttestation: practitionerAttestation({ reviewEventSequence: 99 }),
        }),
      ),
  ]) {
    expectGateFailure(run, "does not match");
    expectGateFailure(run, "reviewEventSequence");
  }
});

test("treats offset-equivalent attestation and event timestamps as the same instant", () => {
  const result = verifyRecordedPractitionerApproval(
    recordedInput({
      practitionerAttestation: practitionerAttestation({
        recordedAt: "2026-09-23T04:00:00+02:00",
      }),
    }),
  );
  assert.equal(result.practitionerActorId, "fixture-practitioner-one");
});

test("refuses attestations of the wrong kind", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          founderAttestation: founderAttestation({
            kind: "localization-review",
            actorId: "fixture-fluent-reviewer-one",
            locale: "my",
            contentReview: undefined,
            reviewEventSequence: undefined,
          }),
        }),
      ),
    'must have kind "founder-review"',
  );
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          practitionerAttestation: practitionerAttestation({
            kind: "accessibility-review",
            contentReview: undefined,
            reviewEventSequence: undefined,
          }),
        }),
      ),
    'must have kind "practitioner-review"',
  );
});

test("refuses a practitioner attestation that is not an approval", () => {
  expectGateFailure(
    () =>
      validateProposedPractitionerApproval(
        proposedInput({
          practitionerAttestation: practitionerAttestation({ outcome: "changes-requested" }),
        }),
      ),
    "an approved practitioner attestation is required",
  );
});

test("refuses a missing or malformed evaluation time", () => {
  expectGateFailure(
    () => validateProposedPractitionerApproval(proposedInput({ evaluateAt: "2026-09-23" })),
    "ISO datetime",
  );
});
