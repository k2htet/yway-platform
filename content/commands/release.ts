import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildReleaseArtifacts, provenancePrefixThrough } from "../artifacts.js";
import {
  requestedAuthorizationScopeSchema,
  requireClassificationIsolation,
  type ReleaseAuthorizationScope,
} from "../classification.js";
import { contentDigest } from "../digest.js";
import { verifyVersionGovernance } from "../governance.js";
import { appendProvenanceEvent } from "../provenance.js";
import { appendArtifactEligibilityEvent, evaluateReleaseGates } from "../release-gates.js";
import {
  canonicalArtifactPath,
  listRegularFiles,
  readSnapshotIndex,
  snapshotIndexBytes,
} from "../snapshot-index.js";
import {
  StrictValidationError,
  dateTimeSchema,
  practitionerEligibilitySchema,
  strictParse,
  type ProvenanceEventLog,
  type SnapshotIndexEntry,
} from "../schemas/index.js";
import {
  artifactPath,
  artifactRootDirectory,
  commitWrites,
  digestFile,
  displayPath,
  eligibilityPath,
  formatRecord,
  provenanceLogPath,
  readJsonFile,
  releaseBundlePath,
  releaseBundleRelativePath,
  releaseManifestPath,
  releaseManifestRelativePath,
  resolveRepositoryRoot,
  snapshotIndexPath,
  snapshotIndexRelativePath,
} from "../store.js";
import {
  failureResult,
  optionalFlagString,
  parseCommandFlags,
  parsePositiveInteger,
  requireActorId,
  requireFlagString,
  requirePackId,
  successResult,
  UsageError,
  type CommandOptions,
  type CommandResult,
} from "./args.js";

const usage =
  "Usage: pnpm content:release -- --pack <id> --version <n> --actor <id> [--authorization-scope pilot]";

/**
 * Resolves the owner-granted release authorization scope.
 *
 * Classification and authorization scope are separate facts and neither may stand
 * in for the other: real content may be released only under an explicit `pilot`
 * scope, fixture content carries none, and `public` is refused because the
 * `YWAY-P023` comprehension gates, the `YWAY-P024` runtime accessibility evidence,
 * and a separate owner authorization do not exist.
 */
function requireAuthorizationScope(
  raw: string | undefined,
  fixtureOnly: boolean,
): ReleaseAuthorizationScope | undefined {
  if (raw === undefined) {
    if (fixtureOnly) {
      return undefined;
    }
    throw new UsageError(
      `releasing real content requires --authorization-scope pilot; pilot eligibility is an explicit owner authorization and is never inferred from classification`,
    );
  }
  const requested = requestedAuthorizationScopeSchema.safeParse(raw);
  if (!requested.success) {
    throw new UsageError(
      `option "--authorization-scope" must be one of: ${requestedAuthorizationScopeSchema.options.join(", ")} (received "${raw}")`,
    );
  }
  if (requested.data === "public") {
    throw new UsageError(
      'option "--authorization-scope public" is refused: public release additionally requires the YWAY-P023 fluent-Burmese-review and target-user-comprehension gates, the YWAY-P024 runtime accessibility evidence, and a separate owner authorization, none of which exist. A pilot-scoped release confers no public-release authority',
    );
  }
  if (fixtureOnly) {
    throw new UsageError(
      'option "--authorization-scope" is only accepted when releasing real content; fixture-classified content carries no release authorization scope',
    );
  }
  return requested.data;
}

/**
 * Standing lifecycle states from which a release may be produced. Every earlier
 * state (`authored`, `founder-reviewed`, `changes-requested`) and the terminal or
 * already-consumed states (`artifact-released`, `retired`) are refused.
 */
const releasableStatuses: ReadonlySet<string> = new Set([
  "practitioner-reviewed",
  "artifact-eligible",
]);

function headOf(log: ProvenanceEventLog) {
  const head = log.events[log.events.length - 1];
  if (head === undefined) {
    throw new StrictValidationError([
      { path: ["provenanceLog", "events"], message: "provenance log has no events" },
    ]);
  }
  return head;
}

/**
 * Reads the existing snapshot index and requires it to be exactly the canonical
 * rendering of its own entries, with every entry backed by a matching file.
 *
 * An interrupted previous write can leave a partially updated artifact root, and
 * an index that is merely self-consistent is not trustworthy. A mutating command
 * refuses rather than silently re-rendering an anomalous index.
 */
