import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test, type TestContext } from "node:test";

/**
 * Hermetic git invocation for the temporary repositories.
 *
 * Global and system git configuration, hooks, and templates are neutralized so a
 * developer's or CI runner's own settings cannot make these tests fail or change
 * their meaning.
 */
const emptyGitConfig = join(tmpdir(), "yway-empty-git-config");
const emptyHooks = join(tmpdir(), "yway-empty-git-hooks");

function gitEnv(): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: emptyGitConfig,
    GIT_CONFIG_SYSTEM: emptyGitConfig,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_DATE: "2026-09-24T00:00:00Z",
    GIT_COMMITTER_DATE: "2026-09-24T00:00:00Z",
  };
}

export function git(root: string, ...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      `core.hooksPath=${emptyHooks}`,
      "-c",
      "commit.gpgsign=false",
      "-c",
      "init.templateDir=",
      ...args,
    ],
    { cwd: root, encoding: "utf8", env: gitEnv() },
  ).trim();
}

export function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { encoding: "utf8", env: gitEnv() });
    return true;
  } catch {
    return false;
  }
}

const temporaryRoots: string[] = [];

after(() => {
  for (const root of temporaryRoots) {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Creates a temporary repository root that is removed when the suite finishes. */
export function makeSnapshotRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "yway-snapshot-"));
  temporaryRoots.push(root);
  return root;
}

export function commitAll(root: string, message: string): string {
  git(root, "add", "-A");
  git(root, "commit", "-qm", message);
  return git(root, "rev-parse", "HEAD");
}

export function initRepository(root: string): void {
  git(root, "init", "-q", "--template=");
  git(root, "config", "user.email", "fixture@example.invalid");
  git(root, "config", "user.name", "Fixture Operator");
}

// Git-backed tests need a real Git executable and permission to spawn it. When
// that is unavailable they are reported as skipped, never as passed.
type GitTestFn = (t: TestContext) => void | Promise<void>;
export const gitTest: (name: string, run: GitTestFn) => void = gitAvailable()
  ? (test as unknown as (name: string, run: GitTestFn) => void)
  : (name, run) => test.skip(`${name} (git unavailable)`, run as () => void);
