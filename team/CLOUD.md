# Running the team in Claude Code cloud sessions

Cloud sessions (claude.ai/code, the Claude app's Code tab, Desktop → Cloud, `claude --cloud`) run in a disposable Anthropic-hosted VM. That suits this team: the autopilot keeps working with your laptop closed, you steer from your phone, and the VM is a safe place for broad permissions.

Three things differ from a local run, and this guide covers each:
1. **Plugins declared in `.claude/settings.json` are not installed in cloud sessions.** The environment setup script installs them instead.
2. **Only pushed commits survive** a reclaimed VM, so in the cloud the team pushes its working branch after every phase.
3. **Network is allowlisted.** A few hosts (context7, Google Fonts, the Playwright CDN) must be added to the allowlist.

What loads from the repo: `CLAUDE.md`, `.claude/agents`, `.claude/skills`, `.claude/settings.json` hooks and permissions, and `.mcp.json`. The last two load only in **single-repository** sessions, so don't run the team from a multi-repo project thread.

## One-time setup

1. **Repository.** Create the product repo from the template ("Use this template" on the GitHub page), or `python3 team/bin/install.py <repo>` and push. Connect GitHub at claude.ai/code, either with the Claude GitHub App on that repo or with `/web-setup` from your terminal.
2. **Environment.** At claude.ai/code, open the environment selector → **Add cloud environment** (e.g. "ai-team"):
   - **Network access: Custom**, with *Also include default list of common package managers* checked, plus these hosts:
     ```
     mcp.context7.com
     context7.com
     fonts.gstatic.com
     cdn.playwright.dev
     playwright.download.prss.microsoft.com
     playwright.azureedge.net
     ```
     Add your Strix LLM host if it isn't `api.anthropic.com` (e.g. `openrouter.ai`).
   - **Environment variables.** These are visible to anyone who uses the environment, so keep secrets out of shared environments:
     ```
     BASH_DEFAULT_TIMEOUT_MS=600000
     BASH_MAX_TIMEOUT_MS=1200000
     # optional security audit (MR) — the model is preset to Sonnet, so only the key is needed:
     AI_TEAM_WITH_STRIX=1
     LLM_API_KEY=<sk-ant-… from console.anthropic.com>
     ```
   - **Setup script:** paste the whole of [`team/cloud/setup-script.sh`](cloud/setup-script.sh). It installs the plugins (superpowers, frontend-design, typescript-lsp, security-guidance, context7, supabase, ui-ux-pro-max), playwright-cli with its skills, the TypeScript LSP, the Supabase CLI (built from the Go module proxy, because GitHub release downloads are blocked for repos not attached to the session) and, optionally, Strix. The first session builds a cache, so later sessions start fast. A setup that takes longer than ~5 minutes isn't cached; if that happens, drop Strix or pre-built extras.
3. **Verify.** Start a session in this environment on your repo and send: `Run bash team/bin/doctor.sh --quick and show me the output.` You want the plugins marked ✓ and the cloud network hosts reachable. The SessionStart hook also warns if superpowers is missing.

## Run

| Goal | How |
|---|---|
| Kickoff | New session on the repo, permission mode **Auto** (or **Bypass**: the VM is isolated and the hooks still enforce the boundary) → `/mvp-kickoff <idea>`. Answer the questions in the web or mobile UI and approve AUTONOMY.md. |
| Autopilot | In the same session: `/mvp-autopilot`, then send the `/goal …` line it prints (or `python3 team/bin/board.py goal`). Close the laptop and check progress from the phone. If your surface doesn't accept `/goal`, just say "continue with /mvp-autopilot" whenever it pauses. |
| Step by step | One session per milestone: `/mvp-milestone M1`. Start each new session **on the working branch** so it sees the latest board. |
| From the terminal | `claude --cloud "/mvp-kickoff <idea>"`; steer with `claude -p "<message>" --cloud <session-id>`; pull a session locally with `claude --teleport`. |
| Hands-off schedule | A [routine](https://code.claude.com/docs/en/routines) on the working branch with the prompt `Run /mvp-status; if next-step is MILESTONE, run that milestone protocol, commit and push; stop after one milestone.` Each run continues from the pushed board. |

## Git in the cloud
- The hook `guard-bash` allows `git push` of the working branch in cloud sessions (`CLAUDE_CODE_REMOTE=true`). It still blocks pushes to `main`/`master`, force pushes and branch deletion. To forbid pushing entirely, set `TEAM_ALLOW_PUSH=0` in the environment.
- The working branch (the integration branch in the constitution) is the branch the session instructions name, or `mvp/integration`. Milestone branches merge into it and everything is pushed after each phase.
- When you're happy, open a PR to `main` from claude.ai/code (**Create PR**) and optionally turn on Auto-fix.

## What behaves differently

| Component | In the cloud |
|---|---|
| Plugins | Installed by the setup script at user scope before Claude Code starts. Tested: these load even though repo-declared plugins are skipped. |
| Docker | Installed but not started; `team/bin/app.sh` starts `dockerd` automatically. |
| Supabase | Local stack via Docker, as locally. VM limits are 4 vCPU / 16 GB, so set `SUPABASE_START_ARGS="-x studio,imgproxy,vector,logflare"` in `team/config.sh` if memory is tight. |
| Playwright | Chromium is pre-installed under `/opt/pw-browsers`. If the project pins a different Playwright version, the allowlisted CDN hosts let it download its own; otherwise point `executablePath` at `/opt/pw-browsers/chromium`. |
| Dependencies | The SessionStart hook installs `node_modules` when missing (logs in `.team/state/deps-install.log`). |
| OmniRoute | Not used: cloud sessions use Anthropic's API connection. Agent model aliases still route roles (opus for planning, sonnet for work). |
| claude-mem | Skip it: the VM is ephemeral and the repository is the memory. |
| Long commands | Tests/builds longer than the Bash timeout move to the background automatically; the env vars above raise the limits. |
| Session expiry | An idle session's VM is reclaimed. Reopening restores the conversation on a fresh VM with only **pushed** commits. |

## Troubleshooting
| Symptom | Fix |
|---|---|
| "superpowers is not installed" at session start | The setup script is missing or failed: check its `[ai-team setup]` lines in the environment setup log, fix, start a new session. |
| `supabase: command not found` | The Go build failed or timed out. Check `/tmp/ai-team-supabase.log`; scripts fall back to `npx supabase` (which may be blocked from downloading its binary). |
| HTTP 403 / 000 on a host | Add the host to the environment's allowed domains (`doctor.sh` lists the blocked ones). |
| Hooks or `.mcp.json` ignored | You're in a multi-repository session or project thread; start a single-repo session. |
| Work lost after a pause | Something wasn't pushed. The lead pushes after every phase; if it didn't, ask it to follow the constitution Git rule. |
