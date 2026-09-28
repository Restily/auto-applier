# Automated test report M0

_Owner: QA Automation · 2026-09-28_

Verdict: PASS

## Summary
| Level | Added | Total | Passed | Failed | Duration |
|---|---|---|---|---|---|
| Backend unit (pytest) | 0 (pre-existing, reviewed) | 71 | 71 | 0 | 1.08s |
| Web unit/component (Vitest) | 0 (pre-existing, reviewed) | 37 (8 files) | 37 | 0 | 3.53s |
| Backend integration (pytest, live Supabase+Valkey) | 0 | 14 | 14 | 0 | 1.86s |
| DB/RLS schema invariants (pgTAP) | 0 | 5 | 5 | 0 | ~1s |
| Black-box integration (Vitest node, incl. CI workflow shape) | 0 | 15 (2 files) | 15 | 0 | 0.44s |
| e2e (Playwright, desktop + mobile) | 0 | 6 | 6 | 0 | 5.7s |
| **Total** | | **148** | **148** | **0** | |

Commands run: `bash team/bin/quality-gate.sh full` (lint, typecheck, unit, integration, build, e2e — all steps PASS), `npm run -s test:db` (pgTAP, standalone re-run — PASS). No harness config changes were needed; the existing suite already covered both tasks' ACs, so no new tests were added this pass — see below for the one gap closed.

## AC coverage
| Story | AC | Automated test | Note |
|---|---|---|---|
| T-003 | 1 — fresh clone: `app.sh start` starts web, API, local Supabase; `app.sh url` works | `tests/e2e/health.spec.ts`, `tests/integration/health.test.ts` | both pass against the running app |
| T-003 | 2 — `GET /health` 200 with DB+queue status; web `/health` shows it | `backend/tests/unit/test_health_domain.py`, `test_health_service.py`, `test_health_api.py`, `test_kv_keys.py`, `test_beat_schedule.py`; `backend/tests/integration/test_heartbeat_redis.py`, `test_celery_roundtrip.py`, `test_health_probes.py`, `test_api_health_live_db.py`, `test_api_lifespan_unreachable.py`; `apps/web/src/lib/health.test.ts`, `health-status.test.tsx`, `apps/web/src/app/api/health/route.test.ts`; `tests/integration/health.test.ts`; `tests/e2e/health.spec.ts` | all pass; e2e confirms status conveyed by text, not color |
| T-003 | 3a — first migration enables RLS by default | `supabase/tests/database/rls_default.test.sql` (pgTAP) | 5/5 assertions pass |
| T-003 | 3b — generated DB types available to web app | `apps/web/src/lib/supabase/database.types.test.ts`; `npm run -s check:db-types` (drift check, part of `test:integration`) | pass, no drift |
| T-003 | 3c — secrets from env with `.env.example` | `backend/tests/unit/test_config.py`, `test_sync_env.py`; `apps/web/src/lib/env.server.test.ts` | pass; `.env.example` present both sides |
| T-003 | 4 — LLM provider interface + deterministic fake selected in tests | `backend/tests/unit/test_llm_fake.py`, `test_llm_registry.py::test_fake_selected_in_tests`, `test_config.py::test_test_env_requires_fake_llm` | pass |
| T-004 | 1 — TEST-STRATEGY.md defines the pyramid incl. faking | docs/qa/TEST-STRATEGY.md (document, checked at T-004 AC1 2026-09-27) | already checked |
| T-004 | 2 — `quality-gate fast`/`full` run lint/typecheck/unit/integration/e2e smoke and pass | `bash team/bin/quality-gate.sh fast` and `full` | both PASS this pass (full: lint 4s, typecheck 6s, unit 8s, integration 14s, build 29s, e2e 9s) — checked below |
| T-004 | 3 — CI runs the same gate on push; e2e smoke opens the health page | `tests/integration/ci-workflow.test.ts` (asserts workflow starts Valkey and runs the gate); `tests/e2e/health.spec.ts`; `.github/workflows/ci.yml` reviewed (installs Node 22, uv, Supabase CLI, Chromium; runs `quality-gate.sh full` on push/PR) | pass — checked below |

## Failures and bugs
None. No product defects found this pass.

## fixme / quarantine
None. No flaky or quarantined tests.

## Coverage
Coverage thresholds are not yet gated at M0 per TEST-STRATEGY.md ("Coverage expectations" — wiring `pytest-cov`/Vitest `v8` coverage is deferred to M1, tracked there). M0's binding gate is the AC coverage rule above, which is fully satisfied: every T-003/T-004 AC maps to at least one automated test, all passing, matching the plan's Traceability table exactly (no gaps found).
