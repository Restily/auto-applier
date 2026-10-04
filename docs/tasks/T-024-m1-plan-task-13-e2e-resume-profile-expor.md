---
id: T-024
type: task
title: "M1 plan Task 13: E2E: resume, profile, export, delete and D5 re-sign-up; full gate"
status: qa
milestone: M1
owner: qa-automation
priority: P0
depends_on: [T-017, T-018, T-023]
files: [tests/fixtures/resumes/**, tests/e2e/resume/**, tests/e2e/profile/**, tests/e2e/account/**]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-10-04
---

## What to do

…

## Definition of done

- [x] Plan task 13 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-10-04 12:05 todo → in_progress (team-lead)
- 2026-10-04 12:28 AC 1 ✔ (qa-automation): 36/36 e2e (resume 12, profile 10, account 12... x2 projects) twice in a row; npx tsc -p tests clean; quality-gate.sh full PASS (e2e 123 passed); specs in tests/e2e/{resume,profile,account}
- 2026-10-04 12:28 note (qa-automation): Added tests/fixtures/resumes (copied from backend fixtures; too-large file is built in memory, no 5 MB blob), tests/e2e/resume/{support,upload,failure,replace}.spec.ts, tests/e2e/profile/manual.spec.ts, tests/e2e/account/{support,export,delete}.spec.ts. No product bugs found. Not covered here: S-003 AC5 (stored-file access) is backend/RLS-level.
- 2026-10-04 12:28 in_progress → qa (qa-automation): test(e2e): resume extraction, profile, export and deletion journeys (uncommitted)
