# Setup

## Prerequisites
Node.js 20+, Python 3.9+, git, Docker (local Supabase, Strix), Claude Code (recent version with `/goal`).

## One command
```bash
bash team/bin/setup.sh                    # plugins + CLIs + board init + doctor
bash team/bin/setup.sh --with-strix --with-claude-mem
bash team/bin/doctor.sh                   # verify, incl. hook self-tests
```
Opening the repo in Claude Code also offers to install the plugins declared in `.claude/settings.json` (`enabledPlugins` + `extraKnownMarketplaces`).

## What gets installed
| Tool | How | Used by |
|---|---|---|
| superpowers | `claude plugin install superpowers@claude-plugins-official` | lead, architect, devs |
| frontend-design | `…/frontend-design@claude-plugins-official` | designer, frontend |
| typescript-lsp | `…/typescript-lsp@claude-plugins-official` + `npm i -g typescript typescript-language-server` | devs |
| security-guidance | `…/security-guidance@claude-plugins-official` | devs, security |
| context7 | `…/context7@claude-plugins-official` (or CLI mode: `npx ctx7 setup --cli --claude`) | everyone |
| supabase | `…/supabase@claude-plugins-official` (skills; its cloud MCP is denied in settings — see below) | backend, architect |
| ui-ux-pro-max | `claude plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` → `claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill` | designer |
| playwright-cli | `npm i -g @playwright/cli@latest && playwright-cli install --skills` | QA, designer, frontend |
| Playwright Test Agents | `npx playwright init-agents --loop=claude` (done by qa-automation in M0) | qa-automation |
| Supabase CLI | `brew install supabase/tap/supabase` (or scripts fall back to `npx supabase`) | backend, app.sh |
| Strix (optional) | `pipx install strix-agent` or `curl -sSL https://strix.ai/install \| bash` | security |
| claude-mem (optional) | `claude plugin marketplace add thedotmack/claude-mem` → `claude plugin install claude-mem@thedotmack` | lead (personal memory) |

## Supabase: local only
- `bash team/bin/app.sh supabase` starts the local stack; its MCP is `supabase-local` at http://127.0.0.1:54321/mcp (pre-approved in `.mcp.json` / `enabledMcpjsonServers`).
- The Supabase plugin's hosted MCP (cloud projects) is denied via `mcp__plugin_supabase_supabase` in `permissions.deny`, so autonomous agents can't touch real projects. If you want it for your own manual sessions, remove that rule in `.claude/settings.local.json` — never during autopilot.

## Strix configuration
The model is preset to Claude Sonnet in `.claude/settings.json` (`STRIX_LLM=anthropic/claude-sonnet-4-6`), so the only thing to provide is an Anthropic API key — Strix authenticates by key (there is no Claude-subscription login), and this key is billed through the API, separately from a Pro/Max plan. Set it once; Strix caches it in `~/.strix/cli-config.json`.
```bash
export LLM_API_KEY="sk-ant-…"        # from console.anthropic.com → API Keys
```
To use a different model or route through OmniRoute, override the preset:
```bash
export STRIX_LLM="openai/<omniroute-model>"; export LLM_API_BASE="http://localhost:20128/v1"
```
Strix saves config to `~/.strix/`; results go to `strix_runs/` (git-ignored). The `guard-bash` hook only allows localhost and local source as targets.

## OmniRoute (model routing)
1. Run OmniRoute and create combos for two tiers: **planning** (lead, architect, final review) and **work** (code, tests, QA, design, security).
2. Copy `team/examples/omniroute.settings.local.json` into `.claude/settings.local.json` and fill in: `ANTHROPIC_BASE_URL` (gateway root, no `/v1`), `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` (the `/goal` evaluator and summaries). Or use `omniroute launch`.
3. Agents declare `model: opus` / `model: sonnet`, so the aliases route every role. Keep Claude models on the planning tier; non-Claude models on reviewer/lead roles tend to break the protocols.

## Existing project
```bash
python3 team/bin/install.py /path/to/repo      # copies team files, merges settings/.mcp.json, imports the constitution in CLAUDE.md
```
The architect then documents the existing architecture in M0 instead of choosing a new stack.

## Cloud sessions
Plugins declared in `.claude/settings.json` are not installed in cloud sessions — use the environment setup script: [team/CLOUD.md](CLOUD.md).

## Optional settings
`team/examples/` — status line, Agent Teams mode, OmniRoute.
