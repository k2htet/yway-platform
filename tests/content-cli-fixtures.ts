import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { stringify } from "yaml";
import {
  formatRecord,
  localizedContentSchema,
  localizedContentPath as repositoryLocalizedContentPath,
  packSourceSchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  strictParse,
  sha256Hex,
  type CommandResult,
  type LocalizedContent,
  type PackSource,
  type ProvenanceEventLog,
} from "../content/index.js";
import {
  releaseBundlePath as repositoryReleaseBundlePath,
  releaseManifestPath as repositoryReleaseManifestPath,
  retirementNoticePath as repositoryRetirementNoticePath,
  snapshotIndexPath as repositorySnapshotIndexPath,
} from "../content/store.js";

export const fixedNow = "2026-09-24T00:00:00Z";

export function commandClock(): string {
  return fixedNow;
}

const temporaryRoots: string[] = [];

after(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

export function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "yway-content-cli-"));
  temporaryRoots.push(root);
  return root;
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
    accessibility: {
      scope: "content",
      readingOrder: ["summary", "preview", "limitations", "exp-talk-to-worker"],
      media: [],
    },
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

export function localizedContentObject(
  pack: PackSource,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    packId: pack.id,
    packVersion: pack.version,
    locale: "my",
    fixtureOnly: pack.fixtureOnly,
    preview: {
      headline: "Synthetic Burmese preview headline",
      description: "Synthetic Burmese preview description.",
    },
    title: "Synthetic Burmese title",
    summary: "Synthetic Burmese summary for the fixture pack.",
    limitations: ["Synthetic Burmese limitation line."],
    experiments: pack.experiments,
    ...(pack.accessibility === undefined ? {} : { accessibility: pack.accessibility }),
    ...overrides,
  };
}

export function makeLocalizedContent(
  pack: PackSource,
  overrides: Record<string, unknown> = {},
): LocalizedContent {
  return strictParse(localizedContentSchema, localizedContentObject(pack, overrides));
}

export function writeLocalizedContent(repositoryRoot: string, localized: LocalizedContent): void {
  const path = repositoryLocalizedContentPath(
    repositoryRoot,
    localized.packId,
    localized.packVersion,
  );
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, stringify(localized), "utf8");
}

export function localizedContentPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return repositoryLocalizedContentPath(repositoryRoot, packId, version);
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

export function releaseBundlePath(repositoryRoot: string, packId: string, version: number): string {
  return repositoryReleaseBundlePath(repositoryRoot, packId, version);
}

export function releaseManifestPath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return repositoryReleaseManifestPath(repositoryRoot, packId, version);
}

export function retirementNoticePath(
  repositoryRoot: string,
  packId: string,
  version: number,
): string {
  return repositoryRetirementNoticePath(repositoryRoot, packId, version);
}

