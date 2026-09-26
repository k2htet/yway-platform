import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StrictValidationError,
  appendArtifactEligibilityEvent,
  assertFixtureOnlyProvenance,
  appendProvenanceEvent,
  contentDigest,
  createGenesisProvenanceLog,
  evaluateReleaseGates,
  loadPackState,
  loadVersionAttestations,
  packSourceSchema,
  practitionerEligibilitySchema,
  reviewAttestationSchema,
  runAttestCommand,
  runNewVersionCommand,
  runStatusCommand,
  releaseGateManifestFields,
  strictParse,
  type LocalizedContent,
  type PackSource,
  type PractitionerEligibility,
  type ReleaseGateInput,
  type ReviewAttestation,
} from "../content/index.js";
import {
  commandClock,
  expectExit,
  expectFailureMessage,
  makeLocalizedContent,
  makePack,
  makeRoot,
  packSourceObject,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
  writeProvenanceLog,
} from "./content-cli-fixtures.js";

function options(root: string): { repositoryRoot: string; now: () => string } {
  return { repositoryRoot: root, now: commandClock };
}

function eligibility(overrides: Record<string, unknown> = {}): PractitionerEligibility {
  return strictParse(practitionerEligibilitySchema, {
    schemaVersion: 1,
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: { method: "manual", status: "verified", verifiedOn: "2026-09-01" },
    validFrom: "2026-01-01",
    validUntil: "2031-12-31",
    evidenceReferences: ["fixture:qualification-note"],
    ...overrides,
  });
}

function makePackWithoutAccessibility(): PackSource {
  const object = packSourceObject();
  delete object["accessibility"];
  return strictParse(packSourceSchema, object);
}

interface SetupOptions {
  readonly includeLocalization?: boolean;
  readonly includeLocalizationReview?: boolean;
  readonly includeAccessibility?: boolean;
  readonly includeAccessibilityReview?: boolean;
  readonly sponsored?: boolean;
  readonly includeSponsorshipReview?: boolean;
  readonly includeMedia?: boolean;
}

interface SetupResult {
  readonly root: string;
  readonly pack: PackSource;
  readonly localized: LocalizedContent | undefined;
  readonly attestations: readonly ReviewAttestation[];
  readonly provenanceLog: NonNullable<ReturnType<typeof loadPackState>["provenanceLog"]>;
}

