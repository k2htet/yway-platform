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
  console.error("Usage: tsx scripts/run-verification.ts <fast|full>");
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

function hasScript(name: string): boolean {
  return typeof scripts[name] === "string" && scripts[name].trim().length > 0;
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

const requiredScripts =
  mode === "fast" ? ["lint", "typecheck"] : ["lint", "typecheck", "format:check"];

for (const script of requiredScripts) {
  if (!hasScript(script)) {
    console.error(`FAIL  Required package script is missing: ${script}`);
    process.exit(1);
  }
  runScript(script);
}

if (mode === "full") {
  if (hasScript("test")) {
    runScript("test");
  } else {
    console.log("SKIP  tests — no test script configured yet");
  }

  if (hasScript("verify:invariants")) {
    runScript("verify:invariants");
  } else {
    console.log("SKIP  product invariants — pending Stage 0 F2");
  }

  console.log("\nPASS  All verification currently implemented has passed");
} else {
  console.log("\nPASS  Fast verification passed");
}
