import { z } from "zod";
import {
  actorClassificationIssue,
  attestationNoteIssue,
  evidenceReferenceClassificationIssue,
  opaqueReferencePattern,
} from "../classification.js";
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

/**
 * The fluency confirmation a localization reviewer records.
 *
 * `fluentReviewEvidence` is excluded from the artifact boundary and bound by no
 * digest, so for real content it must be an opaque reference to the owner-held
 * record rather than free text: a real reviewer's name, workplace, or contact route
 * must not be committable here. The class forbids whitespace, `@`, `.`, `/`, and
 * non-Latin script; it does not forbid a transliterated name, so owner issuance
 * remains the control. Fixture content keeps synthetic prose.
 */
const fluentReviewEvidenceSchema = z.string().max(128).regex(/\S/, "must not be blank");

export const localizationReviewConfirmationSchema = z
  .object({
    fluentBurmeseConfirmed: z.boolean(),
    fluentReviewEvidence: fluentReviewEvidenceSchema,
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
    if (isLocalizationReview && value.localizationReview !== undefined) {
      const evidenceIssue = evidenceReferenceClassificationIssue(
        value.fixtureOnly,
        value.localizationReview.fluentReviewEvidence,
        ["localizationReview", "fluentReviewEvidence"],
        "localization-review evidence",
      );
      if (evidenceIssue !== undefined) {
        context.addIssue({
          code: "custom",
          path: [...evidenceIssue.path],
          message: evidenceIssue.message,
        });
      }
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

    const actorIssue = actorClassificationIssue(value.fixtureOnly, value.actorId, ["actorId"]);
    if (actorIssue !== undefined) {
      context.addIssue({ code: "custom", path: [...actorIssue.path], message: actorIssue.message });
    }
    if (
      !value.fixtureOnly &&
      value.localizationReview !== undefined &&
      !opaqueReferencePattern.test(value.localizationReview.fluentReviewEvidence)
    ) {
      context.addIssue({
        code: "custom",
        path: ["localizationReview", "fluentReviewEvidence"],
        message:
          "real-content localization-review evidence must be an opaque non-sensitive reference to the owner-held review record; it is excluded from the artifact boundary and bound by no digest, so it must not carry a name, a workplace, a contact route, or a document path",
      });
    }
    const noteIssue = attestationNoteIssue(value.fixtureOnly, value.note);
    if (noteIssue !== undefined) {
      context.addIssue({ code: "custom", path: [...noteIssue.path], message: noteIssue.message });
    }
  });

export type ReviewAttestation = z.infer<typeof reviewAttestationSchema>;
export type AttestationKind = z.infer<typeof attestationKindSchema>;
