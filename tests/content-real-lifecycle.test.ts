import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { test } from "node:test";
import {
  computeProvenanceEventDigest,
  contentClassification,
  contentDigest,
  inspectPilotSnapshotVersion,
  localizedContentSchema,
  packSourceSchema,
  parseStrictYaml,
  loadPilotBundle,
  loadReleasedBundle,
  runNewVersionCommand,
  releaseBundleSchema,
  releaseManifestSchema,
  runAttestCommand,
  runReleaseCommand,
  runRetireCommand,
  runStatusCommand,
  runVerifyCommand,
  sha256Hex,
  snapshotIndexBytes,
  strictParse,
  verifyArtifactSnapshot,
} from "../content/index.js";
import {
  attestationFilePath,
  commandOptions,
  expectExit,
  expectFailureMessage,
  makeRoot,
  readProvenanceLog,
  releaseFixturePack,
  packSourcePath,
  provenancePath,
  retirementRecordPath,
  snapshotIndexPath,
  writeLocalizedContent,
  writePackSource,
  writeProvenanceLog,
} from "./content-cli-fixtures.js";
import {
  makeRealLocalizedContent,
  makeRealPack,
  realAttestArgs,
  realAuthorActor,
  realEvidenceReference,
  realLocalizedPath,
  realPackId,
  realReleaseArgs,
  realRetireArgs,
  readRealBundle,
  readRealManifest,
  realReviewActors,
  recordRealReviews,
  registerRealPack,
  releaseRealPack,
  writeRealBundleBytes,
  writeRealEligibility,
  writeRealManifestBytes,
} from "./content-real-fixtures.js";
import { commitAll, gitTest, initRepository, makeSnapshotRoot } from "./git-fixture.js";

/**
 * The real (non-fixture) release path, exercised end to end.
 *
 * Every record involved is synthetic and lives in a temporary directory. No real
 * practitioner, founder, Burmese reviewer, or owner-authorized private record is
 * involved, and a passing test here establishes the mechanism only — never a
 * genuine qualification, a real review, or pilot eligibility for any content.
 */

function manifestPath(root: string, packId: string, version: number): string {
  return join(root, "artifacts", "manifests", packId, String(version), "manifest.json");
}

function bundlePath(root: string, packId: string, version: number): string {
  return join(root, "artifacts", "bundles", packId, String(version), "bundle.json");
}

function readManifest(root: string, packId: string, version: number) {
  return strictParse(
    releaseManifestSchema,
    JSON.parse(readFileSync(manifestPath(root, packId, version), "utf8")) as unknown,
  );
}

test("a real Pack releases with real classification and a pilot authorization scope", () => {
  const root = makeRoot();
  const { pack, release } = releaseRealPack(root);

  assert.match(release.stdout ?? "", /classification real, release authorization scope pilot/);

  const manifest = readManifest(root, pack.id, 1);
  assert.equal(manifest.classification, "real");
  assert.equal(manifest.fixtureOnly, false);
  assert.equal(manifest.authorizationScope, "pilot");

  const bundle = strictParse(
    releaseBundleSchema,
    JSON.parse(readFileSync(bundlePath(root, pack.id, 1), "utf8")) as unknown,
  );
  assert.equal(bundle.classification, "real");
  assert.equal(bundle.fixtureOnly, false);
  assert.equal(bundle.pack.fixtureOnly, false);
  assert.equal(bundle.classification, contentClassification(bundle.pack.fixtureOnly));

  // Cumulative provenance survives the real release boundary, with every event
  // attributed to a non-synthetic handle.
  const types = bundle.provenance.events.map((event) => event.type);
  for (const required of [
    "authored",
    "localized",
    "founder-reviewed",
    "practitioner-reviewed",
    "localization-reviewed",
    "accessibility-reviewed",
    "artifact-eligible",
    "artifact-released",
  ]) {
    assert.ok(types.includes(required as never), `missing ${required} event`);
  }
  for (const event of bundle.provenance.events) {
    assert.equal(event.fixtureOnly, false);
    assert.equal(String(event.actorId).startsWith("fixture-"), false);
  }
});

test("the practitioner independence and version-scope refusals hold on the real branch", () => {
  // Two Stage 2 refusals re-run against the real classification, because they are the
  // two the real path most depends on and the two a classification change could
  // quietly disable: an approver who authored the exact version, and an approval
  // carried to a different version.
  const selfApproved = makeRoot();
  const pack = makeRealPack();
  writePackSource(selfApproved, pack);
  writeLocalizedContent(selfApproved, makeRealLocalizedContent(pack));
  writeRealEligibility(selfApproved);
  expectExit(
    runNewVersionCommand(
      ["--pack", pack.id, "--actor", realReviewActors["practitioner-review"]],
      commandOptions(selfApproved),
    ),
    0,
  );
  expectExit(
    runAttestCommand(
      realAttestArgs({ packId: pack.id, version: 1, kind: "founder-review" }),
      commandOptions(selfApproved),
    ),
    0,
  );
  const selfApproval = runAttestCommand(
    realAttestArgs({ packId: pack.id, version: 1, kind: "practitioner-review" }),
    commandOptions(selfApproved),
  );
  expectExit(selfApproval, 1);
  expectFailureMessage(selfApproval, "approval must come from an independent practitioner");

  const stale = makeRoot();
  const first = makeRealPack();
  registerRealPack(stale, first);
  recordRealReviews(stale, first);
  expectExit(runReleaseCommand(realReleaseArgs(first.id, 1), commandOptions(stale)), 0);

  // Version 2 changes the content, so version 1's approval cannot cover it.
  const second = makeRealPack({ version: 2, summary: "A second version with different content." });
  writePackSource(stale, second);
  writeLocalizedContent(stale, makeRealLocalizedContent(second));
  expectExit(
    runNewVersionCommand(
      ["--pack", second.id, "--from", "1", "--actor", realAuthorActor],
      commandOptions(stale),
    ),
    0,
  );
  // A released version takes no further approvals, on the real branch too.
  const afterRelease = runAttestCommand(
    realAttestArgs({ packId: second.id, version: 1, kind: "practitioner-review" }),
    commandOptions(stale),
  );
  expectExit(afterRelease, 1);
  expectFailureMessage(afterRelease, 'current status "artifact-released"');
  // Offering version 1's approval records against version 2 is refused on scope.
  const copied = attestationFilePath(stale, second.id, 2, 2, "founder-review");
  const versionOneAttestation = JSON.parse(
    readFileSync(attestationFilePath(stale, second.id, 1, 3, "founder-review"), "utf8"),
  ) as Record<string, unknown>;
  versionOneAttestation["packVersion"] = 2;
  mkdirSync(join(copied, ".."), { recursive: true });
  writeFileSync(copied, `${JSON.stringify(versionOneAttestation, null, 2)}\n`, "utf8");
  const outOfScope = runStatusCommand(
    ["--pack", second.id, "--version", "2"],
    commandOptions(stale),
  );
  expectExit(outOfScope, 1);
  expectFailureMessage(outOfScope, "does not cover exact version scope");
});

