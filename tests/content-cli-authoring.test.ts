import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { stringify } from "yaml";
import {
  contentDigest,
  runAttestCommand,
  runNewVersionCommand,
  runStatusCommand,
  type CommandResult,
} from "../content/index.js";
import {
  attestationFilePath,
  commandClock,
  expectExit,
  expectFailureMessage,
  makeLocalizedContent,
  makePack,
  makeRoot,
  packSourceObject,
  provenancePath,
  readProvenanceLog,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
} from "./content-cli-fixtures.js";

function options(root: string): { repositoryRoot: string; now: () => string } {
  return { repositoryRoot: root, now: commandClock };
}

function register(
  root: string,
  packId = "fixture-local-guide",
  actor = "fixture-author-one",
): CommandResult {
  return runNewVersionCommand(["--pack", packId, "--actor", actor], options(root));
}

function attestFounder(root: string, extra: string[] = []): CommandResult {
  return runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--kind",
      "founder-review",
      "--actor",
      "fixture-founder-one",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
      ...extra,
    ],
    options(root),
  );
}

function attestPractitioner(root: string, actor = "fixture-practitioner-one"): CommandResult {
  return runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--kind",
      "practitioner-review",
      "--actor",
      actor,
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
    ],
    options(root),
  );
}

function statusJson(root: string, version = 1): Record<string, unknown> {
  const result = expectExit(
    runStatusCommand(
      ["--pack", "fixture-local-guide", "--version", String(version), "--json"],
      options(root),
    ),
    0,
  );
  return JSON.parse(result.stdout ?? "{}") as Record<string, unknown>;
}

test("content:new-version rejects missing --pack with exit 2", () => {
  const root = makeRoot();
  const result = runNewVersionCommand(["--actor", "fixture-author-one"], options(root));
  expectExit(result, 2);
  expectFailureMessage(result, "--pack");
  expectFailureMessage(result, "Usage: pnpm content:new-version");
});

test("content:new-version rejects unknown options and bad values with exit 2", () => {
  const root = makeRoot();
  expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--frobnicate"],
      options(root),
    ),
    2,
  );
  expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "abc"],
      options(root),
    ),
    2,
  );
  expectExit(
    runNewVersionCommand(
      ["--pack", "../../escape", "--actor", "fixture-author-one"],
      options(root),
    ),
    2,
  );
  assert.equal(existsSync(provenancePath(root, "fixture-local-guide")), false);
});

test("command parsing rejects positionals, duplicates, missing and empty values with exit 2", () => {
  const root = makeRoot();
  const positional = runNewVersionCommand(["stray"], options(root));
  expectExit(positional, 2);
  expectFailureMessage(positional, "unexpected positional argument");

  const duplicate = runNewVersionCommand(
    ["--pack", "a", "--pack", "b", "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(duplicate, 2);
  expectFailureMessage(duplicate, 'option "--pack" was provided more than once');

  const missingValue = runNewVersionCommand(
    ["--pack", "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(missingValue, 2);
  expectFailureMessage(missingValue, 'option "--pack" requires a value');

  const emptyInline = runNewVersionCommand(
    ["--pack=", "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(emptyInline, 2);
  expectFailureMessage(emptyInline, 'option "--pack" requires a non-empty value');
});

test("commands accept inline --flag=value forms and boolean forms", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);

  expectExit(
    runNewVersionCommand(
      ["--pack=fixture-local-guide", "--actor=fixture-author-one"],
      options(root),
    ),
    0,
  );

  const human = runStatusCommand(
    ["--pack", "fixture-local-guide", "--version", "1", "--json=false"],
    options(root),
  );
  expectExit(human, 0);
  assert.match(human.stdout ?? "", /^pack: fixture-local-guide/);

  const badBoolean = runStatusCommand(
    ["--pack", "fixture-local-guide", "--version", "1", "--json=maybe"],
    options(root),
  );
  expectExit(badBoolean, 2);
  expectFailureMessage(badBoolean, 'option "--json" only accepts "true" or "false"');
});

test("content:new-version refuses non-fixture sources and non-fixture actors", () => {
  const root = makeRoot();
  const pack = makePack({ fixtureOnly: false });
  writePackSource(root, pack);
  const nonFixtureSource = runNewVersionCommand(
    ["--pack", pack.id, "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(nonFixtureSource, 1);
  expectFailureMessage(nonFixtureSource, "only fixture-only content");
  assert.equal(existsSync(provenancePath(root, pack.id)), false);

  const fixtureRoot = makeRoot();
  writePackSource(fixtureRoot, makePack());
  const nonFixtureActor = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "author-one"],
    options(fixtureRoot),
  );
  expectExit(nonFixtureActor, 1);
  expectFailureMessage(nonFixtureActor, "must be a fixture- identity");
  assert.equal(existsSync(provenancePath(fixtureRoot, "fixture-local-guide")), false);
});

test("content:new-version registers the first version with a genesis authored event", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);

  const result = expectExit(register(root), 0);
  assert.match(result.stdout ?? "", /registered fixture-local-guide version 1 at sequence 1/);

  const log = readProvenanceLog(root, pack.id);
  assert.equal(log.events.length, 1);
  const genesis = log.events[0]!;
  assert.equal(genesis.type, "authored");
  assert.equal(genesis.sequence, 1);
  assert.equal(genesis.previousEventDigest, null);
  assert.equal(genesis.contentDigest, contentDigest(pack));
  assert.equal(genesis.actorId, "fixture-author-one");
});

test("content:new-version refuses to overwrite an already registered version", () => {
  const root = makeRoot();
  const packV1 = makePack();
  writePackSource(root, packV1);
  expectExit(register(root), 0);

  const packV2 = makePack({ version: 2, summary: "A revised synthetic summary." });
  writePackSource(root, packV2);
  expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "1"],
      options(root),
    ),
    0,
  );

  const before = readFileSync(provenancePath(root, packV1.id), "utf8");
  const result = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "1"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "already registered");
  assert.equal(readFileSync(provenancePath(root, packV1.id), "utf8"), before);
});

