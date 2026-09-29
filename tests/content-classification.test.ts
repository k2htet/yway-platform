import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  appendProvenanceEvent,
  contentDigest,
  createGenesisProvenanceLog,
  formatRecord,
  runAttestCommand,
  runNewVersionCommand,
  runReleaseCommand,
  runStatusCommand,
  runVerifyCommand,
  type PackSource,
  type ProvenanceEventLog,
  type ReviewAttestation,
} from "../content/index.js";
import { isFixturePackId } from "../content/classification.js";
import {
  attestationFilePath,
  commandOptions,
  expectExit,
  expectFailureMessage,
  makeRoot,
  makeLocalizedContent,
  makePack,
  packSourceObject,
  provenancePath,
  snapshotIndexPath,
  writeEligibility,
  writeLocalizedContent,
  writePackSource,
} from "./content-cli-fixtures.js";
import {
  makeRealPack,
  realAttestArgs,
  realEvidenceReference,
  realReleaseArgs,
} from "./content-real-fixtures.js";

/**
 * The permanent `fixture-` Pack-ID rule, and the honest limit of what it proves.
 *
 * The record set built here is **consistently relabelled**: every `fixtureOnly`
 * flag is false, every synthetic `fixture-` identity has been replaced with an
 * opaque handle, every `fixture:` evidence reference with an `owner-record:`
 * pointer, and no attestation carries a note. Nothing in it is marked synthetic.
 * It is a fully authorized-looking set of records whose only remaining trace of
 * fixture origin is the Pack identifier itself.
 *
 * The point of the two halves of this file is that this set is *internally
 * consistent*: under a non-fixture identifier it releases and verifies normally,
 * and under a reserved identifier it is refused by the identifier rule alone.
 * That is the honest limit `YWAY-D005` records — the dangerous action is narrowed,
 * not eliminated — so the test asserts the narrowing and does not claim to
 * detect a relabelling.

/** A real-classified source under a chosen identifier. */
function relabelledSource(packId: string, version = 1): PackSource {
  return makePack(packSourceObject({ id: packId, version, fixtureOnly: false }) as never);
}

const relabelledActors = {
  author: "author-handle-b1",
  founder: "founder-handle-c2",
  practitioner: "reviewer-handle-a7",
  localizer: "burmese-handle-d3",
  accessibility: "accessibility-handle-e4",
} as const;

const relabelledInstant = "2026-09-24T00:00:00Z";

/**
 * Writes a complete, internally consistent, non-fixture record set directly to
 * disk — deliberately bypassing the commands, which refuse a reserved identifier
 * and would make the set impossible to build in the first place.
 */
