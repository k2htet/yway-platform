import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "./canonical.js";
import { contentDigest, sha256Hex } from "./digest.js";
import { verifyProvenanceLog } from "./provenance.js";
import {
  StrictValidationError,
  assertUniquePackVersions,
  packSourceSchema,
  parseStrictYaml,
  reviewAttestationSchema,
  strictParse,
  type PackSource,
  type ProvenanceEventLog,
  type ReviewAttestation,
} from "./schemas/index.js";

export const defaultRepositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export const packDirectory = "content/packs";
export const eligibilityDirectory = "content/eligibility";
export const artifactRootDirectory = "artifacts";
export const snapshotIndexRelativePath = "snapshot-index.json";

export function packSourcePath(repositoryRoot: string, packId: string, version: number): string {
  return join(repositoryRoot, packDirectory, packId, `${version}.yaml`);
}

export function provenanceLogPath(repositoryRoot: string, packId: string): string {
  return join(repositoryRoot, packDirectory, packId, "provenance.json");
}

export function attestationPath(
  repositoryRoot: string,
  packId: string,
  version: number,
  sequence: number,
  kind: string,
): string {
  return join(
    repositoryRoot,
    packDirectory,
    packId,
    "attestations",
    String(version),
    `${sequence}-${kind}.json`,
  );
}

export function packRetirementRecordPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(repositoryRoot, packDirectory, packId, "retirements", `${version}.json`);
}

export function eligibilityPath(repositoryRoot: string, actorId: string): string {
  return join(repositoryRoot, eligibilityDirectory, `${actorId}.json`);
}

export function releaseManifestPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(
    repositoryRoot,
    artifactRootDirectory,
    "manifests",
    packId,
    String(version),
    "manifest.json",
  );
}

export function retirementNoticePath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(repositoryRoot, artifactRootDirectory, "retirements", packId, `${version}.json`);
}

export function snapshotIndexPath(repositoryRoot: string): string {
  return join(repositoryRoot, artifactRootDirectory, snapshotIndexRelativePath);
}

export function retirementNoticeRelativePath(packId: string, version: number): string {
  return `retirements/${packId}/${version}.json`;
}

export function displayPath(repositoryRoot: string, path: string): string {
  const rel = relative(repositoryRoot, path);
  return rel === "" || rel.startsWith("..") ? path : rel.split(sep).join("/");
}

