---
name: mvp-status
description: "Short MVP status — milestones, open bugs, items waiting for a human, app state and the next step. Use when asked about progress or where the project stands."
allowed-tools:
  - Bash(python3 team/bin/*)
  - Bash(bash team/bin/*)
  - Bash(git log *)
---

## Board
!`python3 team/bin/board.py status`

## App
!`bash team/bin/app.sh status || true`

## Recent commits
!`git log --oneline -8 2>/dev/null || echo "(no git history)"`

Summarize for the human in ≤8 lines: where we are, what's blocked or waiting for them, and the exact next command (from "Next step"). If the board is empty, suggest `/mvp-kickoff <idea>`.
