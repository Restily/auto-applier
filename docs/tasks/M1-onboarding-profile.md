---
id: M1
type: milestone
title: "Onboarding & profile"
status: planning
owner: team-lead
priority: P1
ui: true
release: false
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Goal

<what value the user gets when this milestone ships>

## Demo scenario

<what a human can click through after completion>

## Definition of done

Run `board.py gate M1 --run-checks` — it enforces the DoD from team/CONSTITUTION.md.

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 14:38 todo → planning (team-lead)
- 2026-09-27 15:12 note (qa-automation): Contract review (qa-automation): GAPS (3), full detail + gap list in docs/qa/plans/M1-test-plan.md#contract-review; tracked as T-005 (owner: architect). All 25 ACs of S-001..S-006 map to a plan task + concrete verification; TDD ordering, Postgres/Redis/Storage isolation, fakes-only third-party policy, and wave file/DB-state independence all checked and sound. Test plan: docs/qa/plans/M1-test-plan.md.
- 2026-09-27 15:19 note (qa-automation): Contract review re-check (qa-automation): CONTRACT REVIEW: PASS. All 3 gaps from the first pass (T-005) independently confirmed closed in docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (commit 831df11) — real time-based recovery-token expiry, table-driven profile maxLength across SQL/zod/Python, and anon/owner-delete RLS sub-cases in both pgTAP files. docs/qa/plans/M1-test-plan.md updated: all 25 ACs ✓, RLS matrix has no remaining ⚠ cells. Ready to build.
