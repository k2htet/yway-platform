import { z } from "zod";
import {
  sha256DigestSchema,
  dateTimeSchema,
  fixtureOnlySchema,
  packIdSchema,
  relativeArtifactPathSchema,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

export const releaseGatesSchema = z
  .object({
    founderApproved: z.literal(true),
    practitionerApproved: z.literal(true),
    localizationApproved: z.literal(true),
    accessibilityApproved: z.literal(true),
    sponsorship: z.enum(["disclosed", "not-applicable"]),
    localizedContentDigest: sha256DigestSchema.optional(),
    runtimeAccessibilityDeferred: z.literal(true).optional(),
    targetUserComprehensionDeferred: z.literal(true).optional(),
  })
  .strict();

export const releaseGateResultSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    scope: z
      .object({
        packId: packIdSchema,
        packVersion: versionSchema,
        contentDigest: sha256DigestSchema,
      })
      .strict(),
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    localizedContentDigest: sha256DigestSchema,
    fixtureOnly: z.literal(true),
    founderApproved: z.literal(true),
    practitionerApproved: z.literal(true),
    localizationApproved: z.literal(true),
    accessibilityApproved: z.literal(true),
    sponsorship: z.enum(["disclosed", "not-applicable"]),
    runtimeAccessibilityDeferred: z.literal(true),
    targetUserComprehensionDeferred: z.literal(true),
  })
  .strict();

export const releaseManifestSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    fixtureOnly: fixtureOnlySchema,
    classification: z.enum(["fixture", "production"]),
    releasedAt: dateTimeSchema,
    bundle: z
      .object({
        path: relativeArtifactPathSchema,
        digest: sha256DigestSchema,
      })
      .strict(),
    gates: releaseGatesSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.fixtureOnly && value.classification !== "fixture") {
      context.addIssue({
        code: "custom",
        path: ["classification"],
        message: "fixtureOnly records must not be classified as production (fixture isolation)",
      });
    }
  });

export type ReleaseGateResult = z.infer<typeof releaseGateResultSchema>;
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
