import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertBundleBindings,
  evaluateReleaseGates,
  loadPilotBundle,
  packSourceSchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runRetireCommand,
  runStatusCommand,
  runVerifyCommand,
  sha256Hex,
  strictParse,
  verifyVersionGovernance,
} from "../content/index.js";
import {
  commandOptions as legacyCommandOptions,
  expectExit,
  expectFailureMessage,
  makeLocalizedContent,
  makePack,
  makeRoot,
  releaseArgs,
  releaseBundlePath,
  releaseManifestPath,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
} from "./content-cli-fixtures.js";
import {
  makeRealPack,
  realAttestArgs,
  realAuthorActor,
  realReleaseActor,
  realReviewActors,
  registerRealPack,
} from "./content-real-fixtures.js";
import { commitAll, gitTest, initRepository, makeSnapshotRoot } from "./git-fixture.js";

function commandOptions(root: string) {
  const { repositoryRoot, now } = legacyCommandOptions(root);
  return { repositoryRoot, now };
}

function prepare(independentBurmese = false) {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  writeLocalizedContent(root, makeLocalizedContent(pack));
  expectExit(
    runNewVersionCommand(
      ["--pack", pack.id, "--actor", "fixture-author-one"],
      commandOptions(root),
    ),
    0,
  );
  const args = ["--pack", pack.id, "--version", "1"];
  const attest = (flags: string[]) =>
    runAttestCommand(
      [...args, ...(flags.includes("--outcome") ? [] : ["--outcome", "approved"]), ...flags],
      commandOptions(root),
    );
  expectExit(
    attest([
      "--kind",
      "localization-review",
      "--actor",
      independentBurmese ? "fixture-localizer-one" : "fixture-author-one",
      "--locale",
      "my",
      "--fluent-burmese-confirmed",
      "true",
      "--fluent-review-evidence",
      "fixture:fluent",
      "--reviewer-relationship",
      independentBurmese ? "independent" : "owner-fluent-self-review",
    ]),
    0,
  );
  expectExit(
    attest([
      "--kind",
      "accessibility-review",
      "--actor",
      "fixture-accessibility-one",
      "--reading-order-confirmed",
      "true",
      "--media-alternatives-confirmed",
      "true",
      "--runtime-validation-deferred",
    ]),
    0,
  );
  const ai = () =>
    attest([
      "--kind",
      "ai-review",
      "--actor",
      "fixture-ai-one",
      "--reviewer-system",
      "fixture-model-1",
      "--review-criteria",
      "domain-content-v1",
      "--findings-reference",
      "fixture:findings",
    ]);
  const practitioner = () =>
    attest([
      "--kind",
      "practitioner-review",
      "--actor",
      "fixture-practitioner-one",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
    ]);
  const owner = (policy: string) =>
    attest([
      "--kind",
      "owner-approval",
      "--actor",
      "fixture-owner-one",
      "--release-policy",
      policy,
      "--policy-version",
      "1",
      "--policy-applicability",
      "fixture-test",
    ]);
  return { root, pack, attest, ai, practitioner, owner };
}

test("ai-owner fixture release records policy and truthful absence of practitioner review", () => {
  const { root, pack, ai, owner } = prepare();
  expectExit(ai(), 0);
  expectExit(owner("ai-owner"), 0);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 0);
  const manifest = JSON.parse(readFileSync(releaseManifestPath(root, pack.id, 1), "utf8"));
  assert.equal(manifest.gates.releasePolicy.id, "ai-owner");
  assert.equal(manifest.gates.practitionerApproved, false);
  expectExit(runVerifyCommand([], { repositoryRoot: root }), 0);
  const status =
    expectExit(runStatusCommand(["--pack", pack.id, "--version", "1"], commandOptions(root)), 0)
      .stdout ?? "";
  assert.match(status, /practitioner review: absent/);
  assert.match(status, /Burmese review: owner self-review/);
});

