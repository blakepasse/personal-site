---
name: deploy
description: Ship the site to Vercel safely. Runs checks, deploys a preview, runs the full Playwright suite and header checks against the preview, and only then (with explicit user approval) promotes to production and verifies the custom domain. Use when asked to deploy, ship, publish, or push the site live.
---

# Deploy

Production is public, so every step below is gated on the one before it.

## Preflight

1. `git status`. Refuse to deploy uncommitted changes; offer to commit them first.
2. `npm run check` must pass.
3. `npx vercel whoami`. If not logged in, ask the user to run `npx vercel login` themselves. Never handle their credentials.

## Preview

1. `npx vercel deploy` (no `--prod`) and capture the preview URL from stdout.
2. `BASE_URL=<preview-url> npx playwright test`. All tests must pass against the real deployment.
3. Header check: `curl -sI <preview-url>` must show `content-security-policy`, `strict-transport-security`, `x-content-type-options: nosniff`. Load the page in the browser pane and confirm no CSP violations in the console.
4. Confirm `curl -s -o /dev/null -w "%{http_code}" <preview-url>/CLAUDE.md` returns 404. Dev files must not ship.

## Production (requires explicit "yes" from the user in this conversation)

1. Show the preview URL and test summary, then ask: "Promote this preview to production?"
2. On yes: `npx vercel promote <preview-url>` (or `npx vercel deploy --prod`).
3. Smoke test the custom domain: `BASE_URL=https://<domain> npx playwright test tests/site.spec.js --project=desktop`.
4. Report: production URL, commit SHA, test count.

## If something fails

Stop and report the failure with output. Don't retry production deploys in a loop. To roll back: `npx vercel rollback` (confirm with the user first).
