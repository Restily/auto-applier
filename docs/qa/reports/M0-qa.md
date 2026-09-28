# Manual QA report M0

_Owner: Manual QA · 2026-09-28 · App: http://localhost:3000 · Build: 664f58c_

Verdict: PASS

## Scorecard (1–5, strict)
| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Functionality (AC observed working) | 5 | 100% AC | 7/7 AC across T-003 and T-004 verified with evidence |
| Robustness (exploratory charters) | 4 | ≥ 3 | 404 handled correctly, no secrets leaked, no-store header correct; only finding is a cosmetic missing favicon |
| UX clarity | 4 | ≥ 3 | health status conveyed by clear text ("Operational"/"OK"), not color alone; renders cleanly at 360/768/1280 |
| Accessibility | 4 | ≥ 3 | skip-to-content link, visible focus ring, status conveyed by text (screen-reader safe); no ARIA landmarks audit beyond this yet (fine for M0 skeleton) |

## Acceptance
| Story | AC | Result | Evidence |
|---|---|---|---|
| T-003 | 1. fresh start → web+API+Supabase up, app.sh url works | PASS | `bash team/bin/app.sh status` → app RUNNING http://localhost:3000, supabase RUNNING; `app.sh url` → http://localhost:3000 |
| T-003 | 2. GET /health (API) 200 w/ db+queue status; /health page shows it | PASS | `curl -i http://127.0.0.1:8000/health` → 200, `{"status":"ok",...}`; `curl -i http://localhost:3000/api/health` → 200; docs/qa/evidence/M0/T-003-health-1280.png, -768.png, -360.png |
| T-003 | 3. first migration enables RLS by default; generated DB types available; secrets via env + .env.example | PASS | `supabase/migrations/20260927132652_foundation.sql` (event trigger `enforce_rls`); `apps/web/src/lib/supabase/database.types.ts`; `backend/.env.example`, `apps/web/.env.example` — no secrets committed |
| T-003 | 4. LLM provider interface + deterministic fake, selected in tests | PASS | `backend/src/autoapplier/ports/llm.py`, `adapters/llm/fake.py`; `backend/tests/unit/test_config.py::test_test_env_requires_fake_llm`; `backend/tests/conftest.py` sets `APP_ENV=test` |
| T-004 | 1. TEST-STRATEGY.md defines pyramid incl. fakes | PASS (pre-checked by qa-automation) | `docs/qa/TEST-STRATEGY.md` |
| T-004 | 2. quality-gate fast/full run lint/typecheck/unit/integration/e2e and pass | PASS | live run: `bash team/bin/quality-gate.sh fast` → lint ✓ typecheck ✓ unit ✓ → PASS; full composition verified in `team/config.sh` |
| T-004 | 3. CI runs same gate on push; e2e smoke opens health page | PASS | `.github/workflows/ci.yml` runs `quality-gate.sh full` on push/PR after Valkey+Supabase setup; `tests/e2e/health.spec.ts` |

## Exploratory charters
| Charter | Duration | Findings |
|---|---|---|
| /health responsive at 360/768/1280 | 10m | Renders cleanly at all three widths, no overflow/clipping. Screenshots in docs/qa/evidence/M0/. |
| Keyboard focus + screen-reader text for status | 10m | First Tab lands on visible "Skip to main content" link (focus-visible ring styles). Status conveyed as text ("Operational", "OK"), not color-only — safe for screen readers/colorblind users. |
| Unknown route → 404 | 10m | `/this-route-does-not-exist-xyz` returns HTTP 404, renders app-styled "404 / This page could not be found." page, header/nav intact. No app JS error (console entry is just the browser logging the underlying 404 network response, expected). |
| /api/health and web /api/health headers | 10m | Both return `cache-control: no-store`, `content-type: application/json`. No `set-cookie`/auth leakage. |
| Secrets in page source / responses | 10m | Grepped health page HTML and both health JSON responses for SECRET/API_KEY/password/service_role — none found. `.env.example` files contain only placeholders/blanks. |
| Degraded/unavailable health state | 5m | Not reproducible manually without killing shared Supabase/Valkey (would break other agents' concurrent testing, disallowed). Covered by automated unit tests: `apps/web/src/components/health/health-status.test.tsx`, `apps/web/src/lib/health.test.ts`, `backend/tests/unit/test_health_service.py`, `test_health_domain.py`, `test_health_api.py` — accepted as sufficient evidence for this charter. |

## Bugs filed / re-verified
None. One trivial cosmetic note (not filed as a bug, below threshold for the bug process): `/health` and other pages request `/favicon.ico` which 404s (browser console error only, no user-visible impact, no favicon file present yet). Left for a future polish task rather than filed as a bug.
