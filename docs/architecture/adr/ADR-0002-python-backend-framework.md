# ADR-0002: Python backend framework, DB access and tooling

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
The human requires the backend, API, parsers and workers in Python. The backend holds all business rules that involve secrets, third parties, the LLM, credits and sending. The database is local Supabase Postgres with migrations owned by the Supabase CLI (SQL files in `supabase/migrations`). License rule: no GPL/AGPL/LGPL. The VM has Python 3.11 and `uv`.

## Options considered
1. **FastAPI + uvicorn + pydantic v2 + asyncpg**, raw SQL in repository modules. Async end to end (LLM calls, Telegram MTProto, SMTP and HTTP scraping are all IO-bound), OpenAPI generated from types.
2. Django + DRF: batteries included, but its ORM and migrations duplicate Supabase migrations and RLS; sync-first.
3. Litestar: good, but smaller ecosystem and fewer examples for agents.
DB drivers: **psycopg 3 and psycopg2 are LGPL-3.0 → excluded**. asyncpg (Apache-2.0) is the async driver; SQLAlchemy/Alembic would add a second migration system next to Supabase.

## Decision
- **Python 3.11**, project managed by **uv** in `backend/` (`pyproject.toml` + `uv.lock`, src layout, package `autoapplier`).
- **FastAPI** (0.14x) on **uvicorn**; **pydantic v2** models for API schemas; **pydantic-settings** for configuration.
- **asyncpg** connection pool; SQL lives in `autoapplier/db/` repository modules returning pydantic/dataclass models. **No ORM, no Alembic**: the schema is owned by `supabase/migrations/*.sql` (single source of truth, RLS policies next to tables).
- HTTP clients: **httpx** (tests mock with **respx**). Auth token verification: **PyJWT** (ADR-0004).
- Tooling: **ruff** (lint + format), **mypy --strict** (pydantic plugin), **import-linter** for layer contracts, **pytest** + **pytest-asyncio**. Unit tests in `backend/tests/unit` (no network, no DB), integration tests in `backend/tests/integration` (local Supabase).
- Layers: `api`/`worker` (entry points) → `wiring` (composition root) → `services` → `ports` → `domain`; `adapters` and `db` implement ports and infrastructure. Enforced by import-linter contracts whose names say how to fix a violation.

## Consequences
- Positive: one async stack for API and workers; OpenAPI → TS types gives a checked web↔API contract; no LGPL in the dependency tree.
- Negative: raw SQL needs integration tests for every repository (accepted: they also verify RLS); no automatic model/migration sync — types come from the SQL schema.
- Follow-ups: dependency license check automated before MR (TECH-DEBT TD-003).
