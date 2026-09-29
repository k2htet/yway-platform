import { z } from "zod";
import { releasePolicySelectionSchema } from "../release-policy.js";
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
    founderApproved: z.boolean(),
    practitionerApproved: z.boolean(),
    aiReviewed: z.literal(true).optional(),
    ownerApproved: z.literal(true).optional(),
    releasePolicy: releasePolicySelectionSchema.optional(),
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
    founderApproved: z.boolean(),
    practitionerApproved: z.boolean(),
    aiReviewed: z.literal(true).optional(),
    ownerApproved: z.literal(true).optional(),
    releasePolicy: releasePolicySelectionSchema.optional(),
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
    const policy = value.gates.releasePolicy;
    if (policy !== undefined) {
      if (
        policy.applicability !== (value.fixtureOnly ? "fixture-test" : "pilot") ||
        policy.authorizationScope !== value.authorizationScope
      )
        context.addIssue({
          code: "custom",
          path: ["gates", "releasePolicy", "applicability"],
          message:
            "policy applicability or authorization scope does not match release classification and scope",
        });
      if (value.gates.aiReviewed !== true || value.gates.ownerApproved !== true)
        context.addIssue({
          code: "custom",
          path: ["gates"],
          message: "policy release requires AI review and owner approval",
        });
      if (policy.id === "human-assured" && value.gates.practitionerApproved !== true)
        context.addIssue({
          code: "custom",
          path: ["gates", "practitionerApproved"],
          message: "human-assured requires practitioner approval",
        });
    } else if (
      value.gates.founderApproved !== true ||
      value.gates.practitionerApproved !== true ||
      value.gates.aiReviewed !== undefined ||
      value.gates.ownerApproved !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["gates"],
        message:
          "legacy release requires founderApproved and practitionerApproved without policy claims",
      });
    }
  });

export type ReleaseGateResult = z.infer<typeof releaseGateResultSchema>;
export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;
