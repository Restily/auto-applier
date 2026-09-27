# ADR-0003: Job queue and scheduler on Postgres (PgQueuer)

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
Workers poll aggregators every ≤30 min and Telegram channels every ≤15 min, run AI structuring/scoring, prepare and send applications with pacing and daily limits, process payment webhooks and expire credits. Requirements: idempotent sends, AI outages delay but lose no data, one failing source never blocks others, "sent within 5 min". The human asked to keep local infra minimal (everything via `app.sh start`) and to prefer a Postgres-backed queue over Redis. License rule excludes LGPL.

## Options considered
1. **PgQueuer** (MIT): Postgres queue with `FOR UPDATE SKIP LOCKED`, LISTEN/NOTIFY wake-up, cron-style schedules, per-entrypoint concurrency limits, deferred jobs (`execute_after`), dedupe keys, asyncpg driver, in-memory mode for tests; schema installable as plain SQL (`pgq sql install`).
2. Procrastinate (MIT) — mature, but **hard-depends on psycopg 3 (LGPL-3.0)** → excluded.
3. Celery/Dramatiq/ARQ + Redis — extra service in local infra and CI; transactional enqueue impossible.
4. pg_cron + custom tables — scheduling only; we would hand-write the worker protocol.

## Decision
- **PgQueuer** with the **asyncpg** driver, one worker process `python -m autoapplier.worker` (started by `npm run dev`, i.e. by `app.sh start`).
- The PgQueuer schema is installed by a **Supabase migration** generated with `pgq sql install` for the pinned PgQueuer version (never `pgq install` at runtime), so `supabase db reset` reproduces it. Queue tables live in `public` with RLS enabled and all privileges revoked from `anon`/`authenticated`; only the backend's direct Postgres connection touches them.
- Recurring work uses PgQueuer schedules (cron expressions) registered by the worker. Entrypoint names are namespaced constants in `autoapplier/worker/jobs.py` (`system.ping`, later `ingest.aggregator`, `ingest.telegram`, `apply.send`, …).
- Producers (API, services) enqueue through the `JobQueue` port (`autoapplier/ports/queue.py`); enqueue inside the same DB transaction as the business row when both must commit together.
- Worker liveness: the worker upserts `public.worker_heartbeats` every 10 s; `/health` reports the queue as `ok` only if the queue tables are readable and a heartbeat is younger than 30 s.
- Sends are idempotent at the data level (unique application per user+vacancy, idempotency keys), not only at the queue level: a job may run twice.

## Consequences
- Positive: no Redis; enqueue is transactional; tests can drain the queue in-process.
- Negative: the queue shares Postgres resources with the app (fine for MVP volumes); upgrading PgQueuer requires a new migration with the schema diff.
- Follow-ups: per-channel pacing/limits are domain logic (M3), not queue features; a job-failure dashboard for the operator can reuse PgQueuer's log/statistics tables (M2 source health).
