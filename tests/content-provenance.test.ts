import assert from "node:assert/strict";
import { test } from "node:test";
import {
  StrictValidationError,
  appendProvenanceEvent,
  computeProvenanceEventDigest,
  contentDigest,
  createGenesisProvenanceLog,
  type ProvenanceEvent,
  type ProvenanceEventDraft,
  type ProvenanceEventLog,
  verifyProvenanceLog,
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
    {
      type: "founder-reviewed",
      actorId: "fixture-founder-one",
      recordedAt: "2026-09-23T01:00:00Z",
    },
    {
      type: "practitioner-reviewed",
      actorId: "fixture-practitioner-one",
      recordedAt: "2026-09-23T02:00:00Z",
    },
    {
      type: "artifact-eligible",
      actorId: "fixture-operator-one",
      recordedAt: "2026-09-23T03:00:00Z",
    },
    {
      type: "artifact-released",
      actorId: "fixture-operator-one",
      recordedAt: "2026-09-23T04:00:00Z",
    },
  ]);
}

function tamperEvent(
  event: ProvenanceEvent,
  patch: Partial<ProvenanceEvent>,
  recompute: boolean,
): ProvenanceEvent {
  const next: ProvenanceEvent = { ...event, ...patch };
  if (!recompute) {
    return next;
  }
  return { ...next, eventDigest: computeProvenanceEventDigest(next) };
}

function expectProvenanceFailure(run: () => unknown, fragment: string): StrictValidationError {
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
  assert.fail("expected provenance verification to fail, but it succeeded");
}

test("genesis event binds a null previousEventDigest and a sealed eventDigest", () => {
  const log = createGenesisProvenanceLog(draft());
  const event = log.events[0]!;
  assert.equal(event.sequence, 1);
  assert.equal(event.previousEventDigest, null);
  assert.equal(event.eventDigest, computeProvenanceEventDigest(event));
  assert.doesNotThrow(() => verifyProvenanceLog(log));
});

test("appended events chain sequence and prior event digests", () => {
  const log = buildLog([{ type: "founder-reviewed" }, { type: "practitioner-reviewed" }]);
  assert.equal(log.events.length, 3);
  log.events.forEach((event, index) => {
    assert.equal(event.sequence, index + 1);
    if (index === 0) {
      assert.equal(event.previousEventDigest, null);
    } else {
      assert.equal(event.previousEventDigest, log.events[index - 1]!.eventDigest);
    }
  });
  assert.doesNotThrow(() => verifyProvenanceLog(log));
});

test("append does not mutate the prior log (append-only)", () => {
  const before = structuredClone(buildLog());
  const after = appendProvenanceEvent(before, draft({ type: "founder-reviewed" }));
  assert.equal(before.events.length, 1);
  assert.equal(after.events.length, 2);
  assert.deepEqual(structuredClone(before), before);
  assert.notEqual(after.events, before.events);
  assert.deepEqual(after.events.slice(0, 1), before.events);
});

test("every event in a version binds the exact same contentDigest", () => {
  const log = happyPathLog();
  for (const event of log.events) {
    assert.equal(event.contentDigest, digestV1);
    assert.equal(event.packVersion, 1);
  }
});

test("append refuses a contentDigest change on an existing immutable version", () => {
  const log = buildLog();
  expectProvenanceFailure(
    () => appendProvenanceEvent(log, draft({ type: "founder-reviewed", contentDigest: digestV2 })),
    "immutable",
  );
});

test("append refuses a packId mismatch", () => {
  const log = buildLog();
  expectProvenanceFailure(
    () => appendProvenanceEvent(log, draft({ packId: "other-pack", type: "founder-reviewed" })),
    "does not match log packId",
  );
});

test("append refuses an illegal lifecycle transition", () => {
  const log = buildLog();
  expectProvenanceFailure(
    () => appendProvenanceEvent(log, draft({ type: "artifact-released" })),
    "illegal lifecycle transition",
  );
});

test("append refuses a non-authored first event for a new version", () => {
  const log = buildLog();
  expectProvenanceFailure(
    () =>
      appendProvenanceEvent(
        log,
        draft({ packVersion: 2, contentDigest: digestV2, type: "founder-reviewed" }),
      ),
    'must be "authored"',
  );
});

test("append refuses to extend a tampered base log", () => {
  const log = buildLog([{ type: "founder-reviewed" }]);
  const tampered: ProvenanceEventLog = {
    ...log,
    events: log.events.map((event, index) =>
      index === 0 ? { ...event, actorId: "attacker-one" } : event,
    ),
  };
  expectProvenanceFailure(
    () => appendProvenanceEvent(tampered, draft({ type: "practitioner-reviewed" })),
    "eventDigest mismatch",
  );
});

