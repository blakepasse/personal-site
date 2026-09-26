// PostToolUse hook: format whatever file Claude just wrote, so diffs stay clean and
// `prettier --check` in CI never fails on agent output.
import { execFileSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path;
if (file && /\.(js|mjs|css|html|json|md|yml)$/.test(file)) {
  try {
    execFileSync("npx", ["prettier", "--write", "--ignore-unknown", "--log-level", "warn", file], { stdio: "inherit" });
  } catch {
    // formatting problems surface later in `npm run check`; never block the edit itself
  }
}
