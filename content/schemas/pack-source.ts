import { z } from "zod";
import {
  StrictValidationError,
  type StrictValidationIssue,
  dateTimeSchema,
  experimentSchema,
  fixtureOnlySchema,
  nonBlankStringSchema,
  occupationIdSchema,
  packIdSchema,
  requireUniqueStringField,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";

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
    occupations: z.array(occupationIdSchema).min(1),
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
    for (const issue of requireUniqueStringField(
      value.occupations,
      ["occupations"],
      "occupation ID",
    )) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
  });

export type PackSource = z.infer<typeof packSourceSchema>;

export function assertUniquePackVersions(
  sources: readonly { readonly id: string; readonly version: number }[],
): void {
  const seen = new Set<string>();
  const issues: StrictValidationIssue[] = [];

  sources.forEach((source, index) => {
    const key = `${source.id}:${source.version}`;
    if (seen.has(key)) {
      issues.push({
        path: [index],
        message: `duplicate pack version: "${source.id}" version ${source.version}`,
      });
      return;
    }
    seen.add(key);
  });

  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }
}