export function readCanonicalSnapshotIndex(repositoryRoot: string): readonly SnapshotIndexEntry[] {
  const inventory = listRegularFiles(join(repositoryRoot, artifactRootDirectory));
  if (!existsSync(snapshotIndexPath(repositoryRoot))) {
    if (inventory.length > 0) {
      throw new StrictValidationError([
        {
          path: [inventory[0]!.relativePath],
          message: `artifact file ${artifactRootDirectory}/${inventory[0]!.relativePath} is not enumerated by a snapshot index`,
        },
      ]);
    }
    return [];
  }
  const index = readSnapshotIndex(repositoryRoot);
  if (
    snapshotIndexBytes(index.entries) !== readFileSync(snapshotIndexPath(repositoryRoot), "utf8")
  ) {
    throw new StrictValidationError([
      {
        path: ["entries"],
        message:
          "existing snapshot index is not the canonical deterministic rendering of its own entries",
      },
    ]);
  }
  const indexedPaths = new Set(index.entries.map((entry) => entry.path));
  for (const file of inventory) {
    if (file.relativePath !== snapshotIndexRelativePath && !indexedPaths.has(file.relativePath)) {
      throw new StrictValidationError([
        {
          path: [file.relativePath],
          message: `artifact file ${artifactRootDirectory}/${file.relativePath} is not enumerated by the snapshot index`,
        },
      ]);
    }
  }
  for (const entry of index.entries) {
    const canonicalPath = canonicalArtifactPath(entry.kind, entry.packId, entry.packVersion);
    if (entry.path !== canonicalPath) {
      throw new StrictValidationError([
        {
          path: ["entries", entry.path],
          message: `snapshot index entry ${entry.path} declares ${entry.kind} for ${entry.packId} version ${entry.packVersion}, but its canonical path is ${canonicalPath}`,
        },
      ]);
    }
    const path = artifactPath(repositoryRoot, entry.path);
    if (!existsSync(path)) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${entry.path} for ${entry.packId} version ${entry.packVersion} has no artifact file; the artifact root is inconsistent with the index`,
        },
      ]);
    }
    const actual = digestFile(path);
    if (actual !== entry.digest) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${entry.path} for ${entry.packId} version ${entry.packVersion} has digest ${entry.digest} but the file digest is ${actual}`,
        },
      ]);
    }
  }
  return index.entries;
}

