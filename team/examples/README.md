# Optional settings

Copy the parts you need into `.claude/settings.local.json` (git-ignored, merged over `.claude/settings.json`).

| File | What it does |
|---|---|
| `statusline.settings.local.json` | Status line with the current milestone, progress and open bugs (`board.py statusline`). |
| `agent-teams.settings.local.json` | Enables experimental Agent Teams and a `TaskCompleted` quality gate. See team/OPERATIONS.md before using. |
| `free-local.settings.local.json` | Profile A: every role on a local Ollama model — free, offline, private. See team/LOCAL-FREE.md. |
| `free-hybrid.settings.local.json` + `litellm.free.yaml` | Profile B/C: LiteLLM gateway — planning on a pool of free cloud tiers (falls back to local), workers on the local model. See team/LOCAL-FREE.md. |
| `omniroute.settings.local.json` | Routes Claude Code through OmniRoute. Agents use the model aliases `opus`/`sonnet`, so remapping the aliases re-routes every role at once. See team/SETUP.md. |
