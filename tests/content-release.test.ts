import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  StrictValidationError,
  appendArtifactEligibilityEvent,
  buildReleaseArtifacts,
  buildSnapshotIndexEntry,
  contentDigest,
  evaluateReleaseGates,
  loadVersionAttestations,
  packSourceSchema,
  practitionerEligibilitySchema,
  provenancePrefixThrough,
  releaseBundleSchema,
  releaseManifestSchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runRetireCommand,
  runVerifyCommand,
  sha256Hex,
  snapshotIndexBytes,
  strictParse,
  verifyRepository,
  type PackSource,
  type ProvenanceEvent,
} from "../content/index.js";
import {
  commandOptions,
  driveToReleaseReady,
  expectExit,
  expectFailureMessage,
  makeLocalizedContent,
  makePack,
  makeRoot,
  provenancePath,
  readProvenanceLog,
  releaseArgs,
  releaseBundlePath,
  releaseFixturePack,
  releaseManifestPath,
  snapshotIndexPath,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
  writeProvenanceLog,
} from "./content-cli-fixtures.js";

function options(root: string): { repositoryRoot: string; now: () => string } {
  return commandOptions(root);
}

function bundlePath(root: string, packId: string, version: number): string {
  return releaseBundlePath(root, packId, version);
}

function manifestPath(root: string, packId: string, version: number): string {
  return releaseManifestPath(root, packId, version);
}

interface IndexShape {
  readonly schemaVersion: number;
  readonly entries: {
    readonly kind: string;
    readonly packId: string;
    readonly packVersion: number;
    readonly path: string;
    readonly digest: string;
  }[];
}

function readIndex(root: string): IndexShape {
  return JSON.parse(readFileSync(snapshotIndexPath(root), "utf8")) as IndexShape;
}

function writeIndex(root: string, entries: readonly unknown[]): void {
  const path = snapshotIndexPath(root);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, snapshotIndexBytes(entries as never), "utf8");
}

function approvalArgs(
  packId: string,
  version: number,
  kind: "founder-review" | "practitioner-review",
  actor: string,
): string[] {
  return [
    "--pack",
    packId,
    "--version",
    String(version),
    "--kind",
    kind,
    "--actor",
    actor,
    "--outcome",
    "approved",
    "--six-part-confirmed",
    "true",
    "--exposure-before-commitment-confirmed",
    "true",
  ];
}

function localizationReviewArgs(packId: string, version: number, evidence: string): string[] {
  return [
    "--pack",
    packId,
    "--version",
    String(version),
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
    evidence,
  ];
}

function accessibilityReviewArgs(packId: string, version: number): string[] {
  return [
    "--pack",
    packId,
    "--version",
    String(version),
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
  ];
}

function editJson(path: string, mutate: (record: Record<string, unknown>) => void): void {
  const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  mutate(record);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function writeFileCreatingParents(path: string, bytes: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, bytes, "utf8");
}

function attestationPath(
  root: string,
  packId: string,
  version: number,
  sequence: number,
  kind: string,
): string {
  return join(
    root,
    "content",
    "packs",
    packId,
    "attestations",
    String(version),
    `${sequence}-${kind}.json`,
  );
}

function loadEligibilityRecord(root: string, actorId: string) {
  return strictParse(
    practitionerEligibilitySchema,
    JSON.parse(
      readFileSync(join(root, "content", "eligibility", `${actorId}.json`), "utf8"),
    ) as unknown,
  );
}

/** Registers a version that was already authored on disk, then records all four release-readiness reviews. */
function driveToReviewedVersion(root: string, pack: PackSource, stamp?: () => string): void {
  const version = pack.version;
  const at = stamp === undefined ? options(root) : { repositoryRoot: root, now: stamp };
  expectExit(
    runNewVersionCommand(
      [
        "--pack",
        pack.id,
        ...(version > 1 ? ["--from", String(version - 1)] : []),
        "--actor",
        "fixture-author-one",
      ],
      at,
    ),
    0,
  );
  writeEligibility(root, "fixture-practitioner-one");
  for (const args of [
    approvalArgs(pack.id, version, "founder-review", "fixture-founder-one"),
    approvalArgs(pack.id, version, "practitioner-review", "fixture-practitioner-one"),
    localizationReviewArgs(pack.id, version, `fixture:fluent-review-${version}`),
    accessibilityReviewArgs(pack.id, version),
  ]) {
    expectExit(runAttestCommand(args, at), 0);
  }
}

