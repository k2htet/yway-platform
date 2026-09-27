import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  localizedContentSchema,
  packSourceSchema,
  parseStrictYaml,
  practitionerEligibilitySchema,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runRetireCommand,
  runStatusCommand,
  runVerifyCommand,
  strictParse,
  type CommandResult,
} from "../content/index.js";
import { makeRoot } from "./content-cli-fixtures.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const operationsDirectory = join(repositoryRoot, "docs", "operations");
const guidePath = join(operationsDirectory, "CONTENT-OPERATIONS-GUIDE.md");
const policyPath = join(operationsDirectory, "PRACTITIONER-QUALIFICATION-POLICY.md");
const runbookPath = join(operationsDirectory, "CONTENT-LIFECYCLE-RUNBOOK.md");

const packageScripts: Readonly<Record<string, string>> = (
  JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }
).scripts;

const contentCommands: Readonly<Record<string, (argv: readonly string[]) => CommandResult>> = {
  "content:new-version": (argv) => runNewVersionCommand(argv, { repositoryRoot: makeRoot() }),
  "content:attest": (argv) => runAttestCommand(argv, { repositoryRoot: makeRoot() }),
  "content:status": (argv) => runStatusCommand(argv, { repositoryRoot: makeRoot() }),
  "content:release": (argv) => runReleaseCommand(argv, { repositoryRoot: makeRoot() }),
  "content:retire": (argv) => runRetireCommand(argv, { repositoryRoot: makeRoot() }),
  "content:verify": (argv) => runVerifyCommand(argv, { repositoryRoot: makeRoot() }),
};

function fencedBlocks(markdown: string, language: string): string[] {
  return [...markdown.matchAll(new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, "g"))].map(
    (match) => match[1] ?? "",
  );
}

function shellBlocks(markdown: string): string[] {
  return fencedBlocks(markdown, "sh");
}

function joinContinuations(block: string): string[] {
  const logical: string[] = [];
  let pending = "";
  for (const raw of block.split("\n")) {
    const line = raw.trimEnd();
    if (line.endsWith("\\")) {
      pending += `${line.slice(0, -1)} `;
      continue;
    }
    logical.push(`${pending}${line}`.trim());
    pending = "";
  }
  if (pending !== "") {
    logical.push(pending.trim());
  }
  return logical;
}

/** Splits a shell word list into argv, honouring double-quoted values. */
function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;
  let started = false;
  for (const character of line) {
    if (character === '"') {
      quoted = !quoted;
      started = true;
      continue;
    }
    if (!quoted && /\s/.test(character)) {
      if (started) {
        tokens.push(current);
        current = "";
        started = false;
      }
      continue;
    }
    current += character;
    started = true;
  }
  if (started) {
    tokens.push(current);
  }
  return tokens;
}

/**
 * Collects one argv per documented `pnpm content:*` invocation.
 *
 * Only `sh` fences are read, so transcript blocks stay inert, and a trailing
 * backslash continues a line the way a shell would.
 */
