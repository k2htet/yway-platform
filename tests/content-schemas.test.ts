import assert from "node:assert/strict";
import { test } from "node:test";
import { stringify } from "yaml";
import {
  StrictValidationError,
  assertUniquePackIds,
  localizedContentSchema,
  packSourceSchema,
  practitionerEligibilitySchema,
  provenanceEventLogSchema,
  provenanceEventSchema,
  releaseManifestSchema,
  reviewAttestationSchema,
  snapshotIndexSchema,
  strictParse,
  parseStrictYaml,
} from "../content/schemas/index.js";

const digest = "a".repeat(64);
const otherDigest = "b".repeat(64);

type Overrides = Record<string, unknown>;

function expectStrictFailure(run: () => unknown, fragment?: string): StrictValidationError {
  try {
    run();
  } catch (error) {
    assert.ok(
      error instanceof StrictValidationError,
      `expected StrictValidationError, received ${error instanceof Error ? error.message : String(error)}`,
    );
    if (fragment !== undefined) {
      assert.ok(
        error.message.includes(fragment),
        `expected error to include "${fragment}", received: ${error.message}`,
      );
    }
    return error;
  }
  assert.fail("expected validation to fail, but it succeeded");
}

function validExperiment(overrides: Overrides = {}): Record<string, unknown> {
  return {
    id: "exp-talk-to-worker",
    title: "Talk to a local worker",
    question: "What is it really like to do this work day to day?",
    action: "Interview one person who already does this job.",
    timebox: "45 minutes this week",
    whatToNotice: "Which parts of the work felt energizing or draining.",
    reflection: "Write three sentences about what you noticed.",
    nextFork: "Shadow the same role for half a day before any course or application.",
    ...overrides,
  };
}

function validPack(overrides: Overrides = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "fixture-local-guide",
    version: 1,
    fixtureOnly: true,
    canonicalLanguage: "en-simple",
    aiAssisted: true,
    title: "Try being a local guide",
    summary: "A clearly synthetic pack for exercising the Stage 2 content pipeline.",
    preview: {
      headline: "Try a short guide trial",
      description: "Talk to one local guide about a normal working day.",
    },
    limitations: ["This synthetic pack does not replace real workplace experience."],
    experiments: [validExperiment()],
    authoredAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

function validLocalizedContent(overrides: Overrides = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    locale: "my",
    fixtureOnly: true,
    title: "Synthetic Burmese title",
    summary: "Synthetic Burmese summary for the fixture pack.",
    limitations: ["Synthetic Burmese limitation line."],
    experiments: [
      {
        id: "exp-talk-to-worker",
        title: "Synthetic experiment title",
        question: "Synthetic question.",
        action: "Synthetic action.",
        timebox: "Synthetic timebox.",
        whatToNotice: "Synthetic noticing guidance.",
        reflection: "Synthetic reflection prompt.",
        nextFork: "Synthetic reversible next fork.",
      },
    ],
    ...overrides,
  };
}

function validEligibility(overrides: Overrides = {}): Record<string, unknown> {
  return {
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
  };
}

function validAttestation(overrides: Overrides = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: digest,
    kind: "founder-review",
    outcome: "approved",
    actorId: "fixture-founder-one",
    fixtureOnly: true,
    recordedAt: "2026-09-23T01:00:00Z",
    contentReview: {
      sixPartStructureConfirmed: true,
      exposureBeforeCommitmentConfirmed: true,
    },
    ...overrides,
  };
}

function validEvent(overrides: Overrides = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    sequence: 1,
    type: "authored",
    actorId: "fixture-author-one",
    fixtureOnly: true,
    contentDigest: digest,
    previousEventDigest: null,
    eventDigest: otherDigest,
    recordedAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

function validManifest(overrides: Overrides = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: digest,
    fixtureOnly: true,
    classification: "fixture",
    releasedAt: "2026-09-23T02:00:00Z",
    bundle: {
      path: "bundles/fixture-local-guide/1/bundle.json",
      digest,
    },
    gates: {
      founderApproved: true,
      practitionerApproved: true,
      localizationApproved: true,
      accessibilityApproved: true,
      sponsorship: "not-applicable",
    },
    ...overrides,
  };
}

function snapshotEntry(overrides: Overrides = {}): Record<string, unknown> {
  return {
    kind: "bundle",
    packId: "fixture-local-guide",
    packVersion: 1,
    path: "bundles/fixture-local-guide/1/bundle.json",
    digest,
    ...overrides,
  };
}

test("accepts a valid pack source", () => {
  const parsed = strictParse(packSourceSchema, validPack());
  assert.equal(parsed.id, "fixture-local-guide");
  assert.equal(parsed.experiments.length, 1);
});

