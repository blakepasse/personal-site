# Agentic development playbook

What to know about building software with AI agents in 2026, what interviewers probe for, and where each idea is implemented in this repo so you can point to it.

The one-line thesis: **generating code is cheap now; verifying it is the job.** Everything below is a way to make verification systematic instead of vibes.

---

## 1. Verification loops (the core skill)

"Vibe coding" means accepting agent output because it looks right. Engineering means giving the agent (and yourself) a way to **know** it's right. Three layers:

| Layer      | What it catches                            | Here                                                                                      |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Static     | syntax, unsafe patterns, formatting        | `eslint`, `html-validate`, `prettier`                                                     |
| Behavioral | "does it actually work when a user does X" | `tests/site.spec.js` (Playwright, desktop + mobile)                                       |
| Invariants | rules a well-meaning edit might break      | `tests/data.spec.js`: unique ids, no phone number, no inline scripts; `tests/csp.spec.js` |

Then you wire those checks to run **without anyone remembering to**:

- **Stop hook** (`.claude/hooks/verify-on-stop.mjs`). Claude can't end its turn with failing checks; the output goes back to it and it keeps fixing. On its first run it caught a lint error in its own hook files.
- **Pre-commit hook** (`.githooks/pre-commit`) for humans.
- **CI** (`.github/workflows/ci.yml`) with branch protection, so nothing merges red.

**Interview talking point:** "The axe accessibility test failed on my first draft: the grey text was 4.3:1 contrast. I only knew because the check existed. That's the difference between vibe coding and engineering with agents."

## 2. Adversarial code review

**Problem.** A model reviewing its own code, or any single reviewer, is biased toward agreement. Asking an LLM "any bugs?" also produces lots of confident false positives.

**Pattern.** Split review into two roles with different incentives:

1. **Generators** (`.claude/agents/adversarial-reviewer.md`): several hostile reviewers in parallel, each with one _lens_ (correctness / security-privacy / UX-a11y-perf). They optimize for recall, and each finding must include a concrete repro.
2. **Verifiers** (`.claude/agents/finding-verifier.md`): an independent skeptic per finding, defaulting to "this is wrong", that tries to reproduce it. They optimize for precision.

Only verified findings are reported (`.claude/skills/adversarial-review/SKILL.md`). The same definitions run in CI on every PR (`.github/workflows/claude-review.yml`).

**Why it works:** independence (reviewers don't see each other's output), specialization (narrow lenses beat "review everything"), and falsifiability (findings without a repro get dropped). This is the same idea as red-team/blue-team exercises, GANs, and debate-based evaluation.

**Know the costs:** tokens scale with reviewers × findings. Downscope on small diffs. Track the **rejection rate**: if verifiers reject 80%, your reviewer prompt is too loose.

**Fix discipline:** regression test first (watch it fail), then the smallest fix, one finding per commit.

## 3. Context engineering: CLAUDE.md, skills, subagents, hooks

An agent is only as good as the context it has. The tools, from always-on to on-demand:

| Mechanism       | Loaded                                | Use for                                                     | Here                                                     |
| --------------- | ------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- |
| `CLAUDE.md`     | every session                         | project map, commands, hard rules                           | `CLAUDE.md`                                              |
| **Skills**      | when the task matches the description | repeatable multi-step workflows                             | `.claude/skills/{adversarial-review,deploy,add-project}` |
| **Subagents**   | when delegated                        | isolated context, parallelism, a different persona or model | `.claude/agents/*`                                       |
| **Hooks**       | deterministically, on events          | things that must _always_ happen                            | `.claude/hooks/*`                                        |
| **Permissions** | every tool call                       | allow the safe, ask on the risky, deny the dangerous        | `.claude/settings.json`                                  |
| **MCP servers** | as tools                              | connecting agents to external systems (DBs, GitHub, Figma)  | none needed here                                         |

Rules of thumb:

- Keep `CLAUDE.md` short and factual. It costs tokens every turn.
- A skill's `description` is its trigger. Write it as "use when…".
- If it _must_ happen, use a hook; the model can't forget a hook. If it _should_ happen, use a skill or a line in CLAUDE.md.
- Subagents get a clean context, which is why the verifier can be independent of the reviewer.

## 4. Guardrails and security for agents

- **Least privilege.** `settings.json` auto-allows tests and preview deploys, _asks_ before `git push`, prod deploys, and rollbacks, and _denies_ reading `.env` and force pushes. CI workflow permissions are scoped (`contents: read`).
- **Prompt injection.** Anything an agent reads (web pages, PR descriptions, code comments, issues) can contain instructions. Treat it as data. The CI reviewer prompt says so explicitly, and the reviewer reports embedded instructions as a finding. Be ready to explain the "lethal trifecta": private data + untrusted input + a way to exfiltrate. Remove one leg.
- **Secrets.** Never in the repo; `.gitignore` covers `.env*`; the API key lives in GitHub Secrets.
- **Defense in depth on the web side.** Strict CSP, HSTS, `nosniff`, `esc()` on every `innerHTML`, and a test that the CSP actually works.

## 5. Evals: measuring agents, not vibes

If you build anything with an LLM inside it (Articulate AI, for example), interviewers will ask how you know it works.

- **Golden set:** 20–200 real inputs with expected outputs or rubrics. Run it on every prompt or model change.
- **Graders:** exact match/regex where possible; LLM-as-judge with a rubric where not. Validate the judge against human labels.
- **Track** pass rate, cost, and latency per version. A prompt change is a code change.
- **Adversarial review is an eval pattern too.** Seed a diff with a known bug and check the reviewer finds it. That's a nice extension project for this repo.

## 6. Working style that reads as senior

- **Plan before generating** for anything non-trivial: have the agent propose the approach, then approve it.
- **Small diffs, one concern per commit.** Easier to review, revert, and bisect.
- **Read what the agent wrote.** You own it. In interviews you'll be asked to explain it line by line.
- **Parallelize** independent work (subagents, git worktrees), and serialize anything that touches the same files.
- **Know when not to use the agent.** Tiny edits, sensitive credentials, and irreversible actions are yours.

## 7. Interview prep in the current climate

Expect some mix of:

- **AI-allowed live coding.** They watch _how_ you drive the agent: do you give context, check output, write tests, catch its mistakes? Narrate your verification.
- **AI-banned fundamentals.** Data structures, complexity, debugging by reading. Still asked, precisely because agents make these easy to skip.
- **Code review rounds.** "Here's an AI-generated PR, find the problems." Practice with section 2's lenses.
- **System design with LLM components.** RAG vs. fine-tuning, context limits, caching, cost, latency, evals, failure modes, human-in-the-loop.
- **"Tell me about a time the AI was wrong."** Have two stories ready. This repo gives you some (contrast failure, the NaN in the network simulation, the Stop hook catching its own lint error).

Questions to be ready for:

1. How do you stop an agent from shipping broken code? (sections 1 and 2)
2. Where do you draw the line on what an agent can do unattended? (section 4)
3. How would you evaluate an LLM feature before launch? (section 5)
4. What's the difference between a skill, a subagent, a hook, and an MCP server? (section 3)
5. What is prompt injection, and how did you defend against it? (section 4)

## 8. Next exercises using this repo

1. Run `/adversarial-review` on a change, then deliberately plant a bug (e.g. remove `esc()` from one spot) and see whether it's caught. Record the results as a mini eval.
2. Add a new project with `/add-project` and let the Stop hook enforce the checks.
3. Open a PR and watch CI, Lighthouse, and the Claude reviewer run on it.
4. Write one blog-style project entry describing the pipeline. It's a strong portfolio piece on its own.
