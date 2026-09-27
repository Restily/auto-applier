# Architecture

_Owner: Architect · 2026-09-27 · Decisions: docs/architecture/adr/ · Debt: docs/architecture/TECH-DEBT.md_

## Context
AutoApplier finds vacancies across job aggregators (incl. Hirify/HireHi), Telegram channels and LinkedIn, scores them against the user's profile with AI, and sends personalized applications from the user's own email, Telegram account or LinkedIn (Easy Apply via our Chrome extension) within safe limits, paid by credits (PRD: `docs/product/PRD.md`).

Quality attributes that drive the design:
- **Security/privacy:** user secrets encrypted at rest and never in the browser; RLS on every table; audit trail of sends; full deletion.
- **Reliability:** idempotent sends and webhooks; one failing source never blocks others; AI outages delay, never lose data.
- **Safety rules as server-side logic:** daily limits, pacing, de-duplication, 14-day recruiter cooldown.
- **Testability without real accounts or money:** every third party behind a port with a fake and recorded fixtures.
- **Minimal local infra:** the Supabase stack plus one Valkey (Redis-compatible) container; everything starts with `bash team/bin/app.sh start`.
- Performance budgets: API p95 < 300 ms reads, feed first page < 1 s at 10k vacancies, LCP < 2.5 s.

## Components and boundaries
```
             ┌──────────── Browser ─────────────┐        ┌──── Chrome + extension (M4) ─────┐
             │  Next.js UI (same origin only)    │        │ service worker ─ content scripts │
             └───────────────┬───────────────────┘        └───────────────┬──────────────────┘
                             │ HTTPS (cookies)                            │ /ext/v1 (extension token)
             ┌───────────────▼───────────────────┐                        │
             │ apps/web  Next.js 16 (server)     │  /v1 + user JWT        │
             │ RSC · server actions · /api/health├──────────┐             │
             └───────┬───────────────────────────┘          ▼             ▼
      supabase-js    │ (RLS, user session)        ┌──────────────────────────────────┐   /webhooks/*
      plain CRUD     │                            │ backend  FastAPI API (:8000)     │◀── Stripe, crypto,
             ┌───────▼───────────────────────┐    │ services · domain · ports        │    Telegram bot
             │ Supabase local                │◀───┤ adapters (LLM, mail, Telegram,   │
             │ Postgres (RLS) · Auth ·       │    │ payments, sources) — fakes in dev│
             │ Storage (private resumes) ·   │◀───┤ Celery worker + Celery Beat      │
             │ mail catcher                  │    │ (ingestion, AI, sending)         │
             └───────────────────────────────┘    └──────────────┬───────────────────┘
                                                                 │ broker · results · limits · locks · LLM cache
                                                  ┌──────────────▼───────────────────┐
                                                  │ Valkey (Redis protocol, :6379)   │
                                                  └──────────────────────────────────┘
```
| Component | Responsibility | Talks to | ADR |
|---|---|---|---|
| **Web app** `apps/web` | UI (EN/RU), auth screens and session (Supabase Auth via `@supabase/ssr`), plain user-owned CRUD through RLS, server-side calls to the API | Supabase (user session), Python API (`/v1`, server-side only) | 0001, 0004, 0010 |
| **Python API** `backend/…/api` | Business commands: resume extraction, matching, applications, credits, connections, payments, operator tools, extension endpoints, webhooks, `/health` | Postgres (asyncpg), queue, adapters | 0002, 0004 |
| **Worker** `backend/…/worker` | Celery worker + Celery Beat: scheduled ingestion (aggregators, Telegram channels), AI structuring/scoring, dispatching due applications (`scheduled_at` in Postgres) and sending them with limits/pacing, payment event processing, credit expiry | Postgres, Redis, adapters | 0012 |
| **Valkey (Redis)** local container | Celery broker and result backend, worker heartbeat, rate-limit counters, send locks, LLM response cache (all disposable; nothing authoritative) | — | 0012 |
| **Supabase (local)** | Postgres with RLS, Auth (email/password, Google), Storage (private `resumes` bucket), mail catcher | — | 0004, 0011 |
| **Chrome extension** `apps/extension` (M4) | LinkedIn Jobs/posts collection and Easy Apply in the user's browser; paired with a scoped token | Python API `/ext/v1` only | 0005 |
| **LLM layer** `backend/…/ports/llm.py` + `adapters/llm` | Provider-agnostic completion with tiers; Claude default; deterministic fake in tests | Anthropic / OpenAI / OpenRouter / fake | 0006 |
| **Integration adapters** `backend/…/adapters/*` | LinkedIn fixtures, Telegram MTProto (Telethon), Telegram Bot API/Stars, Gmail/SMTP, Stripe, USDT gateway, aggregators — each with a fake and fixtures | third parties (never in tests) | 0007, 0009 |