test("a multi-version log chains globally while each version keeps its digest", () => {
  let log = happyPathLog();
  log = appendProvenanceEvent(
    log,
    draft({
      packVersion: 2,
      contentDigest: digestV2,
      type: "authored",
      recordedAt: "2026-09-24T00:00:00Z",
    }),
  );
  assert.equal(log.events.length, 6);
  const v1Digests = new Set(
    log.events.filter((event) => event.packVersion === 1).map((event) => event.contentDigest),
  );
  const v2Events = log.events.filter((event) => event.packVersion === 2);
  assert.deepEqual([...v1Digests], [digestV1]);
  assert.deepEqual(
    v2Events.map((event) => event.contentDigest),
    [digestV2],
  );
  assert.equal(log.events[5]!.previousEventDigest, log.events[4]!.eventDigest);
  assert.doesNotThrow(() => verifyProvenanceLog(log));
});

test("verification detects a tampered event field without resealing", () => {
  const log = happyPathLog();
  const tampered: ProvenanceEventLog = {
    ...log,
    events: log.events.map((event, index) =>
      index === 1 ? { ...event, actorId: "attacker-one" } : event,
    ),
  };
  expectProvenanceFailure(() => verifyProvenanceLog(tampered), "eventDigest mismatch");
});

test("verification detects a middle event resealed without updating the next link", () => {
  const log = happyPathLog();
  const tampered: ProvenanceEventLog = {
    ...log,
    events: log.events.map((event, index) =>
      index === 1 ? tamperEvent(event, { actorId: "attacker-one" }, true) : event,
    ),
  };
  expectProvenanceFailure(
    () => verifyProvenanceLog(tampered),
    "previousEventDigest does not match",
  );
});

test("verification detects reordered events", () => {
  const log = buildLog([{ type: "founder-reviewed" }]);
  const reordered: ProvenanceEventLog = {
    ...log,
    events: [log.events[1]!, log.events[0]!],
  };
  expectProvenanceFailure(() => verifyProvenanceLog(reordered), "sequence must be contiguous");
});

test("verification detects a removed middle event", () => {
  const log = happyPathLog();
  const removed: ProvenanceEventLog = {
    ...log,
    events: [log.events[0]!, log.events[2]!, log.events[3]!, log.events[4]!],
  };
  expectProvenanceFailure(() => verifyProvenanceLog(removed), "sequence must be contiguous");
});

test("verification detects a broken genesis link", () => {
  const log = buildLog([{ type: "founder-reviewed" }]);
  const broken: ProvenanceEventLog = {
    ...log,
    events: log.events.map((event, index) =>
      index === 1 ? { ...event, previousEventDigest: null } : event,
    ),
  };
  expectProvenanceFailure(() => verifyProvenanceLog(broken), "previousEventDigest does not match");
});

test("verification detects non-null genesis previousEventDigest", () => {
  const log = buildLog();
  const broken: ProvenanceEventLog = {
    ...log,
    events: [{ ...log.events[0]!, previousEventDigest: digestV2 }],
  };
  expectProvenanceFailure(() => verifyProvenanceLog(broken), "genesis event must have a null");
});

test("verification detects conflicting content digests inside one immutable version", () => {
  const log = happyPathLog();
  const last = log.events[log.events.length - 1]!;
  const tamperedLast = tamperEvent(last, { contentDigest: digestV2 }, true);
  const conflicting: ProvenanceEventLog = {
    ...log,
    events: [...log.events.slice(0, -1), tamperedLast],
  };
  expectProvenanceFailure(() => verifyProvenanceLog(conflicting), "conflicting content digests");
});

test("expected source digests detect a fully resealed tampered source binding", () => {
  const log = createGenesisProvenanceLog(draft());
  const wrongSourceDigest = contentDigest({ title: "tampered source" });
  expectProvenanceFailure(
    () => verifyProvenanceLog(log, { expectedContentDigests: { 1: wrongSourceDigest } }),
    "source was tampered with",
  );
  assert.doesNotThrow(() => verifyProvenanceLog(log, { expectedContentDigests: { 1: digestV1 } }));
  assert.doesNotThrow(() =>
    verifyProvenanceLog(log, { expectedContentDigests: new Map([[1, digestV1]]) }),
  );
});

test("verification rejects a hand-crafted log with an illegal lifecycle order", () => {
  const authored = createGenesisProvenanceLog(draft()).events[0]!;
  const forgedFirst: ProvenanceEvent = { ...authored, type: "practitioner-reviewed" };
  const sealedFirst: ProvenanceEvent = {
    ...forgedFirst,
    eventDigest: computeProvenanceEventDigest(forgedFirst),
  };
  const forgedSecond: ProvenanceEvent = {
    ...authored,
    sequence: 2,
    type: "artifact-released",
    previousEventDigest: sealedFirst.eventDigest,
    eventDigest: "0".repeat(64),
  };
  const sealedSecond: ProvenanceEvent = {
    ...forgedSecond,
    eventDigest: computeProvenanceEventDigest(forgedSecond),
  };
  const resealed: ProvenanceEventLog = {
    schemaVersion: 1,
    packId,
    events: [sealedFirst, sealedSecond],
  };
  expectProvenanceFailure(() => verifyProvenanceLog(resealed), 'must start as "authored"');
});

test("verification rejects schema-invalid input", () => {
  expectProvenanceFailure(
    () => verifyProvenanceLog({ packId, events: [] }),
    "expected array to have >=1 items",
  );
  expectProvenanceFailure(() => verifyProvenanceLog(null), "expected object");
});
