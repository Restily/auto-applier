---
name: mvp-autopilot
description: "Autonomous mode for the Team Lead — drive the MVP milestone by milestone without the human until done or until a human decision is required. Pairs with the built-in /goal. Use after /mvp-kickoff once AUTONOMY.md is approved."
---

# Autopilot protocol

## Start (the human does this once)
1. `python3 team/bin/board.py next-step` must not require a human (KICKOFF / APPROVAL / STOPPED / BLOCKED).
2. Recommended permission mode: auto (`claude --permission-mode auto`) or a sandbox/devcontainer. Hooks enforce the autonomy boundary in every mode.
3. Print the goal line: `python3 team/bin/board.py goal` — the human pastes it (built-in `/goal` keeps the session working turn after turn, survives resume and pauses on usage limits). Headless: `bash team/bin/autopilot.sh`.

## Loop (you, every turn)
1. `python3 team/bin/board.py next-step` and show the output.
2. `MILESTONE` → run the Skill `mvp-milestone` with the milestone id (or `mvp-release` for MR). Resume from the milestone's current phase; never restart finished phases.
3. After a milestone: show `board.py status` and `board.py next-step`, then continue with the next milestone in the same run.
4. `DONE` → final report (see /mvp-release §4) and stop.
5. `KICKOFF`/`APPROVAL`/`STOPPED`/`BLOCKED` → write the precise question(s) for the human and stop.

## Rules while on autopilot
- Never ask the human mid-run; never use AskUserQuestion. Decide within PRD + AUTONOMY; record product decisions with `board.py note` on the story and technical ones as ADRs.
- A blocked item must not stall the team: mark it `needs_human`, continue other work; block the milestone only when nothing else can progress.
- Respect budgets in AUTONOMY (fix rounds, scope cuts). Cut P2/P3 scope before sacrificing quality; never cut P0.
- Keep context small: subagents return short reports; artifacts live in files. After compaction, `board.py brief` (SessionStart hook) tells you where you are.
- Kill switch: if `.team/STOP` exists, next-step returns STOPPED — stop at the next safe point (after committing).
