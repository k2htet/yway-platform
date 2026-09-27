import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  computeProvenanceEventDigest,
  contentDigest,
  runNewVersionCommand,
  runReleaseCommand,
  runRetireCommand,
  failureResult,
  runVerifyCommand,
  verifyRepository,
  type ProvenanceEvent,
  type ProvenanceEventLog,
} from "../content/index.js";
import {
  commandOptions,
  driveToReleaseReady,
  expectExit,
  expectFailureMessage,
  makePack,
  makeRoot,
  readProvenanceLog,
  releaseArgs,
  releaseBundlePath,
  releaseFixturePack,
  releaseManifestPath,
  snapshotIndexPath,
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

function rewriteWithWhitespaceOnlyChange(path: string): void {
  const bytes = readFileSync(path, "utf8");
  // Re-indent without changing any JSON value: only the bytes change.
  writeFileSync(path, bytes.replaceAll("\n  ", "\n    "), "utf8");
}

test("content:verify passes a repository with no releases and no artifact files", () => {
  const empty = makeRoot();
  const emptyResult = expectExit(runVerifyCommand([], options(empty)), 0);
  // Zero releases is reported explicitly, not implied by an absent field.
  assert.match(emptyResult.stdout ?? "", /"releases": \[\]/);
  assert.match(emptyResult.stdout ?? "", /"indexEntries": 0/);
  assert.match(emptyResult.stdout ?? "", /"packs": \[\]/);

  const authored = makeRoot();
  const pack = makePack();
  writePackSource(authored, pack);
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(authored)),
    0,
  );
  const authoredResult = runVerifyCommand([], options(authored));
  expectExit(authoredResult, 0);
  const authoredReport = JSON.parse(authoredResult.stdout ?? "{}") as { releases: unknown[] };
  assert.deepEqual(authoredReport.releases, []);
  assert.equal(existsSync(snapshotIndexPath(authored)), false);
});

test("content:verify reports a release it rebuilt and reproduced byte for byte", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const result = expectExit(runVerifyCommand([], options(root)), 0);
  const report = JSON.parse(result.stdout ?? "{}") as {
    mode: string;
    packs: string[];
    releases: { packId: string; packVersion: number; releasedAt: string; retired: boolean }[];
    indexEntries: number;
  };
  assert.equal(report.mode, "repository");
  assert.deepEqual(report.packs, [fixture.pack.id]);
  assert.equal(report.releases.length, 1);
  assert.equal(report.releases[0]!.releasedAt, "2026-09-24T00:00:00Z");
  assert.equal(report.releases[0]!.retired, false);
  assert.equal(report.indexEntries, 2);

  const direct = verifyRepository({ repositoryRoot: root });
  assert.equal(direct.releases[0]!.bundleDigest, fixture.bundleDigest);
  assert.equal(direct.releases[0]!.manifestDigest, fixture.manifestDigest);
});

test("content:verify detects a tampered source file", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const sourcePath = join(root, "content", "packs", fixture.pack.id, "1.yaml");
  const edited = readFileSync(sourcePath, "utf8").replace(
    "Try being a local guide",
    "Try being a local guide (edited after review)",
  );
  writeFileSync(sourcePath, edited, "utf8");

  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "does not match the source-derived digest");
});

test("content:verify detects tampered localization", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const localizationPath = join(
    root,
    "content",
    "packs",
    fixture.pack.id,
    "localizations",
    "1.yaml",
  );
  writeFileSync(
    localizationPath,
    readFileSync(localizationPath, "utf8").replace(
      "Synthetic Burmese title",
      "Synthetic Burmese title (edited after review)",
    ),
    "utf8",
  );
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "localization was tampered with or events bind stale content");
});

test("content:verify detects tampered provenance", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const log = readProvenanceLog(root, fixture.pack.id);
  const resealed = log.events.map((event, index) =>
    index === 3 ? { ...event, actorId: "fixture-other-practitioner" } : event,
  );
  const resealedLog: ProvenanceEventLog = { ...log, events: resealed as ProvenanceEvent[] };
  writeProvenanceLog(root, fixture.pack.id, resealedLog);

  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "eventDigest mismatch at sequence 4");
});

