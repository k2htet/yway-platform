import { existsSync } from "node:fs";
import { contentDigest, sha256Hex } from "../digest.js";
import { assertReleaseManifestBindsVersion } from "../governance.js";
import { readCanonicalSnapshotIndex } from "./release.js";
import { appendProvenanceEvent } from "../provenance.js";
import { deriveVersionLifecycleStatus } from "../lifecycle.js";
import {
  buildSnapshotIndexEntry,
  canonicalArtifactPath,
  snapshotIndexBytes,
} from "../snapshot-index.js";
import {
  StrictValidationError,
  retirementNoticeSchema,
  retirementRecordSchema,
  releaseManifestSchema,
  strictParse,
  type RetirementNotice,
  type RetirementRecord,
} from "../schemas/index.js";
import {
  artifactPath,
  commitWrites,
  digestFile,
  displayPath,
  formatRecord,
  loadPackState,
  packRetirementRecordPath,
  provenanceLogPath,
  readJsonFile,
  releaseManifestPath,
  requireFixtureIsolation,
  requirePackSource,
  requireProvenanceLog,
  resolveRepositoryRoot,
  retirementNoticePath,
  retirementNoticeRelativePath,
  snapshotIndexPath,
} from "../store.js";
import {
  failureResult,
  parseCommandFlags,
  parsePositiveInteger,
  requireActorId,
  requireFlagString,
  requirePackId,
  successResult,
  type CommandOptions,
  type CommandResult,
} from "./args.js";

const usage =
  "Usage: pnpm content:retire -- --pack <id> --version <n> --actor <id> --reason <reason>";

interface PlannedNotice {
  readonly path: string;
  readonly bytes: string;
  readonly indexBytes: string;
}

