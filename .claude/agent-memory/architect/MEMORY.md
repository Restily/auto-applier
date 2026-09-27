# Architect memory (hints; the repo wins)

- Stack decided in M0: ADR-0001..0011 in docs/architecture/adr. npm workspaces (apps/*) + uv project backend/ (package autoapplier).
- License traps: psycopg/psycopg2 are LGPL -> asyncpg; procrastinate depends on psycopg -> PgQueuer (asyncpg). Pyrogram LGPL -> Telethon.
- Version pins (2026-09-27): TypeScript ~6.0 (typescript-eslint <6.1), ESLint 9 (react/import plugins lack 10), @playwright/test 1.56.1 (Chromium 1194 preinstalled at /opt/pw-browsers; 1.63 wants 1243).
- Supabase CLI must NOT be an npm dep (postinstall downloads from GitHub releases, blocked in cloud VM); wrapper scripts/supabase.sh.
- Ownership: qa-automation may only write root tests/**, *.test.*, playwright/vitest configs, package.json, supabase/tests, .github/workflows, docs/qa. Python tests under backend/tests are written by backend-dev.
- `server-only` must be aliased to an empty module in Vitest.
- context7 monthly quota ran out on 2026-09-27; fall back to PyPI/npm READMEs and vendor sites via curl. GitHub API is not reachable from the VM; Docker Hub is (actionlint via docker works).
- team/config.sh guards CHECK_* on root package.json existence ($ROOT is defined by both consumers before sourcing).
- 2026-09-27 human decision: Celery + Redis protocol (Valkey `valkey/valkey:8.1-alpine` locally; Docker Hub pull works) + Celery Beat, replacing PgQueuer (ADR-0012 supersedes ADR-0003). kombu[redis] pins redis-py <6.5. No ETA/countdown for business delays (visibility_timeout redelivery) -> scheduled_at in Postgres + Beat dispatcher. Heartbeat = Redis key aa:heartbeat:worker (worker_ready + Beat task every 10s, TTL 30s). Async bridge = AsyncRuntime (per-process loop + container).
