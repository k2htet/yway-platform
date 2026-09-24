import { existsSync } from "node:fs";
import { join } from "node:path";
import { contentDigest, sha256Hex } from "../digest.js";
import { appendProvenanceEvent } from "../provenance.js";
import { deriveVersionLifecycleStatus } from "../lifecycle.js";
import {
  StrictValidationError,
  retirementNoticeSchema,
  retirementRecordSchema,
  releaseManifestSchema,
  snapshotIndexSchema,
  strictParse,
  type RetirementNotice,
  type RetirementRecord,
} from "../schemas/index.js";
import {
  artifactRootDirectory,
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
      if (
        manifest.packId !== packId ||
        manifest.packVersion !== version ||
        manifest.contentDigest !== contentDigestHex
      ) {
        throw new StrictValidationError([
          {
            path: ["releaseManifest"],
            message: `release manifest at ${displayPath(repositoryRoot, manifestPath)} does not bind ${packId} version ${version} with contentDigest ${contentDigestHex}`,
          },
        ]);
      }
      if (manifest.fixtureOnly !== source.fixtureOnly) {
        throw new StrictValidationError([
          {
            path: ["releaseManifest", "fixtureOnly"],
            message: `release manifest at ${displayPath(repositoryRoot, manifestPath)} declares fixtureOnly ${manifest.fixtureOnly} but the source for ${packId} version ${version} declares fixtureOnly ${source.fixtureOnly}; fixture isolation must match`,
          },
        ]);
      }
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

      const indexPath = snapshotIndexPath(repositoryRoot);
      const index = strictParse(snapshotIndexSchema, readJsonFile(indexPath, "snapshot index"));
      const manifestRelativePath = `manifests/${packId}/${version}/manifest.json`;
      const manifestEntry = index.entries.find(
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
      const bundleEntry = index.entries.find(
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
      const bundlePath = join(repositoryRoot, artifactRootDirectory, manifest.bundle.path);
      if (!existsSync(bundlePath) || digestFile(bundlePath) !== manifest.bundle.digest) {
        throw new StrictValidationError([
          {
            path: ["bundle"],
            message: `release bundle at ${displayPath(repositoryRoot, bundlePath)} is missing or does not match the manifest bundle digest ${manifest.bundle.digest}`,
          },
        ]);
      }

      const noticeRelativePath = retirementNoticeRelativePath(packId, version);
      if (index.entries.some((entry) => entry.path === noticeRelativePath)) {
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
      const nextIndex = strictParse(snapshotIndexSchema, {
        schemaVersion: index.schemaVersion,
        entries: [
          ...index.entries,
          {
            kind: "retirement-notice",
            packId,
            packVersion: version,
            path: noticeRelativePath,
            digest: sha256Hex(noticeBytes),
          },
        ],
      });
      plannedNotice = {
        path: noticePath,
        bytes: noticeBytes,
        indexBytes: formatRecord(nextIndex),
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
