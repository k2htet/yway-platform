import {
  StrictValidationError,
  type StrictValidationIssue,
  provenanceEventLogSchema,
  type ProvenanceEvent,
  type ProvenanceEventLog,
  type ProvenanceEventType,
} from "./schemas/index.js";
import { canonicalJson } from "./canonical.js";
import { sha256Hex } from "./digest.js";
import {
  assertLifecycleTransition,
  assertLifecycleTransitions,
  statusAffectingEventType,
  type LifecycleStatus,
} from "./lifecycle.js";

export interface ProvenanceEventDraft {
  readonly packId: string;
  readonly packVersion: number;
  readonly type: ProvenanceEventType;
  readonly actorId: string;
  readonly fixtureOnly: boolean;
  readonly contentDigest: string;
  readonly localizedContentDigest?: string;
  readonly recordedAt: string;
}

export interface ProvenanceVerificationOptions {
  /**
   * Exact source-derived content digests keyed by pack version.
   * A mismatch means a recorded source was tampered with after its events were sealed.
   */
  readonly expectedContentDigests?: ReadonlyMap<number, string> | Readonly<Record<number, string>>;
  readonly expectedLocalizedContentDigests?:
    ReadonlyMap<number, string> | Readonly<Record<number, string>>;
  /**
   * Exact sealed digest of the expected final event. When the caller pins the head,
   * tail truncation of an otherwise internally valid chain is detected.
   */
  readonly expectedHeadEventDigest?: string;
}

function expectedDigestFor(
  expected: ReadonlyMap<number, string> | Readonly<Record<number, string>> | undefined,
  packVersion: number,
): string | undefined {
  if (expected === undefined) {
    return undefined;
  }
  if (expected instanceof Map) {
    return expected.get(packVersion);
  }
  const record = expected as Readonly<Record<number, string>>;
  return Object.prototype.hasOwnProperty.call(record, packVersion)
    ? record[packVersion]
    : undefined;
}

function eventPreImage(event: ProvenanceEvent | Omit<ProvenanceEvent, "eventDigest">): string {
  const preImage: Record<string, unknown> = { ...(event as Record<string, unknown>) };
  delete preImage["eventDigest"];
  return canonicalJson(preImage);
}

function sealEvent(fields: Omit<ProvenanceEvent, "eventDigest">): ProvenanceEvent {
  const eventDigest = sha256Hex(eventPreImage(fields));
  return { ...fields, eventDigest };
}

export function computeProvenanceEventDigest(
  event: ProvenanceEvent | Omit<ProvenanceEvent, "eventDigest">,
): string {
  return sha256Hex(eventPreImage(event));
}

export function createGenesisProvenanceEvent(draft: ProvenanceEventDraft): ProvenanceEvent {
  if (draft.localizedContentDigest !== undefined && draft.type !== "localized") {
    throw new StrictValidationError([
      {
        path: ["localizedContentDigest"],
        message: "a genesis localizedContentDigest can only be carried by a localized event",
      },
    ]);
  }
  return sealEvent({
    schemaVersion: 1,
    packId: draft.packId,
    packVersion: draft.packVersion,
    sequence: 1,
    type: draft.type,
    actorId: draft.actorId,
    fixtureOnly: draft.fixtureOnly,
    contentDigest: draft.contentDigest,
    ...(draft.localizedContentDigest === undefined
      ? {}
      : { localizedContentDigest: draft.localizedContentDigest }),
    previousEventDigest: null,
    recordedAt: draft.recordedAt,
  });
}

export function createGenesisProvenanceLog(draft: ProvenanceEventDraft): ProvenanceEventLog {
  const event = createGenesisProvenanceEvent(draft);
  return verifyProvenanceLog({ schemaVersion: 1, packId: draft.packId, events: [event] });
}

