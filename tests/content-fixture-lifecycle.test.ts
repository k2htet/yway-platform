import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { test } from "node:test";
import {
  artifactPath,
  artifactRootDirectory,
  contentDigest,
  digestFile,
  eligibilityPath,
  listPackSourceVersions,
  listRegularFiles,
  loadPackState,
  loadVersionAttestations,
  loadReleasedBundle,
  localizedContentPath,
  packDirectory,
  provenanceLogPath,
  releaseBundlePath,
  releaseManifestPath,
  requirePackSource,
  resolveRepositoryRoot,
  retirementNoticePath,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runRetireCommand,
  runStatusCommand,
  runVerifyCommand,
  sha256Hex,
  snapshotIndexBytes,
  snapshotIndexPath,
  strictParse,
  practitionerEligibilitySchema,
  verifyArtifactSnapshot,
  verifyRepository,
  verifyVersionGovernance,
  readJsonFile,
  readSnapshotIndex,
  type AttestationKind,
  type CommandOptions,
  type CommandResult,
  type ReviewAttestation,
  type SnapshotIndexEntry,
} from "../content/index.js";
import {
  commandOptions,
  expectExit,
  expectFailureMessage,
  fixtureReviewActors,
  fixtureReviewArgs,
  fixtureReviewOrder,
  makeRoot,
} from "./content-cli-fixtures.js";
import {
  commitAll,
  gitAvailable,
  gitTest,
  initRepository,
  makeSnapshotRoot,
} from "./git-fixture.js";

/**
 * S2-08 coverage for the committed synthetic representative Pack.
 *
 * Two things are proven here, and they are deliberately separate:
 *
 * - The committed repository state is what issue #40 claims it is: fixture-only,
 *   synthetic, `changes-requested` on the first version, released then `retired`
 *   on the second, with release and provenance history preserved.
 * - The repository commands behave the same way when the *same* committed source
 *   files are replayed in a throwaway repository, which is how each refusal and
 *   the deterministic rebuild are observed without mutating committed state.
 *
 * Only read-only commands touch the committed repository. The one mutating
 * command that runs against it (`content:release`) is called with an
 * `onBeforeWrite` that throws, so "no write was attempted" is asserted by the test
 * rather than inferred from statement order inside the command.
 */

const repositoryRoot = resolveRepositoryRoot();
const fixturePackId = "fixture-retail-assistant";
const changesRequestedVersion = 1;
const releasedAndRetiredVersion = 2;
const fixtureOperator = "fixture-operator-one";

const fixtureSourceFiles = [
  "content/packs/fixture-retail-assistant/1.yaml",
  "content/packs/fixture-retail-assistant/2.yaml",
] as const;

/** Copies every committed record for the fixture Pack, plus its eligibility record. */
function copyCommittedFixtureTree(root: string): void {
  const packRoot = join(repositoryRoot, packDirectory, fixturePackId);
  for (const file of listRegularFiles(packRoot)) {
    const target = join(root, packDirectory, fixturePackId, ...file.relativePath.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.bytes);
  }
  copyFixtureFile(
    root,
    eligibilityPath(repositoryRoot, approvingPractitionerActor(releasedAndRetiredVersion)),
  );
}

/** Copies only this Pack's committed artifacts and their canonical index. */
function copyCommittedFixtureArtifacts(root: string): void {
  const entries = readSnapshotIndex(repositoryRoot).entries.filter(
    (entry) => entry.packId === fixturePackId,
  );
  assert.equal(entries.length, 3, "the representative fixture must have three artifacts");
  for (const entry of entries) {
    copyFixtureFile(root, artifactPath(repositoryRoot, entry.path));
  }
  const indexPath = snapshotIndexPath(root);
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, snapshotIndexBytes(entries));
}

/** Replays the committed source files into a throwaway repository. */
function seedFixtureSources(
  root: string,
  options: { readonly includeLocalization?: boolean } = {},
): void {
  for (const relativePath of fixtureSourceFiles) {
    copyFixtureFile(root, relativePath);
  }
  if (options.includeLocalization !== false) {
    copyFixtureFile(
      root,
      localizedContentPath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
    );
  }
  // The approving practitioner is derived from the committed provenance, not hardcoded,
  // so the eligibility file and the actor the release gate uses cannot drift apart.
  copyFixtureFile(
    root,
    eligibilityPath(repositoryRoot, approvingPractitionerActor(releasedAndRetiredVersion)),
  );
}

/** Copies one committed source file into a throwaway root, preserving its layout. */
function copyFixtureFile(root: string, source: string): void {
  const sourcePath = isAbsolute(source) ? source : join(repositoryRoot, source);
  const target = join(root, relative(repositoryRoot, sourcePath));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(sourcePath, target);
}

function registerFixtureVersion(root: string, version: number, from?: number): void {
  const args = ["--pack", fixturePackId, "--actor", "fixture-author-one"];
  if (from !== undefined) {
    args.push("--from", String(from));
  }
  expectExit(runNewVersionCommand(args, commandOptions(root)), 0);
}

function approveFixtureReview(root: string, kind: AttestationKind, version: number): void {
  expectExit(
    runAttestCommand(
      fixtureReviewArgs({
        packId: fixturePackId,
        version,
        kind,
        outcome: "approved",
        fluentReviewEvidence: "fixture:synthetic-replay-review-003",
        note: "synthetic fixture review recorded while replaying the committed Pack",
      }),
      commandOptions(root),
    ),
    0,
  );
}