function setup(optionsValue: SetupOptions = {}): SetupResult {
  const includeLocalization = optionsValue.includeLocalization ?? true;
  const includeLocalizationReview = optionsValue.includeLocalizationReview ?? true;
  const includeAccessibility = optionsValue.includeAccessibility ?? true;
  const includeAccessibilityReview = optionsValue.includeAccessibilityReview ?? true;
  const sponsored = optionsValue.sponsored ?? false;
  const includeSponsorshipReview = optionsValue.includeSponsorshipReview ?? sponsored;
  const includeMedia = optionsValue.includeMedia ?? false;
  const root = makeRoot();
  const overrides: Record<string, unknown> = sponsored
    ? {
        sponsorship: {
          sponsorName: "Fixture Sponsor",
          disclosure: "This synthetic pack is sponsored by Fixture Sponsor.",
          editorialIndependence: "The sponsor has no editorial control over content or ordering.",
          editorialControl: "independent",
          orderingInfluence: "none",
        },
      }
    : {};
  if (includeMedia) {
    overrides["accessibility"] = {
      scope: "content",
      readingOrder: ["summary", "media-one"],
      media: [
        {
          id: "media-one",
          reference: "fixture-image.png",
          alternativeText: "A synthetic local guide scene.",
          transcript: "A transcript of the synthetic local guide scene.",
        },
      ],
    };
  }
  const pack = includeAccessibility ? makePack(overrides) : makePackWithoutAccessibility();
  writePackSource(root, pack);
  const localized = includeLocalization ? makeLocalizedContent(pack) : undefined;
  if (localized !== undefined) {
    writeLocalizedContent(root, localized);
  }
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--kind",
        "founder-review",
        "--actor",
        "fixture-founder-one",
        "--outcome",
        "approved",
        "--six-part-confirmed",
        "true",
        "--exposure-before-commitment-confirmed",
        "true",
      ],
      options(root),
    ),
    0,
  );
  writeEligibility(root, "fixture-practitioner-one");
  expectExit(
    runAttestCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--kind",
        "practitioner-review",
        "--actor",
        "fixture-practitioner-one",
        "--outcome",
        "approved",
        "--six-part-confirmed",
        "true",
        "--exposure-before-commitment-confirmed",
        "true",
      ],
      options(root),
    ),
    0,
  );
  if (localized !== undefined && includeLocalizationReview) {
    expectExit(
      runAttestCommand(
        [
          "--pack",
          pack.id,
          "--version",
          "1",
          "--kind",
          "localization-review",
          "--actor",
          "fixture-localizer-one",
          "--outcome",
          "approved",
          "--locale",
          "my",
          "--fluent-burmese-confirmed",
          "true",
          "--fluent-review-evidence",
          "fixture:fluent-review-001",
        ],
        options(root),
      ),
      0,
    );
  }
  if (includeAccessibility && includeAccessibilityReview) {
    expectExit(
      runAttestCommand(
        [
          "--pack",
          pack.id,
          "--version",
          "1",
          "--kind",
          "accessibility-review",
          "--actor",
          "fixture-accessibility-reviewer-one",
          "--outcome",
          "approved",
          "--reading-order-confirmed",
          "true",
          "--media-alternatives-confirmed",
          "true",
          "--runtime-validation-deferred",
        ],
        options(root),
      ),
      0,
    );
  }
  if (includeSponsorshipReview) {
    expectExit(
      runAttestCommand(
        [
          "--pack",
          pack.id,
          "--version",
          "1",
          "--kind",
          "sponsorship-disclosure",
          "--actor",
          "fixture-sponsorship-reviewer-one",
          "--outcome",
          "approved",
          "--disclosure-confirmed",
          "true",
          "--editorial-control-preserved",
          "true",
          "--ordering-influence",
          "none",
        ],
        options(root),
      ),
      0,
    );
  }
  const state = loadPackState(root, pack.id);
  return {
    root,
    pack,
    localized,
    attestations: loadVersionAttestations(root, pack.id, 1),
    provenanceLog: state.provenanceLog!,
  };
}

function gateInput(
  setupResult: SetupResult,
  overrides: Partial<ReleaseGateInput> = {},
): ReleaseGateInput {
  return {
    pack: setupResult.pack,
    localizedContent: setupResult.localized,
    provenanceLog: setupResult.provenanceLog,
    attestations: setupResult.attestations,
    practitionerEligibility: eligibility(),
    evaluateAt: "2026-09-24T00:00:00Z",
    ...overrides,
  };
}

function expectGateFailure(run: () => unknown, fragment: string): StrictValidationError {
  try {
    run();
  } catch (error) {
    assert.ok(error instanceof StrictValidationError);
    assert.ok(
      error.message.includes(fragment),
      `expected error to include "${fragment}", received: ${error.message}`,
    );
    return error;
  }
  assert.fail("expected release gate to fail");
}

test("accepts a fixture with all S2-06 gates and preserves content-only scope", () => {
  const setupResult = setup();
  const result = evaluateReleaseGates(gateInput(setupResult));
  assert.equal(result.packId, "fixture-local-guide");
  assert.equal(result.packVersion, 1);
  assert.equal(result.contentDigest, contentDigest(setupResult.pack));
  assert.equal(result.localizedContentDigest, contentDigest(setupResult.localized!));
  assert.equal(result.localizationApproved, true);
  assert.equal(result.accessibilityApproved, true);
  assert.equal(result.sponsorship, "not-applicable");
  assert.equal(result.runtimeAccessibilityDeferred, true);
  assert.equal(result.targetUserComprehensionDeferred, true);
  assert.deepEqual(releaseGateManifestFields(result), {
    founderApproved: true,
    practitionerApproved: true,
    localizationApproved: true,
    accessibilityApproved: true,
    sponsorship: "not-applicable",
    localizedContentDigest: result.localizedContentDigest,
    runtimeAccessibilityDeferred: true,
    targetUserComprehensionDeferred: true,
  });
});

