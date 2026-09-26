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
    case "content-accessibility":
      return [
        {
          properties: {
            readingOrder: { type: "array", uniqueItems: true },
            media: { type: "array", uniqueItems: true },
          },
        },
      ];
    case "pack-source":
      return [
        {
          properties: {
            occupations: { type: "array", uniqueItems: true },
            accessibility: {
              type: "object",
              properties: {
                readingOrder: { type: "array", uniqueItems: true },
                media: { type: "array", uniqueItems: true },
              },
            },
          },
        },
      ];
    case "localized-content":
      return [
        {
          properties: {
            accessibility: {
              type: "object",
              properties: {
                readingOrder: { type: "array", uniqueItems: true },
                media: { type: "array", uniqueItems: true },
              },
            },
          },
        },
      ];
    case "practitioner-eligibility":
      return [
        { properties: { occupations: { type: "array", uniqueItems: true } } },
        {
          if: { required: ["fixtureOnly"], properties: { fixtureOnly: { const: true } } },
          then: {
            properties: {
              actorId: { type: "string", pattern: "^fixture-" },
              evidenceReferences: {
                type: "array",
                items: { type: "string", pattern: "^fixture:" },
              },
            },
          },
        },
      ];
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
          if: { required: ["kind"] },
          then: {
            required: ["reviewEventSequence"],
            properties: {
              reviewEventSequence: { type: "integer", exclusiveMinimum: 0 },
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
            required: ["locale", "localizedContentDigest"],
            properties: {
              contentReview: false,
              localizedContentDigest: {
                type: "string",
                pattern: "^[0-9a-f]{64}$",
              },
              localizationReview: {
                type: "object",
                additionalProperties: false,
                required: ["fluentBurmeseConfirmed", "fluentReviewEvidence"],
                properties: {
                  fluentBurmeseConfirmed: { type: "boolean" },
                  fluentReviewEvidence: { type: "string" },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { const: "localization-review" },
              outcome: { const: "approved" },
            },
          },
          then: {
            required: ["localizationReview"],
            properties: {
              localizationReview: {
                type: "object",
                properties: { fluentBurmeseConfirmed: { const: true } },
              },
            },
          },
        },
        {
          if: {
            required: ["kind", "fixtureOnly"],
            properties: {
              kind: { const: "localization-review" },
              fixtureOnly: { const: true },
            },
          },
          then: {
            properties: {
              localizationReview: {
                type: "object",
                properties: {
                  fluentReviewEvidence: {
                    type: "string",
                    pattern: "^fixture:[A-Za-z0-9][A-Za-z0-9._:-]*$",
                  },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind"],
            properties: {
              kind: {
                enum: [
                  "founder-review",
                  "practitioner-review",
                  "accessibility-review",
                  "sponsorship-disclosure",
                ],
              },
            },
          },
          then: { properties: { localizationReview: false } },
        },
        {
          if: {
            required: ["kind"],
            properties: { kind: { enum: ["accessibility-review", "sponsorship-disclosure"] } },
          },
          then: { properties: { locale: false, contentReview: false } },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { const: "accessibility-review" },
              outcome: { const: "changes-requested" },
            },
          },
          then: {
            properties: {
              accessibilityReview: {
                type: "object",
                required: [
                  "readingOrderConfirmed",
                  "referencedMediaAlternativesConfirmed",
                  "runtimeValidationDeferred",
                ],
                properties: {
                  readingOrderConfirmed: { type: "boolean" },
                  referencedMediaAlternativesConfirmed: { type: "boolean" },
                  runtimeValidationDeferred: { type: "boolean" },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { const: "accessibility-review" },
              outcome: { const: "approved" },
            },
          },
          then: {
            required: ["accessibilityReview"],
            properties: {
              accessibilityReview: {
                type: "object",
                additionalProperties: false,
                required: [
                  "readingOrderConfirmed",
                  "referencedMediaAlternativesConfirmed",
                  "runtimeValidationDeferred",
                ],
                properties: {
                  readingOrderConfirmed: { const: true },
                  referencedMediaAlternativesConfirmed: { const: true },
                  runtimeValidationDeferred: { const: true },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind"],
            properties: {
              kind: {
                enum: [
                  "founder-review",
                  "practitioner-review",
                  "localization-review",
                  "sponsorship-disclosure",
                ],
              },
            },
          },
          then: { properties: { accessibilityReview: false } },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { const: "sponsorship-disclosure" },
              outcome: { const: "changes-requested" },
            },
          },
          then: {
            properties: {
              sponsorshipReview: {
                type: "object",
                required: ["disclosureConfirmed", "editorialControlPreserved", "orderingInfluence"],
                properties: {
                  disclosureConfirmed: { type: "boolean" },
                  editorialControlPreserved: { type: "boolean" },
                  orderingInfluence: { type: "string" },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind", "outcome"],
            properties: {
              kind: { const: "sponsorship-disclosure" },
              outcome: { const: "approved" },
            },
          },
          then: {
            required: ["sponsorshipReview"],
            properties: {
              sponsorshipReview: {
                type: "object",
                additionalProperties: false,
                required: ["disclosureConfirmed", "editorialControlPreserved", "orderingInfluence"],
                properties: {
                  disclosureConfirmed: { const: true },
                  editorialControlPreserved: { const: true },
                  orderingInfluence: { const: "none" },
                },
              },
            },
          },
        },
        {
          if: {
            required: ["kind"],
            properties: {
              kind: {
                enum: [
                  "founder-review",
                  "practitioner-review",
                  "localization-review",
                  "accessibility-review",
                ],
              },
            },
          },
          then: { properties: { sponsorshipReview: false } },
        },
        {
          if: { required: ["fixtureOnly"], properties: { fixtureOnly: { const: true } } },
          then: {
            properties: { actorId: { type: "string", pattern: "^fixture-" } },
          },
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
