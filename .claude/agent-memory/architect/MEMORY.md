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
- M1 plan (2026-09-27): docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md, ADR-0013..0016. Waves: T1 alone (config+db reset) → T2,T3,T4,T5 → T6,T7,T8,T9 → T10,T11 → T12,T13 serial (app start).
- Parallel-wave rules (constitution rule 6, 2026-09-27): worktrees per task; one task owns migrations/Supabase restarts; generated files + lockfiles are regenerated, never hand-merged; pre-create i18n namespace files so feature tasks don't collide; tests must inject InMemoryJobQueue (shared dev worker runs older code).
- Local Supabase facts: GoTrue v2.197 issues ES256 JWTs (JWKS at /auth/v1/.well-known/jwks.json); mail catcher is Mailpit on :54324 (/api/v1); default auth rate limits (2 emails/h, 30 signups/5 min) break test suites; Google provider can't be faked locally (OIDC discovery).
- Licenses checked: pypdf BSD-3, python-docx MIT, pyjwt MIT, python-multipart Apache, anthropic MIT, next-intl MIT, eslint-plugin-i18next ISC, @axe-core/playwright MPL-2.0. PyMuPDF AGPL excluded.
- Current Claude models reject temperature/top_p; adapters must not send sampling params. Suggested tiers: smart=claude-opus-5, fast=claude-haiku-4-5 (config only).
- GoTrue v2.197 recovery expiry: checked against auth.users.recovery_sent_at + otp_expiry (auth.one_time_tokens.created_at is ignored). Expired/reused/unknown tokens all return 403 otp_expired, so tests need preconditions (token row exists / consumed) plus a fresh-token control. Token hash is readable from auth.one_time_tokens.token_hash (token_type 'recovery_token').