test("content:verify detects a fully resealed provenance chain with an altered actor", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const log = readProvenanceLog(root, fixture.pack.id);
  const events: ProvenanceEvent[] = [];
  for (const [index, event] of log.events.entries()) {
    const fields = index === 3 ? { ...event, actorId: "fixture-other-practitioner" } : { ...event };
    const preImage: Record<string, unknown> = { ...fields };
    delete preImage["eventDigest"];
    events.push({ ...fields, eventDigest: computeProvenanceEventDigest(preImage as never) });
  }
  writeProvenanceLog(root, fixture.pack.id, { ...log, events });

  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "previousEventDigest does not match the prior eventDigest");
});

test("content:verify detects a tampered bundle, including a whitespace-only change", () => {
  for (const mutate of [
    (bytes: string): string =>
      bytes.replace('"title": "Try being a local guide"', '"title": "Edited"'),
    (bytes: string): string => bytes.replaceAll("\n  ", "\n    "),
    (bytes: string): string => `${bytes}\n`,
  ]) {
    const root = makeRoot();
    const fixture = releaseFixturePack(root);
    const path = bundlePath(root, fixture.pack.id, 1);
    const original = readFileSync(path, "utf8");
    const mutated = mutate(original);
    assert.notEqual(mutated, original);
    writeFileSync(path, mutated, "utf8");

    const result = runVerifyCommand([], options(root));
    expectExit(result, 1);
    expectFailureMessage(result, "release bundle at artifacts/bundles/");
  }
});

test("content:verify detects a tampered release manifest", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const path = manifestPath(root, fixture.pack.id, 1);
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace(
      '"classification": "fixture"',
      '"classification": "production"',
    ),
    "utf8",
  );
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "fixture isolation");
});

test("content:verify detects a whitespace-only index change", () => {
  const root = makeRoot();
  releaseFixturePack(root);
  const path = snapshotIndexPath(root);
  const original = readFileSync(path, "utf8");
  rewriteWithWhitespaceOnlyChange(path);
  assert.notEqual(readFileSync(path, "utf8"), original);
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(
    result,
    "snapshot index bytes are not the canonical deterministic rendering",
  );
});

test("content:verify detects a missing, extra, or reordered index entry", () => {
  const cases: {
    readonly label: string;
    readonly fragment: string;
    readonly mutate: (index: { schemaVersion: number; entries: Record<string, unknown>[] }) => void;
  }[] = [
    {
      label: "missing entry",
      fragment: "snapshot index is missing the entry for",
      mutate: (index) => {
        index.entries = index.entries.filter((entry) => entry["kind"] !== "bundle");
      },
    },
    {
      label: "unexpected entry",
      fragment: "snapshot index contains the unexpected entry",
      mutate: (index) => {
        index.entries.push({
          kind: "retirement-notice",
          packId: "fixture-local-guide",
          packVersion: 1,
          path: "retirements/fixture-local-guide/1.json",
          digest: "0".repeat(64),
        });
      },
    },
    {
      label: "reordered entries",
      fragment: "not the canonical deterministic rendering",
      mutate: (index) => {
        index.entries = [...index.entries].reverse();
      },
    },
    {
      label: "altered digest",
      fragment: "but the release history requires",
      mutate: (index) => {
        index.entries = index.entries.map((entry) =>
          entry["kind"] === "bundle" ? { ...entry, digest: "0".repeat(64) } : entry,
        );
      },
    },
  ];

  for (const testCase of cases) {
    const root = makeRoot();
    releaseFixturePack(root);
    const path = snapshotIndexPath(root);
    const index = JSON.parse(readFileSync(path, "utf8")) as {
      schemaVersion: number;
      entries: Record<string, unknown>[];
    };
    testCase.mutate(index);
    writeFileSync(path, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    const result = runVerifyCommand([], options(root));
    assert.equal(result.exitCode, 1, `${testCase.label} must fail closed`);
    expectFailureMessage(result, testCase.fragment);
  }
});

test("content:verify detects an unexpected artifact file", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const stray = bundlePath(root, fixture.pack.id, 7);
  mkdirSync(join(stray, ".."), { recursive: true });
  writeFileSync(stray, "{}\n", "utf8");
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "is not enumerated by the snapshot index");
});

test("content:verify detects artifact files with no canonical inventory at all", () => {
  const root = makeRoot();
  releaseFixturePack(root);
  unlinkSync(snapshotIndexPath(root));
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "artifact files exist without artifacts/snapshot-index.json");
});