## Stack
| Concern | Choice | Version | ADR |
|---|---|---|---|
| Repo / package managers | npm workspaces (`apps/*`) + uv project `backend/` | npm 10 (Node 22), uv 0.8 | 0001, 0011 |
| Web framework | Next.js App Router, React | 16.3.x, 19.x | 0001 |
| Language (web) | TypeScript | ~6.0 (typescript-eslint supports `<6.1`) | 0001 |
| UI | Tailwind CSS + shadcn/ui (Radix) + lucide-react; tokens from `docs/design/tokens.css` | 4.x / CLI 4.x | 0001 |
| Web validation | zod | 4.x | 0001 |
| Supabase clients | @supabase/ssr, @supabase/supabase-js | 0.12.x, 2.x | 0004 |
| Web → API client | openapi-typescript + openapi-fetch | 7.x, 0.17.x | 0001 |
| i18n | next-intl (no locale routing) — wired in M1 | 4.x | 0010 |
| Backend | Python, FastAPI, uvicorn, pydantic v2, pydantic-settings | 3.11, 0.141.x, 0.54.x, 2.13.x, 2.15.x | 0002 |
| DB driver | asyncpg (psycopg is LGPL → excluded) | 0.31.x | 0002 |
| Queue / scheduler | Celery (`celery[redis]`) + Celery Beat; `redis` client | 5.6.x; 6.4.x (kombu pins `<6.5`) | 0012 |
| Broker / cache server | Valkey (BSD-3, Redis-compatible) — `valkey/valkey:8.1-alpine` locally | 8.1 | 0012 |
| Auth tokens | PyJWT | 2.x | 0004 |
| Encryption | cryptography (AES-256-GCM) | 50.x | 0008 |
| Telegram MTProto | Telethon (MIT) | 1.45.x | 0007 |
| LLM SDKs | anthropic (default), openai (OpenAI/OpenRouter) — added in M1 | — | 0006 |
| Extension | WXT, Manifest V3, TypeScript (M4) | 0.21.x | 0005 |
| Database / Auth / Storage | Supabase CLI local stack | CLI 2.x | 0011 |
| Lint | ESLint 9 flat + eslint-config-next; ruff; import-linter | 9.39.x; 0.16.x; 2.x | 0001, 0002 |
| Typecheck | tsc; mypy --strict | ~6.0; 2.x | 0001, 0002 |
| Tests | Vitest + Testing Library + jsdom; pytest + pytest-asyncio + respx; pgTAP (`supabase test db`); Playwright Test | 5.x; 9.x; —; **1.56.1 (pinned)** | 0011 |
| Dev orchestration | concurrently | 10.x | 0011 |

## Modules and layering

### Backend (`backend/src/autoapplier/`)
| Package | Contains | May import |
|---|---|---|
| `domain` | Pure business rules and value objects (health aggregation, later: matching score rules, limits, credits math). No IO. | stdlib, pydantic |
| `ports` | Protocols + DTOs for everything outside the process (`LLMProvider`, `JobQueue`, `HealthProbe`, later `MailSender`, `TelegramUserClient`, `PaymentGateway`, `VacancySource`) | `domain` |
| `services` | Use cases; orchestrate repositories and ports | `domain`, `ports`, `db`, `kv`, `config` |
| `db` | asyncpg pool, repositories (SQL), DB-backed probes | `domain`, `ports`, `config` |
| `kv` | Redis clients (async + sync), key naming with `REDIS_KEY_PREFIX`, worker heartbeat read/write, Redis-backed probes | `domain`, `ports`, `config`, `redis` |
| `adapters/<port>/` | Real and fake implementations of ports (incl. `adapters/queue/celery_factory.py` + `CeleryJobQueue`) | `domain`, `ports`, `config`, `kv`, third-party SDKs |
| `security` | Secret encryption (ADR-0008), token hashing | stdlib, `cryptography`, `config` |
| `wiring` | Composition root: builds pool, adapters, services from `Settings` | everything below entry points |
| `api` | FastAPI app, routers, request/response schemas, problem+json errors | `services`, `ports`, `domain`, `wiring`, `config` |
| `worker` | Celery app module, thin sync tasks, Beat schedule, signals (heartbeat), `runtime.run_async` bridge (per-process loop + container) | `services`, `ports`, `domain`, `wiring`, `kv`, `config`, `celery` |
| `config` | `Settings` (pydantic-settings) | stdlib, pydantic |