/** Registers both fixture versions and records the first version's `changes-requested`. */
function seedLifecycleThroughChangesRequested(root: string): void {
  registerFixtureVersion(root, changesRequestedVersion);
  expectExit(
    runAttestCommand(
      fixtureReviewArgs({
        packId: fixturePackId,
        version: changesRequestedVersion,
        kind: "founder-review",
        outcome: "changes-requested",
        exposureBeforeCommitment: false,
        note: "synthetic fixture changes-requested recorded while replaying the committed Pack",
      }),
      commandOptions(root),
    ),
    0,
  );
}

function attemptFixtureRelease(
  root: string,
  version: number,
  options: Partial<CommandOptions> = {},
): CommandResult {
  return runReleaseCommand(
    ["--pack", fixturePackId, "--version", String(version), "--actor", fixtureOperator],
    { ...commandOptions(root), ...options },
  );
}

interface StatusJson {
  readonly currentStatus: string;
  readonly events: readonly {
    type: string;
    actorId: string;
    recordedAt: string;
    sequence: number;
  }[];
  readonly attestations: readonly {
    kind: string;
    outcome: string;
    actorId: string;
    reviewEventSequence: number | null;
    recordedAt: string;
  }[];
  readonly retirement?: {
    actorId: string;
    reason: string;
    recordedAt: string;
    retirementEventSequence: number;
    retirementEventDigest: string;
  };
}

function statusJson(root: string, version: number): StatusJson {
  const result = expectExit(
    runStatusCommand(["--pack", fixturePackId, "--version", String(version), "--json"], {
      repositoryRoot: root,
    }),
    0,
  );
  return JSON.parse(result.stdout ?? "{}") as StatusJson;
}

/** Captures a thrown error so a refusal's message can be asserted on. */
function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error(`expected an Error, received ${String(error)}`);
  }
  throw new Error("expected the call to fail, but it returned normally");
}

function committedGovernance(version: number) {
  return verifyVersionGovernance(repositoryRoot, fixturePackId, version);
}

/** The approving practitioner, derived rather than hardcoded, as the verifier does. */
function approvingPractitionerActor(version: number): string {
  const event = [...committedGovernance(version).status.history]
    .reverse()
    .find((candidate) => candidate.type === "practitioner-reviewed");
  assert.ok(event !== undefined, `version ${version} must record a practitioner review`);
  return event.actorId;
}

// --------------------------------------------------------------------------------------
// The committed repository state
// --------------------------------------------------------------------------------------

test("the committed representative Pack is registered as two immutable versions", () => {
  assert.deepEqual(listPackSourceVersions(repositoryRoot, fixturePackId), [
    changesRequestedVersion,
    releasedAndRetiredVersion,
  ]);
  const state = loadPackState(repositoryRoot, fixturePackId);
  const first = requirePackSource(state, repositoryRoot, fixturePackId, changesRequestedVersion);
  const second = requirePackSource(state, repositoryRoot, fixturePackId, releasedAndRetiredVersion);
  assert.equal(first.id, fixturePackId);
  assert.equal(second.id, fixturePackId);
  // The correction is a new immutable version, never an edit of a reviewed one.
  assert.notEqual(contentDigest(first), contentDigest(second));
});

test("version 1 asks for commitment before exposure and version 2 does not", () => {
  const state = loadPackState(repositoryRoot, fixturePackId);
  const first = requirePackSource(state, repositoryRoot, fixturePackId, changesRequestedVersion);
  const second = requirePackSource(state, repositoryRoot, fixturePackId, releasedAndRetiredVersion);

  // No structural `nextFork` analysis exists in the pipeline, so this is a content
  // assertion about the fixture itself. What the pipeline enforces is the reviewer
  // confirmation, covered separately below. Term classes are used instead of the
  // fixture's exact wording, so a reworded fixture is judged on the same property.
  const exposureTerms = /\b(watch|observe|look|ask|shadow|try)/u;
  const commitmentTerms = /\b(pay|paid|course|shift|apply|application|sign up|promise|job)\b/u;

  const escalatesBeforeExposure = (fork: string): boolean => {
    const exposure = fork.search(exposureTerms);
    const commitment = fork.search(commitmentTerms);
    return exposure !== -1 && commitment !== -1 && commitment < exposure;
  };

  for (const experiment of first.experiments) {
    assert.match(experiment.action.toLowerCase(), /\bfrom memory without visiting\b/u);
    assert.match(experiment.reflection.toLowerCase(), /\beach guess\b/u);
    assert.ok(
      escalatesBeforeExposure(experiment.nextFork.toLowerCase()),
      `version 1 ${experiment.id} must be the negative fixture: commitment before exposure`,
    );
  }
  for (const experiment of second.experiments) {
    assert.ok(
      !escalatesBeforeExposure(experiment.nextFork.toLowerCase()),
      `version 2 ${experiment.id} must not escalate before real-world exposure`,
    );
  }
});

test("both fixture versions carry all six parts of an identified experiment", () => {
  const state = loadPackState(repositoryRoot, fixturePackId);
  for (const version of [changesRequestedVersion, releasedAndRetiredVersion]) {
    const source = requirePackSource(state, repositoryRoot, fixturePackId, version);
    assert.ok(source.experiments.length > 0);
    for (const experiment of source.experiments) {
      for (const part of [
        "question",
        "action",
        "timebox",
        "whatToNotice",
        "reflection",
        "nextFork",
      ] as const) {
        assert.ok(
          experiment[part].trim() !== "",
          `${version} ${experiment.id} must carry a non-empty ${part}`,
        );
      }
    }
  }
});

