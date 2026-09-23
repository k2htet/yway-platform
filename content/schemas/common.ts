import { z } from "zod";

export interface StrictValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export function formatStrictIssues(issues: readonly StrictValidationIssue[]): string {
  if (issues.length === 0) {
    return "strict validation failed";
  }
  return issues
    .map((issue) => {
      const prefix = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${prefix}${issue.message}`;
    })
    .join("; ");
}

export class StrictValidationError extends Error {
  readonly issues: readonly StrictValidationIssue[];

  constructor(issues: readonly StrictValidationIssue[]) {
    super(formatStrictIssues(issues));
    this.name = "StrictValidationError";
    this.issues = issues;
  }
}

const prohibitedKeyPattern = /score|rank|percent|employability|suitability|candidatequality/i;

export function collectProhibitedKeyIssues(
  value: unknown,
  path: readonly (string | number)[] = [],
): StrictValidationIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectProhibitedKeyIssues(item, [...path, index]));
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  const issues: StrictValidationIssue[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (prohibitedKeyPattern.test(key)) {
      issues.push({
        path: [...path, key],
        message: `prohibited scoring or ranking field "${key}" (YWAY-P005, YWAY-E006)`,
      });
    }
    issues.push(...collectProhibitedKeyIssues(nested, [...path, key]));
  }
  return issues;
}

export function strictParse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  const prohibitedIssues = collectProhibitedKeyIssues(data);

  if (result.success && prohibitedIssues.length === 0) {
    return result.data;
  }

  const schemaIssues: StrictValidationIssue[] = result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.map((segment) =>
          typeof segment === "symbol" ? String(segment) : segment,
        ),
        message: issue.message,
      }));

  throw new StrictValidationError([...prohibitedIssues, ...schemaIssues]);
}

export const schemaVersionLiteral = z.literal(1);

export const safeIdentifierPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const safeIdentifierMessage = "must be a lowercase kebab-case identifier starting with a letter";

export const packIdSchema = z.string().max(64).regex(safeIdentifierPattern, safeIdentifierMessage);

export const experimentIdSchema = z
  .string()
  .max(64)
  .regex(safeIdentifierPattern, safeIdentifierMessage);

export const actorIdSchema = z.string().max(64).regex(safeIdentifierPattern, safeIdentifierMessage);

export const occupationIdSchema = z
  .string()
  .max(64)
  .regex(safeIdentifierPattern, safeIdentifierMessage);

export const versionSchema = z.number().int().positive();

export const sha256DigestSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "must be a lowercase sha256 hex digest");

export const fixtureOnlySchema = z.boolean();

export const dateTimeSchema = z.iso.datetime({ offset: true });

export const dateSchema = z.iso.date();

export const localeSchema = z.enum(["my"]);

export const nonBlankStringSchema = z.string().min(1).regex(/\S/, "must not be blank");

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

export const relativeArtifactPathSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/,
    "must be a relative artifact path without leading slashes or parent segments",
  );

export function requireUniqueStringField(
  values: readonly string[],
  path: readonly (string | number)[],
  label: string,
): StrictValidationIssue[] {
  const seen = new Set<string>();
  const issues: StrictValidationIssue[] = [];
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push({
        path: [...path, index],
        message: `duplicate ${label} "${value}"`,
      });
      return;
    }
    seen.add(value);
  });
  return issues;
}
