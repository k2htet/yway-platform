import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { UsageError, type CommandResult } from "./args.js";
import {
  formatSecretFindings,
  listGitChangedFiles,
  scanRepositoryForSecrets,
  type SecretScanResult,
} from "../secret-scan.js";

const usage = "Usage: pnpm content:secrets:check [-- --repository-root <path>]";

export interface SecretScanCommandOptions {
  readonly repositoryRoot?: string;
  /** Overridable so a test can supply a change list without a Git repository. */
  readonly readGitChanges?: (repositoryRoot: string) => readonly string[];
}

/**
 * The local secret check.
 *
 * It scans every file under the always-covered roots plus every Git-changed file
 * and reports findings with the value redacted. `YWAY-D005` requires it to run on
 * a real-record change before the first real reviewer record exists, and
 * `verify:full` runs it on every change.
 *
 * It fails closed and offers no way to opt out: if the changed-file half cannot
 * be produced the run fails rather than reporting a clean pass over a smaller set,
 * and there is no flag that skips it. The same decision refuses a pilot session
 * that cannot establish content status.
 */
export function runSecretScanCommand(
  argv: readonly string[],
  options: SecretScanCommandOptions = {},
): CommandResult {
  try {
    let repositoryRoot = resolve(
      options.repositoryRoot ?? fileURLToPath(new URL("../..", import.meta.url)),
    );
    const tokens = [...argv];
    while (tokens[0] === "--") {
      tokens.shift();
    }
    while (tokens.length > 0) {
      const token = tokens.shift()!;
      if (token === "--repository-root") {
        const value = tokens.shift();
        if (value === undefined || value.trim() === "") {
          throw new UsageError('option "--repository-root" requires a value');
        }
        repositoryRoot = resolve(value);
        continue;
      }
      throw new UsageError(`unknown option "${token}"`);
    }

    let changedFiles: readonly string[];
    let gitChangesUnavailable: string | undefined;
    try {
      changedFiles = (options.readGitChanges ?? listGitChangedFiles)(repositoryRoot);
    } catch (error) {
      changedFiles = [];
      gitChangesUnavailable = error instanceof Error ? error.message : String(error);
    }

    const result: SecretScanResult = scanRepositoryForSecrets({
      repositoryRoot,
      ...(changedFiles === undefined ? {} : { changedFiles }),
      ...(gitChangesUnavailable === undefined ? {} : { gitChangesUnavailable }),
    });
    return report(result);
  } catch (error) {
    if (error instanceof UsageError) {
      return { exitCode: 2, stderr: `FAIL  ${error.message}\n${usage}\n` };
    }
    return {
      exitCode: 1,
      stderr: `FAIL  ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}\n`,
    };
  }
}

function report(result: SecretScanResult): CommandResult {
  const skipped =
    result.skippedPaths.length === 0
      ? ""
      : `; ${result.skippedPaths.length} candidate(s) not read (${result.skippedPaths
          .slice(0, 5)
          .map((entry) => `${entry.path}: ${entry.reason}`)
          .join(", ")}${result.skippedPaths.length > 5 ? ", …" : ""})`;
  const note = `NOTE  ${result.scannedPaths.length} file(s) scanned${skipped}; this scan is not a personal-data detector, so owner review remains the control for reviewer names, transliterations, and credential documents`;

  if (result.gitChangesUnavailable !== undefined) {
    // Fail closed rather than passing over a smaller file set. The same decision
    // refuses a session that cannot establish content status.
    return {
      exitCode: 1,
      stderr: [
        `FAIL  the Git change list could not be produced, so this scan did not cover every change: ${result.gitChangesUnavailable}`,
        "      Re-run where Git can list repository changes; there is deliberately no option that skips the changed-file half and still reports a pass",
        formatSecretFindings(result.findings),
        note,
        "",
      ].join("\n"),
    };
  }
  const unreadCandidates = result.skippedPaths.filter((entry) => entry.reason !== "binary file");
  if (unreadCandidates.length > 0) {
    return {
      exitCode: 1,
      stderr: [
        `FAIL  ${unreadCandidates.length} candidate(s) could not be scanned; a clean result cannot be reported while readable files may be unchecked`,
        formatSecretFindings(result.findings),
        note,
        "",
      ].join("\n"),
    };
  }
  if (result.findings.length > 0) {
    return {
      exitCode: 1,
      stderr: [
        `FAIL  ${result.findings.length} scanner-detectable secret(s) found; values are redacted. Remove the value, rotate the credential, and follow the suspected-exposure procedure`,
        formatSecretFindings(result.findings),
        note,
        "",
      ].join("\n"),
    };
  }
  return {
    exitCode: 0,
    stdout: `PASS  no scanner-detectable secret found (${result.scannedPaths.length} file(s) scanned${
      result.skippedPaths.length === 0 ? "" : `; ${result.skippedPaths.length} not read`
    })\n${note}\n`,
  };
}
