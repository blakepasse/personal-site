# Blake Passe — personal site

Static site (no framework, no build step) styled after paradigm.xyz. Served by Vercel; domain registered at Squarespace.

## Layout

- `index.html` — markup only. No inline `<script>`, `<style>`, `style=""`, or `on*=` handlers: the CSP in `vercel.json` forbids them and `tests/data.spec.js` enforces it.
- `styles.css` — all styling. Colors are CSS custom properties on `:root`.
- `data.js` — **all content** (projects, resume, skills). Content edits go here, never in `app.js`.
- `app.js` — ES module: carousel, views, menu, project panel, find palette, network canvas.
- `tests/` — Playwright. `data.spec.js` = content invariants; `site.spec.js` = end-to-end + axe accessibility.
- `vercel.json` — security headers and caching. `.vercelignore` keeps dev files out of the deploy.

## Commands

- `npm run dev` — local server on :8765
- `npm run check` — lint (eslint, html-validate, prettier) + all tests. **Must pass before any commit** (pre-commit hook enforces it).
- `BASE_URL=https://… npx playwright test` — run the suite against a deployed URL.

## Rules

- Any string interpolated into `innerHTML` goes through `esc()`. Prefer `textContent`.
- Muted text must keep ≥ 4.5:1 contrast; the axe test fails otherwise.
- Never publish the phone number, home address, or anything else from the resume that isn't already on the site. A test guards phone numbers.
- When you fix a bug, first add a test that fails without the fix.
- Deploying to production and pushing to `main` require the user's explicit go-ahead (see `.claude/settings.json`).

## Workflows

- Content change → `/add-project` skill.
- Before opening a PR or after a non-trivial change → `/adversarial-review` skill.
- Shipping → `/deploy` skill.
