import { z } from "zod";
import {
  authorizationScopeIssue,
  contentClassification,
  contentClassificationSchema,
  releaseAuthorizationScopeSchema,
} from "../classification.js";
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

/**
 * The evaluated release gates for one exact version scope.
 *
 * The result represents either classification. For fixture content it is
 * unchanged from Stage 2, so an existing fixture evaluation is still reproduced
 * exactly; the classification itself is derived from the validated source at the
 * artifact boundary rather than restated here.
 */
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
    fixtureOnly: fixtureOnlySchema,
    founderApproved: z.literal(true),
    practitionerApproved: z.literal(true),
    localizationApproved: z.literal(true),
    accessibilityApproved: z.literal(true),
    sponsorship: z.enum(["disclosed", "not-applicable"]),
    runtimeAccessibilityDeferred: z.literal(true),
    targetUserComprehensionDeferred: z.literal(true),
  })
  .strict();

/**
 * The release manifest binds the bundle, the recorded gates, and the owner-granted
 * authorization scope for one immutable version.
 *
 * `classification` is derived from the validated source and says nothing about
 * where the content may be shown. `authorizationScope` is that separate statement;
 * only `pilot` exists as a value, and fixture-classified content carries no scope
 * at all. Neither field substitutes for the cumulative provenance in the bundle.
 */
export const releaseManifestSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    fixtureOnly: fixtureOnlySchema,
    classification: contentClassificationSchema,
    authorizationScope: releaseAuthorizationScopeSchema.optional(),
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
    if (contentClassification(value.fixtureOnly) !== value.classification) {
      context.addIssue({
        code: "custom",
        path: ["classification"],
        message: `classification "${value.classification}" does not match fixtureOnly ${value.fixtureOnly} (fixture isolation)`,
      });
    }
    const scopeIssue = authorizationScopeIssue(value.fixtureOnly, value.authorizationScope);
    if (scopeIssue !== undefined) {
      context.addIssue({
        code: "custom",
        path: [...scopeIssue.path],
        message: scopeIssue.message,
      });
    }
  });

export type ReleaseGateResult = z.infer<typeof releaseGateResultSchema>;
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