export function snapshotIndexPath(repositoryRoot: string): string {
  return repositorySnapshotIndexPath(repositoryRoot);
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

export interface ReviewSetupOptions {
  /** Authors a Pack carrying explicit synthetic sponsorship metadata. */
  readonly sponsored?: boolean;
  /** Drives every release-readiness review except sponsorship disclosure. */
  readonly omitSponsorshipReview?: boolean;
  readonly pack?: PackSource;
}

export interface ReleasedFixture {
  readonly root: string;
  readonly pack: PackSource;
  readonly version: number;
  readonly bundleBytes: string;
  readonly manifestBytes: string;
  readonly indexBytes: string;
  readonly bundleDigest: string;
  readonly manifestDigest: string;
  readonly releaseSequence: number;
}

export function commandOptions(root: string): { repositoryRoot: string; now: () => string } {
  return { repositoryRoot: root, now: commandClock };
}

export function releaseArgs(packId: string, version: number, actor = "fixture-operator-one") {
  return ["--pack", packId, "--version", String(version), "--actor", actor];
}

function packOverrides(sponsored: boolean): Record<string, unknown> {
  if (!sponsored) {
    return {};
  }
  return {
    sponsorship: {
      sponsorName: "Fixture Sponsor",
      disclosure: "This synthetic pack is sponsored by Fixture Sponsor.",
      editorialIndependence: "The sponsor has no editorial control over content or ordering.",
      editorialControl: "independent",
      orderingInfluence: "none",
    },
  };
}

/**
 * Drives a freshly registered Pack to the release-ready standing state using the
 * real repository commands: founder review, independent practitioner review,
 * fluent Burmese localization review, content accessibility review, and — for a
 * sponsored Pack — sponsorship disclosure review.
 */
export function driveToReleaseReady(root: string, options_: ReviewSetupOptions = {}): PackSource {
  const pack = options_.pack ?? makePack(packOverrides(options_.sponsored ?? false));
  const version = pack.version;
  writePackSource(root, pack);
  writeLocalizedContent(root, makeLocalizedContent(pack));
  expectExit(
    runNewVersionCommand(
      ["--pack", pack.id, "--actor", "fixture-author-one"],
      commandOptions(root),
    ),
    0,
  );
  writeEligibility(root, "fixture-practitioner-one");

  const approve = (args: string[]): void => {
    expectExit(runAttestCommand(args, commandOptions(root)), 0);
  };

  approve([
    "--pack",
    pack.id,
    "--version",
    String(version),
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
  ]);
  approve([
    "--pack",
    pack.id,
    "--version",
    String(version),
    "--kind",
    "practitioner-review",
    "--actor",
    "fixture-practitioner-one",
    "--outcome",
    "approved",
    "--six-part-confirmed",
    "true",
    "--exposure-before-commitment-confirmed",
    "true",
  ]);
  approve([
    "--pack",
    pack.id,
    "--version",
    String(version),
    "--kind",
    "localization-review",
    "--actor",
    "fixture-localizer-one",
    "--outcome",
    "approved",
    "--locale",
    "my",
    "--fluent-burmese-confirmed",
    "true",
    "--fluent-review-evidence",
    "fixture:fluent-review-001",
  ]);
  approve([
    "--pack",
    pack.id,
    "--version",
    String(version),
    "--kind",
    "accessibility-review",
    "--actor",
    "fixture-accessibility-reviewer-one",
    "--outcome",
    "approved",
    "--reading-order-confirmed",
    "true",
    "--media-alternatives-confirmed",
    "true",
    "--runtime-validation-deferred",
  ]);
  if (pack.sponsorship !== undefined && options_.omitSponsorshipReview !== true) {
    approve([
      "--pack",
      pack.id,
      "--version",
      String(version),
      "--kind",
      "sponsorship-disclosure",
      "--actor",
      "fixture-sponsorship-reviewer-one",
      "--outcome",
      "approved",
      "--disclosure-confirmed",
      "true",
      "--editorial-control-preserved",
      "true",
      "--ordering-influence",
      "none",
    ]);
  }
  return pack;
}

/** Produces real release-command output for a release-ready Pack. */
export function releaseFixturePack(
  root: string,
  options_: ReviewSetupOptions = {},
): ReleasedFixture {
  const pack = driveToReleaseReady(root, options_);
  const version = pack.version;
  expectExit(runReleaseCommand(releaseArgs(pack.id, version), commandOptions(root)), 0);
  const bundleBytes = readFileSync(releaseBundlePath(root, pack.id, version), "utf8");
  const manifestBytes = readFileSync(releaseManifestPath(root, pack.id, version), "utf8");
  const indexBytes = readFileSync(snapshotIndexPath(root), "utf8");
  const log = readProvenanceLog(root, pack.id);
  return {
    root,
    pack,
    version,
    bundleBytes,
    manifestBytes,
    indexBytes,
    bundleDigest: sha256Hex(bundleBytes),
    manifestDigest: sha256Hex(manifestBytes),
    releaseSequence: log.events[log.events.length - 1]!.sequence,
  };
}
