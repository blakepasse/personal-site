# blake-passe-site

Personal site for Blake Passe, styled after paradigm.xyz. Static HTML/CSS/JS, deployed on Vercel.

```bash
npm install        # also enables the pre-commit hook
npm run dev        # http://localhost:8765
npm run check      # lint + Playwright tests (desktop + mobile, a11y, CSP)
```

- Content: edit `data.js`.
- Deploy + domain setup: [docs/deploy.md](docs/deploy.md).
- How this repo uses AI agents safely (adversarial review, skills, hooks, CI): [docs/agentic-dev-playbook.md](docs/agentic-dev-playbook.md) and [CLAUDE.md](CLAUDE.md).

Keys on the site: `1–3` switch views (home/globe, resume, contact), `M` opens the menu, `F` opens find, `←/→` step through places on the globe, and `Esc` closes.
