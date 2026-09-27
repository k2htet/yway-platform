import { contentDigest, sha256Hex } from "./digest.js";
import { releaseGateManifestFields } from "./release-gates.js";
import { buildSnapshotIndexEntry, canonicalArtifactPath } from "./snapshot-index.js";
import { formatRecord } from "./store.js";
import {
  StrictValidationError,
  releaseBundleSchema,
  releaseManifestSchema,
  strictParse,
  type LocalizedContent,
  type PackSource,
  type ProvenanceEvent,
  type ProvenanceEventLog,
  type ReleaseBundle,
  type ReleaseGateResult,
  type ReleaseManifest,
  type SnapshotIndexEntry,
} from "./schemas/index.js";

export interface ReleaseArtifactInput {
  /** The already-validated canonical Pack source for the released version. */
  readonly pack: PackSource;
  /** The already-validated Burmese localization for the released version. */
  readonly localizedContent: LocalizedContent;
  /** The release-gate result evaluated at the release timestamp. */
  readonly gates: ReleaseGateResult;
  /** The sealed `artifact-released` event for the released version. */
  readonly releaseEvent: ProvenanceEvent;
  /** The Pack provenance log, truncated to end at `releaseEvent`. */
  readonly provenancePrefix: ProvenanceEventLog;
}

export interface ReleaseArtifactSet {
  readonly bundle: ReleaseBundle;
  readonly bundleBytes: string;
  readonly bundleDigest: string;
  readonly bundleRelativePath: string;
  readonly manifest: ReleaseManifest;
  readonly manifestBytes: string;
  readonly manifestDigest: string;
  readonly manifestRelativePath: string;
  readonly indexEntries: readonly [SnapshotIndexEntry, SnapshotIndexEntry];
}

/**
 * Truncates a Pack provenance log to the prefix that ends at `event`.
 *
 * Rebuilding a historical release must never read the current clock or include
 * later provenance events, so every artifact is generated from a sealed prefix.
 */
export function provenancePrefixThrough(
  log: ProvenanceEventLog,
  event: ProvenanceEvent,
): ProvenanceEventLog {
  const index = log.events.findIndex((candidate) => candidate.sequence === event.sequence);
  if (index === -1) {
    throw new StrictValidationError([
      {
        path: ["provenance", "events"],
        message: `release event at sequence ${event.sequence} is not present in provenance log "${log.packId}"`,
      },
    ]);
  }
  return {
    schemaVersion: log.schemaVersion,
    packId: log.packId,
    events: log.events.slice(0, index + 1),
  };
}

/**
 * Builds the byte-deterministic release bundle, manifest, and index entries.
 *
 * This function is pure: it receives validated content, gate results, and the
 * sealed release provenance prefix, and never touches the filesystem or a clock.
 */
export function buildReleaseArtifacts(input: ReleaseArtifactInput): ReleaseArtifactSet {
  const pack = input.pack;
  const releaseEvent = input.releaseEvent;
  if (releaseEvent.packId !== pack.id) {
    throw new StrictValidationError([
      {
        path: ["releaseEvent", "packId"],
        message: `release event packId "${releaseEvent.packId}" does not match pack "${pack.id}"`,
      },
    ]);
  }
  if (releaseEvent.packVersion !== pack.version) {
    throw new StrictValidationError([
      {
        path: ["releaseEvent", "packVersion"],
        message: `release event packVersion ${releaseEvent.packVersion} does not match pack version ${pack.version}`,
      },
    ]);
  }
  if (releaseEvent.type !== "artifact-released") {
    throw new StrictValidationError([
      {
        path: ["releaseEvent", "type"],
        message: `release artifacts require an "artifact-released" event (received "${releaseEvent.type}")`,
      },
    ]);
  }
  const prefixHead = input.provenancePrefix.events[input.provenancePrefix.events.length - 1];
  if (prefixHead === undefined || prefixHead.eventDigest !== releaseEvent.eventDigest) {
    throw new StrictValidationError([
      {
        path: ["provenancePrefix", "events"],
        message: `provenance prefix must end at the sealed release event (sequence ${releaseEvent.sequence})`,
      },
    ]);
  }

  const sourceDigest = contentDigest(pack);
  const localizedDigest = contentDigest(input.localizedContent);
  const packId = pack.id;
  const version = pack.version;

  const bundle = strictParse(releaseBundleSchema, {
    schemaVersion: 1,
    packId,
    packVersion: version,
    contentDigest: sourceDigest,
    localizedContentDigest: localizedDigest,
    fixtureOnly: true,
    classification: "fixture",
    releasedAt: releaseEvent.recordedAt,
    pack,
    localizedContent: input.localizedContent,
    provenance: input.provenancePrefix,
  });
  const bundleBytes = formatRecord(bundle);
  const bundleDigest = sha256Hex(bundleBytes);
  const bundleRelativePath = canonicalArtifactPath("bundle", packId, version);

  const manifest = strictParse(releaseManifestSchema, {
    schemaVersion: 1,
    packId,
    packVersion: version,
    contentDigest: sourceDigest,
    fixtureOnly: true,
    classification: "fixture",
    releasedAt: releaseEvent.recordedAt,
    bundle: { path: bundleRelativePath, digest: bundleDigest },
    gates: releaseGateManifestFields(input.gates),
  });
  const manifestBytes = formatRecord(manifest);
  const manifestDigest = sha256Hex(manifestBytes);
  const manifestRelativePath = canonicalArtifactPath("release-manifest", packId, version);

  return {
    bundle,
    bundleBytes,
    bundleDigest,
    bundleRelativePath,
    manifest,
    manifestBytes,
    manifestDigest,
    manifestRelativePath,
    indexEntries: [
      buildSnapshotIndexEntry({
        kind: "bundle",
        packId,
        packVersion: version,
        path: bundleRelativePath,
        digest: bundleDigest,
      }),
      buildSnapshotIndexEntry({
        kind: "release-manifest",
        packId,
        packVersion: version,
        path: manifestRelativePath,
        digest: manifestDigest,
      }),
    ],
  };
}

