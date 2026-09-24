import { existsSync } from "node:fs";
import { contentDigest } from "../digest.js";
import { assertVersionScoped, deriveVersionLifecycleStatus } from "../lifecycle.js";
import {
  retirementNoticeSchema,
  retirementRecordSchema,
  snapshotIndexSchema,
  strictParse,
  StrictValidationError,
  type ProvenanceEvent,
  type ReviewAttestation,
  type RetirementRecord,
} from "../schemas/index.js";
import {
  digestFile,
  displayPath,
  formatRecord,
  loadPackState,
  loadVersionAttestations,
  packRetirementRecordPath,
  readJsonFile,
  releaseManifestPath,
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
  requirePackId,
  requireFlagString,
  successResult,
  type CommandOptions,
  type CommandResult,
} from "./args.js";

const usage = "Usage: pnpm content:status -- --pack <id> --version <n> [--json]";

const reviewEventTypes: ReadonlySet<ProvenanceEvent["type"]> = new Set([
  "founder-reviewed",
  "practitioner-reviewed",
  "localization-reviewed",
  "accessibility-reviewed",
  "sponsorship-disclosed",
  "changes-requested",
]);

function attestationBindsEvent(attestation: ReviewAttestation, event: ProvenanceEvent): boolean {
  if (attestation.actorId !== event.actorId || attestation.recordedAt !== event.recordedAt) {
    return false;
  }
  switch (event.type) {
    case "founder-reviewed":
      return (
        attestation.kind === "founder-review" &&
        attestation.outcome === "approved" &&
        attestation.reviewEventSequence === event.sequence
      );
    case "practitioner-reviewed":
      return (
        attestation.kind === "practitioner-review" &&
        attestation.outcome === "approved" &&
        attestation.reviewEventSequence === event.sequence
      );
    case "localization-reviewed":
      return attestation.kind === "localization-review" && attestation.outcome === "approved";
    case "accessibility-reviewed":
      return attestation.kind === "accessibility-review" && attestation.outcome === "approved";
    case "sponsorship-disclosed":
      return attestation.kind === "sponsorship-disclosure" && attestation.outcome === "approved";
    case "changes-requested":
      return (
        attestation.outcome === "changes-requested" &&
        (attestation.reviewEventSequence === undefined ||
          attestation.reviewEventSequence === event.sequence)
      );
    default:
      return false;
  }
}

