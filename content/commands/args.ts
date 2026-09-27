import { actorIdSchema, packIdSchema, StrictValidationError } from "../schemas/index.js";

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export interface CommandResult {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout?: string;
  readonly stderr?: string;
}

export interface CommandOptions {
  readonly repositoryRoot?: string;
  readonly now?: () => string;
  readonly onBeforeWrite?: (path: string) => void;
}

export interface FlagSpec {
  readonly type: "string" | "boolean";
}

export type FlagValues = Record<string, string | boolean>;

export function parseCommandFlags(
  argv: readonly string[],
  spec: Readonly<Record<string, FlagSpec>>,
): FlagValues {
  const values: FlagValues = {};
  let tokens = [...argv];
  while (tokens[0] === "--") {
    tokens = tokens.slice(1);
  }
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!;
    if (!token.startsWith("--")) {
      throw new UsageError(`unexpected positional argument "${token}"`);
    }

    const equals = token.indexOf("=");
    const name = equals === -1 ? token.slice(2) : token.slice(2, equals);
    const inlineValue = equals === -1 ? undefined : token.slice(equals + 1);
    const flag = spec[name];

    if (flag === undefined) {
      throw new UsageError(`unknown option "--${name}"`);
    }
    if (Object.prototype.hasOwnProperty.call(values, name)) {
      throw new UsageError(`option "--${name}" was provided more than once`);
    }

    if (flag.type === "boolean") {
      if (inlineValue !== undefined && inlineValue !== "true" && inlineValue !== "false") {
        throw new UsageError(`option "--${name}" only accepts "true" or "false"`);
      }
      values[name] = inlineValue === undefined ? true : inlineValue === "true";
      index += 1;
      continue;
    }

    if (inlineValue !== undefined) {
      if (inlineValue === "") {
        throw new UsageError(`option "--${name}" requires a non-empty value`);
      }
      values[name] = inlineValue;
      index += 1;
      continue;
    }

    const next = tokens[index + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new UsageError(`option "--${name}" requires a value`);
    }
    values[name] = next;
    index += 2;
  }

  return values;
}

export function requireFlagString(values: FlagValues, name: string): string {
  const value = values[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new UsageError(`option "--${name}" is required`);
  }
  return value;
}

export function optionalFlagString(values: FlagValues, name: string): string | undefined {
  const value = values[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new UsageError(`option "--${name}" requires a value`);
  }
  return value;
}

export function parsePositiveInteger(raw: string, name: string): number {
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new UsageError(`option "--${name}" must be a positive integer (received "${raw}")`);
  }
  return Number(raw);
}

export function parseBooleanString(raw: string, name: string): boolean {
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  throw new UsageError(`option "--${name}" only accepts "true" or "false" (received "${raw}")`);
}

export function requirePackId(values: FlagValues): string {
  return requireIdentifier(values, "pack", packIdSchema);
}

export function requireActorId(values: FlagValues): string {
  return requireIdentifier(values, "actor", actorIdSchema);
}

function requireIdentifier(
  values: FlagValues,
  name: string,
  schema: { safeParse: (value: unknown) => { success: boolean } },
): string {
  const raw = requireFlagString(values, name);
  if (!schema.safeParse(raw).success) {
    throw new UsageError(
      `option "--${name}" must be a lowercase kebab-case identifier (received "${raw}")`,
    );
  }
  return raw;
}

export function failureResult(usage: string, error: unknown): CommandResult {
  if (error instanceof UsageError) {
    return { exitCode: 2, stderr: `FAIL  ${error.message}\n${usage}\n` };
  }
  if (error instanceof StrictValidationError) {
    return { exitCode: 1, stderr: `FAIL  ${error.message}\n` };
  }
  if (error instanceof Error) {
    // Fail closed rather than crashing: an unexpected repository or environment
    // error is a validation failure, not a reason to exit with an unhandled throw.
    return { exitCode: 1, stderr: `FAIL  ${error.name}: ${error.message}\n` };
  }
  throw error;
}

export function successResult(stdout: string): CommandResult {
  return { exitCode: 0, stdout: stdout.endsWith("\n") ? stdout : `${stdout}\n` };
}