test("content:release rejects invalid invocations with exit 2", () => {
  const root = makeRoot();
  expectExit(runReleaseCommand(["--pack", "fixture-local-guide"], options(root)), 2);
  expectExit(
    runReleaseCommand(["--version", "1", "--actor", "fixture-operator-one"], options(root)),
    2,
  );
  expectExit(
    runReleaseCommand(["--pack", "fixture-local-guide", "--version", "1"], options(root)),
    2,
  );
  expectExit(
    runReleaseCommand(
      ["--pack", "../escape", "--version", "1", "--actor", "fixture-operator-one"],
      options(root),
    ),
    2,
  );
  expectExit(
    runReleaseCommand(
      ["--pack", "fixture-local-guide", "--version", "0", "--actor", "fixture-operator-one"],
      options(root),
    ),
    2,
  );
  const positional = runReleaseCommand(
    ["--pack", "fixture-local-guide", "--version", "1", "--actor", "fixture-operator-one", "extra"],
    options(root),
  );
  expectExit(positional, 2);
  expectFailureMessage(positional, "unexpected positional argument");
  const unknown = runReleaseCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--actor",
      "fixture-operator-one",
      "--force",
    ],
    options(root),
  );
  expectExit(unknown, 2);
  expectFailureMessage(unknown, 'unknown option "--force"');
  const missingValue = runReleaseCommand(
    ["--pack", "fixture-local-guide", "--version", "1", "--actor"],
    options(root),
  );
  expectExit(missingValue, 2);
  expectFailureMessage(missingValue, 'option "--actor" requires a value');
});

test("content:release generates a strict, digest-bound fixture bundle and manifest", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  const result = expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  assert.match(result.stdout ?? "", /released fixture-local-guide version 1 at sequence 8/);
  assert.match(result.stdout ?? "", /recorded artifact-eligible at sequence 7/);

  const bundleBytes = readFileSync(bundlePath(root, pack.id, 1), "utf8");
  const bundle = strictParse(releaseBundleSchema, JSON.parse(bundleBytes) as unknown);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.packId, pack.id);
  assert.equal(bundle.packVersion, 1);
  assert.equal(bundle.fixtureOnly, true);
  assert.equal(bundle.classification, "fixture");
  assert.equal(bundle.contentDigest, contentDigest(pack));
  assert.equal(bundle.localizedContentDigest, contentDigest(makeLocalizedContent(pack)));
  assert.equal(bundle.releasedAt, "2026-09-24T00:00:00Z");
  assert.deepEqual(bundle.pack, pack);
  assert.equal(bundle.localizedContent.locale, "my");

  // The bundle carries the complete cumulative provenance prefix ending at the
  // release event: authored, localized, founder, practitioner, localization,
  // accessibility, artifact-eligible, artifact-released.
  assert.deepEqual(
    bundle.provenance.events.map((event) => event.type),
    [
      "authored",
      "localized",
      "founder-reviewed",
      "practitioner-reviewed",
      "localization-reviewed",
      "accessibility-reviewed",
      "artifact-eligible",
      "artifact-released",
    ],
  );
  const releaseEvent = bundle.provenance.events.at(-1)!;
  assert.equal(releaseEvent.actorId, "fixture-operator-one");
  assert.equal(releaseEvent.recordedAt, bundle.releasedAt);

  const manifest = strictParse(
    releaseManifestSchema,
    JSON.parse(readFileSync(manifestPath(root, pack.id, 1), "utf8")) as unknown,
  );
  assert.equal(manifest.fixtureOnly, true);
  assert.equal(manifest.classification, "fixture");
  assert.equal(manifest.releasedAt, bundle.releasedAt);
  assert.equal(manifest.bundle.path, "bundles/fixture-local-guide/1/bundle.json");
  assert.equal(manifest.bundle.digest, sha256Hex(bundleBytes));
  assert.deepEqual(manifest.gates, {
    founderApproved: true,
    practitionerApproved: true,
    localizationApproved: true,
    accessibilityApproved: true,
    sponsorship: "not-applicable",
    localizedContentDigest: bundle.localizedContentDigest,
    runtimeAccessibilityDeferred: true,
    targetUserComprehensionDeferred: true,
  });

  assert.deepEqual(
    readIndex(root).entries.map((entry) => entry.path),
    ["bundles/fixture-local-guide/1/bundle.json", "manifests/fixture-local-guide/1/manifest.json"],
  );
});

