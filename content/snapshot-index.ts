import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  formatRecord,
  readJsonFile,
  releaseBundleRelativePath,
  releaseManifestRelativePath,
  retirementNoticeRelativePath,
  snapshotIndexPath,
} from "./store.js";
import {
  StrictValidationError,
  snapshotIndexEntrySchema,
  snapshotIndexSchema,
  strictParse,
  type SnapshotIndex,
  type SnapshotIndexEntry,
  type SnapshotEntryKind,
} from "./schemas/index.js";

/**
 * Locale-independent ordering for artifact-relative paths.
 *
 * `localeCompare` depends on the host locale, which would make the committed
 * snapshot index differ between machines. Code-unit comparison is stable
 * everywhere, so the index is byte-identical for identical artifact sets.
 */
export function compareArtifactPaths(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function sortSnapshotIndexEntries(
  entries: readonly SnapshotIndexEntry[],
): SnapshotIndexEntry[] {
  return [...entries].sort((left, right) => compareArtifactPaths(left.path, right.path));
}

export function buildSnapshotIndexEntry(entry: {
  readonly kind: SnapshotEntryKind;
  readonly packId: string;
  readonly packVersion: number;
  readonly path: string;
  readonly digest: string;
}): SnapshotIndexEntry {
  return strictParse(snapshotIndexEntrySchema, entry);
}

export function buildSnapshotIndex(entries: readonly SnapshotIndexEntry[]): SnapshotIndex {
  return strictParse(snapshotIndexSchema, {
    schemaVersion: 1,
    entries: sortSnapshotIndexEntries(entries),
  });
}

export function snapshotIndexBytes(entries: readonly SnapshotIndexEntry[]): string {
  return formatRecord(buildSnapshotIndex(entries));
}

export function snapshotIndexExists(repositoryRoot: string): boolean {
  return existsSync(snapshotIndexPath(repositoryRoot));
}

export function readSnapshotIndex(repositoryRoot: string): SnapshotIndex {
  return strictParse(
    snapshotIndexSchema,
    readJsonFile(snapshotIndexPath(repositoryRoot), "snapshot index"),
  );
}

/**
 * The canonical artifact-relative path for an artifact kind. Every producer and
 * every consumer resolves paths through this one mapping.
 */
export function canonicalArtifactPath(
  kind: SnapshotEntryKind,
  packId: string,
  packVersion: number,
): string {
  switch (kind) {
    case "bundle":
      return releaseBundleRelativePath(packId, packVersion);
    case "release-manifest":
      return releaseManifestRelativePath(packId, packVersion);
    case "retirement-notice":
      return retirementNoticeRelativePath(packId, packVersion);
  }
}

const maximumArtifactTreeDepth = 32;
const maximumArtifactFileBytes = 64 * 1024 * 1024;

export interface ArtifactFile {
  /** Repository-relative POSIX path, for example `bundles/example/1/bundle.json`. */
  readonly relativePath: string;
  readonly bytes: Buffer;
}

/**
 * Walks a directory and returns every regular file below it.
 *
 * Symlinks and other non-regular entries are refused rather than followed: an
 * artifact inventory that can point outside the artifact root cannot be compared
 * against a pinned Git tree.
 */
export function listRegularFiles(root: string): ArtifactFile[] {
  if (!existsSync(root)) {
    return [];
  }
  if (!lstatSync(root).isDirectory()) {
    throw new StrictValidationError([
      {
        path: [root],
        message: "the artifact root must be a real directory, not a file or a symbolic link",
      },
    ]);
  }
  const files: ArtifactFile[] = [];

  const walk = (directory: string, prefix: string, depth: number): void => {
    if (depth > maximumArtifactTreeDepth) {
      throw new StrictValidationError([
        {
          path: [prefix],
          message: `artifact inventory is nested deeper than ${maximumArtifactTreeDepth} levels`,
        },
      ]);
    }
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
    )) {
      const absolute = join(directory, entry.name);
      const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new StrictValidationError([
          {
            path: [relativePath],
            message: `artifact inventory must not contain symbolic links (found ${relativePath})`,
          },
        ]);
      }
      if (entry.isDirectory()) {
        walk(absolute, relativePath, depth + 1);
        continue;
      }
      if (!entry.isFile()) {
        throw new StrictValidationError([
          {
            path: [relativePath],
            message: `artifact inventory must contain regular files only (found ${relativePath})`,
          },
        ]);
      }
      if (statSync(absolute).size > maximumArtifactFileBytes) {
        throw new StrictValidationError([
          {
            path: [relativePath],
            message: `artifact file ${relativePath} exceeds ${maximumArtifactFileBytes} bytes`,
          },
        ]);
      }
      files.push({ relativePath, bytes: readFileSync(absolute) });
    }
  };

  walk(root, "", 1);
  return files.sort((left, right) => compareArtifactPaths(left.relativePath, right.relativePath));
}
