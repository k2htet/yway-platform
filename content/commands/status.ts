import { contentClassification } from "../classification.js";
import { contentDigest } from "../digest.js";
import { verifyVersionGovernance } from "../governance.js";
import { evaluateReleaseGates } from "../release-gates.js";
import {
  practitionerEligibilitySchema,
  strictParse,
  type StrictValidationIssue,
} from "../schemas/index.js";
import { eligibilityPath, readJsonFile } from "../store.js";
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
      releaseManifest,
      retirement,
      source,
      status,
      provenanceLog,
    } = verified;
    const classification = contentClassification(source.fixtureOnly);
    const reviewCycleBoundary =
      [...status.history].reverse().find((event) => event.type === "changes-requested")?.sequence ??
      0;
    const currentCycleEvents = status.history.filter(
      (event) => event.sequence > reviewCycleBoundary,
    );
    const ownerAttestation = [...attestations]
      .reverse()
      .find(
        (attestation) =>
          attestation.kind === "owner-approval" &&
          attestation.outcome === "approved" &&
          (attestation.reviewEventSequence ?? 0) > reviewCycleBoundary,
      );
    const policy = ownerAttestation?.ownerApproval?.releasePolicy;
    const practitionerEvent = [...currentCycleEvents]
      .reverse()
      .find((event) => event.type === "practitioner-reviewed");
    const practitionerEligibility =
      practitionerEvent === undefined
        ? undefined
        : strictParse(
            practitionerEligibilitySchema,
            readJsonFile(
              eligibilityPath(repositoryRoot, practitionerEvent.actorId),
              "practitioner eligibility",
            ),
          );
    const localizationReview = [...attestations]
      .reverse()
      .find(
        (attestation) =>
          attestation.kind === "localization-review" &&
          attestation.outcome === "approved" &&
          (attestation.reviewEventSequence ?? 0) > reviewCycleBoundary,
      );
    const aiCompleted = currentCycleEvents.some((event) => event.type === "ai-reviewed");
    const ownerCompleted = currentCycleEvents.some((event) => event.type === "owner-approved");
    let blockedReasons: string[] = [];
    if (status.currentStatus === "retired") blockedReasons = ["version is retired"];
    else if (status.currentStatus === "artifact-released")
      blockedReasons = ["version is already released"];
    else if (policy === undefined)
      blockedReasons = ["release policy and owner approval are missing"];
    else {
      try {
        evaluateReleaseGates({
          pack: source,
          localizedContent,
          provenanceLog,
          attestations,
          practitionerEligibility,
          releasePolicy: policy,
          evaluateAt: (options.now ?? (() => new Date().toISOString()))(),
        });
      } catch (error) {
        blockedReasons =
          error instanceof Error && "issues" in error
            ? (error.issues as StrictValidationIssue[]).map((issue) => issue.message)
            : [String(error)];
      }
    }
    const reviewSummary = {
      releasePolicy:
        policy === undefined
          ? "not selected"
          : `${policy.id}@${policy.version} (${policy.applicability})`,
      aiReview: aiCompleted ? "completed" : "missing",
      ownerApproval: ownerCompleted ? "completed" : "missing",
      practitionerReview:
        practitionerEvent === undefined
          ? policy?.id === "human-assured"
            ? "required"
            : "absent"
          : "completed",
      burmeseReview:
        localizationReview?.localizationReview?.reviewerRelationship === "owner-fluent-self-review"
          ? "owner self-review"
          : localizationReview === undefined
            ? "missing"
            : "independent review",
      releaseEligibility: blockedReasons.length === 0 ? "eligible" : "blocked",
      blockedReasons,
    };

    if (jsonOutput) {
      const payload = {
        packId,
        packVersion: version,
        contentDigest: contentDigestHex,
        fixtureOnly: source.fixtureOnly,
        classification,
        reviewSummary,
        // An owner act, not a machine-verified property: the value is recorded here,
        // and nothing in the repository checks that the owner meant it.
        ...(releaseManifest?.authorizationScope === undefined
          ? {}
          : { releaseAuthorizationScope: releaseManifest.authorizationScope }),
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
      `classification: ${classification}`,
      `release policy: ${reviewSummary.releasePolicy}`,
      `AI review: ${reviewSummary.aiReview}`,
      `owner approval: ${reviewSummary.ownerApproval}`,
      `practitioner review: ${reviewSummary.practitionerReview}`,
      `Burmese review: ${reviewSummary.burmeseReview}`,
      `release eligibility: ${reviewSummary.releaseEligibility}`,
      ...reviewSummary.blockedReasons.map((reason) => `blocked: ${reason}`),
      ...(releaseManifest?.authorizationScope === undefined
        ? []
        : [
            `release authorization scope: ${releaseManifest.authorizationScope} (owner-granted, not machine-verified)`,
          ]),
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
