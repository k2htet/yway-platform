import { z } from "zod";
import { sha256DigestSchema, packIdSchema, schemaVersionLiteral, versionSchema } from "./common.js";

export const retirementNoticeSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    releaseManifestDigest: sha256DigestSchema,
    retirementEventDigest: sha256DigestSchema,
  })
  .strict();

export type RetirementNotice = z.infer<typeof retirementNoticeSchema>;
