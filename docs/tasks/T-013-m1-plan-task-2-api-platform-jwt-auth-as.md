---
id: T-013
type: task
title: "M1 plan Task 2: API platform: JWT auth, as_user, problem details, Storage/Auth-admin adapters, log redaction, settings cleanup"
status: qa
milestone: M1
owner: backend-dev
priority: P0
depends_on: [T-010, T-012]
files: [backend/src/autoapplier/config.py, backend/src/autoapplier/wiring.py, backend/src/autoapplier/logging.py, backend/src/autoapplier/api/app.py, backend/src/autoapplier/api/auth.py, backend/src/autoapplier/api/errors.py, backend/src/autoapplier/api/schemas/problem.py, backend/src/autoapplier/api/routes/me.py, backend/src/autoapplier/ports/auth.py, backend/src/autoapplier/ports/storage.py, backend/src/autoapplier/adapters/auth/**, backend/src/autoapplier/adapters/storage/**, backend/src/autoapplier/db/as_user.py, backend/.env.example, backend/openapi.json, apps/web/src/lib/api/schema.gen.ts, backend/tests/unit/test_config.py, backend/tests/unit/test_jwt_verifier.py, backend/tests/unit/test_api_auth.py, backend/tests/unit/test_problem_handlers.py, backend/tests/unit/test_logging_redaction.py, backend/tests/unit/test_storage_fake.py, backend/tests/unit/test_auth_fakes.py, backend/tests/integration/test_as_user.py, backend/tests/integration/test_jwt_verifier_live.py, backend/tests/integration/test_supabase_storage.py, backend/tests/integration/test_gotrue_admin.py]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 2 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 22:50 todo → in_progress (team-lead)
- 2026-09-28 22:56 AC 1 ✔ (backend-dev): backend: 191 pytest (unit+integration) pass; ruff, mypy, lint-imports (6 kept) clean; check:openapi exit 0; tests in backend/tests/unit/test_{config,jwt_verifier,api_auth,problem_handlers,logging_redaction,storage_fake,auth_fakes}.py and tests/integration/test_{as_user,jwt_verifier_live,supabase_storage,gotrue_admin}.py
- 2026-09-28 22:56 in_progress → qa (backend-dev): Plan task 2 implemented, uncommitted (lead commits wave)
