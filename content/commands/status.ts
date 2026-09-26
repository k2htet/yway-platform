import { contentDigest } from "../digest.js";
import { verifyVersionGovernance } from "../governance.js";
import { formatRecord, resolveRepositoryRoot } from "../store.js";
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
    const verified = verifyVersionGovernance(repositoryRoot, packId, version);
    const {
      attestations,
      contentDigest: contentDigestHex,
      localizedContent,
      retirement,
      source,
      status,
    } = verified;

    if (jsonOutput) {
      const payload = {
        packId,
        packVersion: version,
        contentDigest: contentDigestHex,
        fixtureOnly: source.fixtureOnly,
        ...(localizedContent === undefined
          ? {}
          : {
              localizedContent: {
                locale: localizedContent.locale,
                contentDigest: contentDigest(localizedContent),
              },
            }),
        currentStatus: status.currentStatus,
        events: status.history.map((event) => ({
          sequence: event.sequence,
          type: event.type,
          actorId: event.actorId,
          recordedAt: event.recordedAt,
          eventDigest: event.eventDigest,
          ...(event.localizedContentDigest === undefined
            ? {}
            : { localizedContentDigest: event.localizedContentDigest }),
        })),
        attestations: attestations.map((attestation) => ({
          reviewEventSequence: attestation.reviewEventSequence ?? null,
          kind: attestation.kind,
          outcome: attestation.outcome,
          actorId: attestation.actorId,
          recordedAt: attestation.recordedAt,
          ...(attestation.localizedContentDigest === undefined
            ? {}
            : { localizedContentDigest: attestation.localizedContentDigest }),
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
