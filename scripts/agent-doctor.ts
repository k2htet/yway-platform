import { accessSync, constants, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, parse, resolve } from "node:path";
import { spawnSync } from "node:child_process";

interface PackageManifest {
  engines?: {
    node?: unknown;
  };
  packageManager?: unknown;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
}

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const packageJsonPath = resolve(repositoryRoot, "package.json");
let blockingFailures = 0;

function report(level: "PASS" | "FAIL" | "WARN" | "INFO", message: string): void {
  console.log(`${level.padEnd(5)} ${message}`);
  if (level === "FAIL") {
    blockingFailures += 1;
  }
}

function isReadable(relativePath: string): boolean {
  try {
    accessSync(resolve(repositoryRoot, relativePath), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function checkReadable(relativePath: string, label: string): void {
  if (isReadable(relativePath)) {
    report("PASS", `${label} found`);
  } else {
    report("FAIL", `${label} is missing or unreadable (${relativePath})`);
  }
}

function parseMajor(version: string): number | undefined {
  const match = /^v?(\d+)/.exec(version.trim());
  if (!match?.[1]) {
    return undefined;
  }

  return Number.parseInt(match[1], 10);
}

function satisfiesMajorPolicy(major: number, policy: string): boolean | undefined {
  const tokens = policy.trim().split(/\s+/);
  if (tokens.length === 0) {
    return undefined;
  }

  return tokens.every((token) => {
    const match = /^(>=|<=|>|<|=)?(\d+)$/.exec(token);
    if (!match?.[2]) {
      return false;
    }

    const expectedMajor = Number.parseInt(match[2], 10);
    switch (match[1] ?? "=") {
      case ">=":
        return major >= expectedMajor;
      case "<=":
        return major <= expectedMajor;
      case ">":
        return major > expectedMajor;
      case "<":
        return major < expectedMajor;
      default:
        return major === expectedMajor;
    }
  });
}

function run(command: string, args: string[]): { ok: boolean; output: string } {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const errorOutput = result.error ? `${result.error.name}: ${result.error.message}\n` : "";

  return {
    ok: result.error === undefined && result.status === 0,
    output: `${errorOutput}${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function commandName(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function pnpmVersionFromEnvironment(): string | undefined {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) {
    return undefined;
  }

  const match = /(?:^|\s)pnpm\/([^\s]+)/.exec(userAgent);
  return match?.[1];
}

function pnpmVersionFromExecPath(): string | undefined {
  const execPath = process.env.npm_execpath;
  if (!execPath) {
    return undefined;
  }

  let directory = dirname(execPath);
  const root = parse(directory).root;

  while (true) {
    try {
      const candidate = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8")) as {
        name?: unknown;
        version?: unknown;
      };

      if (candidate.name === "pnpm" && typeof candidate.version === "string") {
        return candidate.version;
      }
    } catch {
      // Keep walking toward the filesystem root.
    }

    if (directory === root) {
      return undefined;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
}

let manifest: PackageManifest | undefined;
try {
  manifest = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageManifest;
  report("PASS", "package.json is readable");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  report("FAIL", `package.json could not be read: ${message}`);
}

const nodePolicy = manifest?.engines?.node;
if (typeof nodePolicy !== "string") {
  report("FAIL", "package.json does not declare a Node engine policy");
} else {
  const runningMajor = parseMajor(process.versions.node);
  const satisfiesPolicy =
    runningMajor === undefined ? undefined : satisfiesMajorPolicy(runningMajor, nodePolicy);

  if (satisfiesPolicy === true) {
    report("PASS", `Node ${process.version} satisfies ${nodePolicy}`);
  } else if (satisfiesPolicy === false) {
    report("FAIL", `Node ${process.version} does not satisfy ${nodePolicy}`);
  } else {
    report("FAIL", `Node policy could not be evaluated: ${nodePolicy}`);
  }
}

const packageManager = manifest?.packageManager;
const packageManagerMatch =
  typeof packageManager === "string" ? /^pnpm@(.+)$/.exec(packageManager) : undefined;
if (!packageManagerMatch?.[1]) {
  report("FAIL", "package.json does not declare an exact pnpm packageManager version");
} else {
  const expectedPnpmVersion = packageManagerMatch[1];
  const detectedPnpmVersion = pnpmVersionFromEnvironment() ?? pnpmVersionFromExecPath();

  if (detectedPnpmVersion === undefined || detectedPnpmVersion.length === 0) {
    report(
      "FAIL",
      "pnpm version could not be determined from the active pnpm lifecycle environment",
    );
  } else if (detectedPnpmVersion !== expectedPnpmVersion) {
    report(
      "FAIL",
      `pnpm ${detectedPnpmVersion} does not match package.json (${expectedPnpmVersion})`,
    );
  } else {
    report("PASS", `pnpm ${detectedPnpmVersion} matches package.json`);
  }
}

if (!isReadable("node_modules")) {
  report("FAIL", "Dependencies are not installed (node_modules is missing or unreadable)");
} else {
  const declaredDependencies = Object.keys({
    ...manifest?.dependencies,
    ...manifest?.devDependencies,
  }).sort();
  const missingDependencies = declaredDependencies.filter(
    (dependency) => !isReadable(resolve("node_modules", dependency)),
  );
  const requiredBins = ["eslint", "prettier", "tsc"];
  const missingBins = requiredBins.filter(
    (bin) =>
      ![bin, `${bin}.cmd`, `${bin}.ps1`].some((candidate) =>
        isReadable(resolve("node_modules", ".bin", candidate)),
      ),
  );

  if (missingDependencies.length > 0 || missingBins.length > 0) {
    const details = [
      missingDependencies.length > 0
        ? `missing packages: ${missingDependencies.join(", ")}`
        : undefined,
      missingBins.length > 0 ? `missing commands: ${missingBins.join(", ")}` : undefined,
    ]
      .filter((detail): detail is string => detail !== undefined)
      .join("; ");
    report("FAIL", `Installed dependencies are incomplete (${details})`);
  } else {
    report("PASS", "Installed dependencies are available for repository commands");
  }
}

const criticalSources: Array<[string, string]> = [
  ["AGENTS.md", "Agent instructions"],
  ["docs/product/PRODUCT_VISION.md", "Product Vision"],
  ["docs/product/PRODUCT_CONTRACTS.md", "Product Contracts"],
  ["docs/architecture/ARCHITECTURE.md", "Architecture document"],
  ["docs/decisions/000-TEMPLATE.md", "Decision template"],
  ["docs/decisions/001-foundation-tooling.md", "Foundation tooling decision"],
  ["docs/exec-plans/active", "Active execution plans directory"],
];

const harnessSources: Array<[string, string]> = [
  [".codex/config.toml", "Codex configuration"],
  [".codex/agents/product-integrity-reviewer.toml", "Codex product integrity reviewer"],
  [".codex/agents/architecture-reviewer.toml", "Codex architecture reviewer"],
  [".codex/agents/security-privacy-reviewer.toml", "Codex security/privacy reviewer"],
  [".codex/agents/test-reviewer.toml", "Codex test reviewer"],
  [".opencode/agents/product-integrity-reviewer.md", "OpenCode product integrity reviewer"],
  [".opencode/agents/architecture-reviewer.md", "OpenCode architecture reviewer"],
  [".opencode/agents/security-privacy-reviewer.md", "OpenCode security/privacy reviewer"],
  [".opencode/agents/test-reviewer.md", "OpenCode test reviewer"],
  [".agents/skills/yway-exec-plan/SKILL.md", "Shared execution-plan skill"],
  [".agents/skills/yway-product-integrity/SKILL.md", "Shared product-integrity skill"],
  [".agents/skills/yway-pr-review/SKILL.md", "Shared PR-review skill"],
];

for (const [relativePath, label] of [...criticalSources, ...harnessSources]) {
  checkReadable(relativePath, label);
}

const gitBranch = run("git", ["branch", "--show-current"]);
if (!gitBranch.ok) {
  report("WARN", "Git repository information is unavailable");
} else {
  report("INFO", `Git branch: ${gitBranch.output || "detached HEAD"}`);

  const gitStatus = run("git", ["status", "--porcelain"]);
  if (!gitStatus.ok) {
    report("WARN", "Git working tree status could not be determined");
  } else if (gitStatus.output) {
    report("WARN", "Git working tree has changes");
  } else {
    report("INFO", "Git working tree is clean");
  }

  const gitRemotes = run("git", ["remote"]);
  if (!gitRemotes.ok) {
    report("WARN", "Git remotes could not be determined");
  } else if (gitRemotes.output) {
    report("INFO", `Git remote(s): ${gitRemotes.output.split(/\s+/).join(", ")}`);
  } else {
    report("INFO", "Git remote not configured yet (owned by Stage 0 G3)");
  }
}

for (const [command, label] of [
  ["codex", "Codex CLI"],
  ["opencode", "OpenCode CLI"],
] as const) {
  const version = run(commandName(command), ["--version"]);
  if (version.ok) {
    report("INFO", `${label} available: ${version.output}`);
  } else {
    report("INFO", `${label} not available in this environment (optional)`);
  }
}

console.log("");
if (blockingFailures === 0) {
  console.log("READY");
} else {
  console.log(`NOT READY — ${blockingFailures} blocking check(s) failed`);
  process.exitCode = 1;
}