export function runRetireCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      pack: { type: "string" },
      version: { type: "string" },
      actor: { type: "string" },
      reason: { type: "string" },
    });
    const packId = requirePackId(values);
    const actorId = requireActorId(values);
    const version = parsePositiveInteger(requireFlagString(values, "version"), "version");
    const reason = requireFlagString(values, "reason");

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const recordedAt = (options.now ?? (() => new Date().toISOString()))();
    const state = loadPackState(repositoryRoot, packId);
    const source = requirePackSource(state, repositoryRoot, packId, version);
    requireFixtureIsolation(source, actorId);
    const log = requireProvenanceLog(state, packId);
    const contentDigestHex = contentDigest(source);
    const status = deriveVersionLifecycleStatus(log, version);

    if (status.currentStatus === "retired") {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `pack "${packId}" version ${version} is already retired; duplicate retirement is refused`,
        },
      ]);
    }

    const recordPath = packRetirementRecordPath(repositoryRoot, packId, version);
    if (existsSync(recordPath)) {
      throw new StrictValidationError([
        {
          path: [],
          message: `refusing to overwrite existing file ${displayPath(repositoryRoot, recordPath)}`,
        },
      ]);
    }

    const nextLog = appendProvenanceEvent(log, {
      packId,
      packVersion: version,
      type: "retired",
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: contentDigestHex,
      recordedAt,
    });
    const head = nextLog.events[nextLog.events.length - 1]!;

    const retirementRecord: RetirementRecord = strictParse(retirementRecordSchema, {
      schemaVersion: 1,
      packId,
      packVersion: version,
      contentDigest: contentDigestHex,
      actorId,
      fixtureOnly: source.fixtureOnly,
      reason,
      recordedAt,
      retirementEventSequence: head.sequence,
      retirementEventDigest: head.eventDigest,
    });

    let plannedNotice: PlannedNotice | undefined;
    const wasReleased = status.currentStatus === "artifact-released";
    if (wasReleased) {
      const manifestPath = releaseManifestPath(repositoryRoot, packId, version);
      const manifest = strictParse(
        releaseManifestSchema,
        readJsonFile(manifestPath, "release manifest"),
      );
      assertReleaseManifestBindsVersion(
        manifest,
        {
          packId,
          packVersion: version,
          contentDigest: contentDigestHex,
          fixtureOnly: source.fixtureOnly,
        },
        displayPath(repositoryRoot, manifestPath),
      );
      const manifestDigestHex = digestFile(manifestPath);

      const noticePath = retirementNoticePath(repositoryRoot, packId, version);
      if (existsSync(noticePath)) {
        throw new StrictValidationError([
          {
            path: [],
            message: `refusing to overwrite existing file ${displayPath(repositoryRoot, noticePath)}`,
          },
        ]);
      }

      if (!existsSync(snapshotIndexPath(repositoryRoot))) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index not found at ${displayPath(repositoryRoot, snapshotIndexPath(repositoryRoot))}; a released version cannot be retired without its canonical artifact inventory`,
          },
        ]);
      }
      const indexEntries = readCanonicalSnapshotIndex(repositoryRoot);
      const manifestRelativePath = canonicalArtifactPath("release-manifest", packId, version);
      const manifestEntry = indexEntries.find(
        (entry) =>
          entry.kind === "release-manifest" &&
          entry.packId === packId &&
          entry.packVersion === version,
      );
      if (
        manifestEntry === undefined ||
        manifestEntry.path !== manifestRelativePath ||
        manifestEntry.digest !== manifestDigestHex
      ) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index must contain the release-manifest entry for ${packId} version ${version} at ${manifestRelativePath} with digest ${manifestDigestHex}`,
          },
        ]);
      }
      const bundleEntry = indexEntries.find(
        (entry) =>
          entry.kind === "bundle" && entry.packId === packId && entry.packVersion === version,
      );
      if (
        bundleEntry === undefined ||
        bundleEntry.path !== manifest.bundle.path ||
        bundleEntry.digest !== manifest.bundle.digest
      ) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index must contain the bundle entry for ${packId} version ${version} at ${manifest.bundle.path} with digest ${manifest.bundle.digest}`,
          },
        ]);
      }
      const bundlePath = artifactPath(repositoryRoot, manifest.bundle.path);
      if (!existsSync(bundlePath) || digestFile(bundlePath) !== manifest.bundle.digest) {
        throw new StrictValidationError([
          {
            path: ["bundle"],
            message: `release bundle at ${displayPath(repositoryRoot, bundlePath)} is missing or does not match the manifest bundle digest ${manifest.bundle.digest}`,
          },
        ]);
      }

      const noticeRelativePath = retirementNoticeRelativePath(packId, version);
      if (indexEntries.some((entry) => entry.path === noticeRelativePath)) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index already contains an entry at ${noticeRelativePath}; retirement notice overwrite is refused`,
          },
        ]);
      }
      const notice: RetirementNotice = strictParse(retirementNoticeSchema, {
        schemaVersion: 1,
        packId,
        packVersion: version,
        contentDigest: contentDigestHex,
        releaseManifestDigest: manifestDigestHex,
        retirementEventDigest: head.eventDigest,
      });
      const noticeBytes = formatRecord(notice);
      const nextIndexBytes = snapshotIndexBytes([
        ...indexEntries,
        buildSnapshotIndexEntry({
          kind: "retirement-notice",
          packId,
          packVersion: version,
          path: noticeRelativePath,
          digest: sha256Hex(noticeBytes),
        }),
      ]);
      plannedNotice = {
        path: noticePath,
        bytes: noticeBytes,
        indexBytes: nextIndexBytes,
      };
    }

    commitWrites(
      repositoryRoot,
      (transaction) => {
        transaction.replace(provenanceLogPath(repositoryRoot, packId), formatRecord(nextLog));
        transaction.createExclusive(recordPath, formatRecord(retirementRecord));
        if (plannedNotice !== undefined) {
          transaction.createExclusive(plannedNotice.path, plannedNotice.bytes);
          transaction.replace(snapshotIndexPath(repositoryRoot), plannedNotice.indexBytes);
        }
      },
      options.onBeforeWrite,
    );

    const noticeSuffix =
      plannedNotice !== undefined
        ? `; retirement notice written to ${displayPath(repositoryRoot, plannedNotice.path)}`
        : "";
    return successResult(
      `PASS  retired ${packId} version ${version} at sequence ${head.sequence} (actor ${actorId})${noticeSuffix}`,
    );
  } catch (error) {
    return failureResult(usage, error);
  }
}