test("content:verify detects a missing retirement notice and index entry", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  expectExit(
    runRetireCommand(
      [
        "--pack",
        fixture.pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "synthetic",
      ],
      options(root),
    ),
    0,
  );
  expectExit(runVerifyCommand([], options(root)), 0);

  unlinkSync(join(root, "artifacts", "retirements", fixture.pack.id, "1.json"));
  const missingNotice = runVerifyCommand([], options(root));
  expectExit(missingNotice, 1);
  expectFailureMessage(missingNotice, "has no retirement notice");

  const root2 = makeRoot();
  const second = releaseFixturePack(root2);
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
        "synthetic",
      ],
      options(root2),
    ),
    0,
  );
  const indexPath = snapshotIndexPath(root2);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries = index.entries.filter((entry) => entry["kind"] !== "retirement-notice");
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  const missingEntry = runVerifyCommand([], options(root2));
  expectExit(missingEntry, 1);
  expectFailureMessage(missingEntry, "must contain the retirement-notice entry");
});

test("retirement notices and post-retirement indexes are byte-deterministic", () => {
  const retireArgs = (packId: string): string[] => [
    "--pack",
    packId,
    "--version",
    "1",
    "--actor",
    "fixture-operator-one",
    "--reason",
    "synthetic retirement",
  ];

  const first = releaseFixturePack(makeRoot());
  const second = releaseFixturePack(makeRoot());
  expectExit(runRetireCommand(retireArgs(first.pack.id), options(first.root)), 0);
  expectExit(runRetireCommand(retireArgs(second.pack.id), options(second.root)), 0);

  const firstNotice = join(first.root, "artifacts", "retirements", first.pack.id, "1.json");
  const secondNotice = join(second.root, "artifacts", "retirements", second.pack.id, "1.json");
  assert.equal(readFileSync(firstNotice, "utf8"), readFileSync(secondNotice, "utf8"));
  assert.equal(
    readFileSync(snapshotIndexPath(first.root), "utf8"),
    readFileSync(snapshotIndexPath(second.root), "utf8"),
  );
  // The notice is additive: the historical release bytes are untouched.
  assert.equal(readFileSync(bundlePath(first.root, first.pack.id, 1), "utf8"), first.bundleBytes);
  assert.equal(
    readFileSync(manifestPath(first.root, first.pack.id, 1), "utf8"),
    first.manifestBytes,
  );
  expectExit(runVerifyCommand([], options(first.root)), 0);
  expectExit(runVerifyCommand([], options(second.root)), 0);
});

