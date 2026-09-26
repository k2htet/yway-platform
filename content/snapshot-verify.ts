import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { assertBundleBindings } from "./artifacts.js";
import { sha256Hex } from "./digest.js";
import { verifyProvenanceLog } from "./provenance.js";
import { canonicalArtifactPath, listRegularFiles, snapshotIndexBytes } from "./snapshot-index.js";
import { assertFixtureOnlyProvenance } from "./store.js";
import {
  StrictValidationError,
  releaseBundleSchema,
  releaseManifestSchema,
  retirementNoticeSchema,
  snapshotIndexSchema,
  strictParse,
  type ReleaseBundle,
  type ReleaseManifest,
  type RetirementNotice,
  type SnapshotEntryKind,
  type SnapshotIndex,
  type SnapshotIndexEntry,
} from "./schemas/index.js";
import { artifactRootDirectory, snapshotIndexRelativePath } from "./store.js";

/** sha1 and sha256 object formats both produce lowercase full-length hex ids. */
const fullCommitShaPattern = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;

export interface ArtifactSnapshot {
  readonly trustedCommit: string;
  readonly index: SnapshotIndex;
  /** Artifact-root-relative path to the exact bytes pinned by the trusted commit. */
  readonly files: ReadonlyMap<string, Buffer>;
}

export interface SnapshotVersionEntry {
  readonly packId: string;
  readonly packVersion: number;
  readonly bundle: ReleaseBundle;
  readonly manifest: ReleaseManifest;
  readonly notice: RetirementNotice | undefined;
  readonly retired: boolean;
}

/**
 * Resolves a caller-supplied trusted commit.
 *
 * Trust is never inferred from HEAD, a branch name, an abbreviated id, or local
 * digest agreement: the caller must name a full immutable commit, and this
 * function only checks that shape. Revocation, tag verification, and trusted-root
 * acquisition remain deferred beyond Stage 2.
 */
export function requireFullCommitSha(value: string): string {
  if (!fullCommitShaPattern.test(value)) {
    throw new StrictValidationError([
      {
        path: ["trustedCommit"],
        message: `trusted commit "${value}" must be a full immutable commit SHA (40 or 64 lowercase hex characters); Stage 2 never resolves trust from HEAD, a branch name, or an abbreviated id`,
      },
    ]);
  }
  return value;
}

/**
 * Git environment variables that would let local repository state stand in for
 * the caller-supplied trusted root. They are cleared rather than inherited.
 */
const neutralizedGitEnvironment = {
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
  GIT_REPLACE_REF_BASE: undefined,
  GIT_CEILING_DIRECTORIES: undefined,
  GIT_DISCOVERY_ACROSS_FILESYSTEM: undefined,
} as const;

function runGit(
  repositoryRoot: string,
  args: readonly string[],
  encoding: "utf8" | "buffer",
): { readonly status: number; readonly stdout: string | Buffer; readonly stderr: string } {
  // `--no-replace-objects` is essential: without it, a `refs/replace/<sha>` entry
  // in local `.git` state silently substitutes a different object for the commit
  // the caller named, which would let local state forge the trusted root.
  const result = spawnSync("git", ["--no-replace-objects", ...args], {
    cwd: repositoryRoot,
    encoding,
    shell: false,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 60_000,
    env: { ...process.env, ...neutralizedGitEnvironment },
  });
  if (result.error !== undefined) {
    throw new StrictValidationError([
      {
        path: ["git"],
        message: `git ${args[0]} could not run: ${result.error.message}`,
      },
    ]);
  }
  if (result.signal !== null) {
    throw new StrictValidationError([
      {
        path: ["git"],
        message: `git ${args[0]} was terminated by signal ${result.signal}; the trusted snapshot cannot be verified`,
      },
    ]);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout as string | Buffer,
    stderr: typeof result.stderr === "string" ? result.stderr : result.stderr.toString("utf8"),
  };
}

function assertCommitExists(repositoryRoot: string, trustedCommit: string): void {
  const result = runGit(repositoryRoot, ["cat-file", "-e", `${trustedCommit}^{commit}`], "utf8");
  if (result.status !== 0) {
    throw new StrictValidationError([
      {
        path: ["trustedCommit"],
        message: `trusted commit ${trustedCommit} is not a resolvable commit in this repository; the trusted snapshot root cannot be verified`,
      },
    ]);
  }
}

interface PinnedEntry {
  readonly mode: string;
  readonly objectId: string;
}

