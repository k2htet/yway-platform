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
    locale: localeSchema.optional(),
    contentReview: contentReviewConfirmationSchema.optional(),
    note: nonBlankStringSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const requiresLocale = value.kind === "localization-review";
    const requiresContentReview =
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
  });

export type ReviewAttestation = z.infer<typeof reviewAttestationSchema>;
export type AttestationKind = z.infer<typeof attestationKindSchema>;