test("human-assured requires qualified practitioner before owner approval and releases when present", () => {
  const { root, pack, ai, practitioner, owner } = prepare();
  expectExit(ai(), 0);
  expectFailureMessage(expectExit(owner("human-assured"), 2), "requires valid practitioner review");
  writeEligibility(root, "fixture-practitioner-one");
  expectExit(practitioner(), 0);
  expectExit(owner("human-assured"), 0);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 0);
  const manifest = JSON.parse(readFileSync(releaseManifestPath(root, pack.id, 1), "utf8"));
  assert.equal(manifest.gates.practitionerApproved, true);
  expectExit(runVerifyCommand([], { repositoryRoot: root }), 0);
});

test("AI assistance alone and policy mismatch cannot approve release", () => {
  const { root, pack, owner } = prepare();
  expectFailureMessage(expectExit(owner("ai-owner"), 2), "requires completed AI review");
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 1),
    "new releases require selected ai-owner or human-assured policy",
  );
  const sourcePath = `${root}/content/packs/${pack.id}/1.yaml`;
  assert.match(readFileSync(sourcePath, "utf8"), /aiAssisted: true/);
  writeFileSync(
    sourcePath,
    readFileSync(sourcePath, "utf8").replace("aiAssisted: true", "aiAssisted: false"),
  );
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 1),
    "tampered",
  );
});

test("wrong policy and stale AI or owner reviews are refused", () => {
  const first = prepare();
  expectExit(first.ai(), 0);
  expectExit(first.owner("ai-owner"), 0);
  const verified = verifyVersionGovernance(first.root, first.pack.id, 1);
  assert.throws(
    () =>
      evaluateReleaseGates({
        pack: verified.source,
        localizedContent: verified.localizedContent,
        provenanceLog: verified.provenanceLog,
        attestations: verified.attestations,
        releasePolicy: { id: "human-assured", version: 1, applicability: "fixture-test" },
        evaluateAt: "2026-09-24T00:00:00Z",
      }),
    /mismatched|requires qualified practitioner/,
  );
  expectExit(
    first.attest([
      "--kind",
      "ai-review",
      "--actor",
      "fixture-ai-one",
      "--outcome",
      "changes-requested",
    ]),
    0,
  );
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(first.pack.id, 1), commandOptions(first.root)), 1),
    "standing practitioner-reviewed or artifact-eligible",
  );
  expectFailureMessage(expectExit(first.owner("ai-owner"), 2), "requires completed AI review");
  const second = prepare();
  expectExit(second.ai(), 0);
  expectExit(
    second.attest([
      "--kind",
      "ai-review",
      "--actor",
      "fixture-ai-one",
      "--outcome",
      "changes-requested",
    ]),
    0,
  );
  expectFailureMessage(expectExit(second.owner("ai-owner"), 2), "requires completed AI review");
});

test("localized content mutation invalidates bound policy reviews", () => {
  const { root, pack, ai, owner } = prepare();
  expectExit(ai(), 0);
  expectExit(owner("ai-owner"), 0);
  const path = `${root}/content/packs/${pack.id}/localizations/1.yaml`;
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("Synthetic Burmese title", "Different Burmese title"),
  );
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 1),
    "tampered",
  );
});

test("Pack source cannot author a weaker review policy", () => {
  assert.throws(
    () => strictParse(packSourceSchema, { ...makePack(), humanReviewRequired: false }),
    /Unrecognized key|humanReviewRequired/,
  );
});

test("new fixture release cannot use the historical practitioner-only sequence", () => {
  const { root, pack } = prepare();
  const result = runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root));
  expectFailureMessage(
    expectExit(result, 1),
    "new releases require selected ai-owner or human-assured policy",
  );
});

test("test-only legacy compatibility cannot release real-classification content", () => {
  const root = makeSnapshotRoot();
  const pack = makeRealPack({ id: "legacy-exception-refusal-pack" });
  registerRealPack(root, pack);
  expectFailureMessage(
    expectExit(
      runReleaseCommand(
        [
          "--pack",
          pack.id,
          "--version",
          "1",
          "--actor",
          realReleaseActor,
          "--authorization-scope",
          "pilot",
        ],
        { repositoryRoot: root, legacyReleaseForTests: true },
      ),
      1,
    ),
    "new releases require selected ai-owner or human-assured policy",
  );
});