test("the release bundle excludes review notes, eligibility records, and retirement reasons", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  editJson(attestationPath(root, pack.id, 1, 4, "practitioner-review"), (record) => {
    record["note"] = "synthetic private reviewer note";
  });

  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  const bundleText = readFileSync(bundlePath(root, pack.id, 1), "utf8");
  assert.equal(bundleText.includes("synthetic private reviewer note"), false);
  assert.equal(bundleText.includes("fixture:qualification-note"), false);
  assert.equal(bundleText.includes('"reason"'), false);

  expectExit(
    runRetireCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "synthetic private reason",
      ],
      options(root),
    ),
    0,
  );
  // Retirement preserves the historical bundle and keeps the reason and the actor
  // out of the artifact-side notice.
  assert.equal(readFileSync(bundlePath(root, pack.id, 1), "utf8"), bundleText);
  const notice = readFileSync(join(root, "artifacts", "retirements", pack.id, "1.json"), "utf8");
  assert.equal(notice.includes("synthetic private reason"), false);
  assert.equal(notice.includes("fixture-operator-one"), false);
  expectExit(runVerifyCommand([], options(root)), 0);
});

test("content:release produces byte-identical artifacts for identical immutable inputs", () => {
  const first = releaseFixturePack(makeRoot());
  const second = releaseFixturePack(makeRoot());
  assert.equal(first.bundleBytes, second.bundleBytes);
  assert.equal(first.manifestBytes, second.manifestBytes);
  assert.equal(first.indexBytes, second.indexBytes);
  assert.equal(first.bundleDigest, second.bundleDigest);
  assert.equal(first.manifestDigest, second.manifestDigest);
});

test("the snapshot index stays ordered by artifact path across packs and versions", () => {
  const root = makeRoot();
  driveToReleaseReady(root, { pack: makePack({ title: "Revision one" }) });
  expectExit(runReleaseCommand(releaseArgs("fixture-local-guide", 1), options(root)), 0);
  driveToReleaseReady(root, { pack: makePack({ title: "Revision two", version: 2 }) });
  expectExit(runReleaseCommand(releaseArgs("fixture-local-guide", 2), options(root)), 0);
  driveToReleaseReady(root, {
    pack: makePack({ id: "fixture-market-trader", title: "Try trading at a market" }),
  });
  expectExit(runReleaseCommand(releaseArgs("fixture-market-trader", 1), options(root)), 0);

  assert.deepEqual(
    readIndex(root).entries.map((entry) => entry.path),
    [
      "bundles/fixture-local-guide/1/bundle.json",
      "bundles/fixture-local-guide/2/bundle.json",
      "bundles/fixture-market-trader/1/bundle.json",
      "manifests/fixture-local-guide/1/manifest.json",
      "manifests/fixture-local-guide/2/manifest.json",
      "manifests/fixture-market-trader/1/manifest.json",
    ],
  );
  const report = verifyRepository({ repositoryRoot: root });
  assert.equal(report.releases.length, 3);
  assert.equal(report.indexEntries, 6);
});

test("snapshot index ordering is lexical, not numeric, for multi-digit versions", () => {
  const root = makeRoot();
  // Versions are registered consecutively, so reaching a two-digit version means
  // authoring every intervening source first.
  for (let version = 1; version <= 11; version += 1) {
    const pack = makePack({ title: `Revision ${version}`, version });
    writePackSource(root, pack);
    writeLocalizedContent(root, makeLocalizedContent(pack));
  }
  for (let version = 1; version <= 11; version += 1) {
    driveToReviewedVersion(root, makePack({ title: `Revision ${version}`, version }));
    expectExit(runReleaseCommand(releaseArgs("fixture-local-guide", version), options(root)), 0);
  }
  assert.deepEqual(
    readIndex(root)
      .entries.filter((entry) => entry.kind === "bundle")
      .map((entry) => entry.path),
    [
      "bundles/fixture-local-guide/1/bundle.json",
      "bundles/fixture-local-guide/10/bundle.json",
      "bundles/fixture-local-guide/11/bundle.json",
      "bundles/fixture-local-guide/2/bundle.json",
      "bundles/fixture-local-guide/3/bundle.json",
      "bundles/fixture-local-guide/4/bundle.json",
      "bundles/fixture-local-guide/5/bundle.json",
      "bundles/fixture-local-guide/6/bundle.json",
      "bundles/fixture-local-guide/7/bundle.json",
      "bundles/fixture-local-guide/8/bundle.json",
      "bundles/fixture-local-guide/9/bundle.json",
    ],
  );
  expectExit(runVerifyCommand([], options(root)), 0);
});

