import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  computeProvenanceEventDigest,
  contentDigest,
  runAttestCommand,
  runNewVersionCommand,
  runRetireCommand,
  runStatusCommand,
  sha256Hex,
  StrictValidationError,
} from "../content/index.js";
import {
  commandClock,
  driveToReleased,
  expectExit,
  expectFailureMessage,
  makeLocalizedContent,
  makePack,
  makeRoot,
  provenancePath,
  readProvenanceLog,
  releaseManifestPath,
  retirementNoticePath,
  retirementRecordPath,
  snapshotIndexPath,
  writeLocalizedContent,
  writePackSource,
  writeReleaseArtifacts,
  writeProvenanceLog,
} from "./content-cli-fixtures.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function options(root: string): { repositoryRoot: string; now: () => string } {
  return { repositoryRoot: root, now: commandClock };
}

function setupRegisteredPack(root: string, withLocalization = false): ReturnType<typeof makePack> {
  const pack = makePack();
  writePackSource(root, pack);
  if (withLocalization) {
    writeLocalizedContent(root, makeLocalizedContent(pack));
  }
  expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "fixture-author-one"], options(root)),
    0,
  );
  return pack;
}

function retireArgs(root: string, extra: string[] = []): string[] {
  return [
    "--pack",
    "fixture-local-guide",
    "--version",
    "1",
    "--actor",
    "fixture-operator-one",
    "--reason",
    "synthetic lifecycle exercise",
    ...extra,
  ];
}

test("content:retire rejects missing required flags with exit 2", () => {
  const root = makeRoot();
  expectExit(
    runRetireCommand(
      ["--pack", "fixture-local-guide", "--version", "1", "--actor", "fixture-operator-one"],
      options(root),
    ),
    2,
  );
  expectExit(
    runRetireCommand(
      ["--pack", "fixture-local-guide", "--version", "1", "--reason", "why"],
      options(root),
    ),
    2,
  );
  expectExit(
    runRetireCommand(
      ["--pack", "fixture-local-guide", "--version", "abc", "--actor", "a", "--reason", "why"],
      options(root),
    ),
    2,
  );
});

test("content:retire appends a digest-bound event, persists the reason, and preserves history", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
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

  const before = readProvenanceLog(root, pack.id);
  const result = expectExit(runRetireCommand(retireArgs(root), options(root)), 0);
  assert.match(result.stdout ?? "", /retired fixture-local-guide version 1 at sequence 3/);

  const after = readProvenanceLog(root, pack.id);
  assert.deepEqual(after.events.slice(0, before.events.length), before.events);
  const retirementEvent = after.events[after.events.length - 1]!;
  assert.equal(retirementEvent.type, "retired");
  assert.equal(retirementEvent.sequence, 3);
  assert.equal(retirementEvent.contentDigest, contentDigest(pack));
  assert.equal(
    retirementEvent.previousEventDigest,
    before.events[before.events.length - 1]!.eventDigest,
  );
  assert.equal(retirementEvent.actorId, "fixture-operator-one");

  const record = JSON.parse(readFileSync(retirementRecordPath(root, pack.id, 1), "utf8")) as Record<
    string,
    unknown
  >;
  assert.equal(record["reason"], "synthetic lifecycle exercise");
  assert.equal(record["actorId"], "fixture-operator-one");
  assert.equal(record["contentDigest"], contentDigest(pack));
  assert.equal(record["retirementEventSequence"], retirementEvent.sequence);
  assert.equal(record["retirementEventDigest"], retirementEvent.eventDigest);

  const status = expectExit(
    runStatusCommand(["--pack", pack.id, "--version", "1", "--json"], options(root)),
    0,
  );
  const payload = JSON.parse(status.stdout ?? "{}") as Record<string, unknown>;
  assert.equal(payload["currentStatus"], "retired");
  assert.equal((payload["events"] as unknown[]).length, 3);

  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
  assert.equal(existsSync(snapshotIndexPath(root)), false);
});

test("content:retire refuses duplicate retirement without rewriting provenance", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const beforeRecord = readFileSync(retirementRecordPath(root, pack.id, 1), "utf8");
  const result = runRetireCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--actor",
      "fixture-operator-one",
      "--reason",
      "duplicate",
    ],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "already retired; duplicate retirement is refused");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(retirementRecordPath(root, pack.id, 1), "utf8"), beforeRecord);
});