function writeRelabelledRecordSet(root: string, packId: string): PackState {
  const pack = relabelledSource(packId);
  writePackSource(root, pack);
  const localized = makeLocalizedContent(pack);
  writeLocalizedContent(root, localized);

  const digest = contentDigest(pack);
  const localizedDigest = contentDigest(localized);
  let log: ProvenanceEventLog = createGenesisProvenanceLog({
    packId,
    packVersion: pack.version,
    type: "authored",
    actorId: relabelledActors.author,
    fixtureOnly: false,
    contentDigest: digest,
    recordedAt: relabelledInstant,
  });
  const append = (
    type: Parameters<typeof appendProvenanceEvent>[1]["type"],
    actorId: string,
  ): void => {
    log = appendProvenanceEvent(log, {
      packId,
      packVersion: pack.version,
      type,
      actorId,
      fixtureOnly: false,
      contentDigest: digest,
      localizedContentDigest: localizedDigest,
      recordedAt: relabelledInstant,
    });
  };
  append("localized", relabelledActors.author);
  append("founder-reviewed", relabelledActors.founder);
  append("practitioner-reviewed", relabelledActors.practitioner);
  append("localization-reviewed", relabelledActors.localizer);
  append("accessibility-reviewed", relabelledActors.accessibility);
  writeFileSync(
    join(root, "content", "packs", packId, "provenance.json"),
    formatRecord(log),
    "utf8",
  );

  const bySequence = new Map(log.events.map((event) => [event.sequence, event]));
  const base = {
    schemaVersion: 1,
    packId,
    packVersion: pack.version,
    contentDigest: digest,
    outcome: "approved",
    fixtureOnly: false,
    recordedAt: relabelledInstant,
    localizedContentDigest: localizedDigest,
  } as const;
  const attestations: ReviewAttestation[] = [
    {
      ...base,
      kind: "founder-review",
      actorId: relabelledActors.founder,
      reviewEventSequence: bySequence.get(3)!.sequence,
      contentReview: {
        sixPartStructureConfirmed: true,
        exposureBeforeCommitmentConfirmed: true,
      },
    },
    {
      ...base,
      kind: "practitioner-review",
      actorId: relabelledActors.practitioner,
      reviewEventSequence: bySequence.get(4)!.sequence,
      contentReview: {
        sixPartStructureConfirmed: true,
        exposureBeforeCommitmentConfirmed: true,
      },
    },
    {
      ...base,
      kind: "localization-review",
      actorId: relabelledActors.localizer,
      reviewEventSequence: bySequence.get(5)!.sequence,
      locale: "my",
      localizationReview: {
        fluentBurmeseConfirmed: true,
        fluentReviewEvidence: realEvidenceReference,
      },
    },
    {
      ...base,
      kind: "accessibility-review",
      actorId: relabelledActors.accessibility,
      reviewEventSequence: bySequence.get(6)!.sequence,
      accessibilityReview: {
        readingOrderConfirmed: true,
        referencedMediaAlternativesConfirmed: true,
        runtimeValidationDeferred: true,
      },
    },
  ];
  for (const attestation of attestations) {
    const target = attestationFilePath(
      root,
      packId,
      pack.version,
      attestation.reviewEventSequence!,
      attestation.kind,
    );
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, formatRecord(attestation), "utf8");
  }
  writeEligibility(root, relabelledActors.practitioner, {
    actorId: relabelledActors.practitioner,
    fixtureOnly: false,
    evidenceReferences: [realEvidenceReference],
  });
  return { pack, log };
}

interface PackState {
  readonly pack: PackSource;
  readonly log: ProvenanceEventLog;
}

