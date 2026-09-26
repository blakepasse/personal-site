# Deploying: Vercel hosting + Squarespace domain

Squarespace stays your **registrar** (you keep paying them for the domain). Vercel **serves** the site. You connect them with DNS records. Nothing moves between the two companies.

## 1. Put the code on GitHub

Connecting through GitHub gives you automatic deploys: every push to `main` goes to production, and every pull request gets its own preview URL where CI and the AI reviewer run.

```bash
cd ~/Desktop/jobs/personal-site
git add -A && git commit -m "Initial site"
gh repo create personal-site --public --source=. --push
```

Use `--private` if you'd rather. Vercel's free tier works with private repos too. A public repo, though, lets interviewers read your CLAUDE.md, agents, skills, and tests, and those are part of the pitch.

## 2. Create the Vercel project

1. Sign in at vercel.com with GitHub.
2. **Add New → Project →** import `personal-site`.
3. Framework preset: **Other**. Leave the build command and output directory empty (this is a static site). Deploy.
4. You'll get `personal-site-xxxx.vercel.app`. Check it works.

Or from the terminal: `npx vercel login` (you do this step yourself), then `npx vercel link`.

## 3. Add your domain in Vercel

**Project → Settings → Domains → Add**, then enter `yourdomain.com`. Choose the option that redirects `www.yourdomain.com` to it (or the reverse; either is fine).

Vercel then shows the exact DNS records it wants. **Use the values it shows you.** They're project-specific and sometimes differ from the generic ones below.

## 4. Point Squarespace DNS at Vercel

In Squarespace: **Domains →** your domain **→ DNS → DNS Settings**.

1. Under **Squarespace Defaults**, delete the default records. They point the domain at a Squarespace site and will conflict. Leave any **MX / TXT** records for email (Google Workspace etc.) alone.
2. Under **Custom Records**, add:

| Host  | Type  | Data                                                      |
| ----- | ----- | --------------------------------------------------------- |
| `@`   | A     | the IP Vercel shows (commonly `76.76.21.21`)              |
| `www` | CNAME | the target Vercel shows (commonly `cname.vercel-dns.com`) |

3. Save. Propagation usually takes minutes, but can take up to 48 hours.
4. Back in Vercel's Domains page, both entries should turn green. Vercel issues the HTTPS certificate automatically.

**Alternative:** switch the domain's nameservers to Vercel (Squarespace → Domains → Nameservers → Use custom nameservers). Vercel then manages all DNS. It's simpler long-term, but you'd have to recreate any email records in Vercel. Stick with the A/CNAME approach unless you have a reason.

## 5. Verify

```bash
dig +short yourdomain.com
curl -sI https://yourdomain.com | grep -i -E "strict-transport|content-security"
BASE_URL=https://yourdomain.com npx playwright test --project=desktop
```

## 6. Turn on the AI PR reviewer (optional)

GitHub repo **→ Settings → Secrets and variables → Actions →** new secret `ANTHROPIC_API_KEY` (from console.anthropic.com). Also install the Claude GitHub app (github.com/apps/claude) on the repo. After that, every PR gets the adversarial review in `.github/workflows/claude-review.yml`. It costs API credits per PR, so skip it until you want it.

## 7. Protect `main` (recommended)

GitHub **→ Settings → Branches →** add a rule for `main`: require a pull request and require the `CI / check` status to pass. Now nothing ships without green tests, from you or from an agent.
