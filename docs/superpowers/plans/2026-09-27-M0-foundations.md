# M0 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (run by the Team Lead; execution method is fixed by the constitution). Steps use checkbox (`- [ ]`) syntax for tracking. Each task is one implementer session, executed **sequentially** on branch `milestone/M0-foundations` (no worktrees). Dispatch the implementer with `subagent_type` = the task's `Owner`.

**Goal:** A running, tested skeleton: `bash team/bin/app.sh start` brings up local Supabase, the Python API, the Python worker and the Next.js web app; `GET /health` on the API and the web `/health` page show database and queue status; `quality-gate fast|full` and CI are green.

**Architecture:** npm-workspaces monorepo (`apps/web`) + uv project (`backend/`) + `supabase/`. The browser talks only to Next.js; Next.js calls the Python API server-side. Background jobs run on Celery with Redis as broker and result backend (Valkey locally) plus Celery Beat; the worker keeps a Redis heartbeat key fresh, and the API's queue probe reads it (ADR-0012). Every third party sits behind a port; M0 ships the LLM port with a deterministic fake.

**Tech Stack:** Next.js 16.3 (App Router) · React 19 · TypeScript ~6.0 · Tailwind CSS 4 · shadcn/ui · ESLint 9 · Vitest 5 · Playwright Test 1.56.1 · Python 3.11 · uv · FastAPI · asyncpg · Celery 5.6 + Beat · redis-py 6.4 · Valkey 8.1 · pydantic-settings · ruff · mypy · import-linter · pytest · Supabase CLI (local) · pgTAP.

**Spec:** `docs/product/PRD.md`, `docs/architecture/ARCHITECTURE.md`, ADRs `docs/architecture/adr/ADR-0001…0011`, board items T-003 and T-004 (`python3 team/bin/board.py show T-003`). Design tokens: `docs/design/tokens.css` and `docs/design/design-system/<slug>/MASTER.md` (designer, T-002).

## Global Constraints

- Licenses: only MIT, Apache-2.0, BSD, ISC, PSF (MPL-2.0 unmodified). **No GPL/AGPL/LGPL/SSPL**. Never add `psycopg`, `psycopg2`, `procrastinate` or `pyrogram`, and never run a Redis ≥ 8 server (AGPL/SSPL). The local Redis-protocol server is **Valkey** (`valkey/valkey:8.1-alpine`, BSD-3); code only speaks plain Redis (`redis` client, `REDIS_URL`). Check a new package's license on npm/PyPI before adding it.
- Versions: Node 22; Python 3.11 (`requires-python = ">=3.11,<3.12"`); `next@16.3.x`; `react@19`; `typescript@~6.0.3` (not 7); `eslint@^9.39` (not 10); `tailwindcss@4`; `vitest@5`; `@playwright/test@1.56.1` **exact** (matches Chromium 1194 at `/opt/pw-browsers`); `fastapi>=0.141`; `asyncpg>=0.31`; `celery[redis]>=5.6,<6`; `redis>=5.2,<6.5` (kombu pins it).
- context7 quota was exhausted during planning: verify library APIs against the **installed** package (`uv run python -c "import celery, inspect; …"`, `node_modules/<pkg>/README.md`, `<cli> --help`), never from memory. Record anything surprising in `docs/solutions/`.
- Supabase is local only (`bash team/bin/app.sh supabase`; CLI via `bash scripts/supabase.sh …` once Task 2 creates it). Never `supabase link`/`db push`. RLS on every table.
- No real third-party calls. `APP_ENV=test` forces `LLM_PROVIDER=fake`.
- The Python API binds `127.0.0.1:8000`; the browser never calls it and never receives secrets or connection strings.
- Generated files are never hand-edited: `backend/openapi.json`, `apps/web/src/lib/api/schema.gen.ts`, `apps/web/src/lib/supabase/database.types.ts`, `backend/uv.lock`, `package-lock.json`.
- Do not touch `.claude/`, `team/` (config.sh is already filled by the architect), `docs/` outside your role's area.
- Every task ends with `bash team/bin/quality-gate.sh fast` green (the dev-gate hook enforces it for devs) and one Conventional Commit on `milestone/M0-foundations`. Do not push.
- Test data isolation: unique ids per test; Redis keys under a unique prefix `aa:test:<uuid>:` and unique Celery queues where a worker is involved; never reset/truncate the shared DB and **never `FLUSHALL`/`FLUSHDB`**.
- Jobs (ADR-0012): tasks are thin sync functions over async services (`AsyncRuntime`); JSON serialization only; **no Celery ETA/countdown for business delays**. Delays are `scheduled_at` in Postgres, dispatched by Beat. Every send is idempotent.

## Review Focus

1. **DB or Valkey unreachable or slow** → `GET /health` answers within `HEALTH_PROBE_TIMEOUT_S` + 1 s with `503` and the affected check `down`. It never hangs and never returns 500, and the API process starts even when Postgres or Valkey is down. Tests: Task 5 (probe timeout + closed-port Postgres and Redis), Task 6 (API with failing probe; `test_api_starts_and_reports_503_when_backends_unreachable` drives the real `create_app()` lifespan and `build_container()` against closed ports).
2. **Error details leak secrets** (a DSN like `postgresql://postgres:<password>@…` inside an exception message) → `detail` carries only a sanitized reason. Tests: Task 5 (`test_probe_exception_detail_is_sanitized`), Task 11 (black-box body must not contain `postgres:postgres`).
3. **Celery worker or Beat stopped, Valkey down, heartbeat stale** → queue `down` with a human-readable detail (`queue broker unreachable` / `no worker heartbeat (worker or beat not running)` / `worker heartbeat Ns old`), overall `degraded`, and the web shows "Degraded" rather than an error page. Tests: Task 5 (`queue_check` unit cases; probe integration with an empty unique prefix and with an unreachable Redis), Task 9 (degraded view).
4. **Python API down while the web runs** → web `/health` renders "Unavailable" and `/api/health` returns `503` JSON (never a Next.js 500). Tests: Task 9 (`fetchApiHealth` network-error case, view mapping, and `apps/web/src/app/api/health/route.test.ts` calling the exported `GET` with an unreachable API → 503 `{ status: "unavailable", api: null }`).
5. **Mobile width 360 px and non-color status** → no horizontal scroll at 360 px; each status is conveyed by text ("OK"/"Down"), not color alone. Tests: Task 11 (e2e `chromium-mobile` project), Task 9 (component test asserts text).

---

## File map

| Path | Task | Responsibility |
|---|---|---|
| `package.json`, `package-lock.json` | 1 (created), 4A, 4B, 6, 7, 8, 9, 11 (extended) | npm workspaces + root scripts contract (ARCHITECTURE → Scripts contract) |
| `.gitignore` | 1 | add `.venv/`, `.next/`, `.next-build/`, `*.tsbuildinfo`, `.ruff_cache/`, `.mypy_cache/`, `.pytest_cache/`, `next-env.d.ts`, `backend/.celerybeat-schedule*` |
| `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version`, `backend/.env.example` | 1 | Python project, tool config (ruff, mypy, pytest, import-linter) |
| `backend/src/autoapplier/{__init__,config}.py` + empty layer packages | 1 | version, `Settings` |
| `supabase/config.toml`, `supabase/migrations/*`, `supabase/seed.sql`, `supabase/tests/database/rls_default.test.sql` | 2 | local stack, RLS-by-default event trigger |
| `scripts/supabase.sh`, `scripts/sync_env.py` | 2 | CLI wrapper, env generation |
| `backend/src/autoapplier/ports/llm.py`, `adapters/llm/{fake,registry}.py` | 3 | LLM port, deterministic fake, provider registry |
| `scripts/valkey.sh`, `backend/src/autoapplier/kv/*`, `ports/queue.py`, `adapters/queue/{celery_factory,celery_queue,fake}.py` | 4A | Valkey container, Redis clients and heartbeat keys, JobQueue port + Celery/in-memory adapters |
| `backend/src/autoapplier/worker/*` | 4B (6 binds the runtime) | Celery app, tasks, Beat schedule, signals, async runtime bridge |
| `backend/src/autoapplier/domain/health.py`, `ports/health.py`, `services/health.py`, `db/{pool,probes}.py`, `kv/probes.py` | 5 | health model, probes, service |
| `backend/src/autoapplier/{wiring.py,api/*}`, `backend/openapi.json` | 6 | composition root, FastAPI app, `/health`, OpenAPI export |
| `apps/web/**` (scaffold, lint, Vitest, tokens) | 7 | Next.js app shell |
| `scripts/db_types.py`, `apps/web/src/lib/supabase/*`, `apps/web/src/lib/env.server.ts`, `apps/web/.env.example` | 8 | typed Supabase clients, generated DB types, web env |
| `apps/web/src/lib/api/*`, `apps/web/src/lib/health.ts`, `apps/web/src/components/health/*`, `apps/web/src/app/health/page.tsx`, `apps/web/src/app/api/health/route.ts` | 9 | health page and readiness route |
| `docs/qa/TEST-STRATEGY.md` | 10 | test strategy |
| `playwright.config.ts`, `vitest.config.ts`, `tests/tsconfig.json`, `tests/e2e/health.spec.ts`, `tests/integration/health.test.ts` | 11 | harness, e2e smoke, black-box integration |
| `.github/workflows/ci.yml`, `tests/integration/ci-workflow.test.ts` | 12 | CI runs the same gate on push (with Valkey) |

---

### Task 1: Monorepo root and Python backend skeleton

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `package.json`, `package-lock.json` (via `npm install`), `backend/pyproject.toml`, `backend/uv.lock` (via `uv lock`), `backend/.python-version` (`3.11`), `backend/.env.example`
- Create: `backend/src/autoapplier/__init__.py` (`__version__ = "0.1.0"`), `backend/src/autoapplier/config.py`
- Create empty packages (`__init__.py` with a one-line docstring): `domain`, `ports`, `services`, `db`, `kv`, `adapters`, `security`, `api`, `worker` under `backend/src/autoapplier/`, and `backend/src/autoapplier/wiring.py` (docstring only; filled in Task 6)
- Create: `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/unit/__init__.py`, `backend/tests/unit/test_config.py`, `backend/tests/integration/__init__.py`
- Modify: `.gitignore` (entries in the file map)