test("provides a gated artifact-eligibility append operation", () => {
  const setupResult = setup();
  const nextLog = appendArtifactEligibilityEvent({
    ...gateInput(setupResult),
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-24T01:00:00Z",
  });
  const event = nextLog.events.at(-1);
  assert.equal(event?.type, "artifact-eligible");
  assert.equal(event?.localizedContentDigest, contentDigest(setupResult.localized!));
});

test("refuses accessibility and sponsorship approval without localization before any write", () => {
  for (const kind of ["accessibility-review", "sponsorship-disclosure"] as const) {
    const first = setup({
      includeLocalization: false,
      includeAccessibilityReview: false,
      sponsored: kind === "sponsorship-disclosure",
      includeSponsorshipReview: false,
    });
    const flags =
      kind === "accessibility-review"
        ? [
            "--reading-order-confirmed",
            "true",
            "--media-alternatives-confirmed",
            "true",
            "--runtime-validation-deferred",
          ]
        : [
            "--disclosure-confirmed",
            "true",
            "--editorial-control-preserved",
            "true",
            "--ordering-influence",
            "none",
          ];
    const result = runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        kind,
        "--actor",
        "fixture-reviewer-one",
        "--outcome",
        "approved",
        ...flags,
      ],
      options(first.root),
    );
    expectExit(result, 1);
    expectFailureMessage(result, "Burmese localization is required");
    assert.deepEqual(loadPackState(first.root, first.pack.id).provenanceLog, first.provenanceLog);
    assert.deepEqual(loadVersionAttestations(first.root, first.pack.id, 1), first.attestations);
    expectExit(
      runStatusCommand(["--pack", first.pack.id, "--version", "1"], options(first.root)),
      0,
    );
  }
});

test("checks practitioner qualification again at eligibility event time", () => {
  const first = setup();
  expectGateFailure(
    () =>
      appendArtifactEligibilityEvent({
        ...gateInput(first, {
          practitionerEligibility: eligibility({ validUntil: "2026-09-26" }),
        }),
        actorId: "fixture-operator-one",
        recordedAt: "2026-09-27T00:00:00Z",
      }),
    "gate evaluation time 2026-09-27",
  );
  const lastValidDay = appendArtifactEligibilityEvent({
    ...gateInput(first, {
      practitionerEligibility: eligibility({ validUntil: "2026-09-26" }),
    }),
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-26T23:59:59Z",
  });
  assert.equal(lastValidDay.events.at(-1)?.type, "artifact-eligible");
});

test("refuses to record eligibility before its gate evaluation", () => {
  const first = setup();
  expectGateFailure(
    () =>
      appendArtifactEligibilityEvent({
        ...gateInput(first),
        actorId: "fixture-operator-one",
        recordedAt: "2026-09-23T23:59:59Z",
      }),
    "must not precede gate evaluation time",
  );
  const sameInstant = appendArtifactEligibilityEvent({
    ...gateInput(first),
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-24T06:30:00+06:30",
  });
  assert.equal(sameInstant.events.at(-1)?.type, "artifact-eligible");
});

test("requires localization, accessibility, and sponsorship reviews by evaluation time", () => {
  for (const kind of [
    "localization-review",
    "accessibility-review",
    "sponsorship-disclosure",
  ] as const) {
    const first = setup({
      includeLocalizationReview: kind !== "localization-review",
      includeAccessibilityReview: kind !== "accessibility-review",
      sponsored: kind === "sponsorship-disclosure",
      includeSponsorshipReview: false,
    });
    const flags =
      kind === "localization-review"
        ? [
            "--locale",
            "my",
            "--fluent-burmese-confirmed",
            "true",
            "--fluent-review-evidence",
            "fixture:future-review",
          ]
        : kind === "accessibility-review"
          ? [
              "--reading-order-confirmed",
              "true",
              "--media-alternatives-confirmed",
              "true",
              "--runtime-validation-deferred",
            ]
          : [
              "--disclosure-confirmed",
              "true",
              "--editorial-control-preserved",
              "true",
              "--ordering-influence",
              "none",
            ];
    expectExit(
      runAttestCommand(
        [
          "--pack",
          first.pack.id,
          "--version",
          "1",
          "--kind",
          kind,
          "--actor",
          "fixture-reviewer-one",
          "--outcome",
          "approved",
          ...flags,
        ],
        { repositoryRoot: first.root, now: () => "2026-09-25T00:00:00Z" },
      ),
      0,
    );
    const current = {
      ...gateInput(first),
      provenanceLog: loadPackState(first.root, first.pack.id).provenanceLog!,
      attestations: loadVersionAttestations(first.root, first.pack.id, 1),
    };
    expectGateFailure(() => evaluateReleaseGates(current), "must not precede");
    assert.equal(
      evaluateReleaseGates({ ...current, evaluateAt: "2026-09-25T06:30:00+06:30" })
        .localizationApproved,
      true,
    );
  }
});