function pinnedArtifactTree(
  repositoryRoot: string,
  trustedCommit: string,
): Map<string, PinnedEntry> {
  const result = runGit(
    repositoryRoot,
    ["ls-tree", "-r", "-z", "--full-tree", trustedCommit, "--", artifactRootDirectory],
    "utf8",
  );
  if (result.status !== 0) {
    throw new StrictValidationError([
      {
        path: ["trustedCommit"],
        message: `could not list ${artifactRootDirectory}/ in ${trustedCommit}: ${result.stderr.trim()}`,
      },
    ]);
  }
  const entries = new Map<string, PinnedEntry>();
  for (const record of (result.stdout as string).split("\0")) {
    if (record === "") {
      continue;
    }
    const match = /^(\d{6}) (\w+) ([0-9a-f]{40}|[0-9a-f]{64})\t(.+)$/.exec(record);
    if (match === null) {
      throw new StrictValidationError([
        {
          path: ["git", "ls-tree"],
          message: `unparseable ls-tree record in ${trustedCommit}`,
        },
      ]);
    }
    const [, mode, type, objectId, path] = match as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];
    if (type !== "blob" || mode === "120000") {
      throw new StrictValidationError([
        {
          path: ["artifacts", path],
          message: `trusted commit ${trustedCommit} pins ${path} as ${type} mode ${mode}; the artifact inventory must contain regular files only`,
        },
      ]);
    }
    if (mode !== "100644" && mode !== "100755") {
      throw new StrictValidationError([
        {
          path: ["artifacts", path],
          message: `trusted commit ${trustedCommit} pins ${path} with unsupported mode ${mode}`,
        },
      ]);
    }
    const relative = path.startsWith(`${artifactRootDirectory}/`)
      ? path.slice(artifactRootDirectory.length + 1)
      : path;
    entries.set(relative, { mode, objectId });
  }
  return entries;
}

function readPinnedBlob(repositoryRoot: string, trustedCommit: string, objectId: string): Buffer {
  const result = runGit(repositoryRoot, ["cat-file", "blob", objectId], "buffer");
  if (result.status !== 0) {
    throw new StrictValidationError([
      {
        path: ["artifacts", objectId],
        message: `could not read pinned blob ${objectId} from ${trustedCommit}`,
      },
    ]);
  }
  return result.stdout as Buffer;
}

function parseJsonBytes(bytes: Buffer, relativePath: string, label: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StrictValidationError([
      {
        path: [relativePath],
        message: `${label} at ${relativePath} is not valid JSON: ${message}`,
      },
    ]);
  }
}

function snapshotFile(
  files: ReadonlyMap<string, Buffer>,
  relativePath: string,
  label: string,
): Buffer {
  const bytes = files.get(relativePath);
  if (bytes === undefined) {
    throw new StrictValidationError([
      {
        path: [relativePath],
        message: `${label} is missing from the trusted snapshot at ${artifactRootDirectory}/${relativePath}`,
      },
    ]);
  }
  return bytes;
}

/**
 * Resolves the one canonical index entry for an artifact kind and version.
 *
 * The entry must also sit at the canonical artifact-relative path, so an index
 * that maps one version's identity onto another version's file cannot satisfy a
 * consumer's request.
 */
function requireCanonicalEntry(
  index: SnapshotIndex,
  kind: SnapshotEntryKind,
  packId: string,
  packVersion: number,
): SnapshotIndexEntry {
  const expectedPath = canonicalArtifactPath(kind, packId, packVersion);
  const entry = index.entries.find(
    (candidate) =>
      candidate.kind === kind &&
      candidate.packId === packId &&
      candidate.packVersion === packVersion,
  );
  if (entry === undefined) {
    throw new StrictValidationError([
      {
        path: ["entries"],
        message: `trusted snapshot has no ${kind} entry for ${packId} version ${packVersion}`,
      },
    ]);
  }
  if (entry.path !== expectedPath) {
    throw new StrictValidationError([
      {
        path: ["entries"],
        message: `trusted snapshot ${kind} entry for ${packId} version ${packVersion} is at ${entry.path}, not the canonical ${expectedPath}`,
      },
    ]);
  }
  return entry;
}

function requireOptionalCanonicalEntry(
  index: SnapshotIndex,
  kind: SnapshotEntryKind,
  packId: string,
  packVersion: number,
): SnapshotIndexEntry | undefined {
  const present = index.entries.some(
    (entry) => entry.kind === kind && entry.packId === packId && entry.packVersion === packVersion,
  );
  return present ? requireCanonicalEntry(index, kind, packId, packVersion) : undefined;
}

/**
 * Validates the artifact inventory and index of a trusted Git snapshot.
 *
 * The local artifact tree is compared file-for-file against the tree pinned by
 * the caller-supplied commit. Absence is only meaningful because the comparison
 * is exhaustive: a deleted notice (with or without a rewritten index) leaves a
 * tree that no longer matches the trusted commit.
 */