**Interfaces:**
- Produces (Python):
  ```python
  # autoapplier/config.py
  AppEnv = Literal["local", "test", "ci"]
  LLMProviderName = Literal["fake", "anthropic", "openai", "openrouter"]
  BACKEND_DIR: Path  # backend/ resolved from this file
  class Settings(BaseSettings):
      # env_file = BACKEND_DIR / ".env", extra="ignore", case-insensitive env names
      app_env: AppEnv = "local"
      database_url: str = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      supabase_url: str = "http://127.0.0.1:54321"
      supabase_secret_key: SecretStr | None = None
      api_host: str = "127.0.0.1"
      api_port: int = 8000
      web_origin: str = "http://localhost:3000"
      llm_provider: LLMProviderName = "fake"
      llm_model_fast: str | None = None
      llm_model_smart: str | None = None
      redis_url: str = "redis://127.0.0.1:6379/0"   # Celery broker + result backend, app keys (ADR-0012)
      redis_key_prefix: str = "aa:"                  # must end with ":"
      anthropic_api_key: SecretStr | None = None
      openai_api_key: SecretStr | None = None
      openrouter_api_key: SecretStr | None = None
      worker_heartbeat_interval_s: float = 10.0   # > 0
      queue_heartbeat_max_age_s: float = 30.0     # > worker_heartbeat_interval_s
      health_probe_timeout_s: float = 2.0         # > 0
      # model validator: app_env == "test" and llm_provider != "fake" -> ValueError whose message
      # contains "LLM_PROVIDER=fake" ("tests must never call a live LLM")
  def get_settings() -> Settings  # functools.lru_cache(maxsize=1)
  ```
- Produces (root `package.json`): `"private": true`, `"workspaces": ["apps/*"]`, `"engines": {"node": ">=22.12"}`, scripts:
  `lint` = `npm run lint:py`; `lint:py` = `cd backend && uv run ruff check . && uv run ruff format --check . && uv run lint-imports`;
  `typecheck` = `npm run typecheck:py`; `typecheck:py` = `uv run --directory backend mypy`;
  `test:unit` = `npm run test:unit:py`; `test:unit:py` = `uv run --directory backend pytest tests/unit -q`;
  `build` = `npm run build:py`; `build:py` = `uv lock --directory backend --check`.
  (Later tasks append `:web` parts; `team/config.sh` calls only the aggregate names.)
- `backend/pyproject.toml`: project `autoapplier`, src layout (hatchling build backend), deps `pydantic>=2.13`, `pydantic-settings>=2.15`; dependency group `dev`: `pytest>=9`, `pytest-asyncio>=1.4`, `ruff>=0.16`, `mypy>=2.3`, `import-linter>=2.15`.
  - `[tool.pytest.ini_options]`: `asyncio_mode = "auto"`, `asyncio_default_fixture_loop_scope = "function"`, `testpaths = ["tests"]`, `addopts = "-ra --strict-markers"`.
  - `[tool.ruff]`: `target-version = "py311"`, `line-length = 100`, `src = ["src", "tests"]`; lint select `E,F,W,I,UP,B,ASYNC,S,SIM,RUF,PT`; per-file-ignores `tests/** = ["S101"]`.
  - `[tool.mypy]`: `strict = true`, `files = ["src", "tests"]`, `plugins = ["pydantic.mypy"]`.
  - `[tool.importlinter]`: `root_package = "autoapplier"`, `include_external_packages = true`, and these **forbidden** contracts (the `name` is the fix instruction shown to the agent):
    1. `domain is pure: move IO to adapters/db and depend on a Protocol in autoapplier.ports` — source `autoapplier.domain`, forbidden `autoapplier.ports, autoapplier.services, autoapplier.db, autoapplier.kv, autoapplier.adapters, autoapplier.security, autoapplier.api, autoapplier.worker, autoapplier.wiring, autoapplier.config`.
    2. `ports declare interfaces only: import autoapplier.domain types, nothing else internal` — source `autoapplier.ports`, forbidden `autoapplier.services, autoapplier.db, autoapplier.kv, autoapplier.adapters, autoapplier.api, autoapplier.worker, autoapplier.wiring`.
    3. `services depend on ports, not adapters: inject implementations via autoapplier.wiring` — source `autoapplier.services`, forbidden `autoapplier.adapters, autoapplier.api, autoapplier.worker, autoapplier.wiring`.
    4. `adapters, db and kv never import services or entry points: return data, let the service decide` — sources `autoapplier.adapters, autoapplier.db, autoapplier.kv`, forbidden `autoapplier.services, autoapplier.api, autoapplier.worker, autoapplier.wiring`.
    5. `api must not import adapters: get implementations from autoapplier.wiring` — source `autoapplier.api`, forbidden `autoapplier.adapters`, `allow_indirect_imports = true`.
- `backend/.env.example` (committed, commented, safe defaults): `APP_ENV=local`, `DATABASE_URL=` (filled by sync_env), `SUPABASE_URL=`, `SUPABASE_SECRET_KEY=`, `API_HOST=127.0.0.1`, `API_PORT=8000`, `WEB_ORIGIN=http://localhost:3000`, `LLM_PROVIDER=fake`, `LLM_MODEL_FAST=`, `LLM_MODEL_SMART=`, `ANTHROPIC_API_KEY=`, `OPENAI_API_KEY=`, `OPENROUTER_API_KEY=`, `REDIS_URL=redis://127.0.0.1:6379/0`, `REDIS_KEY_PREFIX=aa:`, `WORKER_HEARTBEAT_INTERVAL_S=10`, `QUEUE_HEARTBEAT_MAX_AGE_S=30`, `HEALTH_PROBE_TIMEOUT_S=2`.
- `backend/tests/conftest.py`: before any `autoapplier` import sets `os.environ["APP_ENV"] = "test"` and `os.environ["LLM_PROVIDER"] = "fake"`; fixture `settings()` returns `Settings(_env_file=None)`.

- [ ] **Step 1: Write the failing tests** — `backend/tests/unit/test_config.py`:
  - `test_defaults_point_to_local_supabase` — `Settings(_env_file=None)` has `database_url` port 54322, `api_host == "127.0.0.1"`, `llm_provider == "fake"`.
  - `test_env_overrides` — with `monkeypatch.setenv("API_PORT", "9001")` → `api_port == 9001`.
  - `test_test_env_requires_fake_llm` — `Settings(_env_file=None, app_env="test", llm_provider="anthropic")` raises `ValidationError` whose text contains `LLM_PROVIDER=fake`.
  - `test_local_env_allows_real_provider_name` — `app_env="local", llm_provider="anthropic"` constructs fine.
  - `test_heartbeat_max_age_must_exceed_interval` — `worker_heartbeat_interval_s=10, queue_heartbeat_max_age_s=5` raises `ValidationError`.
  - `test_redis_key_prefix_must_end_with_colon` — `redis_key_prefix="aa"` raises `ValidationError`.
  - `test_get_settings_is_cached` — `get_settings() is get_settings()`.
- [ ] **Step 2: Run to verify failure** — `uv run --directory backend pytest tests/unit/test_config.py -q` → FAIL (`ModuleNotFoundError: autoapplier.config`).
- [ ] **Step 3: Implement** `config.py`, packages, `pyproject.toml`, root `package.json` (`npm install` to create the lock), `.gitignore`, `.env.example`.
- [ ] **Step 4: Verify**
  - `uv run --directory backend pytest tests/unit -q` → all pass.
  - `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0.
  - Contract bites: temporarily add `import autoapplier.adapters  # noqa` to `backend/src/autoapplier/domain/__init__.py`, run `npm run -s lint:py` → FAIL naming contract "domain is pure…"; revert the line; rerun → PASS.
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** — `git add package.json package-lock.json .gitignore backend && git commit -m "chore(backend): monorepo root and python skeleton with settings and layer contracts"`

---

### Task 2: Local Supabase, RLS-by-default migration, env sync

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `scripts/supabase.sh`. It uses `supabase` if it's on PATH, else `npx -y supabase`; `exec` with all args; executable.
- Create: `supabase/config.toml` via `bash scripts/supabase.sh init` (then set `project_id = "auto-applier"`; keep default ports 54321/54322/54324; `[db.seed] sql_paths = ["./seed.sql"]`).
- Create: `supabase/migrations/<ts>_foundation.sql` via `bash scripts/supabase.sh migration new foundation`.
- Create: `supabase/seed.sql` (comment only: "Seed data for local dev; owned by qa-automation. Tests create their own unique data.")
- Create: `supabase/tests/database/rls_default.test.sql` (pgTAP)
- Create: `scripts/sync_env.py`, `backend/tests/unit/test_sync_env.py`

(No queue tables in Postgres: jobs live in Celery/Redis, and the worker heartbeat is a Redis key. See ADR-0012.)

**Interfaces:**
- **Foundation migration (contract):**
  ```sql
  create schema if not exists internal;
  revoke all on schema internal from public, anon, authenticated;
  -- internal.enforce_rls(): event_trigger function, SECURITY DEFINER, search_path = ''
  --   for every command from pg_event_trigger_ddl_commands() with object_type = 'table'
  --   and schema_name = 'public': ALTER TABLE <object_identity> ENABLE ROW LEVEL SECURITY
  create event trigger enforce_rls on ddl_command_end
    when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    execute function internal.enforce_rls();
  ```
  If the local stack rejects `create event trigger`, stop and report `BLOCKED` with the error (do not drop the requirement).
- **`scripts/sync_env.py`** (stdlib only, `python3`), CLI `python3 scripts/sync_env.py [--supabase-env-file PATH] [--root PATH]`:
  ```python
  TARGETS: tuple[tuple[str, str], ...] = (
      ("backend/.env.example", "backend/.env"),
      ("apps/web/.env.example", "apps/web/.env.local"),
  )
  # key in target file -> candidate keys in `supabase status -o env`, first present wins
  SUPABASE_MAP: dict[str, tuple[str, ...]] = {
      "DATABASE_URL": ("DB_URL",),
      "SUPABASE_URL": ("API_URL",),
      "SUPABASE_SECRET_KEY": ("SECRET_KEY", "SERVICE_ROLE_KEY"),
      "SUPABASE_JWT_SECRET": ("JWT_SECRET",),
      "NEXT_PUBLIC_SUPABASE_URL": ("API_URL",),
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": ("PUBLISHABLE_KEY", "ANON_KEY"),
  }
  def parse_env(text: str) -> dict[str, str]            # KEY=value, KEY="value", comments, blanks, `export ` prefix
  def resolve_values(example: Mapping[str, str], existing: Mapping[str, str],
                     supabase: Mapping[str, str]) -> dict[str, str]
      # keys = example keys; value = supabase-mapped value if the key is in SUPABASE_MAP and a candidate
      # is present; else existing value if present; else the example default (e.g. REDIS_URL)
  def render_env(example_text: str, values: Mapping[str, str]) -> str   # keeps example order and comments
  def sync(root: Path, supabase: Mapping[str, str]) -> list[Path]       # writes targets whose example exists
  def read_supabase_status(root: Path) -> dict[str, str]                # runs `bash scripts/supabase.sh status -o env`;
      # on failure prints a warning to stderr and returns {} (existing values are kept, exit code 0)
  ```
  Only keys listed in the example are written; target files are git-ignored.