test("requires fresh S2-06 reviews after a post-eligibility changes-requested cycle", () => {
  const first = setup();
  const eligibleLog = appendArtifactEligibilityEvent({
    ...gateInput(first),
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-24T01:00:00Z",
  });
  writeProvenanceLog(first.root, first.pack.id, eligibleLog);
  expectExit(
    runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        "accessibility-review",
        "--actor",
        "fixture-accessibility-reviewer-one",
        "--outcome",
        "changes-requested",
      ],
      options(first.root),
    ),
    0,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        "founder-review",
        "--actor",
        "fixture-founder-one",
        "--outcome",
        "approved",
        "--six-part-confirmed",
        "true",
        "--exposure-before-commitment-confirmed",
        "true",
      ],
      options(first.root),
    ),
    0,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        "practitioner-review",
        "--actor",
        "fixture-practitioner-one",
        "--outcome",
        "approved",
        "--six-part-confirmed",
        "true",
        "--exposure-before-commitment-confirmed",
        "true",
      ],
      options(first.root),
    ),
    0,
  );
  const stateBeforeFreshGate = loadPackState(first.root, first.pack.id);
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(first),
        provenanceLog: stateBeforeFreshGate.provenanceLog!,
        attestations: loadVersionAttestations(first.root, first.pack.id, 1),
      }),
    "fluent Burmese localization review is required",
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        "localization-review",
        "--actor",
        "fixture-localizer-one",
        "--outcome",
        "approved",
        "--locale",
        "my",
        "--fluent-burmese-confirmed",
        "true",
        "--fluent-review-evidence",
        "fixture:fluent-review-002",
      ],
      options(first.root),
    ),
    0,
  );
  const stateAfterLocalization = loadPackState(first.root, first.pack.id);
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(first),
        provenanceLog: stateAfterLocalization.provenanceLog!,
        attestations: loadVersionAttestations(first.root, first.pack.id, 1),
      }),
    "content accessibility review is required",
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--kind",
        "accessibility-review",
        "--actor",
        "fixture-accessibility-reviewer-one",
        "--outcome",
        "approved",
        "--reading-order-confirmed",
        "true",
        "--media-alternatives-confirmed",
        "true",
        "--runtime-validation-deferred",
      ],
      options(first.root),
    ),
    0,
  );
  const stateAfterFreshGate = loadPackState(first.root, first.pack.id);
  const result = evaluateReleaseGates({
    ...gateInput(first),
    provenanceLog: stateAfterFreshGate.provenanceLog!,
    attestations: loadVersionAttestations(first.root, first.pack.id, 1),
  });
  assert.equal(result.packVersion, 1);
});