test("content:release appends artifact-eligible only when the standing state needs it", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  const before = readProvenanceLog(root, pack.id);
  assert.equal(before.events.at(-1)!.type, "accessibility-reviewed");
  assert.equal(before.events.length, 6);

  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  const after = readProvenanceLog(root, pack.id);
  assert.deepEqual(
    after.events.map((event) => event.type),
    [...before.events.map((event) => event.type), "artifact-eligible", "artifact-released"],
  );

  const version2 = makePack({ title: "Revision two", version: 2 });
  driveToReleaseReady(root, { pack: version2 });
  const beforeSecond = readProvenanceLog(root, version2.id);
  expectExit(runReleaseCommand(releaseArgs(version2.id, 2), options(root)), 0);
  assert.deepEqual(
    readProvenanceLog(root, version2.id)
      .events.slice(beforeSecond.events.length)
      .map((event) => event.type),
    ["artifact-eligible", "artifact-released"],
  );
  expectExit(runVerifyCommand([], options(root)), 0);
});

test("a sponsored fixture Pack releases with a disclosed sponsorship gate", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root, { sponsored: true });
  const manifest = strictParse(
    releaseManifestSchema,
    JSON.parse(readFileSync(manifestPath(root, fixture.pack.id, 1), "utf8")) as unknown,
  );
  assert.equal(manifest.gates.sponsorship, "disclosed");
  const bundle = strictParse(
    releaseBundleSchema,
    JSON.parse(readFileSync(bundlePath(root, fixture.pack.id, 1), "utf8")) as unknown,
  );
  assert.ok(bundle.pack.sponsorship !== undefined);
  expectExit(runVerifyCommand([], options(root)), 0);
});

test("content:release refuses a duplicate release and leaves prior state unchanged", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const beforeBundle = readFileSync(bundlePath(root, pack.id, 1), "utf8");
  const beforeManifest = readFileSync(manifestPath(root, pack.id, 1), "utf8");
  const beforeIndex = readFileSync(snapshotIndexPath(root), "utf8");

  const again = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(again, 1);
  expectFailureMessage(again, 'current status "artifact-released"');
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(bundlePath(root, pack.id, 1), "utf8"), beforeBundle);
  assert.equal(readFileSync(manifestPath(root, pack.id, 1), "utf8"), beforeManifest);
  assert.equal(readFileSync(snapshotIndexPath(root), "utf8"), beforeIndex);
});

test("content:release rolls back every write when a later transaction step fails", async (t) => {
  for (const failing of ["bundle.json", "manifest.json", "snapshot-index.json"]) {
    await t.test(`injected ${failing} write failure`, () => {
      const root = makeRoot();
      const pack = driveToReleaseReady(root);
      const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

      const result = runReleaseCommand(releaseArgs(pack.id, 1), {
        ...options(root),
        onBeforeWrite: (path: string) => {
          if (path.endsWith(failing)) {
            throw new StrictValidationError([
              { path: [], message: `injected ${failing} write failure` },
            ]);
          }
        },
      });
      expectExit(result, 1);
      expectFailureMessage(result, `injected ${failing} write failure`);
      assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
      assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);
      assert.equal(existsSync(manifestPath(root, pack.id, 1)), false);
      assert.equal(existsSync(snapshotIndexPath(root)), false);
    });
  }
});