test("independent Burmese review is distinct from owner fluent self-review", () => {
  const { root, pack, ai, owner } = prepare(true);
  expectExit(ai(), 0);
  expectExit(owner("ai-owner"), 0);
  const status =
    expectExit(runStatusCommand(["--pack", pack.id, "--version", "1"], commandOptions(root)), 0)
      .stdout ?? "";
  assert.match(status, /Burmese review: independent review/);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 0);
});

test("actor mismatch and policy version mismatch are rejected", () => {
  const { root, pack, ai, owner } = prepare();
  expectExit(ai(), 0);
  expectExit(owner("ai-owner"), 0);
  const verified = verifyVersionGovernance(root, pack.id, 1);
  assert.throws(
    () =>
      evaluateReleaseGates({
        pack: verified.source,
        localizedContent: verified.localizedContent,
        provenanceLog: verified.provenanceLog,
        attestations: verified.attestations,
        releasePolicy: { id: "ai-owner", version: 2 as 1, applicability: "fixture-test" },
        evaluateAt: "2026-09-24T00:00:00Z",
      }),
    /Invalid input|version/,
  );
  const path = `${root}/content/packs/${pack.id}/attestations/1/5-ai-review.json`;
  const record = JSON.parse(readFileSync(path, "utf8"));
  record.actorId = "fixture-forged-actor";
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 1),
    "no review attestation binds ai-reviewed",
  );
});

test("artifact-only binding refuses a manifest policy mismatch", () => {
  const { root, pack, ai, owner } = prepare();
  expectExit(ai(), 0);
  expectExit(owner("ai-owner"), 0);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 0);
  const bundlePath = releaseBundlePath(root, pack.id, 1);
  const manifestPath = releaseManifestPath(root, pack.id, 1);
  const bundleBytes = readFileSync(bundlePath, "utf8");
  const manifestBytes = readFileSync(manifestPath, "utf8");
  const bundle = JSON.parse(bundleBytes);
  const manifest = JSON.parse(manifestBytes);
  manifest.gates.releasePolicy = { id: "human-assured", version: 1, applicability: "fixture-test" };
  assert.throws(
    () =>
      assertBundleBindings({
        bundle,
        bundleRelativePath: `bundles/${pack.id}/1/bundle.json`,
        bundleDigest: sha256Hex(bundleBytes),
        manifest,
        manifestRelativePath: `manifests/${pack.id}/1/manifest.json`,
        manifestDigest: sha256Hex(manifestBytes),
      }),
    /policy-aware manifest/,
  );
});

test("human-assured stale practitioner review and retirement block eligibility", () => {
  const first = prepare();
  expectExit(first.ai(), 0);
  writeEligibility(first.root, "fixture-practitioner-one");
  expectExit(first.practitioner(), 0);
  expectExit(first.owner("human-assured"), 0);
  expectExit(
    first.attest([
      "--kind",
      "owner-approval",
      "--actor",
      "fixture-owner-one",
      "--outcome",
      "changes-requested",
    ]),
    0,
  );
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(first.pack.id, 1), commandOptions(first.root)), 1),
    "changes-requested",
  );
  const second = prepare();
  expectExit(second.ai(), 0);
  expectExit(second.owner("ai-owner"), 0);
  expectExit(
    runRetireCommand(
      [
        "--pack",
        second.pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "fixture:withdrawn",
      ],
      commandOptions(second.root),
    ),
    0,
  );
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(second.pack.id, 1), commandOptions(second.root)), 1),
    "retired",
  );
});