test("content:retire refuses to overwrite an existing retirement record", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  const recordPath = retirementRecordPath(root, pack.id, 1);
  mkdirSync(join(recordPath, ".."), { recursive: true });
  writeFileSync(recordPath, "{}\n", "utf8");
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "refusing to overwrite existing file");
  assert.equal(readFileSync(recordPath, "utf8"), "{}\n");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
});

test("a retired version rejects further attestations and stays retired", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root, true);
  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = runAttestCommand(
    [
      "--pack",
      pack.id,
      "--version",
      "1",
      "--kind",
      "accessibility-review",
      "--actor",
      "fixture-reviewer-one",
      "--outcome",
      "approved",
      "--reading-order-confirmed",
      "true",
      "--media-alternatives-confirmed",
      "true",
      "--runtime-validation-deferred",
    ],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "retired is terminal");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);

  const status = expectExit(
    runStatusCommand(["--pack", pack.id, "--version", "1", "--json"], options(root)),
    0,
  );
  const payload = JSON.parse(status.stdout ?? "{}") as Record<string, unknown>;
  assert.equal(payload["currentStatus"], "retired");
});

test("content:retire of a released version writes a bound notice and updates the snapshot index", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  const artifacts = writeReleaseArtifacts(root, pack);

  const logBefore = readFileSync(provenancePath(root, pack.id), "utf8");
  const manifestBefore = readFileSync(releaseManifestPath(root, pack.id, 1), "utf8");
  const indexBefore = readFileSync(snapshotIndexPath(root), "utf8");

  const result = expectExit(runRetireCommand(retireArgs(root), options(root)), 0);
  assert.match(result.stdout ?? "", /retirement notice written to artifacts\/retirements\//);

  const noticePath = retirementNoticePath(root, pack.id, 1);
  assert.equal(existsSync(noticePath), true);
  const noticeBytes = readFileSync(noticePath, "utf8");
  const notice = JSON.parse(noticeBytes) as Record<string, unknown>;
  assert.equal(notice["packId"], pack.id);
  assert.equal(notice["packVersion"], 1);
  assert.equal(notice["contentDigest"], contentDigest(pack));
  assert.equal(notice["releaseManifestDigest"], artifacts.manifestDigest);
  const afterLog = JSON.parse(readFileSync(provenancePath(root, pack.id), "utf8")) as {
    events: { eventDigest: string }[];
  };
  const retirementEvent = afterLog.events[afterLog.events.length - 1]!;
  assert.equal(notice["retirementEventDigest"], retirementEvent.eventDigest);

  const index = JSON.parse(readFileSync(snapshotIndexPath(root), "utf8")) as {
    entries: { kind: string; packId: string; packVersion: number; path: string; digest: string }[];
  };
  assert.equal(index.entries.length, 3);
  const noticeEntry = index.entries.find((entry) => entry.kind === "retirement-notice");
  assert.ok(noticeEntry !== undefined);
  assert.equal(noticeEntry.path, `retirements/${pack.id}/1.json`);
  assert.equal(noticeEntry.digest, sha256Hex(noticeBytes));

  assert.equal(readFileSync(releaseManifestPath(root, pack.id, 1), "utf8"), manifestBefore);
  const previousEntries = JSON.parse(indexBefore) as { entries: unknown[] };
  assert.deepEqual(index.entries.slice(0, previousEntries.entries.length), previousEntries.entries);

  const logAfter = readFileSync(provenancePath(root, pack.id), "utf8");
  const parsedAfter = JSON.parse(logAfter) as { events: unknown[] };
  const parsedBefore = JSON.parse(logBefore) as { events: unknown[] };
  assert.deepEqual(parsedAfter.events.slice(0, parsedBefore.events.length), parsedBefore.events);
  assert.equal(artifacts.bundleBytes.length > 0, true);

  const status = expectExit(
    runStatusCommand(["--pack", pack.id, "--version", "1", "--json"], options(root)),
    0,
  );
  const payload = JSON.parse(status.stdout ?? "{}") as Record<string, unknown>;
  assert.equal(payload["currentStatus"], "retired");
});

test("content:retire of a released version fails closed when the release manifest is missing", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  mkdirSync(join(root, "artifacts"), { recursive: true });
  writeFileSync(
    snapshotIndexPath(root),
    `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`,
    "utf8",
  );

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const beforeIndex = readFileSync(snapshotIndexPath(root), "utf8");
  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "release manifest not found");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(snapshotIndexPath(root), "utf8"), beforeIndex);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
  assert.equal(existsSync(retirementRecordPath(root, pack.id, 1)), false);
});