function documentedInvocations(markdown: string): { source: string; argv: string[] }[] {
  const invocations: { source: string; argv: string[] }[] = [];
  for (const block of shellBlocks(markdown)) {
    for (const line of joinContinuations(block)) {
      const withoutComment = line.replace(/\s+#.*$/, "").trim();
      if (!withoutComment.startsWith("pnpm ")) {
        continue;
      }
      const tokens = tokenize(withoutComment).slice(1);
      while (tokens[0] === "--") {
        tokens.shift();
      }
      invocations.push({ source: withoutComment, argv: tokens });
    }
  }
  return invocations;
}

function documentedTranscriptInvocations(markdown: string): { source: string; argv: string[] }[] {
  const invocations: { source: string; argv: string[] }[] = [];
  for (const block of fencedBlocks(markdown, "text")) {
    const commandLines: string[] = [];
    let pending = "";
    for (const raw of block.split("\n")) {
      const line = raw.trimEnd();
      if (line.startsWith("$ pnpm ")) {
        pending = line.slice(2);
      } else if (pending === "") {
        continue;
      } else {
        pending += ` ${line.trim()}`;
      }
      if (line.endsWith("\\")) {
        pending = pending.slice(0, -1).trimEnd();
      } else {
        commandLines.push(pending);
        pending = "";
      }
    }
    for (const line of commandLines) {
      const tokens = tokenize(line).slice(1);
      invocations.push({ source: line, argv: tokens });
    }
  }
  return invocations;
}

describe("content operations documentation", () => {
  test("the authoring guide's Pack template satisfies the Pack source schema", () => {
    const blocks = fencedBlocks(readFileSync(guidePath, "utf8"), "yaml");
    const packTemplates = blocks.filter((block) => block.includes("canonicalLanguage:"));
    assert.equal(packTemplates.length, 1, "expected exactly one Pack source template");
    const pack = parseStrictYaml(packSourceSchema, packTemplates[0]!);
    assert.equal(pack.fixtureOnly, true);
    assert.equal(pack.canonicalLanguage, "en-simple");
    assert.equal(pack.experiments.length >= 1, true);
    for (const experiment of pack.experiments) {
      for (const part of [
        "question",
        "action",
        "timebox",
        "whatToNotice",
        "reflection",
        "nextFork",
      ] as const) {
        assert.equal(
          experiment[part].trim().length > 0,
          true,
          `experiment ${experiment.id} is missing ${part}`,
        );
      }
    }
  });

  test("the authoring guide's localization template satisfies the localized content schema", () => {
    const blocks = fencedBlocks(readFileSync(guidePath, "utf8"), "yaml");
    const localizedTemplates = blocks.filter((block) => block.includes("locale: my"));
    assert.equal(localizedTemplates.length, 1, "expected exactly one localization template");
    const localized = parseStrictYaml(localizedContentSchema, localizedTemplates[0]!);
    assert.equal(localized.locale, "my");
    assert.equal(localized.experiments.length >= 1, true);
  });

  test("the qualification policy's eligibility record satisfies the eligibility schema", () => {
    const blocks = fencedBlocks(readFileSync(policyPath, "utf8"), "json");
    const eligibilityTemplates = blocks.filter((block) => block.includes('"actorId"'));
    assert.equal(eligibilityTemplates.length, 1, "expected exactly one eligibility template");
    const eligibility = strictParse(
      practitionerEligibilitySchema,
      JSON.parse(eligibilityTemplates[0]!) as unknown,
    );
    assert.equal(eligibility.verification.method, "manual");
    assert.equal(
      eligibility.evidenceReferences.every((reference) => reference.startsWith("fixture:")),
      true,
      "fixture eligibility evidence must use fixture: references",
    );
  });

  test("the three templates register, pass their documented approvals, and release together", () => {
    const guide = readFileSync(guidePath, "utf8");
    const policy = readFileSync(policyPath, "utf8");
    const packYaml = fencedBlocks(guide, "yaml").find((block) =>
      block.includes("canonicalLanguage:"),
    )!;
    const localizedYaml = fencedBlocks(guide, "yaml").find((block) =>
      block.includes("locale: my"),
    )!;
    const eligibilityJson = fencedBlocks(policy, "json").find((block) =>
      block.includes('"actorId"'),
    )!;
    const pack = parseStrictYaml(packSourceSchema, packYaml);
    const localized = parseStrictYaml(localizedContentSchema, localizedYaml);
    const eligibility = strictParse(
      practitionerEligibilitySchema,
      JSON.parse(eligibilityJson) as unknown,
    );
    assert.equal(localized.packId, pack.id);
    assert.equal(localized.packVersion, pack.version);
    assert.equal(localized.fixtureOnly, pack.fixtureOnly);
    assert.deepEqual(
      localized.experiments.map((experiment) => experiment.id),
      pack.experiments.map((experiment) => experiment.id),
    );
    assert.equal(
      pack.occupations.every((occupation) => eligibility.occupations.includes(occupation)),
      true,
    );

    const root = makeRoot();
    const packDir = join(root, "content", "packs", pack.id);
    const eligibilityDir = join(root, "content", "eligibility");
    mkdirSync(join(packDir, "localizations"), { recursive: true });
    mkdirSync(eligibilityDir, { recursive: true });
    writeFileSync(join(packDir, `${pack.version}.yaml`), packYaml);
    writeFileSync(join(packDir, "localizations", `${pack.version}.yaml`), localizedYaml);
    writeFileSync(join(eligibilityDir, `${eligibility.actorId}.json`), eligibilityJson);
    const options = { repositoryRoot: root, now: () => "2026-09-27T06:00:00Z" };
    const commands = documentedInvocations(guide);
    const register = commands.find((item) => item.argv[0] === "content:new-version")!;
    assert.equal(runNewVersionCommand(register.argv.slice(1), options).exitCode, 0);
    const approvals = commands.filter(
      (item) => item.argv[0] === "content:attest" && item.argv.includes("approved"),
    );
    assert.equal(approvals.length, 5);
    for (const approval of approvals) {
      const result = runAttestCommand(approval.argv.slice(1), options);
      assert.equal(result.exitCode, 0, `${approval.source}: ${result.stderr ?? ""}`);
    }
    assert.equal(
      runReleaseCommand(
        ["--pack", pack.id, "--version", String(pack.version), "--actor", "fixture-operator-one"],
        options,
      ).exitCode,
      0,
    );
    assert.equal(runVerifyCommand([], options).exitCode, 0);
  });

  test("every documented content command invocation is accepted by the command parser", () => {
    const invocations = [
      ...documentedInvocations(readFileSync(guidePath, "utf8")).map((invocation) => ({
        document: "CONTENT-OPERATIONS-GUIDE.md",
        ...invocation,
      })),
      ...documentedInvocations(readFileSync(runbookPath, "utf8")).map((invocation) => ({
        document: "CONTENT-LIFECYCLE-RUNBOOK.md",
        ...invocation,
      })),
      ...documentedTranscriptInvocations(readFileSync(runbookPath, "utf8")).map((invocation) => ({
        document: "CONTENT-LIFECYCLE-RUNBOOK.md transcript",
        ...invocation,
      })),
    ];
    assert.ok(invocations.length > 0, "expected documented command invocations");

    for (const { argv, document, source } of invocations) {
      const [name, ...rest] = argv;
      assert.ok(
        Object.hasOwn(packageScripts, name ?? ""),
        `${document} documents "pnpm ${name}", which is not a package script`,
      );
      const command = contentCommands[name ?? ""];
      if (command === undefined) {
        continue;
      }
      const result = command(rest);
      assert.notEqual(
        result.exitCode,
        2,
        `${document} documents an invalid invocation: ${source}\n${result.stderr ?? ""}`,
      );
    }
  });

  test("documented free-text flags omit obvious email and URL markers", () => {
    const invocations = [
      ...documentedInvocations(readFileSync(guidePath, "utf8")),
      ...documentedInvocations(readFileSync(runbookPath, "utf8")),
    ];
    const freeTextFlags = new Set(["--note", "--reason", "--fluent-review-evidence"]);
    let checked = 0;

    for (const { argv, source } of invocations) {
      for (const [index, token] of argv.entries()) {
        if (!freeTextFlags.has(token) || index + 1 >= argv.length) {
          continue;
        }
        const value = argv[index + 1]!;
        for (const forbidden of ["@", "/", "\\", "http", "www."]) {
          assert.equal(
            value.includes(forbidden),
            false,
            `documented ${token} value "${value}" contains "${forbidden}", which could carry a contact route or a locator: ${source}`,
          );
        }
        checked += 1;
      }
    }

    assert.ok(checked > 0, "expected at least one documented free-text value to check");
  });

  test("the operations documents record the fixture-only boundary and the deferred real gates", () => {
    for (const path of [guidePath, policyPath, runbookPath]) {
      const text = readFileSync(path, "utf8");
      assert.match(text, /fixture/i, `${path} must state the fixture boundary`);
      assert.match(
        text,
        /not .{0,40}(public|real practitioner)/i,
        `${path} must state that passing checks are not real or public approval`,
      );
    }
  });
});