test("the relabelled record set is internally consistent: under a new identifier it releases", () => {
  const root = makeRoot();
  const { pack, log } = writeRelabelledRecordSet(root, "relabelled-guide");
  assert.equal(isFixturePackId(pack.id), false);

  // Every marker a fixture record would carry is gone.
  for (const event of log.events) {
    assert.equal(event.fixtureOnly, false);
    assert.equal(String(event.actorId).startsWith("fixture-"), false);
  }
  const status = expectExit(
    runStatusCommand(["--pack", pack.id, "--version", "1"], commandOptions(root)),
    0,
  );
  assert.match(status.stdout ?? "", /practitioner-reviewed/);

  // And it passes every shared release gate and produces a pilot-scoped release.
  expectExit(runReleaseCommand(realReleaseArgs(pack.id, 1), commandOptions(root)), 0);
  expectExit(runVerifyCommand([], commandOptions(root)), 0);
  const manifest = JSON.parse(
    readFileSync(join(root, "artifacts", "manifests", pack.id, "1", "manifest.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(manifest["classification"], "real");
  assert.equal(manifest["authorizationScope"], "pilot");
});

test("the same relabelled record set is refused at the Pack-ID rule and nowhere else", () => {
  const root = makeRoot();
  const { pack, log } = writeRelabelledRecordSet(root, "fixture-relabelled-guide");
  assert.equal(isFixturePackId(pack.id), true);
  // The identifier is the only remaining fixture marker in the whole set.
  for (const event of log.events) {
    assert.equal(event.fixtureOnly, false);
    assert.equal(String(event.actorId).startsWith("fixture-"), false);
  }
  const eligibility = readFileSync(
    join(root, "content", "eligibility", `${relabelledActors.practitioner}.json`),
    "utf8",
  );
  assert.equal(eligibility.includes("fixture-"), false);
  assert.equal(eligibility.includes('"fixtureOnly": true'), false);

  const result = runStatusCommand(["--pack", pack.id, "--version", "1"], commandOptions(root));
  expectExit(result, 1);
  const failure = result.stderr ?? "";
  assert.match(failure, /permanent "fixture-" Pack-ID rule/);
  assert.match(failure, /reserved/);
  // No other rule may be the reason: a reader must be able to attribute the
  // refusal to the identifier alone.
  for (const otherRule of [
    "must be a fixture- identity",
    "must not be a fixture- identity",
    "fixture: reference",
    "must not carry a free-text note",
    "no provenance log",
    "does not match the source-derived digest",
  ]) {
    assert.equal(failure.includes(otherRule), false, `unexpected refusal: ${otherRule}`);
  }

  // Repository verification and the registration path refuse it identically.
  const verify = runVerifyCommand([], commandOptions(root));
  expectExit(verify, 1);
  expectFailureMessage(verify, 'permanent "fixture-" Pack-ID rule');

  const register = expectExit(
    runNewVersionCommand(["--pack", pack.id, "--actor", "author-handle-b1"], commandOptions(root)),
    1,
  );
  expectFailureMessage(register, 'permanent "fixture-" Pack-ID rule');
  assert.equal(existsSync(snapshotIndexPath(root)), false);
});

test("a fixture Pack registered later is permanently fixture-classified too", () => {
  // A brand-new `fixture-` identifier added after the rule was written is refused
  // on the same grounds, so the rule covers fixture Packs that do not exist yet.
  const root = makeRoot();
  const pack = makePack(packSourceObject({ id: "fixture-new-career", fixtureOnly: true }) as never);
  writePackSource(root, pack);
  const ok = expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-new-career", "--actor", "fixture-author-one"],
      commandOptions(root),
    ),
    0,
  );
  assert.match(ok.stdout ?? "", /registered fixture-new-career version 1/);

  // Promoting that same identifier to real content is refused, and the rule is the
  // only thing that can refuse it once the flag is the only thing that changed.
  const promoted = makePack(
    packSourceObject({ id: "fixture-new-career", version: 2, fixtureOnly: false }) as never,
  );
  writePackSource(root, promoted);
  const refused = runNewVersionCommand(
    ["--pack", "fixture-new-career", "--from", "1", "--actor", "author-handle-b1"],
    commandOptions(root),
  );
  expectExit(refused, 1);
  expectFailureMessage(refused, 'permanent "fixture-" Pack-ID rule');
});

test("synthetic content outside the reserved namespace is refused, and the message says why", () => {
  // The other direction of the same rule: the reserved namespace is how a synthetic
  // Pack stays identifiable once every other marker is gone, so synthetic content
  // must be authored under it. The refusal is attributed to the identifier, and the
  // message does not blame the identifier for a classification it does not carry.
  const root = makeRoot();
  const pack = makePack(packSourceObject({ id: "unmarked-guide", fixtureOnly: true }) as never);
  writePackSource(root, pack);
  const result = runStatusCommand(
    ["--pack", "unmarked-guide", "--version", "1"],
    commandOptions(root),
  );
  expectExit(result, 1);
  expectFailureMessage(result, 'must be authored under a reserved "fixture-" Pack ID');
  assert.equal(existsSync(provenancePath(root, "unmarked-guide")), false);
});

test("the reserved namespace is a rule about identifiers, not about a stored flag", () => {
  const root = makeRoot();
  // A fixture Pack keeps working exactly as before: the reserved namespace is
  // required of it, not merely permitted.
  const fixturePack = makePack();
  assert.equal(isFixturePackId(fixturePack.id), true);
  writePackSource(root, fixturePack);
  expectExit(
    runNewVersionCommand(
      ["--pack", fixturePack.id, "--actor", "fixture-author-one"],
      commandOptions(root),
    ),
    0,
  );
  const realHandleOnFixture = expectExit(
    runAttestCommand(
      realAttestArgs({ packId: fixturePack.id, version: 1, kind: "founder-review" }),
      commandOptions(root),
    ),
    1,
  );
  expectFailureMessage(realHandleOnFixture, "must be a fixture- identity for fixture-only content");

  // A real Pack is refused under a fixture identifier at authoring time, before any
  // provenance, artifact, or reviewer record exists.
  const realUnderFixtureId = makeRealPack({ id: "fixture-looks-real" });
  writePackSource(root, realUnderFixtureId);
  const refused = expectExit(
    runNewVersionCommand(
      ["--pack", "fixture-looks-real", "--actor", "author-handle-b1"],
      commandOptions(root),
    ),
    1,
  );
  expectFailureMessage(refused, 'permanent "fixture-" Pack-ID rule');
  assert.equal(
    existsSync(join(root, "content", "packs", "fixture-looks-real", "provenance.json")),
    false,
  );
});
