---
id: T-016
type: task
title: "M1 plan Task 5: QA harness: throwaway users, Mailpit, axe, RLS/Storage/D5 as real users, chromium-mobile touch project"
status: qa
milestone: M1
owner: qa-automation
priority: P0
depends_on: [T-011, T-012]
files: [tests/tsconfig.json, playwright.config.ts, tests/integration/helpers/**, tests/integration/rls/**, tests/integration/playwright-config.test.ts, tests/e2e/fixtures/**, tests/e2e/helpers/**]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 5 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 22:50 todo → in_progress (team-lead)
- 2026-09-28 22:52 AC 1 ✔ (qa-automation): vitest run tests/integration/rls + playwright-config.test.ts: 21 passed; tsc -p tests clean
- 2026-09-28 22:52 in_progress → qa (qa-automation): QA harness + RLS/Storage/D5 tests + chromium-mobile Pixel 7; uncommitted
