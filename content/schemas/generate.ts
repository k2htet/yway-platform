import { z } from "zod";
import { generatedSchemas, type GeneratedSchema } from "./index.js";

export const generatedSchemaDirectory = "content/generated";

export function schemaFileName(name: string): string {
  return `${name}.schema.json`;
}

export function renderGeneratedSchema(schema: z.ZodType): string {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-2022-12" });
  return `${JSON.stringify(jsonSchema, null, 2)}\n`;
}

export function renderAllGeneratedSchemas(
  catalog: readonly GeneratedSchema[] = generatedSchemas,
): Map<string, string> {
  const rendered = new Map<string, string>();
  for (const entry of [...catalog].sort((left, right) => left.name.localeCompare(right.name))) {
    rendered.set(schemaFileName(entry.name), renderGeneratedSchema(entry.schema));
  }
  return rendered;
}