- **pgTAP test contract** `supabase/tests/database/rls_default.test.sql` (`begin; create extension if not exists pgtap with schema extensions; select plan(N); … select * from finish(); rollback;`):
  1. `is_empty`: no relation with `relkind in ('r','p')` in schema `public` has `relrowsecurity = false`.
  2. After `create table public.__rls_probe (id int);`, `ok(relrowsecurity)` for it ("new tables get RLS automatically").
  3. `is(evtenabled, 'O')` for event trigger `enforce_rls`.
  4. `ok(not has_schema_privilege('anon', 'internal', 'USAGE'))` and the same for `authenticated`.

- [ ] **Step 1: Write failing tests**
  - `backend/tests/unit/test_sync_env.py` (load `scripts/sync_env.py` with `importlib.util.spec_from_file_location` from `Path(__file__).parents[3] / "scripts/sync_env.py"`):
    - `test_parse_env_handles_quotes_comments_blank_lines_and_export`
    - `test_supabase_values_override_example_and_existing` (`DB_URL` → `DATABASE_URL`)
    - `test_existing_custom_value_is_preserved` (existing `LLM_PROVIDER=anthropic` survives)
    - `test_example_default_used_when_no_other_value` (`REDIS_URL`)
    - `test_publishable_key_preferred_then_anon_fallback`
    - `test_target_skipped_when_example_missing` (tmp root with only `backend/.env.example`)
    - `test_sync_is_idempotent` (second run → byte-identical files)
    - `test_only_example_keys_are_written` (unknown supabase keys are not copied)
  - `supabase/tests/database/rls_default.test.sql` per the contract above.
- [ ] **Step 2: Verify failure.** `uv run --directory backend pytest tests/unit/test_sync_env.py -q` → FAIL (file missing). `bash team/bin/app.sh supabase && bash scripts/supabase.sh test db` → FAIL (trigger missing).
- [ ] **Step 3: Implement** the scripts, config and migration. Run `bash scripts/supabase.sh db reset` to apply them locally; AUTONOMY allows it, but say so in the report because it wipes local data.
- [ ] **Step 4: Verify**
  - `bash scripts/supabase.sh db reset && bash scripts/supabase.sh test db` → all pgTAP tests pass.
  - `python3 scripts/sync_env.py && grep -c '^DATABASE_URL=postgresql' backend/.env` → `1`.
  - `uv run --directory backend pytest tests/unit -q` → pass; `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit.** `git add scripts supabase backend && git commit -m "feat(db): local supabase with rls-by-default event trigger and env sync"`

---

### Task 3: LLM provider port, deterministic fake and registry

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `backend/src/autoapplier/ports/llm.py`, `backend/src/autoapplier/adapters/llm/__init__.py`, `backend/src/autoapplier/adapters/llm/fake.py`, `backend/src/autoapplier/adapters/llm/registry.py`
- Create: `backend/tests/fixtures/llm/example.task.json`, `backend/tests/unit/test_llm_fake.py`, `backend/tests/unit/test_llm_registry.py`

**Interfaces:**
- Produces (`ports/llm.py`, ADR-0006):
  ```python
  Role = Literal["user", "assistant"]
  ModelTier = Literal["fast", "smart"]
  @dataclass(frozen=True, slots=True)
  class LLMMessage: role: Role; content: str
  @dataclass(frozen=True, slots=True)
  class LLMRequest:
      task: str                      # stable id, e.g. "resume.extract"
      system: str
      messages: tuple[LLMMessage, ...]
      tier: ModelTier = "fast"
      max_output_tokens: int = 1024
      temperature: float = 0.0
      json_schema: Mapping[str, Any] | None = None
  @dataclass(frozen=True, slots=True)
  class LLMUsage: input_tokens: int; output_tokens: int
  @dataclass(frozen=True, slots=True)
  class LLMResponse: text: str; data: Mapping[str, Any] | None; provider: str; model: str; usage: LLMUsage
  class LLMError(Exception): ...
  class LLMUnavailableError(LLMError): ...   # retryable
  class LLMConfigError(LLMError): ...
  class LLMProvider(Protocol):
      name: str
      async def complete(self, request: LLMRequest) -> LLMResponse: ...
  ```
- Produces (`adapters/llm/fake.py`):
  ```python
  def request_fingerprint(request: LLMRequest) -> str   # sha256 hex of canonical JSON (sorted keys) of all fields
  @dataclass(frozen=True)
  class FakeReply: text: str; data: Mapping[str, Any] | None = None
  class FakeLLMProvider:  # implements LLMProvider
      name = "fake"
      def __init__(self, replies: Mapping[str, FakeReply] | None = None, *, fixtures_dir: Path | None = None) -> None
      calls: list[LLMRequest]
      def fail_next(self, error: LLMError) -> None       # next complete() raises it once
      async def complete(self, request: LLMRequest) -> LLMResponse
      # lookup: replies[fingerprint] -> replies[task] -> fixtures_dir/<task>.json ({"text": str, "data": obj|null})
      #         -> default FakeReply(text=f"[fake:{task}] {fingerprint[:12]}", data=None)
      # if json_schema is set and the resolved reply has data=None -> raise LLMError(f"no fake data for task {task}")
      # model = f"fake-{tier}"; usage = (ceil(len(system + all message contents)/4), ceil(len(text)/4))
  ```
- Produces (`adapters/llm/registry.py`):
  ```python
  ProviderFactory = Callable[[Settings], LLMProvider]
  PROVIDERS: dict[str, ProviderFactory]            # M0: {"fake": lambda s: FakeLLMProvider()}
  def build_llm_provider(settings: Settings) -> LLMProvider
      # unregistered name -> LLMConfigError listing registered names and "set LLM_PROVIDER=fake"
  ```
  M1 registers `anthropic`, `openai`, `openrouter` here.

- [ ] **Step 1: Failing tests**
  - `test_llm_fake.py`: `test_same_request_same_response` (two calls → equal `LLMResponse`); `test_different_messages_different_text`; `test_task_reply_used`; `test_fingerprint_reply_beats_task_reply`; `test_fixture_file_used` (uses `tests/fixtures/llm/example.task.json`); `test_json_schema_without_data_raises_llm_error`; `test_fail_next_raises_once_then_recovers`; `test_calls_are_recorded`; `test_fake_satisfies_protocol` (`provider: LLMProvider = FakeLLMProvider()` passes mypy).
  - `test_llm_registry.py`: `test_fake_selected_in_tests` — `build_llm_provider(get_settings())` under the conftest env returns a `FakeLLMProvider` (**this is the "selected in tests" evidence**); `test_unregistered_provider_raises_config_error` — `Settings(_env_file=None, app_env="local", llm_provider="anthropic")` → `LLMConfigError` mentioning `LLM_PROVIDER=fake`.
- [ ] **Step 2: Verify failure** — `uv run --directory backend pytest tests/unit/test_llm_fake.py tests/unit/test_llm_registry.py -q` → FAIL (imports).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** — same command → PASS; `bash team/bin/quality-gate.sh fast` → PASS (mypy strict, import contracts).
- [ ] **Step 5: Commit** — `git commit -m "feat(llm): provider-agnostic LLM port with deterministic fake and registry"`

---

### Task 4A: Valkey runtime, Redis access, JobQueue port and Celery app factory

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `scripts/valkey.sh` (executable)
- Create: `backend/src/autoapplier/kv/{__init__,client,keys,heartbeat}.py`
- Create: `backend/src/autoapplier/ports/queue.py`, `backend/src/autoapplier/adapters/queue/{__init__,celery_factory,celery_queue,fake}.py`
- Create: `backend/tests/unit/test_queue_fake.py`, `backend/tests/unit/test_celery_queue.py`, `backend/tests/unit/test_celery_config.py`, `backend/tests/unit/test_kv_keys.py`, `backend/tests/integration/conftest.py`, `backend/tests/integration/test_heartbeat_redis.py`
- Modify: `backend/pyproject.toml`:
  - deps `celery[redis]>=5.6,<6` and `redis>=5.2,<6.5` (kombu's redis extra pins `<6.5`);
  - mypy overrides `ignore_missing_imports = true` for `celery`, `celery.*`, `kombu`, `kombu.*`;
  - import-linter: contracts 1 and 2 also forbid `celery` and `redis`; contract 3 also forbids `celery`; new contract 6, `api must enqueue through ports.queue.JobQueue, never import celery` (source `autoapplier.api`, forbidden `celery`, `allow_indirect_imports = true`).
- Modify: root `package.json`. Add `test:integration:py` = `bash team/bin/app.sh supabase && bash scripts/valkey.sh start && uv run --directory backend pytest tests/integration -q`.

**Interfaces:**
- `scripts/valkey.sh start|stop|status`:
  - image `${VALKEY_IMAGE:-valkey/valkey:8.1-alpine}` (pull verified in the VM on 2026-09-27), container `autoapplier-valkey`, published on `127.0.0.1:6379:6379`, command `valkey-server --save "" --appendonly no`.
  - `start` is idempotent. If the container is running, exit 0. If it exists but is stopped, `docker start` it. If it's absent, `docker run -d --restart unless-stopped …`. Then wait ≤ 20 s until `docker exec autoapplier-valkey valkey-cli ping` prints `PONG`.
  - If `docker info` fails, exit 1 with "Docker is not running: run bash team/bin/app.sh supabase first".
  - `status` prints `valkey: RUNNING|STOPPED|ABSENT`.
  - `stop` stops the container without removing it.
  - It never flushes data.
- `kv/client.py`:
  - `def create_async_redis(url: str) -> redis.asyncio.Redis`
  - `def create_sync_redis(url: str) -> redis.Redis`
  - Both use `decode_responses=True`, `socket_connect_timeout=2` and `socket_timeout=2`, and do not connect at creation.
- `kv/keys.py`:
  ```python
  def key(prefix: str, *parts: str) -> str   # prefix + ":".join(parts); ValueError unless prefix ends with ":"
  HEARTBEAT_WORKER: Final = ("heartbeat", "worker")
  ```
- `kv/heartbeat.py`:
  ```python
  @dataclass(frozen=True, slots=True)
  class Heartbeat: worker: str; version: str; at: datetime   # UTC-aware
  def write_heartbeat(client: redis.Redis, *, prefix: str, worker: str, version: str,
                      ttl_s: float, now: datetime | None = None) -> None     # SET <prefix>heartbeat:worker <json> PX ttl
  async def read_heartbeat(client: redis.asyncio.Redis, *, prefix: str) -> Heartbeat | None  # None if missing/unparsable
  def heartbeat_age_s(heartbeat: Heartbeat | None, now: datetime) -> float | None
  ```
- `ports/queue.py` (ADR-0012: there is no delay parameter by design; delayed work is `scheduled_at` in Postgres):
  ```python
  JsonValue: TypeAlias = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
  class JobQueue(Protocol):
      async def enqueue(self, task_name: str, *, args: Sequence[JsonValue] = (),
                        kwargs: Mapping[str, JsonValue] | None = None, queue: str | None = None) -> str: ...
  ```
- `adapters/queue/celery_factory.py`:
  - `QUEUE_DEFAULT: Final = "default"`.
  - `def create_celery_app(settings: Settings, *, main: str = "autoapplier") -> Celery` sets:
    - `broker_url = result_backend = settings.redis_url`;
    - `task_serializer = result_serializer = "json"`, `accept_content = ["json"]`;
    - `task_acks_late = True`, `task_reject_on_worker_lost = True`, `worker_prefetch_multiplier = 1`;
    - `broker_transport_options = {"visibility_timeout": 3600}`, `result_expires = 86400`;
    - `task_default_queue = QUEUE_DEFAULT`, `broker_connection_retry_on_startup = True`, `timezone = "UTC"`.
  - It registers no tasks.
- `adapters/queue/celery_queue.py`: `class CeleryJobQueue: def __init__(self, app: Celery) -> None`.
  - `enqueue` calls `app.send_task(task_name, args=list(args), kwargs=dict(kwargs or {}), queue=queue or QUEUE_DEFAULT)` in a worker thread (`asyncio.to_thread`) and returns the task id.
  - It never passes `eta`, `countdown` or `expires`.
- `adapters/queue/fake.py`:
  - `@dataclass(frozen=True) class EnqueuedJob: task_name: str; args: tuple[JsonValue, ...]; kwargs: dict[str, JsonValue]; queue: str`.
  - `class InMemoryJobQueue` has `enqueued: list[EnqueuedJob]` and returns ids `"fake-1"`, `"fake-2"`, …
- `tests/integration/conftest.py`:
  - fixture `redis_url`: from `Settings(_env_file=None)`; if `PING` fails, `pytest.fail("Local Valkey is not running: bash scripts/valkey.sh start")`;
  - fixture `key_prefix`: `f"aa:test:{uuid4().hex}:"`. Teardown deletes only the keys that `SCAN MATCH <prefix>*` finds. **Never `FLUSHALL`/`FLUSHDB`.**

- [ ] **Step 1: Failing tests**
  - `test_queue_fake.py`:
    - `test_records_jobs_in_order_with_incrementing_ids`
    - `test_fake_satisfies_protocol`
  - `test_celery_queue.py`, with a stub app whose `send_task` records its call and returns an object with `.id`:
    - `test_enqueue_sends_by_name_to_default_queue`
    - `test_enqueue_passes_args_kwargs_and_explicit_queue`
    - `test_enqueue_never_schedules_eta_or_countdown` (none of `eta`, `countdown`, `expires` in the recorded kwargs)
  - `test_celery_config.py`:
    - `test_json_only_serialization`
    - `test_acks_late_and_prefetch_one`
    - `test_visibility_timeout_at_least_one_hour`
    - `test_broker_and_backend_use_redis_url`
  - `test_kv_keys.py`:
    - `test_key_joins_parts`
    - `test_prefix_without_colon_rejected`
    - `test_heartbeat_age_none_when_missing`
    - `test_heartbeat_age_seconds`
  - `test_heartbeat_redis.py` (integration, real Valkey):
    - `test_write_then_read_roundtrip`
    - `test_heartbeat_has_ttl` (`PTTL` between 1 and `ttl_s*1000`)
    - `test_missing_heartbeat_reads_none`
    - `test_prefixes_are_isolated` (a second unique prefix reads `None`)
- [ ] **Step 2: Verify failure.** `bash scripts/valkey.sh start; uv run --directory backend pytest tests/unit tests/integration -q` → FAIL (imports; `valkey.sh` missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**
  - `bash team/bin/app.sh supabase && bash scripts/valkey.sh start && bash scripts/valkey.sh start && bash scripts/valkey.sh status` → the second `start` is a no-op, and `status` prints `valkey: RUNNING`.
  - `npm run -s test:integration:py` → PASS; `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit.** `git add scripts backend package.json && git commit -m "feat(queue): valkey runtime, redis access, JobQueue port with celery and in-memory adapters"`