export function runStatusCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      pack: { type: "string" },
      version: { type: "string" },
      json: { type: "boolean" },
    });
    const packId = requirePackId(values);
    const version = parsePositiveInteger(requireFlagString(values, "version"), "version");
    const jsonOutput = values["json"] === true;

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const state = loadPackState(repositoryRoot, packId);
    const source = requirePackSource(state, repositoryRoot, packId, version);
    const log = requireProvenanceLog(state, packId);
    const contentDigestHex = contentDigest(source);
    const scope = { packId, packVersion: version, contentDigest: contentDigestHex };
    const status = deriveVersionLifecycleStatus(log, version);

    const attestations = loadVersionAttestations(repositoryRoot, packId, version);
    for (const attestation of attestations) {
      assertVersionScoped(attestation, scope, "attestation");
      if (attestation.fixtureOnly !== source.fixtureOnly) {
        throw new StrictValidationError([
          {
            path: ["attestations"],
            message: `attestation ${attestation.kind} by ${attestation.actorId} declares fixtureOnly ${attestation.fixtureOnly} but the source declares fixtureOnly ${source.fixtureOnly}`,
          },
        ]);
      }
    }

    const remaining = [...attestations];
    for (const event of status.history) {
      if (!reviewEventTypes.has(event.type)) {
        continue;
      }
      const index = remaining.findIndex((attestation) => attestationBindsEvent(attestation, event));
      if (index === -1) {
        throw new StrictValidationError([
          {
            path: ["attestations"],
            message: `no review attestation binds ${event.type} event at sequence ${event.sequence} for ${packId} version ${version}; attestation files must match their provenance events`,
          },
        ]);
      }
      remaining.splice(index, 1);
    }
    for (const attestation of remaining) {
      throw new StrictValidationError([
        {
          path: ["attestations"],
          message: `attestation ${attestation.kind} (${attestation.outcome}) by ${attestation.actorId} does not bind any provenance event for ${packId} version ${version}`,
        },
      ]);
    }

    const recordPath = packRetirementRecordPath(repositoryRoot, packId, version);
    let retirement: RetirementRecord | undefined;
    if (existsSync(recordPath)) {
      retirement = strictParse(
        retirementRecordSchema,
        readJsonFile(recordPath, "retirement record"),
      );
      assertVersionScoped(retirement, scope, "retirement record");
      if (retirement.fixtureOnly !== source.fixtureOnly) {
        throw new StrictValidationError([
          {
            path: ["retirement", "fixtureOnly"],
            message: `retirement record for ${packId} version ${version} declares fixtureOnly ${retirement.fixtureOnly} but the source declares fixtureOnly ${source.fixtureOnly}`,
          },
        ]);
      }
    }

    const retiredEvent = status.history.find((event) => event.type === "retired");
    if (retiredEvent !== undefined) {
      if (retirement === undefined) {
        throw new StrictValidationError([
          {
            path: ["retirement"],
            message: `retired event at sequence ${retiredEvent.sequence} for ${packId} version ${version} has no retirement record; attribution cannot be verified`,
          },
        ]);
      }
      if (
        retirement.retirementEventSequence !== retiredEvent.sequence ||
        retirement.retirementEventDigest !== retiredEvent.eventDigest ||
        retirement.recordedAt !== retiredEvent.recordedAt ||
        retirement.actorId !== retiredEvent.actorId
      ) {
        throw new StrictValidationError([
          {
            path: ["retirement"],
            message: `retirement record for ${packId} version ${version} does not match the sealed retired event at sequence ${retiredEvent.sequence}`,
          },
        ]);
      }
    } else if (retirement !== undefined) {
      throw new StrictValidationError([
        {
          path: ["retirement"],
          message: `retirement record exists for ${packId} version ${version} but the provenance log has no retired event`,
        },
      ]);
    }

    const wasReleased = status.history.some((event) => event.type === "artifact-released");
    if (wasReleased && retiredEvent !== undefined) {
      const noticePath = retirementNoticePath(repositoryRoot, packId, version);
      if (!existsSync(noticePath)) {
        throw new StrictValidationError([
          {
            path: ["retirement", "notice"],
            message: `retired event for released ${packId} version ${version} has no retirement notice at ${displayPath(repositoryRoot, noticePath)}`,
          },
        ]);
      }
      const notice = strictParse(
        retirementNoticeSchema,
        readJsonFile(noticePath, "retirement notice"),
      );
      assertVersionScoped(notice, scope, "retirement notice");
      if (notice.retirementEventDigest !== retiredEvent.eventDigest) {
        throw new StrictValidationError([
          {
            path: ["retirement", "notice"],
            message: `retirement notice for ${packId} version ${version} does not bind the sealed retired event at sequence ${retiredEvent.sequence}`,
          },
        ]);
      }
      const manifestPath = releaseManifestPath(repositoryRoot, packId, version);
      if (!existsSync(manifestPath) || notice.releaseManifestDigest !== digestFile(manifestPath)) {
        throw new StrictValidationError([
          {
            path: ["retirement", "notice"],
            message: `retirement notice for ${packId} version ${version} does not bind the release manifest at ${displayPath(repositoryRoot, manifestPath)}`,
          },
        ]);
      }
      const indexPath = snapshotIndexPath(repositoryRoot);
      const index = strictParse(snapshotIndexSchema, readJsonFile(indexPath, "snapshot index"));
      const noticeRelativePath = retirementNoticeRelativePath(packId, version);
      const noticeEntry = index.entries.find(
        (entry) =>
          entry.kind === "retirement-notice" &&
          entry.packId === packId &&
          entry.packVersion === version,
      );
      if (
        noticeEntry === undefined ||
        noticeEntry.path !== noticeRelativePath ||
        noticeEntry.digest !== digestFile(noticePath)
      ) {
        throw new StrictValidationError([
          {
            path: ["retirement", "notice"],
            message: `snapshot index must contain the retirement-notice entry for ${packId} version ${version} at ${noticeRelativePath}`,
          },
        ]);
      }
    }

    if (jsonOutput) {
      const payload = {
        packId,
        packVersion: version,
        contentDigest: contentDigestHex,
        fixtureOnly: source.fixtureOnly,
        currentStatus: status.currentStatus,
        events: status.history.map((event) => ({
          sequence: event.sequence,
          type: event.type,
          actorId: event.actorId,
          recordedAt: event.recordedAt,
          eventDigest: event.eventDigest,
        })),
        attestations: attestations.map((attestation) => ({
          reviewEventSequence: attestation.reviewEventSequence ?? null,
          kind: attestation.kind,
          outcome: attestation.outcome,
          actorId: attestation.actorId,
          recordedAt: attestation.recordedAt,
        })),
        ...(retirement !== undefined
          ? {
              retirement: {
                actorId: retirement.actorId,
                reason: retirement.reason,
                recordedAt: retirement.recordedAt,
                retirementEventSequence: retirement.retirementEventSequence,
                retirementEventDigest: retirement.retirementEventDigest,
              },
            }
          : {}),
      };
      return successResult(formatRecord(payload));
    }

    const lines = [
      `pack: ${packId}`,
      `version: ${version}`,
      `status: ${status.currentStatus}`,
      `contentDigest: ${contentDigestHex}`,
      `fixtureOnly: ${source.fixtureOnly ? "true" : "false"}`,
      `events: ${status.history.length}`,
      `attestations: ${attestations.length}`,
      ...attestations.map(
        (attestation) =>
          `attestation: ${attestation.kind} ${attestation.outcome} by ${attestation.actorId} at sequence ${attestation.reviewEventSequence ?? "n/a"}`,
      ),
      ...(retirement !== undefined
        ? [`retired by ${retirement.actorId} at sequence ${retirement.retirementEventSequence}`]
        : []),
    ];
    return successResult(`${lines.join("\n")}\n`);
  } catch (error) {
    return failureResult(usage, error);
  }
}