test("content:status reports changes-requested and retired for the committed fixture", () => {
  const first = statusJson(repositoryRoot, changesRequestedVersion);
  assert.equal(first.currentStatus, "changes-requested");
  assert.deepEqual(
    first.events.map((event) => event.type),
    ["authored", "changes-requested"],
  );
  assert.deepEqual(
    first.attestations.map((attestation) => ({
      kind: attestation.kind,
      outcome: attestation.outcome,
      actorId: attestation.actorId,
      reviewEventSequence: attestation.reviewEventSequence,
    })),
    [
      {
        kind: "founder-review",
        outcome: "changes-requested",
        actorId: "fixture-founder-one",
        reviewEventSequence: 2,
      },
    ],
  );
  // The attestation must be bound to the instant of the event it records.
  assert.equal(first.attestations[0]!.recordedAt, first.events[1]!.recordedAt);
  assert.equal(first.retirement, undefined);

  const second = statusJson(repositoryRoot, releasedAndRetiredVersion);
  assert.equal(second.currentStatus, "retired");
  assert.deepEqual(
    second.events.map((event) => event.type),
    [
      "authored",
      "localized",
      "founder-reviewed",
      "practitioner-reviewed",
      "localization-reviewed",
      "accessibility-reviewed",
      "sponsorship-disclosed",
      "artifact-eligible",
      "artifact-released",
      "retired",
    ],
  );
  assert.deepEqual(
    second.attestations.map((attestation) => `${attestation.kind} ${attestation.outcome}`),
    [
      "founder-review approved",
      "practitioner-review approved",
      "localization-review approved",
      "accessibility-review approved",
      "sponsorship-disclosure approved",
    ],
  );
  // Every review event has exactly one bound attestation and vice versa, each bound
  // to the instant of the event it records.
  const eventTypeForReviewKind: Readonly<Record<string, string>> = {
    "founder-review": "founder-reviewed",
    "practitioner-review": "practitioner-reviewed",
    "localization-review": "localization-reviewed",
    "accessibility-review": "accessibility-reviewed",
    "sponsorship-disclosure": "sponsorship-disclosed",
  };
  for (const attestation of second.attestations) {
    const event = second.events.find(
      (candidate) => candidate.type === eventTypeForReviewKind[attestation.kind],
    );
    assert.ok(event !== undefined, `${attestation.kind} must bind a provenance event`);
    assert.equal(attestation.recordedAt, event.recordedAt);
  }
  const retiredEvent = second.events.find((event) => event.type === "retired")!;
  assert.equal(second.retirement?.retirementEventSequence, retiredEvent.sequence);
  assert.equal(second.retirement?.recordedAt, retiredEvent.recordedAt);
  assert.equal(second.retirement?.actorId, fixtureOperator);
  assert.equal(typeof second.retirement?.retirementEventDigest, "string");
});

test("every committed fixture record is fixture-only with a synthetic actor identity", () => {
  for (const version of [changesRequestedVersion, releasedAndRetiredVersion]) {
    const verified = committedGovernance(version);
    assert.equal(verified.source.fixtureOnly, true);
    assert.ok(verified.status.history.length > 0);
    for (const event of verified.status.history) {
      assert.equal(event.fixtureOnly, true, `event ${event.sequence} must be fixture-only`);
      assert.ok(
        event.actorId.startsWith("fixture-"),
        `event ${event.sequence} actor ${event.actorId} must be a fixture- identity`,
      );
    }
    for (const attestation of verified.attestations) {
      assert.equal(attestation.fixtureOnly, true);
      assert.ok(attestation.actorId.startsWith("fixture-"));
      assert.equal(attestation.packId, fixturePackId);
      assert.equal(attestation.packVersion, version);
    }
    if (verified.retirement !== undefined) {
      assert.equal(verified.retirement.fixtureOnly, true);
      assert.ok(verified.retirement.actorId.startsWith("fixture-"));
    }
  }

  const eligibility = strictParse(
    practitionerEligibilitySchema,
    readJsonFile(
      eligibilityPath(repositoryRoot, approvingPractitionerActor(releasedAndRetiredVersion)),
      "fixture practitioner eligibility",
    ),
  );
  assert.equal(eligibility.fixtureOnly, true);
  assert.ok(eligibility.actorId.startsWith("fixture-"));
});

test("the approving practitioner is independent of the author", () => {
  const verified = committedGovernance(releasedAndRetiredVersion);
  const authoredEvent = verified.status.history.find((event) => event.type === "authored");
  const approval = verified.attestations.find(
    (attestation) =>
      attestation.kind === "practitioner-review" && attestation.outcome === "approved",
  );
  assert.ok(authoredEvent !== undefined);
  assert.ok(approval !== undefined);
  assert.notEqual(approval.actorId, authoredEvent.actorId);
  assert.equal(approval.actorId, approvingPractitionerActor(releasedAndRetiredVersion));
});