test("an injected write failure during a second release preserves the first release", async (t) => {
  for (const failing of ["bundle.json", "manifest.json", "snapshot-index.json"]) {
    await t.test(`injected ${failing} write failure on the second release`, () => {
      const root = makeRoot();
      const first = releaseFixturePack(root);
      const second = makePack({ title: "Revision two", version: 2 });
      driveToReleaseReady(root, { pack: second });

      const beforeLog = readFileSync(provenancePath(root, first.pack.id), "utf8");
      const beforeBundle = readFileSync(bundlePath(root, first.pack.id, 1), "utf8");
      const beforeManifest = readFileSync(manifestPath(root, first.pack.id, 1), "utf8");
      const beforeIndex = readFileSync(snapshotIndexPath(root), "utf8");

      const result = runReleaseCommand(releaseArgs(second.id, 2), {
        ...options(root),
        onBeforeWrite: (path: string) => {
          if (path.endsWith(failing)) {
            throw new StrictValidationError([
              { path: [], message: `injected ${failing} write failure` },
            ]);
          }
        },
      });
      expectExit(result, 1);
      expectFailureMessage(result, `injected ${failing} write failure`);
      assert.equal(readFileSync(provenancePath(root, first.pack.id), "utf8"), beforeLog);
      assert.equal(readFileSync(bundlePath(root, first.pack.id, 1), "utf8"), beforeBundle);
      assert.equal(readFileSync(manifestPath(root, first.pack.id, 1), "utf8"), beforeManifest);
      assert.equal(readFileSync(snapshotIndexPath(root), "utf8"), beforeIndex);
      assert.equal(existsSync(bundlePath(root, second.id, 2)), false);
      assert.equal(existsSync(manifestPath(root, second.id, 2)), false);
    });
  }
});

test("a rolled-back release leaves no partial artifact directories behind", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  const result = runReleaseCommand(releaseArgs(pack.id, 1), {
    ...options(root),
    onBeforeWrite: (path: string) => {
      if (path.endsWith("manifest.json")) {
        throw new StrictValidationError([{ path: [], message: "injected manifest failure" }]);
      }
    },
  });
  expectExit(result, 1);
  rmSync(join(root, "artifacts"), { recursive: true, force: true });
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  expectExit(runVerifyCommand([], options(root)), 0);
});

test("content:verify detects an interrupted release that left released provenance behind", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  expectExit(runVerifyCommand([], options(root)), 0);

  // Remove the artifacts while keeping the released provenance event, the way an
  // interrupted artifact write would leave the repository.
  unlinkSync(bundlePath(root, pack.id, 1));
  unlinkSync(manifestPath(root, pack.id, 1));
  const verified = runVerifyCommand([], options(root));
  expectExit(verified, 1);
  expectFailureMessage(verified, "has no release manifest");
});

interface RefusalCase {
  readonly label: string;
  readonly fragment: string;
  readonly prepare: (root: string, pack: PackSource) => void;
}

const gateRefusals: readonly RefusalCase[] = [
  {
    label: "missing practitioner review",
    fragment: "no review attestation binds practitioner-reviewed event",
    prepare: (root, pack) => {
      driveToReleaseReady(root, { pack });
      unlinkSync(attestationPath(root, pack.id, 1, 4, "practitioner-review"));
    },
  },
  {
    label: "missing localization review",
    fragment: "no review attestation binds localization-reviewed event",
    prepare: (root, pack) => {
      driveToReleaseReady(root, { pack });
      unlinkSync(attestationPath(root, pack.id, 1, 5, "localization-review"));
    },
  },
  {
    label: "missing accessibility review",
    fragment: "no review attestation binds accessibility-reviewed event",
    prepare: (root, pack) => {
      driveToReleaseReady(root, { pack });
      unlinkSync(attestationPath(root, pack.id, 1, 6, "accessibility-review"));
    },
  },
  {
    label: "missing sponsorship review",
    fragment: "sponsorship disclosure is required",
    prepare: (root) => {
      driveToReleaseReady(root, { sponsored: true, omitSponsorshipReview: true });
    },
  },
  {
    label: "expired practitioner qualification at release time",
    fragment: "eligibility is not valid at gate evaluation time",
    prepare: (root, pack) => {
      driveToReleaseReady(root, { pack });
      writeEligibility(root, "fixture-practitioner-one", {
        validFrom: "2026-01-01",
        validUntil: "2026-09-23",
      });
    },
  },
  {
    label: "practitioner approval bound to a superseded digest",
    fragment: "contentDigest does not cover the exact content under review",
    prepare: (root, pack) => {
      driveToReleaseReady(root, { pack });
      editJson(attestationPath(root, pack.id, 1, 4, "practitioner-review"), (record) => {
        record["contentDigest"] = "0".repeat(64);
      });
    },
  },
  {
    // The next fork escalates commitment before real-world exposure, and the
    // review attestations deny the exposure-before-commitment confirmation. The
    // gate is the attested reviewer boolean, not text analysis of `nextFork`.
    label: "review denies exposure before commitment for a commitment-first next fork",
    fragment: "must confirm both six-part structure and exposure before commitment",
    prepare: (root) => {
      const commitmentFirst = strictParse(
        packSourceSchema,
        packSourceObjectWithCommitmentFirstFork(),
      );
      driveToReleaseReady(root, { pack: commitmentFirst });
      for (const [sequence, kind] of [
        [3, "founder-review"],
        [4, "practitioner-review"],
      ] as const) {
        editJson(attestationPath(root, commitmentFirst.id, 1, sequence, kind), (record) => {
          record["contentReview"] = {
            sixPartStructureConfirmed: true,
            exposureBeforeCommitmentConfirmed: false,
          };
        });
      }
    },
  },
];