test("content:new-version chains a second version onto cumulative provenance", () => {
  const root = makeRoot();
  const packV1 = makePack();
  writePackSource(root, packV1);
  expectExit(register(root), 0);

  const packV2 = makePack({ version: 2, summary: "A revised synthetic summary." });
  writePackSource(root, packV2);
  expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "1"],
      options(root),
    ),
    0,
  );

  const log = readProvenanceLog(root, packV1.id);
  assert.equal(log.events.length, 2);
  const second = log.events[1]!;
  assert.equal(second.sequence, 2);
  assert.equal(second.packVersion, 2);
  assert.equal(second.contentDigest, contentDigest(packV2));
  assert.equal(second.previousEventDigest, log.events[0]!.eventDigest);

  const status = statusJson(root, 2);
  assert.equal(status["currentStatus"], "authored");
  assert.equal(status["contentDigest"], contentDigest(packV2));
});

test("content:new-version fails without writing when the source file does not exist", () => {
  const root = makeRoot();
  const result = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "fixture-author-one"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "content/packs/fixture-local-guide/1.yaml");
  assert.equal(existsSync(provenancePath(root, "fixture-local-guide")), false);
});

test("content:new-version refuses a --from version that is not registered", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  const result = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "1"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "is not registered");
  assert.equal(existsSync(provenancePath(root, "fixture-local-guide")), false);
});

test("content:new-version rejects a source file whose version field does not match its name", () => {
  const root = makeRoot();
  const pack = makePack({ version: 2 });
  mkdirSync(join(root, "content", "packs", pack.id), { recursive: true });
  writeFileSync(join(root, "content", "packs", pack.id, "1.yaml"), stringify(pack), "utf8");
  const result = register(root);
  expectExit(result, 1);
  expectFailureMessage(result, "file name and version field must match");
  assert.equal(existsSync(provenancePath(root, "fixture-local-guide")), false);
});