test("every committed qualification and localization evidence reference is synthetic", () => {
  const eligibility = strictParse(
    practitionerEligibilitySchema,
    readJsonFile(
      eligibilityPath(repositoryRoot, approvingPractitionerActor(releasedAndRetiredVersion)),
      "fixture practitioner eligibility",
    ),
  );
  assert.equal(eligibility.fixtureOnly, true);
  assert.ok(eligibility.evidenceReferences.length > 0);
  for (const reference of eligibility.evidenceReferences) {
    assert.ok(
      reference.startsWith("fixture:"),
      `qualification evidence "${reference}" must be a synthetic fixture: reference`,
    );
  }
  const source = requirePackSource(
    loadPackState(repositoryRoot, fixturePackId),
    repositoryRoot,
    fixturePackId,
    releasedAndRetiredVersion,
  );
  for (const occupation of source.occupations) {
    assert.ok(
      eligibility.occupations.includes(occupation),
      `fixture eligibility must cover pack occupation "${occupation}"`,
    );
  }

  const localizationReviews = loadVersionAttestations(
    repositoryRoot,
    fixturePackId,
    releasedAndRetiredVersion,
  ).filter((attestation) => attestation.kind === "localization-review");
  assert.equal(localizationReviews.length, 1);
  for (const attestation of localizationReviews) {
    const evidence = attestation.localizationReview?.fluentReviewEvidence ?? "";
    assert.ok(
      /^fixture:[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(evidence),
      `localization review evidence "${evidence}" must be a synthetic fixture: reference`,
    );
  }
});

test("committed attestations and provenance bind version 2's exact digests", () => {
  const verified = committedGovernance(releasedAndRetiredVersion);
  const state = loadPackState(repositoryRoot, fixturePackId);
  const localized = state.localizedContentByVersion.get(releasedAndRetiredVersion);
  assert.ok(localized !== undefined, "version 2 must have a registered Burmese localization");
  assert.equal(contentDigest(verified.source), verified.contentDigest);
  const localizedDigest = contentDigest(localized);
  assert.equal(localized.locale, "my");
  assert.equal(localized.fixtureOnly, true);

  for (const attestation of verified.attestations) {
    assert.equal(attestation.contentDigest, verified.contentDigest);
    assert.equal(attestation.packVersion, releasedAndRetiredVersion);
    assert.equal(typeof attestation.reviewEventSequence, "number");
    // Every committed review recorded after the `localized` event binds the exact
    // Burmese content, not just the three kinds whose schema requires it.
    if (attestation.localizedContentDigest !== undefined) {
      assert.equal(attestation.localizedContentDigest, localizedDigest);
    }
  }
  assert.deepEqual(
    verified.attestations
      .filter((attestation) => attestation.localizedContentDigest !== undefined)
      .map((attestation) => attestation.kind)
      .sort(),
    [
      "accessibility-review",
      "founder-review",
      "localization-review",
      "practitioner-review",
      "sponsorship-disclosure",
    ],
  );
  for (const event of verified.status.history) {
    assert.equal(event.contentDigest, verified.contentDigest);
    if (event.localizedContentDigest !== undefined) {
      assert.equal(event.localizedContentDigest, localizedDigest);
    }
  }
  assert.equal(verified.releaseManifest?.contentDigest, verified.contentDigest);
  assert.equal(verified.releaseManifest?.gates.localizedContentDigest, localizedDigest);
});

test("the committed Burmese localization really is Burmese, and the bundle carries it", () => {
  const bundle = JSON.parse(
    readFileSync(
      releaseBundlePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
      "utf8",
    ),
  ) as {
    localizedContent: { locale: string; title: string; summary: string; limitations: string[] };
    pack: { canonicalLanguage: string };
  };
  assert.equal(bundle.pack.canonicalLanguage, "en-simple");
  assert.equal(bundle.localizedContent.locale, "my");
  // The machine-checkable part of a localization is the tag; this asserts the text
  // is actually written in Myanmar script, so English text cannot pass as `my`.
  const myanmarScript = /[က-႟]/u;
  assert.match(bundle.localizedContent.title, myanmarScript);
  assert.match(bundle.localizedContent.summary, myanmarScript);
  for (const limitation of bundle.localizedContent.limitations) {
    assert.ok(limitation.trim() !== "");
    // Every localized limitation, not just one of them, must be written in Burmese.
    assert.match(limitation, myanmarScript, `limitation "${limitation}" must be Burmese`);
  }
});

test("the committed reading order covers every authored section and experiment", () => {
  // The Stage 2 accessibility gate only requires a non-empty unique order containing the
  // referenced media, so completeness is a fixture property that has to be asserted here
  // rather than inferred from the gate. It is pinned for both locales.
  const state = loadPackState(repositoryRoot, fixturePackId);
  const source = requirePackSource(state, repositoryRoot, fixturePackId, releasedAndRetiredVersion);
  const localized = state.localizedContentByVersion.get(releasedAndRetiredVersion);
  assert.ok(localized !== undefined);
  const expected = ["summary", "preview", "limitations", ...source.experiments.map((e) => e.id)];

  for (const [label, accessibility] of [
    ["canonical", source.accessibility],
    ["Burmese", localized.accessibility],
  ] as const) {
    assert.ok(accessibility !== undefined, `${label} accessibility metadata is required`);
    assert.equal(accessibility.scope, "content");
    assert.deepEqual(accessibility.readingOrder, expected, `${label} reading order`);
    for (const media of accessibility.media ?? []) {
      assert.ok(
        accessibility.readingOrder.includes(media.id),
        `${label} media ${media.id} must appear in the reading order`,
      );
    }
  }
});

test("the committed release manifest records every Stage 2 gate and both deferrals", () => {
  const manifest = JSON.parse(
    readFileSync(
      releaseManifestPath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
      "utf8",
    ),
  ) as { fixtureOnly: boolean; classification: string; gates: Record<string, unknown> };
  assert.equal(manifest.fixtureOnly, true);
  assert.equal(manifest.classification, "fixture");
  assert.equal(manifest.gates["founderApproved"], true);
  assert.equal(manifest.gates["practitionerApproved"], true);
  assert.equal(manifest.gates["localizationApproved"], true);
  assert.equal(manifest.gates["accessibilityApproved"], true);
  // The fixture sponsor is fictional, but the disclosure gate is genuinely exercised.
  assert.equal(manifest.gates["sponsorship"], "disclosed");
  assert.equal(manifest.gates["runtimeAccessibilityDeferred"], true);
  assert.equal(manifest.gates["targetUserComprehensionDeferred"], true);
});

test("no committed artifact claims real endorsement, production quality, or release readiness", () => {
  const source = requirePackSource(
    loadPackState(repositoryRoot, fixturePackId),
    repositoryRoot,
    fixturePackId,
    releasedAndRetiredVersion,
  );
  const state = loadPackState(repositoryRoot, fixturePackId);
  const localized = state.localizedContentByVersion.get(releasedAndRetiredVersion);
  assert.ok(localized !== undefined);
  const canonicalText = source.limitations.join(" ");
  const localizedText = localized.limitations.join(" ");

  // The synthetic nature must be stated in the most prominent user-facing text of both
  // locales, not only in the limitations and not only in machine fields.
  assert.match(source.title, /synthetic/i);
  assert.match(source.summary, /synthetic/i);
  assert.match(source.summary, /not published to young people/);
  assert.match(localized.title, /သရုပ်ဖွဲ့စည်းမှု ထုပ်ပိုးမှု/u);
  assert.match(localized.summary, /သရုပ်ဖွဲ့စည်းမှု ထုပ်ပိုးမှု/u);
  assert.match(canonicalText, /No real practitioner wrote, reviewed, or endorsed it/);
  assert.match(canonicalText, /not published to young people/);
  // Comprehension, runtime accessibility, and evidence level are all still open, and
  // the content says so in each locale rather than implying they were validated.
  assert.match(canonicalText, /not been checked with Burmese-speaking young people/);
  assert.match(canonicalText, /Screen readers, text scaling/);
  assert.match(canonicalText, /is not practice evidence and it is not a verified assessment/);
  assert.match(localizedText, /သရုပ်ဖွဲ့စည်းမှု ထုပ်ပိုးမှုသည် စနစ်ကို စမ်းသပ်ရန်သာ ဖြစ်ပါသည်/u);
  assert.match(localizedText, /မြန်မာစာ နားလည်သူ လူငယ်များနှင့် စမ်းသပ်ခြင်း မလုပ်ရသေးပါ/u);
  // Anchored on the screen-reader wording, so the comprehension deferral above cannot
  // satisfy it and the runtime-accessibility deferral stays independently pinned.
  assert.match(localizedText, /စက်ဖဝဲဖြင့် ဖတ်ခြင်း/u);
  assert.match(localizedText, /အတည်ပြုထားသော စမ်းသပ်မှုလည်း မဟုတ်ပါ/u);
  // The fictional sponsor is named as fictional and disclosed in both locales,
  // including the editorial-control and youth-data boundaries.
  assert.ok(source.sponsorship !== undefined);
  assert.match(source.sponsorship.sponsorName, /fictional fixture sponsor/);
  assert.match(source.sponsorship.disclosure, /fictional company that does not exist/);
  assert.match(
    source.sponsorship.editorialIndependence,
    /fixture identity and not a real practitioner/,
  );
  assert.ok(
    localized.limitations.some(
      (limitation) => limitation.includes("ပံ့ပိုးမှု") && limitation.includes("လုံးဝမရှိသော"),
    ),
    "the Burmese text must disclose that the sponsor is fictional",
  );
  assert.ok(
    localized.limitations.some(
      (limitation) => limitation.includes("ပံ့ပိုးသူသည်") && limitation.includes("မရပါ"),
    ),
    "the Burmese text must state that the sponsor cannot change the content or its order",
  );

  // The committed free text that never crosses the artifact boundary is the only place
  // the repository records that each confirmation is synthetic, so it is pinned here.
  for (const version of [changesRequestedVersion, releasedAndRetiredVersion]) {
    const attestations = loadVersionAttestations(repositoryRoot, fixturePackId, version);
    assert.ok(attestations.length > 0);
    for (const attestation of attestations) {
      assert.equal(typeof attestation.note, "string", `${attestation.kind} must carry a note`);
      assert.match(attestation.note!, /synthetic|fixture/i, `${attestation.kind} note`);
      assert.equal(attestation.actorId, fixtureReviewActors[attestation.kind]);
    }
  }
  const record = committedGovernance(releasedAndRetiredVersion).retirement;
  assert.ok(record !== undefined);
  assert.match(record.reason, /synthetic|fixture/i);

  // Fixture classification travels with every approved gate, so an approved gate can
  // never be read as production quality on its own.
  const bundle = JSON.parse(
    readFileSync(
      releaseBundlePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
      "utf8",
    ),
  ) as { classification: string; fixtureOnly: boolean; provenance: { events: unknown[] } };
  assert.equal(bundle.fixtureOnly, true);
  assert.equal(bundle.classification, "fixture");
  assert.equal(
    committedGovernance(releasedAndRetiredVersion).releaseManifest?.classification,
    "fixture",
  );
});

test("the committed bundle and manifest rebuild byte for byte from committed inputs", () => {
  const report = verifyRepository({ repositoryRoot });
  assert.ok(report.packIds.includes(fixturePackId));
  const fixtureRelease = report.releases.find(
    (release) =>
      release.packId === fixturePackId && release.packVersion === releasedAndRetiredVersion,
  );
  assert.ok(fixtureRelease !== undefined, "the committed fixture release must be verified");
  assert.equal(fixtureRelease.retired, true);
  assert.equal(
    fixtureRelease.bundleDigest,
    digestFile(releaseBundlePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion)),
  );
  assert.equal(
    fixtureRelease.manifestDigest,
    digestFile(releaseManifestPath(repositoryRoot, fixturePackId, releasedAndRetiredVersion)),
  );
  assert.equal(
    report.releases.filter((release) => release.packId === fixturePackId).length,
    1,
    "the fixture Pack must have exactly one release",
  );
});

