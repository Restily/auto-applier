---
name: mvp-autopilot
description: "Autonomous mode for the Team Lead — drive the MVP milestone by milestone without the human until done or until a human decision is required. Pairs with the built-in /goal. Use after /mvp-kickoff once AUTONOMY.md is approved."
---

# Autopilot protocol

## Start (the human does this once)
1. `python3 team/bin/board.py next-step` must not require a human (KICKOFF / APPROVAL / STOPPED / BLOCKED).
2. Recommended permission mode: auto (`claude --permission-mode auto`) or a sandbox/devcontainer. Hooks enforce the autonomy boundary in every mode.
3. Print the goal line: `python3 team/bin/board.py goal` — the human pastes it (built-in `/goal` keeps the session working turn after turn, survives resume and pauses on usage limits). Headless: `bash team/bin/autopilot.sh` — it runs **one fresh session per milestone** (`board.py goal --milestone <M>`), the cheapest mode.
4. Interactive and around? Run one milestone per session: `board.py goal --milestone <M>` → paste it; when it stops, `/clear` and paste the next one. State lives in files, so nothing is lost; a long-lived lead context is the single biggest token cost.

## Loop (you, every turn)
1. `python3 team/bin/board.py next-step` and show the output.
2. `MILESTONE` → run the Skill `mvp-milestone` with the milestone id (or `mvp-release` for MR). Resume from the milestone's current phase; never restart finished phases.
3. After a milestone: show `board.py status` and `board.py next-step`, then continue with the next milestone in the same run (with a milestone-scoped goal: stop instead — the next milestone gets a fresh session).
4. `DONE` → final report (see /mvp-release §4) and stop.
5. `KICKOFF`/`APPROVAL`/`STOPPED`/`BLOCKED` → write the precise question(s) for the human and stop.

## Rules while on autopilot
- Never ask the human mid-run; never use AskUserQuestion. Decide within PRD + AUTONOMY; record product decisions with `board.py note` on the story and technical ones as ADRs.
- A blocked item must not stall the team: mark it `needs_human`, continue other work; block the milestone only when nothing else can progress.
- Respect budgets in AUTONOMY (fix rounds, scope cuts). Cut P2/P3 scope before sacrificing quality; never cut P0.
- Keep context small: subagents return short reports; artifacts live in files; read only the files you need to decide. After compaction or `/clear`, `board.py brief` (SessionStart hook) tells you where you are.
- A milestone-scoped goal (`… Drive milestone <M> …, then stop`) ends the run when that milestone is done — don't start the next one in the same session.
- Every Agent call passes `model` explicitly (constitution model policy); never leave a subagent to inherit the lead's opus.
- Kill switch: if `.team/STOP` exists, next-step returns STOPPED — stop at the next safe point (after committing).
