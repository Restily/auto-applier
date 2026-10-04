# Operations

## Run modes
| Mode | How | When |
|---|---|---|
| Step by step | `/mvp-milestone M0`, `/mvp-milestone M1`, …, `/mvp-release` | first project, pilots, when you want to review each milestone |
| Autopilot (interactive) | `/mvp-autopilot` → paste the `/goal …` line from `board.py goal` | you're around but don't want to prompt each step |
| Autopilot (interactive, per milestone) | `board.py goal --milestone <M>` → paste; when it stops, `/clear` and paste the next | cheapest interactive mode: the lead's context never spans milestones |
| Autopilot (headless) | `bash team/bin/autopilot.sh --mode auto` — a fresh session per milestone (`--one-session` for the old single run) | overnight / remote; logs in `.team/state/autopilot-*.jsonl` |
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
| Whole-branch review (once per milestone) | yes — catches what builders miss | already one pass, not per task; can't cut without losing the independent check |
| Design review gate | valuable for UI products | create milestones without `--ui` for internal tools |
| dev-gate hook | cheap insurance | `TEAM_DEV_GATE=off` |
| role-guard hook | cheap insurance | `TEAM_ROLE_GUARD=off` (not recommended on autopilot) |
| Security (Strix) | release only | skip for throwaway prototypes (mark MR without `--release`) |

Other levers: fewer, bigger milestones; opus only for planning (default); OmniRoute routing for the work tier; `CLAUDE_CODE_SUBAGENT_MODEL` for a global override; **$0 runs** on a local model + free API tiers — [LOCAL-FREE.md](LOCAL-FREE.md).

## Parallel building
Building runs in dependency waves. The architect gives each build task a `files` set and `depends_on`; `board.py wave --milestone <M>` returns the next batch of ready, file-disjoint tasks and the lead dispatches one implementer per task in a single message.
- **Wave size:** default ≤4 (cloud VM ≈ 4 vCPU). Tune with `TEAM_WAVE_MAX` or `board.py wave --max N`.
- **What parallelizes:** tasks touching disjoint files. If waves keep coming back size 1, the plan didn't declare disjoint `files`/deps — fix the plan, don't fall back to serial.
- **Review is once per milestone** (whole-branch, opus), not per task — the main saving over classic subagent-driven-development.
- Implementers don't commit; the lead runs the fast gate once per wave and commits. During heavy parallel building you may set `TEAM_DEV_GATE=off` to skip the per-implementer gate and rely on the wave-join gate + final review (slightly faster/cheaper, slightly less immediate feedback).

## Token optimization (on by default)
- **One review per milestone**, not per task.
- **Workers skip re-loading CLAUDE.md** (`omitClaudeMd` on the six worker agents): the hard rules are enforced by hooks and carried in the preloaded `team-protocol`, so the full constitution isn't re-injected into every parallel spawn.
- **Best practices load on demand** from `team/practices/<role>.md` (read once per task), not preloaded into every spawn.
- **opus only** for the lead, architect and the final review; sonnet for all workers; the `/goal` evaluator and summaries on the small fast model.
- **The lead's context stays small.** A long-lived lead session is the biggest cost: every request re-reads the whole history. `autoCompactWindow: 200000` in `.claude/settings.json` compacts at 200K even on 1M-context models (the SessionStart hook restores the board brief after compaction), and `autopilot.sh` starts a fresh session per milestone.
- **Effort is pinned, not inherited.** Subagents without `effort` inherit the session's level, so a lead on `max` made every worker run on `max`. Every agent now pins `effort: high`; the settings default for the main session is `high` too. Picking `max` in the model picker still overrides it for that session — use it deliberately (e.g. kickoff), not for a whole autopilot run.
- **Unassigned subagents use sonnet** (`CLAUDE_CODE_SUBAGENT_MODEL`), so ad-hoc helpers don't silently run on the lead's opus; the opus reviewer is requested explicitly.
- **MCP servers only where used:** `disallowedTools` keeps `supabase-local` / `playwright-test` tool definitions out of roles that never call them.
- Roles delegate wide reading to `Explore`, read only named files, and never paste large output back (see team-protocol → Token discipline).
Quality is unchanged: the gates, independent QA/design/security evaluators, and the whole-branch review are all still there — only redundant context and duplicate reviews were removed.

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
| Custom/local model does nothing or derails | `bash team/bin/llm-check.sh`; see LOCAL-FREE.md → Troubleshooting |
| Autopilot stops early | `board.py next-step` tells why; stall = no tool use for several turns → give guidance and re-run `/goal` |