test("the committed artifacts are not merely self-consistent: tampering is refused", () => {
  // `verifyRepository` re-derives every artifact byte from the committed records, so
  // a copy of the committed tree verifies, and any single altered byte does not. This
  // is the non-redundant half of the determinism requirement: the positive rebuild is
  // already asserted by `verifyRepository` above.
  const root = makeRoot();
  copyCommittedFixtureTree(root);
  copyCommittedFixtureArtifacts(root);
  assert.doesNotThrow(() => verifyRepository({ repositoryRoot: root }));

  const bundlePath = releaseBundlePath(root, fixturePackId, releasedAndRetiredVersion);
  const original = readFileSync(bundlePath, "utf8");
  const drifted = original.replace('"schemaVersion": 1', '"schemaVersion":  1');
  assert.notEqual(drifted, original, "the drift mutation must actually change the bytes");
  writeFileSync(bundlePath, drifted);
  const refused = captureError(() => verifyRepository({ repositoryRoot: root }));
  assert.match(
    refused.message,
    /does not match the bytes regenerated from the recorded release inputs/,
  );

  // The whitespace-only change must not be papered over by a looser comparison.
  writeFileSync(bundlePath, original);
  assert.doesNotThrow(() => verifyRepository({ repositoryRoot: root }));
});

