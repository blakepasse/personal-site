---
name: add-project
description: Add, edit, or remove a project or resume entry on the site. Use when the user describes a new project, job, award, or wants to update what the site says about their work.
---

# Add or edit a project

All content lives in `data.js`. Don't touch `app.js` or `index.html` for content changes.

1. **Gather facts from the user.** You need a title, dates, role/context, a one-sentence description, 2–4 concrete bullet points (numbers beat adjectives), and 3–4 tags. Don't invent metrics. If a number isn't given, ask or leave it out.
2. **Write the entry** in `PROJECTS`:
   - `id`: unique kebab-case; it becomes the URL (`/#id`). It must not be `about`, `resume`, or `contact`.
   - `pattern`: pick one of `grid, dots, radar, bars, contour, waves` that isn't used by the neighboring cards.
   - Order: most impressive/recent first. The first project is the landing card.
3. If it's also a job or role, add or update the matching `RESUME.Experience` row and set `proj: "<id>"` so the resume links to it.
4. `npm run check`. `tests/data.spec.js` validates ids, patterns, and resume links.
5. Open `/#<id>` in the browser pane at desktop and mobile widths, open the panel, and screenshot it for the user.
6. If the user keeps a separate resume (`../resume-tailor/inputs/real_resume.md`), mention that it may need the same update. Don't edit it without asking.
