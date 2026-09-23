import {
  StrictValidationError,
  type ProvenanceEvent,
  type ProvenanceEventLog,
  type ProvenanceEventType,
} from "./schemas/index.js";

export const lifecycleStatusSchemaValues = [
  "authored",
  "founder-reviewed",
  "practitioner-reviewed",
  "artifact-eligible",
  "artifact-released",
  "changes-requested",
  "retired",
] as const;

export type LifecycleStatus = (typeof lifecycleStatusSchemaValues)[number];

const statusByEventType: Readonly<Partial<Record<ProvenanceEventType, LifecycleStatus>>> = {
  authored: "authored",
  "founder-reviewed": "founder-reviewed",
  "practitioner-reviewed": "practitioner-reviewed",
  "artifact-eligible": "artifact-eligible",
  "artifact-released": "artifact-released",
  "changes-requested": "changes-requested",
  retired: "retired",
};

const allowedTransitions: Readonly<Record<LifecycleStatus, readonly LifecycleStatus[]>> = {
  authored: ["founder-reviewed", "changes-requested", "retired"],
  "founder-reviewed": ["practitioner-reviewed", "changes-requested", "retired"],
  "practitioner-reviewed": ["artifact-eligible", "changes-requested", "retired"],
  "artifact-eligible": ["artifact-released", "changes-requested", "retired"],
  "artifact-released": ["retired"],
  "changes-requested": ["founder-reviewed", "retired"],
  retired: [],
};

export function statusAffectingEventType(type: ProvenanceEventType): LifecycleStatus | undefined {
  return statusByEventType[type];
}

export function allowedLifecycleTransitions(from: LifecycleStatus): readonly LifecycleStatus[] {
  return allowedTransitions[from];
}

export interface LifecycleTransitionContext {
  readonly packId: string;
  readonly packVersion: number;
}

export function assertLifecycleTransition(
  currentStatus: LifecycleStatus | undefined,
  nextType: ProvenanceEventType,
  context: LifecycleTransitionContext,
): LifecycleStatus {
  const nextStatus = statusAffectingEventType(nextType);
  if (nextStatus === undefined) {
    if (currentStatus === undefined) {
      throw new StrictValidationError([
        {
          path: ["type"],
          message: `the first event of pack version ${context.packVersion} must be "authored" before provenance-only events`,
        },
      ]);
    }
    return currentStatus;
  }

  if (currentStatus === undefined) {
    if (nextStatus !== "authored") {
      throw new StrictValidationError([
        {
          path: ["type"],
          message: `pack version ${context.packVersion} must start as "authored" before "${nextStatus}" (received "${nextType}")`,
        },
      ]);
    }
    return nextStatus;
  }

  const allowed = allowedTransitions[currentStatus];
  if (!allowed.includes(nextStatus)) {
    throw new StrictValidationError([
      {
        path: ["type"],
        message: `illegal lifecycle transition for ${context.packId} version ${context.packVersion}: "${currentStatus}" → "${nextStatus}" (allowed: ${allowed.length > 0 ? allowed.map((status) => `"${status}"`).join(", ") : "none"})`,
      },
    ]);
  }
  return nextStatus;
}

export function deriveCurrentStatus(events: readonly ProvenanceEvent[]): LifecycleStatus {
  let status: LifecycleStatus | undefined;
  for (const event of events) {
    const next = statusAffectingEventType(event.type);
    if (next === undefined) {
      continue;
    }
    status = assertLifecycleTransition(status, event.type, {
      packId: event.packId,
      packVersion: event.packVersion,
    });
  }
  if (status === undefined) {
    throw new StrictValidationError([
      {
        path: ["events"],
        message: "no status-affecting provenance events found; current status cannot be derived",
      },
    ]);
  }
  return status;
}

export interface VersionLifecycleStatus {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
  readonly currentStatus: LifecycleStatus;
  readonly history: readonly ProvenanceEvent[];
}

function versionEvents(log: ProvenanceEventLog, packVersion: number): ProvenanceEvent[] {
  return log.events.filter((event) => event.packVersion === packVersion);
}

