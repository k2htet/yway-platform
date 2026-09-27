import { z } from "zod";
import {
  dateTimeSchema,
  packIdSchema,
  schemaVersionLiteral,
  sha256DigestSchema,
  versionSchema,
} from "./common.js";
import { localizedContentSchema } from "./localized-content.js";
import { packSourceSchema } from "./pack-source.js";
import { provenanceEventLogSchema } from "./provenance-event.js";

/**
 * The consumable release boundary for one immutable Pack version.
 *
 * The bundle is generated from already-validated repository records and is never
 * hand-authored. It carries the canonical Pack, the Burmese localized content, and
 * the sealed provenance prefix that ends at this version's `artifact-released`
 * event, so cumulative AI/founder/practitioner provenance survives the release
 * boundary. Qualification documents, attestation notes, and private retirement
 * reasons are deliberately absent.
 *
 * Stage 2 accepts fixture-only Packs only, so the classification is fixed and
 * there is no production override on this schema.
 */
export const releaseBundleSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    localizedContentDigest: sha256DigestSchema,
    fixtureOnly: z.literal(true),
    classification: z.literal("fixture"),
    releasedAt: dateTimeSchema,
    pack: packSourceSchema,
    localizedContent: localizedContentSchema,
    provenance: provenanceEventLogSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.pack.id !== value.packId) {
      context.addIssue({
        code: "custom",
        path: ["pack", "id"],
        message: `bundle pack id "${value.pack.id}" does not match bundle packId "${value.packId}"`,
      });
    }
    if (value.pack.version !== value.packVersion) {
      context.addIssue({
        code: "custom",
        path: ["pack", "version"],
        message: `bundle pack version ${value.pack.version} does not match bundle packVersion ${value.packVersion}`,
      });
    }
    if (value.pack.fixtureOnly !== value.fixtureOnly) {
      context.addIssue({
        code: "custom",
        path: ["pack", "fixtureOnly"],
        message: `bundle pack fixtureOnly ${value.pack.fixtureOnly} does not match bundle fixtureOnly ${value.fixtureOnly}`,
      });
    }
    if (value.localizedContent.packId !== value.packId) {
      context.addIssue({
        code: "custom",
        path: ["localizedContent", "packId"],
        message: `bundle localized content packId "${value.localizedContent.packId}" does not match bundle packId "${value.packId}"`,
      });
    }
    if (value.localizedContent.packVersion !== value.packVersion) {
      context.addIssue({
        code: "custom",
        path: ["localizedContent", "packVersion"],
        message: `bundle localized content packVersion ${value.localizedContent.packVersion} does not match bundle packVersion ${value.packVersion}`,
      });
    }
    if (value.localizedContent.fixtureOnly !== value.fixtureOnly) {
      context.addIssue({
        code: "custom",
        path: ["localizedContent", "fixtureOnly"],
        message: `bundle localized content fixtureOnly ${value.localizedContent.fixtureOnly} does not match bundle fixtureOnly ${value.fixtureOnly} (fixture isolation must be consistent across the release boundary)`,
      });
    }
    if (value.provenance.packId !== value.packId) {
      context.addIssue({
        code: "custom",
        path: ["provenance", "packId"],
        message: `bundle provenance log packId "${value.provenance.packId}" does not match bundle packId "${value.packId}"`,
      });
    }
    const releaseEvent = value.provenance.events[value.provenance.events.length - 1];
    if (
      releaseEvent === undefined ||
      releaseEvent.type !== "artifact-released" ||
      releaseEvent.packVersion !== value.packVersion
    ) {
      context.addIssue({
        code: "custom",
        path: ["provenance", "events"],
        message: `bundle provenance prefix must end at the artifact-released event for pack version ${value.packVersion}`,
      });
    }
  });

export type ReleaseBundle = z.infer<typeof releaseBundleSchema>;