function prepareSyntheticPilot(policy: "ai-owner" | "human-assured") {
  const root = makeSnapshotRoot();
  const pack = makeRealPack({ id: "policy-mechanism-test-pack" });
  registerRealPack(root, pack);
  const now = { repositoryRoot: root, now: () => "2026-09-24T00:00:00Z" };
  for (const kind of ["localization-review", "accessibility-review"] as const)
    expectExit(runAttestCommand(realAttestArgs({ packId: pack.id, version: 1, kind }), now), 0);
  expectExit(
    runAttestCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--kind",
        "ai-review",
        "--actor",
        realReviewActors["ai-review"],
        "--outcome",
        "approved",
        "--reviewer-system",
        "synthetic-model-1",
        "--review-criteria",
        "domain-content-v1",
        "--findings-reference",
        "owner-record:synthetic-findings",
      ],
      now,
    ),
    0,
  );
  if (policy === "human-assured")
    expectExit(
      runAttestCommand(
        realAttestArgs({ packId: pack.id, version: 1, kind: "practitioner-review" }),
        now,
      ),
      0,
    );
  const owner = [
    "--pack",
    pack.id,
    "--version",
    "1",
    "--kind",
    "owner-approval",
    "--actor",
    realReviewActors["owner-approval"],
    "--outcome",
    "approved",
    "--release-policy",
    policy,
    "--policy-version",
    "1",
    "--policy-applicability",
    "pilot",
    "--authorization-scope",
    "pilot",
  ];
  expectExit(runAttestCommand(owner, now), 0);
  return { root, pack, now };
}

for (const policy of ["ai-owner", "human-assured"] as const)
  gitTest(
    `synthetic real-classification ${policy} pilot release survives trusted pin and retirement blocks loading`,
    () => {
      const { root, pack, now } = prepareSyntheticPilot(policy);
      const release = ["--pack", pack.id, "--version", "1", "--actor", realReleaseActor];
      expectFailureMessage(
        expectExit(runReleaseCommand(release, now), 2),
        "requires --authorization-scope pilot",
      );
      expectFailureMessage(
        expectExit(runReleaseCommand([...release, "--authorization-scope", "public"], now), 2),
        "public release",
      );
      expectExit(runReleaseCommand([...release, "--authorization-scope", "pilot"], now), 0);
      expectExit(runVerifyCommand([], { repositoryRoot: root }), 0);
      initRepository(root);
      const commit = commitAll(root, `${policy} synthetic policy release`);
      const loaded = loadPilotBundle({
        repositoryRoot: root,
        trustedCommit: commit,
        packId: pack.id,
        packVersion: 1,
      });
      assert.equal(loaded.version.manifest.gates.releasePolicy?.id, policy);
      assert.equal(loaded.version.manifest.gates.practitionerApproved, policy === "human-assured");
      assert.equal(loaded.version.authorizationScope, "pilot");
      expectExit(
        runRetireCommand(
          [
            "--pack",
            pack.id,
            "--version",
            "1",
            "--actor",
            realAuthorActor,
            "--reason",
            "owner-record:synthetic-retirement",
          ],
          now,
        ),
        0,
      );
      const retiredCommit = commitAll(root, `${policy} synthetic retirement`);
      assert.throws(
        () =>
          loadPilotBundle({
            repositoryRoot: root,
            trustedCommit: retiredCommit,
            packId: pack.id,
            packVersion: 1,
          }),
        /retired version must not be embedded/,
      );
    },
  );

test("human-assured refuses practitioner approval from an earlier review cycle", () => {
  const { root, pack, ai, practitioner, owner, attest } = prepare();
  expectExit(ai(), 0);
  writeEligibility(root, "fixture-practitioner-one");
  expectExit(practitioner(), 0);
  expectExit(
    attest([
      "--kind",
      "practitioner-review",
      "--actor",
      "fixture-practitioner-one",
      "--outcome",
      "changes-requested",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
    ]),
    0,
  );
  expectExit(ai(), 0);
  expectExit(
    attest([
      "--kind",
      "localization-review",
      "--actor",
      "fixture-author-one",
      "--locale",
      "my",
      "--fluent-burmese-confirmed",
      "true",
      "--fluent-review-evidence",
      "fixture:fluent",
      "--reviewer-relationship",
      "owner-fluent-self-review",
    ]),
    0,
  );
  expectExit(
    attest([
      "--kind",
      "accessibility-review",
      "--actor",
      "fixture-accessibility-one",
      "--reading-order-confirmed",
      "true",
      "--media-alternatives-confirmed",
      "true",
      "--runtime-validation-deferred",
    ]),
    0,
  );
  expectFailureMessage(expectExit(owner("human-assured"), 2), "requires valid practitioner review");
  expectFailureMessage(
    expectExit(runReleaseCommand(releaseArgs(pack.id, 1), commandOptions(root)), 1),
    "new releases require selected ai-owner or human-assured policy",
  );
});
