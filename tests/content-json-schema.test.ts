import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";
import {
  generatedSchemas,
  retirementNoticeSchema,
  retirementRecordSchema,
  strictParse,
  StrictValidationError,
} from "../content/schemas/index.js";
import {
  renderAllGeneratedSchemas,
  renderGeneratedSchema,
  schemaFileName,
} from "../content/schemas/generate.js";

const generatedDirectory = fileURLToPath(new URL("../content/generated/", import.meta.url));

function compileGenerated(name: string): ValidateFunction<Record<string, unknown>> {
  const rendered = renderAllGeneratedSchemas().get(schemaFileName(name));
  assert.ok(rendered !== undefined, `generated schema ${name} must exist`);
  const ajv = new Ajv2020({ strict: true });
  addFormats.default(ajv);
  return ajv.compile<Record<string, unknown>>(JSON.parse(rendered) as Record<string, unknown>);
}

function firstValidationError(validate: ValidateFunction<Record<string, unknown>>): string {
  const first: ErrorObject | undefined = validate.errors?.[0];
  return first === undefined ? "no validation error recorded" : (first.message ?? first.keyword);
}

test("JSON Schema rendering is byte-deterministic across runs", () => {
  const first = renderAllGeneratedSchemas();
  const second = renderAllGeneratedSchemas();

  assert.equal(first.size, second.size);
  for (const [name, content] of first) {
    assert.equal(second.get(name), content, `${name} differed between renders`);
  }
});

test("every catalog schema renders to a stable JSON object document", () => {
  for (const entry of generatedSchemas) {
    const rendered = renderGeneratedSchema(entry.name, entry.schema);
    assert.ok(rendered.endsWith("\n"), `${entry.name} must end with a newline`);
    const parsed: unknown = JSON.parse(rendered);
    assert.equal(typeof parsed, "object");
    assert.ok(parsed !== null);
    assert.equal((parsed as { type?: string }).type, "object");
    assert.ok(
      typeof (parsed as { $comment?: string }).$comment === "string",
      `${entry.name} must declare its runtime-only governance limits`,
    );
  }
});

test("committed JSON Schema files match the runtime schema catalog", () => {
  const rendered = renderAllGeneratedSchemas();
  const committedFiles = readdirSync(generatedDirectory)
    .filter((name) => name.endsWith(".schema.json"))
    .sort();

  assert.deepEqual(
    committedFiles,
    [...rendered.keys()].sort(),
    "committed schema files must match the catalog exactly",
  );

  for (const [name, content] of rendered) {
    const committed = readFileSync(`${generatedDirectory}${name}`, "utf8");
    assert.equal(
      committed,
      content,
      `${schemaFileName(name)} is out of date; run pnpm content:schemas`,
    );
  }
});

test("generated pack source schema rejects unknown properties", () => {
  const rendered = renderAllGeneratedSchemas().get("pack-source.schema.json");
  assert.ok(rendered !== undefined);
  const parsed = JSON.parse(rendered) as { additionalProperties?: boolean };
  assert.equal(parsed.additionalProperties, false);
});

test("generated pack source schema requires every six-part experiment field", () => {
  const rendered = renderAllGeneratedSchemas().get("pack-source.schema.json");
  assert.ok(rendered !== undefined);
  const parsed = JSON.parse(rendered) as {
    properties?: {
      experiments?: {
        items?: {
          type?: string;
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        };
      };
    };
  };
  const experimentItems = parsed.properties?.experiments?.items;
  assert.ok(experimentItems !== undefined);
  assert.equal(experimentItems.type, "object");
  assert.equal(experimentItems.additionalProperties, false);

  const requiredFields = experimentItems.required ?? [];
  for (const field of ["question", "action", "timebox", "whatToNotice", "reflection", "nextFork"]) {
    assert.ok(
      requiredFields.includes(field),
      `generated schema must require experiment field ${field}`,
    );
    assert.ok(
      experimentItems.properties?.[field] !== undefined,
      `generated schema must declare experiment field ${field}`,
    );
  }
});

