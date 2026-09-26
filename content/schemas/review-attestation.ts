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

export const localizationReviewConfirmationSchema = z
  .object({
    fluentBurmeseConfirmed: z.boolean(),
    fluentReviewEvidence: z.string().max(128).regex(/\S/, "must not be blank"),
  })
  .strict();

export const accessibilityReviewConfirmationSchema = z
  .object({
    readingOrderConfirmed: z.boolean(),
    referencedMediaAlternativesConfirmed: z.boolean(),
    runtimeValidationDeferred: z.literal(true),
  })
  .strict();

export const sponsorshipReviewConfirmationSchema = z
  .object({
    disclosureConfirmed: z.boolean(),
    editorialControlPreserved: z.boolean(),
    orderingInfluence: z.literal("none"),
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
    localizedContentDigest: sha256DigestSchema.optional(),
    contentReview: contentReviewConfirmationSchema.optional(),
    localizationReview: localizationReviewConfirmationSchema.optional(),
    accessibilityReview: accessibilityReviewConfirmationSchema.optional(),
    sponsorshipReview: sponsorshipReviewConfirmationSchema.optional(),
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
    if (value.reviewEventSequence === undefined) {
      context.addIssue({
        code: "custom",
        path: ["reviewEventSequence"],
        message: `${value.kind} attestations require reviewEventSequence binding the attestation to its provenance review event`,
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

    const isLocalizationReview = value.kind === "localization-review";
    const isAccessibilityReview = value.kind === "accessibility-review";
    const isSponsorshipReview = value.kind === "sponsorship-disclosure";
    const approved = value.outcome === "approved";

    if (isLocalizationReview && value.localizedContentDigest === undefined) {
      context.addIssue({
        code: "custom",
        path: ["localizedContentDigest"],
        message: "localization-review attestations require the exact localized content digest",
      });
    }
    if (approved && isLocalizationReview && value.localizationReview === undefined) {
      context.addIssue({
        code: "custom",
        path: ["localizationReview"],
        message: "approved localization-review attestations require fluent Burmese review evidence",
      });
    }
    if (!isLocalizationReview && value.localizationReview !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["localizationReview"],
        message: `localizationReview is not allowed for ${value.kind} attestations`,
      });
    }
    if (
      approved &&
      isLocalizationReview &&
      value.localizationReview !== undefined &&
      !value.localizationReview.fluentBurmeseConfirmed
    ) {
      context.addIssue({
        code: "custom",
        path: ["localizationReview", "fluentBurmeseConfirmed"],
        message: "approved localization-review attestations must confirm fluent Burmese review",
      });
    }
    if (
      value.fixtureOnly &&
      isLocalizationReview &&
      value.localizationReview !== undefined &&
      !/^fixture:[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value.localizationReview.fluentReviewEvidence)
    ) {
      context.addIssue({
        code: "custom",
        path: ["localizationReview", "fluentReviewEvidence"],
        message:
          "fixtureOnly localization-review evidence must use a fixture: reference (synthetic evidence only)",
      });
    }

    if (approved && isAccessibilityReview && value.accessibilityReview === undefined) {
      context.addIssue({
        code: "custom",
        path: ["accessibilityReview"],
        message:
          "approved accessibility-review attestations require content reading-order and media-alternative confirmations",
      });
    }
    if (!isAccessibilityReview && value.accessibilityReview !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["accessibilityReview"],
        message: `accessibilityReview is not allowed for ${value.kind} attestations`,
      });
    }
    if (
      approved &&
      isAccessibilityReview &&
      value.accessibilityReview !== undefined &&
      (!value.accessibilityReview.readingOrderConfirmed ||
        !value.accessibilityReview.referencedMediaAlternativesConfirmed)
    ) {
      context.addIssue({
        code: "custom",
        path: ["accessibilityReview"],
        message:
          "approved accessibility-review attestations must confirm reading order and alternatives/transcripts for referenced media",
      });
    }

    if (approved && isSponsorshipReview && value.sponsorshipReview === undefined) {
      context.addIssue({
        code: "custom",
        path: ["sponsorshipReview"],
        message:
          "approved sponsorship-disclosure attestations require disclosure and editorial-independence confirmations",
      });
    }
    if (!isSponsorshipReview && value.sponsorshipReview !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["sponsorshipReview"],
        message: `sponsorshipReview is not allowed for ${value.kind} attestations`,
      });
    }
    if (
      approved &&
      isSponsorshipReview &&
      value.sponsorshipReview !== undefined &&
      (!value.sponsorshipReview.disclosureConfirmed ||
        !value.sponsorshipReview.editorialControlPreserved)
    ) {
      context.addIssue({
        code: "custom",
        path: ["sponsorshipReview"],
        message:
          "approved sponsorship-disclosure attestations must confirm disclosure and preserve editorial control",
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
