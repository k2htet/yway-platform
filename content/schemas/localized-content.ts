import { z } from "zod";
import {
  experimentSchema,
  fixtureOnlySchema,
  localeSchema,
  nonBlankStringSchema,
  packIdSchema,
  requireUniqueStringField,
  schemaVersionLiteral,
  versionSchema,
} from "./common.js";
import { contentAccessibilitySchema } from "./accessibility.js";
import { previewMetadataSchema } from "./pack-source.js";

export const localizedExperimentSchema = experimentSchema;

export const localizedContentSchema = z
  .object({
    schemaVersion: schemaVersionLiteral,
    packId: packIdSchema,
    packVersion: versionSchema,
    locale: localeSchema,
    fixtureOnly: fixtureOnlySchema,
    preview: previewMetadataSchema,
    title: nonBlankStringSchema,
    summary: nonBlankStringSchema,
    limitations: z.array(nonBlankStringSchema).min(1),
    experiments: z.array(localizedExperimentSchema).min(1),
    accessibility: contentAccessibilitySchema.optional(),
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

export type LocalizedContent = z.infer<typeof localizedContentSchema>;
