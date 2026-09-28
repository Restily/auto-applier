---
name: team-protocol
description: "How AI team roles read and change project state — board.py commands, statuses, evidence, handoffs. Preloaded into every role agent."
user-invocable: false
---

# Team protocol

The board (`docs/tasks/`) changes **only** via `python3 team/bin/board.py` — direct edits are blocked by a hook.

| Need | Command |
|---|---|
| What's in my milestone | `board.py list --milestone M1 [--owner <role>] [--open]` |
| Read an item / its AC | `board.py show S-003` · `board.py ac S-003` |
| What next for me | `board.py next --owner <role>` |
| Start / hand over | `board.py move S-003 in_progress --by <role>` · `… qa --by <role> --note "<what, commit>"` |
| Check an AC with evidence | `board.py check S-003 2 --by <role> --note "docs/qa/evidence/M1/S-003-ac2.png"` |
| Add info | `board.py note S-003 "text" --by <role>` |
| File a bug | `board.py new bug "<where: what is wrong>" --milestone M1 --severity high --owner frontend-dev --body-file - --by <role> <<'EOF'` … `EOF` |
| Create a task for another role | `board.py new task "<title>" --milestone M1 --owner <role> --ac "<done when>"` |
| Escalate to a human | `board.py set S-003 needs_human=true` + `board.py note S-003 "<question>"` |
| Create a report/spec file | `board.py scaffold <qa|tests|test-plan|screen|design-review|security|adr|solution> <ID>` |

Statuses: stories/tasks/bugs `todo → in_progress → qa → done` (+ `blocked`, `deferred`, `wontfix` with `--note`). Milestones `todo → planning → building → verifying → done`.
`done` for stories/bugs requires every AC checked; only the verifier checks AC. Milestone `done` requires `board.py gate <M>` PASS.

Bug severity: **critical** — data loss, security hole, crash, core flow impossible; **high** — core flow broken or wrong data, workaround exists; **medium** — secondary feature broken or clear UX/visual defect; **low** — cosmetic.
Bug body: steps to reproduce (numbered, from a clean state), expected, actual, evidence paths, environment (URL, viewport, account).

Evidence beats assertions: every "done" names the command/screenshot/test that proves it.

## Non-negotiables (every role)
- Best practices for your specialty are in `team/practices/<role>.md` — read it once before your first task ("what / how / where").
- Library APIs and versions via **context7**, never from memory. **Supabase is local only** (`bash team/bin/app.sh supabase`); never touch cloud/prod. Run the app only via `team/bin/app.sh`.
- Never weaken or delete a test, or disable a check, to go green. A failing test that exposes a real defect is a bug to file, not to silence.
- Touch only your own files/area; work elsewhere → file a task/bug for the owner (a hook blocks out-of-area writes anyway).
- Conventional Commits, English. Follow the lead's brief and this protocol over any plugin skill's default.
- Report in this format (do both if a superpowers skill also prescribes one):
  `STATUS: DONE|DONE_WITH_CONCERNS|NEEDS_CONTEXT|BLOCKED` · `SUMMARY` · `ARTIFACTS` (paths) · `BOARD` (items/statuses) · `EVIDENCE` (commands+results) · `RISKS/NEXT`.

## Token discipline (keep quality, cut waste)
- Delegate wide reading to the `Explore` subagent; don't slurp whole trees into your own context.
- Read only the files your task names; prefer `grep`/targeted reads over full-file reads; never paste large file or command output back — cite paths and the key lines.
- Keep reports tight (the format above). `quality-gate.sh` already writes full logs to `.team/state/`; quote only the failing lines.
