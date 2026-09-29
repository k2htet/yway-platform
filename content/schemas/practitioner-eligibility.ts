import { z } from "zod";
import {
  actorClassificationIssue,
  evidenceReferenceClassificationIssue,
} from "../classification.js";
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
    // One rule, both directions: a `fixture-` identity implies fixture content, and
    // real content implies a real identity and an opaque reference to the
    // owner-held private record rather than a synthetic one.
    const actorIssue = actorClassificationIssue(value.fixtureOnly, value.actorId, ["actorId"]);
    if (actorIssue !== undefined) {
      context.addIssue({ code: "custom", path: [...actorIssue.path], message: actorIssue.message });
    }
    value.evidenceReferences.forEach((reference, index) => {
      const issue = evidenceReferenceClassificationIssue(value.fixtureOnly, reference, [
        "evidenceReferences",
        index,
      ]);
      if (issue !== undefined) {
        context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
      }
    });
  });

export type PractitionerEligibility = z.infer<typeof practitionerEligibilitySchema>;
