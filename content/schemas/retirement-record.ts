import { z } from "zod";
import {
  actorIdSchema,
  dateTimeSchema,
  sha256DigestSchema,
  fixtureOnlySchema,
  nonBlankStringSchema,
  packIdSchema,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

export const retirementRecordSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    contentDigest: sha256DigestSchema,
    actorId: actorIdSchema,
    fixtureOnly: fixtureOnlySchema,
    reason: nonBlankStringSchema,
    recordedAt: dateTimeSchema,
    retirementEventSequence: z.number().int().positive(),
    retirementEventDigest: sha256DigestSchema,
  })
  .strict();

export type RetirementRecord = z.infer<typeof retirementRecordSchema>;