---

### Task 4B: Celery worker, Beat schedule, heartbeat and async runtime bridge

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `backend/src/autoapplier/worker/{jobs,celery_app,schedule,signals,runtime}.py`, `backend/src/autoapplier/worker/tasks/{__init__,system}.py`
- Create: `backend/tests/unit/test_async_runtime.py`, `backend/tests/unit/test_beat_schedule.py`, `backend/tests/unit/test_system_tasks.py`, `backend/tests/integration/test_celery_roundtrip.py`
- Modify: root `package.json`. Add:
  - `dev:worker` = `uv run --directory backend celery -A autoapplier.worker.celery_app worker --loglevel INFO --concurrency 2 --queues default`
  - `dev:beat` = `uv run --directory backend celery -A autoapplier.worker.celery_app beat --loglevel INFO --schedule .celerybeat-schedule`

**Interfaces:**
- `worker/jobs.py`: `SYSTEM_PING: Final = "system.ping"`; `SYSTEM_HEARTBEAT: Final = "system.heartbeat"`.
- `worker/tasks/system.py` (thin sync tasks; `celery.shared_task`):
  - `@shared_task(name=SYSTEM_PING) def ping(nonce: str) -> str` returns `nonce`.
  - `@shared_task(name=SYSTEM_HEARTBEAT, ignore_result=True) def heartbeat() -> None` calls `write_heartbeat(create_sync_redis(s.redis_url), prefix=s.redis_key_prefix, worker=socket.gethostname(), version=__version__, ttl_s=s.queue_heartbeat_max_age_s)`, with `s = get_settings()`.
- `worker/schedule.py`: `def build_beat_schedule(settings: Settings) -> dict[str, dict[str, Any]]` returns `{"system.heartbeat": {"task": SYSTEM_HEARTBEAT, "schedule": settings.worker_heartbeat_interval_s, "options": {"expires": settings.worker_heartbeat_interval_s}}}`. Later milestones add entries here (e.g. `apply.dispatch_due` every 60 s).
- `worker/signals.py`: `def write_ready_heartbeat(**_: object) -> None`, connected to `celery.signals.worker_ready`. It writes the heartbeat immediately, so `/health` goes green without waiting for Beat's first tick.
- `worker/runtime.py`, the ADR-0012 async bridge. It is generic, so it doesn't depend on `wiring` yet; Task 6 binds it to `Container`.
  ```python
  C = TypeVar("C"); T = TypeVar("T")
  class AsyncRuntime(Generic[C]):
      def __init__(self, factory: Callable[[], Awaitable[C]], close: Callable[[C], Awaitable[None]]) -> None
      def run(self, fn: Callable[[C], Awaitable[T]]) -> T
          # one event loop + one C per process, created lazily; if os.getpid() changed (prefork child) the
          # inherited loop/container are discarded WITHOUT closing and rebuilt; raises RuntimeError if called
          # while this runtime's loop is already running (no re-entrancy)
      def shutdown(self) -> None   # closes C (via close) and the loop; idempotent
  ```
- `worker/celery_app.py`: `app: Celery = create_celery_app(get_settings())`. It also sets `app.conf.beat_schedule = build_beat_schedule(get_settings())`, imports `autoapplier.worker.tasks.system` so the tasks register, and connects the signals. This is the `-A` target for `celery worker` and `celery beat`.

- [ ] **Step 1: Failing tests**
  - `test_async_runtime.py` (fake factory counting builds and closes):
    - `test_runs_coroutine_and_returns_value`
    - `test_reuses_loop_and_container_across_calls` (factory called once for two `run`s)
    - `test_rebuilds_after_pid_change_without_closing_inherited` (monkeypatch `os.getpid`)
    - `test_shutdown_closes_once_and_is_idempotent`
    - `test_run_inside_running_loop_raises`
  - `test_beat_schedule.py`:
    - `test_heartbeat_scheduled_every_interval` (task name and schedule equal the settings)
    - `test_celery_app_uses_schedule_and_registers_system_tasks` (`SYSTEM_PING` and `SYSTEM_HEARTBEAT` are in `app.tasks`)
  - `test_system_tasks.py`:
    - `test_ping_echoes_nonce` (`ping.apply(args=["n1"]).get() == "n1"`, which runs locally without a broker)
  - `test_celery_roundtrip.py` (integration, real Valkey):
    - `test_ping_roundtrip_through_valkey`, isolated from the running dev worker (which consumes only `default`):
      - `q = f"test-{uuid4().hex}"`.
      - Build a **test-local** app: `test_app = create_celery_app(Settings(_env_file=None))`, then `test_app.conf.task_default_queue = q` and `test_app.conf.task_queues = (kombu.Queue(q),)`. Import `autoapplier.worker.tasks.system` first so the shared tasks bind to `test_app`.
      - Precondition assert: `set(test_app.amqp.queues) == {q}`, so the worker consumes only `q` and never the literal `"default"`.
      - Start the worker with `celery.contrib.testing.worker.start_worker(test_app, pool="solo", perform_ping_check=False)`. Check the installed Celery's signature. If it doesn't honour `task_queues`, restrict consumption with `worker.app.amqp.queues.select([q])` before it starts consuming.
      - Enqueue with `await CeleryJobQueue(test_app).enqueue(SYSTEM_PING, args=[nonce], queue=q)` and assert `AsyncResult(task_id, app=test_app).get(timeout=10) == nonce`.
      - There is no fallback to `default`: if isolation can't be achieved, report `BLOCKED`.
    - `test_heartbeat_task_writes_key`: set `REDIS_KEY_PREFIX` to a unique `aa:test:<uuid>:` and clear the `get_settings` cache, then run `heartbeat.apply()` and check that `read_heartbeat(...)` is not `None`.
    - `test_worker_ready_signal_writes_heartbeat`: call `write_ready_heartbeat()` with a unique prefix.
- [ ] **Step 2: Verify failure.** `uv run --directory backend pytest tests/unit/test_async_runtime.py tests/unit/test_beat_schedule.py tests/unit/test_system_tasks.py tests/integration/test_celery_roundtrip.py -q` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**
  - `npm run -s test:integration:py` → PASS.
  - Run `timeout 15 npm run -s dev:worker; echo exit=$?`. The output contains `ready` and `exit=124`, with no traceback.
  - Run `timeout 25 npm run -s dev:beat; echo exit=$?`. The output contains `Sending due task system.heartbeat` and `exit=124`.
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(worker): celery worker and beat with heartbeat, system.ping and async runtime bridge"`

---