test("content:retire refuses to overwrite an existing retirement notice", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);

  const noticePath = retirementNoticePath(root, pack.id, 1);
  mkdirSync(join(noticePath, ".."), { recursive: true });
  writeFileSync(noticePath, "{}\n", "utf8");
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "refusing to overwrite existing file");
  assert.equal(readFileSync(noticePath, "utf8"), "{}\n");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
});

test("content:retire refuses when the snapshot index already lists a notice for the version", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);

  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  index.entries.push({
    kind: "retirement-notice",
    packId: pack.id,
    packVersion: 1,
    path: `retirements/${pack.id}/1.json`,
    digest: "0".repeat(64),
  });
  const beforeIndex = `${JSON.stringify(index, null, 2)}\n`;
  writeFileSync(indexPath, beforeIndex, "utf8");
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "already contains an entry");
  assert.equal(readFileSync(indexPath, "utf8"), beforeIndex);
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
});

test("the status script exits 2 on invalid invocation when run as a process", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/content-status.ts"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage: pnpm content:status/);
});

test("the retire script refuses path-traversal pack ids with exit 2", () => {
  const root = makeRoot();
  const result = runRetireCommand(
    ["--pack", "../escape", "--version", "1", "--actor", "fixture-operator-one", "--reason", "x"],
    options(root),
  );
  expectExit(result, 2);
  expectFailureMessage(result, "lowercase kebab-case identifier");
});

test("content:retire refuses a non-fixture actor for a fixture-only pack", () => {
  const root = makeRoot();
  setupRegisteredPack(root);
  const result = runRetireCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--actor",
      "operator-one",
      "--reason",
      "why",
    ],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "must be a fixture- identity");
});

test("content:retire of a released version preserves prior bundle bytes", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);
  const bundlePath = join(root, "artifacts", "bundles", pack.id, "1", "bundle.json");
  const bundleBefore = readFileSync(bundlePath);

  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);
  assert.deepEqual(readFileSync(bundlePath), bundleBefore);
});

test("content:retire of a released version fails closed when the snapshot index is missing", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);
  unlinkSync(snapshotIndexPath(root));

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "snapshot index not found");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
  assert.equal(existsSync(retirementRecordPath(root, pack.id, 1)), false);
});

test("content:retire of a released version fails closed when index entries are missing or stale", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);

  const emptyIndexPath = snapshotIndexPath(root);
  writeFileSync(
    emptyIndexPath,
    `${JSON.stringify({ schemaVersion: 1, entries: [] }, null, 2)}\n`,
    "utf8",
  );
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const beforeIndex = readFileSync(emptyIndexPath, "utf8");
  const emptyIndexResult = runRetireCommand(retireArgs(root), options(root));
  expectExit(emptyIndexResult, 1);
  expectFailureMessage(emptyIndexResult, "must contain the release-manifest entry");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(emptyIndexPath, "utf8"), beforeIndex);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);

  unlinkSync(emptyIndexPath);
  writeReleaseArtifacts(root, pack);
  const staleIndex = JSON.parse(readFileSync(emptyIndexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  staleIndex.entries = staleIndex.entries.map((entry) =>
    entry["kind"] === "release-manifest" ? { ...entry, digest: "0".repeat(64) } : entry,
  );
  const staleBytes = `${JSON.stringify(staleIndex, null, 2)}\n`;
  writeFileSync(emptyIndexPath, staleBytes, "utf8");
  const staleResult = runRetireCommand(retireArgs(root), options(root));
  expectExit(staleResult, 1);
  expectFailureMessage(staleResult, "must contain the release-manifest entry");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(emptyIndexPath, "utf8"), staleBytes);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
  assert.equal(existsSync(retirementRecordPath(root, pack.id, 1)), false);
});

test("content:retire of a released version refuses a manifest whose classification disagrees with the source", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);

  const manifestPath = releaseManifestPath(root, pack.id, 1);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  manifest["fixtureOnly"] = false;
  manifest["classification"] = "production";
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(manifestPath, manifestBytes, "utf8");

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = runRetireCommand(retireArgs(root), options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "fixture isolation must match");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(manifestPath, "utf8"), manifestBytes);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
  assert.equal(existsSync(retirementRecordPath(root, pack.id, 1)), false);
});