test("content:release refuses every unmet gate before writing anything", async (t) => {
  for (const testCase of gateRefusals) {
    await t.test(testCase.label, () => {
      const root = makeRoot();
      const pack = makePack();
      testCase.prepare(root, pack);
      const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

      const result = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
      assert.equal(result.exitCode, 1, `${testCase.label} must fail closed`);
      expectFailureMessage(result, testCase.fragment);
      assert.equal(
        readFileSync(provenancePath(root, pack.id), "utf8"),
        beforeLog,
        `${testCase.label} must not write`,
      );
      assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);
      assert.equal(existsSync(manifestPath(root, pack.id, 1)), false);
      assert.equal(existsSync(snapshotIndexPath(root)), false);
    });
  }
});

test("content:release refuses invalid lifecycle states", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );

  const authored = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(authored, 1);
  expectFailureMessage(authored, 'current status "authored"');

  writeEligibility(root, "fixture-practitioner-one");
  expectExit(
    runAttestCommand(
      approvalArgs(pack.id, 1, "founder-review", "fixture-founder-one"),
      options(root),
    ),
    0,
  );
  const founderOnly = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(founderOnly, 1);
  expectFailureMessage(founderOnly, 'current status "founder-reviewed"');

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
        "changes-requested",
        "--six-part-confirmed",
        "false",
        "--exposure-before-commitment-confirmed",
        "false",
      ],
      options(root),
    ),
    0,
  );
  const afterChanges = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(afterChanges, 1);
  expectFailureMessage(afterChanges, 'current status "changes-requested"');
});

test("content:release refuses a retired version", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  expectExit(
    runRetireCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "synthetic retirement",
      ],
      options(root),
    ),
    0,
  );
  const result = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "a retired version is no longer artifact-eligible");
});

test("content:release offers no production override for fixture content", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);

  const nonFixtureActor = runReleaseCommand(
    ["--pack", pack.id, "--version", "1", "--actor", "operator-one"],
    options(root),
  );
  expectExit(nonFixtureActor, 1);
  expectFailureMessage(nonFixtureActor, "must be a fixture- identity");
  assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);

  // A production-classifying flag does not exist; unknown options are refused.
  const override = runReleaseCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--actor",
      "fixture-operator-one",
      "--classification",
      "production",
    ],
    options(root),
  );
  expectExit(override, 2);
  expectFailureMessage(override, 'unknown option "--classification"');

  expectExit(runReleaseCommand(releaseArgs(pack.id, 1), options(root)), 0);
  const manifest = strictParse(
    releaseManifestSchema,
    JSON.parse(readFileSync(manifestPath(root, pack.id, 1), "utf8")) as unknown,
  );
  assert.equal(manifest.classification, "fixture");
  assert.equal(manifest.fixtureOnly, true);

  // A non-fixture Pack cannot even be registered, so the release boundary has no
  // production-classified path to reach.
  const productionRoot = makeRoot();
  writePackSource(productionRoot, makePack({ fixtureOnly: false }));
  const registered = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "fixture-author-one"],
    options(productionRoot),
  );
  expectExit(registered, 1);
  expectFailureMessage(registered, "not fixture-only");
});

