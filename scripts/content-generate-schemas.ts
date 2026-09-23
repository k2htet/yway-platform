import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generatedSchemaDirectory,
  renderAllGeneratedSchemas,
} from "../content/schemas/generate.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const arguments_ = process.argv.slice(2);

if (arguments_.some((argument) => argument !== "--check")) {
  console.error("Usage: node --import tsx scripts/content-generate-schemas.ts [--check]");
  process.exit(2);
}

const checkMode = arguments_.includes("--check");
const outputDirectory = resolve(repositoryRoot, generatedSchemaDirectory);
const rendered = renderAllGeneratedSchemas();

if (checkMode) {
  const failures: string[] = [];

  for (const [fileName, content] of rendered) {
    const filePath = resolve(outputDirectory, fileName);
    let committed: string | undefined;
    try {
      committed = readFileSync(filePath, "utf8");
    } catch {
      failures.push(`${generatedSchemaDirectory}/${fileName} is missing`);
      continue;
    }
    if (committed !== content) {
      failures.push(`${generatedSchemaDirectory}/${fileName} is out of date`);
    }
  }

  const expectedNames = new Set(rendered.keys());
  for (const existing of readdirSync(outputDirectory)) {
    if (existing.endsWith(".schema.json") && !expectedNames.has(existing)) {
      failures.push(`${generatedSchemaDirectory}/${existing} is not in the schema catalog`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL  ${failure}`);
    }
    process.exit(1);
  }

  console.log("PASS  generated JSON Schema files match the runtime schemas");
} else {
  mkdirSync(outputDirectory, { recursive: true });
  for (const [fileName, content] of rendered) {
    writeFileSync(resolve(outputDirectory, fileName), content, "utf8");
  }
  console.log(`PASS  wrote ${rendered.size} generated JSON Schema files`);
}
