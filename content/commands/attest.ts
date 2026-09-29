import { existsSync } from "node:fs";
import { requireClassificationIsolation } from "../classification.js";
import { contentDigest } from "../digest.js";
import { appendProvenanceEvent } from "../provenance.js";
import {
  assertPolicyPractitionerEligibility,
  validateProposedPractitionerApproval,
} from "../practitioner-gate.js";
import { releasePolicyIdSchema, requireReleasePolicy } from "../release-policy.js";
import {
  StrictValidationError,
  attestationKindSchema,
  attestationOutcomeSchema,
  practitionerEligibilitySchema,
  reviewAttestationSchema,
  strictParse,
  type AttestationKind,
  type ProvenanceEventType,
} from "../schemas/index.js";
import {
  attestationPath,
  commitWrites,
  displayPath,
  eligibilityPath,
  formatRecord,
  loadPackState,
  loadVersionAttestations,
  provenanceLogPath,
  readJsonFile,
  requirePackSource,
  requireProvenanceLog,
  resolveRepositoryRoot,
} from "../store.js";
import {
  failureResult,
  optionalFlagString,
  parseBooleanString,
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
  "Usage: pnpm content:attest -- --pack <id> --version <n> --kind <kind> --actor <id> --outcome <approved|changes-requested> [--release-policy <ai-owner|human-assured> --policy-version 1 --policy-applicability <fixture-test|pilot> --authorization-scope pilot (real only)] [--reviewer-system <id> --review-criteria <id> --findings-reference <ref>] [--reviewer-relationship <independent|owner-fluent-self-review>] [kind-specific review flags]";

function requireKind(raw: string): AttestationKind {
  const parsed = attestationKindSchema.safeParse(raw);
  if (!parsed.success) {
    const allowed = attestationKindSchema.options.join(", ");
    throw new UsageError(`option "--kind" must be one of: ${allowed} (received "${raw}")`);
  }
  return parsed.data;
}

function requireOutcome(raw: string): "approved" | "changes-requested" {
  const parsed = attestationOutcomeSchema.safeParse(raw);
  if (!parsed.success) {
    const allowed = attestationOutcomeSchema.options.join(", ");
    throw new UsageError(`option "--outcome" must be one of: ${allowed} (received "${raw}")`);
  }
  return parsed.data;
}

function eventTypeFor(
  kind: AttestationKind,
  outcome: "approved" | "changes-requested",
): ProvenanceEventType {
  if (outcome === "changes-requested") {
    return "changes-requested";
  }
  switch (kind) {
    case "founder-review":
      return "founder-reviewed";
    case "ai-review":
      return "ai-reviewed";
    case "owner-approval":
      return "owner-approved";
    case "practitioner-review":
      return "practitioner-reviewed";
    case "localization-review":
      return "localization-reviewed";
    case "accessibility-review":
      return "accessibility-reviewed";
    case "sponsorship-disclosure":
      return "sponsorship-disclosed";
  }
}

export function runAttestCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      pack: { type: "string" },
      version: { type: "string" },
      kind: { type: "string" },
      actor: { type: "string" },
      outcome: { type: "string" },
      note: { type: "string" },
      locale: { type: "string" },
      "fluent-burmese-confirmed": { type: "string" },
      "fluent-review-evidence": { type: "string" },
      "reading-order-confirmed": { type: "string" },
      "media-alternatives-confirmed": { type: "string" },
      "runtime-validation-deferred": { type: "boolean" },
      "disclosure-confirmed": { type: "string" },
      "editorial-control-preserved": { type: "string" },
      "ordering-influence": { type: "string" },
      "six-part-confirmed": { type: "string" },
      "exposure-before-commitment-confirmed": { type: "string" },
      "reviewer-system": { type: "string" },
      "review-criteria": { type: "string" },
      "findings-reference": { type: "string" },
      "release-policy": { type: "string" },
      "policy-version": { type: "string" },
      "policy-applicability": { type: "string" },
      "authorization-scope": { type: "string" },
      "reviewer-relationship": { type: "string" },
    });

    const packId = requirePackId(values);
    const actorId = requireActorId(values);
    const version = parsePositiveInteger(requireFlagString(values, "version"), "version");
    const kind = requireKind(requireFlagString(values, "kind"));
    const outcome = requireOutcome(requireFlagString(values, "outcome"));
    const note = optionalFlagString(values, "note");
    const policyId = optionalFlagString(values, "release-policy");
    const policyVersion = optionalFlagString(values, "policy-version");
    const policyApplicability = optionalFlagString(values, "policy-applicability");
    const authorizationScope = optionalFlagString(values, "authorization-scope");
    if (
      kind !== "owner-approval" &&
      (policyId !== undefined ||
        policyVersion !== undefined ||
        policyApplicability !== undefined ||
        authorizationScope !== undefined)
    )
      throw new UsageError("policy and authorization scope flags belong only to owner-approval");
    if (
      kind !== "ai-review" &&
      (values["reviewer-system"] !== undefined ||
        values["review-criteria"] !== undefined ||
        values["findings-reference"] !== undefined)
    )
      throw new UsageError("AI reviewer flags belong only to ai-review");
    if (kind !== "localization-review" && values["reviewer-relationship"] !== undefined)
      throw new UsageError("--reviewer-relationship belongs only to localization-review");

    const requiresContentReview = kind === "founder-review" || kind === "practitioner-review";
    let contentReview:
      | { sixPartStructureConfirmed: boolean; exposureBeforeCommitmentConfirmed: boolean }
      | undefined;
    if (requiresContentReview) {
      const sixRaw = optionalFlagString(values, "six-part-confirmed");
      const exposureRaw = optionalFlagString(values, "exposure-before-commitment-confirmed");
      if (sixRaw === undefined || exposureRaw === undefined) {
        throw new UsageError(
          `--kind "${kind}" requires --six-part-confirmed <true|false> and --exposure-before-commitment-confirmed <true|false>`,
        );
      }
      contentReview = {
        sixPartStructureConfirmed: parseBooleanString(sixRaw, "six-part-confirmed"),
        exposureBeforeCommitmentConfirmed: parseBooleanString(
          exposureRaw,
          "exposure-before-commitment-confirmed",
        ),
      };
    } else if (
      values["six-part-confirmed"] !== undefined ||
      values["exposure-before-commitment-confirmed"] !== undefined
    ) {
      throw new UsageError(
        `--six-part-confirmed and --exposure-before-commitment-confirmed are only allowed with --kind founder-review or practitioner-review`,
      );
    }

    let locale: "my" | undefined;
    const localeRaw = optionalFlagString(values, "locale");
    if (kind === "localization-review") {
      if (localeRaw === undefined) {
        throw new UsageError(`--kind "localization-review" requires --locale my`);
      }
      if (localeRaw !== "my") {
        throw new UsageError(`option "--locale" must be "my" (received "${localeRaw}")`);
      }
      locale = "my";
    } else if (localeRaw !== undefined) {
      throw new UsageError(`--locale is only allowed with --kind localization-review`);
    }

    let localizationReview:
      | {
          fluentBurmeseConfirmed: boolean;
          fluentReviewEvidence: string;
          reviewerRelationship?: "independent" | "owner-fluent-self-review";
        }
      | undefined;
    const fluentRaw = optionalFlagString(values, "fluent-burmese-confirmed");
    const fluentEvidence = optionalFlagString(values, "fluent-review-evidence");
    if (kind === "localization-review") {
      if (outcome === "approved" && (fluentRaw === undefined || fluentEvidence === undefined)) {
        throw new UsageError(
          `approved --kind "localization-review" requires --fluent-burmese-confirmed <true|false> and --fluent-review-evidence <text>`,
        );
      }
      if ((fluentRaw === undefined) !== (fluentEvidence === undefined)) {
        throw new UsageError(
          `--fluent-burmese-confirmed and --fluent-review-evidence must be provided together`,
        );
      }
      if (fluentRaw !== undefined && fluentEvidence !== undefined) {
        localizationReview = {
          fluentBurmeseConfirmed: parseBooleanString(fluentRaw, "fluent-burmese-confirmed"),
          fluentReviewEvidence: fluentEvidence,
        };
        const relationship = optionalFlagString(values, "reviewer-relationship");
        if (relationship !== undefined) {
          if (relationship !== "independent" && relationship !== "owner-fluent-self-review")
            throw new UsageError(
              "--reviewer-relationship must be independent or owner-fluent-self-review",
            );
          localizationReview.reviewerRelationship = relationship;
        }
      }
    } else if (fluentRaw !== undefined || fluentEvidence !== undefined) {
      throw new UsageError(
        `--fluent-burmese-confirmed and --fluent-review-evidence are only allowed with --kind localization-review`,
      );
    }

    let accessibilityReview:
      | {
          readingOrderConfirmed: boolean;
          referencedMediaAlternativesConfirmed: boolean;
          runtimeValidationDeferred: boolean;
        }
      | undefined;
    const readingOrderRaw = optionalFlagString(values, "reading-order-confirmed");
    const mediaAlternativesRaw = optionalFlagString(values, "media-alternatives-confirmed");
    const runtimeDeferred = values["runtime-validation-deferred"];
    const hasAccessibilityFlags =
      readingOrderRaw !== undefined ||
      mediaAlternativesRaw !== undefined ||
      runtimeDeferred !== undefined;
    if (kind === "accessibility-review") {
      if (
        outcome === "approved" &&
        (readingOrderRaw === undefined ||
          mediaAlternativesRaw === undefined ||
          runtimeDeferred !== true)
      ) {
        throw new UsageError(
          `approved --kind "accessibility-review" requires --reading-order-confirmed <true|false>, --media-alternatives-confirmed <true|false>, and --runtime-validation-deferred`,
        );
      }
      if (
        (readingOrderRaw === undefined) !== (mediaAlternativesRaw === undefined) ||
        (readingOrderRaw !== undefined && runtimeDeferred === undefined) ||
        (mediaAlternativesRaw !== undefined && runtimeDeferred === undefined)
      ) {
        throw new UsageError(
          `--reading-order-confirmed, --media-alternatives-confirmed, and --runtime-validation-deferred must be provided together`,
        );
      }
      if (readingOrderRaw !== undefined && mediaAlternativesRaw !== undefined) {
        accessibilityReview = {
          readingOrderConfirmed: parseBooleanString(readingOrderRaw, "reading-order-confirmed"),
          referencedMediaAlternativesConfirmed: parseBooleanString(
            mediaAlternativesRaw,
            "media-alternatives-confirmed",
          ),
          runtimeValidationDeferred: runtimeDeferred as boolean,
        };
      }
    } else if (hasAccessibilityFlags) {
      throw new UsageError(
        `--reading-order-confirmed, --media-alternatives-confirmed, and --runtime-validation-deferred are only allowed with --kind accessibility-review`,
      );
    }

    let sponsorshipReview:
      | {
          disclosureConfirmed: boolean;
          editorialControlPreserved: boolean;
          orderingInfluence: "none";
        }
      | undefined;
    const disclosureRaw = optionalFlagString(values, "disclosure-confirmed");
    const editorialControlRaw = optionalFlagString(values, "editorial-control-preserved");
    const orderingInfluenceRaw = optionalFlagString(values, "ordering-influence");
    const hasSponsorshipFlags =
      disclosureRaw !== undefined ||
      editorialControlRaw !== undefined ||
      orderingInfluenceRaw !== undefined;
    if (kind === "sponsorship-disclosure") {
      if (
        outcome === "approved" &&
        (disclosureRaw === undefined ||
          editorialControlRaw === undefined ||
          orderingInfluenceRaw === undefined)
      ) {
        throw new UsageError(
          `approved --kind "sponsorship-disclosure" requires --disclosure-confirmed <true|false>, --editorial-control-preserved <true|false>, and --ordering-influence none`,
        );
      }
      if (
        (disclosureRaw === undefined) !== (editorialControlRaw === undefined) ||
        (disclosureRaw !== undefined) !== (orderingInfluenceRaw !== undefined)
      ) {
        throw new UsageError(
          `--disclosure-confirmed, --editorial-control-preserved, and --ordering-influence must be provided together`,
        );
      }
      if (orderingInfluenceRaw !== undefined && orderingInfluenceRaw !== "none") {
        throw new UsageError(`option "--ordering-influence" must be "none"`);
      }
      if (disclosureRaw !== undefined && editorialControlRaw !== undefined) {
        sponsorshipReview = {
          disclosureConfirmed: parseBooleanString(disclosureRaw, "disclosure-confirmed"),
          editorialControlPreserved: parseBooleanString(
            editorialControlRaw,
            "editorial-control-preserved",
          ),
          orderingInfluence: "none",
        };
      }
    } else if (hasSponsorshipFlags) {
      throw new UsageError(
        `--disclosure-confirmed, --editorial-control-preserved, and --ordering-influence are only allowed with --kind sponsorship-disclosure`,
      );
    }

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const recordedAt = (options.now ?? (() => new Date().toISOString()))();
    const state = loadPackState(repositoryRoot, packId);
    const source = requirePackSource(state, repositoryRoot, packId, version);
    requireClassificationIsolation(source, actorId);
    if (!source.fixtureOnly && note !== undefined) {
      throw new UsageError(
        `--note is not accepted for real content; a note is free text that no digest binds and it is excluded from the release boundary, so cite the owner-held private review record in its place`,
      );
    }
    const log = requireProvenanceLog(state, packId);
    const contentDigestHex = contentDigest(source);
    const localized = state.localizedContentByVersion.get(version);
    const localizedContentDigestHex =
      localized === undefined ? undefined : contentDigest(localized);
    const versionEvents = log.events.filter((event) => event.packVersion === version);
    const cycleBoundary =
      [...versionEvents].reverse().find((event) => event.type === "changes-requested")?.sequence ??
      0;
    const aiEvent = [...versionEvents]
      .reverse()
      .find((event) => event.type === "ai-reviewed" && event.sequence > cycleBoundary);
    const practitionerEvent = [...versionEvents]
      .reverse()
      .find((event) => event.type === "practitioner-reviewed" && event.sequence > cycleBoundary);
    const policy =
      kind === "owner-approval" && outcome === "approved"
        ? requireReleasePolicy(
            {
              id: releasePolicyIdSchema.parse(policyId),
              version: Number(policyVersion) as 1,
              applicability: policyApplicability as "fixture-test" | "pilot",
              ...(authorizationScope === undefined
                ? {}
                : { authorizationScope: authorizationScope as "pilot" }),
            },
            source.fixtureOnly,
          )
        : undefined;
    if (kind === "owner-approval" && outcome === "approved") {
      if (aiEvent === undefined || Date.parse(aiEvent.recordedAt) > Date.parse(recordedAt))
        throw new UsageError("owner approval requires completed AI review first");
      for (const requiredType of [
        "localization-reviewed",
        "accessibility-reviewed",
        ...(source.sponsorship === undefined ? [] : ["sponsorship-disclosed"]),
      ]) {
        const requiredEvent = [...versionEvents]
          .reverse()
          .find((event) => event.type === requiredType && event.sequence > cycleBoundary);
        if (
          requiredEvent === undefined ||
          Date.parse(requiredEvent.recordedAt) > Date.parse(recordedAt)
        )
          throw new UsageError(`owner approval requires completed ${requiredType} evidence first`);
      }
      const completedAI = loadVersionAttestations(repositoryRoot, packId, version).find(
        (candidate) =>
          candidate.kind === "ai-review" &&
          candidate.outcome === "approved" &&
          candidate.reviewEventSequence === aiEvent.sequence &&
          candidate.actorId === aiEvent.actorId &&
          candidate.recordedAt === aiEvent.recordedAt &&
          candidate.contentDigest === contentDigestHex &&
          candidate.localizedContentDigest === localizedContentDigestHex &&
          candidate.aiReview?.reviewCycle === cycleBoundary,
      );
      if (completedAI === undefined)
        throw new UsageError(
          "owner approval requires a completed AI review attestation bound to exact content and current cycle",
        );
      if (
        policy?.id === "human-assured" &&
        (practitionerEvent === undefined ||
          practitionerEvent.sequence <= aiEvent.sequence ||
          Date.parse(practitionerEvent.recordedAt) > Date.parse(recordedAt))
      )
        throw new UsageError(
          "human-assured owner approval requires valid practitioner review after AI review",
        );
      if (policy?.id === "human-assured" && practitionerEvent !== undefined) {
        if (localizedContentDigestHex === undefined)
          throw new UsageError("human-assured practitioner review requires Burmese localization");
        const approvedPractitioner = loadVersionAttestations(repositoryRoot, packId, version).find(
          (candidate) =>
            candidate.kind === "practitioner-review" &&
            candidate.reviewEventSequence === practitionerEvent.sequence,
        );
        if (approvedPractitioner === undefined)
          throw new UsageError(
            "human-assured owner approval requires a bound practitioner attestation",
          );
        const practitionerEligibility = strictParse(
          practitionerEligibilitySchema,
          readJsonFile(
            eligibilityPath(repositoryRoot, practitionerEvent.actorId),
            "practitioner eligibility",
          ),
        );
        assertPolicyPractitionerEligibility({
          pack: source,
          attestation: approvedPractitioner,
          eligibility: practitionerEligibility,
          authoredActorId: versionEvents.find((event) => event.type === "authored")!.actorId,
          evaluateAt: recordedAt,
          localizedContentDigest: localizedContentDigestHex,
        });
      }
    }
    if (
      kind === "ai-review" &&
      outcome === "approved" &&
      (localized === undefined ||
        !optionalFlagString(values, "reviewer-system") ||
        !optionalFlagString(values, "review-criteria") ||
        !optionalFlagString(values, "findings-reference"))
    )
      throw new UsageError(
        "completed AI review requires localization, --reviewer-system, --review-criteria, and --findings-reference",
      );
    if (kind === "localization-review" && localizationReview !== undefined) {
      const authors = versionEvents
        .filter((event) => event.type === "authored" || event.type === "localized")
        .map((event) => event.actorId);
      const selfReview = authors.includes(actorId);
      if (localizationReview.reviewerRelationship === undefined)
        localizationReview.reviewerRelationship = selfReview
          ? "owner-fluent-self-review"
          : "independent";
      if (selfReview && localizationReview.reviewerRelationship !== "owner-fluent-self-review")
        throw new UsageError(
          "author or translator Burmese review must be labelled owner-fluent-self-review",
        );
      if (!selfReview && localizationReview.reviewerRelationship === "owner-fluent-self-review")
        throw new UsageError(
          "owner-fluent-self-review requires the same recorded author or translator actor",
        );
    }
    if (
      localized === undefined &&
      (kind === "localization-review" ||
        (outcome === "approved" &&
          (kind === "accessibility-review" || kind === "sponsorship-disclosure")))
    ) {
      throw new StrictValidationError([
        {
          path: ["localizedContent"],
          message: `Burmese localization is required before recording ${kind} for ${packId} version ${version}`,
        },
      ]);
    }
    if (
      kind === "accessibility-review" &&
      outcome === "approved" &&
      source.accessibility === undefined
    ) {
      throw new StrictValidationError([
        {
          path: ["accessibility"],
          message: `authored content accessibility metadata is required before accessibility approval for ${packId} version ${version}`,
        },
      ]);
    }
    if (
      kind === "sponsorship-disclosure" &&
      outcome === "approved" &&
      source.sponsorship === undefined
    ) {
      throw new StrictValidationError([
        {
          path: ["sponsorship"],
          message: `sponsorship disclosure review is only applicable to a sponsored pack (${packId} version ${version} has no sponsorship)`,
        },
      ]);
    }

    if (versionEvents.length === 0) {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `pack "${packId}" version ${version} is not registered; run content:new-version before recording attestations`,
        },
      ]);
    }

    const lastEvent = log.events[log.events.length - 1]!;
    const nextSequence = lastEvent.sequence + 1;
    const targetPath = attestationPath(repositoryRoot, packId, version, nextSequence, kind);
    if (existsSync(targetPath)) {
      throw new StrictValidationError([
        {
          path: [],
          message: `refusing to overwrite existing file ${displayPath(repositoryRoot, targetPath)}`,
        },
      ]);
    }

    const attestation = strictParse(reviewAttestationSchema, {
      schemaVersion: 1,
      packId,
      packVersion: version,
      contentDigest: contentDigestHex,
      kind,
      outcome,
      actorId,
      fixtureOnly: source.fixtureOnly,
      recordedAt,
      reviewEventSequence: nextSequence,
      ...(requiresContentReview ? { contentReview } : {}),
      ...(kind === "ai-review" && outcome === "approved"
        ? {
            aiReview: {
              reviewerSystem: optionalFlagString(values, "reviewer-system"),
              criteria: optionalFlagString(values, "review-criteria"),
              findingsReference: optionalFlagString(values, "findings-reference"),
              reviewCycle: cycleBoundary,
            },
          }
        : {}),
      ...(policy === undefined || outcome !== "approved"
        ? {}
        : { ownerApproval: { releasePolicy: policy, reviewCycle: cycleBoundary } }),
      ...(locale !== undefined ? { locale } : {}),
      ...(localizedContentDigestHex === undefined
        ? {}
        : { localizedContentDigest: localizedContentDigestHex }),
      ...(localizationReview !== undefined ? { localizationReview } : {}),
      ...(accessibilityReview !== undefined ? { accessibilityReview } : {}),
      ...(sponsorshipReview !== undefined ? { sponsorshipReview } : {}),
      ...(note !== undefined ? { note } : {}),
    });

    if (kind === "practitioner-review" && outcome === "approved") {
      const eligibility = strictParse(
        practitionerEligibilitySchema,
        readJsonFile(eligibilityPath(repositoryRoot, actorId), "practitioner eligibility"),
      );
      const founderCheckpoint = [...versionEvents]
        .reverse()
        .find((event) => event.type === "founder-reviewed");
      if (founderCheckpoint === undefined && aiEvent === undefined) {
        throw new StrictValidationError([
          {
            path: ["kind"],
            message: `founder review must be recorded and approved before a practitioner approval for ${packId} version ${version}`,
          },
        ]);
      }
      const founderAttestation = loadVersionAttestations(repositoryRoot, packId, version).find(
        (candidate) =>
          candidate.kind === "founder-review" &&
          candidate.reviewEventSequence === founderCheckpoint?.sequence,
      );
      if (founderAttestation === undefined && aiEvent === undefined) {
        throw new StrictValidationError([
          {
            path: ["kind"],
            message: `no founder-review attestation binds provenance sequence ${founderCheckpoint?.sequence ?? "missing"}; record the founder attestation before the practitioner approval`,
          },
        ]);
      }
      if (aiEvent === undefined && founderAttestation !== undefined)
        validateProposedPractitionerApproval({
          pack: source,
          provenanceLog: log,
          founderAttestation,
          practitionerAttestation: attestation,
          eligibility,
          evaluateAt: recordedAt,
        });
      else {
        if (localizedContentDigestHex === undefined)
          throw new UsageError("policy-aware practitioner review requires Burmese localization");
        assertPolicyPractitionerEligibility({
          pack: source,
          attestation,
          eligibility,
          authoredActorId: versionEvents.find((event) => event.type === "authored")!.actorId,
          evaluateAt: recordedAt,
          localizedContentDigest: localizedContentDigestHex,
        });
      }
    }

    const nextLog = appendProvenanceEvent(log, {
      packId,
      packVersion: version,
      type: eventTypeFor(kind, outcome),
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: contentDigestHex,
      ...(localizedContentDigestHex === undefined
        ? {}
        : { localizedContentDigest: localizedContentDigestHex }),
      ...(policy === undefined || outcome !== "approved" ? {} : { releasePolicy: policy }),
      recordedAt,
    });

    commitWrites(
      repositoryRoot,
      (transaction) => {
        transaction.replace(provenanceLogPath(repositoryRoot, packId), formatRecord(nextLog));
        transaction.createExclusive(targetPath, formatRecord(attestation));
      },
      options.onBeforeWrite,
    );

    const head = nextLog.events[nextLog.events.length - 1]!;
    return successResult(
      `PASS  recorded ${kind} ${outcome} for ${packId} version ${version} at sequence ${head.sequence} (actor ${actorId})`,
    );
  } catch (error) {
    return failureResult(usage, error);
  }
}