**Enforcement:** import-linter contracts in `backend/pyproject.toml` (run by `npm run lint`). Contract names are the fix instructions, e.g.:
- "domain is pure — move IO into adapters/db and depend on a port from autoapplier.ports"
- "ports declare interfaces only — no services/adapters/db/api/worker imports"
- "services depend on ports, not adapters — inject implementations via autoapplier.wiring"
- "adapters, db and kv never import services or entry points — return data, let the service decide"
- "api must not import adapters or celery — enqueue through ports.queue.JobQueue from wiring"
- "adapters are independent of each other"

### Web (`apps/web/src/`)
| Folder | Contains | Rules |
|---|---|---|
| `app/` | Routes (RSC pages, layouts, route handlers, server actions) | May import `components`, `lib` |
| `components/ui/` | shadcn/ui primitives (generated, then owned) | No imports from `app/` or `lib/api`, `lib/supabase` |
| `components/<feature>/` | Feature components (presentational where possible) | No imports from `app/` |
| `lib/api/` | `client.ts` (server-only openapi-fetch client), `schema.gen.ts` (generated) | Only place importing `openapi-fetch` |
| `lib/supabase/` | `server.ts`, `client.ts`, `database.types.ts` (generated) | Only place importing `@supabase/ssr` / `@supabase/supabase-js` |
| `lib/<feature>.ts` | View-model mapping and pure helpers (unit-tested) | No imports from `app/` or `components/` |
| `lib/env.server.ts` | zod-validated server env | `import "server-only"` |

**Enforcement:** ESLint `no-restricted-imports` (supabase and openapi-fetch outside their folders) and `import/no-restricted-paths` zones (components ↛ app, lib ↛ components/app), each with a message that tells how to fix it; `server-only` imports in `lib/api/client.ts`, `lib/supabase/server.ts`, `lib/env.server.ts` make the build fail if client code imports them. Generated files (`database.types.ts`, `schema.gen.ts`) are regenerated, never edited (`npm run gen:db-types`, `npm run gen:api-types`); drift is checked in `npm run test:integration`.

### Extension (`apps/extension/`, M4)
Service worker = only network/token holder; content scripts = DOM only; popup/options = UI. See ADR-0005.

## Data model
Tables are created only by `supabase/migrations/*.sql`. **RLS is on by default**: an event trigger (`internal.enforce_rls`, M0 migration) enables RLS on every table created in `public`, and a pgTAP test fails if any `public` table lacks RLS. Schema `internal` holds helper functions; schema `private` (not exposed through the Data API) holds secrets.

RLS patterns:
- **Own rows (O):** `using (user_id = (select auth.uid()))` for select; writes only where the user may edit directly (profile fields, searches).
- **Catalog (C):** readable by `authenticated`; writes by operators (`internal.is_operator()`) or the backend.
- **Backend-only (B):** RLS on, no policies, privileges revoked from `anon`/`authenticated`; accessed only by the backend's service connection.
- **Read-own, backend-writes (R):** users select their own rows; inserts/updates only by the backend (credits, applications, audit).