### Task 5: Health domain, probes and service

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Create: `backend/src/autoapplier/domain/health.py`, `backend/src/autoapplier/ports/health.py`, `backend/src/autoapplier/services/health.py`, `backend/src/autoapplier/db/pool.py`, `backend/src/autoapplier/db/probes.py`, `backend/src/autoapplier/kv/probes.py`
- Create: `backend/tests/unit/test_health_domain.py`, `backend/tests/unit/test_health_service.py`, `backend/tests/integration/test_health_probes.py`
- Modify: `backend/pyproject.toml`:
  - dep `asyncpg>=0.31`;
  - mypy override `ignore_missing_imports = true` for `asyncpg`, `asyncpg.*`;
  - import-linter contracts 1 and 2 also forbid `asyncpg`.
- Modify: `backend/tests/integration/conftest.py`. Add a fixture `pool` (function-scoped `create_pool(Settings(_env_file=None).database_url)`); if `select 1` fails, `pytest.fail("Local Supabase is not running: bash team/bin/app.sh supabase")`.

**Interfaces:**
- `domain/health.py`:
  ```python
  CheckStatus = Literal["ok", "down"]
  OverallStatus = Literal["ok", "degraded"]
  @dataclass(frozen=True, slots=True)
  class CheckResult: status: CheckStatus; latency_ms: float; detail: str | None = None
  @dataclass(frozen=True, slots=True)
  class HealthReport: status: OverallStatus; version: str; checks: Mapping[str, CheckResult]
  def aggregate(version: str, checks: Mapping[str, CheckResult]) -> HealthReport   # "ok" iff non-empty and all ok
  def queue_check(*, broker_reachable: bool, heartbeat_age_s: float | None, max_age_s: float,
                  latency_ms: float) -> CheckResult
      # not reachable -> down "queue broker unreachable";
      # age None -> down "no worker heartbeat (worker or beat not running)";
      # age > max -> down f"worker heartbeat {round(age)}s old (max {round(max_age_s)}s)"; else ok, detail None
  ```
- `ports/health.py`: `class HealthProbe(Protocol): name: str; async def check(self) -> CheckResult: ...`
- `services/health.py`:
  ```python
  class HealthService:
      def __init__(self, probes: Sequence[HealthProbe], *, version: str, timeout_s: float) -> None
      async def report(self) -> HealthReport
      # runs probes concurrently, each under asyncio.timeout(timeout_s);
      # timeout -> CheckResult("down", elapsed_ms, f"timed out after {timeout_s:g}s");
      # any other exception -> CheckResult("down", elapsed_ms, f"check failed: {type(exc).__name__}")
      # (never the exception message: it may contain a DSN or password)
  ```
- `db/pool.py`: `async def create_pool(dsn: str, *, min_size: int = 0, max_size: int = 10, command_timeout: float = 5.0) -> asyncpg.Pool`. It must not raise when Postgres is unreachable at creation time; connections open on the first acquire.
- `db/probes.py`: `class DatabaseProbe: name = "database"; def __init__(self, pool: asyncpg.Pool)` runs `select 1`.
- `kv/probes.py`: `class QueueProbe: name = "queue"; def __init__(self, redis: redis.asyncio.Redis, *, key_prefix: str, max_heartbeat_age_s: float)`.
  - `PING` checks that the broker is reachable (redis `ConnectionError`/`TimeoutError` → `broker_reachable=False`).
  - It then reads `read_heartbeat(prefix=key_prefix)` and decides via `domain.health.queue_check`.

- [ ] **Step 1: Failing tests**
  - `test_health_domain.py`:
    - `test_aggregate_ok_when_all_ok`
    - `test_aggregate_degraded_when_any_down`
    - `test_aggregate_degraded_when_no_checks`
    - `test_queue_check_ok_with_fresh_heartbeat`
    - `test_queue_check_down_without_heartbeat`
    - `test_queue_check_down_with_stale_heartbeat_detail_mentions_age`
    - `test_queue_check_down_when_broker_unreachable`
  - `test_health_service.py` (stub probes):
    - `test_report_runs_all_probes`
    - `test_slow_probe_times_out_as_down`: the probe sleeps 1 s with `timeout_s=0.1`; it comes back down, and `report()` returns in < 0.5 s.
    - `test_probe_exception_detail_is_sanitized`: the probe raises `OSError("connect postgresql://postgres:s3cret@db:5432")`; the detail is `"check failed: OSError"` and `"s3cret" not in detail`.
    - `test_probes_run_concurrently`: two 0.2 s probes finish in < 0.35 s.
  - `test_health_probes.py` (integration):
    - `test_database_probe_ok`
    - `test_queue_probe_ok_with_fresh_heartbeat`: first `write_heartbeat(..., prefix=key_prefix)`.
    - `test_queue_probe_down_without_heartbeat`: uses a fresh unique prefix, so it is isolated from the running dev worker.
    - `test_probes_down_when_backends_unreachable`: pool on `postgresql://postgres:postgres@127.0.0.1:1/postgres` and Redis `redis://127.0.0.1:1/0`, both wrapped in `HealthService(timeout_s=2)`. Both come back `down`, and it returns in < 3 s.
- [ ] **Step 2: Verify failure.** `uv run --directory backend pytest tests/unit/test_health_domain.py tests/unit/test_health_service.py tests/integration/test_health_probes.py -q` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** Same command → PASS; `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(health): health domain, database and queue probes, health service"`

---

### Task 6: Composition root, FastAPI app with GET /health, OpenAPI export

**Owner:** backend-dev · **Story:** T-003