test("the committed bundle carries cumulative provenance across both versions", () => {
  const bundle = JSON.parse(
    readFileSync(
      releaseBundlePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
      "utf8",
    ),
  ) as {
    provenance: {
      events: readonly {
        sequence: number;
        packVersion: number;
        type: string;
        fixtureOnly: boolean;
        actorId: string;
      }[];
    };
  };
  const events = bundle.provenance.events;
  // The prefix starts at the genesis event, so the superseded first version's
  // history survives the release boundary instead of being truncated away.
  assert.equal(events[0]!.sequence, 1);
  const firstVersionEvents = events
    .filter((event) => event.packVersion === changesRequestedVersion)
    .map((event) => event.type);
  assert.deepEqual(firstVersionEvents, ["authored", "changes-requested"]);
  assert.equal(events.at(-1)!.type, "artifact-released");
  // The retirement event is not in the release prefix: release artifacts are immutable.
  assert.ok(!events.some((event) => event.type === "retired"));
  for (const event of events) {
    assert.equal(event.fixtureOnly, true);
    assert.ok(event.actorId.startsWith("fixture-"));
  }
});

test("committed release artifacts carry no review notes and no retirement reason or actor", () => {
  const bundleBytes = readFileSync(
    releaseBundlePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
    "utf8",
  );
  // Both schemas are strict and re-parsed by consumers, so a note or reason key cannot
  // exist. The scan is over the whole raw document, not just the root object, so a
  // nested `note` on a provenance event would also be caught.
  for (const key of ["note", "reason"]) {
    assert.equal(
      new RegExp(`"${key}"\\s*:`).test(bundleBytes),
      false,
      `release bundle must not contain a "${key}" key at any depth`,
    );
  }
  const actorIds = [...bundleBytes.matchAll(/"actorId": "([^"]+)"/g)].map((match) => match[1]!);
  assert.ok(actorIds.length > 0);
  for (const actorId of actorIds) {
    assert.ok(actorId.startsWith("fixture-"), `bundle actor ${actorId} must be synthetic`);
  }

  const record = committedGovernance(releasedAndRetiredVersion).retirement;
  assert.ok(record !== undefined);
  const noticeBytes = readFileSync(
    retirementNoticePath(repositoryRoot, fixturePackId, releasedAndRetiredVersion),
    "utf8",
  );
  const notice = JSON.parse(noticeBytes) as Record<string, unknown>;
  assert.deepEqual(Object.keys(notice).sort(), [
    "contentDigest",
    "packId",
    "packVersion",
    "releaseManifestDigest",
    "retirementEventDigest",
    "schemaVersion",
  ]);
  assert.equal(noticeBytes.includes(record.reason), false);
  assert.equal(noticeBytes.includes(record.actorId), false);
});

test("the committed retirement preserves release history and refuses a further release", () => {
  const verified = committedGovernance(releasedAndRetiredVersion);
  const releaseEvent = verified.status.history.find((event) => event.type === "artifact-released");
  const retiredEvent = verified.status.history.find((event) => event.type === "retired");
  assert.ok(releaseEvent !== undefined);
  assert.ok(retiredEvent !== undefined);
  assert.ok(retiredEvent.sequence > releaseEvent.sequence);
  assert.equal(verified.retirement?.retirementEventDigest, retiredEvent.eventDigest);
  assert.ok(verified.notice !== undefined, "a released retirement must publish a notice");
  assert.equal(verified.notice.retirementEventDigest, retiredEvent.eventDigest);

  const index = readSnapshotIndex(repositoryRoot);
  // The three canonical artifact paths for this pack and version are all present, so
  // the retirement is disclosed in the index rather than merely written to disk. The
  // assertion is scoped to this Pack so a later committed Pack cannot break it.
  assert.deepEqual(
    index.entries.filter((entry) => entry.packId === fixturePackId).map((entry) => entry.path),
    [
      `bundles/${fixturePackId}/${releasedAndRetiredVersion}/bundle.json`,
      `manifests/${fixturePackId}/${releasedAndRetiredVersion}/manifest.json`,
      `retirements/${fixturePackId}/${releasedAndRetiredVersion}.json`,
    ],
  );
  for (const entry of index.entries) {
    assert.equal(digestFile(artifactPath(repositoryRoot, entry.path)), entry.digest);
  }
  assert.equal(
    snapshotIndexBytes(index.entries),
    readFileSync(snapshotIndexPath(repositoryRoot), "utf8"),
  );

  const before = verifyRepository({ repositoryRoot }).releases;
  // The release is refused, and the refusal is proven not to have written anything:
  // the command would throw from `onBeforeWrite` if it reached a write at all.
  const refused = expectExit(
    attemptFixtureRelease(repositoryRoot, releasedAndRetiredVersion, {
      onBeforeWrite: () => {
        throw new Error("content:release attempted a write against the committed fixture");
      },
    }),
    1,
  );
  expectFailureMessage(refused, "is retired; a retired version is no longer artifact-eligible");
  // Nothing the refusal touched changed: the release history it refused is intact.
  assert.deepEqual(verifyRepository({ repositoryRoot }).releases, before);
});

