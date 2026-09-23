import { StrictValidationError } from "./schemas/common.js";

function canonicalIssue(
  path: readonly (string | number)[],
  message: string,
): StrictValidationError {
  return new StrictValidationError([{ path, message }]);
}

function serialize(
  value: unknown,
  path: readonly (string | number)[],
  ancestors: readonly object[],
): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number": {
      if (!Number.isFinite(value)) {
        throw canonicalIssue(path, "non-finite numbers are not canonicalizable");
      }
      return JSON.stringify(value);
    }
    case "string":
      return JSON.stringify(value);
    case "undefined":
      throw canonicalIssue(path, "undefined is not canonicalizable");
    case "object":
      break;
    default:
      throw canonicalIssue(path, `${typeof value} is not canonicalizable`);
  }

  const objectValue = value as object;
  if (ancestors.includes(objectValue)) {
    throw canonicalIssue(path, "circular references are not canonicalizable");
  }
  const nextAncestors = [...ancestors, objectValue];

  if (Array.isArray(value)) {
    const items: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw canonicalIssue([...path, index], "sparse array slots are not canonicalizable");
      }
      items.push(serialize(value[index], [...path, index], nextAncestors));
    }
    return `[${items.join(",")}]`;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw canonicalIssue(path, "only plain objects are canonicalizable");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const members: string[] = [];
  for (const key of keys) {
    const entry = record[key];
    if (entry === undefined) {
      throw canonicalIssue([...path, key], "undefined property values are not canonicalizable");
    }
    members.push(`${JSON.stringify(key)}:${serialize(entry, [...path, key], nextAncestors)}`);
  }
  return `{${members.join(",")}}`;
}

export function canonicalJson(value: unknown): string {
  return serialize(value, [], []);
}
