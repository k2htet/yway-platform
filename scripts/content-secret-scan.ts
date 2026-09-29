import { fileURLToPath } from "node:url";
import { runSecretScanCommand } from "../content/commands/secret-scan.js";

const result = runSecretScanCommand(process.argv.slice(2), {
  repositoryRoot: fileURLToPath(new URL("..", import.meta.url)),
});
if (result.stdout !== undefined) {
  process.stdout.write(result.stdout);
}
if (result.stderr !== undefined) {
  process.stderr.write(result.stderr);
}
process.exitCode = result.exitCode;