**Files:**
- Modify: `backend/src/autoapplier/wiring.py`, `backend/src/autoapplier/worker/celery_app.py` (bind the runtime)
- Create: `backend/src/autoapplier/api/{app,main,export_openapi}.py`, `backend/src/autoapplier/api/routes/{__init__,health}.py`, `backend/src/autoapplier/api/schemas/{__init__,health}.py`
- Create: `backend/openapi.json` (generated), `backend/tests/unit/test_health_api.py`, `backend/tests/unit/test_openapi_snapshot.py`, `backend/tests/integration/test_api_health_live_db.py`, `backend/tests/integration/test_api_lifespan_unreachable.py`, `backend/tests/unit/test_worker_runtime_binding.py`
- Modify: `backend/pyproject.toml` — deps `fastapi>=0.141`, `uvicorn>=0.54`; dev group `httpx>=0.28`, `asgi-lifespan>=2.1` (MIT; httpx's `ASGITransport` does not run lifespan events); import-linter contracts 1–2 also forbid `fastapi`, contract 3 forbids `fastapi`.
- Modify: root `package.json` — `dev:api` = `uv run --directory backend uvicorn autoapplier.api.main:app --host 127.0.0.1 --port 8000`; devDependency `concurrently@^10`; `dev` = `python3 scripts/sync_env.py && bash scripts/valkey.sh start && concurrently --kill-others-on-fail --names api,worker,beat "npm:dev:api" "npm:dev:worker" "npm:dev:beat"`; `gen:openapi` = `uv run --directory backend python -m autoapplier.api.export_openapi --out openapi.json`.

**Interfaces:**
- `wiring.py`:
  ```python
  @dataclass
  class Container:
      settings: Settings
      pool: asyncpg.Pool
      redis: redis.asyncio.Redis
      health: HealthService          # probes: DatabaseProbe(pool), QueueProbe(redis, key_prefix=settings.redis_key_prefix,
                                     #         max_heartbeat_age_s=settings.queue_heartbeat_max_age_s)
      llm: LLMProvider               # build_llm_provider(settings)
      queue: JobQueue                # CeleryJobQueue(create_celery_app(settings))
  async def build_container(settings: Settings) -> Container   # never raises when Postgres or Valkey is down
  async def close_container(container: Container) -> None       # closes pool and redis
  ```
- `worker/celery_app.py` (modify): `runtime: AsyncRuntime[Container] = AsyncRuntime(lambda: build_container(get_settings()), close_container)`; `worker_process_shutdown` and `worker_shutdown` signals call `runtime.shutdown()`. Future tasks call `runtime.run(lambda c: <async service call>(c, …))`.
- `api/schemas/health.py` (the web contract; field names are final):
  ```python
  class CheckOut(BaseModel): status: Literal["ok", "down"]; latency_ms: float; detail: str | None
  class ChecksOut(BaseModel): database: CheckOut; queue: CheckOut
  class HealthResponse(BaseModel): status: Literal["ok", "degraded"]; version: str; checks: ChecksOut
  ```
- `api/app.py`: `def create_app(settings: Settings | None = None, *, container: Container | None = None) -> FastAPI` — title "AutoApplier API", version `__version__`; lifespan builds/closes the container unless one is injected; includes the health router.
- `api/routes/health.py`: `GET /health` → `HealthResponse`; `200` if `report.status == "ok"`, else `503` with the same body; header `Cache-Control: no-store`; OpenAPI documents both 200 and 503 with `HealthResponse`; operation id `get_health`; no auth.
- `api/main.py`: `app = create_app()`.
- `api/export_openapi.py`: `python -m autoapplier.api.export_openapi [--out PATH]` — writes `json.dumps(create_app(Settings(_env_file=None)).openapi(), indent=2, sort_keys=True) + "\n"`; calling `.openapi()` does not run the lifespan, so no DB is needed; stdout if no `--out`.

- [ ] **Step 1: Failing tests**
  - `test_health_api.py` (httpx `AsyncClient(transport=ASGITransport(app))`, `create_app(container=<Container with stub HealthService>)`): `test_health_ok_returns_200_with_both_checks` (body matches `HealthResponse`, `checks.database.status == "ok"`, `checks.queue.status == "ok"`); `test_health_degraded_returns_503_with_body`; `test_health_sets_no_store`; `test_health_body_has_no_secret_fields` (serialized body contains no `database_url`, `postgres:`, `key`); `test_openapi_documents_200_and_503`.
  - `test_openapi_snapshot.py`: `test_committed_openapi_matches_app` — `backend/openapi.json` equals the export; failure message: `"OpenAPI drift: run npm run gen:api-types"`.
  - `test_api_health_live_db.py` (integration, Supabase + Valkey): `settings = Settings(_env_file=None, redis_key_prefix=key_prefix)`, `write_heartbeat(..., prefix=key_prefix)`, real container via `build_container(settings)` → `GET /health` = 200, both `ok`; `test_live_health_degraded_without_heartbeat` (fresh unique prefix, no heartbeat) → 503, `queue.status == "down"`.
  - `test_api_lifespan_unreachable.py` (integration; needs no running services):
    - `test_api_starts_and_reports_503_when_backends_unreachable`:
      - `settings = Settings(_env_file=None, database_url="postgresql://postgres:postgres@127.0.0.1:1/postgres", redis_url="redis://127.0.0.1:1/0", health_probe_timeout_s=1)`.
      - `await build_container(settings)` does not raise; then close it with `close_container`.
      - `app = create_app(settings)`. Use no injected container, so the **real lifespan** builds one.
      - `async with LifespanManager(app)` (asgi-lifespan) plus `httpx.AsyncClient(transport=ASGITransport(app), base_url="http://test")`: `GET /health` returns `503`, `checks.database.status == "down"` and `checks.queue.status == "down"`, and the response takes < 2.0 s (timeout + 1 s).
      - Leaving the lifespan context raises nothing.
  - `test_worker_runtime_binding.py`: `from autoapplier.worker.celery_app import runtime` is an `AsyncRuntime`; `worker_process_shutdown` has a receiver from `autoapplier.worker`.
- [ ] **Step 2: Verify failure** — `uv run --directory backend pytest tests/unit/test_health_api.py tests/unit/test_openapi_snapshot.py -q` → FAIL.
- [ ] **Step 3: Implement; generate** `npm run -s gen:openapi`.
- [ ] **Step 4: Verify**
  - `uv run --directory backend pytest -q` (unit + integration; Supabase up) → PASS.
  - Live: `bash team/bin/app.sh supabase && (npm run dev > /tmp/dev.log 2>&1 &) ; sleep 20; curl -s -w '\n%{http_code}\n' http://127.0.0.1:8000/health` → JSON with `"database": {"status": "ok"…}`, `"queue": {"status": "ok"…}` and `200` (worker_ready + Beat heartbeat); then stop it (`pkill -f "concurrently --kill-others-on-fail"`; Valkey keeps running). (app.sh start is not used yet: the web app does not exist until Task 7.)
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(api): fastapi app with GET /health, composition root, openapi export"`

---

### Task 7: Next.js web app shell with design tokens, lint boundaries and Vitest

**Owner:** frontend-dev · **Story:** T-003

Precondition: `docs/design/tokens.css` and `docs/design/design-system/<slug>/MASTER.md` exist (designer, T-002). If missing → report `BLOCKED` (do not invent or copy tokens).

**Files:**
- Create: `apps/web/package.json` (name `@autoapplier/web`, private), `apps/web/next.config.ts`, `apps/web/tsconfig.json` (strict, `paths: {"@/*": ["./src/*"]}`), `apps/web/postcss.config.mjs` (`@tailwindcss/postcss`), `apps/web/components.json` (shadcn, `src/components/ui`, css `src/app/globals.css`), `apps/web/eslint.config.mjs`, `apps/web/vitest.config.mts`, `apps/web/vitest.setup.ts` (`@testing-library/jest-dom/vitest`), `apps/web/src/test/empty-module.ts`
- Create: `apps/web/src/app/{layout.tsx,page.tsx,globals.css}`, `apps/web/src/lib/utils.ts` (`cn`), `apps/web/src/components/ui/{button,card,badge}.tsx` via `npx shadcn@latest add button card badge` (CLI 4.x)
- Create tests: `apps/web/src/app/globals.test.ts`, `apps/web/eslint-boundaries.test.ts`
- Modify: root `package.json` — `lint:web` = `npm run lint --workspaces --if-present`; `typecheck:web` = `npm run typecheck --workspaces --if-present`; `test:unit:web` = `npm run test:unit --workspaces --if-present`; `build:web` = `npm run build --workspaces --if-present`; `dev:web` = `npm run dev -w @autoapplier/web`; aggregates become `lint` = `npm run lint:py && npm run lint:web`, `typecheck` = `npm run typecheck:py && npm run typecheck:web`, `test:unit` = `npm run test:unit:py && npm run test:unit:web`, `build` = `npm run build:web && npm run build:py`; `dev` gains `web` (`--names api,worker,beat,web … "npm:dev:web"`).

**Interfaces / contracts:**
- `apps/web/package.json` scripts: `dev` = `next dev --port 3000`; `build` = `NEXT_DIST_DIR=.next-build next build`; `lint` = `eslint . --max-warnings=0`; `typecheck` = `next typegen && tsc --noEmit`; `test:unit` = `vitest run`. Deps: `next@16.3.x`, `react@19`, `react-dom@19`, `zod@^4`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, shadcn peer deps; dev: `typescript@~6.0.3`, `@types/react`, `@types/react-dom`, `@types/node@22`, `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `eslint@^9.39`, `eslint-config-next@16.3.x`, `vitest@^5`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- `next.config.ts`: repo root = two levels up from the config file; `distDir: process.env.NEXT_DIST_DIR || ".next"`, `turbopack: { root: repoRoot }`, `outputFileTracingRoot: repoRoot`, `poweredByHeader: false`, `reactStrictMode: true`.
- `globals.css`: `@import "tailwindcss";` then `@import "../../../../docs/design/tokens.css";` (by path — never copy token values); shadcn semantic variables (`--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, plus `--success`, `--success-foreground` for status) defined as `var(--<designer token>)` per MASTER.md; `@theme inline` maps them to Tailwind colors. **No color literals** (hex/rgb/hsl/oklch) in `apps/web/src/**` outside `docs/design/tokens.css`.
- `layout.tsx`: `<html lang="en">`, fonts per MASTER.md via `next/font`, metadata title template `%s · AutoApplier`, a skip link to `#main`, `<main id="main">`. App-shell navigation per the designer's shell spec lands in M1; M0 renders only header + main.
- `page.tsx` (`/`): product name heading and a link to `/health` (minimal home; replaced in M1).
- `eslint.config.mjs`: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` flat configs, ignores `.next/**`, `.next-build/**`, `next-env.d.ts`, `src/lib/**/*.gen.ts`, `src/lib/supabase/database.types.ts`; boundary rules with fix-it messages:
  - `no-restricted-imports` for `@supabase/ssr`, `@supabase/supabase-js` in all files except `src/lib/supabase/**`: "Create Supabase clients only via src/lib/supabase/server.ts or client.ts (createSupabaseServerClient / createSupabaseBrowserClient)."
  - `no-restricted-imports` for `openapi-fetch` except `src/lib/api/**`: "Call the Python API through src/lib/api/client.ts (createApiClient) so auth forwarding and error mapping stay in one place."
  - `import/no-restricted-paths` zones: target `./src/components` from `./src/app` — "Components must not depend on routes; move shared code to src/lib or src/components."; target `./src/lib` from `./src/components` and `./src/app` — "src/lib is UI-free; pass data in from the route or component."
- `vitest.config.mts`: plugin react, `environment: "jsdom"`, `setupFiles: ["./vitest.setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}", "*.test.ts"]`, alias `@` → `src`, alias `server-only` → `src/test/empty-module.ts` (the real package throws outside React Server Components).

- [ ] **Step 1: Failing tests** (both files start with the `// @vitest-environment node` docblock)
  - `src/app/globals.test.ts` (node fs): `imports design tokens by path` (globals.css contains `@import "../../../../docs/design/tokens.css"` and that file exists); `has no color literals` (regex `#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(` finds nothing in `src/**/*.css`); `defines shadcn semantic variables` (each of `--background`, `--foreground`, `--primary`, `--destructive`, `--success`, `--border`, `--ring` appears).
  - `eslint-boundaries.test.ts` (ESLint Node API `new ESLint({ cwd })`, `lintText(code, { filePath })`): `blocks supabase import outside lib/supabase` (filePath `src/app/x.tsx`, message contains `createSupabaseServerClient`); `allows supabase import inside lib/supabase`; `blocks openapi-fetch outside lib/api`; `blocks components importing from app` (message contains "must not depend on routes").
- [ ] **Step 2: Verify failure** — `npm install && npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify**
  - `npm run -s lint && npm run -s typecheck && npm run -s test:unit && npm run -s build` → exit 0.
  - `bash team/bin/quality-gate.sh fast` → PASS.
  - (`app.sh start` is completed in Task 9, when `/api/health` exists.)
- [ ] **Step 5: Commit** — `git commit -m "feat(web): next.js app shell with design tokens, shadcn/ui, lint boundaries and vitest"`

---

### Task 8: Typed Supabase clients, generated DB types and web env

**Owner:** frontend-dev · **Story:** T-003

**Files:**
- Create: `scripts/db_types.py` (stdlib; `--write` / `--check`), `apps/web/src/lib/supabase/database.types.ts` (generated), `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/src/lib/env.server.ts`, `apps/web/src/lib/env.public.ts`, `apps/web/.env.example`
- Create tests: `apps/web/src/lib/env.server.test.ts`, `apps/web/src/lib/supabase/database.types.test.ts`
- Modify: root `package.json` — `gen:db-types` = `python3 scripts/db_types.py --write`; `check:db-types` = `python3 scripts/db_types.py --check`; apps/web deps `@supabase/ssr@^0.12`, `@supabase/supabase-js@^2`, `server-only`.

**Interfaces:**
- `scripts/db_types.py`: runs `bash scripts/supabase.sh gen types typescript --local --schema public`; `--write` writes `apps/web/src/lib/supabase/database.types.ts`; `--check` exits 1 with "DB types drift: run npm run gen:db-types" if different; exits 2 with "Local Supabase is not running: bash team/bin/app.sh supabase" if generation fails.
- `env.server.ts` (`import "server-only"`):
  ```ts
  export const serverEnvSchema: z.ZodObject<…>  // API_URL: url, default "http://127.0.0.1:8000"
  export type ServerEnv = z.infer<typeof serverEnvSchema>;
  export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv  // throws Error naming the bad variable
  export function getServerEnv(): ServerEnv  // parseServerEnv(process.env), memoized; evaluated lazily (not at import time)
  ```
- `env.public.ts`: `getPublicEnv(): { supabaseUrl: string; supabasePublishableKey: string }` from `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (zod; error names the variable).
- `supabase/server.ts` (`import "server-only"`): `export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>>` (`createServerClient` from `@supabase/ssr` with Next `cookies()` get/set; setting cookies from a Server Component is swallowed as documented by @supabase/ssr).
- `supabase/client.ts`: `export function createSupabaseBrowserClient(): SupabaseClient<Database>` (`createBrowserClient`).
- `apps/web/.env.example`: `API_URL=http://127.0.0.1:8000`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` (filled by `scripts/sync_env.py`, which already handles this target).

- [ ] **Step 1: Failing tests**
  - `env.server.test.ts`: `defaults API_URL`; `accepts a valid API_URL`; `rejects an invalid API_URL naming the variable`.
  - `database.types.test.ts` (compile-time via `expectTypeOf`, enforced by `npm run typecheck`): `Database` has key `public` with `Tables`, `Views`, `Functions` (M0 has no public tables yet; M1 tests extend this with real rows); runtime part asserts the generated file starts with the Supabase generator header (`export type Json`) and `createSupabaseBrowserClient` returns a client typed with `Database` (`expectTypeOf<ReturnType<typeof createSupabaseBrowserClient>>().toEqualTypeOf<SupabaseClient<Database>>()`).