export function runReleaseCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      pack: { type: "string" },
      version: { type: "string" },
      actor: { type: "string" },
      "authorization-scope": { type: "string" },
    });
    const packId = requirePackId(values);
    const version = parsePositiveInteger(requireFlagString(values, "version"), "version");
    const actorId = requireActorId(values);
    const requestedScope = optionalFlagString(values, "authorization-scope");

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const releasedAt = strictParse(
      dateTimeSchema,
      (options.now ?? (() => new Date().toISOString()))(),
    );

    // Reuse the same governance seam as `content:status` and `content:verify`, so a
    // release can never commit artifacts into a repository state those commands
    // would immediately reject.
    const verified = verifyVersionGovernance(repositoryRoot, packId, version);
    const source = verified.source;
    requireClassificationIsolation(source, actorId);
    const authorizationScope = requireAuthorizationScope(requestedScope, source.fixtureOnly);
    const log = verified.provenanceLog;
    const attestations = verified.attestations;
    const sourceDigest = verified.contentDigest;
    const status = verified.status;

    if (status.currentStatus === "retired") {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `pack "${packId}" version ${version} is retired; a retired version is no longer artifact-eligible and cannot be released`,
        },
      ]);
    }
    if (!releasableStatuses.has(status.currentStatus)) {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `release requires standing practitioner-reviewed or artifact-eligible status for ${packId} version ${version} (current status "${status.currentStatus}")`,
        },
      ]);
    }

    const localized = verified.localizedContent;
    if (localized === undefined) {
      throw new StrictValidationError([
        {
          path: ["localizedContent"],
          message: `Burmese localization is required for ${packId} version ${version} before release; localized content for ${packId} version ${version} not found`,
        },
      ]);
    }
    const localizedDigest = contentDigest(localized);

    const eligibilityEvent = status.history.find((event) => event.type === "artifact-eligible");
    if (
      eligibilityEvent !== undefined &&
      Date.parse(releasedAt) < Date.parse(eligibilityEvent.recordedAt)
    ) {
      throw new StrictValidationError([
        {
          path: ["releasedAt"],
          message: `release timestamp ${releasedAt} must not precede the artifact-eligible event recorded at ${eligibilityEvent.recordedAt} for ${packId} version ${version}`,
        },
      ]);
    }

    const bundleRelativePath = releaseBundleRelativePath(packId, version);
    const manifestRelativePath = releaseManifestRelativePath(packId, version);
    for (const relativePath of [bundleRelativePath, manifestRelativePath]) {
      const existing = artifactPath(repositoryRoot, relativePath);
      if (existsSync(existing)) {
        throw new StrictValidationError([
          {
            path: [],
            message: `refusing to overwrite existing file ${displayPath(repositoryRoot, existing)}`,
          },
        ]);
      }
    }

    const existingEntries = readCanonicalSnapshotIndex(repositoryRoot);
    const newPaths = new Set([bundleRelativePath, manifestRelativePath]);
    for (const entry of existingEntries) {
      if (newPaths.has(entry.path)) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index already contains an entry at ${entry.path}; release overwrite is refused`,
          },
        ]);
      }
      if (entry.packId === packId && entry.packVersion === version) {
        throw new StrictValidationError([
          {
            path: ["entries"],
            message: `snapshot index already contains a ${entry.kind} entry for ${packId} version ${version}; release overwrite is refused`,
          },
        ]);
      }
    }

    const practitionerEvent = [...status.history]
      .reverse()
      .find((event) => event.type === "practitioner-reviewed");
    if (practitionerEvent === undefined) {
      throw new StrictValidationError([
        {
          path: ["provenanceLog", "practitioner-reviewed"],
          message: `release requires a recorded practitioner approval for ${packId} version ${version}`,
        },
      ]);
    }
    const eligibility = strictParse(
      practitionerEligibilitySchema,
      readJsonFile(
        eligibilityPath(repositoryRoot, practitionerEvent.actorId),
        "practitioner eligibility",
      ),
    );

    const gateInput = {
      pack: source,
      localizedContent: localized,
      provenanceLog: log,
      attestations,
      practitionerEligibility: eligibility,
      evaluateAt: releasedAt,
    };

    const eligibleLog =
      status.currentStatus === "practitioner-reviewed"
        ? appendArtifactEligibilityEvent({ ...gateInput, actorId, recordedAt: releasedAt })
        : log;

    const gateResult = evaluateReleaseGates({
      ...gateInput,
      provenanceLog: eligibleLog,
      expectedHeadEventDigest: headOf(eligibleLog).eventDigest,
    });

    const releasedLog = appendProvenanceEvent(eligibleLog, {
      packId,
      packVersion: version,
      type: "artifact-released",
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: sourceDigest,
      localizedContentDigest: localizedDigest,
      recordedAt: releasedAt,
    });
    const releaseEvent = headOf(releasedLog);

    const artifacts = buildReleaseArtifacts({
      pack: source,
      localizedContent: localized,
      gates: gateResult,
      releaseEvent,
      provenancePrefix: provenancePrefixThrough(releasedLog, releaseEvent),
      ...(authorizationScope === undefined ? {} : { authorizationScope }),
    });

    const nextIndexBytes = snapshotIndexBytes([...existingEntries, ...artifacts.indexEntries]);

    commitWrites(
      repositoryRoot,
      (transaction) => {
        transaction.replace(provenanceLogPath(repositoryRoot, packId), formatRecord(releasedLog));
        transaction.createExclusive(
          releaseBundlePath(repositoryRoot, packId, version),
          artifacts.bundleBytes,
        );
        transaction.createExclusive(
          releaseManifestPath(repositoryRoot, packId, version),
          artifacts.manifestBytes,
        );
        transaction.replace(snapshotIndexPath(repositoryRoot), nextIndexBytes);
      },
      options.onBeforeWrite,
    );

    const appendedEligibility =
      status.currentStatus === "practitioner-reviewed"
        ? `; recorded artifact-eligible at sequence ${headOf(eligibleLog).sequence}`
        : "";
    const scopeSuffix =
      authorizationScope === undefined
        ? "; classification fixture"
        : `; classification real, release authorization scope ${authorizationScope}`;
    return successResult(
      `PASS  released ${packId} version ${version} at sequence ${releaseEvent.sequence} (actor ${actorId}, ${releasedAt}${scopeSuffix})${appendedEligibility}`,
    );
  } catch (error) {
    return failureResult(usage, error);
  }
}