export function formatRecord(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalJson(value)) as unknown, null, 2)}\n`;
}

function missingFileError(path: string, label: string): StrictValidationError {
  return new StrictValidationError([{ path: [], message: `${label} not found at ${path}` }]);
}

export function readTextFile(path: string, label: string): string {
  if (!existsSync(path)) {
    throw missingFileError(path, label);
  }
  return readFileSync(path, "utf8");
}

export function readJsonFile(path: string, label: string): unknown {
  const text = readTextFile(path, label);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StrictValidationError([
      { path: [], message: `${label} at ${path} is not valid JSON: ${message}` },
    ]);
  }
}

export function digestFile(path: string): string {
  return sha256Hex(readFileSync(path));
}

let atomicCounter = 0;

function writeFileAtomicSync(path: string, bytes: string): void {
  mkdirSync(dirname(path), { recursive: true });
  atomicCounter += 1;
  const temporaryPath = `${path}.tmp-${process.pid}-${atomicCounter}`;
  try {
    writeFileSync(temporaryPath, bytes, "utf8");
    renameSync(temporaryPath, path);
  } catch (error) {
    try {
      if (existsSync(temporaryPath)) {
        unlinkSync(temporaryPath);
      }
    } catch {
      // Preserve the original write failure.
    }
    throw error;
  }
}

export class WriteTransaction {
  private readonly repositoryRoot: string;
  private readonly undos: { path: string; previous: string | null }[] = [];
  private readonly onBeforeWrite: ((path: string) => void) | undefined;

  constructor(repositoryRoot: string, onBeforeWrite?: (path: string) => void) {
    this.repositoryRoot = repositoryRoot;
    this.onBeforeWrite = onBeforeWrite;
  }

  createExclusive(path: string, bytes: string): void {
    this.onBeforeWrite?.(path);
    mkdirSync(dirname(path), { recursive: true });
    try {
      writeFileSync(path, bytes, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        throw new StrictValidationError([
          {
            path: [],
            message: `refusing to overwrite existing file ${displayPath(this.repositoryRoot, path)}`,
          },
        ]);
      }
      try {
        if (existsSync(path)) {
          unlinkSync(path);
        }
      } catch {
        // Best-effort cleanup of a partial exclusive write; preserve the original failure.
      }
      throw error;
    }
    this.undos.push({ path, previous: null });
  }

  replace(path: string, bytes: string): void {
    this.onBeforeWrite?.(path);
    const previous = existsSync(path) ? readFileSync(path, "utf8") : null;
    writeFileAtomicSync(path, bytes);
    this.undos.push({ path, previous });
  }

  rollback(): void {
    for (const undo of [...this.undos].reverse()) {
      try {
        if (undo.previous === null) {
          if (existsSync(undo.path)) {
            unlinkSync(undo.path);
          }
        } else {
          writeFileAtomicSync(undo.path, undo.previous);
        }
      } catch {
        // Rollback is best effort; the original failure is rethrown by the caller.
      }
    }
    this.undos.length = 0;
  }
}

export function commitWrites(
  repositoryRoot: string,
  run: (transaction: WriteTransaction) => void,
  onBeforeWrite?: (path: string) => void,
): void {
  const transaction = new WriteTransaction(repositoryRoot, onBeforeWrite);
  try {
    run(transaction);
  } catch (error) {
    transaction.rollback();
    throw error;
  }
}

export function requireFixtureIsolation(
  source: { readonly id: string; readonly version: number; readonly fixtureOnly: boolean },
  actorId?: string,
): void {
  if (!source.fixtureOnly) {
    throw new StrictValidationError([
      {
        path: ["fixtureOnly"],
        message: `pack "${source.id}" version ${source.version} is not fixture-only; Stage 2 repository commands accept only fixture-only content (fixture isolation)`,
      },
    ]);
  }
  if (actorId !== undefined && !actorId.startsWith("fixture-")) {
    throw new StrictValidationError([
      {
        path: ["actorId"],
        message: `actor "${actorId}" must be a fixture- identity for fixture-only pack "${source.id}" (synthetic actor identities only)`,
      },
    ]);
  }
}

export interface PackState {
  readonly sources: readonly PackSource[];
  readonly sourceByVersion: ReadonlyMap<number, PackSource>;
  readonly provenanceLog: ProvenanceEventLog | undefined;
}

function listPackSourceVersions(packRoot: string): number[] {
  if (!existsSync(packRoot)) {
    return [];
  }
  const versions: number[] = [];
  for (const entry of readdirSync(packRoot)) {
    if (!entry.endsWith(".yaml")) {
      continue;
    }
    const stem = entry.slice(0, -".yaml".length);
    if (/^[1-9][0-9]*$/.test(stem)) {
      versions.push(Number(stem));
    }
  }
  return versions.sort((left, right) => left - right);
}

export function loadPackState(repositoryRoot: string, packId: string): PackState {
  const packRoot = join(repositoryRoot, packDirectory, packId);
  const sources: PackSource[] = [];
  for (const version of listPackSourceVersions(packRoot)) {
    const path = packSourcePath(repositoryRoot, packId, version);
    const source = parseStrictYaml(packSourceSchema, readFileSync(path, "utf8"));
    if (source.id !== packId) {
      throw new StrictValidationError([
        {
          path: ["id"],
          message: `source file ${displayPath(repositoryRoot, path)} declares pack id "${source.id}" but was loaded for "${packId}"`,
        },
      ]);
    }
    if (source.version !== version) {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `source file ${displayPath(repositoryRoot, path)} declares version ${source.version}; the file name and version field must match`,
        },
      ]);
    }
    sources.push(source);
  }
  assertUniquePackVersions(sources);
  const sourceByVersion = new Map(sources.map((source) => [source.version, source]));

  const logPath = provenanceLogPath(repositoryRoot, packId);
  let provenanceLog: ProvenanceEventLog | undefined;
  if (existsSync(logPath)) {
    const expectedContentDigests: Record<number, string> = {};
    for (const source of sources) {
      expectedContentDigests[source.version] = contentDigest(source);
    }
    provenanceLog = verifyProvenanceLog(readJsonFile(logPath, "provenance log"), {
      expectedContentDigests,
    });
    for (const [index, event] of provenanceLog.events.entries()) {
      const source = sourceByVersion.get(event.packVersion);
      if (source === undefined) {
        throw new StrictValidationError([
          {
            path: ["events"],
            message: `provenance log for pack "${packId}" references version ${event.packVersion}, but ${displayPath(repositoryRoot, packSourcePath(repositoryRoot, packId, event.packVersion))} is missing`,
          },
        ]);
      }
      if (event.fixtureOnly !== source.fixtureOnly) {
        throw new StrictValidationError([
          {
            path: ["events", index, "fixtureOnly"],
            message: `provenance event at sequence ${event.sequence} declares fixtureOnly ${event.fixtureOnly} but the source declares fixtureOnly ${source.fixtureOnly}`,
          },
        ]);
      }
      if (source.fixtureOnly && !event.actorId.startsWith("fixture-")) {
        throw new StrictValidationError([
          {
            path: ["events", index, "actorId"],
            message: `provenance event at sequence ${event.sequence} for fixture-only pack "${packId}" must use a fixture- actor identity`,
          },
        ]);
      }
    }
  }

  return { sources, sourceByVersion, provenanceLog };
}

export function requirePackSource(
  state: PackState,
  repositoryRoot: string,
  packId: string,
  version: number,
): PackSource {
  const source = state.sourceByVersion.get(version);
  if (source === undefined) {
    throw missingFileError(
      displayPath(repositoryRoot, packSourcePath(repositoryRoot, packId, version)),
      `pack source for ${packId} version ${version}`,
    );
  }
  return source;
}

export function requireProvenanceLog(state: PackState, packId: string): ProvenanceEventLog {
  if (state.provenanceLog === undefined) {
    throw new StrictValidationError([
      {
        path: ["events"],
        message: `pack "${packId}" has no provenance log; register the first version with content:new-version`,
      },
    ]);
  }
  return state.provenanceLog;
}

export function listAttestationPaths(
  repositoryRoot: string,
  packId: string,
  version: number,
): string[] {
  const directory = join(repositoryRoot, packDirectory, packId, "attestations", String(version));
  if (!existsSync(directory)) {
    return [];
  }
  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => join(directory, entry))
    .sort();
}

export function loadVersionAttestations(
  repositoryRoot: string,
  packId: string,
  version: number,
): ReviewAttestation[] {
  return listAttestationPaths(repositoryRoot, packId, version).map((path) =>
    strictParse(reviewAttestationSchema, readJsonFile(path, "review attestation")),
  );
}

export function resolveRepositoryRoot(explicit?: string): string {
  return resolve(explicit ?? defaultRepositoryRoot);
}
