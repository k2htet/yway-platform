import { z } from "zod";
import {
  StrictValidationError,
  dateTimeSchema,
  experimentIdSchema,
  fixtureOnlySchema,
  nonBlankStringSchema,
  packIdSchema,
  requireUniqueStringField,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

export const experimentSchema = z
  .object({
    id: experimentIdSchema,
    title: nonBlankStringSchema,
    question: nonBlankStringSchema,
    action: nonBlankStringSchema,
    timebox: nonBlankStringSchema,
    whatToNotice: nonBlankStringSchema,
    reflection: nonBlankStringSchema,
    nextFork: nonBlankStringSchema,
  })
  .strict();

export const previewMetadataSchema = z
  .object({
    headline: nonBlankStringSchema,
    description: nonBlankStringSchema,
  })
  .strict();

export const sponsorshipSchema = z
  .object({
    sponsorName: nonBlankStringSchema,
    disclosure: nonBlankStringSchema,
    editorialIndependence: nonBlankStringSchema,
  })
  .strict();

export const packSourceSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    id: packIdSchema,
    version: versionSchema,
    fixtureOnly: fixtureOnlySchema,
    canonicalLanguage: z.literal("en-simple"),
    aiAssisted: z.boolean(),
    title: nonBlankStringSchema,
    summary: nonBlankStringSchema,
    preview: previewMetadataSchema,
    limitations: z.array(nonBlankStringSchema).min(1),
    experiments: z.array(experimentSchema).min(1),
    sponsorship: sponsorshipSchema.optional(),
    authoredAt: dateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    for (const issue of requireUniqueStringField(
      value.experiments.map((experiment) => experiment.id),
      ["experiments", "id"],
      "experiment ID",
    )) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
  });

export type PackSource = z.infer<typeof packSourceSchema>;

export function assertUniquePackIds(sources: readonly { readonly id: string }[]): void {
  const seen = new Set<string>();
  const issues = sources.flatMap((source, index) => {
    if (seen.has(source.id)) {
      return [
        {
          path: [index, "id"] as const,
          message: `duplicate pack ID "${source.id}"`,
        },
      ];
    }
    seen.add(source.id);
    return [];
  });

  if (issues.length > 0) {
    throw new StrictValidationError(
      issues.map((issue) => ({ path: [...issue.path], message: issue.message })),
    );
  }
}
