# Operations

## Run modes
| Mode | How | When |
|---|---|---|
| Step by step | `/mvp-milestone M0`, `/mvp-milestone M1`, …, `/mvp-release` | first project, pilots, when you want to review each milestone |
| Autopilot (interactive) | `/mvp-autopilot` → paste the `/goal …` line from `board.py goal` | you're around but don't want to prompt each step |
| Autopilot (headless) | `bash team/bin/autopilot.sh --mode auto` | overnight / remote; logs in `.team/state/autopilot-*.jsonl` |
| Strict lead | `claude --agent team-lead` | the main session takes the team-lead prompt and model (replaces the default system prompt) |

`/goal` keeps the lead working turn after turn, survives `--resume`, pauses on usage limits and stops when it stalls. The goal is met when `board.py next-step` prints `DONE`, and judged impossible when it needs a human (`KICKOFF`, `APPROVAL`, `STOPPED`, `BLOCKED`). Clear it with `/goal clear`.

## Permissions and safety
- Recommended: auto mode (`claude --permission-mode auto`) — a classifier reviews risky actions; the allowlist in `.claude/settings.json` covers routine commands.
- `bypassPermissions` only inside a disposable container/VM (e.g. a devcontainer). Hooks still enforce the boundary in every mode.
- The boundary itself: `docs/product/AUTONOMY.md` (what the team may decide) + `guard-bash` (what it may run) + `role-guard` (what each role may write) + gates.
- Kill switch: `touch .team/STOP` → next-step returns `STOPPED`; the lead stops at the next safe point. Remove the file yourself to resume.
- Secrets: `.env*` is git-ignored and `.env`/`.env.production` are unreadable for Claude. The team uses local Supabase keys only.

## What needs you
1. Kickoff and the autonomy grant.
2. `needs_human` items — `/mvp-status` lists them; answer in `board.py note <ID> "…"` (or in chat) and clear the flag: `board.py set <ID> needs_human=false` / `board.py move <M> planning --clear-human --note "…"`.
3. Handover: push, deploy, production database, secrets, domains.

## Monitoring
`/mvp-status` · `docs/tasks/BOARD.md` (generated kanban) · `git log` · reports in `docs/qa/reports/`, `docs/design/reviews/`, `docs/security/` · status line (`team/examples/statusline.settings.local.json`).

## Recovery
State is in files, so any session can continue: the SessionStart hook prints the board brief and recent commits; `/mvp-milestone <M>` resumes from the milestone's phase; superpowers keeps its ledger in `.superpowers/sdd/`. After a crash mid-building, run `/mvp-milestone <M>` — the lead re-reads the plan ledger and continues.

## Cost and speed levers
Every component encodes an assumption about what the model can't do alone — stress-test them on your projects and remove what isn't load-bearing.

| Component | Load-bearing? | Turn off / tune |
|---|---|---|
| Independent QA (manual + automation) | yes — builders grade themselves leniently | keep |
| Gates + board.py | yes — prevents premature "done" | keep |
| superpowers per-task review | high value, high cost | switch execution to superpowers "Native" mode for simple milestones (one final review) |
| Design review gate | valuable for UI products | create milestones without `--ui` for internal tools |
| dev-gate hook | cheap insurance | `TEAM_DEV_GATE=off` |
| role-guard hook | cheap insurance | `TEAM_ROLE_GUARD=off` (not recommended on autopilot) |
| Security (Strix) | release only | skip for throwaway prototypes (mark MR without `--release`) |

Other levers: fewer, bigger milestones; opus only for planning (default); OmniRoute routing for the work tier; `CLAUDE_CODE_SUBAGENT_MODEL` for a global override.

## Agent Teams (experimental, optional)
Default orchestration uses subagents (stable, cheaper, resumable). Agent Teams help where peers must talk: M0 foundations (architect ∥ designer ∥ qa-automation), the verifying phase (QA ∥ devs fixing), competing-hypothesis debugging. Enable with `team/examples/agent-teams.settings.local.json`. Caveats: higher token cost, teammates don't apply the `skills` field (they invoke skills themselves), permission prompts bubble to the lead, no resume of in-process teammates, one team per session. Keep file ownership disjoint.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Plugin skills missing (`superpowers:…`) | `bash team/bin/setup.sh`, then `/reload-plugins` |
| `supabase-local` MCP not connected | `bash team/bin/app.sh supabase` (Docker running), reconnect in `/mcp` |
| Gate fails on a report | create it with `board.py scaffold <kind> <M>` and end it with `Verdict: PASS`/`FAIL` |
| Agent says "role-guard denied" | intended: the work belongs to another role — create a task/bug for the owner |
| Dev loops on dev-gate | run `bash team/bin/quality-gate.sh fast` yourself; fix the baseline; `TEAM_DEV_GATE_RETRIES` |
| `playwright init-agents` removed MCP servers | `python3 team/bin/mcp_merge.py .team/state/mcp.backup.json .mcp.json` |
| Autopilot stops early | `board.py next-step` tells why; stall = no tool use for several turns → give guidance and re-run `/goal` |
