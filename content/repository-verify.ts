import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildReleaseArtifacts, provenancePrefixThrough } from "./artifacts.js";
import { sha256Hex } from "./digest.js";
import { verifyVersionGovernance } from "./governance.js";
import { evaluateReleaseGates } from "./release-gates.js";
import {
  buildSnapshotIndexEntry,
  canonicalArtifactPath,
  listRegularFiles,
  readSnapshotIndex,
  snapshotIndexBytes,
  snapshotIndexExists,
} from "./snapshot-index.js";
import {
  StrictValidationError,
  practitionerEligibilitySchema,
  strictParse,
  type LocalizedContent,
  type PractitionerEligibility,
  type ProvenanceEvent,
  type SnapshotIndexEntry,
} from "./schemas/index.js";
import {
  artifactRootDirectory,
  artifactPath,
  displayPath,
  eligibilityDirectory,
  eligibilityPath,
  formatRecord,
  listPackIds,
  listPackSourceVersions,
  readJsonFile,
  snapshotIndexPath,
  snapshotIndexRelativePath,
} from "./store.js";

export interface ReleasedArtifactSummary {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
  readonly releasedAt: string;
  readonly bundleRelativePath: string;
  readonly bundleDigest: string;
  readonly manifestRelativePath: string;
  readonly manifestDigest: string;
  readonly retired: boolean;
}

export interface RepositoryVerificationReport {
  readonly packIds: readonly string[];
  readonly releases: readonly ReleasedArtifactSummary[];
  readonly indexEntries: number;
}

function listRegisteredVersions(repositoryRoot: string, packId: string): number[] {
  const versions = listPackSourceVersions(repositoryRoot, packId);
  if (versions.length === 0) {
    throw new StrictValidationError([
      {
        path: ["packs", packId],
        message: `pack directory content/packs/${packId} contains no registered version source; every registered Pack must have a versioned source`,
      },
    ]);
  }
  return versions;
}

function verifyEligibilityRecords(repositoryRoot: string): number {
  const directory = join(repositoryRoot, eligibilityDirectory);
  if (!existsSync(directory)) {
    return 0;
  }
  const actorIds = readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length))
    .sort();
  for (const actorId of actorIds) {
    const path = join(directory, `${actorId}.json`);
    const record = strictParse(
      practitionerEligibilitySchema,
      readJsonFile(path, "practitioner eligibility"),
    );
    if (record.actorId !== actorId) {
      throw new StrictValidationError([
        {
          path: ["actorId"],
          message: `eligibility file ${displayPath(repositoryRoot, path)} declares actorId "${record.actorId}" but the file name declares "${actorId}"`,
        },
      ]);
    }
  }
  return actorIds.length;
}

function approvingPractitioner(events: readonly ProvenanceEvent[]): ProvenanceEvent {
  const event = [...events]
    .reverse()
    .find((candidate) => candidate.type === "practitioner-reviewed");
  if (event === undefined) {
    throw new StrictValidationError([
      {
        path: ["provenanceLog", "practitioner-reviewed"],
        message: "no practitioner-reviewed event exists for the released version",
      },
    ]);
  }
  return event;
}

function loadEligibility(repositoryRoot: string, actorId: string): PractitionerEligibility {
  return strictParse(
    practitionerEligibilitySchema,
    readJsonFile(eligibilityPath(repositoryRoot, actorId), "practitioner eligibility"),
  );
}

function assertArtifactBytesMatch(
  repositoryRoot: string,
  relativePath: string,
  expectedBytes: string,
  label: string,
): void {
  const path = artifactPath(repositoryRoot, relativePath);
  if (!existsSync(path)) {
    throw new StrictValidationError([
      {
        path: [relativePath],
        message: `${label} is missing at ${displayPath(repositoryRoot, path)}; a release or retirement write may have been interrupted`,
      },
    ]);
  }
  if (readFileSync(path, "utf8") !== expectedBytes) {
    throw new StrictValidationError([
      {
        path: [relativePath],
        message: `${label} at ${displayPath(repositoryRoot, path)} does not match the bytes regenerated from the recorded release inputs; the artifact was altered, is not canonical, or cannot be reproduced`,
      },
    ]);
  }
}

