import { z } from "zod";
import { StrictValidationError } from "./schemas/common.js";

/** Repository-governed pilot rules. Pack source has no policy selector. */
export const releasePolicyIdSchema = z.enum(["ai-owner", "human-assured"]);
export const releasePolicySelectionSchema = z
  .object({
    id: releasePolicyIdSchema,
    version: z.literal(1),
    applicability: z.enum(["fixture-test", "pilot"]),
    authorizationScope: z.literal("pilot").optional(),
  })
  .strict()
  .superRefine((selection, context) => {
    if ((selection.applicability === "pilot") !== (selection.authorizationScope === "pilot"))
      context.addIssue({
        code: "custom",
        path: ["authorizationScope"],
        message:
          "pilot policy requires pilot authorization; fixture tests carry no authorization scope",
      });
  });
export type ReleasePolicySelection = z.infer<typeof releasePolicySelectionSchema>;

export function requireReleasePolicy(
  selection: ReleasePolicySelection,
  fixtureOnly: boolean,
): ReleasePolicySelection {
  const parsed = releasePolicySelectionSchema.parse(selection);
  const expectedApplicability = fixtureOnly ? "fixture-test" : "pilot";
  if (parsed.applicability !== expectedApplicability) {
    throw new StrictValidationError([
      {
        path: ["releasePolicy", "applicability"],
        message: `policy applicability ${parsed.applicability} does not match ${expectedApplicability} content classification`,
      },
    ]);
  }
  return parsed;
}

export function requiresPractitioner(selection: ReleasePolicySelection): boolean {
  return selection.id === "human-assured";
}

export function sameReleasePolicy(
  a: ReleasePolicySelection | undefined,
  b: ReleasePolicySelection | undefined,
): boolean {
  return (
    a !== undefined &&
    b !== undefined &&
    a.id === b.id &&
    a.version === b.version &&
    a.applicability === b.applicability &&
    a.authorizationScope === b.authorizationScope
  );
}