export interface BundleBinding {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
  readonly localizedContentDigest: string;
  readonly classification: "fixture" | "production";
  readonly bundleDigest: string;
  readonly bundleRelativePath: string;
  readonly manifestDigest: string;
}

/**
 * Re-derives the digest bindings of a bundle/manifest pair using only artifact
 * bytes. This is what lets an artifact-only consumer validate a snapshot without
 * reading any authoring source.
 */
export function assertBundleBindings(input: {
  readonly bundle: ReleaseBundle;
  readonly bundleRelativePath: string;
  readonly bundleDigest: string;
  readonly manifest: ReleaseManifest;
  readonly manifestRelativePath: string;
  readonly manifestDigest: string;
}): BundleBinding {
  const { bundle, manifest } = input;
  const issues: { path: readonly (string | number)[]; message: string }[] = [];

  if (bundle.packId !== manifest.packId || bundle.packVersion !== manifest.packVersion) {
    issues.push({
      path: ["packId"],
      message: `release manifest ${manifest.packId}@${manifest.packVersion} does not match bundle ${bundle.packId}@${bundle.packVersion}`,
    });
  }
  if (bundle.contentDigest !== manifest.contentDigest) {
    issues.push({
      path: ["contentDigest"],
      message: `release manifest contentDigest ${manifest.contentDigest} does not match bundle contentDigest ${bundle.contentDigest}`,
    });
  }
  if (bundle.fixtureOnly !== manifest.fixtureOnly) {
    issues.push({
      path: ["fixtureOnly"],
      message: `release manifest fixtureOnly ${manifest.fixtureOnly} does not match bundle fixtureOnly ${bundle.fixtureOnly} (fixture isolation must match)`,
    });
  }
  if (bundle.releasedAt !== manifest.releasedAt) {
    issues.push({
      path: ["releasedAt"],
      message: `release manifest releasedAt ${manifest.releasedAt} does not match bundle releasedAt ${bundle.releasedAt}`,
    });
  }
  if (manifest.classification !== "fixture") {
    issues.push({
      path: ["classification"],
      message: `Stage 2 release artifacts must be classified as "fixture" (received "${manifest.classification}")`,
    });
  }
  if (manifest.bundle.path !== input.bundleRelativePath) {
    issues.push({
      path: ["bundle", "path"],
      message: `release manifest bundle path ${manifest.bundle.path} does not match the snapshot entry path ${input.bundleRelativePath}`,
    });
  }
  if (
    input.bundleRelativePath !== canonicalArtifactPath("bundle", bundle.packId, bundle.packVersion)
  ) {
    issues.push({
      path: ["bundle", "path"],
      message: `release bundle was read from ${input.bundleRelativePath}, not the canonical path for ${bundle.packId} version ${bundle.packVersion}`,
    });
  }
  if (
    input.manifestRelativePath !==
    canonicalArtifactPath("release-manifest", manifest.packId, manifest.packVersion)
  ) {
    issues.push({
      path: ["path"],
      message: `release manifest was read from ${input.manifestRelativePath}, not the canonical path for ${manifest.packId} version ${manifest.packVersion}`,
    });
  }
  if (manifest.bundle.digest !== input.bundleDigest) {
    issues.push({
      path: ["bundle", "digest"],
      message: `release manifest bundle digest does not match the bundle file digest ${input.bundleDigest}`,
    });
  }
  if (manifest.gates.localizedContentDigest !== bundle.localizedContentDigest) {
    issues.push({
      path: ["gates", "localizedContentDigest"],
      message: `release manifest localized digest does not match the bundle localized digest ${bundle.localizedContentDigest}`,
    });
  }
  if (manifest.gates.runtimeAccessibilityDeferred !== true) {
    issues.push({
      path: ["gates", "runtimeAccessibilityDeferred"],
      message:
        "release manifest must state that runtime/device accessibility validation is deferred",
    });
  }
  if (manifest.gates.targetUserComprehensionDeferred !== true) {
    issues.push({
      path: ["gates", "targetUserComprehensionDeferred"],
      message: "release manifest must state that target-user comprehension validation is deferred",
    });
  }

  const derivedSourceDigest = contentDigest(bundle.pack);
  if (derivedSourceDigest !== bundle.contentDigest) {
    issues.push({
      path: ["contentDigest"],
      message: `bundle contentDigest ${bundle.contentDigest} does not match its embedded Pack digest ${derivedSourceDigest}`,
    });
  }
  const derivedLocalizedDigest = contentDigest(bundle.localizedContent);
  if (derivedLocalizedDigest !== bundle.localizedContentDigest) {
    issues.push({
      path: ["localizedContentDigest"],
      message: `bundle localizedContentDigest ${bundle.localizedContentDigest} does not match its embedded localized content digest ${derivedLocalizedDigest}`,
    });
  }
  if (bundle.provenance.packId !== bundle.packId) {
    issues.push({
      path: ["provenance", "packId"],
      message: `bundle provenance packId "${bundle.provenance.packId}" does not match bundle packId "${bundle.packId}"`,
    });
  }

  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }

  return {
    packId: bundle.packId,
    packVersion: bundle.packVersion,
    contentDigest: bundle.contentDigest,
    localizedContentDigest: bundle.localizedContentDigest,
    classification: manifest.classification,
    bundleDigest: input.bundleDigest,
    bundleRelativePath: input.bundleRelativePath,
    manifestDigest: input.manifestDigest,
  };
}