test("requires fresh accessibility and sponsorship reviews in a renewed sponsored cycle", () => {
  const first = setup({ sponsored: true });
  const eligibleLog = appendArtifactEligibilityEvent({
    ...gateInput(first),
    actorId: "fixture-operator-one",
    recordedAt: "2026-09-24T01:00:00Z",
  });
  writeProvenanceLog(first.root, first.pack.id, eligibleLog);
  const attest = (args: string[]): void => {
    expectExit(runAttestCommand(args, options(first.root)), 0);
  };
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "accessibility-review",
    "--actor",
    "fixture-accessibility-reviewer-one",
    "--outcome",
    "changes-requested",
  ]);
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "founder-review",
    "--actor",
    "fixture-founder-one",
    "--outcome",
    "approved",
    "--six-part-confirmed",
    "true",
    "--exposure-before-commitment-confirmed",
    "true",
  ]);
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "practitioner-review",
    "--actor",
    "fixture-practitioner-one",
    "--outcome",
    "approved",
    "--six-part-confirmed",
    "true",
    "--exposure-before-commitment-confirmed",
    "true",
  ]);
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "localization-review",
    "--actor",
    "fixture-localizer-one",
    "--outcome",
    "approved",
    "--locale",
    "my",
    "--fluent-burmese-confirmed",
    "true",
    "--fluent-review-evidence",
    "fixture:fluent-review-003",
  ]);
  const stateAfterLocalization = loadPackState(first.root, first.pack.id);
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(first),
        provenanceLog: stateAfterLocalization.provenanceLog!,
        attestations: loadVersionAttestations(first.root, first.pack.id, 1),
      }),
    "content accessibility review is required",
  );
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "accessibility-review",
    "--actor",
    "fixture-accessibility-reviewer-one",
    "--outcome",
    "approved",
    "--reading-order-confirmed",
    "true",
    "--media-alternatives-confirmed",
    "true",
    "--runtime-validation-deferred",
  ]);
  const stateAfterAccessibility = loadPackState(first.root, first.pack.id);
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(first),
        provenanceLog: stateAfterAccessibility.provenanceLog!,
        attestations: loadVersionAttestations(first.root, first.pack.id, 1),
      }),
    "sponsorship disclosure is required",
  );
  attest([
    "--pack",
    first.pack.id,
    "--version",
    "1",
    "--kind",
    "sponsorship-disclosure",
    "--actor",
    "fixture-sponsorship-reviewer-one",
    "--outcome",
    "approved",
    "--disclosure-confirmed",
    "true",
    "--editorial-control-preserved",
    "true",
    "--ordering-influence",
    "none",
  ]);
  const stateAfterFreshReviews = loadPackState(first.root, first.pack.id);
  const result = evaluateReleaseGates({
    ...gateInput(first),
    provenanceLog: stateAfterFreshReviews.provenanceLog!,
    attestations: loadVersionAttestations(first.root, first.pack.id, 1),
  });
  assert.equal(result.sponsorship, "disclosed");
});

test("rejects prior-version S2-06 attestations for a new localized version", () => {
  const first = setup();
  const secondPack = makePack({ version: 2 });
  const secondLocalized = makeLocalizedContent(secondPack);
  writePackSource(first.root, secondPack);
  writeLocalizedContent(first.root, secondLocalized);
  expectExit(
    runNewVersionCommand(
      ["--pack", first.pack.id, "--actor", "fixture-author-one", "--from", "1"],
      options(first.root),
    ),
    0,
  );
  const secondState = loadPackState(first.root, first.pack.id);
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(first),
        pack: secondPack,
        localizedContent: secondLocalized,
        provenanceLog: secondState.provenanceLog!,
        attestations: loadVersionAttestations(first.root, first.pack.id, 1),
      }),
    "exact version scope",
  );
});

test("gated artifact eligibility refuses a non-fixture actor", () => {
  const setupResult = setup();
  expectGateFailure(
    () =>
      appendArtifactEligibilityEvent({
        ...gateInput(setupResult),
        actorId: "operator-one",
        recordedAt: "2026-09-24T01:00:00Z",
      }),
    "must be a fixture- identity",
  );
});

test("gated artifact eligibility refuses a Pack without localization", () => {
  const setupResult = setup({ includeLocalization: false, includeAccessibilityReview: false });
  expectGateFailure(
    () =>
      appendArtifactEligibilityEvent({
        ...gateInput(setupResult),
        actorId: "fixture-operator-one",
        recordedAt: "2026-09-24T01:00:00Z",
      }),
    "Burmese localization is required",
  );
});

test("accepts a media-bearing Pack with authored alternatives and transcripts", () => {
  const result = evaluateReleaseGates(gateInput(setup({ includeMedia: true })));
  assert.equal(result.accessibilityApproved, true);
});