const generatedDigest = "a".repeat(64);

function validGeneratedAttestation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: generatedDigest,
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
  };
}

function validGeneratedManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: generatedDigest,
    fixtureOnly: true,
    classification: "fixture",
    releasedAt: "2026-09-23T02:00:00Z",
    bundle: {
      path: "bundles/fixture-local-guide/1/bundle.json",
      digest: generatedDigest,
    },
    gates: {
      founderApproved: true,
      practitionerApproved: true,
      localizationApproved: true,
      accessibilityApproved: true,
      sponsorship: "not-applicable",
      localizedContentDigest: generatedDigest,
      runtimeAccessibilityDeferred: true,
      targetUserComprehensionDeferred: true,
    },
    ...overrides,
  };
}

test("generated attestation schema enforces founder/practitioner content review conditionals", () => {
  const validate = compileGenerated("review-attestation");

  assert.equal(validate(validGeneratedAttestation()), true, firstValidationError(validate));

  const missingContentReview = validGeneratedAttestation();
  delete missingContentReview["contentReview"];
  assert.equal(validate(missingContentReview), false, "approved attestation needs contentReview");
  assert.ok(
    (validate.errors ?? []).some((error) => error.keyword === "required"),
    firstValidationError(validate),
  );

  const falseFlags = validGeneratedAttestation({
    contentReview: {
      sixPartStructureConfirmed: false,
      exposureBeforeCommitmentConfirmed: true,
    },
  });
  assert.equal(validate(falseFlags), false, "approved attestation cannot confirm false flags");

  const withLocale = validGeneratedAttestation({ locale: "my" });
  assert.equal(validate(withLocale), false, "founder attestations must not carry a locale");

  const missingSequence = validGeneratedAttestation();
  delete missingSequence["reviewEventSequence"];
  assert.equal(validate(missingSequence), false, "founder attestations need reviewEventSequence");

  const practitionerWithSequence = validGeneratedAttestation({
    kind: "practitioner-review",
    actorId: "fixture-practitioner-one",
  });
  assert.equal(validate(practitionerWithSequence), true, firstValidationError(validate));

  const practitionerMissingSequence = validGeneratedAttestation({
    kind: "practitioner-review",
    actorId: "fixture-practitioner-one",
  });
  delete practitionerMissingSequence["reviewEventSequence"];
  assert.equal(
    validate(practitionerMissingSequence),
    false,
    "practitioner attestations need reviewEventSequence",
  );

  const localizationWithSequence = validGeneratedAttestation({
    kind: "localization-review",
    actorId: "fixture-fluent-reviewer-one",
    locale: "my",
    localizedContentDigest: generatedDigest,
    localizationReview: {
      fluentBurmeseConfirmed: true,
      fluentReviewEvidence: "fixture:fluent-review-001",
    },
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  delete localizationWithSequence["contentReview"];
  assert.equal(validate(localizationWithSequence), true, firstValidationError(validate));
});

test("generated attestation schema enforces localization-review locale conditionals", () => {
  const validate = compileGenerated("review-attestation");

  const withoutLocale = validGeneratedAttestation({
    kind: "localization-review",
    actorId: "fixture-fluent-reviewer-one",
    localizedContentDigest: generatedDigest,
    localizationReview: {
      fluentBurmeseConfirmed: true,
      fluentReviewEvidence: "fixture:fluent-review-001",
    },
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  delete withoutLocale["contentReview"];
  assert.equal(validate(withoutLocale), false, "localization-review requires locale");

  const withLocale = validGeneratedAttestation({
    kind: "localization-review",
    actorId: "fixture-fluent-reviewer-one",
    locale: "my",
    localizedContentDigest: generatedDigest,
    localizationReview: {
      fluentBurmeseConfirmed: true,
      fluentReviewEvidence: "fixture:fluent-review-001",
    },
    reviewEventSequence: 3,
  });
  delete withLocale["contentReview"];
  assert.equal(validate(withLocale), true, firstValidationError(validate));
  const changesRequested = validGeneratedAttestation({
    kind: "localization-review",
    outcome: "changes-requested",
    actorId: "fixture-localizer-one",
    locale: "my",
    localizedContentDigest: generatedDigest,
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  delete changesRequested["contentReview"];
  assert.equal(validate(changesRequested), true, firstValidationError(validate));
});

test("generated attestation schema enforces localization, accessibility, and sponsorship evidence", () => {
  const validate = compileGenerated("review-attestation");

  const localization = validGeneratedAttestation({
    kind: "localization-review",
    actorId: "fixture-localizer-one",
    locale: "my",
    localizedContentDigest: generatedDigest,
    localizationReview: {
      fluentBurmeseConfirmed: true,
      fluentReviewEvidence: "fixture:fluent-review-001",
    },
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  assert.equal(validate(localization), true, firstValidationError(validate));
  const missingFluentEvidence = structuredClone(localization);
  delete missingFluentEvidence["localizationReview"];
  assert.equal(validate(missingFluentEvidence), false, "localization evidence is required");
  const notFluent = structuredClone(localization);
  notFluent["localizationReview"] = {
    fluentBurmeseConfirmed: false,
    fluentReviewEvidence: "fixture:fluent-review-001",
  };
  assert.equal(validate(notFluent), false, "approved localization must be fluent");
  const nonFixtureEvidence = structuredClone(localization);
  nonFixtureEvidence["localizationReview"] = {
    fluentBurmeseConfirmed: true,
    fluentReviewEvidence: "manual-review-001",
  };
  assert.equal(
    validate(nonFixtureEvidence),
    false,
    "fixture localization evidence must be synthetic",
  );

  const accessibility = validGeneratedAttestation({
    kind: "accessibility-review",
    accessibilityReview: {
      readingOrderConfirmed: true,
      referencedMediaAlternativesConfirmed: true,
      runtimeValidationDeferred: true,
    },
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  assert.equal(validate(accessibility), true, firstValidationError(validate));
  const runtimeClaim = structuredClone(accessibility);
  runtimeClaim["accessibilityReview"] = {
    readingOrderConfirmed: true,
    referencedMediaAlternativesConfirmed: true,
    runtimeValidationDeferred: false,
  };
  assert.equal(validate(runtimeClaim), false, "runtime validation must remain deferred");
  const missingAccessibilityEvidence = structuredClone(accessibility);
  delete missingAccessibilityEvidence["accessibilityReview"];
  assert.equal(validate(missingAccessibilityEvidence), false, "accessibility evidence is required");
  const falseReadingOrder = structuredClone(accessibility);
  falseReadingOrder["accessibilityReview"] = {
    readingOrderConfirmed: false,
    referencedMediaAlternativesConfirmed: true,
    runtimeValidationDeferred: true,
  };
  assert.equal(validate(falseReadingOrder), false, "reading-order confirmation is required");
  const falseMediaAlternatives = structuredClone(accessibility);
  falseMediaAlternatives["accessibilityReview"] = {
    readingOrderConfirmed: true,
    referencedMediaAlternativesConfirmed: false,
    runtimeValidationDeferred: true,
  };
  assert.equal(
    validate(falseMediaAlternatives),
    false,
    "media-alternative confirmation is required",
  );

  const sponsorship = validGeneratedAttestation({
    kind: "sponsorship-disclosure",
    sponsorshipReview: {
      disclosureConfirmed: true,
      editorialControlPreserved: true,
      orderingInfluence: "none",
    },
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  assert.equal(validate(sponsorship), true, firstValidationError(validate));
  const influenced = structuredClone(sponsorship);
  influenced["sponsorshipReview"] = {
    disclosureConfirmed: true,
    editorialControlPreserved: true,
    orderingInfluence: "some",
  };
  assert.equal(validate(influenced), false, "sponsorship cannot influence ordering");
  const missingSponsorshipEvidence = structuredClone(sponsorship);
  delete missingSponsorshipEvidence["sponsorshipReview"];
  assert.equal(validate(missingSponsorshipEvidence), false, "sponsorship evidence is required");
  const falseDisclosure = structuredClone(sponsorship);
  falseDisclosure["sponsorshipReview"] = {
    disclosureConfirmed: false,
    editorialControlPreserved: true,
    orderingInfluence: "none",
  };
  assert.equal(validate(falseDisclosure), false, "sponsorship disclosure must be confirmed");
  const sponsorControlLost = structuredClone(sponsorship);
  sponsorControlLost["sponsorshipReview"] = {
    disclosureConfirmed: true,
    editorialControlPreserved: false,
    orderingInfluence: "none",
  };
  assert.equal(validate(sponsorControlLost), false, "sponsorship must preserve editorial control");

  for (const record of [localization, accessibility, sponsorship]) {
    const missingSequence = structuredClone(record);
    delete missingSequence["reviewEventSequence"];
    assert.equal(validate(missingSequence), false, "every review kind must bind an event sequence");
  }

  const accessibilityChanges = validGeneratedAttestation({
    kind: "accessibility-review",
    outcome: "changes-requested",
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  delete accessibilityChanges["contentReview"];
  assert.equal(validate(accessibilityChanges), true, firstValidationError(validate));
  const sponsorshipChanges = validGeneratedAttestation({
    kind: "sponsorship-disclosure",
    outcome: "changes-requested",
    contentReview: undefined,
    reviewEventSequence: 3,
  });
  delete sponsorshipChanges["contentReview"];
  assert.equal(validate(sponsorshipChanges), true, firstValidationError(validate));
});

test("generated manifest schema rejects production classification for fixture records", () => {
  const validate = compileGenerated("release-manifest");

  assert.equal(validate(validGeneratedManifest()), true, firstValidationError(validate));
  assert.equal(
    validate(validGeneratedManifest({ classification: "production" })),
    false,
    "fixtureOnly manifest cannot be production-classified",
  );
});

function runtimeValidPackFixture(): Record<string, unknown> {
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
        question: "What is it really like?",
        action: "Interview one person.",
        timebox: "45 minutes this week",
        whatToNotice: "What felt energizing or draining.",
        reflection: "Write three sentences.",
        nextFork: "Shadow the role for half a day before any commitment.",
      },
    ],
    authoredAt: "2026-09-23T00:00:00Z",
  };
}

function runtimeValidLocalizedFixture(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    locale: "my",
    fixtureOnly: true,
    preview: {
      headline: "Synthetic Burmese preview headline",
      description: "Synthetic Burmese preview description.",
    },
    title: "Try being a local guide (Myanmar)",
    summary: "A localized synthetic pack exercising the Stage 2 content pipeline.",
    limitations: ["This synthetic pack does not replace real workplace experience."],
    experiments: [
      {
        id: "exp-talk-to-worker",
        title: "Talk to a local worker (Myanmar)",
        question: "What is it really like?",
        action: "Interview one person.",
        timebox: "45 minutes this week",
        whatToNotice: "What felt energizing or draining.",
        reflection: "Write three sentences.",
        nextFork: "Shadow the role for half a day before any commitment.",
      },
    ],
  };
}

test("generated pack source schema accepts a runtime-valid pack fixture", () => {
  const validate = compileGenerated("pack-source");
  const pack = runtimeValidPackFixture();
  assert.equal(validate(pack), true, firstValidationError(validate));

  const duplicateOccupations = { ...pack, occupations: ["local-guide", "local-guide"] };
  assert.equal(validate(duplicateOccupations), false, "duplicate occupations must be rejected");
  assert.ok(
    (validate.errors ?? []).some((error) => error.keyword === "uniqueItems"),
    firstValidationError(validate),
  );
});

test("generated pack source schema rejects non-independent sponsorship", () => {
  const validate = compileGenerated("pack-source");
  const pack = runtimeValidPackFixture();
  const sponsored = {
    ...pack,
    sponsorship: {
      sponsorName: "Fixture Sponsor",
      disclosure: "Sponsored fixture.",
      editorialIndependence: "The sponsor controls this content.",
      editorialControl: "sponsor-controlled",
      orderingInfluence: "none",
    },
  };
  assert.equal(validate(sponsored), false, "sponsored content must remain editorially independent");
});

test("generated schemas reject whitespace-only nonblank fields", () => {
  const packValidate = compileGenerated("pack-source");
  const whitespaceTitle = { ...runtimeValidPackFixture(), title: "   " };
  assert.equal(packValidate(whitespaceTitle), false, "whitespace-only pack title must be rejected");
  assert.ok(
    (packValidate.errors ?? []).some((error) => error.keyword === "pattern"),
    firstValidationError(packValidate),
  );

  const localizedValidate = compileGenerated("localized-content");
  const whitespaceSummary = { ...runtimeValidLocalizedFixture(), summary: "   " };
  assert.equal(
    localizedValidate(whitespaceSummary),
    false,
    "whitespace-only localized summary must be rejected",
  );
  assert.ok(
    (localizedValidate.errors ?? []).some((error) => error.keyword === "pattern"),
    firstValidationError(localizedValidate),
  );
});

test("generated accessibility schema rejects duplicate reading-order references", () => {
  const validate = compileGenerated("content-accessibility");
  const base = {
    scope: "content",
    readingOrder: ["summary", "experiment-one"],
  };
  assert.equal(validate(base), true, firstValidationError(validate));
  assert.equal(
    validate({ ...base, readingOrder: ["summary", "summary"] }),
    false,
    "reading-order references must be unique",
  );
  assert.ok(
    (validate.errors ?? []).some((error) => error.keyword === "uniqueItems"),
    firstValidationError(validate),
  );
});

test("generated eligibility schema rejects duplicate occupation scopes", () => {
  const validate = compileGenerated("practitioner-eligibility");
  const base = {
    schemaVersion: 1,
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: { method: "manual", status: "verified", verifiedOn: "2026-09-01" },
    validFrom: "2026-09-01",
    validUntil: "2027-09-01",
    evidenceReferences: ["fixture:eligibility-reference-001"],
  };
  assert.equal(validate(base), true, firstValidationError(validate));
  assert.equal(
    validate({ ...base, occupations: ["local-guide", "local-guide"] }),
    false,
    "duplicate occupations must be rejected",
  );
});

test("generated eligibility schema enforces fixture identity and evidence prefixes", () => {
  const validate = compileGenerated("practitioner-eligibility");
  const base = {
    schemaVersion: 1,
    actorId: "fixture-practitioner-one",
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: { method: "manual", status: "verified", verifiedOn: "2026-09-01" },
    validFrom: "2026-09-01",
    validUntil: "2027-09-01",
    evidenceReferences: ["fixture:eligibility-reference-001"],
  };
  assert.equal(validate(base), true, firstValidationError(validate));
  assert.equal(
    validate({ ...base, actorId: "practitioner-one" }),
    false,
    "fixtureOnly eligibility actorId must use a fixture- identity",
  );
  assert.equal(
    validate({ ...base, evidenceReferences: ["manual-verification-2026-001"] }),
    false,
    "fixtureOnly evidence references must use fixture:",
  );
  assert.equal(
    validate({
      ...base,
      fixtureOnly: false,
      actorId: "practitioner-one",
      evidenceReferences: ["manual-verification-2026-001"],
    }),
    true,
    firstValidationError(validate),
  );
});

test("generated attestation schema enforces fixture actor identity for every kind", () => {
  const validate = compileGenerated("review-attestation");
  const base = validGeneratedAttestation({
    kind: "practitioner-review",
    actorId: "fixture-practitioner-one",
  });
  assert.equal(validate(base), true, firstValidationError(validate));
  assert.equal(
    validate({ ...base, actorId: "practitioner-one" }),
    false,
    "fixtureOnly practitioner-review actorId must use a fixture- identity",
  );
  assert.equal(
    validate(validGeneratedAttestation({ actorId: "founder-one" })),
    false,
    "fixtureOnly founder-review actorId must use a fixture- identity",
  );
  for (const record of [
    validGeneratedAttestation({
      kind: "localization-review",
      actorId: "fixture-localizer-one",
      locale: "my",
      localizedContentDigest: generatedDigest,
      localizationReview: {
        fluentBurmeseConfirmed: true,
        fluentReviewEvidence: "fixture:fluent-review-001",
      },
      contentReview: undefined,
      reviewEventSequence: 3,
    }),
    validGeneratedAttestation({
      kind: "accessibility-review",
      actorId: "fixture-accessibility-reviewer-one",
      accessibilityReview: {
        readingOrderConfirmed: true,
        referencedMediaAlternativesConfirmed: true,
        runtimeValidationDeferred: true,
      },
      contentReview: undefined,
      reviewEventSequence: 3,
    }),
    validGeneratedAttestation({
      kind: "sponsorship-disclosure",
      actorId: "fixture-sponsorship-reviewer-one",
      sponsorshipReview: {
        disclosureConfirmed: true,
        editorialControlPreserved: true,
        orderingInfluence: "none",
      },
      contentReview: undefined,
      reviewEventSequence: 3,
    }),
  ]) {
    delete record["contentReview"];
    assert.equal(validate({ ...record, actorId: "reviewer-one" }), false);
  }
  assert.equal(
    validate({ ...base, fixtureOnly: false, actorId: "practitioner-one" }),
    true,
    firstValidationError(validate),
  );
  assert.equal(
    validate(validGeneratedAttestation({ fixtureOnly: false, actorId: "founder-one" })),
    true,
    firstValidationError(validate),
  );
});

function validGeneratedRetirementRecord(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: "a".repeat(64),
    actorId: "fixture-operator-one",
    fixtureOnly: true,
    reason: "synthetic lifecycle exercise",
    recordedAt: "2026-09-24T00:00:00Z",
    retirementEventSequence: 3,
    retirementEventDigest: "b".repeat(64),
  };
}

function validGeneratedRetirementNotice(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: "fixture-local-guide",
    packVersion: 1,
    contentDigest: "a".repeat(64),
    releaseManifestDigest: "c".repeat(64),
    retirementEventDigest: "b".repeat(64),
  };
}

test("generated retirement-record schema matches runtime rejection of blank reasons", () => {
  const validate = compileGenerated("retirement-record");
  const record = validGeneratedRetirementRecord();
  assert.equal(validate(record), true, firstValidationError(validate));
  assert.equal(
    validate({ ...record, reason: "   " }),
    false,
    "whitespace-only retirement reason must be rejected",
  );
  assert.ok(
    (validate.errors ?? []).some((error) => error.keyword === "pattern"),
    firstValidationError(validate),
  );

  assert.throws(
    () => strictParse(retirementRecordSchema, { ...record, reason: "   " }),
    StrictValidationError,
    "runtime must reject a blank retirement reason too",
  );
  assert.equal(
    strictParse(retirementRecordSchema, record)["reason"],
    "synthetic lifecycle exercise",
  );
});

test("generated retirement-notice schema matches runtime binding requirements", () => {
  const validate = compileGenerated("retirement-notice");
  const notice = validGeneratedRetirementNotice();
  assert.equal(validate(notice), true, firstValidationError(validate));
  assert.equal(
    validate({ ...notice, releaseManifestDigest: undefined }),
    false,
    "notice must bind the release manifest digest",
  );
  assert.equal(
    validate({ ...notice, retirementEventDigest: undefined }),
    false,
    "notice must bind the retirement event digest",
  );

  const missingManifest = { ...notice };
  delete missingManifest["releaseManifestDigest"];
  assert.throws(
    () => strictParse(retirementNoticeSchema, missingManifest),
    StrictValidationError,
    "runtime must require the release manifest digest too",
  );
});
