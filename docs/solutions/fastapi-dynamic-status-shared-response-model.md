# fastapi-dynamic-status-shared-response-model

_2026-09-27 · Tags: fastapi 0.141.1, starlette 1.7.0, httpx 0.28.1, asgi-lifespan 2.1.0, response_model, dynamic status code, OpenAPI `responses`_

## Symptom
Task 6 needs `GET /health` to return the *same* `HealthResponse` body shape at both `200`
(all checks ok) and `503` (any check down), decided at request time from the health report,
with FastAPI's generated OpenAPI documenting **both** status codes against that one schema.
context7's quota was exhausted (Global Constraints), so four things needed verifying against
the installed packages instead of guessing or relying on training-data memory:
1. Does a route with `response_model=HealthResponse` and a handler that mutates
   `response.status_code` actually send that dynamic code, or does FastAPI force back the
   declared default (200)?
2. Does adding `responses={503: {"model": HealthResponse}}` alongside `response_model=...`
   make OpenAPI document *both* `200` and `503` with the same `$ref`, or replace the automatic
   `200` entry?
3. httpx's `ASGITransport` never runs ASGI lifespan events (stated in the task brief) — does
   `asgi-lifespan`'s `LifespanManager` combine cleanly with FastAPI's
   `@asynccontextmanager`-based `lifespan=` parameter, and does leaving its `async with` block
   re-raise an exception from the shutdown phase (needed: "leaving the lifespan context raises
   nothing")?
4. Does `asyncpg.Pool.close()` / a `redis.asyncio.Redis` client's `.aclose()` raise or hang when
   the pool/client was built lazily (`min_size=0`, no eager connect) against an unreachable host
   and never opened a socket? The `< 2.0 s` (`health_probe_timeout_s` + 1 s) budget in
   `test_api_starts_and_reports_503_when_backends_unreachable` depends on this being fast, and
   "raises nothing" depends on it never erroring.

## Root cause / what the installed versions actually do
- A path operation function that takes a `response: Response` parameter and mutates
  `response.status_code` **does** control the sent status code — Starlette sends whatever is on
  that `Response` object, regardless of the route's declared default. The function's own return
  value still goes through normal `response_model` serialization; only the status is dynamic.
  Verified directly: a handler returning `status="degraded"` with `response.status_code = 503`
  produced an httpx response with `.status_code == 503` and the full `HealthResponse` JSON body
  — not the generic `{"detail": ...}` that `raise HTTPException(503, ...)` would have produced
  instead (which would have silently broken the "same body" requirement).
- `responses={503: {"model": HealthResponse}}` is additive, not a replacement: FastAPI still
  auto-documents `200` from `response_model`, and merges in the extra `503` entry. Confirmed by
  printing `create_app().openapi()["paths"]["/health"]["get"]["responses"]` directly — both
  `"200"` and `"503"` come back with `content.application/json.schema.$ref` pointing at
  `#/components/schemas/HealthResponse`.
- `asgi_lifespan.LifespanManager(app)` (2.1.0) is an async context manager: `__aenter__` starts
  the ASGI `lifespan` scope and awaits `lifespan.startup.complete`; `__aexit__`, when no
  exception is already in flight, schedules `self.shutdown()` (sends `lifespan.shutdown`, awaits
  `lifespan.shutdown.complete`) via `AsyncExitStack.push_async_callback`. So
  `async with LifespanManager(app), AsyncClient(...) as client: ...` runs FastAPI's real
  `lifespan=` startup before the request and its shutdown after the block — exactly what
  `test_api_lifespan_unreachable.py` needs, with no separate `.startup()`/`.shutdown()` call and
  no manual exception handling around the block.
- `create_pool(dsn)` (asyncpg, `min_size=0`) and `create_async_redis(url)` (redis-py, lazy
  connection pool) both build in well under 1 ms even against a closed port
  (`postgresql://postgres:postgres@127.0.0.1:1/postgres`, `redis://127.0.0.1:1/0`), because
  neither opens a socket at build time. Closing them afterwards (`pool.close()`,
  `redis_client.aclose()`) is equally fast and raises nothing, since there is nothing open to
  close. Timed directly: build + close of both together completed in ~1 ms, nowhere near the 1 s
  probe timeout, let alone the 2 s test budget.

## Fix
- `api/routes/health.py`: `async def get_health(request: Request, response: Response) -> HealthResponse`;
  set `response.status_code = 200 if report.status == "ok" else 503` and
  `response.headers["Cache-Control"] = "no-store"`, then `return HealthResponse(...)` — never
  `raise HTTPException`, which would replace the body. Route decorator:
  `@router.get("/health", response_model=HealthResponse, responses={503: {"model": HealthResponse}}, operation_id="get_health")`.
- `tests/integration/test_api_lifespan_unreachable.py`: combine both context managers in one
  statement — `async with LifespanManager(app), AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:`
  — so the `GET` happens with the real lifespan active, and successfully exiting the `async with`
  block *is* the "leaving the lifespan context raises nothing" assertion (a shutdown-phase
  exception would fail the test with an error, with no explicit `try`/`except` needed).
- `wiring.build_container`/`close_container` need no defensive `try`/`except` around the
  pool/redis calls for the unreachable-backends case — the lazy-build, lazy-connect design
  already used by `db.pool.create_pool` and `kv.client.create_async_redis` (Tasks 4A/5) is
  sufficient by itself.

## Prevention
Any later route that must answer different status codes with the same documented schema (e.g.
a webhook idempotency response, or another milestone's health-shaped endpoint) can reuse this
exact pattern: a `response: Response` parameter, `response.status_code = ...`, and `return` the
model instance, plus `responses={<code>: {"model": <Model>}}` for the extra status in the docs.
Don't reach for `HTTPException` when the body must stay the declared model on a non-2xx
response — it replaces the body with `{"detail": ...}` and silently breaks that contract.
