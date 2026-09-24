import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { stringify } from "yaml";
import {
  appendProvenanceEvent,
  contentDigest,
  formatRecord,
  packSourceSchema,
  strictParse,
  sha256Hex,
  type CommandResult,
  type PackSource,
  type ProvenanceEventLog,
} from "../content/index.js";

export const fixedNow = "2026-09-24T00:00:00Z";

export function commandClock(): string {
  return fixedNow;
}

export function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), "yway-content-cli-"));
}

export function packSourceObject(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "fixture-local-guide",
    version: 1,
    fixtureOnly: true,
    canonicalLanguage: "en-simple",
    aiAssisted: true,
    title: "Try being a local guide",
    summary: "A clearly synthetic pack for exercising the Stage 2 content pipeline.",
    occupations: ["local-guide"],
    preview: {
      headline: "Try a short guide trial",
      description: "Talk to one local guide about a normal working day.",
    },
    limitations: ["This synthetic pack does not replace real workplace experience."],
    experiments: [
      {
        id: "exp-talk-to-worker",
        title: "Talk to a local worker",
        question: "What is it really like to do this work day to day?",
        action: "Interview one person who already does this job.",
        timebox: "45 minutes this week",
        whatToNotice: "Which parts of the work felt energizing or draining.",
        reflection: "Write three sentences about what you noticed.",
        nextFork: "Shadow the same role for half a day before any course or application.",
      },
    ],
    authoredAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

export function makePack(overrides: Record<string, unknown> = {}): PackSource {
  return strictParse(packSourceSchema, packSourceObject(overrides));
}

export function writePackSource(repositoryRoot: string, pack: PackSource): void {
  const directory = join(repositoryRoot, "content", "packs", pack.id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${pack.version}.yaml`), stringify(pack), "utf8");
}

export function packSourcePath(repositoryRoot: string, packId: string, version: number): string {
  return join(repositoryRoot, "content", "packs", packId, `${version}.yaml`);
}

export function provenancePath(repositoryRoot: string, packId: string): string {
  return join(repositoryRoot, "content", "packs", packId, "provenance.json");
}

export function readProvenanceLog(repositoryRoot: string, packId: string): ProvenanceEventLog {
  return JSON.parse(
    readFileSync(provenancePath(repositoryRoot, packId), "utf8"),
  ) as ProvenanceEventLog;
}

export function writeProvenanceLog(
  repositoryRoot: string,
  packId: string,
  log: ProvenanceEventLog,
): void {
  writeFileSync(provenancePath(repositoryRoot, packId), formatRecord(log), "utf8");
}

export function writeEligibility(
  repositoryRoot: string,
  actorId: string,
  overrides: Record<string, unknown> = {},
): void {
  const record = {
    schemaVersion: 1,
    actorId,
    fixtureOnly: true,
    occupations: ["local-guide"],
    status: "active",
    verification: { method: "manual", status: "verified", verifiedOn: "2026-09-01" },
    validFrom: "2026-01-01",
    validUntil: "2031-12-31",
    evidenceReferences: ["fixture:qualification-note"],
    ...overrides,
  };
  const directory = join(repositoryRoot, "content", "eligibility");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${actorId}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export function attestationFilePath(
  repositoryRoot: string,
  packId: string,
  version: number,
  sequence: number,
  kind: string,
): string {
  return join(
    repositoryRoot,
    "content",
    "packs",
    packId,
    "attestations",
    String(version),
    `${sequence}-${kind}.json`,
  );
}

export function retirementRecordPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(repositoryRoot, "content", "packs", packId, "retirements", `${version}.json`);
}

export function releaseManifestPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(repositoryRoot, "artifacts", "manifests", packId, String(version), "manifest.json");
}

export function retirementNoticePath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return join(repositoryRoot, "artifacts", "retirements", packId, `${version}.json`);
}

export function snapshotIndexPath(repositoryRoot: string): string {
  return join(repositoryRoot, "artifacts", "snapshot-index.json");
}

export function driveToReleased(repositoryRoot: string, pack: PackSource): ProvenanceEventLog {
  let log = readProvenanceLog(repositoryRoot, pack.id);
  const digest = contentDigest(pack);
  for (const type of [
    "founder-reviewed",
    "practitioner-reviewed",
    "artifact-eligible",
    "artifact-released",
  ] as const) {
    const actorId =
      type === "founder-reviewed"
        ? "fixture-founder-one"
        : type === "practitioner-reviewed"
          ? "fixture-practitioner-one"
          : "fixture-operator-one";
    log = appendProvenanceEvent(log, {
      packId: pack.id,
      packVersion: pack.version,
      type,
      actorId,
      fixtureOnly: pack.fixtureOnly,
      contentDigest: digest,
      recordedAt: fixedNow,
    });
    if (type === "founder-reviewed" || type === "practitioner-reviewed") {
      const event = log.events[log.events.length - 1]!;
      const kind = type === "founder-reviewed" ? "founder-review" : "practitioner-review";
      const path = attestationFilePath(repositoryRoot, pack.id, pack.version, event.sequence, kind);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(
        path,
        formatRecord({
          schemaVersion: 1,
          packId: pack.id,
          packVersion: pack.version,
          contentDigest: digest,
          kind,
          outcome: "approved",
          actorId,
          fixtureOnly: pack.fixtureOnly,
          recordedAt: fixedNow,
          reviewEventSequence: event.sequence,
          contentReview: {
            sixPartStructureConfirmed: true,
            exposureBeforeCommitmentConfirmed: true,
          },
        }),
        "utf8",
      );
    }
  }
  writeProvenanceLog(repositoryRoot, pack.id, log);
  return log;
}

export interface ReleaseArtifacts {
  readonly bundleBytes: string;
  readonly manifestBytes: string;
  readonly indexBytes: string;
  readonly manifestDigest: string;
}

export function writeReleaseArtifacts(repositoryRoot: string, pack: PackSource): ReleaseArtifacts {
  const digest = contentDigest(pack);
  const bundlePath = join(
    repositoryRoot,
    "artifacts",
    "bundles",
    pack.id,
    String(pack.version),
    "bundle.json",
  );
  const bundleBytes = formatRecord({
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: digest,
  });
  mkdirSync(join(repositoryRoot, "artifacts", "bundles", pack.id, String(pack.version)), {
    recursive: true,
  });
  writeFileSync(bundlePath, bundleBytes, "utf8");
  const bundleDigest = sha256Hex(bundleBytes);

  const manifestBytes = formatRecord({
    schemaVersion: 1,
    packId: pack.id,
    packVersion: pack.version,
    contentDigest: digest,
    fixtureOnly: pack.fixtureOnly,
    classification: pack.fixtureOnly ? "fixture" : "production",
    releasedAt: fixedNow,
    bundle: {
      path: `bundles/${pack.id}/${pack.version}/bundle.json`,
      digest: bundleDigest,
    },
    gates: {
      founderApproved: true,
      practitionerApproved: true,
      localizationApproved: true,
      accessibilityApproved: true,
      sponsorship: pack.sponsorship === undefined ? "not-applicable" : "disclosed",
    },
  });
  const manifestPath = releaseManifestPath(repositoryRoot, pack.id, pack.version);
  mkdirSync(join(manifestPath, ".."), { recursive: true });
  writeFileSync(manifestPath, manifestBytes, "utf8");
  const manifestDigest = sha256Hex(manifestBytes);

  const indexBytes = formatRecord({
    schemaVersion: 1,
    entries: [
      {
        kind: "bundle",
        packId: pack.id,
        packVersion: pack.version,
        path: `bundles/${pack.id}/${pack.version}/bundle.json`,
        digest: bundleDigest,
      },
      {
        kind: "release-manifest",
        packId: pack.id,
        packVersion: pack.version,
        path: `manifests/${pack.id}/${pack.version}/manifest.json`,
        digest: manifestDigest,
      },
    ],
  });
  mkdirSync(join(repositoryRoot, "artifacts"), { recursive: true });
  writeFileSync(snapshotIndexPath(repositoryRoot), indexBytes, "utf8");

  return { bundleBytes, manifestBytes, indexBytes, manifestDigest };
}

export function expectExit(result: CommandResult, exitCode: 0 | 1 | 2): CommandResult {
  if (result.exitCode !== exitCode) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`expected exit ${exitCode}, received ${result.exitCode}\n${detail}`);
  }
  return result;
}

export function expectFailureMessage(result: CommandResult, fragment: string): void {
  const stderr = result.stderr ?? "";
  if (!stderr.includes(fragment)) {
    throw new Error(`expected stderr to include "${fragment}", received:\n${stderr}`);
  }
}
