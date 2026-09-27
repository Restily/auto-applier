---
name: mvp-milestone
description: "Team Lead protocol for one milestone (M0…Mn) — planning → contract review → building (superpowers subagent-driven-development) → verifying (QA, design review) → gate → merge. Use to run or resume a milestone; the autopilot calls it in order."
argument-hint: "<milestone id, e.g. M1>"
---

# Milestone $0 — Team Lead protocol

You orchestrate; roles do the work. Keep your context lean: read reports and files, not transcripts. Every Agent call uses this brief:
```
ROLE TASK: <one-sentence objective>
MILESTONE/ITEMS: <M-id, S-/T-/B- ids>
INPUTS: <exact paths to read>
OUTPUTS: <exact paths / board changes expected>
CONSTRAINTS: <scope limits, what not to touch>
DONE WHEN: <verifiable criteria>
REPORT: constitution report format
```

## 0. Orient (every time you enter or resume)
1. `python3 team/bin/board.py show $0` · `board.py list --milestone $0` · `git log --oneline -10`.
2. Resume by milestone status: `todo`/`planning` → §1 · `building` → §3 · `verifying` → §4 · `done` → stop.
3. `docs/product/AUTONOMY.md` must say `approved: yes`; otherwise stop and ask the human.
4. Git: `git switch milestone/$0-<slug>` or create it from the integration branch (`main` locally; the working branch in cloud sessions — constitution Git rule). Commit pending board/doc changes. **Cloud:** after every commit in this protocol, `git push -u origin HEAD`.
5. Smoke baseline (skip before M0 has code): `bash team/bin/quality-gate.sh fast`. Red baseline → fix it first (delegate to the owner).

## 1. Planning — `board.py move $0 planning`
1. **Designer** (if the milestone has UI or is M0): M0 → design system; otherwise screen specs for every UI story (+ prototypes where useful).
2. **Architect** (after the designer): M0 → ARCHITECTURE, ADRs, config; always → ONE plan via superpowers:writing-plans with `Owner:`/`Story:` per task, contracts + tests (not implementations), traceability table; `board.py set <S-id> plan=<path>`.
   In M0 the architect and designer check the AC of their own `T-` items once the artifacts exist and move them to `done`.
3. **qa-automation — contract review + test plan**: check the plan against every AC of $0 (each AC → task + concrete verification), write `docs/qa/plans/$0-test-plan.md` (M0: `docs/qa/TEST-STRATEGY.md`). Gaps → send back to the architect (resume via SendMessage) until the review passes.
4. Your review (5 minutes, not a rewrite): scope matches PRD/ROADMAP, no gold-plating, tasks small, contracts before consumers, every task has an Owner. Then `git add docs && git commit -m "docs($0): plan, design, test plan"`.

## 2. Pre-building
`board.py move $0 building`; move the milestone's open stories/tasks that the plan implements to `in_progress` (`--by team-lead`).

## 3. Building — superpowers:subagent-driven-development
Run it on the plan file with these constitution overrides:
- implementer `subagent_type` = the task's `Owner` (`backend-dev` | `frontend-dev` | `qa-automation`); `model: sonnet` for implementers and per-task reviewers; final whole-branch review `model: opus`;
- work on the current milestone branch, no worktree; don't ask the human for approvals covered by AUTONOMY;
- implementer `BLOCKED`/`NEEDS_CONTEXT` on a product question → decide within the PRD and note it in the story (`board.py note`); beyond AUTONOMY → `needs_human` and continue with other tasks.
After the final review is clean: `bash team/bin/quality-gate.sh fast` must pass; move the implemented stories/tasks to `qa` with a note (commits). Commit.

## 4. Verifying — `board.py move $0 verifying`
1. `bash team/bin/app.sh start` (note the URL).
2. In parallel (one message, independent Agent calls):
   - **qa-automation**: implement/complete tests from the test plan, run `quality-gate full`, file bugs for product defects, write `docs/qa/reports/$0-tests.md` with a verdict;
   - **qa-manual**: acceptance of every AC of items in `qa` (stories and M0 tasks) with evidence + exploratory charters, bugs, `docs/qa/reports/$0-qa.md` with a scored verdict;
   - **designer** (UI milestones): design review → `docs/design/reviews/$0-design.md` with a scored verdict.
3. Triage `board.py list --milestone $0 --type bug --open`: critical/high → fix now; medium → fix if cheap, else `board.py set <B> milestone=<next>` + note; low → move to MR or `deferred`. Downgrading severity requires a note with the reason.
4. Fix loop (max 3 rounds): dispatch the bug's owner per bug (sequentially unless files are clearly disjoint): "superpowers:systematic-debugging, regression test first, check AC 1, move to qa". Then re-run only the affected evaluators: qa-manual re-verifies the bugs (+ quick smoke), qa-automation re-runs the suite and updates the report, designer re-checks visual bugs.
5. Still red after round 3 → `board.py move $0 blocked --human --note "<what and why>"` and stop.

## 5. Gate, merge, learn
1. `python3 team/bin/board.py gate $0 --run-checks`. FAIL → go back to the step that owns the failing check. Never `--force`.
2. PASS → `board.py scaffold milestone-report $0` and fill it (delivered stories, demo script, known issues, numbers: tests, bugs found/fixed, cost if known). `board.py move $0 done --note "gate PASS"`. Commit.
3. Merge: `git switch <integration branch> && git merge --no-ff milestone/$0-<slug> -m "merge: $0 <title>"`, then `bash team/bin/quality-gate.sh fast` there (cloud: push it). `bash team/bin/app.sh stop`.
4. Gardening (cheap): ask the architect for a 10-minute drift check (docs vs code, tech debt → `T-` items in the next milestone).
5. Retro in ≤5 lines: what slowed the team or caused rework → add only general, actionable rules to "Lessons learned" in CLAUDE.md.
6. Tell the human (short): what shipped, how to demo it, what's next.