// --------------------------------------------------------------------------------------
// The same commands, replayed against the committed sources in a throwaway repository
// --------------------------------------------------------------------------------------

test("an approved review cannot record that exposure did not precede commitment", () => {
  const root = makeRoot();
  seedFixtureSources(root, { includeLocalization: false });
  registerFixtureVersion(root, changesRequestedVersion);

  const approval = expectExit(
    runAttestCommand(
      fixtureReviewArgs({
        packId: fixturePackId,
        version: changesRequestedVersion,
        kind: "founder-review",
        outcome: "approved",
        exposureBeforeCommitment: false,
      }),
      commandOptions(root),
    ),
    1,
  );
  expectFailureMessage(
    approval,
    "must confirm both six-part structure and exposure before commitment",
  );
  // A refused approval must leave no trace in the provenance log or on disk.
  const log = readJsonFile(provenanceLogPath(root, fixturePackId), "replayed provenance log") as {
    events: readonly { type: string }[];
  };
  assert.deepEqual(
    log.events.map((event) => event.type),
    ["authored"],
  );
  assert.deepEqual(loadVersionAttestations(root, fixturePackId, changesRequestedVersion), []);
});

test("version 1 is recorded as changes-requested and can never be released", () => {
  const root = makeRoot();
  seedFixtureSources(root, { includeLocalization: false });
  seedLifecycleThroughChangesRequested(root);

  assert.equal(statusJson(root, changesRequestedVersion).currentStatus, "changes-requested");
  assert.deepEqual(
    loadVersionAttestations(root, fixturePackId, changesRequestedVersion).map(
      (attestation: ReviewAttestation) => `${attestation.kind} ${attestation.outcome}`,
    ),
    ["founder-review changes-requested"],
  );

  const refused = expectExit(attemptFixtureRelease(root, changesRequestedVersion), 1);
  expectFailureMessage(
    refused,
    'release requires standing practitioner-reviewed or artifact-eligible status for fixture-retail-assistant version 1 (current status "changes-requested")',
  );
  assert.equal(existsSync(join(root, artifactRootDirectory)), false);
});

test("version 2 cannot be released while a required release gate is missing", async (t) => {
  const missingGates: readonly {
    label: string;
    omit: AttestationKind | "localization-file" | "every-review";
    fragment: string;
  }[] = [
    {
      label: "no review recorded at all",
      omit: "every-review",
      fragment: "standing practitioner-reviewed or artifact-eligible status",
    },
    {
      label: "practitioner review",
      omit: "practitioner-review",
      fragment: "standing practitioner-reviewed or artifact-eligible status",
    },
    {
      label: "Burmese localization review",
      omit: "localization-review",
      fragment: "fluent Burmese localization review is required",
    },
    {
      label: "content accessibility review",
      omit: "accessibility-review",
      fragment: "content accessibility review is required",
    },
    {
      label: "sponsorship disclosure",
      omit: "sponsorship-disclosure",
      fragment: "sponsorship disclosure is required for sponsored pack",
    },
    {
      label: "Burmese localization itself",
      omit: "localization-file",
      fragment: "Burmese localization is required",
    },
  ];

  for (const gate of missingGates) {
    await t.test(gate.label, () => {
      const root = makeRoot();
      const withoutLocalization = gate.omit === "localization-file";
      seedFixtureSources(root, { includeLocalization: !withoutLocalization });
      seedLifecycleThroughChangesRequested(root);
      registerFixtureVersion(root, releasedAndRetiredVersion, changesRequestedVersion);

      for (const kind of fixtureReviewOrder) {
        if (kind === gate.omit || gate.omit === "every-review") {
          continue;
        }
        if (withoutLocalization && kind !== "founder-review" && kind !== "practitioner-review") {
          continue;
        }
        approveFixtureReview(root, kind, releasedAndRetiredVersion);
      }

      const refused = expectExit(attemptFixtureRelease(root, releasedAndRetiredVersion), 1);
      expectFailureMessage(refused, gate.fragment);
      assert.equal(
        existsSync(releaseBundlePath(root, fixturePackId, releasedAndRetiredVersion)),
        false,
      );
      assert.equal(existsSync(snapshotIndexPath(root)), false);
    });
  }
});