- [ ] **Step 2: Verify failure** — `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement; generate** `npm run -s gen:db-types`; `python3 scripts/sync_env.py` now also writes `apps/web/.env.local`.
- [ ] **Step 4: Verify** — `npm run -s check:db-types` → exit 0; `grep -c '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.\+' apps/web/.env.local` → `1`; `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): typed supabase clients, generated db types and validated env"`

---

### Task 9: Web health page, readiness route and API client

**Owner:** frontend-dev · **Story:** T-003

**Files:**
- Create: `apps/web/src/lib/api/schema.gen.ts` (generated by `openapi-typescript ../../backend/openapi.json -o src/lib/api/schema.gen.ts`), `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/health.ts`, `apps/web/src/components/health/health-status.tsx`, `apps/web/src/app/health/page.tsx`, `apps/web/src/app/api/health/route.ts`
- Create: `apps/web/src/lib/health-route.ts`
- Create tests: `apps/web/src/lib/health.test.ts`, `apps/web/src/components/health/health-status.test.tsx`, `apps/web/src/app/api/health/route.test.ts`
- Modify: `apps/web/package.json` — deps `openapi-fetch@^0.17`; dev `openapi-typescript@^7`; script `gen:api-types` = `openapi-typescript ../../backend/openapi.json -o src/lib/api/schema.gen.ts`
- Modify: root `package.json` — `gen:api-types` = `npm run gen:openapi && npm run gen:api-types -w @autoapplier/web`; `check:openapi` = regenerate `schema.gen.ts` into a temp file and `diff` against the committed one (fail message "API types drift: run npm run gen:api-types").

**Interfaces:**
- `lib/api/client.ts` (`import "server-only"`):
  ```ts
  import type { paths } from "./schema.gen";
  export type ApiClient = Client<paths>;   // openapi-fetch
  export function createApiClient(opts?: { accessToken?: string; fetch?: typeof fetch; baseUrl?: string }): ApiClient
  // baseUrl default getServerEnv().API_URL; Authorization: Bearer <accessToken> when given; cache: "no-store"
  ```
- `lib/health.ts`:
  ```ts
  export type HealthResponse = components["schemas"]["HealthResponse"];
  export type ApiHealthResult =
    | { kind: "response"; httpStatus: number; body: HealthResponse }
    | { kind: "error"; message: string };
  export type CheckKey = "database" | "queue";
  export interface HealthCheckView { key: CheckKey; label: string; state: "ok" | "down"; detail: string | null; latencyMs: number | null }
  export interface SystemHealthView { overall: "operational" | "degraded" | "unavailable"; version: string | null; checks: HealthCheckView[]; checkedAt: string }
  export async function fetchApiHealth(client?: ApiClient): Promise<ApiHealthResult>   // never throws; 503 → kind "response";
  // without an explicit client it calls createApiClient() per call, so openapi-fetch picks up globalThis.fetch at call time
  export function toSystemHealthView(result: ApiHealthResult, now: Date): SystemHealthView
  // operational iff httpStatus 200 and body.status "ok"; response otherwise → degraded;
  // error → unavailable, both checks down with detail "API unreachable"; labels "Database", "Queue" (literal until M1, TD-001)
  ```
- `components/health/health-status.tsx`: `export function HealthStatus({ view }: { view: SystemHealthView }): React.JSX.Element` —
  `<h1>System health</h1>`; overall in an element with `data-testid="health-overall"` whose text is exactly `Operational` | `Degraded` | `Unavailable`; `<ul aria-label="Checks">` with `<li data-testid="health-check-database">` / `health-check-queue` each showing the label, a status **text** `OK` | `Down` (icon `aria-hidden`, color from `--success`/`--destructive` tokens), and the detail when present; version line when known; `<time dateTime={checkedAt}>`. Uses shadcn `Card`/`Badge`. Layout works at 360 px.
- `app/health/page.tsx`: `export const dynamic = "force-dynamic"`; `metadata.title = "System health"`; renders `HealthStatus` with `toSystemHealthView(await fetchApiHealth(), new Date())`.
- `lib/health-route.ts` holds the injectable handler. Next.js route files may only export route fields, so the factory lives in `lib`.
  ```ts
  export interface HealthRouteBody { status: SystemHealthView["overall"]; api: HealthResponse | null }
  export function createHealthRouteHandler(
    fetchHealth: () => Promise<ApiHealthResult> = () => fetchApiHealth(),
  ): () => Promise<Response>
  ```
  - The handler returns `Response.json(body, { status: 200 iff operational else 503, headers: { "Cache-Control": "no-store" } })`.
  - `api` is the API body for `kind: "response"` and `null` for `kind: "error"`.
  - If `fetchHealth` itself throws unexpectedly, the result is treated as `{ kind: "error" }` and the handler still returns `503 { status: "unavailable", api: null }`. It never throws.
- `app/api/health/route.ts`: `export const dynamic = "force-dynamic"; export const GET = createHealthRouteHandler();`. It exports nothing else. This route is `APP_READY_PATH` in `team/config.sh`.

- [ ] **Step 1: Failing tests**
  - `health.test.ts`: `maps 200 ok to operational`; `maps 503 with queue down to degraded and keeps detail`; `maps a network error to unavailable with both checks down`; `treats 200 with body status degraded as degraded`; `fetchApiHealth returns kind error when fetch rejects` (client built with a stub `fetch` that rejects); `fetchApiHealth returns kind response with body on 503` (stub fetch returns 503 JSON).
  - `app/api/health/route.test.ts` (`// @vitest-environment node`). It imports the exported `GET` from `./route` and uses no network: `vi.stubGlobal("fetch", …)`, restored after each test.
    - `returns 503 unavailable with no-store when the API is unreachable`: the stub fetch rejects with `TypeError("fetch failed")`. Expect status `503`, `cache-control` containing `no-store`, and JSON exactly `{ status: "unavailable", api: null }`.
    - `returns 200 operational with the API body`: the stub returns `200` with a HealthResponse where both checks are ok. Expect `200`, `{ status: "operational", api: <that body> }`.
    - `returns 503 degraded when the API reports 503`.
    - `never throws when the injected fetchHealth throws`: `createHealthRouteHandler(() => Promise.reject(new Error("boom")))()` resolves to `503 { status: "unavailable", api: null }`.
  - `health-status.test.tsx`: `renders heading and overall text`; `renders OK/Down as text for each check` (not only color); `shows detail for a down check`; `renders Unavailable state without crashing`.
- [ ] **Step 2: Verify failure** — `npm run test:unit -w @autoapplier/web` → FAIL.
- [ ] **Step 3: Implement; generate** `npm run -s gen:api-types`.
- [ ] **Step 4: Verify (T-003 AC1 and AC2 end to end)**
  - `bash team/bin/app.sh start` → `✓ app ready: http://localhost:3000`; `bash team/bin/app.sh url` → `http://localhost:3000`.
  - `curl -s -w '\n%{http_code}\n' http://localhost:3000/api/health` → `"status":"operational"` and `200`.
  - `curl -s http://localhost:3000/health | grep -o 'Operational'` → match.
  - `npm run -s check:openapi` → exit 0.
  - `bash team/bin/quality-gate.sh fast` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): health page, readiness route and typed api client"`

---

### Task 10: Test strategy

**Owner:** qa-automation · **Story:** T-004

**Files:**
- Create: `docs/qa/TEST-STRATEGY.md` via `python3 team/bin/board.py scaffold test-strategy`, then fill it.

**Contract (required sections, headings verbatim):**
- `## Pyramid` — per package and level, matching ARCHITECTURE.md → Testing approach: web (Vitest + Testing Library, `apps/web/src/**/*.test.ts(x)`), backend (pytest `backend/tests/unit`, `backend/tests/integration`, `backend/tests/contract`), extension (M4: Vitest unit + Playwright with the unpacked build against the fixture LinkedIn site), DB/RLS (pgTAP `supabase/tests/`, plus supabase-js-as-real-users tests in `tests/integration/`), black-box integration (Vitest `tests/integration/`), e2e (Playwright `tests/e2e/`, projects `chromium-desktop` 1280×800 and `chromium-mobile` 360×740). What each level must and must not cover; who owns it.
- `## Third-party fakes` — ports & fakes (ADR-0007): LLM fake forced by `APP_ENV=test`; mail via the Supabase local mail catcher; fake pay/Telegram pages under `/dev/fake/*` (local/test only); LinkedIn fixture site; recorded fixtures in `backend/tests/fixtures/`; the rule "no real accounts, no real money, no live LLM".
- `## Test data isolation` — unique emails `qa+<uuid>@example.test`, unique ids, Redis keys under `aa:test:<uuid>:` and unique Celery queues, no DB resets/truncates and never `FLUSHALL`/`FLUSHDB` on the shared Valkey; `supabase db reset` only by a dev in a migration task and announced.
- `## Commands` — `bash team/bin/quality-gate.sh fast|full`, per-level npm scripts from the root `package.json`, `bash scripts/supabase.sh test db`.
- `## AC coverage rule` — every AC → at least one automated test at the lowest sensible level; key journeys also e2e; evidence paths `docs/qa/evidence/<M>/`.
- `## Flakiness policy` — no sleeps for sync (use polling/`expect.poll`), retries only in CI (1), a flaky test is quarantined only with a bug on the board.

- [ ] **Step 1: Scaffold and write.**
- [ ] **Step 2: Verify** — `for h in "## Pyramid" "## Third-party fakes" "## Test data isolation" "## Commands" "## AC coverage rule" "## Flakiness policy"; do grep -qF "$h" docs/qa/TEST-STRATEGY.md || echo "missing $h"; done` → prints nothing.
- [ ] **Step 3: Commit** — `git commit -m "docs(qa): test strategy for web, backend, extension, db and e2e"`

---

### Task 11: Test harness, black-box integration, e2e smoke, full gate green

**Owner:** qa-automation · **Story:** T-004 (also closes T-003 AC1 fresh-clone check)

**Files:**
- Create: `playwright.config.ts`, `vitest.config.ts` (root, black-box), `tests/tsconfig.json`, `tests/e2e/health.spec.ts`, `tests/integration/health.test.ts`, `tests/integration/helpers/env.ts`
- Modify: root `package.json` — devDeps `@playwright/test@1.56.1` (exact), `vitest@^5`, `typescript@~6.0.3`, `@types/node@^22`; scripts:
  - `typecheck:tests` = `tsc -p tests`; `typecheck` = `npm run typecheck:py && npm run typecheck:web && npm run typecheck:tests`
  - `test:db` = `bash scripts/supabase.sh test db`
  - `test:integration:web` = `vitest run --config vitest.config.ts`
  - `test:integration` = `bash team/bin/app.sh start && npm run test:integration:py && npm run test:db && npm run test:integration:web && npm run check:db-types && npm run check:openapi`. Prerequisites: `app.sh start` ensures Docker + Supabase and runs `npm run dev`, which starts Valkey (`scripts/valkey.sh start`) and the api/worker/beat/web processes; `test:integration:py` re-runs `scripts/valkey.sh start` idempotently so it also works on its own. Tests use unique Redis key prefixes/queues; never `FLUSHALL`.
  - `test:e2e` = `bash team/bin/app.sh start && playwright test`