| Table (milestone) | Key columns | RLS |
|---|---|---|
| `profiles` (M1) | id = auth.users.id, display_name, ui_locale, onboarding state | O |
| `user_roles` (M1) | user_id, role (`operator`) | R (read own) |
| `resumes` (M1) | user_id, storage_path (private bucket `resumes/<user_id>/…`), parsed_at | O |
| `candidate_profiles` (M1) | user_id, titles, skills, experience jsonb, languages, location, salary, links, version | O |
| `saved_searches` (M2) | user_id, filters jsonb, threshold (default 70), mode review/autopilot, channel_order | O |
| `sources`, `telegram_channels` (M2) | kind, url/username, enabled, added_by | C |
| `source_fetches` (M2) | source_id, started_at, status, error, items | B (operator read via API) |
| `vacancies` (M2) | canonical fields, language, contacts, posted_at, dedupe_key UNIQUE | C (read) / backend writes |
| `vacancy_matches` (M2) | user_id, search_id, vacancy_id, score, reasons | R |
| `applications` (M2–M3) | user_id, vacancy_id (UNIQUE per user), channel, status, idempotency_key UNIQUE, cover_letter, sent_at | R (+ user edit of draft letter via API) |
| `application_events` (M3) | application_id, event, payload, at (audit trail) | R |
| `channel_connections` (M3–M4) | user_id, kind email/telegram/linkedin, status, consent_accepted_at, daily_limit, public metadata | R |
| `private.user_secrets` (M3) | user_id, connection_id, kind, key_id, nonce, ciphertext | B (private schema) |
| `recruiter_contacts` (M3) | user_id, contact_hash, last_contacted_at (14-day rule) | B |
| `extension_devices`, `extension_pairings`, `extension_tasks` (M4) | token_hash, scopes, lease | R / B |
| `credit_ledger`, view `credit_balances` (M1 grant, M3 spend, M5) | user_id, delta, reason, ref UNIQUE | R |
| `plans`, `subscriptions`, `payment_events` (M5) | provider refs UNIQUE | C / R / B |

Redis keyspace (disposable, prefix `REDIS_KEY_PREFIX`, default `aa:`): `aa:heartbeat:worker` (M0, TTL 30 s), later `aa:rl:<user>:<channel>:<date>` (daily counters), `aa:lock:send:<application_id>`, `aa:llm:<fingerprint>` (cache). Celery's own keys (broker queues, results) live in the same DB. Schedules for delayed work are Postgres columns (`scheduled_at`), never Redis/ETA (ADR-0012).

Deletion: every user-owned table references `auth.users(id) on delete cascade`; storage objects and secrets are deleted by the account-deletion job (M1 S-006, extended in M3/M4).

## Auth and authorization
- Supabase Auth: email/password (M1), Google OAuth (M1, local stack with a fake/disabled provider in tests), sessions in cookies via `@supabase/ssr`; `proxy.ts` refreshes the session.
- Python API verifies the Supabase JWT (PyJWT, JWKS, `aud=authenticated`) and executes user-scoped SQL as role `authenticated` with the JWT claims set, so RLS applies to the backend as well (ADR-0004).
- Operator: `user_roles` + `internal.is_operator()`; operator routes are `/v1/operator/*` and additionally check the role in the API.
- Extension: scoped hashed token on `/ext/v1/*` (ADR-0005). Webhooks: provider signatures (ADR-0009).

## API style and error handling
- REST/JSON, prefixes `/v1`, `/ext/v1`, `/webhooks`, plus `GET /health`. OpenAPI exported to `backend/openapi.json` → `apps/web/src/lib/api/schema.gen.ts`.
- Errors: RFC 9457 problem details with a stable `code`; 422 for validation; `Idempotency-Key` on credit-spending/sending commands.
- `GET /health` (M0 contract): `200` when all checks are `ok`, `503` otherwise, body always
  `{"status": "ok"|"degraded", "version": str, "checks": {"database": Check, "queue": Check}}`, `Check = {"status": "ok"|"down", "latency_ms": float, "detail": str|null}`. It never exposes secrets or connection strings.
- Web: server components fetch through `lib/api`; errors become view models (e.g. `unavailable`) — pages render an explicit error/empty state, never a crash.
- Logging: stdlib `logging` in M0; structured JSON logs with secret-key redaction from M1.