test("rejects referenced media missing from authored reading order", () => {
  assert.throws(
    () =>
      makePack({
        accessibility: {
          scope: "content",
          readingOrder: ["summary"],
          media: [
            {
              id: "media-one",
              reference: "fixture-image.png",
              alternativeText: "A synthetic local guide scene.",
              transcript: "A transcript of the synthetic local guide scene.",
            },
          ],
        },
      }),
    StrictValidationError,
  );
});

test("accepts a sponsored fixture only with disclosure and editorial independence", () => {
  const result = evaluateReleaseGates(gateInput(setup({ sponsored: true })));
  assert.equal(result.sponsorship, "disclosed");
});

test("rejects an unsponsored Pack carrying a disclosure event", () => {
  const setupResult = setup();
  const eventLog = appendProvenanceEvent(setupResult.provenanceLog, {
    packId: setupResult.pack.id,
    packVersion: setupResult.pack.version,
    type: "sponsorship-disclosed",
    actorId: "fixture-sponsorship-reviewer-one",
    fixtureOnly: true,
    contentDigest: contentDigest(setupResult.pack),
    localizedContentDigest: contentDigest(setupResult.localized!),
    recordedAt: "2026-09-24T01:00:00Z",
  });
  expectGateFailure(
    () => evaluateReleaseGates({ ...gateInput(setupResult), provenanceLog: eventLog }),
    "sponsorship disclosure was recorded for an unsponsored pack",
  );
});

test("rejects false sponsorship disclosure or editorial-independence confirmations", () => {
  const setupResult = setup({ sponsored: true });
  for (const sponsorshipReview of [
    {
      disclosureConfirmed: false,
      editorialControlPreserved: true,
      orderingInfluence: "none" as const,
    },
    {
      disclosureConfirmed: true,
      editorialControlPreserved: false,
      orderingInfluence: "none" as const,
    },
  ]) {
    const tampered = setupResult.attestations.map((attestation) =>
      attestation.kind === "sponsorship-disclosure"
        ? { ...attestation, sponsorshipReview }
        : attestation,
    );
    assert.throws(
      () => evaluateReleaseGates({ ...gateInput(setupResult), attestations: tampered }),
      StrictValidationError,
    );
  }
});

test("rejects a production-classified Pack at the Stage 2 gate", () => {
  const setupResult = setup();
  expectGateFailure(
    () =>
      evaluateReleaseGates({
        ...gateInput(setupResult),
        pack: makePack({ fixtureOnly: false }),
      }),
    "Stage 2 release gates accept fixture-only Packs only",
  );
});

test("evaluates practitioner eligibility at the explicit release time", () => {
  const setupResult = setup();
  expectGateFailure(
    () =>
      evaluateReleaseGates(
        gateInput(setupResult, {
          practitionerEligibility: eligibility({ validUntil: "2026-09-25" }),
          evaluateAt: "2026-09-26T00:00:00Z",
        }),
      ),
    "gate evaluation time 2026-09-26",
  );
});

test("blocks eligibility when Burmese localization is missing", () => {
  const setupResult = setup({ includeLocalization: false, includeAccessibilityReview: false });
  expectGateFailure(
    () => evaluateReleaseGates(gateInput(setupResult)),
    "Burmese localization is required",
  );
});

test("blocks localized content without a fluent localization review", () => {
  const setupResult = setup({ includeLocalizationReview: false });
  expectGateFailure(
    () => evaluateReleaseGates(gateInput(setupResult)),
    "fluent Burmese localization review is required",
  );
});

test("blocks accessibility metadata without an accessibility review", () => {
  const setupResult = setup({ includeAccessibilityReview: false });
  expectGateFailure(
    () => evaluateReleaseGates(gateInput(setupResult)),
    "content accessibility review is required",
  );
});

test("blocks eligibility when accessibility metadata or review is missing", () => {
  const setupResult = setup({ includeAccessibility: false });
  expectGateFailure(
    () => evaluateReleaseGates(gateInput(setupResult)),
    "authored content accessibility metadata is required",
  );
});

test("blocks a sponsored fixture when disclosure review is missing", () => {
  const setupResult = setup({ sponsored: true, includeSponsorshipReview: false });
  expectGateFailure(
    () => evaluateReleaseGates(gateInput(setupResult)),
    "sponsorship disclosure is required",
  );
});

