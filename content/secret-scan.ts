import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The repository's own secret scan.
 *
 * `YWAY-D005` requires a secret-scan check to run on a real-record change before
 * the first real reviewer record exists, because nothing in the content system can
 * detect a credential: the evidence character class forbids paths and whitespace
 * but not a token, and no gate reads an evidence reference at all. This module is
 * the local half of that control, so it runs with no network and no external
 * binary; the pinned Gitleaks release in `scripts/gitleaks-scan.sh` is the broader
 * half and runs in CI.
 *
 * **What it does not do, stated plainly.** These are high-confidence *format*
 * rules for credentials and private keys. They are not a personal-data detector.
 * Passing this scan does not establish that a reviewer name, a transliteration, a
 * workplace, a phone number, an address, or a credential document is absent from
 * the repository. That exclusion remains owner-review-enforced, exactly as
 * `YWAY-D005` states.
 */

export interface ScannedFile {
  /** Repository-relative path, used only for reporting. */
  readonly path: string;
  readonly text: string;
}

export interface SecretFinding {
  readonly rule: string;
  readonly path: string;
  readonly line: number;
  /** A fixed marker. The matched text is never carried into a report. */
  readonly redaction: string;
}

export const secretRedaction = "<redacted>";

interface SecretRule {
  readonly id: string;
  readonly pattern: RegExp;
}

/**
 * High-confidence credential formats. Every pattern here is anchored on a provider
 * key format rather than on a loose word like "secret", so ordinary prose and
 * documentation about this pipeline are not findings.
 */
const secretRules: readonly SecretRule[] = [
  {
    id: "private-key-block",
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  },
  { id: "aws-access-key-id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "aws-secret-access-key", pattern: /\baws_secret_access_key\b\s*[:=]\s*\S{20,}/i },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: "github-fine-grained-token", pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { id: "slack-token", pattern: /\bxox[abopsr]-[A-Za-z0-9-]{10,}\b/ },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: "npm-access-token", pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { id: "stripe-live-secret-key", pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { id: "openai-api-key", pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { id: "bearer-token-header", pattern: /\bAuthorization:\s*Bearer\s+[A-Za-z0-9._~+/-]{20,}=*/ },
  {
    id: "connection-string-password",
    pattern: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis):\/\/[^:\s]+:[^@\s]{8,}@/,
  },
];

/** Values that look like placeholders rather than credentials. */
const placeholderValue =
  /^(?:x{4,}|\*{4,}|\.{3,}|<[^>]*>|changeme|change-me|placeholder|example|redacted|your[-_ ]?\w+|todo|none|null|undefined|true|false|test|dummy)/i;

const assignmentPattern =
  /^[^\S\n]*["']?(?:api[_-]?key|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|credential)["']?[^\S\n]*[:=][^\S\n]*["']?([^\s"',;]{12,})/i;

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }
  return line;
}

/** Placeholder-looking assignment values are not treated as credentials. */
function looksLikePlaceholder(value: string): boolean {
  return placeholderValue.test(value);
}

/**
 * Reports every high-confidence credential format in one file.
 *
 * The matched text never leaves this function: a finding carries the rule id, the
 * path, the line, and a fixed redaction marker, so a report cannot leak the value
 * it found.
 */
