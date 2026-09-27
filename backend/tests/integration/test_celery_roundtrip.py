"""Integration tests: a real round trip through local Valkey (ADR-0012).

`test_ping_roundtrip_through_valkey` builds a **test-local** Celery app pinned to a
unique queue and never touches the literal `"default"` queue the dev worker
(`npm run dev:worker`) consumes — so this suite never collides with it, and never
falls back to `default` if that isolation can't be proven.
"""

from collections.abc import Iterator
from uuid import uuid4

import kombu
import pytest
from celery.contrib.testing.worker import start_worker
from celery.result import AsyncResult

from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.adapters.queue.celery_queue import CeleryJobQueue
from autoapplier.config import Settings, get_settings
from autoapplier.kv.client import create_async_redis
from autoapplier.kv.heartbeat import read_heartbeat
from autoapplier.worker.jobs import SYSTEM_PING
from autoapplier.worker.signals import write_ready_heartbeat

# Importing this module registers `system.ping`/`system.heartbeat` as shared tasks
# (celery.shared_task) *before* any Celery app below is built or finalized, so they
# bind onto our test-local app too, not just the real `autoapplier.worker.celery_app`.
from autoapplier.worker.tasks.system import heartbeat


@pytest.fixture
def scoped_key_prefix(monkeypatch: pytest.MonkeyPatch, key_prefix: str) -> Iterator[str]:
    """Point `get_settings()` at a unique `aa:test:<uuid>:` prefix for one test.

    `heartbeat()`/`write_ready_heartbeat()` read `get_settings()` internally, so the
    override has to happen through the env + the cache, not by passing arguments.
    """
    monkeypatch.setenv("REDIS_KEY_PREFIX", key_prefix)
    get_settings.cache_clear()
    try:
        yield key_prefix
    finally:
        get_settings.cache_clear()


async def test_ping_roundtrip_through_valkey(redis_url: str) -> None:
    nonce = uuid4().hex
    q = f"test-{uuid4().hex}"
    test_app = create_celery_app(Settings(_env_file=None))
    test_app.conf.task_default_queue = q
    test_app.conf.task_queues = (kombu.Queue(q),)

    # This app (and so the worker started from it) knows only `q` — never "default".
    assert set(test_app.amqp.queues) == {q}

    # Verified against the installed Celery (5.6.3, see docs/solutions/): a worker
    # built from an app whose task_default_queue/task_queues were set before
    # start_worker() consumes only app.amqp.queues, so no
    # worker.app.amqp.queues.select([q]) fallback is needed here.
    with start_worker(test_app, pool="solo", perform_ping_check=False):
        task_id = await CeleryJobQueue(test_app).enqueue(SYSTEM_PING, args=[nonce], queue=q)
        result = AsyncResult(task_id, app=test_app).get(timeout=10)

    assert result == nonce


async def test_heartbeat_task_writes_key(scoped_key_prefix: str, redis_url: str) -> None:
    heartbeat.apply()

    client = create_async_redis(redis_url)
    try:
        result = await read_heartbeat(client, prefix=scoped_key_prefix)
    finally:
        await client.aclose()

    assert result is not None


async def test_worker_ready_signal_writes_heartbeat(scoped_key_prefix: str, redis_url: str) -> None:
    write_ready_heartbeat()

    client = create_async_redis(redis_url)
    try:
        result = await read_heartbeat(client, prefix=scoped_key_prefix)
    finally:
        await client.aclose()

    assert result is not None