test("rejects media without both an alternative and transcript", () => {
  assert.throws(
    () =>
      makePack({
        accessibility: {
          scope: "content",
          readingOrder: ["summary", "media-one"],
          media: [{ id: "media-one", reference: "fixture-image.png", transcript: "A transcript." }],
        },
      }),
    StrictValidationError,
  );
});

test("rejects referenced media without a transcript", () => {
  assert.throws(
    () =>
      makePack({
        accessibility: {
          scope: "content",
          readingOrder: ["summary", "media-one"],
          media: [
            {
              id: "media-one",
              reference: "fixture-image.png",
              alternativeText: "A synthetic local guide scene.",
            },
          ],
        },
      }),
    StrictValidationError,
  );
});

test("rejects a source that claims sponsorship influence", () => {
  assert.throws(
    () =>
      makePack({
        sponsorship: {
          sponsorName: "Fixture Sponsor",
          disclosure: "Sponsored fixture.",
          editorialIndependence: "The sponsor has no editorial control.",
          editorialControl: "independent",
          orderingInfluence: "some",
        },
      }),
    StrictValidationError,
  );
});

test("rejects a localized review without fluent evidence", () => {
  assert.throws(
    () =>
      strictParse(reviewAttestationSchema, {
        schemaVersion: 1,
        packId: "fixture-local-guide",
        packVersion: 1,
        contentDigest: "a".repeat(64),
        localizedContentDigest: "b".repeat(64),
        kind: "localization-review",
        outcome: "approved",
        actorId: "fixture-localizer-one",
        fixtureOnly: true,
        locale: "my",
        reviewEventSequence: 2,
        recordedAt: "2026-09-24T00:00:00Z",
      }),
    StrictValidationError,
  );
});

test("rejects non-synthetic localization evidence for a fixture review", () => {
  assert.throws(
    () =>
      strictParse(reviewAttestationSchema, {
        schemaVersion: 1,
        packId: "fixture-local-guide",
        packVersion: 1,
        contentDigest: "a".repeat(64),
        localizedContentDigest: "b".repeat(64),
        kind: "localization-review",
        outcome: "approved",
        actorId: "fixture-localizer-one",
        fixtureOnly: true,
        locale: "my",
        reviewEventSequence: 2,
        localizationReview: {
          fluentBurmeseConfirmed: true,
          fluentReviewEvidence: "real-review-001",
        },
        recordedAt: "2026-09-24T00:00:00Z",
      }),
    StrictValidationError,
  );
});

test("rejects a localization digest that is stale for the registered version", () => {
  const setupResult = setup();
  writeLocalizedContent(
    setupResult.root,
    makeLocalizedContent(setupResult.pack, { summary: "Changed after registration." }),
  );
  expectGateFailure(
    () => loadPackState(setupResult.root, setupResult.pack.id),
    "localizedContentDigest",
  );
});

test("does not allow a review attestation to bind a different localized digest", () => {
  const setupResult = setup();
  const tampered = setupResult.attestations.map((attestation) =>
    attestation.kind === "localization-review"
      ? { ...attestation, localizedContentDigest: "c".repeat(64) }
      : attestation,
  );
  expectGateFailure(
    () => evaluateReleaseGates({ ...gateInput(setupResult), attestations: tampered }),
    "localized content",
  );
});

test("does not treat content accessibility review as runtime or device conformance", () => {
  const result = evaluateReleaseGates(gateInput(setup()));
  assert.equal(result.runtimeAccessibilityDeferred, true);
  assert.equal(result.targetUserComprehensionDeferred, true);
  assert.equal("deviceConformance" in result, false);
});

