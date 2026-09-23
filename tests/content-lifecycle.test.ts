import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StrictValidationError,
  allowedLifecycleTransitions,
  appendProvenanceEvent,
  assertFreshVersionForChange,
  assertGatesCoverVersionScope,
  assertImmutableVersionChange,
  assertLifecycleTransition,
  assertVersionScoped,
  createGenesisProvenanceLog,
  deriveCurrentStatus,
  deriveVersionLifecycleStatus,
  isVersionScoped,
  type LifecycleStatus,
  type ProvenanceEvent,
  type ProvenanceEventDraft,
  type ProvenanceEventLog,
  type ProvenanceEventType,
  selectVersionScopedEvents,
  versionScopeOf,
} from "../content/index.js";

const packId = "fixture-local-guide";
const digestV1 = "a".repeat(64);
const digestV2 = "b".repeat(64);

function draft(overrides: Partial<ProvenanceEventDraft> = {}): ProvenanceEventDraft {
  return {
    packId,
    packVersion: 1,
    type: "authored",
    actorId: "fixture-author-one",
    fixtureOnly: true,
    contentDigest: digestV1,
    recordedAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

function buildLog(steps: Partial<ProvenanceEventDraft>[] = []): ProvenanceEventLog {
  let log = createGenesisProvenanceLog(draft());
  for (const step of steps) {
    log = appendProvenanceEvent(log, draft(step));
  }
  return log;
}

function happyPathLog(): ProvenanceEventLog {
  return buildLog([
    { type: "founder-reviewed", actorId: "fixture-founder-one" },
    { type: "practitioner-reviewed", actorId: "fixture-practitioner-one" },
    { type: "artifact-eligible", actorId: "fixture-operator-one" },
    { type: "artifact-released", actorId: "fixture-operator-one" },
  ]);
}

function makeEvent(
  overrides: Partial<ProvenanceEvent> & {
    sequence: number;
    type: ProvenanceEventType;
  },
): ProvenanceEvent {
  return {
    schemaVersion: 1,
    packId,
    packVersion: 1,
    actorId: "fixture-author-one",
    fixtureOnly: true,
    contentDigest: digestV1,
    previousEventDigest: null,
    eventDigest: "0".repeat(64),
    recordedAt: "2026-09-23T00:00:00Z",
    ...overrides,
  };
}

function expectLifecycleFailure(run: () => unknown, fragment: string): StrictValidationError {
  try {
    run();
  } catch (error) {
    assert.ok(
      error instanceof StrictValidationError,
      `expected StrictValidationError, received ${error instanceof Error ? error.message : String(error)}`,
    );
    assert.ok(
      error.message.includes(fragment),
      `expected error to include "${fragment}", received: ${error.message}`,
    );
    return error;
  }
  assert.fail("expected lifecycle validation to fail, but it succeeded");
}

test("happy path derives the full release lifecycle", () => {
  const log = happyPathLog();
  const status = deriveVersionLifecycleStatus(log, 1);
  assert.equal(status.currentStatus, "artifact-released");
  assert.equal(status.contentDigest, digestV1);
  assert.equal(status.history.length, 5);
});

test("intermediate statuses are derived from cumulative history", () => {
  const full = happyPathLog();
  const cases: [number, LifecycleStatus][] = [
    [1, "authored"],
    [2, "founder-reviewed"],
    [3, "practitioner-reviewed"],
    [4, "artifact-eligible"],
    [5, "artifact-released"],
  ];
  for (const [length, expected] of cases) {
    const partial: ProvenanceEventLog = { ...full, events: full.events.slice(0, length) };
    assert.equal(deriveVersionLifecycleStatus(partial, 1).currentStatus, expected);
  }
});

test("provenance-only events do not change current status", () => {
  const log = buildLog([
    { type: "localized", actorId: "fixture-localizer-one" },
    { type: "founder-reviewed", actorId: "fixture-founder-one" },
    { type: "localization-reviewed", actorId: "fixture-fluent-reviewer-one" },
  ]);
  assert.equal(deriveVersionLifecycleStatus(log, 1).currentStatus, "founder-reviewed");
});

test("current status derivation never mutates cumulative history", () => {
  const log = happyPathLog();
  const before = structuredClone(log);
  const status = deriveVersionLifecycleStatus(log, 1);
  assert.equal(status.currentStatus, "artifact-released");
  assert.deepEqual(structuredClone(log), before);
  assert.equal(status.history.length, before.events.length);
  assert.deepEqual(
    status.history,
    before.events.filter((event) => event.packVersion === 1),
  );
});

test("history stays cumulative across status changes on the same version", () => {
  const log = buildLog([
    { type: "founder-reviewed" },
    { type: "changes-requested", actorId: "fixture-founder-one" },
    { type: "founder-reviewed", actorId: "fixture-founder-one" },
  ]);
  assert.equal(log.events.length, 4);
  assert.equal(deriveVersionLifecycleStatus(log, 1).currentStatus, "founder-reviewed");
  const types = log.events.map((event) => event.type);
  assert.deepEqual(types, [
    "authored",
    "founder-reviewed",
    "changes-requested",
    "founder-reviewed",
  ]);
});

test("changes-requested can return to founder review or retire", () => {
  assert.deepEqual(allowedLifecycleTransitions("changes-requested"), [
    "founder-reviewed",
    "retired",
  ]);
  const log = buildLog([
    { type: "founder-reviewed" },
    { type: "changes-requested" },
    { type: "founder-reviewed" },
    { type: "practitioner-reviewed" },
  ]);
  assert.equal(deriveVersionLifecycleStatus(log, 1).currentStatus, "practitioner-reviewed");
});

test("retired is terminal", () => {
  assert.deepEqual(allowedLifecycleTransitions("retired"), []);
  const log = buildLog([{ type: "retired", actorId: "fixture-operator-one" }]);
  assert.equal(deriveVersionLifecycleStatus(log, 1).currentStatus, "retired");
  expectLifecycleFailure(
    () => appendProvenanceEvent(log, draft({ type: "founder-reviewed" })),
    "illegal lifecycle transition",
  );
});

test("released versions can only retire afterwards", () => {
  assert.deepEqual(allowedLifecycleTransitions("artifact-released"), ["retired"]);
  const log = happyPathLog();
  expectLifecycleFailure(
    () => appendProvenanceEvent(log, draft({ type: "founder-reviewed" })),
    "illegal lifecycle transition",
  );
  const retired = appendProvenanceEvent(
    log,
    draft({ type: "retired", actorId: "fixture-operator-one" }),
  );
  assert.equal(deriveVersionLifecycleStatus(retired, 1).currentStatus, "retired");
  assert.equal(retired.events.length, 6);
});

test("illegal hand-crafted transitions are rejected when deriving status", () => {
  expectLifecycleFailure(
    () => deriveCurrentStatus([makeEvent({ sequence: 1, type: "practitioner-reviewed" })]),
    'must start as "authored"',
  );
  const illegalSequences: ProvenanceEvent["type"][][] = [
    ["authored", "artifact-released"],
    ["authored", "artifact-released", "founder-reviewed"],
    ["authored", "founder-reviewed", "founder-reviewed"],
    ["authored", "founder-reviewed", "practitioner-reviewed", "founder-reviewed"],
  ];
  for (const types of illegalSequences) {
    const events = types.map((type, index) => makeEvent({ sequence: index + 1, type }));
    expectLifecycleFailure(() => deriveCurrentStatus(events), "illegal lifecycle transition");
  }
});

test("a version must start as authored before any status event", () => {
  expectLifecycleFailure(
    () => assertLifecycleTransition(undefined, "founder-reviewed", { packId, packVersion: 1 }),
    'must start as "authored"',
  );
  assert.equal(
    assertLifecycleTransition(undefined, "authored", { packId, packVersion: 1 }),
    "authored",
  );
});

test("a new version starts a fresh status without erasing prior version history", () => {
  let log = happyPathLog();
  log = appendProvenanceEvent(
    log,
    draft({ packVersion: 2, contentDigest: digestV2, type: "authored" }),
  );
  const v1 = deriveVersionLifecycleStatus(log, 1);
  const v2 = deriveVersionLifecycleStatus(log, 2);
  assert.equal(v1.currentStatus, "artifact-released");
  assert.equal(v1.history.length, 5);
  assert.equal(v2.currentStatus, "authored");
  assert.equal(v2.contentDigest, digestV2);
  assert.equal(log.events.length, 6);
});

test("version scope matching accepts exact records only", () => {
  const scope = versionScopeOf({ packId, packVersion: 1, contentDigest: digestV1 });
  assert.ok(isVersionScoped({ packId, packVersion: 1, contentDigest: digestV1 }, scope));
  assert.ok(!isVersionScoped({ packId, packVersion: 2, contentDigest: digestV1 }, scope));
  assert.ok(!isVersionScoped({ packId, packVersion: 1, contentDigest: digestV2 }, scope));
  assert.ok(!isVersionScoped({ packId: "other", packVersion: 1, contentDigest: digestV1 }, scope));
  assert.doesNotThrow(() =>
    assertVersionScoped({ packId, packVersion: 1, contentDigest: digestV1 }, scope, "attestation"),
  );
});

test("stale-digest and stale-version gate records are rejected", () => {
  const scope = versionScopeOf({ packId, packVersion: 2, contentDigest: digestV2 });
  expectLifecycleFailure(
    () =>
      assertVersionScoped(
        { packId, packVersion: 2, contentDigest: digestV1 },
        scope,
        "attestation",
      ),
    "stale digest",
  );
  expectLifecycleFailure(
    () =>
      assertVersionScoped(
        { packId, packVersion: 1, contentDigest: digestV2 },
        scope,
        "attestation",
      ),
    "stale version",
  );
});

test("gate batches fail closed when any record is out of scope", () => {
  const scope = versionScopeOf({ packId, packVersion: 2, contentDigest: digestV2 });
  assert.doesNotThrow(() =>
    assertGatesCoverVersionScope(
      [
        { packId, packVersion: 2, contentDigest: digestV2 },
        { packId, packVersion: 2, contentDigest: digestV2 },
      ],
      scope,
    ),
  );
  const error = expectLifecycleFailure(
    () =>
      assertGatesCoverVersionScope(
        [
          { packId, packVersion: 2, contentDigest: digestV2 },
          { packId, packVersion: 1, contentDigest: digestV1 },
        ],
        scope,
      ),
    "does not cover exact version scope",
  );
  assert.ok(error.issues.some((issue) => issue.path[0] === 1));
});

test("selectVersionScopedEvents filters history to the exact version and digest", () => {
  let log = happyPathLog();
  log = appendProvenanceEvent(
    log,
    draft({ packVersion: 2, contentDigest: digestV2, type: "authored" }),
  );
  const scopeV1 = versionScopeOf({ packId, packVersion: 1, contentDigest: digestV1 });
  const scoped = selectVersionScopedEvents(log, scopeV1);
  assert.equal(scoped.length, 5);
  assert.ok(scoped.every((event) => event.packVersion === 1 && event.contentDigest === digestV1));
});

test("overwriting an existing version with changed content is rejected", () => {
  const existing = [
    { id: packId, version: 1, contentDigest: digestV1 },
    { id: packId, version: 2, contentDigest: digestV2 },
  ];
  assert.doesNotThrow(() =>
    assertImmutableVersionChange(existing, { id: packId, version: 1, contentDigest: digestV1 }),
  );
  assert.doesNotThrow(() =>
    assertImmutableVersionChange(existing, {
      id: packId,
      version: 3,
      contentDigest: "c".repeat(64),
    }),
  );
  expectLifecycleFailure(
    () =>
      assertImmutableVersionChange(existing, {
        id: packId,
        version: 1,
        contentDigest: digestV2,
      }),
    "require a new immutable version",
  );
  expectLifecycleFailure(
    () =>
      assertImmutableVersionChange(existing, {
        id: packId,
        version: 2,
        contentDigest: digestV1,
      }),
    "require a new immutable version",
  );
});

test("a content change at the same version number is rejected", () => {
  const previous = { id: packId, version: 1, contentDigest: digestV1 };
  assert.doesNotThrow(() =>
    assertFreshVersionForChange(previous, {
      id: packId,
      version: 2,
      contentDigest: digestV2,
    }),
  );
  expectLifecycleFailure(
    () =>
      assertFreshVersionForChange(previous, { id: packId, version: 1, contentDigest: digestV2 }),
    "new immutable version",
  );
  expectLifecycleFailure(
    () =>
      assertFreshVersionForChange(previous, {
        id: "other-pack",
        version: 2,
        contentDigest: digestV2,
      }),
    "pack id changed",
  );
});