function assertNoLocalizedContent(
  localized: LocalizedContent | undefined,
): asserts localized is LocalizedContent {
  if (localized === undefined) {
    throw new StrictValidationError([
      {
        path: ["localizedContent"],
        message: "a released version requires its registered Burmese localization",
      },
    ]);
  }
}

/**
 * Rebuilds and re-verifies every release in the repository.
 *
 * For each released version the historical release gates are re-evaluated at the
 * recorded release time, the provenance prefix that ends at the release event is
 * reconstructed, and the bundle/manifest bytes are regenerated and compared. The
 * rebuild never reads a clock and never sees later provenance, so later versions,
 * retirement, and subsequent qualification expiry cannot change a historical
 * artifact.
 */
export function verifyRepository(input: {
  readonly repositoryRoot: string;
}): RepositoryVerificationReport {
  const repositoryRoot = input.repositoryRoot;
  const packIds = listPackIds(repositoryRoot);
  verifyEligibilityRecords(repositoryRoot);

  const expectedEntries: SnapshotIndexEntry[] = [];
  const releases: ReleasedArtifactSummary[] = [];

  for (const packId of packIds) {
    for (const version of listRegisteredVersions(repositoryRoot, packId)) {
      const verified = verifyVersionGovernance(repositoryRoot, packId, version);
      const releaseEvent = verified.status.history.find(
        (event) => event.type === "artifact-released",
      );
      if (releaseEvent === undefined) {
        continue;
      }
      assertNoLocalizedContent(verified.localizedContent);
      const localized = verified.localizedContent;

      const approver = approvingPractitioner(verified.status.history);
      const eligibility = loadEligibility(repositoryRoot, approver.actorId);
      const provenancePrefix = provenancePrefixThrough(verified.provenanceLog, releaseEvent);
      const gates = evaluateReleaseGates({
        pack: verified.source,
        localizedContent: localized,
        provenanceLog: provenancePrefix,
        attestations: verified.attestations,
        practitionerEligibility: eligibility,
        evaluateAt: releaseEvent.recordedAt,
        expectedHeadEventDigest: releaseEvent.eventDigest,
      });

      const artifacts = buildReleaseArtifacts({
        pack: verified.source,
        localizedContent: localized,
        gates,
        releaseEvent,
        provenancePrefix,
      });

      assertArtifactBytesMatch(
        repositoryRoot,
        artifacts.bundleRelativePath,
        artifacts.bundleBytes,
        `${packId} version ${version} release bundle`,
      );
      assertArtifactBytesMatch(
        repositoryRoot,
        artifacts.manifestRelativePath,
        artifacts.manifestBytes,
        `${packId} version ${version} release manifest`,
      );
      expectedEntries.push(...artifacts.indexEntries);

      const retired = verified.status.history.some((event) => event.type === "retired");
      const noticeRelativePath = canonicalArtifactPath("retirement-notice", packId, version);
      if (retired) {
        if (verified.notice === undefined) {
          throw new StrictValidationError([
            {
              path: ["retirement", "notice"],
              message: `retired released ${packId} version ${version} has no retirement notice at ${displayPath(repositoryRoot, artifactPath(repositoryRoot, noticeRelativePath))}`,
            },
          ]);
        }
        const noticeBytes = formatRecord(verified.notice);
        assertArtifactBytesMatch(
          repositoryRoot,
          noticeRelativePath,
          noticeBytes,
          `${packId} version ${version} retirement notice`,
        );
        expectedEntries.push(
          buildSnapshotIndexEntry({
            kind: "retirement-notice",
            packId,
            packVersion: version,
            path: noticeRelativePath,
            digest: sha256Hex(noticeBytes),
          }),
        );
      } else if (existsSync(artifactPath(repositoryRoot, noticeRelativePath))) {
        throw new StrictValidationError([
          {
            path: ["retirement", "notice"],
            message: `${packId} version ${version} is not retired but a retirement notice exists at ${displayPath(repositoryRoot, artifactPath(repositoryRoot, noticeRelativePath))}`,
          },
        ]);
      }

      releases.push({
        packId,
        packVersion: version,
        contentDigest: verified.contentDigest,
        releasedAt: releaseEvent.recordedAt,
        bundleRelativePath: artifacts.bundleRelativePath,
        bundleDigest: artifacts.bundleDigest,
        manifestRelativePath: artifacts.manifestRelativePath,
        manifestDigest: artifacts.manifestDigest,
        retired,
      });
    }
  }

  verifyArtifactInventory(repositoryRoot, expectedEntries);

  return { packIds, releases, indexEntries: expectedEntries.length };
}

