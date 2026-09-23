import { z } from "zod";
import { generatedSchemas, type GeneratedSchema } from "./index.js";

export const generatedSchemaDirectory = "content/generated";

const runtimeOnlyRulesComment =
  "Derived from the runtime Zod schemas in content/schemas/. Expressible governance conditionals are included under allOf. Rules JSON Schema cannot express (cross-array ID uniqueness, cross-field equality, date-window ordering) are enforced only by runtime Zod validation; use the runtime validators for full governance checks.";

type JsonObject = Record<string, unknown>;

export function schemaFileName(name: string): string {
  return `${name}.schema.json`;
}

function governanceAllOfClauses(name: string): JsonObject[] {
  switch (name) {
    case "pack-source":
      return [{ properties: { occupations: { type: "array", uniqueItems: true } } }];
    case "practitioner-eligibility":
      return [{ properties: { occupations: { type: "array", uniqueItems: true } } }];
    case "review-attestation":
      return [
        {
          if: {
            required: ["kind"],
            properties: { kind: { enum: ["founder-review", "practitioner-review"] } },
          },
          then: {
            required: ["contentReview"],
            properties: {
              locale: false,
              contentReview: {
                type: "object",
                additionalProperties: false,
                required: ["sixPartStructureConfirmed", "exposureBeforeCommitmentConfirmed"],
                properties: {
                  sixPartStructureConfirmed: { type: "boolean" },
                  exposureBeforeCommitmentConfirmed: { type: "boolean" },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { enum: ["founder-review", "practitioner-review"] },
              outcome: { const: "approved" },
            },
          },
          then: {
            properties: {
              contentReview: {
                type: "object",
                required: ["sixPartStructureConfirmed", "exposureBeforeCommitmentConfirmed"],
                properties: {
                  sixPartStructureConfirmed: { const: true },
                  exposureBeforeCommitmentConfirmed: { const: true },
                },
              },
            },
          },
        },
        {
          if: { required: ["kind"], properties: { kind: { const: "localization-review" } } },
          then: {
            required: ["locale"],
            properties: { contentReview: false },
          },
        },
        {
          if: {
            required: ["kind"],
            properties: { kind: { enum: ["accessibility-review", "sponsorship-disclosure"] } },
          },
          then: { properties: { locale: false, contentReview: false } },
        },
      ];
    case "release-manifest":
      return [
        {
          if: { required: ["fixtureOnly"], properties: { fixtureOnly: { const: true } } },
          then: { properties: { classification: { const: "fixture" } } },
        },
      ];
    default:
      return [];
  }
}

export function renderGeneratedSchema(name: string, schema: z.ZodType): string {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-2022-12" }) as JsonObject;
  const clauses = governanceAllOfClauses(name);
  const enriched: JsonObject = { $comment: runtimeOnlyRulesComment, ...jsonSchema };
  if (clauses.length > 0) {
    const existingAllOf = Array.isArray(enriched["allOf"])
      ? (enriched["allOf"] as JsonObject[])
      : [];
    enriched["allOf"] = [...existingAllOf, ...clauses];
  }
  return `${JSON.stringify(enriched, null, 2)}\n`;
}

export function renderAllGeneratedSchemas(
  catalog: readonly GeneratedSchema[] = generatedSchemas,
): Map<string, string> {
  const rendered = new Map<string, string>();
  for (const entry of [...catalog].sort((left, right) => left.name.localeCompare(right.name))) {
    rendered.set(schemaFileName(entry.name), renderGeneratedSchema(entry.name, entry.schema));
  }
  return rendered;
}