## Configuration and environments
Local only (plus CI). Environments: `APP_ENV = local | test | ci`.
- Committed templates: `backend/.env.example`, `apps/web/.env.example`. Generated, git-ignored: `backend/.env`, `apps/web/.env.local` (by `python3 scripts/sync_env.py`, run by `npm run dev`, filling values from `supabase status -o env`).
- Backend variables: `APP_ENV`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` (M1), `API_HOST`, `API_PORT`, `WEB_ORIGIN`, `LLM_PROVIDER` (`fake` default), `LLM_MODEL_FAST`, `LLM_MODEL_SMART`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `REDIS_URL` (`redis://127.0.0.1:6379/0`, broker + results), `REDIS_KEY_PREFIX` (`aa:`), `WORKER_HEARTBEAT_INTERVAL_S` (10), `QUEUE_HEARTBEAT_MAX_AGE_S` (30), `HEALTH_PROBE_TIMEOUT_S` (2), `APP_ENCRYPTION_KEYS` (M3).
- Web variables: `API_URL` (server-only, `http://127.0.0.1:8000`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `APP_ENV=test` forces fake providers (settings validation). Cloud Supabase and real third-party keys are never configured by the team.

## Testing approach
Strategy and pyramid: `docs/qa/TEST-STRATEGY.md` (qa-automation, M0 T-004).
| Level | Tooling | Location | Owner |
|---|---|---|---|
| Python unit (domain, services with fakes, adapters vs fixtures) | pytest | `backend/tests/unit/` | backend-dev |
| Python integration (repositories, probes, Celery round-trip, API against local DB and Valkey) | pytest + local Supabase + local Valkey (unique key prefixes/queues, never FLUSHALL) | `backend/tests/integration/` | backend-dev (TDD), qa-automation extends |
| Contract tests per port (fake vs real-on-fixtures) | pytest | `backend/tests/contract/` | backend-dev |
| DB/RLS | pgTAP via `supabase test db`; supabase-js as real users | `supabase/tests/`, `tests/integration/` | backend-dev (migration TDD), qa-automation |
| Web unit/component | Vitest + Testing Library + jsdom | `apps/web/src/**/*.test.ts(x)` | frontend-dev |
| Black-box integration (API + web route handlers, RLS as users) | Vitest (node) | `tests/integration/` | qa-automation |
| E2E | Playwright Test (Chromium) | `tests/e2e/` | qa-automation |
| Extension (M4) | Vitest; Playwright with unpacked extension + fixture LinkedIn site | `apps/extension/`, `tests/e2e/extension/` | frontend-dev, qa-automation |

## Directory layout
```
/                          package.json (npm workspaces, root scripts), package-lock.json,
                           playwright.config.ts, vitest.config.ts (black-box integration), tsconfig.base.json
apps/web/                  Next.js app (src/app, src/components, src/lib, messages/ from M1), .env.example
apps/extension/            (M4) WXT MV3 extension
backend/                   pyproject.toml, uv.lock, .env.example, openapi.json (generated)
  src/autoapplier/         config.py, wiring.py, domain/, ports/, services/, db/, kv/, adapters/, security/, api/, worker/
  tests/                   unit/, integration/, contract/, fixtures/
supabase/                  config.toml, migrations/, seed.sql, tests/ (pgTAP)
scripts/                   sync_env.py, db_types.py, supabase.sh, valkey.sh
tests/                     integration/ (Vitest black-box), e2e/ (Playwright), fixtures/ (static fixture sites), tsconfig.json
docs/                      product, architecture, design, qa, security, tasks, superpowers
team/                      AI team control plane (config.sh is the architect's)
```

## Scripts contract
Root `package.json` scripts (mirrored in `team/config.sh`; per-package parts are `:py`, `:web`, later `:ext`):
| Script | Does |
|---|---|
| `dev` | `sync_env.py` + `scripts/valkey.sh start` + `concurrently` api/worker/beat/web (the `app.sh` start command) |
| `lint` | ruff check + ruff format --check + lint-imports (backend); ESLint (all npm workspaces) |
| `typecheck` | mypy --strict (backend); `next typegen && tsc --noEmit` (web); `tsc -p tests` (test code) |
| `test:unit` | pytest `tests/unit` (backend); Vitest (web workspace) |
| `test:integration` | `app.sh start` (Supabase, Valkey, app), pytest `tests/integration`, `supabase test db` (pgTAP), Vitest black-box `tests/integration`, generated-types drift checks |
| `build` | `next build` (to `.next-build`), `uv lock --check` (backend); extension build from M4 |
| `test:e2e` | `app.sh start` + Playwright (`tests/e2e`) |
| `gen:db-types` / `gen:api-types` | regenerate `database.types.ts` / `openapi.json` + `schema.gen.ts` |
