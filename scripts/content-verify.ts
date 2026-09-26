import { fileURLToPath } from "node:url";
import { runVerifyCommand } from "../content/commands/verify.js";

const result = runVerifyCommand(process.argv.slice(2), {
  repositoryRoot: fileURLToPath(new URL("..", import.meta.url)),
});
if (result.stdout !== undefined) {
  process.stdout.write(result.stdout);
}
if (result.stderr !== undefined) {
  process.stderr.write(result.stderr);
}
process.exitCode = result.exitCode;