export function deriveVersionLifecycleStatus(
  log: ProvenanceEventLog,
  packVersion: number,
): VersionLifecycleStatus {
  const events = versionEvents(log, packVersion);
  if (events.length === 0) {
    throw new StrictValidationError([
      {
        path: ["events"],
        message: `no provenance events found for ${log.packId} version ${packVersion}`,
      },
    ]);
  }
  const digests = new Set(events.map((event) => event.contentDigest));
  if (digests.size !== 1) {
    throw new StrictValidationError([
      {
        path: ["events"],
        message: `pack version ${packVersion} has conflicting content digests; immutable version binding is broken`,
      },
    ]);
  }
  return {
    packId: log.packId,
    packVersion,
    contentDigest: events[0]!.contentDigest,
    currentStatus: deriveCurrentStatus(events),
    history: events,
  };
}

export function assertLifecycleTransitions(log: ProvenanceEventLog): void {
  const packVersions = [...new Set(log.events.map((event) => event.packVersion))];
  for (const packVersion of packVersions) {
    deriveVersionLifecycleStatus(log, packVersion);
  }
}

export interface VersionScope {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
}

export function versionScopeOf(record: {
  readonly packId: string;
  readonly packVersion: number;
  readonly contentDigest: string;
}): VersionScope {
  return {
    packId: record.packId,
    packVersion: record.packVersion,
    contentDigest: record.contentDigest,
  };
}

export function isVersionScoped(
  record: { readonly packId: string; readonly packVersion: number; readonly contentDigest: string },
  scope: VersionScope,
): boolean {
  return (
    record.packId === scope.packId &&
    record.packVersion === scope.packVersion &&
    record.contentDigest === scope.contentDigest
  );
}

export function assertVersionScoped(
  record: { readonly packId: string; readonly packVersion: number; readonly contentDigest: string },
  scope: VersionScope,
  label = "record",
): void {
  if (isVersionScoped(record, scope)) {
    return;
  }
  const reasons: string[] = [];
  if (record.packId !== scope.packId) {
    reasons.push(`packId "${record.packId}" ≠ "${scope.packId}"`);
  }
  if (record.packVersion !== scope.packVersion) {
    reasons.push(`packVersion ${record.packVersion} ≠ ${scope.packVersion} (stale version)`);
  }
  if (record.contentDigest !== scope.contentDigest) {
    reasons.push("contentDigest does not cover the exact content under review (stale digest)");
  }
  throw new StrictValidationError([
    {
      path: ["contentDigest"],
      message: `${label} does not cover exact version scope ${scope.packId}@${scope.packVersion}: ${reasons.join("; ")}`,
    },
  ]);
}

export function selectVersionScopedEvents(
  log: ProvenanceEventLog,
  scope: VersionScope,
): ProvenanceEvent[] {
  return log.events.filter((event) => isVersionScoped(event, scope));
}

export function assertGatesCoverVersionScope(
  records: readonly {
    readonly packId: string;
    readonly packVersion: number;
    readonly contentDigest: string;
  }[],
  scope: VersionScope,
): void {
  const issues: { path: readonly (string | number)[]; message: string }[] = [];
  records.forEach((record, index) => {
    try {
      assertVersionScoped(record, scope, `gate record at index ${index}`);
    } catch (error) {
      if (error instanceof StrictValidationError) {
        issues.push(
          ...error.issues.map((issue) => ({
            path: [index, ...issue.path],
            message: issue.message,
          })),
        );
        return;
      }
      throw error;
    }
  });
  if (issues.length > 0) {
    throw new StrictValidationError(issues);
  }
}

export interface IdentifiedVersion {
  readonly id: string;
  readonly version: number;
  readonly contentDigest: string;
}

export function assertImmutableVersionChange(
  existing: readonly IdentifiedVersion[],
  next: IdentifiedVersion,
): void {
  const prior = existing.find(
    (candidate) => candidate.id === next.id && candidate.version === next.version,
  );
  if (prior !== undefined && prior.contentDigest !== next.contentDigest) {
    throw new StrictValidationError([
      {
        path: ["version"],
        message: `pack "${next.id}" version ${next.version} already exists with a different content digest: source or localization changes require a new immutable version`,
      },
    ]);
  }
}

export function assertFreshVersionForChange(
  previous: IdentifiedVersion,
  next: IdentifiedVersion,
): void {
  if (previous.id !== next.id) {
    throw new StrictValidationError([
      {
        path: ["id"],
        message: `pack id changed from "${previous.id}" to "${next.id}"; compare versions of the same pack only`,
      },
    ]);
  }
  if (previous.contentDigest !== next.contentDigest && previous.version === next.version) {
    throw new StrictValidationError([
      {
        path: ["version"],
        message: `content changed for pack "${next.id}" but version stayed at ${next.version}: source or localization changes require a new immutable version with fresh version-scoped gates`,
      },
    ]);
  }
}
