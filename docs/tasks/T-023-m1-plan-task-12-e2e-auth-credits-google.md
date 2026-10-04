---
id: T-023
type: task
title: "M1 plan Task 12: E2E: auth, credits, Google edge states, EN/RU, a11y and touch targets"
status: qa
milestone: M1
owner: qa-automation
priority: P0
depends_on: [T-008, T-009, T-016, T-019, T-020, T-021, T-022]
files: [tests/e2e/auth/**, tests/e2e/i18n/**, tests/e2e/a11y/**]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-10-04
---

## What to do

…

## Definition of done

- [x] Plan task 12 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-10-04 11:54 todo → in_progress (team-lead)
- 2026-10-04 12:05 note (qa-automation): Specs: tests/e2e/auth/{sign-up,sign-in,sign-out,password-reset,google}.spec.ts (+support.ts), tests/e2e/i18n/{locale,no-missing-keys}.spec.ts, tests/e2e/a11y/auth-and-shell.a11y.spec.ts. 88 tests x2 projects: 81 pass, 7 skipped (4 fixme for B-002/B-003 on both projects, 3 touch-target tests desktop-skipped by design), 0 fail, two consecutive runs identical. Bugs filed: B-002 (reset email ignores later language switch, medium), B-003 (pre-sign-in language discarded after sign-in, low). B-001 not duplicated. Not committed.
- 2026-10-04 12:05 AC 1 ✔ (qa-automation): npx playwright test tests/e2e/auth tests/e2e/i18n tests/e2e/a11y -> 81 passed, 7 skipped (2 fixme x2 projects for B-002/B-003, 3 desktop-skipped touch tests), twice in a row; npx tsc -p tests exit 0; quality-gate fast PASS
- 2026-10-04 12:05 in_progress → qa (qa-automation): e2e auth/i18n/a11y specs in tests/e2e/{auth,i18n,a11y}; uncommitted