test("content:new-version fails closed when a registered source was tampered with", () => {
  const root = makeRoot();
  const packV1 = makePack();
  writePackSource(root, packV1);
  expectExit(register(root), 0);

  const tampered = packSourceObject({ summary: "Tampered after registration." });
  writeFileSync(
    join(root, "content", "packs", packV1.id, "1.yaml"),
    `${JSON.stringify(tampered, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(root, "content", "packs", packV1.id, "2.yaml"),
    `${JSON.stringify(packSourceObject({ version: 2 }), null, 2)}\n`,
    "utf8",
  );

  const before = readFileSync(provenancePath(root, packV1.id), "utf8");
  const result = runNewVersionCommand(
    ["--pack", "fixture-local-guide", "--actor", "fixture-author-one", "--from", "1"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "does not match the source-derived digest");
  assert.equal(readFileSync(provenancePath(root, packV1.id), "utf8"), before);
});

test("content:attest rejects invalid invocation with exit 2", () => {
  const root = makeRoot();
  const base = ["--pack", "fixture-local-guide", "--actor", "fixture-founder-one"];

  expectExit(
    runAttestCommand(
      [...base, "--version", "1", "--kind", "founder-review", "--outcome", "approved"],
      options(root),
    ),
    2,
  );
  expectExit(
    runAttestCommand(
      [
        ...base,
        "--version",
        "1",
        "--kind",
        "nonsense",
        "--actor",
        "fixture-founder-one",
        "--outcome",
        "approved",
      ],
      options(root),
    ),
    2,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        "fixture-local-guide",
        "--version",
        "1",
        "--kind",
        "founder-review",
        "--actor",
        "fixture-founder-one",
        "--outcome",
        "maybe",
      ],
      options(root),
    ),
    2,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        "fixture-local-guide",
        "--version",
        "1",
        "--kind",
        "founder-review",
        "--actor",
        "fixture-founder-one",
        "--outcome",
        "approved",
      ],
      options(root),
    ),
    2,
  );
  expectExit(
    runAttestCommand(
      [
        "--pack",
        "fixture-local-guide",
        "--version",
        "1",
        "--kind",
        "localization-review",
        "--actor",
        "fixture-localizer-one",
        "--outcome",
        "approved",
      ],
      options(root),
    ),
    2,
  );
});

test("content:attest rejects flags that belong to other kinds with exit 2", () => {
  const root = makeRoot();
  const withLocale = runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--kind",
      "founder-review",
      "--actor",
      "fixture-founder-one",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
      "--locale",
      "my",
    ],
    options(root),
  );
  expectExit(withLocale, 2);
  expectFailureMessage(withLocale, "--locale is only allowed with --kind localization-review");

  const contentReviewOnLocalization = runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--kind",
      "localization-review",
      "--actor",
      "fixture-localizer-one",
      "--outcome",
      "approved",
      "--locale",
      "my",
      "--six-part-confirmed",
      "true",
    ],
    options(root),
  );
  expectExit(contentReviewOnLocalization, 2);
  expectFailureMessage(
    contentReviewOnLocalization,
    "are only allowed with --kind founder-review or practitioner-review",
  );
});

test("content:attest records a founder approval bound to digest and review event sequence", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const result = expectExit(attestFounder(root), 0);
  assert.match(result.stdout ?? "", /recorded founder-review approved .* at sequence 2/);

  const attestationPath = attestationFilePath(root, pack.id, 1, 2, "founder-review");
  const attestation = JSON.parse(readFileSync(attestationPath, "utf8")) as Record<string, unknown>;
  assert.equal(attestation["packId"], pack.id);
  assert.equal(attestation["packVersion"], 1);
  assert.equal(attestation["contentDigest"], contentDigest(pack));
  assert.equal(attestation["reviewEventSequence"], 2);
  assert.equal(attestation["recordedAt"], "2026-09-24T00:00:00Z");
  assert.deepEqual(attestation["contentReview"], {
    sixPartStructureConfirmed: true,
    exposureBeforeCommitmentConfirmed: true,
  });

  const log = readProvenanceLog(root, pack.id);
  const event = log.events[1]!;
  assert.equal(event.type, "founder-reviewed");
  assert.equal(event.recordedAt, attestation["recordedAt"]);
  assert.equal(event.actorId, attestation["actorId"]);

  const status = statusJson(root);
  assert.equal(status["currentStatus"], "founder-reviewed");
});

test("content:attest refuses a second founder approval from founder-reviewed", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);

  const before = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = attestFounder(root, ["--note", "again"]);
  expectExit(result, 1);
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
});

test("content:attest refuses to overwrite an existing attestation file", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const path = attestationFilePath(root, pack.id, 1, 2, "founder-review");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, "{}\n", "utf8");
  const before = readFileSync(provenancePath(root, pack.id), "utf8");

  const result = attestFounder(root);
  expectExit(result, 1);
  expectFailureMessage(result, "refusing to overwrite existing file");
  assert.equal(readFileSync(path, "utf8"), "{}\n");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
});

test("content:attest refuses practitioner approval before founder review", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  writeEligibility(root, "fixture-practitioner-one");

  const before = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = attestPractitioner(root);
  expectExit(result, 1);
  expectFailureMessage(result, "founder review must be recorded");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
});

test("content:attest refuses practitioner approval without an eligibility record", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);

  const before = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = attestPractitioner(root);
  expectExit(result, 1);
  expectFailureMessage(result, "practitioner eligibility not found");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
});

test("content:attest records an independent practitioner approval through the gate", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);
  writeEligibility(root, "fixture-practitioner-one");

  expectExit(attestPractitioner(root), 0);
  const status = statusJson(root);
  assert.equal(status["currentStatus"], "practitioner-reviewed");
  const attestations = status["attestations"] as { kind: string }[];
  assert.equal(attestations.length, 2);
});

test("content:attest refuses practitioner approval against expired eligibility", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);
  writeEligibility(root, "fixture-practitioner-one", {
    validFrom: "2020-01-01",
    validUntil: "2020-06-30",
  });

  const before = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = attestPractitioner(root);
  expectExit(result, 1);
  expectFailureMessage(result, "inclusive window has ended");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
  const status = statusJson(root);
  assert.equal(status["currentStatus"], "founder-reviewed");
});

test("content:attest refuses a self-authoring practitioner approval", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root, pack.id, "fixture-practitioner-one"), 0);
  expectExit(attestFounder(root), 0);
  writeEligibility(root, "fixture-practitioner-one");

  const before = readFileSync(provenancePath(root, pack.id), "utf8");
  const result = attestPractitioner(root);
  expectExit(result, 1);
  expectFailureMessage(result, "approval must come from an independent practitioner");
  assert.equal(readFileSync(provenancePath(root, pack.id), "utf8"), before);
});

test("content:attest records localization review without changing lifecycle status", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  writeLocalizedContent(root, makeLocalizedContent(pack));
  expectExit(register(root), 0);

  expectExit(
    runAttestCommand(
      [
        "--pack",
        "fixture-local-guide",
        "--version",
        "1",
        "--kind",
        "localization-review",
        "--actor",
        "fixture-localizer-one",
        "--outcome",
        "approved",
        "--locale",
        "my",
        "--fluent-burmese-confirmed",
        "true",
        "--fluent-review-evidence",
        "fixture:fluent-review-001",
      ],
      options(root),
    ),
    0,
  );

  const status = statusJson(root);
  assert.equal(status["currentStatus"], "authored");
  const events = status["events"] as { type: string }[];
  assert.equal(events.length, 3);
  assert.equal(events[1]!.type, "localized");
  assert.equal(events[2]!.type, "localization-reviewed");
});

test("content:attest supports a changes-requested cycle followed by fresh founder approval", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);

  expectExit(
    runAttestCommand(
      [
        "--pack",
        "fixture-local-guide",
        "--version",
        "1",
        "--kind",
        "practitioner-review",
        "--actor",
        "fixture-practitioner-one",
        "--outcome",
        "changes-requested",
        "--six-part-confirmed",
        "true",
        "--exposure-before-commitment-confirmed",
        "false",
      ],
      options(root),
    ),
    0,
  );
  assert.equal(statusJson(root)["currentStatus"], "changes-requested");

  expectExit(attestFounder(root), 0);
  assert.equal(statusJson(root)["currentStatus"], "founder-reviewed");

  writeEligibility(root, "fixture-practitioner-one");
  expectExit(attestPractitioner(root), 0);
  assert.equal(statusJson(root)["currentStatus"], "practitioner-reviewed");
});

test("content:attest rejects approved founder attestations that do not confirm content review", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const result = runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "1",
      "--kind",
      "founder-review",
      "--actor",
      "fixture-founder-one",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "false",
      "--exposure-before-commitment-confirmed",
      "true",
    ],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(
    result,
    "must confirm both six-part structure and exposure before commitment",
  );
});

test("content:attest rejects blank notes with exit 1", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const result = attestFounder(root, ["--note", " "]);
  expectExit(result, 1);
  expectFailureMessage(result, "must not be blank");
});

test("content:attest refuses to attest an unregistered version", () => {
  const root = makeRoot();
  const packV1 = makePack();
  writePackSource(root, packV1);
  expectExit(register(root), 0);
  writePackSource(root, makePack({ version: 2 }));

  const result = runAttestCommand(
    [
      "--pack",
      "fixture-local-guide",
      "--version",
      "2",
      "--kind",
      "founder-review",
      "--actor",
      "fixture-founder-one",
      "--outcome",
      "approved",
      "--six-part-confirmed",
      "true",
      "--exposure-before-commitment-confirmed",
      "true",
    ],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "is not registered");
});

test("content:status rejects a missing version with exit 2", () => {
  const root = makeRoot();
  const result = runStatusCommand(["--pack", "fixture-local-guide"], options(root));
  expectExit(result, 2);
  expectFailureMessage(result, "Usage: pnpm content:status");
});

test("content:status rejects unknown versions with exit 1", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const result = runStatusCommand(
    ["--pack", "fixture-local-guide", "--version", "9"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "not found");
});

test("content:status detects a tampered source", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  writeFileSync(
    join(root, "content", "packs", pack.id, "1.yaml"),
    stringify(packSourceObject({ summary: "Tampered after registration." })),
    "utf8",
  );
  const result = runStatusCommand(
    ["--pack", "fixture-local-guide", "--version", "1"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "does not match the source-derived digest");
});

test("content:status detects a tampered provenance event", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const logPath = provenancePath(root, pack.id);
  const log = readProvenanceLog(root, pack.id);
  const tampered = {
    ...log,
    events: [{ ...log.events[0]!, recordedAt: "2026-09-24T23:59:59Z" }, ...log.events.slice(1)],
  };
  writeFileSync(logPath, JSON.stringify(tampered, null, 2), "utf8");

  const result = runStatusCommand(
    ["--pack", "fixture-local-guide", "--version", "1", "--json"],
    options(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, "eventDigest mismatch");
});

test("content:status fails when a required attestation file is missing", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);
  writeEligibility(root, "fixture-practitioner-one");
  expectExit(attestPractitioner(root), 0);

  const practitionerAttestation = attestationFilePath(root, pack.id, 1, 3, "practitioner-review");
  assert.equal(existsSync(practitionerAttestation), true);
  unlinkSync(practitionerAttestation);

  const result = runStatusCommand(["--pack", pack.id, "--version", "1", "--json"], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "no review attestation binds practitioner-reviewed event");
});

test("content:status fails when an attestation no longer matches its event binding", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);
  expectExit(attestFounder(root), 0);

  const path = attestationFilePath(root, pack.id, 1, 2, "founder-review");
  const attestation = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  attestation["recordedAt"] = "2026-09-24T00:00:01Z";
  writeFileSync(path, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");

  const result = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "no review attestation binds founder-reviewed event");
});

test("content:status rejects a wrong sequence binding for an S2-06 review", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  writeLocalizedContent(root, makeLocalizedContent(pack));
  expectExit(register(root), 0);
  expectExit(
    runAttestCommand(
      [
        "--pack",
        pack.id,
        "--version",
        "1",
        "--kind",
        "accessibility-review",
        "--actor",
        "fixture-accessibility-reviewer-one",
        "--outcome",
        "approved",
        "--reading-order-confirmed",
        "true",
        "--media-alternatives-confirmed",
        "true",
        "--runtime-validation-deferred",
      ],
      options(root),
    ),
    0,
  );
  const path = attestationFilePath(root, pack.id, 1, 3, "accessibility-review");
  const attestation = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  attestation["reviewEventSequence"] = 99;
  writeFileSync(path, `${JSON.stringify(attestation, null, 2)}\n`, "utf8");
  const result = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "no review attestation binds accessibility-reviewed event");
});

test("content:status fails when an attestation binds no provenance event", () => {
  const root = makeRoot();
  const pack = makePack();
  writePackSource(root, pack);
  expectExit(register(root), 0);

  const path = attestationFilePath(root, pack.id, 1, 2, "accessibility-review");
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        packId: pack.id,
        packVersion: 1,
        contentDigest: contentDigest(pack),
        kind: "accessibility-review",
        outcome: "approved",
        actorId: "fixture-reviewer-one",
        fixtureOnly: true,
        reviewEventSequence: 2,
        recordedAt: "2026-09-24T00:00:00Z",
        accessibilityReview: {
          readingOrderConfirmed: true,
          referencedMediaAlternativesConfirmed: true,
          runtimeValidationDeferred: true,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const result = runStatusCommand(["--pack", pack.id, "--version", "1"], options(root));
  expectExit(result, 1);
  expectFailureMessage(result, "does not bind any provenance event");
});
