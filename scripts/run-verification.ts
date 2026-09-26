import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

interface PackageManifest {
  scripts?: Record<string, unknown>;
}

type VerificationMode = "fast" | "full";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const requestedMode = process.argv[2];

if (requestedMode !== "fast" && requestedMode !== "full") {
  console.error("Usage: node --import tsx scripts/run-verification.ts <fast|full>");
  process.exit(2);
}

const mode: VerificationMode = requestedMode;
const packageJsonPath = resolve(repositoryRoot, "package.json");
let manifest: PackageManifest;

try {
  manifest = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageManifest;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL  Could not read package.json: ${message}`);
  process.exit(1);
}

const scripts = manifest.scripts ?? {};
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const fastModeScripts = ["lint", "typecheck"] as const;
const fullModeInitialScripts = ["lint", "typecheck", "format:check"] as const;
// Pin the whole governed content control surface: generated-schema drift and
// content/artifact drift must both fail `verify:full`, which CI runs.
const expectedFullModePostScripts = [
  "content:schemas:check",
  "content:verify",
  "verify:invariants",
  "verify:docs",
] as const;
const fullModePostScripts = expectedFullModePostScripts;
// The test suite is a required full-verification script: skipping it silently would
// leave the governed content control surface unverified.
const fullModeRequiredTestScripts = ["test"] as const;
const fullModeRequiredScripts = [...fullModeInitialScripts, ...fullModePostScripts];

function findMissingScripts(
  requiredNames: readonly string[],
  availableScripts: Record<string, unknown>,
): string[] {
  return requiredNames.filter(
    (name) =>
      typeof availableScripts[name] !== "string" ||
      (availableScripts[name] as string).trim().length === 0,
  );
}

function runVerificationRunnerSelfTest(): void {
  const fixtureScripts = Object.fromEntries(
    [...fullModeRequiredScripts, ...fullModeRequiredTestScripts].map((name) => [
      name,
      `fixture ${name}`,
    ]),
  );
  delete fixtureScripts["verify:docs"];
  const required = [...fullModeRequiredScripts, ...fullModeRequiredTestScripts];
  const missing = findMissingScripts(required, fixtureScripts);
  const complete = findMissingScripts(required, {
    ...fixtureScripts,
    "verify:docs": "fixture verify:docs",
  });
  // The content commands and the test suite are part of the governed control
  // surface, so a full verification must not silently skip them.
  const contentCommandsCovered = fullModeRequiredScripts.includes("content:verify");
  const testsRequired = fullModeRequiredTestScripts.length > 0;

  if (
    !fullModeRequiredScripts.includes("verify:docs") ||
    !fullModePostScripts.includes("verify:docs") ||
    missing.length !== 1 ||
    missing[0] !== "verify:docs" ||
    complete.length !== 0 ||
    !contentCommandsCovered ||
    !testsRequired
  ) {
    console.error("FAIL  verification runner self-test");
    process.exit(1);
  }
  console.log("PASS  verification runner fail-closed self-test");
}

function runScript(name: string): void {
  console.log(`\nRUN   ${name}`);
  const result = spawnSync(pnpmCommand, ["run", name], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`FAIL  ${name} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    const exitCode = result.status ?? 1;
    console.error(`FAIL  ${name} exited with status ${exitCode}`);
    process.exit(exitCode);
  }

  console.log(`PASS  ${name}`);
}

const initialScripts = mode === "fast" ? fastModeScripts : fullModeInitialScripts;
const requiredScripts = mode === "fast" ? fastModeScripts : fullModeRequiredScripts;
const missingScripts = findMissingScripts(
  [...requiredScripts, ...fullModeRequiredTestScripts],
  scripts,
);

if (missingScripts.length > 0) {
  console.error(`FAIL  Required package script is missing: ${missingScripts.join(", ")}`);
  process.exit(1);
}

for (const script of initialScripts) {
  runScript(script);
}

if (mode === "full") {
  runVerificationRunnerSelfTest();

  // Fail closed: a full verification that silently skipped the suite would leave
  // the content control surface unverified.
  runScript("test");

  for (const script of fullModePostScripts) {
    runScript(script);
  }

  console.log("\nPASS  All verification currently implemented has passed");
} else {
  console.log("\nPASS  Fast verification passed");
}