test("content:status fails when the retirement record is missing or detached from the event", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);

  const recordPath = retirementRecordPath(root, pack.id, 1);
  const recordBytes = readFileSync(recordPath, "utf8");
  unlinkSync(recordPath);
  const missing = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(missing, 1);
  expectFailureMessage(missing, "has no retirement record");

  writeFileSync(recordPath, recordBytes, "utf8");
  const record = JSON.parse(recordBytes) as Record<string, unknown>;
  record["retirementEventDigest"] = "0".repeat(64);
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  const detached = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(detached, 1);
  expectFailureMessage(detached, "does not match the sealed retired event");
});

test("content:status rejects resealed provenance with fixture metadata that disagrees with the source", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  const original = readProvenanceLog(root, pack.id);

  for (const changed of [{ fixtureOnly: false }, { actorId: "external-author" }]) {
    const event = { ...original.events[0]!, ...changed };
    const sealed = { ...event, eventDigest: computeProvenanceEventDigest(event) };
    writeProvenanceLog(root, pack.id, { ...original, events: [sealed] });

    const result = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
    expectExit(result, 1);
    expectFailureMessage(
      result,
      "fixtureOnly" in changed ? "source declares fixtureOnly true" : "fixture- actor identity",
    );
  }
});

test("content:status rejects a retirement record with fixture classification that disagrees with the source", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);

  const recordPath = retirementRecordPath(root, pack.id, 1);
  const record = JSON.parse(readFileSync(recordPath, "utf8")) as Record<string, unknown>;
  record["fixtureOnly"] = false;
  writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const result = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "source declares fixtureOnly true");
});

test("content:attest rolls back the provenance log when the attestation write fails", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");

  const result = runAttestCommand(
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
    {
      ...options(root),
      onBeforeWrite: (path: string) => {
        if (path.includes("attestations")) {
          throw new StrictValidationError([
            { path: [], message: "injected attestation write failure" },
          ]);
        }
      },
    },
  );
  expectExit(result, 1);
  expectFailureMessage(result, "injected attestation write failure");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(
    existsSync(
      join(root, "content", "packs", pack.id, "attestations", "1", "2-founder-review.json"),
    ),
    false,
  );
});

test("content:retire rolls back every write when a later transaction step fails", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);

  const beforeLog = readFileSync(provenancePath(root, pack.id), "utf8");
  const beforeIndex = readFileSync(snapshotIndexPath(root), "utf8");
  const result = runRetireCommand(retireArgs(root), {
    ...options(root),
    onBeforeWrite: (path: string) => {
      if (path.endsWith("snapshot-index.json")) {
        throw new StrictValidationError([{ path: [], message: "injected index write failure" }]);
      }
    },
  });
  expectExit(result, 1);
  expectFailureMessage(result, "injected index write failure");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), beforeLog);
  assert.equal(readFileSync(snapshotIndexPath(root), "utf8"), beforeIndex);
  assert.equal(existsSync(retirementRecordPath(root, pack.id, 1)), false);
  assert.equal(existsSync(retirementNoticePath(root, pack.id, 1)), false);
});

test("content:status fails when a released retirement is missing its notice or index entry", () => {
  const root = makeRoot();
  const pack = setupRegisteredPack(root);
  driveToReleased(root, pack);
  writeReleaseArtifacts(root, pack);
  expectExit(runRetireCommand(retireArgs(root), options(root)), 0);

  const noticePath = retirementNoticePath(root, pack.id, 1);
  const noticeBytes = readFileSync(noticePath, "utf8");
  unlinkSync(noticePath);
  const missingNotice = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(missingNotice, 1);
  expectFailureMessage(missingNotice, "has no retirement notice");
  writeFileSync(noticePath, noticeBytes, "utf8");

  const indexPath = snapshotIndexPath(root);
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
    schemaVersion: number;
    entries: Record<string, unknown>[];
  };
  const trimmed = {
    schemaVersion: index.schemaVersion,
    entries: index.entries.filter((entry) => entry["kind"] !== "retirement-notice"),
  };
  const trimmedBytes = `${JSON.stringify(trimmed, null, 2)}\n`;
  writeFileSync(indexPath, trimmedBytes, "utf8");
  const missingEntry = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(missingEntry, 1);
  expectFailureMessage(missingEntry, "must contain the retirement-notice entry");
  assert.equal(readFileSync(noticePath, "utf8"), noticeBytes);
});
