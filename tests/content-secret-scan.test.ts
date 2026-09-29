import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test } from "node:test";
import {
  findSecrets,
  listGitChangedFiles,
  maxScannedFileBytes,
  runSecretScanCommand,
  secretRedaction,
} from "../content/index.js";
import { expectExit, expectFailureMessage, makeRoot } from "./content-cli-fixtures.js";
import { commitAll, git, gitTest, initRepository, makeSnapshotRoot } from "./git-fixture.js";

/**
 * The secret check must reject a scanner-detectable credential.
 *
 * Every secret-shaped value below is assembled from fragments at run time. That is
 * deliberate: a literal token in this file would be a real finding for the
 * repository's own scan and for the pinned Gitleaks check in CI, so the test would
 * fail for the wrong reason before it could prove anything.
 */
function assemble(...parts: string[]): string {
  return parts.join("");
}

/** A temp root that the check accepts as this repository. */
function scanRoot(): string {
  const root = makeRoot();
  mkdirSync(join(root, "content"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# temp\n", "utf8");
  writeFileSync(join(root, "package.json"), "{}\n", "utf8");
  return root;
}

const awsAccessKey = assemble("AKI", "A", "IOSFODNN7", "EXAMPLE");
const githubToken = assemble("ghp_", "a1b2c3d4e5", "f6g7h8i9j0", "k1l2m3n4o5p6q7r8");
const openAiKey = assemble("sk-", "abcdefghijklmnopqrstuvwxyz012345");
// Assembled from fragments for the same reason: gitleaks' `generic-api-key` rule
// matches an assigned value in the file bytes, not at run time.
const assignedApiKey = assemble("Xk39fjQ2", "mZ7pLd4s", "T8vB1");
const privateKeyBlock = assemble(
  "-----BEGIN ",
  "RSA ",
  "PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----",
);

test("a scanner-detectable credential is reported without its value", () => {
  const findings = findSecrets({
    path: "content/eligibility/reviewer-handle-a7.json",
    text: `{"evidenceReferences":["${awsAccessKey}"]}`,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]!.rule, "aws-access-key-id");
  assert.equal(findings[0]!.line, 1);
  assert.equal(findings[0]!.redaction, secretRedaction);
  assert.equal(JSON.stringify(findings[0]).includes(awsAccessKey), false);
});

test("each high-confidence credential format is detected", () => {
  const cases: readonly {
    readonly label: string;
    readonly value: string;
    readonly rule: string;
  }[] = [
    { label: "aws access key id", value: awsAccessKey, rule: "aws-access-key-id" },
    { label: "github token", value: githubToken, rule: "github-token" },
    { label: "provider api key", value: openAiKey, rule: "openai-api-key" },
    { label: "private key block", value: privateKeyBlock, rule: "private-key-block" },
  ];
  for (const testCase of cases) {
    const findings = findSecrets({ path: "content/packs/x/1.yaml", text: testCase.value });
    assert.deepEqual(
      findings.map((finding) => finding.rule),
      [testCase.rule],
      `${testCase.label} was not detected`,
    );
  }
});

test("an assigned credential value is detected in a configuration-style line", () => {
  const findings = findSecrets({
    path: "content/packs/retail-assistant/notes.yaml",
    text: [`apiKey: "${assignedApiKey}"`, "summary: A pack about trying a shift."].join("\n"),
  });
  assert.deepEqual(
    findings.map((finding) => [finding.rule, finding.line]),
    [["assigned-credential", 1]],
  );
});

test("placeholders and prose about credentials are not findings", () => {
  const benign = [
    "password: <your-password-here>",
    'api_key: "changeme"',
    "token: xxxxxxxxxxxxxxxx",
    "The owner-held private review record holds the reviewer's name and qualification.",
    "Never store a credential document in this repository; escalate instead.",
    "secret: the owner record outside Git",
  ].join("\n");
  assert.deepEqual(
    findSecrets({ path: "docs/operations/CONTENT-LIFECYCLE-RUNBOOK.md", text: benign }),
    [],
  );
});

test("the secret check fails a real-record change that carries a credential", () => {
  const root = scanRoot();
  mkdirSync(join(root, "content", "packs", "retail-assistant"), { recursive: true });
  writeFileSync(
    join(root, "content", "packs", "retail-assistant", "1.yaml"),
    [
      "schemaVersion: 1",
      "id: retail-assistant",
      "version: 1",
      'reviewerToken: "' + awsAccessKey + '"',
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runSecretScanCommand([], { repositoryRoot: root, readGitChanges: () => [] });
  expectExit(result, 1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.match(output, /scanner-detectable secret/);
  assert.match(output, /rule=aws-access-key-id/);
  assert.match(output, /value=<redacted>/);
  // The report must never carry the value it found.
  assert.equal(output.includes(awsAccessKey), false);
  // And it states the limit that makes no larger claim than it keeps.
  assert.match(output, /not a personal-data detector/);
});

test("a repository with no detectable secret passes the secret check", () => {
  const root = scanRoot();
  mkdirSync(join(root, "content", "eligibility"), { recursive: true });
  writeFileSync(
    join(root, "content", "eligibility", "reviewer-handle-a7.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        actorId: "reviewer-handle-a7",
        fixtureOnly: false,
        occupations: ["retail-assistant"],
        status: "active",
        verification: { method: "manual", status: "verified", verifiedOn: "2026-09-01" },
        validFrom: "2026-01-01",
        validUntil: "2031-12-31",
        evidenceReferences: ["owner-record:vetting-2026-001"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const result = runSecretScanCommand([], { repositoryRoot: root, readGitChanges: () => [] });
  expectExit(result, 0);
  assert.match(result.stdout ?? "", /no scanner-detectable secret found/);
  assert.match(result.stdout ?? "", /not a personal-data detector/);
});

test("an unavailable Git change list fails the check instead of passing a smaller one", () => {
  const root = scanRoot();
  const result = runSecretScanCommand([], {
    repositoryRoot: root,
    readGitChanges: () => {
      throw new Error("git status could not list repository changes: not a git repository");
    },
  });
  // Fail closed: a green pass over a smaller file set is exactly the outcome this
  // check must not produce, and there is no option that skips the changed half.
  expectExit(result, 1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.match(output, /Git change list could not be produced/);
  assert.match(output, /no option that skips the changed-file half/);
});

test("files that are not read are reported rather than counted as clean", () => {
  const root = scanRoot();
  mkdirSync(join(root, "artifacts", "bundles", "retail-assistant", "1"), { recursive: true });
  // A binary file, which is not text and cannot be scanned as text.
  writeFileSync(join(root, "artifacts", "icon.bin"), Buffer.from([0x00, 0x01, 0x02, 0x00]));
  const result = runSecretScanCommand([], { repositoryRoot: root, readGitChanges: () => [] });
  expectExit(result, 0);
  const output = result.stdout ?? "";
  assert.match(output, /1 candidate\(s\) not read/);
  assert.match(output, /icon\.bin: binary file/);
});

test("an oversized readable candidate fails rather than reporting a clean scan", () => {
  const root = scanRoot();
  const path = join(root, "content", "large-review.txt");
  writeFileSync(path, `${"a".repeat(maxScannedFileBytes)}\n${awsAccessKey}\n`, "utf8");
  const result = runSecretScanCommand([], { repositoryRoot: root, readGitChanges: () => [] });
  expectExit(result, 1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.match(output, /large-review\.txt/);
  assert.match(output, /not read/);
  assert.doesNotMatch(output, /PASS\s+no scanner-detectable secret/);
});

test("this repository itself carries no scanner-detectable secret", () => {
  // The same scan `verify:full` runs, over the real working tree. Reading the
  // change list from a fixed empty list keeps this test independent of Git.
  const result = runSecretScanCommand([], {
    repositoryRoot: fileURLToPath(new URL("..", import.meta.url)),
    readGitChanges: () => [],
  });
  expectExit(result, 0);
  assert.match(result.stdout ?? "", /no scanner-detectable secret found/);
});

test("the secret check refuses an unknown option with usage exit 2", () => {
  const result = runSecretScanCommand(["--nope"], {
    repositoryRoot: scanRoot(),
    readGitChanges: () => [],
  });
  expectExit(result, 2);
  expectFailureMessage(result, 'unknown option "--nope"');
});

test("the secret check refuses a directory it does not recognise instead of passing it", () => {
  // Pointing the check at an empty directory must not produce a green pass: the
  // option is not a way to declare a smaller scope complete.
  const result = runSecretScanCommand([], {
    repositoryRoot: makeRoot(),
    readGitChanges: () => [],
  });
  expectExit(result, 1);
  expectFailureMessage(result, "does not look like this repository");
});

gitTest("a changed file outside the always-scanned roots is still scanned", () => {
  // The changed-file half is the only coverage for a top-level file or a directory
  // added later, so it is exercised against real Git rather than only through the
  // injected change list.
  const root = makeSnapshotRoot();
  mkdirSync(join(root, "content"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# temp\n", "utf8");
  writeFileSync(join(root, "package.json"), "{}\n", "utf8");
  initRepository(root);
  commitAll(root, "empty repository");

  const outside = join(root, "new-app-config.json");
  writeFileSync(
    outside,
    `${JSON.stringify({ apiKey: `Xk39fjQ2${"mZ7pLd4s"}${"T8vB1"}` }, null, 2)}\n`,
    "utf8",
  );
  git(root, "add", "-A");
  const result = runSecretScanCommand([], { repositoryRoot: root });
  expectExit(result, 1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.match(output, /new-app-config\.json:2 rule=assigned-credential value=<redacted>/);
  assert.equal(output.includes("Xk39fjQ2"), false, "the report must not carry the value");

  // Negative control: the same file no longer reported once Git does not consider it
  // changed and it is outside the always-scanned roots, which is what proves the
  // finding arrived through the changed-file half.
  git(root, "reset", "--hard", "HEAD");
  const clean = runSecretScanCommand([], { repositoryRoot: root });
  expectExit(clean, 0);
});

gitTest("a changed non-ASCII path outside the always-scanned roots is scanned", () => {
  const root = makeSnapshotRoot();
  mkdirSync(join(root, "content"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# temp\n", "utf8");
  writeFileSync(join(root, "package.json"), "{}\n", "utf8");
  initRepository(root);
  commitAll(root, "empty repository");

  const path = "သုံးသပ်ချက်.txt";
  writeFileSync(join(root, path), `${awsAccessKey}\n`, "utf8");
  git(root, "add", "-A");
  assert.deepEqual(listGitChangedFiles(root), [path]);
  const result = runSecretScanCommand([], { repositoryRoot: root });
  expectExit(result, 1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.match(output, /rule=aws-access-key-id/);
  assert.equal(output.includes(awsAccessKey), false);
});

gitTest("a renamed path is scanned at its destination", () => {
  const root = makeSnapshotRoot();
  mkdirSync(join(root, "content"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# temp\n", "utf8");
  writeFileSync(join(root, "package.json"), "{}\n", "utf8");
  writeFileSync(join(root, "old-config.txt"), "safe\n", "utf8");
  initRepository(root);
  commitAll(root, "initial files");

  const destination = "သုံးသပ်ချက်.txt";
  git(root, "mv", "old-config.txt", destination);
  writeFileSync(join(root, destination), `${awsAccessKey}\n`, "utf8");
  assert.deepEqual(listGitChangedFiles(root), [destination]);
  const result = runSecretScanCommand([], { repositoryRoot: root });
  expectExit(result, 1);
  assert.match(result.stderr ?? "", /rule=aws-access-key-id/);
});