test("accepts a sponsored pack when disclosure fields are complete", () => {
  const parsed = strictParse(
    packSourceSchema,
    validPack({
      sponsorship: {
        sponsorName: "Fixture Sponsor",
        disclosure: "This synthetic pack is sponsored by Fixture Sponsor.",
        editorialIndependence:
          "The sponsor has no editorial control over ranking or content influence.",
      },
    }),
  );
  assert.equal(parsed.sponsorship?.sponsorName, "Fixture Sponsor");
});

test("rejects sponsorship without editorial independence", () => {
  expectStrictFailure(
    () =>
      strictParse(
        packSourceSchema,
        validPack({
          sponsorship: {
            sponsorName: "Fixture Sponsor",
            disclosure: "This synthetic pack is sponsored by Fixture Sponsor.",
          },
        }),
      ),
    "editorialIndependence",
  );
});

test("rejects unknown fields on pack source", () => {
  expectStrictFailure(
    () => strictParse(packSourceSchema, validPack({ surpriseField: "nope" })),
    "Unrecognized key",
  );
});

const prohibitedRootKey = ["career", "Fit", "Score"].join("");
const prohibitedNestedKey = ["employability", "Score"].join("");

test("rejects prohibited scoring fields at the pack root", () => {
  expectStrictFailure(
    () => strictParse(packSourceSchema, validPack({ [prohibitedRootKey]: 90 })),
    "prohibited scoring",
  );
});

test("rejects prohibited scoring fields nested inside experiments", () => {
  expectStrictFailure(
    () =>
      strictParse(
        packSourceSchema,
        validPack({ experiments: [validExperiment({ [prohibitedNestedKey]: 12 })] }),
      ),
    "prohibited scoring",
  );
});

const sixPartFields = [
  "question",
  "action",
  "timebox",
  "whatToNotice",
  "reflection",
  "nextFork",
] as const;

for (const field of sixPartFields) {
  test(`rejects an experiment missing ${field}`, () => {
    const experiment = validExperiment();
    delete experiment[field];
    expectStrictFailure(
      () => strictParse(packSourceSchema, validPack({ experiments: [experiment] })),
      field,
    );
  });
}

test("rejects a blank six-part experiment field", () => {
  expectStrictFailure(
    () =>
      strictParse(
        packSourceSchema,
        validPack({ experiments: [validExperiment({ question: "   " })] }),
      ),
    "must not be blank",
  );
});

test("rejects duplicate experiment IDs inside a pack", () => {
  expectStrictFailure(
    () =>
      strictParse(
        packSourceSchema,
        validPack({ experiments: [validExperiment(), validExperiment()] }),
      ),
    "duplicate experiment ID",
  );
});

test("rejects unsafe pack identifiers", () => {
  for (const id of ["Fixture Pack", "fixture/pack", "../escape", "1-fixture", "FIXTURE"]) {
    expectStrictFailure(() => strictParse(packSourceSchema, validPack({ id })), "identifier");
  }
});

test("rejects invalid pack versions", () => {
  for (const version of [0, -1, 1.5, "1", true]) {
    expectStrictFailure(() => strictParse(packSourceSchema, validPack({ version })));
  }
});

test("rejects an empty experiments array", () => {
  expectStrictFailure(() => strictParse(packSourceSchema, validPack({ experiments: [] })));
});

test("rejects a missing limitations list", () => {
  const pack = validPack();
  delete pack["limitations"];
  expectStrictFailure(() => strictParse(packSourceSchema, pack), "limitations");
});

test("rejects a non-simple canonical language", () => {
  expectStrictFailure(
    () => strictParse(packSourceSchema, validPack({ canonicalLanguage: "en" })),
    "canonicalLanguage",
  );
});

test("rejects malformed YAML", () => {
  expectStrictFailure(() => parseStrictYaml(packSourceSchema, "a: [1,\n"), "invalid YAML");
});

test("rejects duplicate YAML mapping keys", () => {
  expectStrictFailure(
    () => parseStrictYaml(packSourceSchema, "schemaVersion: 1\nschemaVersion: 1\n"),
    "invalid YAML",
  );
});

test("rejects YAML aliases", () => {
  expectStrictFailure(
    () => parseStrictYaml(packSourceSchema, "anchor: &value 1\nother: *value\n"),
    "invalid YAML",
  );
});

test("rejects a YAML root that is not a mapping", () => {
  expectStrictFailure(() => parseStrictYaml(packSourceSchema, "- 1\n"), "YAML root");
});

