---
id: T-003
type: task
title: "App skeleton, local Supabase and health page"
status: qa
milestone: M0
owner: backend-dev
priority: P0
plan: docs/superpowers/plans/2026-09-27-M0-foundations.md
needs_human: false
created: 2026-09-27
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Given a fresh clone, When `bash team/bin/app.sh start` runs, Then the web app, the Python API and the local Supabase start and `app.sh url` returns a working URL
- [x] GET /health on the API returns 200 with status of database and queue; the web /health page shows it
- [x] The first migration enables RLS by default; generated DB types are available to the web app; secrets are read from env with a .env.example
- [x] An LLM provider interface with a deterministic fake implementation exists and is selected in tests

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 12:38 set plan=docs/superpowers/plans/2026-09-27-M0-foundations.md (team-lead)
- 2026-09-27 13:05 todo → in_progress (team-lead)
- 2026-09-28 08:02 in_progress → qa (team-lead): all plan tasks merged; final review clean
- 2026-09-28 08:05 AC 1 ✔ (qa-manual): app.sh status: app RUNNING http://localhost:3000, supabase RUNNING; app.sh url returns http://localhost:3000 (fresh-start evidenced by harness/CI)
- 2026-09-28 08:05 AC 2 ✔ (qa-manual): curl http://127.0.0.1:8000/health and http://localhost:3000/api/health both 200 with database+queue checks ok; /health page renders Overall status: Operational, Database OK, Queue OK — docs/qa/evidence/M0/T-003-health-1280.png
- 2026-09-28 08:05 AC 3 ✔ (qa-manual): supabase/migrations/20260927132652_foundation.sql: event trigger enforce_rls enables RLS on every new table by default; apps/web/src/lib/supabase/database.types.ts generated and used by web; backend/.env.example + apps/web/.env.example present, no secrets committed, all values blank/placeholder
- 2026-09-28 08:05 AC 4 ✔ (qa-manual): backend/src/autoapplier/ports/llm.py + adapters/llm/fake.py deterministic fake; config.py enforces LLM_PROVIDER=fake when APP_ENV=test (test_test_env_requires_fake_llm in backend/tests/unit/test_config.py); conftest.py sets APP_ENV=test for all backend tests