export function findSecrets(file: ScannedFile): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const rule of secretRules) {
    const pattern = new RegExp(
      rule.pattern.source,
      rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`,
    );
    for (const match of file.text.matchAll(pattern)) {
      findings.push({
        rule: rule.id,
        path: file.path,
        line: lineOf(file.text, match.index),
        redaction: secretRedaction,
      });
    }
  }

  file.text.split("\n").forEach((line, offset) => {
    const match = assignmentPattern.exec(line);
    if (match === null || match[1] === undefined) {
      return;
    }
    const value = match[1];
    if (looksLikePlaceholder(value) || !/[A-Za-z]/.test(value)) {
      return;
    }
    const hasDigit = /[0-9]/.test(value);
    const hasMixedCase = /[a-z]/.test(value) && /[A-Z]/.test(value);
    if (!hasDigit && !hasMixedCase) {
      return;
    }
    findings.push({
      rule: "assigned-credential",
      path: file.path,
      line: offset + 1,
      redaction: secretRedaction,
    });
  });

  return findings.sort(
    (left, right) => left.line - right.line || left.rule.localeCompare(right.rule),
  );
}

export function findSecretsInFiles(files: readonly ScannedFile[]): SecretFinding[] {
  return files.flatMap(findSecrets);
}

/** The largest file this scan will read; artifacts and sources are far smaller. */
export const maxScannedFileBytes = 1024 * 1024;

/** Files this scan always covers, whatever Git says about them. */
/**
 * Directories scanned on every run, whatever Git reports.
 *
 * A top-level file, an ignored path such as `.env`, and a directory added later are
 * covered only by the changed-file half — which is empty on a clean CI checkout, and
 * never lists an ignored file. The runbook states that limit rather than implying
 * whole-repository coverage.
 */
export const secretScanRoots: readonly string[] = [
  "content",
  "artifacts",
  "docs",
  "scripts",
  "tests",
  ".github",
];

/** Markers that a directory is this repository rather than an arbitrary path. */
const repositoryRootMarkers: readonly string[] = ["AGENTS.md", "content", "package.json"];

function listFilesUnder(root: string, directory: string): string[] {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) {
    return [];
  }
  const collected: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      collected.push(...listFilesUnder(root, child));
      continue;
    }
    if (entry.isFile()) {
      collected.push(child);
    }
  }
  return collected;
}

/**
 * Lists the files Git considers changed: staged, unstaged, and untracked-but-not-
 * ignored. This is the "Git changes" half of the scan.
 */
/**
 * Git variables that would let a local repository stand in for this one. They are
 * cleared rather than inherited, and replace-objects is disabled, so a hostile local
 * environment cannot substitute another repository's change list and turn a wider
 * scan into a narrower one. Mirrors the hardening in `content/snapshot-verify.ts`.
 */
const neutralizedGitEnvironment = {
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
  GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
  GIT_REPLACE_REF_BASE: undefined,
  GIT_CEILING_DIRECTORIES: undefined,
  GIT_DISCOVERY_ACROSS_FILESYSTEM: undefined,
} as const;

export function listGitChangedFiles(repositoryRoot: string): string[] {
  const result = spawnSync(
    "git",
    ["--no-replace-objects", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      shell: false,
      maxBuffer: 16 * 1024 * 1024,
      timeout: 60_000,
      env: { ...process.env, ...neutralizedGitEnvironment },
    },
  );
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `git status could not list repository changes: ${result.error?.message ?? result.stderr?.trim() ?? "unknown git failure"}`,
    );
  }
  const paths = new Set<string>();
  const records = result.stdout.split("\0");
  if (records.pop() !== "") {
    throw new Error("git status returned an unterminated path record");
  }
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.length < 4 || record[2] !== " ") {
      throw new Error("git status returned a malformed path record");
    }
    // In porcelain -z, the destination of a rename/copy comes first. Git then
    // emits the source as a second NUL-delimited field; only the destination is
    // a candidate for scanning.
    if (record[0] === "R" || record[0] === "C" || record[1] === "R" || record[1] === "C") {
      index += 1;
      if (index >= records.length) {
        throw new Error("git status returned a rename/copy without its source path");
      }
    }
    paths.add(record.slice(3));
  }
  return [...paths].sort();
}

export interface SecretScanInput {
  readonly repositoryRoot: string;
  /** When omitted, the changed-file list is read from Git. */
  readonly changedFiles?: readonly string[];
  /** When omitted, {@link secretScanRoots} are walked. */
  readonly roots?: readonly string[];
  /** Set when Git could not be consulted, so the report can say so. */
  readonly gitChangesUnavailable?: string;
}

export interface SecretScanResult {
  readonly findings: readonly SecretFinding[];
  readonly scannedPaths: readonly string[];
  /** Candidates that exist but were not read, with the reason. Never silently zero. */
  readonly skippedPaths: readonly { readonly path: string; readonly reason: string }[];
  readonly gitChangesUnavailable?: string;
}

/**
 * Scans the always-covered roots plus every Git-changed file, deduplicating by
 * path so a changed content file is read once.
 */
export function assertYwayRepositoryRoot(repositoryRoot: string): void {
  for (const marker of repositoryRootMarkers) {
    if (!existsSync(join(repositoryRoot, marker))) {
      throw new Error(
        `${repositoryRoot} does not look like this repository (no ${marker}); the secret check refuses to report a pass over a directory it does not recognise`,
      );
    }
  }
}

export function scanRepositoryForSecrets(input: SecretScanInput): SecretScanResult {
  const root = input.repositoryRoot;
  assertYwayRepositoryRoot(root);
  const roots = input.roots ?? secretScanRoots;
  const candidates = new Set<string>();
  for (const directory of roots) {
    for (const path of listFilesUnder(root, directory)) {
      candidates.add(path);
    }
  }

  let gitChangesUnavailable = input.gitChangesUnavailable;
  let changed: readonly string[] = input.changedFiles ?? [];
  if (input.changedFiles === undefined) {
    try {
      changed = listGitChangedFiles(root);
    } catch (error) {
      changed = [];
      gitChangesUnavailable = error instanceof Error ? error.message : String(error);
    }
  }
  for (const path of changed) {
    const normalized = path;
    if (normalized.startsWith("..") || normalized.startsWith("/") || normalized.includes("..")) {
      continue;
    }
    if (existsSync(join(root, ...normalized.split("/")))) {
      candidates.add(normalized);
    }
  }

  const files: ScannedFile[] = [];
  const scannedPaths: string[] = [];
  const skippedPaths: { path: string; reason: string }[] = [];
  for (const path of [...candidates].sort()) {
    const absolute = join(root, ...path.split("/"));
    if (!existsSync(absolute)) {
      continue;
    }
    let text: string;
    try {
      if (statSync(absolute).size > maxScannedFileBytes) {
        skippedPaths.push({ path, reason: `larger than ${maxScannedFileBytes} bytes` });
        continue;
      }
      text = readFileSync(absolute, "utf8");
    } catch (error) {
      skippedPaths.push({
        path,
        reason: error instanceof Error ? error.message : "unreadable",
      });
      continue;
    }
    if (text.includes("\u0000")) {
      skippedPaths.push({ path, reason: "binary file" });
      continue;
    }
    files.push({ path, text });
    scannedPaths.push(path);
  }

  return {
    findings: findSecretsInFiles(files),
    scannedPaths,
    skippedPaths,
    ...(gitChangesUnavailable === undefined ? {} : { gitChangesUnavailable }),
  };
}

/** Renders findings without any matched value. */
export function formatSecretFindings(findings: readonly SecretFinding[]): string {
  return findings
    .map(
      (finding) =>
        `  ${finding.path}:${finding.line} rule=${finding.rule} value=${finding.redaction}`,
    )
    .join("\n");
}
