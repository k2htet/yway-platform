import { parse } from "yaml";
import type { z } from "zod";
import { StrictValidationError, strictParse } from "./common.js";

export function parseStrictYaml<T>(schema: z.ZodType<T>, source: string): T {
  let data: unknown;

  try {
    data = parse(source, {
      uniqueKeys: true,
      maxAliasCount: 0,
      strict: true,
      prettyErrors: false,
    });
  } catch (error) {
    const firstLine =
      error instanceof Error ? (error.message.split("\n")[0] ?? error.message) : String(error);
    throw new StrictValidationError([{ path: [], message: `invalid YAML: ${firstLine}` }]);
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new StrictValidationError([{ path: [], message: "YAML root must be a mapping" }]);
  }

  return strictParse(schema, data);
}
