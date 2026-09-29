import { contentClassification, requireClassificationIsolation } from "../classification.js";
import { contentDigest } from "../digest.js";
import {
  appendProvenanceEvent,
  createGenesisProvenanceLog,
  type ProvenanceEventDraft,
} from "../provenance.js";
import { StrictValidationError } from "../schemas/index.js";
import {
  commitWrites,
  formatRecord,
  loadPackState,
  provenanceLogPath,
  resolveRepositoryRoot,
} from "../store.js";
import {
  failureResult,
  optionalFlagString,
  parseCommandFlags,
  parsePositiveInteger,
  requireActorId,
  requirePackId,
  successResult,
  type CommandOptions,
  type CommandResult,
} from "./args.js";

const usage = "Usage: pnpm content:new-version -- --pack <id> --actor <id> [--from <version>]";

export function runNewVersionCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      pack: { type: "string" },
      actor: { type: "string" },
      from: { type: "string" },
    });
    const packId = requirePackId(values);
    const actorId = requireActorId(values);
    const fromRaw = optionalFlagString(values, "from");
    const explicitFrom = fromRaw === undefined ? undefined : parsePositiveInteger(fromRaw, "from");

    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);
    const recordedAt = (options.now ?? (() => new Date().toISOString()))();
    const state = loadPackState(repositoryRoot, packId);

    const registeredVersions = new Set(
      state.provenanceLog?.events.map((event) => event.packVersion) ?? [],
    );
    const latestRegistered = Math.max(0, ...registeredVersions);
    const from = explicitFrom ?? latestRegistered;

    if (explicitFrom !== undefined && !registeredVersions.has(explicitFrom)) {
      throw new StrictValidationError([
        {
          path: ["from"],
          message: `pack "${packId}" version ${explicitFrom} is not registered; --from must name a registered version`,
        },
      ]);
    }

    const target = from + 1;
    if (registeredVersions.has(target)) {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `pack "${packId}" version ${target} is already registered; registered versions are immutable and cannot be overwritten`,
        },
      ]);
    }

    const source = state.sourceByVersion.get(target);
    if (source === undefined) {
      throw new StrictValidationError([
        {
          path: ["version"],
          message: `author the source file content/packs/${packId}/${target}.yaml for pack "${packId}" version ${target} before registering it with content:new-version`,
        },
      ]);
    }
    requireClassificationIsolation(source, actorId);

    // A real Pack establishes its own cumulative provenance from its own first event
    // and never inherits a fixture Pack's history, so a new version cannot be derived
    // from a version of the other classification. The reserved Pack-ID namespace
    // already forbids the two from sharing an identifier; this states the rule at the
    // point where an operator could try to derive one from the other.
    if (explicitFrom !== undefined) {
      const fromSource = state.sourceByVersion.get(explicitFrom);
      if (
        fromSource !== undefined &&
        contentClassification(fromSource.fixtureOnly) !== contentClassification(source.fixtureOnly)
      ) {
        throw new StrictValidationError([
          {
            path: ["from"],
            message: `pack "${packId}" version ${explicitFrom} is ${contentClassification(fromSource.fixtureOnly)}-classified and version ${target} is ${contentClassification(source.fixtureOnly)}-classified; a real Pack requires a new Pack ID and its own provenance genesis and can never be derived from a fixture Pack`,
          },
        ]);
      }
    }

    const draft: ProvenanceEventDraft = {
      packId,
      packVersion: target,
      type: "authored",
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: contentDigest(source),
      recordedAt,
    };
    let nextLog =
      state.provenanceLog === undefined
        ? createGenesisProvenanceLog(draft)
        : appendProvenanceEvent(state.provenanceLog, draft);
    const localized = state.localizedContentByVersion.get(target);
    if (localized !== undefined) {
      nextLog = appendProvenanceEvent(nextLog, {
        packId,
        packVersion: target,
        type: "localized",
        actorId,
        fixtureOnly: source.fixtureOnly,
        contentDigest: contentDigest(source),
        localizedContentDigest: contentDigest(localized),
        recordedAt,
      });
    }

    const logPath = provenanceLogPath(repositoryRoot, packId);
    commitWrites(
      repositoryRoot,
      (transaction) => {
        const bytes = formatRecord(nextLog);
        if (state.provenanceLog === undefined) {
          transaction.createExclusive(logPath, bytes);
        } else {
          transaction.replace(logPath, bytes);
        }
      },
      options.onBeforeWrite,
    );

    const head = nextLog.events[nextLog.events.length - 1]!;
    return successResult(
      `PASS  registered ${packId} version ${target} at sequence ${head.sequence} (contentDigest ${draft.contentDigest}, actor ${actorId})`,
    );
  } catch (error) {
    return failureResult(usage, error);
  }
}
