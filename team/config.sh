# shellcheck shell=bash
# Project commands for quality-gate.sh and app.sh (sourced; $ROOT is the repo root in both).
# Owner: architect. Decisions: docs/architecture/ARCHITECTURE.md (Scripts contract), ADR-0011.
#
# Stack: npm workspaces (apps/web, apps/extension from M4) + uv project in backend/ (Python 3.11).
# Every CHECK_* is a root package.json script that fans out to all packages:
#   lint             = lint:py  (cd backend && uv run ruff check . && uv run ruff format --check . && uv run lint-imports)
#                    + lint:web (npm run lint --workspaces --if-present  → ESLint in apps/web, apps/extension)
#   typecheck        = typecheck:py (uv run --directory backend mypy)
#                    + typecheck:web (npm run typecheck --workspaces --if-present → next typegen && tsc --noEmit)
#                    + typecheck:tests (tsc -p tests)
#   test:unit        = test:unit:py (uv run --directory backend pytest tests/unit)
#                    + test:unit:web (npm run test:unit --workspaces --if-present → vitest run)
#   test:integration = app.sh start + test:integration:py (pytest tests/integration) + test:db (supabase test db, pgTAP)
#                    + test:integration:web (vitest run -c vitest.config.ts, tests/integration) + check:db-types + check:openapi
#   build            = build:web (npm run build --workspaces --if-present → next build to .next-build) + build:py (uv lock --check)
#   test:e2e         = app.sh start + playwright test (tests/e2e, Chromium 1194 at /opt/pw-browsers, @playwright/test 1.56.1)
# Until the skeleton exists (no root package.json) the checks stay empty and quality-gate skips them.

PM="npm"

if [[ -f "${ROOT:-.}/package.json" ]]; then
  CHECK_LINT="npm run -s lint"
  CHECK_TYPECHECK="npm run -s typecheck"
  CHECK_UNIT="npm run -s test:unit"
  CHECK_INTEGRATION="npm run -s test:integration"
  CHECK_E2E="npm run -s test:e2e"
  CHECK_BUILD="npm run -s build"
else
  CHECK_LINT="" CHECK_TYPECHECK="" CHECK_UNIT="" CHECK_INTEGRATION="" CHECK_E2E="" CHECK_BUILD=""
fi

# app.sh: `npm run dev` = scripts/sync_env.py + concurrently (api :8000, worker, web :3000).
# Ready only when web → API → DB + queue are healthy (web route handler proxies GET /health of the API).
APP_START_CMD="npm run dev"
APP_URL="http://localhost:3000"
APP_READY_PATH="/api/health"
APP_START_TIMEOUT=180

USE_SUPABASE="auto"   # supabase/config.toml exists from M0 Task 2
SUPABASE_START_ARGS="-x studio,imgproxy,vector,logflare"  # save RAM on the 4 vCPU / 16 GB VM; keeps auth, rest, storage, mail catcher
