# celery-shared-task-mypy-and-queue-isolation

_2026-09-27 · Tags: celery 5.6.3, kombu 5.6.2, mypy 2.3.1 strict, shared_task, contrib.testing.worker_

## Symptom
Two things under Task 4B (`worker/celery_app.py`, `worker/tasks/system.py`,
`tests/integration/test_celery_roundtrip.py`) that context7 (quota exhausted) couldn't
have confirmed and weren't obvious from the ADR text:

1. `mypy --strict` on `worker/tasks/system.py`:
   ```
   error: Untyped decorator makes function "ping" untyped  [untyped-decorator]
   error: Untyped decorator makes function "heartbeat" untyped  [untyped-decorator]
   ```
   on the `@shared_task(name=...)`-decorated task functions, even though `celery`/`celery.*`
   already has `ignore_missing_imports = true`.
2. Whether a worker built from an app with `task_default_queue`/`task_queues` overridden
   to a unique test queue `q` (never the literal `"default"`) would actually **only**
   consume `q` once started via `celery.contrib.testing.worker.start_worker(...,
   pool="solo")` — the brief flagged this as needing verification, with
   `worker.app.amqp.queues.select([q])` as a fallback if the installed Celery didn't
   honour it, and BLOCKED as the alternative if isolation couldn't be proven at all.
3. Whether `test_ping_roundtrip_through_valkey`'s `start_worker(...)` would also fire the
   *real* `celery.signals.worker_ready` — which `autoapplier.worker.celery_app` connects
   to `write_ready_heartbeat()` at import time, process-wide, with no `sender=` filter — and
   so overwrite the real (non-test-prefixed) `aa:heartbeat:worker` key as a side effect of
   running the test suite. `autoapplier.worker.celery_app` *is* imported in the same pytest
   process (by `test_beat_schedule.py`) before the round-trip test runs, so the receiver was
   live when `start_worker` ran.

## Root cause
1. `ignore_missing_imports` only stops mypy from complaining that it can't find a stub for
   the *module*; it still infers the decorator's own call signature as untyped (celery ships
   no `py.typed`/stubs at all — same gap `redis-py-async-client-mypy-strict-gaps.md`
   documents for `celery`/`kombu`). `strict = true` bundles `disallow_untyped_decorators`,
   which specifically fires when an **explicitly typed** function (`def ping(nonce: str) ->
   str`) is wrapped by a decorator mypy can't type — erasing the function's own annotations
   (every call site then sees `Any`) unless silenced.
2. Verified empirically (`uv run python` against `backend/.venv`, see the round-trip test
   for the real version): `Celery.amqp.queues` (a `celery.app.amqp.Queues`) is computed
   live from `app.conf.task_queues`/`task_default_queue` — not cached from app-creation
   time — so setting them right after `create_celery_app(...)` and before `start_worker`
   already leaves `set(app.amqp.queues) == {q}`. `celery.contrib.testing.worker.start_worker`
   builds its `WorkController` straight from that same `app`, with no `queues=` override, so
   the worker's Consumer bootstep consumes exactly `app.amqp.queues` — `{q}`, never
   `"default"`. Confirmed with a real Valkey round trip: a task sent to `q` completed;
   a second task sent to `"default"` sat `PENDING` (never picked up) for the whole check.
   `celery.shared_task` also doesn't care about creation order: the decorator registers a
   task *factory* in a process-global list (`Celery._on_app_finalizers`), which **every**
   Celery app instance — including a `test_app` built after the decorator already ran, since
   the interpreter only executes a module body once — walks the first time it needs its task
   registry (`.tasks`, `.amqp`, or an explicit `.finalize()`). Importing
   `autoapplier.worker.tasks.system` once anywhere in the process is enough; which app
   existed first doesn't matter.
3. Not a problem: `celery.contrib.testing.worker.TestWorkController` (what `start_worker`
   builds) overrides `on_consumer_ready` itself — reading its source
   (`inspect.getsource`) shows it only sets a local `threading.Event` and sends
   `celery.contrib.testing.tasks.test_worker_started`, never `celery.signals.worker_ready`.
   Confirmed by checking Valkey directly after a full suite run: `GET aa:heartbeat:worker`
   was `None` (key never created). A *real* `celery worker` process (`npm run dev:worker`)
   does fire `worker_ready` — confirmed separately, see the Task 4B report — only the test
   harness's worker doesn't.

## Fix
- Added a second, narrowly scoped `[[tool.mypy.overrides]]` in `backend/pyproject.toml` —
  `module = ["autoapplier.worker.tasks.*"]`, `disallow_untyped_decorators = false` — instead
  of loosening `strict` project-wide or scattering `# type: ignore[untyped-decorator]`
  comments. Everything outside `worker/tasks/` stays fully strict.
- No `worker.app.amqp.queues.select([q])` fallback was needed: the installed Celery already
  honours `task_queues`/`task_default_queue` set before `start_worker`. The round-trip test
  (`tests/integration/test_celery_roundtrip.py::test_ping_roundtrip_through_valkey`) asserts
  `set(test_app.amqp.queues) == {q}` as a precondition and then proves isolation positively —
  the task only completes within `AsyncResult(...).get(timeout=10)` if the test-local worker
  actually consumed `q`.
- Nothing changed for (3): documented here instead, since it's exactly the kind of
  implicit safety the next person touching this file needs to know still holds.

## Prevention
- Any new Celery task module joining `autoapplier.worker.tasks.*` inherits the scoped mypy
  override automatically — no per-task-function `# type: ignore` needed. A task module placed
  *outside* that package (it shouldn't be) would need its own override or hit this error again.
- When a future task needs a second test-isolated queue/worker (e.g. M2/M3 `ingest.*`,
  `apply.*`), the same recipe applies: set `task_default_queue`/`task_queues` on a
  test-local app before `start_worker`, assert `set(app.amqp.queues)` equals exactly the
  expected set, and import the relevant task module first so `shared_task` binds it — no
  `.select()` call needed unless a future Celery upgrade changes this (re-verify against
  `backend/.venv` if `celery[redis]` is ever bumped past the `<6` pin).
- If a future test ever needs to assert on `write_ready_heartbeat` actually firing from a
  *real* signal dispatch (not calling it directly, as `test_worker_ready_signal_writes_heartbeat`
  does), it cannot use `celery.contrib.testing.worker.start_worker` for that — it doesn't
  emit `worker_ready`. That would need a real `celery worker` subprocess (as the manual
  `dev:worker` check in the Task 4B report does).