test("accepts a valid pack round-tripped through strict YAML", () => {
  const parsed = parseStrictYaml(packSourceSchema, stringify(validPack()));
  assert.equal(parsed.id, "fixture-local-guide");
});

test("rejects duplicate pack IDs across sources", () => {
  expectStrictFailure(
    () => assertUniquePackIds([{ id: "fixture-local-guide" }, { id: "fixture-local-guide" }]),
    "duplicate pack ID",
  );
  assertUniquePackIds([{ id: "fixture-local-guide" }, { id: "fixture-other-pack" }]);
});

test("accepts valid localized content", () => {
  const parsed = strictParse(localizedContentSchema, validLocalizedContent());
  assert.equal(parsed.locale, "my");
});

test("rejects localized content missing a six-part field", () => {
  const experiment = validLocalizedContent().experiments as Record<string, unknown>[];
  const first = experiment[0];
  assert.ok(first !== undefined);
  delete first["nextFork"];
  expectStrictFailure(
    () => strictParse(localizedContentSchema, validLocalizedContent({ experiments: [first] })),
    "nextFork",
  );
});

test("rejects localized content for an unsupported locale", () => {
  expectStrictFailure(
    () => strictParse(localizedContentSchema, validLocalizedContent({ locale: "en" })),
    "locale",
  );
});

test("rejects duplicate localized experiment IDs", () => {
  const experiments = validLocalizedContent().experiments as Record<string, unknown>[];
  const first = experiments[0];
  assert.ok(first !== undefined);
  expectStrictFailure(
    () =>
      strictParse(localizedContentSchema, validLocalizedContent({ experiments: [first, first] })),
    "duplicate experiment ID",
  );
});

test("accepts valid practitioner eligibility", () => {
  const parsed = strictParse(practitionerEligibilitySchema, validEligibility());
  assert.equal(parsed.status, "active");
});

test("rejects eligibility whose validity window is inverted", () => {
  expectStrictFailure(
    () =>
      strictParse(
        practitionerEligibilitySchema,
        validEligibility({ validFrom: "2026-09-01", validUntil: "2026-08-01" }),
      ),
    "validUntil",
  );
});

test("rejects evidence references that look like paths or personal data", () => {
  expectStrictFailure(
    () =>
      strictParse(
        practitionerEligibilitySchema,
        validEligibility({ evidenceReferences: ["credentials/passport.png"] }),
      ),
    "evidenceReferences",
  );
});

test("rejects duplicate occupation scopes", () => {
  expectStrictFailure(
    () =>
      strictParse(
        practitionerEligibilitySchema,
        validEligibility({ occupations: ["local-guide", "local-guide"] }),
      ),
    "duplicate occupation ID",
  );
});

test("accepts a founder approval attestation", () => {
  const parsed = strictParse(reviewAttestationSchema, validAttestation());
  assert.equal(parsed.kind, "founder-review");
});

test("rejects a founder attestation without content review confirmation", () => {
  const attestation = validAttestation();
  delete attestation["contentReview"];
  expectStrictFailure(() => strictParse(reviewAttestationSchema, attestation), "contentReview");
});

test("requires exposure-before-commitment confirmation flags to be present", () => {
  expectStrictFailure(
    () =>
      strictParse(
        reviewAttestationSchema,
        validAttestation({
          contentReview: { sixPartStructureConfirmed: true },
        }),
      ),
    "contentReview",
  );
});

test("rejects a practitioner attestation without content review confirmation", () => {
  const attestation = validAttestation({
    kind: "practitioner-review",
    actorId: "fixture-practitioner-one",
  });
  delete attestation["contentReview"];
  expectStrictFailure(() => strictParse(reviewAttestationSchema, attestation), "contentReview");
});

test("accepts a localization-review attestation with locale", () => {
  const parsed = strictParse(
    reviewAttestationSchema,
    validAttestation({
      kind: "localization-review",
      actorId: "fixture-fluent-reviewer-one",
      locale: "my",
      contentReview: undefined,
    }),
  );
  assert.equal(parsed.locale, "my");
});

test("rejects a localization-review attestation without locale", () => {
  const attestation = validAttestation({
    kind: "localization-review",
    actorId: "fixture-fluent-reviewer-one",
  });
  delete attestation["contentReview"];
  expectStrictFailure(() => strictParse(reviewAttestationSchema, attestation), "locale");
});

test("rejects content review confirmation on gate-only attestations", () => {
  expectStrictFailure(
    () => strictParse(reviewAttestationSchema, validAttestation({ kind: "accessibility-review" })),
    "contentReview is not allowed",
  );
});

