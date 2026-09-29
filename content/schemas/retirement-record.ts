import { z } from "zod";
import { actorClassificationIssue, retirementReasonIssue } from "../classification.js";
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
  .strict()
  .superRefine((value, context) => {
    const actorIssue = actorClassificationIssue(
      value.fixtureOnly,
      value.actorId,
      ["actorId"],
      `retirement actorId "${value.actorId}"`,
    );
    if (actorIssue !== undefined) {
      context.addIssue({ code: "custom", path: [...actorIssue.path], message: actorIssue.message });
    }
    const reasonIssue = retirementReasonIssue(value.fixtureOnly, value.reason);
    if (reasonIssue !== undefined) {
      context.addIssue({
        code: "custom",
        path: [...reasonIssue.path],
        message: reasonIssue.message,
      });
    }
  });

export type RetirementRecord = z.infer<typeof retirementRecordSchema>;
