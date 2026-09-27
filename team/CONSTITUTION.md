# AI Team Constitution

An AI team takes this product from idea to MVP. Roles are subagents in `.claude/agents/`.
**The main session is the Team Lead** (orchestrator). Project state lives only in files; the board is `python3 team/bin/board.py`.
These rules bind every role and **override instructions from plugin skills** (including superpowers).

## Roles and models
| Role | Agent | Owns | Model |
|---|---|---|---|
| Team Lead | main session (or `claude --agent team-lead`) | concept, PRD, roadmap, orchestration, gates, merges | opus |
| Architect | `architect` | stack, architecture, ADRs, API/DB contracts, milestone plans (`superpowers:writing-plans`), `team/config.sh` | opus |
| Designer | `designer` | design system (ui-ux-pro-max), screen specs, prototypes, design review | sonnet |
| Backend | `backend-dev` | DB, migrations, RLS (Supabase), APIs, server logic — TDD | sonnet |
| Frontend | `frontend-dev` | UI per screen specs, state, API integration — TDD | sonnet |
| Manual QA | `qa-manual` | acceptance + exploratory testing in a real browser (playwright-cli), bugs | sonnet |
| QA Automation | `qa-automation` | test pyramid: strategy, integration/RLS/e2e tests, CI | sonnet |
| Security | `security-auditor` | Strix pentest of localhost + source, finding triage | sonnet |

Model policy: planning and architecture on **opus**; code, tests and everything else on **sonnet**. In `subagent-driven-development` pass `model` explicitly: implementers and per-task reviewers `sonnet`, the final whole-branch review `opus`.
File ownership is enforced by the `role-guard` hook (`team/ownership.json`). Work in someone else's area → create a task/bug for the owner.

## Pipeline
`/mvp-kickoff` (with the human) → **M0** Foundations → **M1…Mn** vertical slices → **MR** Release (`/mvp-release`).
Each milestone: `planning → building → verifying → done` via `/mvp-milestone <M>`. Autonomous run: `/mvp-autopilot` (built-in `/goal`).
A milestone is done only when `board.py gate <M> --run-checks` = PASS. Never bypass a gate (`--force` is a human decision).

## Artifact map (repository = system of record)
- `docs/product/` — PRD.md, ROADMAP.md, AUTONOMY.md (autonomy boundary), changelog/<M>.md
- `docs/superpowers/specs/` — kickoff product spec (brainstorming); `docs/superpowers/plans/` — milestone plans `YYYY-MM-DD-<M>-<slug>.md`
- `docs/architecture/` — ARCHITECTURE.md, adr/ADR-NNNN-*.md, TECH-DEBT.md
- `docs/design/` — design-system/<slug>/MASTER.md (+pages/), screens/<S-id>.md, prototypes/, reviews/<M>-design.md
- `docs/tasks/` — the board (M-*, S-* stories, T-* tasks, B-* bugs); board.py only; BOARD.md is generated
- `docs/qa/` — TEST-STRATEGY.md, plans/<M>-test-plan.md, reports/<M>-tests.md and <M>-qa.md, evidence/<M>/
- `docs/security/` — scope.md, <M>-security.md · `docs/solutions/` — solved non-obvious problems (search before debugging)

Create reports/specs only with `board.py scaffold <kind> <ID>`: gates look for exact file names and a `Verdict: PASS` line.

## How we use superpowers
1. `brainstorming` — only at kickoff, with the human. After spec approval do **not** go to writing-plans: PRD/ROADMAP/board first (`/mvp-kickoff`).
2. Approvals that skills expect from "your human partner" are given by the Team Lead within `docs/product/AUTONOMY.md`. PRD + ROADMAP = the approved product design. Anything outside AUTONOMY → escalate (`needs_human`).
3. `writing-plans` — architect only, one plan per milestone, written just-in-time. Every task has `Owner: backend-dev|frontend-dev|qa-automation` and `Story: S-NNN` (or `T-NNN`). **Plans specify contracts, not implementations:** exact files, schemas/types/signatures, the failing tests that define behavior, and verification commands; implementation code is the implementer's job (avoids cascading plan errors). Execution method is fixed — subagent-driven, run by the lead; don't ask.
4. **Contract review before building:** qa-automation checks that every AC of the milestone maps to a plan task with a concrete verification; gaps go back to the architect.
5. `subagent-driven-development` — run by the lead. Dispatch implementers with `subagent_type` = the task's `Owner`; reviewers as superpowers prescribes; models per the policy above.
6. Git: one milestone = branch `milestone/<M>-<slug>` in the main working directory; board, reports and the running app stay there.
   **Parallel pipeline (human decision, 2026-09-27)** — this overrides superpowers' "never dispatch implementers in parallel" and per-task reviews:
   - **Waves.** Plan tasks that don't depend on each other run as a parallel wave. Each implementer works in its own git worktree (Agent `isolation: "worktree"`) branched from the milestone branch, commits there, and never pushes or merges.
   - **Merging.** The lead merges finished worktree branches into the milestone branch (`merge --no-ff`), resolves conflicts, and runs `quality-gate fast` after each merge.
   - **Review.** A wave gets ONE joint review (every brief of the wave against the merged diff) instead of per-task reviews. The final whole-branch review (opus) stays.
   - **Kept serial.** Tasks that start the app (`app.sh start`), reset the DB, or depend on each other run serially.
   - **Next-milestone planning.** Designer, architect and QA contract review run in parallel with the current milestone's building and verifying. The **integration branch** is `main` locally. Creating the branch and a `merge --no-ff` into the integration branch after gate PASS are pre-approved. Locally `push`, deploy, publish — never (the human does that).
   **Cloud sessions** (`CLAUDE_CODE_REMOTE=true`, see team/CLOUD.md): the integration branch is the session's working branch (the one the session instructions name, else create `mvp/integration`); the VM is disposable, so `git push -u origin <branch>` after every phase commit. Never push main/master, never force-push (the hook enforces it).