/**
 * Requires exact agreement between release/retirement history, the snapshot
 * index, and the artifact files on disk. Missing, unexpected, or altered
 * artifacts all fail here.
 */
function verifyArtifactInventory(
  repositoryRoot: string,
  expectedEntries: readonly SnapshotIndexEntry[],
): void {
  const files = listRegularFiles(join(repositoryRoot, artifactRootDirectory));
  const presentPaths = new Set(files.map((file) => file.relativePath));

  if (!snapshotIndexExists(repositoryRoot)) {
    if (presentPaths.size === 0) {
      return;
    }
    throw new StrictValidationError([
      {
        path: ["artifacts"],
        message: `artifact files exist without ${artifactRootDirectory}/${snapshotIndexRelativePath}; the canonical artifact inventory is missing`,
      },
    ]);
  }

  const index = readSnapshotIndex(repositoryRoot);
  const expected = new Map(expectedEntries.map((entry) => [entry.path, entry]));
  const actual = new Map(index.entries.map((entry) => [entry.path, entry]));

  for (const path of expected.keys()) {
    if (!actual.has(path)) {
      throw new StrictValidationError([
        { path: ["entries"], message: `snapshot index is missing the entry for ${path}` },
      ]);
    }
  }
  for (const path of actual.keys()) {
    if (!expected.has(path)) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index contains the unexpected entry ${path}; release and retirement history do not account for it`,
        },
      ]);
    }
  }
  for (const [path, expectedEntry] of expected) {
    const actualEntry = actual.get(path)!;
    if (actualEntry.kind !== expectedEntry.kind) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${path} is classified as ${actualEntry.kind} but the release history requires ${expectedEntry.kind}`,
        },
      ]);
    }
    if (
      actualEntry.packId !== expectedEntry.packId ||
      actualEntry.packVersion !== expectedEntry.packVersion
    ) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${path} does not identify ${expectedEntry.packId} version ${expectedEntry.packVersion}`,
        },
      ]);
    }
    if (actualEntry.digest !== expectedEntry.digest) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${path} has digest ${actualEntry.digest} but the release history requires ${expectedEntry.digest}`,
        },
      ]);
    }
  }

  if (
    snapshotIndexBytes(expectedEntries) !== readFileSync(snapshotIndexPath(repositoryRoot), "utf8")
  ) {
    throw new StrictValidationError([
      {
        path: ["entries"],
        message:
          "snapshot index bytes are not the canonical deterministic rendering of the release and retirement history",
      },
    ]);
  }

  for (const file of files) {
    if (file.relativePath === snapshotIndexRelativePath) {
      continue;
    }
    const entry = actual.get(file.relativePath);
    if (entry === undefined) {
      throw new StrictValidationError([
        {
          path: [file.relativePath],
          message: `artifact file ${artifactRootDirectory}/${file.relativePath} is not enumerated by the snapshot index`,
        },
      ]);
    }
    const digest = sha256Hex(file.bytes);
    if (digest !== entry.digest) {
      throw new StrictValidationError([
        {
          path: [file.relativePath],
          message: `artifact file ${artifactRootDirectory}/${file.relativePath} has digest ${digest} but the snapshot index records ${entry.digest}`,
        },
      ]);
    }
  }
}