test("rejects unknown attestation outcomes and malformed digests", () => {
  expectStrictFailure(() =>
    strictParse(reviewAttestationSchema, validAttestation({ outcome: "approved-ish" })),
  );
  expectStrictFailure(
    () => strictParse(reviewAttestationSchema, validAttestation({ contentDigest: "not-a-digest" })),
    "sha256",
  );
});

test("accepts a changes-requested attestation", () => {
  const parsed = strictParse(
    reviewAttestationSchema,
    validAttestation({ outcome: "changes-requested", note: "Next fork commits too early." }),
  );
  assert.equal(parsed.outcome, "changes-requested");
});

test("accepts a genesis provenance event", () => {
  const parsed = strictParse(provenanceEventSchema, validEvent());
  assert.equal(parsed.previousEventDigest, null);
});

test("rejects non-positive provenance sequence numbers", () => {
  for (const sequence of [0, -1, 1.5]) {
    expectStrictFailure(() => strictParse(provenanceEventSchema, validEvent({ sequence })));
  }
});

test("accepts a valid provenance event log", () => {
  const parsed = strictParse(provenanceEventLogSchema, {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    events: [validEvent()],
  });
  assert.equal(parsed.events.length, 1);
});

test("rejects duplicate provenance sequences in a log", () => {
  expectStrictFailure(
    () =>
      strictParse(provenanceEventLogSchema, {
        schemaVersion: 1,
        packId: "fixture-local-guide",
        events: [validEvent(), validEvent({ eventDigest: otherDigest })],
      }),
    "duplicate provenance sequence",
  );
});

test("rejects provenance events whose pack ID does not match the log", () => {
  expectStrictFailure(
    () =>
      strictParse(provenanceEventLogSchema, {
        schemaVersion: 1,
        packId: "fixture-other-pack",
        events: [validEvent()],
      }),
    "does not match log packId",
  );
});

test("rejects an empty provenance log", () => {
  expectStrictFailure(() =>
    strictParse(provenanceEventLogSchema, {
      schemaVersion: 1,
      packId: "fixture-local-guide",
      events: [],
    }),
  );
});

test("accepts a valid release manifest", () => {
  const parsed = strictParse(releaseManifestSchema, validManifest());
  assert.equal(parsed.classification, "fixture");
});

test("rejects production classification for fixture-only records", () => {
  expectStrictFailure(
    () => strictParse(releaseManifestSchema, validManifest({ classification: "production" })),
    "fixtureOnly records must not be classified as production",
  );
});

test("rejects release manifests with unmet gates", () => {
  expectStrictFailure(
    () =>
      strictParse(
        releaseManifestSchema,
        validManifest({
          gates: {
            founderApproved: true,
            practitionerApproved: false,
            localizationApproved: true,
            accessibilityApproved: true,
            sponsorship: "not-applicable",
          },
        }),
      ),
    "practitionerApproved",
  );
});

test("rejects unsafe bundle paths in release manifests", () => {
  expectStrictFailure(
    () =>
      strictParse(
        releaseManifestSchema,
        validManifest({
          bundle: { path: "../outside/bundle.json", digest },
        }),
      ),
    "bundle.path",
  );
});

test("accepts a snapshot index containing a bundle and its release manifest", () => {
  const parsed = strictParse(snapshotIndexSchema, {
    schemaVersion: 1,
    entries: [
      snapshotEntry(),
      snapshotEntry({
        kind: "release-manifest",
        path: "manifests/fixture-local-guide/1/manifest.json",
        digest: otherDigest,
      }),
      snapshotEntry({
        kind: "retirement-notice",
        path: "retirements/fixture-local-guide/1.json",
        digest,
      }),
    ],
  });
  assert.equal(parsed.entries.length, 3);
});

test("rejects duplicate snapshot paths", () => {
  expectStrictFailure(
    () =>
      strictParse(snapshotIndexSchema, {
        schemaVersion: 1,
        entries: [snapshotEntry(), snapshotEntry()],
      }),
    "duplicate snapshot path",
  );
});

test("rejects a second bundle for the same pack version", () => {
  expectStrictFailure(
    () =>
      strictParse(snapshotIndexSchema, {
        schemaVersion: 1,
        entries: [
          snapshotEntry(),
          snapshotEntry({ path: "bundles/fixture-local-guide/1/other.json" }),
        ],
      }),
    "duplicate bundle",
  );
});

test("rejects absolute snapshot paths", () => {
  expectStrictFailure(
    () =>
      strictParse(snapshotIndexSchema, {
        schemaVersion: 1,
        entries: [snapshotEntry({ path: "/bundles/fixture-local-guide/1/bundle.json" })],
      }),
    "entries.0.path",
  );
});