test("rejects a first localized digest on a later provenance event", () => {
  const pack = makePack();
  const digest = contentDigest(pack);
  let log = createGenesisProvenanceLog({
    packId: pack.id,
    packVersion: pack.version,
    type: "authored",
    actorId: "fixture-author-one",
    fixtureOnly: true,
    contentDigest: digest,
    recordedAt: "2026-09-24T00:00:00Z",
  });
  log = appendProvenanceEvent(log, {
    packId: pack.id,
    packVersion: pack.version,
    type: "founder-reviewed",
    actorId: "fixture-founder-one",
    fixtureOnly: true,
    contentDigest: digest,
    recordedAt: "2026-09-24T00:00:01Z",
  });
  assert.throws(
    () =>
      appendProvenanceEvent(log, {
        packId: pack.id,
        packVersion: pack.version,
        type: "accessibility-reviewed",
        actorId: "fixture-accessibility-reviewer-one",
        fixtureOnly: true,
        contentDigest: digest,
        localizedContentDigest: "b".repeat(64),
        recordedAt: "2026-09-24T00:00:02Z",
      }),
    StrictValidationError,
  );
});

test("rejects mismatched fixture classification on localized content and S2-06 attestations", () => {
  const localizedSetup = setup();
  writeLocalizedContent(
    localizedSetup.root,
    makeLocalizedContent(localizedSetup.pack, { fixtureOnly: false }),
  );
  expectGateFailure(
    () => loadPackState(localizedSetup.root, localizedSetup.pack.id),
    "localized content file",
  );

  const attestationSetup = setup();
  const tampered = attestationSetup.attestations.map((attestation) =>
    attestation.kind === "accessibility-review"
      ? { ...attestation, fixtureOnly: false }
      : attestation,
  );
  expectGateFailure(
    () => evaluateReleaseGates({ ...gateInput(attestationSetup), attestations: tampered }),
    "attestation fixtureOnly false",
  );
});

test("rejects a fixture log containing a non-fixture provenance actor", () => {
  const pack = makePack();
  const log = createGenesisProvenanceLog({
    packId: pack.id,
    packVersion: pack.version,
    type: "authored",
    actorId: "author-one",
    fixtureOnly: true,
    contentDigest: contentDigest(pack),
    recordedAt: "2026-09-24T00:00:00Z",
  });
  assert.throws(() => assertFixtureOnlyProvenance(true, log), StrictValidationError);
});

test("keeps a localized source edit from reusing the registered version", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  writeLocalizedContent(root, makeLocalizedContent(pack));
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  writeLocalizedContent(root, makeLocalizedContent(pack, { summary: "A changed translation." }));
  expectGateFailure(() => loadPackState(root, pack.id), "localizedContentDigest");
});

test("requires a fresh provenance scope for a new localized version", () => {
  const root = makeRoot();
  const first = makePack();
  writePackSource(root, first);
  writeLocalizedContent(root, makeLocalizedContent(first));
  expectExit(
    runNewVersionCommand(["--pack", first.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  const second = makePack({ version: 2 });
  writePackSource(root, second);
  writeLocalizedContent(root, makeLocalizedContent(second));
  expectExit(
    runNewVersionCommand(
      ["--pack", second.id, "--actor", "fixture-author-one", "--from", "1"],
      options(root),
    ),
    0,
  );
  const log = loadPackState(root, second.id).provenanceLog!;
  const versionEvents = log.events.filter((event) => event.packVersion === 2);
  assert.equal(versionEvents.length, 2);
  assert.equal(versionEvents[1]!.type, "localized");
});

test("rejects localized content without preview metadata", () => {
  const pack = makePack();
  assert.throws(() => makeLocalizedContent(pack, { preview: undefined }), StrictValidationError);
});

test("rejects localized experiments in a different order than the source", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  const localized = makeLocalizedContent(pack, {
    experiments: [{ ...pack.experiments[0], id: "exp-other" }, pack.experiments[0]],
  });
  writeLocalizedContent(root, localized);
  const result = runNewVersionCommand(
    ["--pack", pack.id, "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "same ordered experiment IDs");
});

test("uses the exact localized content digest in provenance events", () => {
  const root = makeRoot();
  const pack = makePack();
  const localized = makeLocalizedContent(pack);
  writePackSource(root, pack);
  writeLocalizedContent(root, localized);
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  const state = loadPackState(root, pack.id);
  const event = state.provenanceLog!.events.find((candidate) => candidate.type === "localized");
  assert.ok(event !== undefined);
  assert.equal(event.localizedContentDigest, contentDigest(localized));
});
