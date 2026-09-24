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
  requireFixtureIsolation,
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
    requireFixtureIsolation(source, actorId);

    const draft: ProvenanceEventDraft = {
      packId,
      packVersion: target,
      type: "authored",
      actorId,
      fixtureOnly: source.fixtureOnly,
      contentDigest: contentDigest(source),
      recordedAt,
    };
    const nextLog =
      state.provenanceLog === undefined
        ? createGenesisProvenanceLog(draft)
        : appendProvenanceEvent(state.provenanceLog, draft);

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