export function collectProvenanceIssues(
  input: unknown,
  options?: ProvenanceVerificationOptions,
): StrictValidationIssue[] {
  const issues: StrictValidationIssue[] = [];
  const parsed = provenanceEventLogSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        path: issue.path.map((segment) =>
          typeof segment === "symbol" ? String(segment) : segment,
        ),
        message: issue.message,
      });
    }
    return issues;
  }

  const log = parsed.data;

  for (let index = 0; index < log.events.length; index += 1) {
    const event = log.events[index]!;
    const prior = index === 0 ? undefined : log.events[index - 1]!;

    if (event.sequence !== index + 1) {
      issues.push({
        path: ["events", index, "sequence"],
        message: `sequence must be contiguous from 1 in array order (position ${index} has sequence ${event.sequence})`,
      });
    }

    if (index === 0 && event.previousEventDigest !== null) {
      issues.push({
        path: ["events", index, "previousEventDigest"],
        message: "genesis event must have a null previousEventDigest",
      });
    }
    if (prior !== undefined && event.previousEventDigest !== prior.eventDigest) {
      issues.push({
        path: ["events", index, "previousEventDigest"],
        message: `previousEventDigest does not match the prior eventDigest at sequence ${prior.sequence}`,
      });
    }

    const recomputed = computeProvenanceEventDigest(event);
    if (recomputed !== event.eventDigest) {
      issues.push({
        path: ["events", index, "eventDigest"],
        message: `eventDigest mismatch at sequence ${event.sequence}: event fields were altered after sealing`,
      });
    }
  }

  const versionMeta = new Map<number, { digest: string; fixtureOnly: boolean; sequence: number }>();
  const versionEventState = new Map<
    number,
    { firstType: ProvenanceEvent["type"]; count: number; localizedSequence?: number }
  >();
  const localizedVersionMeta = new Map<number, { digest: string; sequence: number }>();
  for (const [index, event] of log.events.entries()) {
    const eventState = versionEventState.get(event.packVersion);
    if (eventState === undefined) {
      versionEventState.set(event.packVersion, {
        firstType: event.type,
        count: 1,
      });
    } else {
      eventState.count += 1;
    }
    const currentEventState = versionEventState.get(event.packVersion)!;
    if (event.type === "localized") {
      if (event.localizedContentDigest === undefined) {
        issues.push({
          path: ["events", index, "localizedContentDigest"],
          message: `localized event for pack version ${event.packVersion} must bind the localized content digest`,
        });
      }
      if (currentEventState.firstType !== "authored" || currentEventState.count !== 2) {
        issues.push({
          path: ["events", index, "type"],
          message: `localized event for pack version ${event.packVersion} must immediately follow its authored event`,
        });
      }
      if (currentEventState.localizedSequence !== undefined) {
        issues.push({
          path: ["events", index, "type"],
          message: `pack version ${event.packVersion} has more than one localized event`,
        });
      } else if (event.localizedContentDigest !== undefined) {
        currentEventState.localizedSequence = event.sequence;
      }
    } else if (
      event.localizedContentDigest !== undefined &&
      currentEventState.localizedSequence === undefined
    ) {
      issues.push({
        path: ["events", index, "localizedContentDigest"],
        message: `the first localizedContentDigest for pack version ${event.packVersion} must appear on its localized event`,
      });
    }

    const known = versionMeta.get(event.packVersion);
    if (known === undefined) {
      versionMeta.set(event.packVersion, {
        digest: event.contentDigest,
        fixtureOnly: event.fixtureOnly,
        sequence: event.sequence,
      });
    } else {
      if (known.digest !== event.contentDigest) {
        issues.push({
          path: ["events", index, "contentDigest"],
          message: `pack version ${event.packVersion} has conflicting content digests (sequence ${known.sequence} vs ${event.sequence}): immutable versions cannot change content`,
        });
      }
      if (known.fixtureOnly !== event.fixtureOnly) {
        issues.push({
          path: ["events", index, "fixtureOnly"],
          message: `pack version ${event.packVersion} mixes fixtureOnly ${known.fixtureOnly} and ${event.fixtureOnly} events (sequence ${known.sequence} vs ${event.sequence}): fixture classification must be consistent across a version's provenance (YWAY-D003 fixture isolation)`,
        });
      }
    }

    const localizedKnown = localizedVersionMeta.get(event.packVersion);
    if (localizedKnown === undefined) {
      if (event.localizedContentDigest !== undefined) {
        localizedVersionMeta.set(event.packVersion, {
          digest: event.localizedContentDigest,
          sequence: event.sequence,
        });
      }
    } else if (event.localizedContentDigest === undefined) {
      issues.push({
        path: ["events", index, "localizedContentDigest"],
        message: `pack version ${event.packVersion} has an event after the localized binding without a localizedContentDigest`,
      });
    } else if (localizedKnown.digest !== event.localizedContentDigest) {
      issues.push({
        path: ["events", index, "localizedContentDigest"],
        message: `pack version ${event.packVersion} has conflicting localized content digests (sequence ${localizedKnown.sequence} vs ${event.sequence}): localized content is immutable within a version`,
      });
    }
  }

  for (const [packVersion, meta] of versionMeta) {
    const expected = expectedDigestFor(options?.expectedContentDigests, packVersion);
    if (expected !== undefined && expected !== meta.digest) {
      issues.push({
        path: ["events"],
        message: `recorded contentDigest for pack version ${packVersion} does not match the source-derived digest: source was tampered with or events bind stale content`,
      });
    }
    const expectedLocalized = expectedDigestFor(
      options?.expectedLocalizedContentDigests,
      packVersion,
    );
    if (expectedLocalized !== undefined) {
      const localizedMeta = localizedVersionMeta.get(packVersion);
      if (localizedMeta === undefined) {
        issues.push({
          path: ["events"],
          message: `pack version ${packVersion} has localized content but no localized provenance digest`,
        });
      } else if (localizedMeta.digest !== expectedLocalized) {
        issues.push({
          path: ["events"],
          message: `recorded localizedContentDigest for pack version ${packVersion} does not match the source-derived digest: localization was tampered with or events bind stale content`,
        });
      }
    }
  }

  try {
    assertLifecycleTransitions(log);
  } catch (error) {
    if (error instanceof StrictValidationError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  const pinnedHead = options?.expectedHeadEventDigest;
  if (pinnedHead !== undefined) {
    const head = log.events[log.events.length - 1];
    if (head === undefined || head.eventDigest !== pinnedHead) {
      issues.push({
        path: ["events"],
        message:
          "head eventDigest does not match the pinned expected head: the audit chain was truncated or replaced",
      });
    }
  }

  return issues;
}

export function verifyProvenanceLog(
  input: unknown,
  options?: ProvenanceVerificationOptions,
): ProvenanceEventLog {
  const issues = collectProvenanceIssues(input, options);
  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }
  return input as ProvenanceEventLog;
}

