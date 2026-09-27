# redis-py-async-client-mypy-strict-gaps

_2026-09-27 · Tags: redis-py 6.4.0, mypy strict, redis.asyncio.Redis, from_url, command return types_

## Symptom
Under Task 4A (`kv/client.py`, `kv/heartbeat.py`), `mypy --strict` flagged two things that
weren't obvious from redis-py's docs or from the sync client's behavior:
1. `create_async_redis`, mirroring `create_sync_redis`'s `return redis.Redis.from_url(...)`,
   failed with `Returning Any from function declared to return "Redis"` — only on the
   **async** client, not the sync one.
2. A plain command result used in a comparison (`sync_client.pttl(...)` compared with `<=`)
   failed with `Unsupported operand types ... "Awaitable[Any]"`, even though the code only ever
   uses the **sync** client (never awaits it).

## Root cause
- redis-py 6.4.0 is typed (`site-packages/redis/py.typed` present) and annotates
  `redis.client.Redis.from_url` as `-> "Redis"`, but `redis.asyncio.client.Redis.from_url` has
  **no return annotation at all** (`inspect.signature(...)` confirms it: the sync one shows
  `-> 'Redis'`, the async one shows nothing). mypy infers the untyped return as `Any`, which then
  trips `warn_return_any` (part of `strict = true`) the moment it flows straight out of a
  function declared to return a concrete type.
- The command methods (`ping`, `set`, `get`, `pttl`, …) are implemented once in mixins
  (`redis.commands.core.CoreCommands` etc.) shared by **both** the sync and the async client, so
  their stubs are typed generically as `Union[Awaitable[Any], Any]` regardless of which concrete
  client calls them. mypy keeps that as a real union rather than collapsing it, so an
  arithmetic/comparison operator on a sync client's result (which is never actually an
  `Awaitable`) still has to satisfy the `Awaitable[Any]` arm too, and fails.
- Neither `celery` nor `kombu` ship a `py.typed` marker at all (no `py.typed` under either
  package's top-level directory in `.venv`), which is why the task brief's mypy override
  (`ignore_missing_imports = true` for `celery`/`celery.*`/`kombu`/`kombu.*`) is necessary and
  sufficient for those two. `redis` needs no such override — it *is* typed, just imprecisely in
  these two spots.

## Fix
- Wrap `redis.asyncio.Redis.from_url(...)`'s result in `typing.cast(redis.asyncio.Redis, ...)`
  (see `backend/src/autoapplier/kv/client.py::create_async_redis`).
- Wrap a sync client's command result in `typing.cast(<expected type>, ...)` — not `int(...)` /
  `str(...)` etc., since those validate their argument's static type against their own overloads
  and still fail against the `Awaitable[Any] | Any` union — before comparing or branching on it
  (see `pttl_ms = cast(int, sync_client.pttl(...))` in
  `backend/tests/integration/test_heartbeat_redis.py`).
- `client.get(...)` on the **async** client needed no cast: the awaited value is only ever passed
  to `json.loads`/dict indexing (which accept `Any` silently) and never returned directly, so
  `warn_return_any` never triggers there. Cast only where a result is returned, compared, or
  branched on directly.

## Prevention
Task 4B's async runtime bridge (`autoapplier.worker.runtime`) will construct and call more
`redis.asyncio.Redis` methods under the same `mypy strict` config. Expect the same two patterns:
cast the client itself if it's built via `from_url` (or anything else with a missing return
annotation), and cast any individual command result that gets compared, branched on, or returned
directly rather than just handed to another `Any`-accepting call.
