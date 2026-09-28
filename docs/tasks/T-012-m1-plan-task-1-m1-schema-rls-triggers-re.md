---
id: T-012
type: task
title: "M1 plan Task 1: M1 schema, RLS, triggers, resume bucket, Auth config, localized reset email, D5 fingerprint"
status: qa
milestone: M1
owner: backend-dev
priority: P0
depends_on: [T-010, T-011]
files: [supabase/**, backend/tests/integration/conftest.py, backend/tests/integration/supabase_helpers.py, backend/tests/integration/test_auth_gotrue.py, apps/web/src/lib/supabase/database.types.ts]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 1 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 12:39 todo → in_progress (team-lead)
- 2026-09-28 22:49 AC 1 ✔ (backend-dev): supabase test db 85/85 PASS; pytest tests/integration 26 passed; check:db-types ok; quality-gate fast PASS
- 2026-09-28 22:49 in_progress → qa (backend-dev): Finished WIP d069e1a: fixed touch_candidate_profile jsonb-type guard, lint/mypy; uncommitted, lead commits
