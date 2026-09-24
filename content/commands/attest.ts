import { existsSync } from "node:fs";
import { contentDigest } from "../digest.js";
import { appendProvenanceEvent } from "../provenance.js";
import { validateProposedPractitionerApproval } from "../practitioner-gate.js";
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
  requireFixtureIsolation,
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
  "Usage: pnpm content:attest -- --pack <id> --version <n> --kind <kind> --actor <id> --outcome <approved|changes-requested> [--note <text>] [--locale my] [--six-part-confirmed <true|false>] [--exposure-before-commitment-confirmed <true|false>]";

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
      "six-part-confirmed": { type: "string" },
      "exposure-before-commitment-confirmed": { type: "string" },
    });

    const packId = requirePackId(values);
    const actorId = requireActorId(values);
    const version = parsePositiveInteger(requireFlagString(values, "version"), "version");
    const kind = requireKind(requireFlagString(values, "kind"));
    const outcome = requireOutcome(requireFlagString(values, "outcome"));
    const note = optionalFlagString(values, "note");

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

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const recordedAt = (options.now ?? (() => new Date().toISOString()))();
    const state = loadPackState(repositoryRoot, packId);
    const source = requirePackSource(state, repositoryRoot, packId, version);
    requireFixtureIsolation(source);
    const log = requireProvenanceLog(state, packId);
    const contentDigestHex = contentDigest(source);

    const versionEvents = log.events.filter((event) => event.packVersion === version);
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
      ...(requiresContentReview ? { reviewEventSequence: nextSequence, contentReview } : {}),
      ...(locale !== undefined ? { locale } : {}),
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
      if (founderCheckpoint === undefined) {
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
          candidate.reviewEventSequence === founderCheckpoint.sequence,
      );
      if (founderAttestation === undefined) {
        throw new StrictValidationError([
          {
            path: ["kind"],
            message: `no founder-review attestation binds provenance sequence ${founderCheckpoint.sequence}; record the founder attestation before the practitioner approval`,
          },
        ]);
      }
      validateProposedPractitionerApproval({
        pack: source,
        provenanceLog: log,
        founderAttestation,
        practitionerAttestation: attestation,
        eligibility,
        evaluateAt: recordedAt,
      });
    }

    const nextLog = appendProvenanceEvent(log, {
      packId,
      packVersion: version,
      type: eventTypeFor(kind, outcome),
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: contentDigestHex,
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
