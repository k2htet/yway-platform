import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { generatedSchemas } from "../content/schemas/index.js";
import {
  renderAllGeneratedSchemas,
  renderGeneratedSchema,
  schemaFileName,
} from "../content/schemas/generate.js";

const generatedDirectory = fileURLToPath(new URL("../content/generated/", import.meta.url));

test("JSON Schema rendering is byte-deterministic across runs", () => {
  const first = renderAllGeneratedSchemas();
  const second = renderAllGeneratedSchemas();

  assert.equal(first.size, second.size);
  for (const [name, content] of first) {
    assert.equal(second.get(name), content, `${name} differed between renders`);
  }
});

test("every catalog schema renders to a stable JSON object document", () => {
  for (const entry of generatedSchemas) {
    const rendered = renderGeneratedSchema(entry.schema);
    assert.ok(rendered.endsWith("\n"), `${entry.name} must end with a newline`);
    const parsed: unknown = JSON.parse(rendered);
    assert.equal(typeof parsed, "object");
    assert.ok(parsed !== null);
    assert.equal((parsed as { type?: string }).type, "object");
  }
});

test("committed JSON Schema files match the runtime schema catalog", () => {
  const rendered = renderAllGeneratedSchemas();
  const committedFiles = readdirSync(generatedDirectory)
    .filter((name) => name.endsWith(".schema.json"))
    .sort();

  assert.deepEqual(
    committedFiles,
    [...rendered.keys()].sort(),
    "committed schema files must match the catalog exactly",
  );

  for (const [name, content] of rendered) {
    const committed = readFileSync(`${generatedDirectory}${name}`, "utf8");
    assert.equal(
      committed,
      content,
      `${schemaFileName(name)} is out of date; run pnpm content:schemas`,
    );
  }
});

test("generated pack source schema rejects unknown properties", () => {
  const rendered = renderAllGeneratedSchemas().get("pack-source.schema.json");
  assert.ok(rendered !== undefined);
  const parsed = JSON.parse(rendered) as { additionalProperties?: boolean };
  assert.equal(parsed.additionalProperties, false);
});
