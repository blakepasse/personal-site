// Stop hook: before Claude ends its turn, if site files changed, run lint + desktop tests.
// On failure, exit 2 so the output is fed back and Claude keeps working until it's green.
// This turns "I think it works" into "it demonstrably works" without the user asking.
import { execSync } from "node:child_process";

let input = "";
for await (const chunk of process.stdin) input += chunk;
if (JSON.parse(input || "{}").stop_hook_active) process.exit(0); // already retried once; don't loop forever

const changed = execSync("git status --porcelain -- '*.js' '*.html' '*.css' '*.json' tests", {
  encoding: "utf8",
}).trim();
if (!changed) process.exit(0);

try {
  execSync("npm run --silent lint && npx playwright test --project=desktop --reporter=line", {
    stdio: "pipe",
    encoding: "utf8",
  });
} catch (e) {
  const out = `${e.stdout ?? ""}\n${e.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
  process.stderr.write(`Checks failed after your changes. Fix these before finishing:\n${out}\n`);
  process.exit(2);
}