test("content:release refuses a release timestamp that precedes the eligibility event", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  expectExit(
    runReleaseCommand(releaseArgs(pack.id, 1), {
      repositoryRoot: root,
      now: () => "2026-09-24T05:00:00Z",
    }),
    0,
  );

  const second = makePack({ title: "Revision two", version: 2 });
  writePackSource(root, second);
  writeLocalizedContent(root, makeLocalizedContent(second));
  const late = { repositoryRoot: root, now: () => "2026-09-24T06:00:00Z" };
  expectExit(
    runNewVersionCommand(
      ["--pack", second.id, "--from", "1", "--actor", "fixture-author-one"],
      late,
    ),
    0,
  );
  writeEligibility(root, "fixture-practitioner-one");
  for (const args of [
    approvalArgs(second.id, 2, "founder-review", "fixture-founder-one"),
    approvalArgs(second.id, 2, "practitioner-review", "fixture-practitioner-one"),
    localizationReviewArgs(second.id, 2, "fixture:fluent-review-002"),
    accessibilityReviewArgs(second.id, 2),
  ]) {
    expectExit(runAttestCommand(args, late), 0);
  }

  // Record artifact-eligible for version 2 at 07:00 through the gated seam, leaving
  // it release-ready but not yet released.
  const eligibleLog = appendArtifactEligibilityEvent({
    pack: second,
    localizedContent: makeLocalizedContent(second),
    provenanceLog: readProvenanceLog(root, second.id),
    attestations: loadVersionAttestations(root, second.id, 2),
    practitionerEligibility: loadEligibilityRecord(root, "fixture-practitioner-one"),
    actorId: "fixture-operator-one",
    evaluateAt: "2026-09-24T07:00:00Z",
    recordedAt: "2026-09-24T07:00:00Z",
  });
  writeProvenanceLog(root, second.id, eligibleLog);
  assert.equal(eligibleLog.events.at(-1)!.type, "artifact-eligible");

  const earlier = runReleaseCommand(releaseArgs(second.id, 2), {
    repositoryRoot: root,
    now: () => "2026-09-24T05:30:00Z",
  });
  expectExit(earlier, 1);
  expectFailureMessage(earlier, "must not precede");
  assert.equal(existsSync(bundlePath(root, second.id, 2)), false);
});

test("content:release refuses pre-existing artifact files", () => {
  const withFiles = makeRoot();
  const pack = driveToReleaseReady(withFiles);
  for (const target of [bundlePath(withFiles, pack.id, 1), manifestPath(withFiles, pack.id, 1)]) {
    writeFileCreatingParents(target, "{}\n");
  }
  const overwrite = runReleaseCommand(releaseArgs(pack.id, 1), options(withFiles));
  expectExit(overwrite, 1);
  expectFailureMessage(overwrite, "refusing to overwrite existing file");
  assert.equal(readFileSync(bundlePath(withFiles, pack.id, 1), "utf8"), "{}\n");
  assert.equal(readFileSync(manifestPath(withFiles, pack.id, 1), "utf8"), "{}\n");
  assert.equal(existsSync(snapshotIndexPath(withFiles)), false);
});

test("content:release refuses a snapshot index that already claims this version", () => {
  const withIndex = makeRoot();
  const pack = driveToReleaseReady(withIndex);
  // A self-consistent index that already records an artifact for this version.
  const noticeBytes = "{}\n";
  writeFileCreatingParents(
    join(withIndex, "artifacts", "retirements", pack.id, "1.json"),
    noticeBytes,
  );
  writeIndex(withIndex, [
    buildSnapshotIndexEntry({
      kind: "retirement-notice",
      packId: pack.id,
      packVersion: 1,
      path: `retirements/${pack.id}/1.json`,
      digest: sha256Hex(noticeBytes),
    }),
  ]);
  const conflict = runReleaseCommand(releaseArgs(pack.id, 1), options(withIndex));
  expectExit(conflict, 1);
  expectFailureMessage(conflict, "snapshot index already contains a retirement-notice entry");
  assert.equal(existsSync(bundlePath(withIndex, pack.id, 1)), false);
  assert.equal(existsSync(manifestPath(withIndex, pack.id, 1)), false);
});

