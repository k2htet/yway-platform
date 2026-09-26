import { fileURLToPath } from "node:url";
import { runReleaseCommand } from "../content/commands/release.js";

const result = runReleaseCommand(process.argv.slice(2), {
  repositoryRoot: fileURLToPath(new URL("..", import.meta.url)),
});
if (result.stdout !== undefined) {
  process.stdout.write(result.stdout);
}
if (result.stderr !== undefined) {
  process.stderr.write(result.stderr);
}
process.exitCode = result.exitCode;