test("a real record carrying free text is refused by the records, not only by the flags", () => {
  // `content:attest` and `content:retire` refuse the note and the prose reason as
  // arguments. A repository writer edits the record files directly, so the durable
  // rules are exercised on disk, with a fixture-side positive control.
  const noted = makeRoot();
  const pack = makeRealPack();
  registerRealPack(noted, pack);
  recordRealReviews(noted, pack, ["founder-review"]);
  const attestationPath = attestationFilePath(noted, pack.id, 1, 3, "founder-review");
  const attestation = JSON.parse(readFileSync(attestationPath, "utf8")) as Record<string, unknown>;
  attestation["note"] = "A reviewer's private reasoning written straight to the record file.";
  writeFileSync(attestationPath, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
  const refusedNote = runStatusCommand(
    ["--pack", pack.id, "--version", "1"],
    commandOptions(noted),
  );
  expectExit(refusedNote, 1);
  expectFailureMessage(refusedNote, "real-content attestations must not carry a free-text note");

  const proseRoot = makeRoot();
  const prosePack = makeRealPack();
  registerRealPack(proseRoot, prosePack);
  recordRealReviews(proseRoot, prosePack);
  expectExit(runReleaseCommand(realReleaseArgs(prosePack.id, 1), commandOptions(proseRoot)), 0);
  expectExit(
    runRetireCommand(
      realRetireArgs(prosePack.id, 1, "owner-record:retirement-2026-001"),
      commandOptions(proseRoot),
    ),
    0,
  );
  const recordPath = join(proseRoot, "content", "packs", prosePack.id, "retirements", "1.json");
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as Record<string, unknown>;
  record["reason"] = "The reviewer asked us to remove it after the session.";
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  const refusedReason = runStatusCommand(
    ["--pack", prosePack.id, "--version", "1"],
    commandOptions(proseRoot),
  );
  expectExit(refusedReason, 1);
  expectFailureMessage(
    refusedReason,
    'a real-content retirement reason must be an opaque "owner-record:<id>"',
  );

  // The fixture path is unchanged: the same note and reason are still accepted there.
  const fixtureRoot = makeRoot();
  const fixturePack = releaseFixturePack(fixtureRoot).pack;
  const fixtureAttestation = attestationFilePath(
    fixtureRoot,
    fixturePack.id,
    1,
    3,
    "founder-review",
  );
  const fixtureRecord = JSON.parse(readFileSync(fixtureAttestation, "utf8")) as Record<
    string,
    unknown
  >;
  fixtureRecord["note"] = "Synthetic fixture note written straight to the record file.";
  writeFileSync(fixtureAttestation, `${JSON.stringify(fixtureRecord, null, 2)}\n`, "utf8");
  expectExit(
    runStatusCommand(["--pack", fixturePack.id, "--version", "1"], commandOptions(fixtureRoot)),
    0,
  );
  expectExit(
    runRetireCommand(
      [
        "--pack",
        fixturePack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "A synthetic fixture retirement recorded in prose.",
      ],
      commandOptions(fixtureRoot),
    ),
    0,
  );
  // The repository verifier re-parses every attestation and retirement record, so a
  // pass proves both were read and accepted rather than skipped.
  expectExit(runVerifyCommand([], commandOptions(fixtureRoot)), 0);
  const fixtureRetirementRecord = JSON.parse(
    readFileSync(retirementRecordPath(fixtureRoot, fixturePack.id, 1), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(
    String(fixtureRetirementRecord["reason"]).toLowerCase().includes("synthetic"),
    true,
    "a fixture retirement keeps its prose reason",
  );
});

test("a real Pack starts with a new identifier and its own provenance genesis", () => {
  const root = makeRoot();
  const pack = makeRealPack();
  const setup = registerRealPack(root, pack);
  const log = readProvenanceLog(root, pack.id);
  const genesis = log.events[0]!;
  assert.equal(genesis.sequence, 1);
  assert.equal(genesis.previousEventDigest, null);
  assert.equal(genesis.type, "authored");
  assert.equal(genesis.fixtureOnly, false);
  assert.equal(genesis.actorId, realAuthorActor);
  assert.equal(setup.registered.exitCode, 0);
  // The real Pack lives in its own directory and its genesis is a true root event,
  // not a continuation of any earlier pack's chain.
  assert.equal(existsSync(join(root, "content", "packs", "fixture-retail-assistant")), false);
  assert.equal(genesis.previousEventDigest, null);
  assert.equal(genesis.sequence, 1);
});

test("a real Pack's provenance shares no event or digest with a fixture Pack", () => {
  // The stronger form of "its own provenance genesis": in one repository holding
  // both, no event digest of one log appears in the other and neither log names the
  // other's Pack.
  const root = makeRoot();
  const fixturePack = releaseFixturePack(root).pack;
  const realPack = makeRealPack();
  registerRealPack(root, realPack);
  const fixtureDigests = new Set(
    readProvenanceLog(root, fixturePack.id).events.map((event) => event.eventDigest),
  );
  const realLog = readProvenanceLog(root, realPack.id);
  for (const event of realLog.events) {
    assert.equal(fixtureDigests.has(event.eventDigest), false);
    assert.equal(event.packId, realPack.id);
  }
  assert.equal(realLog.events[0]!.previousEventDigest, null);
  // And a fixture Pack's own chain is untouched by the real Pack's presence.
  const fixtureAfter = readProvenanceLog(root, fixturePack.id);
  assert.equal(fixtureAfter.events.at(-1)!.type, "artifact-released");
});

test("a new version cannot be derived across classifications", () => {
  const root = makeRoot();
  // A fixture Pack is authored at version 1, then a real-classified source is
  // registered as its "version 2". The reserved Pack-ID namespace refuses it, and
  // the refusal names the derivation rule rather than a version conflict.
  const fixturePack = releaseFixturePack(root).pack;
  const realChild = makeRealPack({
    id: fixturePack.id,
    version: 2,
    fixtureOnly: false,
  });
  writePackSource(root, realChild);
  const derived = expectExit(
    runReleaseCommand(
      realReleaseArgs(fixturePack.id, 2, "pilot", "reviewer-handle-a7"),
      commandOptions(root),
    ),
    1,
  );
  expectFailureMessage(derived, 'permanent "fixture-" Pack-ID rule');
});

test("repository verification rebuilds a real release and refuses an altered scope", () => {
  const root = makeRoot();
  releaseRealPack(root);
  const report = JSON.parse(
    expectExit(runVerifyCommand([], commandOptions(root)), 0).stdout ?? "{}",
  ) as {
    releases: { classification: string; authorizationScope?: string }[];
  };
  // The real release rebuilds byte-identically from the authoring sources.
  assert.deepEqual(
    report.releases.map((release) => [release.classification, release.authorizationScope]),
    [["real", "pilot"]],
  );

  // `pilot` is the only grantable value, so a real manifest with no recorded scope
  // cannot be read at all: the artifact contract refuses it before the rebuild.
  const withoutScope = readRealManifest(root, realPackId, 1) as Record<string, unknown>;
  delete withoutScope["authorizationScope"];
  writeRealManifestBytes(root, realPackId, 1, `${JSON.stringify(withoutScope, null, 2)}\n`);
  const dropped = runVerifyCommand([], commandOptions(root));
  expectExit(dropped, 1);
  expectFailureMessage(dropped, 'real-classified content must record authorizationScope "pilot"');

  // A `public` scope is likewise unreadable: it is absent from the value domain, so
  // it can never be serialized into a release manifest.
  const asPublic = readRealManifest(root, realPackId, 1) as Record<string, unknown>;
  asPublic["authorizationScope"] = "public";
  writeRealManifestBytes(root, realPackId, 1, `${JSON.stringify(asPublic, null, 2)}\n`);
  const forbidden = runVerifyCommand([], commandOptions(root));
  expectExit(forbidden, 1);
  // The value domain admits only `pilot`, so `public` is unreadable as a value.
  expectFailureMessage(forbidden, 'expected "pilot"');
  // And the runtime schema refuses the value for the same reason.
  assert.throws(
    () => strictParse(releaseManifestSchema, readRealManifest(root, realPackId, 1) as unknown),
    /expected "pilot"/,
  );
});

test("releasing real content requires an explicit pilot scope and never a public one", () => {
  const noScope = makeRoot();
  const pack = makeRealPack();
  registerRealPack(noScope, pack);
  recordRealReviews(noScope, pack);
  const missing = runReleaseCommand(realReleaseArgs(pack.id, 1, null), commandOptions(noScope));
  expectExit(missing, 2);
  expectFailureMessage(missing, "requires --authorization-scope pilot");
  assert.equal(existsSync(join(noScope, "artifacts")), false);

  const publicScope = makeRoot();
  registerRealPack(publicScope, pack);
  recordRealReviews(publicScope, pack);
  const forbidden = runReleaseCommand(
    realReleaseArgs(pack.id, 1, "public"),
    commandOptions(publicScope),
  );
  expectExit(forbidden, 2);
  expectFailureMessage(forbidden, "is refused: public release additionally requires");
  assert.equal(existsSync(join(publicScope, "artifacts")), false);

  const unknownScope = makeRoot();
  registerRealPack(unknownScope, pack);
  recordRealReviews(unknownScope, pack);
  const mistypedContact = ["reviewer", "@", "example.invalid"].join("");
  const unknown = runReleaseCommand(
    realReleaseArgs(pack.id, 1, mistypedContact),
    commandOptions(unknownScope),
  );
  expectExit(unknown, 2);
  expectFailureMessage(unknown, "must be one of: pilot, public");
  assert.equal((unknown.stderr ?? "").includes(mistypedContact), false);
  assert.equal(existsSync(join(unknownScope, "artifacts")), false);
});

test("real records refuse a synthetic actor, synthetic evidence, and an unbound note", () => {
  const syntheticActor = makeRoot();
  const pack = makeRealPack();
  registerRealPack(syntheticActor, pack);
  const refused = runAttestCommand(
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
    commandOptions(syntheticActor),
  );
  expectExit(refused, 1);
  expectFailureMessage(refused, "must not be a fixture- identity on real content");
  assert.equal(
    existsSync(join(syntheticActor, "content", "packs", pack.id, "attestations")),
    false,
  );

  const noteRoot = makeRoot();
  registerRealPack(noteRoot, pack);
  const noted = runAttestCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--kind",
      "founder-review",
      "--actor",
      "founder-handle-c2",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
      "--note",
      "A note that no digest binds and no artifact carries.",
    ],
    commandOptions(noteRoot),
  );
  expectExit(noted, 2);
  expectFailureMessage(noted, "--note is not accepted for real content");

  // The inverse evidence rules hold at the command boundary, not only in schemas.
  const fluency = makeRoot();
  registerRealPack(fluency, pack);
  const syntheticFluency = runAttestCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--kind",
      "localization-review",
      "--actor",
      "burmese-handle-d3",
      "--outcome",
      "approved",
      "--locale",
      "my",
      "--fluent-burmese-confirmed",
      "true",
      "--fluent-review-evidence",
      `fixture:${"synthetic-fluency-001"}`,
    ],
    commandOptions(fluency),
  );
  expectExit(syntheticFluency, 1);
  expectFailureMessage(syntheticFluency, "must not use a fixture: reference on real content");

  const qualification = makeRoot();
  registerRealPack(qualification, pack);
  writeRealEligibility(qualification, {
    evidenceReferences: [`fixture:${"synthetic-qualification-001"}`],
  });
  // The record can be written by hand; every command and the repository verifier
  // refuse to read it, so a synthetic reference never reaches a release.
  const written = readFileSync(
    join(qualification, "content", "eligibility", "reviewer-handle-a7.json"),
    "utf8",
  );
  assert.match(written, /synthetic-qualification-001/);
  recordRealReviews(qualification, pack, ["founder-review"]);
  const syntheticQualification = runAttestCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--kind",
      "practitioner-review",
      "--actor",
      "reviewer-handle-a7",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
    ],
    commandOptions(qualification),
  );
  expectExit(syntheticQualification, 1);
  expectFailureMessage(syntheticQualification, "must not use a fixture: reference on real content");
  assert.equal(qualification.includes("real qualification evidence"), false);
});

