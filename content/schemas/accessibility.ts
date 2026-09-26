import { z } from "zod";
import {
  nonBlankStringSchema,
  requireUniqueStringField,
  safeIdentifierPattern,
  type StrictValidationIssue,
} from "./common.js";

const contentReferenceIdMessage =
  "must be a lowercase kebab-case content reference identifier starting with a letter";

export const contentReferenceIdSchema = z
  .string()
  .max(128)
  .regex(safeIdentifierPattern, contentReferenceIdMessage);

export const referencedMediaSchema = z
  .object({
    id: contentReferenceIdSchema,
    reference: nonBlankStringSchema,
    alternativeText: nonBlankStringSchema,
    transcript: nonBlankStringSchema,
  })
  .strict();

export const contentAccessibilitySchema = z
  .object({
    scope: z.literal("content"),
    readingOrder: z.array(contentReferenceIdSchema).min(1),
    media: z.array(referencedMediaSchema).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const issues: StrictValidationIssue[] = [
      ...requireUniqueStringField(value.readingOrder, ["readingOrder"], "reading-order reference"),
    ];
    for (const issue of requireUniqueStringField(
      (value.media ?? []).map((media) => media.id),
      ["media", "id"],
      "media reference ID",
    )) {
      issues.push(issue);
    }
    const readingOrder = new Set(value.readingOrder);
    for (const [index, media] of (value.media ?? []).entries()) {
      if (!readingOrder.has(media.id)) {
        issues.push({
          path: ["media", index, "id"],
          message: `media reference "${media.id}" must appear in the authored reading order`,
        });
      }
    }
    for (const issue of issues) {
      context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
    }
  });

export type ContentAccessibility = z.infer<typeof contentAccessibilitySchema>;
export type ReferencedMedia = z.infer<typeof referencedMediaSchema>;