test("the corrected version 2 releases deterministically, then retires without losing history", () => {
  const root = makeRoot();
  seedFixtureSources(root);
  seedLifecycleThroughChangesRequested(root);
  registerFixtureVersion(root, releasedAndRetiredVersion, changesRequestedVersion);
  for (const kind of fixtureReviewOrder) {
    approveFixtureReview(root, kind, releasedAndRetiredVersion);
  }

  expectExit(attemptFixtureRelease(root, releasedAndRetiredVersion), 0);
  assert.equal(statusJson(root, releasedAndRetiredVersion).currentStatus, "artifact-released");
  const bundlePath = releaseBundlePath(root, fixturePackId, releasedAndRetiredVersion);
  const manifestPath = releaseManifestPath(root, fixturePackId, releasedAndRetiredVersion);
  const bundleBytes = readFileSync(bundlePath, "utf8");
  const manifestBytes = readFileSync(manifestPath, "utf8");

  const reason = "synthetic fixture retirement for the replayed lifecycle";
  expectExit(
    runRetireCommand(
      [
        "--pack",
        fixturePackId,
        "--version",
        String(releasedAndRetiredVersion),
        "--actor",
        fixtureOperator,
        "--reason",
        reason,
      ],
      commandOptions(root),
    ),
    0,
  );

  // Retirement preserves the immutable release artifacts byte for byte.
  assert.equal(readFileSync(bundlePath, "utf8"), bundleBytes);
  assert.equal(readFileSync(manifestPath, "utf8"), manifestBytes);
  assert.equal(statusJson(root, releasedAndRetiredVersion).currentStatus, "retired");

  const report = verifyRepository({ repositoryRoot: root });
  assert.equal(report.releases.length, 1);
  assert.equal(report.releases[0]!.retired, true);
  assert.equal(report.releases[0]!.bundleDigest, sha256Hex(bundleBytes));
  assert.equal(report.releases[0]!.manifestDigest, sha256Hex(manifestBytes));
  assert.equal(report.indexEntries, 3);

  // The prior release event survives in the cumulative provenance chain.
  const verified = verifyVersionGovernance(root, fixturePackId, releasedAndRetiredVersion);
  const releaseEvent = verified.status.history.find((event) => event.type === "artifact-released");
  const retiredEvent = verified.status.history.find((event) => event.type === "retired");
  assert.ok(releaseEvent !== undefined);
  assert.ok(retiredEvent !== undefined);
  assert.equal(verified.notice?.releaseManifestDigest, sha256Hex(manifestBytes));
  assert.equal(verified.notice?.retirementEventDigest, retiredEvent.eventDigest);
  const notice = JSON.parse(
    readFileSync(retirementNoticePath(root, fixturePackId, releasedAndRetiredVersion), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(JSON.stringify(notice).includes(reason), false);
  assert.equal(JSON.stringify(notice).includes(fixtureOperator), false);

  const refused = expectExit(attemptFixtureRelease(root, releasedAndRetiredVersion), 1);
  expectFailureMessage(refused, "is retired; a retired version is no longer artifact-eligible");
});

// --------------------------------------------------------------------------------------
// The committed artifacts, pinned by a trusted snapshot
// --------------------------------------------------------------------------------------

/** Copies this Pack's committed artifacts into a throwaway Git repository. */
function pinnedFixtureRepository(): { root: string; commit: string } {
  const root = makeSnapshotRoot();
  copyCommittedFixtureArtifacts(root);
  initRepository(root);
  return { root, commit: commitAll(root, "pin the representative fixture artifacts") };
}

test("the trusted-snapshot evidence for S2-08 cannot be silently skipped", () => {
  // The git-backed tests below are the only evidence that artifact consumers
  // refuse a retired version and detect notice deletion. A silent `test.skip` would
  // let full verification pass without running them, so availability is asserted here
  // as an ordinary, non-skipped test.
  assert.equal(
    gitAvailable(),
    true,
    "git must be available for the Stage 2 trusted-snapshot coverage to run",
  );
});

gitTest("the retired representative version cannot be loaded from a pinned snapshot", () => {
  const { root, commit } = pinnedFixtureRepository();

  // The snapshot itself is intact: the retirement is disclosed, not hidden.
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
  assert.equal(snapshot.index.entries.length, 3);

  const refused = captureError(() =>
    loadReleasedBundle({
      repositoryRoot: root,
      trustedCommit: commit,
      packId: fixturePackId,
      packVersion: releasedAndRetiredVersion,
    }),
  );
  assert.match(refused.message, /was retired in trusted commit/);
});

gitTest("deleting only the committed retirement notice is detected against the pinned tree", () => {
  const { root, commit } = pinnedFixtureRepository();
  rmSync(retirementNoticePath(root, fixturePackId, releasedAndRetiredVersion));

  const refused = captureError(() =>
    verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit }),
  );
  assert.match(refused.message, /retirements\/fixture-retail-assistant\/2\.json/);
  assert.match(refused.message, /is missing locally/);
});

gitTest("deleting the notice and committing a rewritten index is rejected by the pin", () => {
  const { root, commit } = pinnedFixtureRepository();
  rmSync(retirementNoticePath(root, fixturePackId, releasedAndRetiredVersion));
  const rewritten: SnapshotIndexEntry[] = readSnapshotIndex(root).entries.filter(
    (entry) => entry.kind !== "retirement-notice",
  );
  assert.equal(rewritten.length, 2);
  writeFileSync(snapshotIndexPath(root), snapshotIndexBytes(rewritten));
  // The rewritten tree is internally consistent on its own, which is exactly why the
  // earlier pinned commit has to be the thing that refuses it.
  const laterCommit = commitAll(root, "hide the retirement notice");
  assert.notEqual(laterCommit, commit);
  assert.doesNotThrow(() =>
    verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: laterCommit }),
  );

  const refused = captureError(() =>
    verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit }),
  );
  assert.match(refused.message, /retirements\/fixture-retail-assistant\/2\.json/);
  assert.match(refused.message, /is missing locally/);

  const loadRefused = captureError(() =>
    loadReleasedBundle({
      repositoryRoot: root,
      trustedCommit: commit,
      packId: fixturePackId,
      packVersion: releasedAndRetiredVersion,
    }),
  );
  assert.match(loadRefused.message, /is missing locally/);
});

gitTest("content:verify rejects committed fixture bytes that drifted from the pin", () => {
  const { root, commit } = pinnedFixtureRepository();
  const noticePath = retirementNoticePath(root, fixturePackId, releasedAndRetiredVersion);
  const original = readFileSync(noticePath, "utf8");
  // A whitespace-only change is enough: the comparison is byte-for-byte.
  const drifted = original.replace('"schemaVersion": 1', '"schemaVersion":  1');
  assert.notEqual(drifted, original, "the drift mutation must actually change the bytes");
  writeFileSync(noticePath, drifted);
  const refused = expectExit(
    runVerifyCommand(["--trusted-commit", commit], { repositoryRoot: root }),
    1,
  );
  expectFailureMessage(refused, "does not match the bytes pinned by trusted commit");
});
