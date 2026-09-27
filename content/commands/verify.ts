import { formatRecord, resolveRepositoryRoot } from "../store.js";
import { verifyRepository } from "../repository-verify.js";
import { verifyArtifactSnapshot } from "../snapshot-verify.js";
import {
  failureResult,
  optionalFlagString,
  parseCommandFlags,
  successResult,
  type CommandOptions,
  type CommandResult,
} from "./args.js";

const usage =
  "Usage: pnpm content:verify\n       pnpm content:verify -- --trusted-commit <full-sha>";

export function runVerifyCommand(
  argv: readonly string[],
  options: CommandOptions = {},
): CommandResult {
  try {
    const values = parseCommandFlags(argv, {
      "trusted-commit": { type: "string" },
    });
    const trustedCommit = optionalFlagString(values, "trusted-commit");
    const repositoryRoot = resolveRepositoryRoot(options.repositoryRoot);

    if (trustedCommit !== undefined) {
      const snapshot = verifyArtifactSnapshot({ repositoryRoot, trustedCommit });
      return successResult(
        formatRecord({
          mode: "trusted-snapshot",
          trustedCommit: snapshot.trustedCommit,
          artifacts: [...snapshot.files.keys()].sort(),
          indexEntries: snapshot.index.entries.length,
        }),
      );
    }

    const report = verifyRepository({ repositoryRoot });
    return successResult(
      formatRecord({
        mode: "repository",
        packs: report.packIds,
        releases: report.releases,
        indexEntries: report.indexEntries,
      }),
    );
  } catch (error) {
    return failureResult(usage, error);
  }
}