**Contracts:**
- `playwright.config.ts`: `testDir: "tests/e2e"`, `outputDir: "test-results"`, `fullyParallel: true`, `retries: process.env.CI ? 1 : 0`, `reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]`, `use: { baseURL: process.env.APP_URL ?? "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" }`, projects `chromium-desktop` (Desktop Chrome, 1280×800) and `chromium-mobile` (Chromium, viewport 360×740, `isMobile: true`). **No `webServer`** (the app runs only via `app.sh`). No `executablePath`: `PLAYWRIGHT_BROWSERS_PATH` supplies Chromium 1194 locally.
- `vitest.config.ts` (root): `test.include: ["tests/integration/**/*.test.ts"]`, `environment: "node"`, `testTimeout: 30000`.
- `tests/integration/helpers/env.ts`: `export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000"; export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";`

- [ ] **Step 1: Write the tests**
  - `tests/integration/health.test.ts`: `API GET /health returns 200 with database and queue ok` (asserts `status`, `version`, `checks.database.status`, `checks.queue.status`, numeric `latency_ms`); `API /health is not cacheable` (`cache-control` contains `no-store`); `API /health leaks no secrets` (raw body contains none of `postgres:postgres`, `postgresql://`, `sb_secret_`, `service_role`); `web GET /api/health returns 200 operational with the API body`.
  - `tests/e2e/health.spec.ts`: `health page shows database and queue OK` — `page.goto("/health")`; heading "System health"; `getByTestId("health-overall")` has text `Operational`; `health-check-database` and `health-check-queue` contain `OK`; no `console.error` during load; `design tokens are applied` — read `docs/design/tokens.css` with `fs`, take the first `--name: value;` declaration, assert `getComputedStyle(document.documentElement).getPropertyValue(name).trim()` is non-empty; `no horizontal scroll` — `document.documentElement.scrollWidth <= window.innerWidth` (runs in both projects, so 360 px is covered).
- [ ] **Step 2: Run** — `npm install && npm run -s test:integration:web && npm run -s test:e2e` → PASS (the skeleton already implements the behavior; if a test fails, file a bug for the owner with `board.py new bug … --milestone M0` instead of changing app code).
- [ ] **Step 3: Full gate**
  - `bash team/bin/quality-gate.sh fast` → `quality-gate (fast): PASS`
  - `bash team/bin/quality-gate.sh full` → `quality-gate (full): PASS` (lint, typecheck, unit, integration, build, e2e).
- [ ] **Step 4: Fresh-clone smoke (T-003 AC1)** — after committing:
  ```bash
  bash team/bin/app.sh stop
  D=$(mktemp -d) && git clone -q "$PWD" "$D/aa" && cd "$D/aa" && npm ci \
    && bash team/bin/app.sh start && curl -fsS http://localhost:3000/api/health && bash team/bin/app.sh stop
  cd - && bash team/bin/app.sh start
  ```
  Expected: `✓ app ready`, JSON with `"status":"operational"`. Record the output in the report.
- [ ] **Step 5: Commit** — `git commit -m "test: playwright and vitest harness, health e2e smoke and black-box integration"`

---

### Task 12: CI runs the same gate on push

**Owner:** qa-automation · **Story:** T-004

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `tests/integration/ci-workflow.test.ts`; root devDependency `yaml@^2` (ISC)

**Contract (`ci.yml`):**
- `on: push: branches: ["**"]` and `pull_request:`; `concurrency` group per ref with cancel-in-progress.
- One job `quality` on `ubuntu-latest`, `timeout-minutes: 45`.
- Steps in order: `actions/checkout@v4`; `actions/setup-node@v4` (`node-version: 22`, `cache: npm`); `astral-sh/setup-uv@v6`; `supabase/setup-cli@v1` (`version: latest`); `npm ci`; `uv sync --directory backend --locked`; `npx playwright install --with-deps chromium`; **`bash scripts/valkey.sh start`** (Valkey container `valkey/valkey:8.1-alpine` on `127.0.0.1:6379`, same as local; Docker is available on the runner); `bash team/bin/quality-gate.sh full` (it starts Supabase with `SUPABASE_START_ARGS` from `team/config.sh` and the app via `app.sh`); on failure upload `.team/state/*.log`, `playwright-report/`, `test-results/` with `actions/upload-artifact@v4`.
- Remove the old "Detect project" conditional skipping (the project now exists).

- [ ] **Step 1: Failing test** — `tests/integration/ci-workflow.test.ts` (parse with `yaml`): `runs on push to any branch and on pull_request`; `sets up node 22, uv and the supabase CLI`; `runs bash team/bin/quality-gate.sh full`; `installs the playwright chromium browser`; `starts valkey before the gate` (a step running `bash scripts/valkey.sh start` precedes the gate step). Run `npm run -s test:integration:web` → FAIL on the current workflow.
- [ ] **Step 2: Update `ci.yml`.**
- [ ] **Step 3: Verify**
  - `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color=false` → no output, exit 0.
  - `npm run -s test:integration:web` → PASS.
  - `bash team/bin/quality-gate.sh full` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "ci: run quality-gate full with supabase, uv and playwright on every push"`

---

## Traceability

| Item · AC | Task(s) | Tests (level) | Verification command |
|---|---|---|---|
| T-003 · 1 — fresh clone: `app.sh start` starts web, Python API and local Supabase; `app.sh url` works | 2 (Supabase config, env sync), 4A (Valkey `scripts/valkey.sh`), 4B (Celery worker + beat, `dev:worker`/`dev:beat`), 6 (API, `dev` starts Valkey + processes), 7 (web, `dev:web`), 9 (readiness route), 11 (fresh-clone smoke) | `tests/e2e/health.spec.ts` (e2e); `tests/integration/health.test.ts` (black-box) | `bash team/bin/app.sh start && bash team/bin/app.sh url && curl -fsS "$(bash team/bin/app.sh url)/api/health"`; Task 11 Step 4 fresh-clone script |
| T-003 · 2 — API `GET /health` 200 with DB and queue status; web `/health` shows it | 4A (Redis heartbeat keys), 4B (worker/Beat heartbeat, Celery round-trip), 5 (probes, service), 6 (route), 9 (page, route handler) | `backend/tests/unit/test_health_domain.py`, `test_health_service.py`, `test_health_api.py`, `test_kv_keys.py`, `test_beat_schedule.py` (unit); `backend/tests/integration/test_heartbeat_redis.py`, `test_celery_roundtrip.py`, `test_health_probes.py`, `test_api_health_live_db.py` (integration, Supabase + Valkey), `test_api_lifespan_unreachable.py` (integration, closed ports); `apps/web/src/lib/health.test.ts`, `health-status.test.tsx`, `apps/web/src/app/api/health/route.test.ts` (web unit); `tests/integration/health.test.ts`; `tests/e2e/health.spec.ts` | `npm run -s test:integration:py` (starts Valkey, runs `pytest tests/integration`); `uv run --directory backend pytest tests/unit -q`; `npm run -s test:unit`; `npm run -s test:integration:web`; `npm run -s test:e2e` |
| T-003 · 3a — first migration enables RLS by default | 2 | `supabase/tests/database/rls_default.test.sql` (pgTAP) | `npm run -s test:db` (= `bash scripts/supabase.sh test db`) |
| T-003 · 3b — generated DB types available to the web app | 8 | `apps/web/src/lib/supabase/database.types.test.ts` (type + unit); drift check | `npm run -s typecheck && npm run -s check:db-types` |
| T-003 · 3c — secrets read from env with a `.env.example` | 1 (`backend/.env.example`, `Settings`), 2 (`sync_env.py`), 8 (`apps/web/.env.example`, `env.server.ts`) | `backend/tests/unit/test_config.py`, `test_sync_env.py`; `apps/web/src/lib/env.server.test.ts` | `uv run --directory backend pytest tests/unit/test_config.py tests/unit/test_sync_env.py -q`; `npm run test:unit -w @autoapplier/web`; `ls backend/.env.example apps/web/.env.example` |
| T-003 · 4 — LLM provider interface with a deterministic fake, selected in tests | 1 (`APP_ENV=test` ⇒ fake), 3 | `backend/tests/unit/test_llm_fake.py`, `test_llm_registry.py::test_fake_selected_in_tests`, `test_config.py::test_test_env_requires_fake_llm` | `uv run --directory backend pytest tests/unit/test_llm_fake.py tests/unit/test_llm_registry.py tests/unit/test_config.py -q` |
| T-004 · 1 — TEST-STRATEGY.md defines the pyramid for web, backend, extension, integration/RLS, e2e and third-party faking | 10 | — (document) | Task 10 Step 2 heading check |
| T-004 · 2 — `quality-gate fast` and `full` run lint, typecheck, unit, integration, e2e smoke for all packages and pass | 1, 7, 8, 11 (scripts contract); all tasks keep fast green | all of the above | `bash team/bin/quality-gate.sh fast` → PASS; `bash team/bin/quality-gate.sh full` → PASS |
| T-004 · 3 — CI runs the same gate on push; an e2e smoke opens the health page | 11 (e2e smoke), 12 (CI with Valkey) | `tests/integration/ci-workflow.test.ts` (incl. `starts valkey before the gate`); `tests/e2e/health.spec.ts` | `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color=false`; `npm run -s test:integration:web`; `npm run -s test:e2e` |

## Notes for the Team Lead
- Execution order: 1, 2, 3, 4A, 4B, 5, 6, 7, 8, 9, 10, 11, 12.
- Tasks 1–6 run before the web exists: `app.sh start` becomes usable at Task 9 (its readiness path `/api/health` is served by the web). Backend tasks use `bash team/bin/app.sh supabase` only.
- Task 2 runs `supabase db reset` once (new migrations). Nobody else should be testing against the DB at that moment.
- Valkey (`valkey/valkey:8.1-alpine`, pulled successfully from Docker Hub in this VM on 2026-09-27) runs as container `autoapplier-valkey` on `127.0.0.1:6379`; `scripts/valkey.sh start` is idempotent and needs Docker, which `app.sh supabase|start` ensures. If Docker Hub becomes unreachable, set `VALKEY_IMAGE=public.ecr.aws/docker/library/valkey:8.1-alpine` (not verified).
- Task 7 depends on the designer's `docs/design/tokens.css` (T-002).
- The Supabase CLI must be on PATH (cloud setup script builds it); `scripts/supabase.sh` falls back to `npx -y supabase`, which downloads from GitHub releases and may be blocked in the VM.
