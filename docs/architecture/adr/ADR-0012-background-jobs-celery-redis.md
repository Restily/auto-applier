# ADR-0012: Background jobs with Celery, Redis (Valkey locally) and Celery Beat

- Status: accepted — supersedes ADR-0003; amends ADR-0011 (local runtime gains a Valkey container and a Beat process)
- Date: 2026-09-27
- Deciders: human (product owner, PRD decision log 2026-09-27), architect

## Context
Workers poll aggregators (≤30 min) and Telegram channels (≤15 min), run AI structuring/scoring, prepare and send applications with pacing and daily limits, process payment events and expire credits. Requirements: idempotent sends, AI outages delay but lose no data, one failing source never blocks others, approved applications sent within 5 min. The human decided on **Celery with Redis** (broker + result backend) and **Celery Beat** for periodic jobs, replacing PgQueuer. License policy forbids copyleft: Redis 8 server is AGPL/SSPL, so the local server is **Valkey** (BSD-3, Redis-protocol compatible). The backend is async (FastAPI, asyncpg); Celery tasks are synchronous.

## Options considered
Local server: 1. **Valkey** container `valkey/valkey:8.1-alpine` (BSD-3; pull verified in the VM on 2026-09-27). 2. Redis ≤7.2 (BSD, EOL). 3. Redis 8 (AGPL/SSPL → excluded).
Long delays: A. **`scheduled_at` in Postgres + a Beat dispatcher every minute.** B. Celery ETA/countdown — with the Redis transport an unacked ETA message is redelivered after `visibility_timeout`, so long ETAs execute twice → excluded.
Async bridge: I. `asyncio.run()` per task with a short-lived pool per call — simple but opens a DB pool per task. II. **A per-process event loop and a lazily built container, reused by every task in that process.** III. Async-native task libraries (not Celery; contradicts the decision).
Heartbeat: a. **Redis key with TTL** (written on `worker_ready` and by a Beat-scheduled task). b. Postgres table.

## Decision
- **Packages:** `celery[redis]` 5.6.x (BSD-3; kombu pins the `redis` client `<6.5`), `redis` client 6.4.x (MIT). In code everything is plain Redis: `REDIS_URL=redis://127.0.0.1:6379/0` (broker **and** result backend); production may use any managed Redis/Valkey.
- **Celery configuration** (`autoapplier/adapters/queue/celery_factory.py: create_celery_app(settings) -> Celery`): JSON serializer only (`accept_content=["json"]`, never pickle); `task_acks_late=True`, `task_reject_on_worker_lost=True`, `worker_prefetch_multiplier=1`; `broker_transport_options={"visibility_timeout": 3600}`; `result_expires=86400`; default queue `default` (later `ingest`, `ai`, `send` with per-queue workers if needed); task names namespaced (`system.ping`, `system.heartbeat`, later `ingest.aggregator`, `apply.dispatch_due`, `apply.send`, …).
- **No ETA/countdown for business delays.** Pacing between sends, "send tomorrow" after a daily limit, retries after rate limits: the row gets `scheduled_at` in Postgres; a Beat task every minute (`apply.dispatch_due`, M3) selects due rows (`FOR UPDATE SKIP LOCKED`) and enqueues them. Celery `autoretry` with short backoff (≤ 60 s) is allowed only for transient errors.
- **Idempotency:** every send task is keyed (application idempotency key), re-reads DB state (`status = 'queued'` → claim → send → `sent`) and holds a Redis lock (`SET key NX PX`) per application while sending. A duplicate delivery is a no-op.
- **Redis is also the home of** rate-limit counters (daily per-channel limits, pacing windows), distributed locks against double sends, and the LLM response cache — each behind a port (`RateLimiter`, `LockManager`, `Cache`, added when first needed). All keys are prefixed `REDIS_KEY_PREFIX` (default `aa:`). **The credit ledger, applications and schedules stay in Postgres** (source of truth; Redis data is disposable).
- **Producers** (API, services) enqueue through the `JobQueue` port (`autoapplier/ports/queue.py`); `CeleryJobQueue` uses `app.send_task(name, …)` so the API never imports task code. The port has no delay parameter by design.
- **Async bridge (II):** tasks are thin sync functions that call `autoapplier.worker.runtime.run_async(lambda c: service_call(c, …))`. `run_async` keeps **one event loop and one `Container` (asyncpg pool, async Redis) per worker process**, created lazily on first use and rebuilt if the PID changed (prefork children); closed on `worker_process_shutdown`/`worker_shutdown`. Services stay async and unaware of Celery.
- **Processes:** `celery -A autoapplier.worker.celery_app worker` (prefork, concurrency 2 locally) and `celery -A autoapplier.worker.celery_app beat` (schedule file `backend/.celerybeat-schedule`, git-ignored). Exactly one Beat process per environment.
- **Health / heartbeat (a):** the worker writes `aa:heartbeat:worker` (JSON `{worker, version, at}`, TTL = `QUEUE_HEARTBEAT_MAX_AGE_S`, 30 s) on the `worker_ready` signal, and Beat schedules `system.heartbeat` every `WORKER_HEARTBEAT_INTERVAL_S` (10 s) which refreshes it — so a fresh key proves broker + Beat + worker are alive. `/health` queue check = Redis `PING` **and** heartbeat age ≤ 30 s. The `/health` contract (database + queue, 200/503) is unchanged.
- **Local runtime:** `scripts/valkey.sh start` idempotently runs the named container `autoapplier-valkey` (`127.0.0.1:6379`, no persistence) and waits for `PING`; `npm run dev` runs it before `concurrently` (api, worker, beat, web). Docker is guaranteed running because `app.sh start` ensures Supabase first. Tests use the same Valkey with unique key prefixes/queues per test and **never `FLUSHALL`/`FLUSHDB`**.
- **CI:** starts Valkey with the same script before `quality-gate.sh full`.

## Consequences
- Positive: mature, well-documented job system with Beat; Redis doubles as rate-limit/lock/cache store; Postgres stays the source of truth for anything that must not be lost or duplicated.
- Negative: one more container locally and in CI; two worker-side processes (worker + beat); sync/async bridge to maintain; Redis data is volatile (acceptable: nothing authoritative lives there); enqueue is not transactional with Postgres — producers commit the DB row first and a Beat dispatcher re-enqueues rows stuck in `queued` (outbox-style), so a lost message delays but loses nothing.
- Follow-ups: M2 adds per-source ingestion tasks and Beat entries; M3 adds `apply.dispatch_due`, `apply.send`, the `RateLimiter`/`LockManager` ports; the LLM cache port lands with M2 scoring.