test("content:release refuses an artifact root that already disagrees with its index", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  writeIndex(root, [
    buildSnapshotIndexEntry({
      kind: "bundle",
      packId: "fixture-other-pack",
      packVersion: 3,
      path: "bundles/fixture-other-pack/3/bundle.json",
      digest: "0".repeat(64),
    }),
  ]);
  const result = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "has no artifact file");
  assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);

  // An index that is self-consistent but not in canonical order or format is
  // refused rather than silently re-rendered.
  const nonCanonical = makeRoot();
  const second = driveToReleaseReady(nonCanonical);
  writeFileCreatingParents(
    snapshotIndexPath(nonCanonical),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        entries: [
          {
            kind: "release-manifest",
            packId: second.id,
            packVersion: 1,
            path: "manifests/fixture-local-guide/1/manifest.json",
            digest: "0".repeat(64),
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  const laundered = runReleaseCommand(releaseArgs(second.id, 1), options(nonCanonical));
  expectExit(laundered, 1);
  expectFailureMessage(laundered, "not the canonical deterministic rendering");
});

test("content:release refuses a version whose Burmese localization file is missing", () => {
  const root = makeRoot();
  const pack = driveToReleaseReady(root);
  unlinkSync(join(root, "content", "packs", pack.id, "localizations", "1.yaml"));
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = runReleaseCommand(releaseArgs(pack.id, 1), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "binds localized content for fixture-local-guide version 1");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(existsSync(bundlePath(root, pack.id, 1)), false);
});

test("content:release rebuilds a historical release from its sealed prefix alone", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const log = readProvenanceLog(root, fixture.pack.id);
  const releaseEvent = log.events.find(
    (event: ProvenanceEvent) => event.type === "artifact-released",
  )!;
  const prefix = provenancePrefixThrough(log, releaseEvent);
  assert.equal(prefix.events.length, releaseEvent.sequence);
  assert.equal(prefix.events.at(-1)!.eventDigest, releaseEvent.eventDigest);

  // Re-evaluate the historical gates at the recorded release time, then rebuild
  // from the sealed prefix. Any clock read or later provenance leaking in would
  // change the bytes.
  const gates = evaluateReleaseGates({
    pack: fixture.pack,
    localizedContent: makeLocalizedContent(fixture.pack),
    provenanceLog: prefix,
    attestations: loadVersionAttestations(root, fixture.pack.id, 1),
    practitionerEligibility: loadEligibilityRecord(root, "fixture-practitioner-one"),
    evaluateAt: releaseEvent.recordedAt,
    expectedHeadEventDigest: releaseEvent.eventDigest,
  });
  assert.equal(gates.packVersion, 1);
  assert.equal(gates.runtimeAccessibilityDeferred, true);

  const rebuilt = buildReleaseArtifacts({
    pack: fixture.pack,
    localizedContent: makeLocalizedContent(fixture.pack),
    gates,
    releaseEvent,
    provenancePrefix: prefix,
  });
  assert.equal(rebuilt.bundleBytes, fixture.bundleBytes);
  assert.equal(rebuilt.manifestBytes, fixture.manifestBytes);
  assert.deepEqual(
    [...rebuilt.indexEntries].map((entry) => entry.path),
    ["bundles/fixture-local-guide/1/bundle.json", "manifests/fixture-local-guide/1/manifest.json"],
  );
});

function packSourceObjectWithCommitmentFirstFork(): Record<string, unknown> {
  const pack = makePack() as unknown as Record<string, unknown>;
  pack["experiments"] = [
    {
      id: "exp-talk-to-worker",
      title: "Talk to a local worker",
      question: "What is it really like to do this work day to day?",
      action: "Interview one person who already does this job.",
      timebox: "45 minutes this week",
      whatToNotice: "Which parts of the work felt energizing or draining.",
      reflection: "Write three sentences about what you noticed.",
      nextFork: "Apply for this role now and accept whatever offer arrives.",
    },
  ];
  return pack;
}
