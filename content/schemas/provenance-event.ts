import { z } from "zod";
import {
  actorIdSchema,
  dateTimeSchema,
  sha256DigestSchema,
  fixtureOnlySchema,
  packIdSchema,
  requireUniqueStringField,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

export const provenanceEventTypeSchema = z.enum([
  "authored",
  "localized",
  "founder-reviewed",
  "practitioner-reviewed",
  "localization-reviewed",
  "accessibility-reviewed",
  "sponsorship-disclosed",
  "changes-requested",
  "artifact-eligible",
  "artifact-released",
  "retired",
]);

export const provenanceEventSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    sequence: z.number().int().positive(),
    type: provenanceEventTypeSchema,
    actorId: actorIdSchema,
    fixtureOnly: fixtureOnlySchema,
    contentDigest: sha256DigestSchema,
    localizedContentDigest: sha256DigestSchema.optional(),
    previousEventDigest: sha256DigestSchema.nullable(),
    eventDigest: sha256DigestSchema,
    recordedAt: dateTimeSchema,
  })
  .strict();

export const provenanceEventLogSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    events: z.array(provenanceEventSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    for (const issue of requireUniqueStringField(
      value.events.map((event) => String(event.sequence)),
      ["events", "sequence"],
      "provenance sequence",
    )) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
    value.events.forEach((event, index) => {
      if (event.packId !== value.packId) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "packId"],
          message: `event packId "${event.packId}" does not match log packId "${value.packId}"`,
        });
      }
    });
  });

export type ProvenanceEvent = z.infer<typeof provenanceEventSchema>;
export type ProvenanceEventLog = z.infer<typeof provenanceEventLogSchema>;
export type ProvenanceEventType = z.infer<typeof provenanceEventTypeSchema>;