test("content:verify detects a retirement notice whose digest bindings were altered", async (t) => {
  const cases: {
    readonly label: string;
    readonly field: "contentDigest" | "releaseManifestDigest" | "retirementEventDigest";
    readonly fragment: string;
  }[] = [
    {
      label: "content digest",
      field: "contentDigest",
      fragment: "does not cover exact version scope",
    },
    {
      label: "release manifest digest",
      field: "releaseManifestDigest",
      fragment: "does not bind the release manifest",
    },
    {
      label: "retirement event digest",
      field: "retirementEventDigest",
      fragment: "does not bind the sealed retired event",
    },
  ];

  for (const testCase of cases) {
    await t.test(`altered ${testCase.label}`, () => {
      const root = makeRoot();
      const fixture = releaseFixturePack(root);
      expectExit(
        runRetireCommand(
          [
            "--pack",
            fixture.pack.id,
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
      const noticePath = join(root, "artifacts", "retirements", fixture.pack.id, "1.json");
      const notice = JSON.parse(readFileSync(noticePath, "utf8")) as Record<string, unknown>;
      notice[testCase.field] = "0".repeat(64);
      writeFileSync(noticePath, `${JSON.stringify(notice, null, 2)}\n`, "utf8");

      const result = runVerifyCommand([], options(root));
      expectExit(result, 1);
      expectFailureMessage(result, testCase.fragment);
    });
  }
});

test("content:verify detects a retirement notice with no retired event", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  const strayNotice = join(root, "artifacts", "retirements", fixture.pack.id, "1.json");
  mkdirSync(join(strayNotice, ".."), { recursive: true });
  writeFileSync(
    strayNotice,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        packId: fixture.pack.id,
        packVersion: 1,
        contentDigest: contentDigest(fixture.pack),
        releaseManifestDigest: fixture.manifestDigest,
        retirementEventDigest: "0".repeat(64),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "is not retired but a retirement notice exists");
});

test("content:verify detects an eligibility record whose file name and actor disagree", () => {
  const root = makeRoot();
  releaseFixturePack(root);
  const path = join(root, "content", "eligibility", "fixture-practitioner-one.json");
  const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  record["actorId"] = "fixture-practitioner-two";
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "but the file name declares");
});

test("content:verify detects a deleted review attestation", () => {
  const root = makeRoot();
  const fixture = releaseFixturePack(root);
  unlinkSync(
    join(
      root,
      "content",
      "packs",
      fixture.pack.id,
      "attestations",
      "1",
      "5-localization-review.json",
    ),
  );
  const result = runVerifyCommand([], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "no review attestation binds localization-reviewed event");
});

test("historical rebuilding is unchanged after later versions, retirement, and expiry", () => {
  const root = makeRoot();
  const first = releaseFixturePack(root);
  const firstBundle = readFileSync(bundlePath(root, first.pack.id, 1), "utf8");
  const firstManifest = readFileSync(manifestPath(root, first.pack.id, 1), "utf8");

  // A later version of the same Pack is registered and released.
  const second = makePack({ title: "Revision two", version: 2 });
  driveToReleaseReady(root, { pack: second });
  expectExit(runReleaseCommand(releaseArgs(second.id, 2), options(root)), 0);

  // Retire the released version.
  expectExit(
    runRetireCommand(
      [
        "--pack",
        first.pack.id,
        "--version",
        "1",
        "--actor",
        "fixture-operator-one",
        "--reason",
        "synthetic",
      ],
      options(root),
    ),
    0,
  );
  assert.equal(readFileSync(bundlePath(root, first.pack.id, 1), "utf8"), firstBundle);
  assert.equal(readFileSync(manifestPath(root, first.pack.id, 1), "utf8"), firstManifest);

  // The practitioner qualification expires after the recorded release time.
  const eligibilityPath = join(root, "content", "eligibility", "fixture-practitioner-one.json");
  const eligibility = JSON.parse(readFileSync(eligibilityPath, "utf8")) as Record<string, unknown>;
  eligibility["validUntil"] = "2026-09-24";
  writeFileSync(eligibilityPath, `${JSON.stringify(eligibility, null, 2)}\n`, "utf8");

  const result = runVerifyCommand([], options(root));
  expectExit(result, 0);
  const report = verifyRepository({ repositoryRoot: root });
  assert.equal(report.releases.length, 2);
  assert.equal(report.releases[0]!.packVersion, 1);
  assert.equal(report.releases[0]!.retired, true);
  assert.equal(report.releases[1]!.packVersion, 2);
  assert.equal(report.releases[1]!.retired, false);
  assert.equal(readFileSync(bundlePath(root, first.pack.id, 1), "utf8"), firstBundle);
  assert.equal(readFileSync(manifestPath(root, first.pack.id, 1), "utf8"), firstManifest);
});

test("content:verify rejects invalid invocation with exit 2", () => {
  const root = makeRoot();
  expectExit(runVerifyCommand(["--trusted-commit"], options(root)), 2);
  const unknown = runVerifyCommand(["--deep"], options(root));
  expectExit(unknown, 2);
  expectFailureMessage(unknown, 'unknown option "--deep"');
  const positional = runVerifyCommand(["somewhere"], options(root));
  expectExit(positional, 2);
  expectFailureMessage(positional, "unexpected positional argument");
});

test("a command fails closed on an unexpected repository or environment error", () => {
  // Exit 2 stays reserved for usage errors...
  expectExit(runVerifyCommand(["--deep"], options(makeRoot())), 2);
  // ...and an unexpected error becomes exit 1 with a message rather than an
  // unhandled crash, so verification never reports success by dying.
  const failure = failureResult(
    "Usage: pnpm content:verify",
    new TypeError("injected environment failure"),
  );
  expectExit(failure, 1);
  expectFailureMessage(failure, "TypeError: injected environment failure");
  // A non-Error throwable is still a programming error and propagates.
  assert.throws(() => {
    failureResult("Usage: pnpm content:verify", "not an error");
  });
});

test("content:verify refuses a trusted-commit pin that is not a full commit SHA", () => {
  const root = makeRoot();
  releaseFixturePack(root);
  for (const pin of ["HEAD", "main", "abc1234", "0".repeat(39), "Z".repeat(40)]) {
    const result = runVerifyCommand(["--trusted-commit", pin], options(root));
    expectExit(result, 1);
    expectFailureMessage(result, "must be a full immutable commit SHA");
  }
  const unresolvable = runVerifyCommand(["--trusted-commit", "0".repeat(40)], options(root));
  expectExit(unresolvable, 1);
  expectFailureMessage(unresolvable, "is not a resolvable commit");
});