test("a real eligibility record must carry an opaque reference, and Git holds no reason", () => {
  const root = makeRoot();
  const pack = makeRealPack();
  registerRealPack(root, pack);
  const eligibility = JSON.parse(
    readFileSync(join(root, "content", "eligibility", "reviewer-handle-a7.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(eligibility["fixtureOnly"], false);
  assert.deepEqual(eligibility["evidenceReferences"], [realEvidenceReference]);
  // The reference is a pointer with no resolution mechanism and no credential.
  assert.equal(String(eligibility["evidenceReferences"]).includes("@"), false);
  assert.equal(pack.id.startsWith("fixture-"), false);
});

test("real retirement accepts only an opaque owner-record reason", () => {
  const prose = makeRoot();
  const pack = makeRealPack();
  registerRealPack(prose, pack);
  recordRealReviews(prose, pack);
  expectExit(runReleaseCommand(realReleaseArgs(pack.id, 1), commandOptions(prose)), 0);

  const refused = runRetireCommand(
    realRetireArgs(pack.id, 1, "The reviewer asked us to remove it after the session."),
    commandOptions(prose),
  );
  expectExit(refused, 2);
  expectFailureMessage(refused, 'requires --reason "owner-record:<id>"');
  assert.equal(existsSync(join(prose, "artifacts", "retirements", pack.id, "1.json")), false);

  const accepted = expectExit(
    runRetireCommand(realRetireArgs(pack.id, 1), commandOptions(prose)),
    0,
  );
  assert.match(accepted.stdout ?? "", /retirement notice written/);
  const record = JSON.parse(
    readFileSync(join(prose, "content", "packs", pack.id, "retirements", "1.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(record["reason"], "owner-record:retirement-2026-001");
  assert.equal(record["fixtureOnly"], false);
  // The notice carries neither the actor nor the reason: both stay outside Git.
  const notice = JSON.parse(
    readFileSync(join(prose, "artifacts", "retirements", pack.id, "1.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal("reason" in notice, false);
  assert.equal("actorId" in notice, false);
  expectExit(runVerifyCommand([], commandOptions(prose)), 0);
});

test("a real release or retirement attributed to a synthetic identity is refused", () => {
  // The last two lifecycle commands carry the same classification guard, and each
  // needs its own negative: a synthetic identity must not be able to release or
  // retire real content.
  const releaseRoot = makeRoot();
  const pack = makeRealPack();
  registerRealPack(releaseRoot, pack);
  recordRealReviews(releaseRoot, pack);
  const beforeLog = readFileSync(provenancePath(releaseRoot, pack.id), "utf8");
  const refusedRelease = runReleaseCommand(
    realReleaseArgs(pack.id, 1, "pilot", "fixture-operator-one"),
    commandOptions(releaseRoot),
  );
  expectExit(refusedRelease, 1);
  expectFailureMessage(refusedRelease, "must not be a fixture- identity on real content");
  assert.equal(existsSync(bundlePath(releaseRoot, pack.id, 1)), false);
  assert.equal(readFileSync(provenancePath(releaseRoot, pack.id), "utf8"), beforeLog);

  const retireRoot = makeRoot();
  const retiredPack = makeRealPack();
  registerRealPack(retireRoot, retiredPack);
  recordRealReviews(retireRoot, retiredPack);
  expectExit(runReleaseCommand(realReleaseArgs(retiredPack.id, 1), commandOptions(retireRoot)), 0);
  const refusedRetirement = runRetireCommand(
    [
      "--pack",
      retiredPack.id,
      "--version",
      "1",
      "--actor",
      "fixture-operator-one",
      "--reason",
      "owner-record:retirement-2026-001",
    ],
    commandOptions(retireRoot),
  );
  expectExit(refusedRetirement, 1);
  expectFailureMessage(refusedRetirement, "must not be a fixture- identity on real content");
  assert.equal(
    existsSync(join(retireRoot, "content", "packs", retiredPack.id, "retirements", "1.json")),
    false,
  );
  assert.equal(
    existsSync(join(retireRoot, "artifacts", "retirements", retiredPack.id, "1.json")),
    false,
  );
});

test("no pilot-scoped record or report can say a version is approved for release", () => {
  const root = makeRoot();
  const { pack, version } = releaseRealPack(root);
  const surfaces: string[] = [
    readFileSync(bundlePath(root, pack.id, version), "utf8"),
    readFileSync(manifestPath(root, pack.id, version), "utf8"),
    readFileSync(snapshotIndexPath(root), "utf8"),
    expectExit(runVerifyCommand([], commandOptions(root)), 0).stdout ?? "",
    expectExit(
      runStatusCommand(["--pack", pack.id, "--version", String(version)], commandOptions(root)),
      0,
    ).stdout ?? "",
    expectExit(
      runStatusCommand(
        ["--pack", pack.id, "--version", String(version), "--json"],
        commandOptions(root),
      ),
      0,
    ).stdout ?? "",
  ];
  for (const surface of surfaces) {
    assert.equal(
      /approved for release|approved-for-release|cleared for release|release approved/i.test(
        surface,
      ),
      false,
      "a pilot-scoped record must not read as public-release approval",
    );
  }
  // The two deferrals that keep the distinction visible travel with the record.
  const manifest = readManifest(root, pack.id, version);
  assert.equal(manifest.gates.targetUserComprehensionDeferred, true);
  assert.equal(manifest.gates.runtimeAccessibilityDeferred, true);
});

test("a sponsored real Pack is refused because the Burmese text carries no disclosure", () => {
  // `YWAY-P020` requires the disclosure to reach the reader. The localization schema
  // has no sponsorship field, so a sponsored real Pack must not be released into a
  // participant's Burmese text with the disclosure only in the canonical source.
  const root = makeRoot();
  const pack = makeRealPack({
    sponsorship: {
      sponsorName: "Test Sponsor",
      disclosure: "This pack is sponsored by Test Sponsor.",
      editorialIndependence: "The sponsor has no editorial control over content or ordering.",
      editorialControl: "independent",
      orderingInfluence: "none",
    },
  });
  registerRealPack(root, pack);
  recordRealReviews(root, pack, [
    "founder-review",
    "practitioner-review",
    "localization-review",
    "accessibility-review",
    "sponsorship-disclosure",
  ]);
  const refused = runReleaseCommand(realReleaseArgs(pack.id, 1), commandOptions(root));
  expectExit(refused, 1);
  expectFailureMessage(refused, "sponsored real content is not releasable");
  expectFailureMessage(refused, "YWAY-P020");
  assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);
});

test("a changed localization, a stale digest, and forged artifact bytes are all refused", () => {
  const changedLocalization = makeRoot();
  const pack = makeRealPack();
  registerRealPack(changedLocalization, pack);
  writeFileSync(
    realLocalizedPath(changedLocalization, pack.id, 1),
    `${JSON.stringify(makeRealLocalizedContent(pack, { summary: "A changed translation." }), null, 2)}\n`,
    "utf8",
  );
  const status = runStatusCommand(
    ["--pack", pack.id, "--version", "1"],
    commandOptions(changedLocalization),
  );
  expectExit(status, 1);
  expectFailureMessage(status, "does not match the source-derived digest");

  const staleDigest = makeRoot();
  const stalePack = makeRealPack();
  registerRealPack(staleDigest, stalePack);
  const log = readProvenanceLog(staleDigest, stalePack.id);
  writeProvenanceLog(staleDigest, stalePack.id, {
    ...log,
    events: log.events.map((event, index) =>
      index === 0 ? { ...event, contentDigest: "b".repeat(64) } : event,
    ),
  });
  const stale = runStatusCommand(
    ["--pack", stalePack.id, "--version", "1"],
    commandOptions(staleDigest),
  );
  expectExit(stale, 1);
  expectFailureMessage(stale, "does not match the source-derived digest");

  const forged = makeRoot();
  releaseRealPack(forged);
  const bundle = readRealBundle(forged, realPackId, 1) as Record<string, unknown>;
  (bundle["pack"] as Record<string, unknown>)["summary"] = "Forged text that no review covered.";
  writeRealBundleBytes(forged, realPackId, 1, `${JSON.stringify(bundle, null, 2)}\n`);
  const forgedResult = runVerifyCommand([], commandOptions(forged));
  expectExit(forgedResult, 1);
  expectFailureMessage(forgedResult, "does not match the bytes regenerated");
});

test("a real release missing any shared gate is refused and writes nothing", () => {
  const root = makeRoot();
  const pack = makeRealPack();
  registerRealPack(root, pack);
  recordRealReviews(root, pack, ["founder-review", "practitioner-review"]);
  const result = runReleaseCommand(realReleaseArgs(pack.id, 1), commandOptions(root));
  expectExit(result, 1);
  expectFailureMessage(result, "fluent Burmese localization review is required");
  expectFailureMessage(result, "content accessibility review is required");
  assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);
  assert.equal(existsSync(snapshotIndexPath(root)), false);
});

gitTest("a pilot build consumes a real release through the trusted snapshot seam", () => {
  const root = makeSnapshotRoot();
  const { pack, version } = releaseRealPack(root);
  initRepository(root);
  const commit = commitAll(root, "release a real pilot pack");

  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
  const pilot = inspectPilotSnapshotVersion(snapshot, pack.id, version);

  assert.equal(pilot.bundle.classification, "real");
  assert.equal(pilot.manifest.authorizationScope, "pilot");
  assert.equal(pilot.authorizationScope, "pilot");
  assert.equal(pilot.trustedCommit, commit);
  // The returned buffers are the byte-verified bytes the trusted commit pins.
  assert.equal(pilot.bundleDigest, sha256Hex(pilot.bundleBytes));
  assert.equal(pilot.manifestDigest, sha256Hex(pilot.manifestBytes));
  assert.equal(
    pilot.bundleDigest,
    snapshot.index.entries.find((entry) => entry.kind === "bundle")?.digest,
  );
  assert.equal(
    pilot.bundleBytes.toString("utf8"),
    readFileSync(bundlePath(root, pack.id, version), "utf8"),
  );
});

gitTest("the pilot seam refuses a fixture Pack even when it sits in a verified snapshot", () => {
  const root = makeSnapshotRoot();
  const fixture = releaseFixturePack(root);
  initRepository(root);
  const commit = commitAll(root, "release a fixture pack");
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
  expectExit(runVerifyCommand(["--trusted-commit", commit], commandOptions(root)), 0);
  assert.throws(
    () => inspectPilotSnapshotVersion(snapshot, fixture.pack.id, 1),
    /permanently reserved "fixture-" Pack-ID namespace/,
  );
});

gitTest("the pilot seam refuses a real release whose recorded scope was stripped", () => {
  const root = makeSnapshotRoot();
  releaseRealPack(root);
  initRepository(root);

  // Re-seal the artifact set consistently and commit it, so the pinned-tree
  // comparison passes and only the artifact contract can refuse the manifest.
  const manifest = readRealManifest(root, realPackId, 1) as Record<string, unknown>;
  delete manifest["authorizationScope"];
  writeRealManifestBytes(root, realPackId, 1, `${JSON.stringify(manifest, null, 2)}\n`);
  rebindIndex(root);
  const commit = commitAll(root, "drop the recorded pilot scope");
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });
  assert.throws(
    () => inspectPilotSnapshotVersion(snapshot, realPackId, 1),
    /real-classified content must record authorizationScope "pilot"/,
  );
});

gitTest("the pilot seam refuses forged content bytes once the index is re-sealed", () => {
  const root = makeSnapshotRoot();
  releaseRealPack(root);
  initRepository(root);

  const bundle = readRealBundle(root, realPackId, 1) as Record<string, unknown>;
  (bundle["pack"] as Record<string, unknown>)["summary"] =
    "A re-sealed Pack that no review covered.";
  const bundleBytes = `${JSON.stringify(bundle, null, 2)}\n`;
  writeRealBundleBytes(root, realPackId, 1, bundleBytes);
  const manifest = readRealManifest(root, realPackId, 1) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(bundleBytes);
  writeRealManifestBytes(root, realPackId, 1, `${JSON.stringify(manifest, null, 2)}\n`);
  rebindIndex(root);
  const commit = commitAll(root, "re-seal the pack content");
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });

  // The pinned tree is internally consistent, which is exactly the case the
  // pinned-tree comparison cannot catch: the bundle's own content digest no longer
  // matches its embedded Pack.
  assert.throws(
    () => inspectPilotSnapshotVersion(snapshot, realPackId, 1),
    /does not match its embedded Pack digest/,
  );
  // And the repository verifier, which reads the authoring sources, refuses it too.
  expectExit(runVerifyCommand([], commandOptions(root)), 1);
});

gitTest(
  "a committed artifact set whose bundle carries a reserved Pack ID is refused by the consumer",
  () => {
    // The repository-command refusals are only half the boundary. This is the other
    // half: a **fully re-sealed** artifact set — content digests, provenance chain,
    // manifest, and index all recomputed after the rename — whose bundle claims
    // `real` while its Pack identifier sits in the permanently reserved `fixture-`
    // namespace. Every binding agrees, so the identifier rule is the only thing
    // that can refuse it, and it must refuse at both the artifact-only consumer and
    // the repository verifier.
    const root = makeSnapshotRoot();
    releaseRealPack(root);
    const relabelledId = "fixture-relabelled-retail";
    resealWithPackId(root, realPackId, relabelledId, 1);
    initRepository(root);
    const commit = commitAll(root, "relabel a real artifact into the reserved Pack ID namespace");
    const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });

    // The pinned-tree comparison is satisfied: the index digests match, the pinned
    // tree matches the working tree, and the canonical paths are right.
    expectExit(runVerifyCommand(["--trusted-commit", commit], commandOptions(root)), 0);
    for (const attempt of [
      () => inspectPilotSnapshotVersion(snapshot, relabelledId, 1),
      () =>
        loadReleasedBundle({
          repositoryRoot: root,
          trustedCommit: commit,
          packId: relabelledId,
          packVersion: 1,
        }),
    ]) {
      assert.throws(attempt, /permanent "fixture-" Pack-ID rule/);
    }
    // The repository verifier refuses the authoring sources for the same reason.
    const repositoryVerify = runVerifyCommand([], commandOptions(root));
    expectExit(repositoryVerify, 1);
    expectFailureMessage(repositoryVerify, 'permanent "fixture-" Pack-ID rule');
  },
);

/**
 * Renames a Pack everywhere — authoring sources, localization, provenance chain,
 * bundle, manifest, and index — and recomputes every binding, so the result is a
 * self-consistent record set under a new identifier. Only the identifier is wrong.
 */
function resealWithPackId(root: string, fromId: string, toId: string, version: number): void {
  // The authoring sources are YAML, so they are parsed through the same schema the
  // pipeline uses rather than through `JSON.parse`.
  const relabelledSource = parseStrictYaml(
    packSourceSchema,
    readFileSync(packSourcePath(root, fromId, version), "utf8").replaceAll(fromId, toId),
  );
  const relabelledLocalized = parseStrictYaml(
    localizedContentSchema,
    readFileSync(realLocalizedPath(root, fromId, version), "utf8").replaceAll(fromId, toId),
  );
  const log = readProvenanceLog(root, fromId);
  const sourceDigest = contentDigest(relabelledSource);
  const localizedDigest = contentDigest(relabelledLocalized);

  // Re-chain the provenance events under the new digest and Pack identifier.
  const resealed: Record<string, unknown>[] = [];
  for (const event of log.events) {
    const previous = resealed[resealed.length - 1];
    const fields: Record<string, unknown> = {
      ...event,
      packId: toId,
      contentDigest: sourceDigest,
      previousEventDigest: previous?.["eventDigest"] ?? null,
    };
    if (event["localizedContentDigest"] !== undefined) {
      fields["localizedContentDigest"] = localizedDigest;
    }
    const preImage = { ...fields };
    delete preImage["eventDigest"];
    resealed.push({ ...fields, eventDigest: computeProvenanceEventDigest(preImage as never) });
  }
  const relabelledLog = { schemaVersion: log.schemaVersion, packId: toId, events: resealed };

  const bundle = JSON.parse(
    readFileSync(
      join(root, "artifacts", "bundles", fromId, String(version), "bundle.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const relabelledBundle = JSON.parse(JSON.stringify(bundle).replaceAll(fromId, toId)) as Record<
    string,
    unknown
  >;
  relabelledBundle["contentDigest"] = sourceDigest;
  relabelledBundle["localizedContentDigest"] = localizedDigest;
  relabelledBundle["provenance"] = relabelledLog;
  const bundleBytes = `${JSON.stringify(relabelledBundle, null, 2)}\n`;

  const manifest = JSON.parse(
    readFileSync(
      join(root, "artifacts", "manifests", fromId, String(version), "manifest.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const relabelledManifest = JSON.parse(
    JSON.stringify(manifest).replaceAll(fromId, toId),
  ) as Record<string, unknown>;
  relabelledManifest["contentDigest"] = sourceDigest;
  (relabelledManifest["gates"] as Record<string, unknown>)["localizedContentDigest"] =
    localizedDigest;
  (relabelledManifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(bundleBytes);

  // Move the authoring sources under the new identifier as well, so the repository
  // verifier refuses on the identifier rather than on a missing file.
  const sourceTarget = packSourcePath(root, toId, version);
  mkdirSync(join(sourceTarget, ".."), { recursive: true });
  writeFileSync(sourceTarget, stringify(relabelledSource), "utf8");
  const localizedTarget = realLocalizedPath(root, toId, version);
  mkdirSync(join(localizedTarget, ".."), { recursive: true });
  writeFileSync(localizedTarget, stringify(relabelledLocalized), "utf8");
  writeProvenanceLog(root, toId, relabelledLog as never);
  for (const kind of ["attestations", "retirements"]) {
    const from = join(root, "content", "packs", fromId, kind);
    if (!existsSync(from)) {
      continue;
    }
    mkdirSync(join(root, "content", "packs", toId, kind), { recursive: true });
    cpSync(from, join(root, "content", "packs", toId, kind), { recursive: true });
  }
  rmSync(join(root, "content", "packs", fromId), { recursive: true, force: true });

  const bundleTarget = join(root, "artifacts", "bundles", toId, String(version), "bundle.json");
  mkdirSync(join(bundleTarget, ".."), { recursive: true });
  writeFileSync(bundleTarget, bundleBytes, "utf8");
  rmSync(join(root, "artifacts", "bundles", fromId), { recursive: true, force: true });
  const manifestTarget = join(
    root,
    "artifacts",
    "manifests",
    toId,
    String(version),
    "manifest.json",
  );
  mkdirSync(join(manifestTarget, ".."), { recursive: true });
  writeFileSync(manifestTarget, `${JSON.stringify(relabelledManifest, null, 2)}\n`, "utf8");
  rmSync(join(root, "artifacts", "manifests", fromId), { recursive: true, force: true });

  relabelIndexEntries(root, fromId, toId);
  rebindIndex(root);
}

gitTest("a real bundle read from a non-canonical path is refused", () => {
  // The canonical-path refusal is one of the Stage 2 guarantees, re-run here on the
  // real branch: an artifact set whose index entry sits somewhere other than the
  // canonical path cannot satisfy a consumer.
  const root = makeSnapshotRoot();
  const { pack, version } = releaseRealPack(root);
  const moved = join(root, "artifacts", "bundles", "moved", "bundle.json");
  mkdirSync(join(moved, ".."), { recursive: true });
  renameSync(bundlePath(root, pack.id, version), moved);
  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) =>
    entry["kind"] === "bundle" ? { ...entry, path: "bundles/moved/bundle.json" } : entry,
  );
  writeFileSync(indexPath, snapshotIndexBytes(index.entries as never), "utf8");
  initRepository(root);
  const commit = commitAll(root, "move a real bundle off its canonical path");
  assert.throws(
    () => verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit }),
    /its canonical path is bundles\/fixture|its canonical path is/,
  );
});

gitTest("a real bundle with a synthetic provenance actor is refused by the consumer", () => {
  // The consumer's classification branch in the real direction: the bundle claims
  // `real` but its sealed provenance still names a `fixture-` identity.
  const root = makeSnapshotRoot();
  releaseRealPack(root);
  const bundle = readRealBundle(root, realPackId, 1) as {
    provenance: { events: Record<string, unknown>[] };
  };
  const resealed: Record<string, unknown>[] = [];
  for (const [position, event] of bundle.provenance.events.entries()) {
    const previous = resealed[position - 1];
    const fields: Record<string, unknown> = {
      ...event,
      actorId: "fixture-practitioner-one",
      previousEventDigest: previous?.["eventDigest"] ?? event["previousEventDigest"],
    };
    const preImage = { ...fields };
    delete preImage["eventDigest"];
    resealed.push({ ...fields, eventDigest: computeProvenanceEventDigest(preImage as never) });
  }
  bundle.provenance.events = resealed;
  const bundleBytes = `${JSON.stringify(bundle, null, 2)}\n`;
  writeRealBundleBytes(root, realPackId, 1, bundleBytes);
  const manifest = readRealManifest(root, realPackId, 1) as Record<string, unknown>;
  (manifest["bundle"] as Record<string, string>)["digest"] = sha256Hex(bundleBytes);
  writeRealManifestBytes(root, realPackId, 1, `${JSON.stringify(manifest, null, 2)}\n`);
  rebindIndex(root);
  initRepository(root);
  const commit = commitAll(root, "reseal a real bundle with a synthetic actor identity");
  const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });

  expectExit(runVerifyCommand(["--trusted-commit", commit], commandOptions(root)), 0);
  assert.throws(
    () => inspectPilotSnapshotVersion(snapshot, realPackId, 1),
    /must not be a fixture- identity on real content/,
  );
});

gitTest("the classification-agnostic loader accepts real content and is not a pilot gate", () => {
  // Stated rather than implied: the pre-existing loader validates whichever
  // classification the bundle records. That is why a build must call
  // `loadPilotBundle`, which verifies the snapshot itself and then applies the pilot
  // conditions.
  const root = makeSnapshotRoot();
  const { pack, version } = releaseRealPack(root);
  initRepository(root);
  const commit = commitAll(root, "release a real pilot pack");

  const loaded = loadReleasedBundle({
    repositoryRoot: root,
    trustedCommit: commit,
    packId: pack.id,
    packVersion: version,
  });
  assert.equal(loaded.entry.bundle.classification, "real");
  assert.equal(loaded.entry.retired, false);

  const pilot = loadPilotBundle({
    repositoryRoot: root,
    trustedCommit: commit,
    packId: pack.id,
    packVersion: version,
  });
  assert.equal(pilot.version.authorizationScope, "pilot");
  assert.equal(pilot.version.bundleDigest, sha256Hex(pilot.version.bundleBytes));

  const fixtureRoot = makeSnapshotRoot();
  const fixture = releaseFixturePack(fixtureRoot);
  initRepository(fixtureRoot);
  const fixtureCommit = commitAll(fixtureRoot, "release a fixture pack");
  assert.throws(
    () =>
      loadPilotBundle({
        repositoryRoot: fixtureRoot,
        trustedCommit: fixtureCommit,
        packId: fixture.pack.id,
        packVersion: 1,
      }),
    /permanently reserved "fixture-" Pack-ID namespace/,
  );
});

gitTest(
  "a retired real version is refused by the pilot seam and the artifact stays immutable",
  () => {
    const root = makeSnapshotRoot();
    const { pack, version } = releaseRealPack(root);
    expectExit(runRetireCommand(realRetireArgs(pack.id, version), commandOptions(root)), 0);
    const beforeBundle = readFileSync(bundlePath(root, pack.id, version), "utf8");
    initRepository(root);
    const commit = commitAll(root, "retire a real pilot pack");
    const snapshot = verifyArtifactSnapshot({ repositoryRoot: root, trustedCommit: commit });

    assert.throws(
      () => inspectPilotSnapshotVersion(snapshot, pack.id, version),
      /has a retirement notice in the trusted snapshot/,
    );
    // Retirement is a distribution response, not a content recall: the historical
    // bundle survives byte for byte and the snapshot still verifies.
    assert.equal(readFileSync(bundlePath(root, pack.id, version), "utf8"), beforeBundle);
    expectExit(runVerifyCommand(["--trusted-commit", commit], commandOptions(root)), 0);
  },
);

/** Re-points only the index entries that belong to the renamed Pack. */
function relabelIndexEntries(root: string, fromId: string, toId: string): void {
  const path = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(path, "utf8")) as {
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.map((entry) =>
    entry["packId"] === fromId
      ? { ...entry, packId: toId, path: String(entry["path"]).replaceAll(fromId, toId) }
      : entry,
  );
  writeFileSync(path, snapshotIndexBytes(index.entries as never), "utf8");
}

/** Rewrites the snapshot index so it agrees with locally edited artifact bytes. */
function rebindIndex(root: string): void {
  const path = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(path, "utf8")) as { entries: Record<string, unknown>[] };
  index.entries = index.entries.map((entry) => ({
    ...entry,
    digest: sha256Hex(readFileSync(join(root, "artifacts", String(entry["path"])), "utf8")),
  }));
  writeFileSync(path, snapshotIndexBytes(index.entries as never), "utf8");
}
