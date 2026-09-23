import { z } from "zod";
import {
  actorIdSchema,
  dateTimeSchema,
  sha256DigestSchema,
  fixtureOnlySchema,
  localeSchema,
  nonBlankStringSchema,
  packIdSchema,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

export const attestationKindSchema = z.enum([
  "founder-review",
  "practitioner-review",
  "localization-review",
  "accessibility-review",
  "sponsorship-disclosure",
]);

export const attestationOutcomeSchema = z.enum(["approved", "changes-requested"]);

export const contentReviewConfirmationSchema = z
  .object({
    sixPartStructureConfirmed: z.boolean(),
    exposureBeforeCommitmentConfirmed: z.boolean(),
  })
  .strict();

export const reviewAttestationSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    kind: attestationKindSchema,
    outcome: attestationOutcomeSchema,
    actorId: actorIdSchema,
    fixtureOnly: fixtureOnlySchema,
    recordedAt: dateTimeSchema,
    reviewEventSequence: z.number().int().positive().optional(),
    locale: localeSchema.optional(),
    contentReview: contentReviewConfirmationSchema.optional(),
    note: nonBlankStringSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const requiresLocale = value.kind === "localization-review";
    const requiresContentReview =
      value.kind === "founder-review" || value.kind === "practitioner-review";
    const requiresReviewEventSequence =
      value.kind === "founder-review" || value.kind === "practitioner-review";

    if (requiresLocale && value.locale === undefined) {
      context.addIssue({
        code: "custom",
        path: ["locale"],
        message: "localization-review attestations require locale",
      });
    }
    if (!requiresLocale && value.locale !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["locale"],
        message: `locale is not allowed for ${value.kind} attestations`,
      });
    }
    if (requiresReviewEventSequence && value.reviewEventSequence === undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewEventSequence"],
        message: `${value.kind} attestations require reviewEventSequence binding the attestation to its provenance review event`,
      });
    }
    if (!requiresReviewEventSequence && value.reviewEventSequence !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewEventSequence"],
        message: `reviewEventSequence is not allowed for ${value.kind} attestations`,
      });
    }
    if (requiresContentReview && value.contentReview === undefined) {
      context.addIssue({
        code: "custom",
        path: ["contentReview"],
        message: `${value.kind} attestations require contentReview confirming six-part structure and exposure before commitment`,
      });
    }
    if (!requiresContentReview && value.contentReview !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["contentReview"],
        message: `contentReview is not allowed for ${value.kind} attestations`,
      });
    }
    if (
      requiresContentReview &&
      value.outcome === "approved" &&
      value.contentReview !== undefined &&
      (!value.contentReview.sixPartStructureConfirmed ||
        !value.contentReview.exposureBeforeCommitmentConfirmed)
    ) {
      context.addIssue({
        code: "custom",
        path: ["contentReview"],
        message:
          "approved founder/practitioner attestations must confirm both six-part structure and exposure before commitment",
      });
    }
    if (value.fixtureOnly && !value.actorId.startsWith("fixture-")) {
      context.addIssue({
        code: "custom",
        path: ["actorId"],
        message:
          "fixtureOnly attestation actorId must be a fixture- identity (synthetic actor identities only)",
      });
    }
  });

export type ReviewAttestation = z.infer<typeof reviewAttestationSchema>;
export type AttestationKind = z.infer<typeof attestationKindSchema>;
