import { z } from "zod";
import {
  actorIdSchema,
  dateSchema,
  fixtureOnlySchema,
  occupationIdSchema,
  requireUniqueStringField,
  schemaVersionLiteral,
} from "./common.js";

const evidenceReferenceSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9][a-z0-9:_-]*$/,
    "must be an opaque non-sensitive reference without paths or personal data",
  );

export const practitionerEligibilitySchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    actorId: actorIdSchema,
    fixtureOnly: fixtureOnlySchema,
    occupations: z.array(occupationIdSchema).min(1),
    status: z.enum(["active", "inactive"]),
    verification: z
      .object({
        method: z.literal("manual"),
        status: z.enum(["verified", "unverified"]),
        verifiedOn: dateSchema,
      })
      .strict(),
    validFrom: dateSchema,
    validUntil: dateSchema,
    evidenceReferences: z.array(evidenceReferenceSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    for (const issue of requireUniqueStringField(
      value.occupations,
      ["occupations"],
      "occupation ID",
    )) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
    if (value.validUntil < value.validFrom) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "validUntil must not be earlier than validFrom",
      });
    }
  });

export type PractitionerEligibility = z.infer<typeof practitionerEligibilitySchema>;