export function appendProvenanceEvent(
  log: ProvenanceEventLog,
  draft: ProvenanceEventDraft,
): ProvenanceEventLog {
  verifyProvenanceLog(log);

  if (draft.packId !== log.packId) {
    throw new StrictValidationError([
      {
        path: ["packId"],
        message: `draft packId "${draft.packId}" does not match log packId "${log.packId}"`,
      },
    ]);
  }

  const versionEvents = log.events.filter((event) => event.packVersion === draft.packVersion);
  const last = versionEvents.length > 0 ? versionEvents[versionEvents.length - 1]! : undefined;

  if (last === undefined && draft.type !== "authored") {
    throw new StrictValidationError([
      {
        path: ["type"],
        message: `the first event of pack version ${draft.packVersion} must be "authored" (received "${draft.type}")`,
      },
    ]);
  }

  let priorStatus: LifecycleStatus | undefined;
  for (const event of versionEvents) {
    const status = statusAffectingEventType(event.type);
    if (status !== undefined) {
      priorStatus = status;
    }
  }
  assertLifecycleTransition(priorStatus, draft.type, {
    packId: draft.packId,
    packVersion: draft.packVersion,
  });

  const globalLast = log.events[log.events.length - 1];
  const previousEventDigest = globalLast?.eventDigest ?? null;
  const sequence = (globalLast?.sequence ?? 0) + 1;

  if (last !== undefined && draft.contentDigest !== last.contentDigest) {
    throw new StrictValidationError([
      {
        path: ["contentDigest"],
        message: `pack version ${draft.packVersion} is immutable: events must bind the original contentDigest`,
      },
    ]);
  }

  if (last !== undefined && draft.fixtureOnly !== last.fixtureOnly) {
    throw new StrictValidationError([
      {
        path: ["fixtureOnly"],
        message: `pack version ${draft.packVersion} already has fixtureOnly ${last.fixtureOnly} events: fixture classification must be consistent across a version's provenance (YWAY-D003 fixture isolation)`,
      },
    ]);
  }

  const localizedContentDigest = draft.localizedContentDigest ?? last?.localizedContentDigest;
  if (
    draft.localizedContentDigest !== undefined &&
    last?.localizedContentDigest === undefined &&
    draft.type !== "localized"
  ) {
    throw new StrictValidationError([
      {
        path: ["localizedContentDigest"],
        message: `pack version ${draft.packVersion} must bind localized content on a localized event before later provenance`,
      },
    ]);
  }
  if (draft.type === "localized" && last !== undefined && last.type !== "authored") {
    throw new StrictValidationError([
      {
        path: ["type"],
        message: `the localized event for pack version ${draft.packVersion} must immediately follow its authored event`,
      },
    ]);
  }
  if (
    draft.localizedContentDigest !== undefined &&
    last?.localizedContentDigest !== undefined &&
    draft.localizedContentDigest !== last.localizedContentDigest
  ) {
    throw new StrictValidationError([
      {
        path: ["localizedContentDigest"],
        message: `pack version ${draft.packVersion} is immutable: events must bind the original localizedContentDigest`,
      },
    ]);
  }

  const event = sealEvent({
    schemaVersion: 1,
    packId: draft.packId,
    packVersion: draft.packVersion,
    sequence,
    type: draft.type,
    actorId: draft.actorId,
    fixtureOnly: draft.fixtureOnly,
    contentDigest: draft.contentDigest,
    ...(localizedContentDigest === undefined ? {} : { localizedContentDigest }),
    previousEventDigest,
    recordedAt: draft.recordedAt,
  });

  const nextLog: ProvenanceEventLog = {
    ...log,
    events: [...log.events, event],
  };
  return verifyProvenanceLog(nextLog);
}