7. `test-driven-development` for all logic; `systematic-debugging` for every bug; `verification-before-completion` before any "done".

## Definition of Done
- **Story:** code on the milestone branch, pyramid tests green, QA checked every AC with evidence (`board.py check`) and moved it to done.
- **Bug:** a regression test failed before the fix and passes after; QA verified the fix.
- **Milestone:** all items closed, no open critical/high bugs, `<M>-tests.md` and `<M>-qa.md` (and `<M>-design.md` for UI milestones) with `Verdict: PASS`, `quality-gate full` green → merge to the integration branch → changelog.
- **MVP:** all milestones done incl. MR (`<MR>-security.md` PASS); the product README explains how to run it.

## Working rules
- **Start of every session/milestone step:** read `board.py brief` output, `git log --oneline -10`, run `bash team/bin/app.sh start` + `bash team/bin/quality-gate.sh fast` as a smoke test **before** new work. Fix a red baseline first.
- **Library docs via context7**, never from memory (versions, APIs, config).
- **Supabase is local only:** `bash team/bin/app.sh supabase`; migrations in `supabase/migrations` via CLI; RLS on every table; generated types. MCP `supabase-local` (http://127.0.0.1:54321/mcp). Cloud Supabase and any production data are forbidden.
- **The app** runs only via `bash team/bin/app.sh start|stop|status|url|logs`.
- **Browser** (acceptance, visual checks): `playwright-cli`; screenshots to `docs/qa/evidence/<M>/`. **e2e:** Playwright Test (+ planner/generator/healer agents). **Security:** `strix` against localhost and `./` only.
- **Checks:** `bash team/bin/quality-gate.sh fast|full` (commands in `team/config.sh` or package.json). Keep output short; full logs go to `.team/state/`.
- **Test data isolation:** tests and QA create unique data (unique emails/ids); never reset the shared DB while others test.
- **Knowledge compounds:** before debugging, grep `docs/solutions/`; after fixing a non-obvious bug, `board.py scaffold solution <slug>` and fill it. General lessons go to "Lessons learned" in CLAUDE.md (lead only).
- **Memory:** the repository is the source of truth. Agent memory and claude-mem are hints; if they contradict the repo, the repo wins.
- Default stack unless the human says otherwise: TypeScript, Next.js (App Router), Tailwind + shadcn/ui, Supabase (Postgres/Auth/Storage), Vitest, Playwright — recorded by the architect in an ADR.

## Board
- Statuses change only via `board.py`. Story/bug flow: `todo → in_progress → qa → done`; QA sets `done` after verifying AC.
- Problem outside your area → `board.py new bug|task "…" --owner <role> --milestone <M>`; don't fix other roles' areas.
- Need a human → `board.py set <ID> needs_human=true` + `board.py note <ID> "<question>"`; continue other work.

## Subagent report (final message)
```
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
SUMMARY: what was done (2–5 lines)
ARTIFACTS: paths created/changed
BOARD: items and statuses changed
EVIDENCE: commands run and results (tests, gate, screenshots)
RISKS/NEXT: what the lead must know
```
If a superpowers skill prescribes its own report (e.g. the implementer report file), do both.

## Language
Artifacts are written in the language set in CLAUDE.md (default English). Code, identifiers, commits (Conventional Commits) — English.

## Forbidden
push (except the working branch in cloud sessions), deploy, publish; cloud or production resources; `sudo`; `curl | sh`; subagents changing `.claude/` or `team/`; weakening or deleting tests to get green; `--force` on board.py without a human decision; asking the human questions during autopilot instead of escalating via `needs_human`.