export function verifyArtifactSnapshot(input: {
  readonly repositoryRoot: string;
  readonly trustedCommit: string;
}): ArtifactSnapshot {
  const trustedCommit = requireFullCommitSha(input.trustedCommit);
  const repositoryRoot = input.repositoryRoot;
  assertCommitExists(repositoryRoot, trustedCommit);

  const pinned = pinnedArtifactTree(repositoryRoot, trustedCommit);
  const localFiles = listRegularFiles(join(repositoryRoot, artifactRootDirectory));
  const local = new Map(localFiles.map((file) => [file.relativePath, file.bytes]));

  for (const relativePath of local.keys()) {
    if (!pinned.has(relativePath)) {
      throw new StrictValidationError([
        {
          path: [relativePath],
          message: `artifact file ${artifactRootDirectory}/${relativePath} is not present in trusted commit ${trustedCommit}`,
        },
      ]);
    }
  }

  const files = new Map<string, Buffer>();
  for (const [relativePath, entry] of pinned) {
    const localBytes = local.get(relativePath);
    if (localBytes === undefined) {
      throw new StrictValidationError([
        {
          path: [relativePath],
          message: `artifact file ${artifactRootDirectory}/${relativePath} pinned by trusted commit ${trustedCommit} is missing locally`,
        },
      ]);
    }
    const pinnedBytes = readPinnedBlob(repositoryRoot, trustedCommit, entry.objectId);
    if (!pinnedBytes.equals(localBytes)) {
      throw new StrictValidationError([
        {
          path: [relativePath],
          message: `artifact file ${artifactRootDirectory}/${relativePath} does not match the bytes pinned by trusted commit ${trustedCommit}`,
        },
      ]);
    }
    files.set(relativePath, localBytes);
  }

  const indexBytes = snapshotFile(files, snapshotIndexRelativePath, "snapshot index");
  const index = strictParse(
    snapshotIndexSchema,
    parseJsonBytes(indexBytes, snapshotIndexRelativePath, "snapshot index"),
  );

  const indexedPaths = new Set(index.entries.map((entry) => entry.path));
  for (const relativePath of files.keys()) {
    if (relativePath === snapshotIndexRelativePath) {
      continue;
    }
    if (!indexedPaths.has(relativePath)) {
      throw new StrictValidationError([
        {
          path: [relativePath],
          message: `artifact file ${artifactRootDirectory}/${relativePath} is not enumerated by the snapshot index`,
        },
      ]);
    }
  }
  for (const entry of index.entries) {
    const bytes = files.get(entry.path);
    if (bytes === undefined) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${entry.path} has no file in the trusted snapshot`,
        },
      ]);
    }
    const actual = sha256Hex(bytes);
    if (actual !== entry.digest) {
      throw new StrictValidationError([
        {
          path: ["entries"],
          message: `snapshot index entry ${entry.path} has digest ${entry.digest} but the trusted file digest is ${actual}`,
        },
      ]);
    }
  }

  if (snapshotIndexBytes(index.entries) !== indexBytes.toString("utf8")) {
    throw new StrictValidationError([
      {
        path: ["entries"],
        message:
          "snapshot index bytes are not the canonical deterministic rendering of their entries",
      },
    ]);
  }

  return { trustedCommit, index, files };
}

/**
 * Resolves one released version from a verified trusted snapshot using artifact
 * bytes only. Authoring sources, provenance, and attestations are never read.
 *
 * This is deliberately not part of the public `content` surface: it reports
 * `retired` rather than refusing, so only {@link loadReleasedBundle} — which
 * refuses a retired version — is the supported consumption path.
 */
export function inspectSnapshotVersion(
  snapshot: ArtifactSnapshot,
  packId: string,
  packVersion: number,
): SnapshotVersionEntry {
  const bundleEntry = requireCanonicalEntry(snapshot.index, "bundle", packId, packVersion);
  const manifestEntry = requireCanonicalEntry(
    snapshot.index,
    "release-manifest",
    packId,
    packVersion,
  );

  const bundleBytes = snapshotFile(
    snapshot.files,
    bundleEntry.path,
    `bundle for ${packId}@${packVersion}`,
  );
  const manifestBytes = snapshotFile(
    snapshot.files,
    manifestEntry.path,
    `release manifest for ${packId}@${packVersion}`,
  );
  const bundle = strictParse(
    releaseBundleSchema,
    parseJsonBytes(bundleBytes, bundleEntry.path, "release bundle"),
  );
  const manifest = strictParse(
    releaseManifestSchema,
    parseJsonBytes(manifestBytes, manifestEntry.path, "release manifest"),
  );

  const binding = assertBundleBindings({
    bundle,
    bundleRelativePath: bundleEntry.path,
    bundleDigest: sha256Hex(bundleBytes),
    manifest,
    manifestRelativePath: manifestEntry.path,
    manifestDigest: sha256Hex(manifestBytes),
  });
  if (binding.packId !== packId || binding.packVersion !== packVersion) {
    throw new StrictValidationError([
      {
        path: ["packId"],
        message: `trusted snapshot entry for ${packId} version ${packVersion} resolves to bundle ${binding.packId} version ${binding.packVersion}`,
      },
    ]);
  }

  // Re-derive the embedded cumulative provenance from the bundle bytes alone, so a
  // consumer never has to trust that the recorded history is internally coherent.
  //
  // Scope, stated precisely: this proves the prefix is a self-consistent,
  // digest-pinned, lifecycle-legal chain for the released version. The prefix head
  // is anchored to the release manifest's `releasedAt`, which is a separately
  // digest-pinned artifact, so the prefix must end at that exact release event.
  //
  // It does *not* prove the prefix is complete: a re-sealed chain for an earlier
  // version of the same Pack would be internally legal here. Detecting that needs
  // the authoring sources and is the repository verifier's job. Truncating the
  // released version's own history is caught by the lifecycle transition rules and
  // by the trusted-tree byte comparison.
  const prefixHead = bundle.provenance.events[bundle.provenance.events.length - 1]!;
  if (
    prefixHead.type !== "artifact-released" ||
    prefixHead.packVersion !== bundle.packVersion ||
    prefixHead.recordedAt !== manifest.releasedAt
  ) {
    throw new StrictValidationError([
      {
        path: ["provenance", "events"],
        message: `bundle provenance prefix does not end at the release event the release manifest records (releasedAt ${manifest.releasedAt})`,
      },
    ]);
  }
  verifyProvenanceLog(bundle.provenance, {
    expectedContentDigests: { [bundle.packVersion]: bundle.contentDigest },
    expectedLocalizedContentDigests: {
      [bundle.packVersion]: bundle.localizedContentDigest,
    },
  });
  assertFixtureOnlyProvenance(true, bundle.provenance);

  const noticeEntry = requireOptionalCanonicalEntry(
    snapshot.index,
    "retirement-notice",
    packId,
    packVersion,
  );
  let notice: RetirementNotice | undefined;
  if (noticeEntry !== undefined) {
    const noticeBytes = snapshotFile(
      snapshot.files,
      noticeEntry.path,
      `retirement notice for ${packId}@${packVersion}`,
    );
    notice = strictParse(
      retirementNoticeSchema,
      parseJsonBytes(noticeBytes, noticeEntry.path, "retirement notice"),
    );
    if (notice.packId !== packId || notice.packVersion !== packVersion) {
      throw new StrictValidationError([
        {
          path: ["retirementNotice"],
          message: `retirement notice ${noticeEntry.path} does not identify ${packId} version ${packVersion}`,
        },
      ]);
    }
    if (notice.contentDigest !== bundle.contentDigest) {
      throw new StrictValidationError([
        {
          path: ["retirementNotice", "contentDigest"],
          message: `retirement notice ${noticeEntry.path} does not bind bundle content digest ${bundle.contentDigest}`,
        },
      ]);
    }
    if (notice.releaseManifestDigest !== sha256Hex(manifestBytes)) {
      throw new StrictValidationError([
        {
          path: ["retirementNotice", "releaseManifestDigest"],
          message: `retirement notice ${noticeEntry.path} does not bind the release manifest of ${packId} version ${packVersion}`,
        },
      ]);
    }
  }

  return { packId, packVersion, bundle, manifest, notice, retired: notice !== undefined };
}

export interface LoadedReleasedBundle {
  readonly trustedCommit: string;
  readonly entry: SnapshotVersionEntry;
}

/**
 * Loads a released bundle for consumption.
 *
 * A retired version may still pass integrity verification — its historical
 * artifacts are immutable — but this loader refuses to hand it to a consumer.
 */
export function loadReleasedBundle(input: {
  readonly repositoryRoot: string;
  readonly trustedCommit: string;
  readonly packId: string;
  readonly packVersion: number;
}): LoadedReleasedBundle {
  const trustedCommit = requireFullCommitSha(input.trustedCommit);
  const snapshot = verifyArtifactSnapshot({
    repositoryRoot: input.repositoryRoot,
    trustedCommit,
  });
  const entry = inspectSnapshotVersion(snapshot, input.packId, input.packVersion);
  if (entry.retired) {
    throw new StrictValidationError([
      {
        path: ["retirementNotice"],
        message: `${input.packId} version ${input.packVersion} was retired in trusted commit ${trustedCommit}; a retired version must not be loaded`,
      },
    ]);
  }
  return { trustedCommit, entry };
}
