"""Integration tests: DatabaseProbe and QueueProbe against real local Postgres and Valkey."""

import time

import asyncpg

from autoapplier.db.pool import create_pool
from autoapplier.db.probes import DatabaseProbe
from autoapplier.kv.client import create_async_redis, create_sync_redis
from autoapplier.kv.heartbeat import write_heartbeat
from autoapplier.kv.probes import QueueProbe
from autoapplier.services.health import HealthService

_MAX_HEARTBEAT_AGE_S = 30.0


async def test_database_probe_ok(pool: asyncpg.Pool) -> None:
    probe = DatabaseProbe(pool)

    result = await probe.check()

    assert result.status == "ok"
    assert result.detail is None
    assert result.latency_ms >= 0


async def test_queue_probe_ok_with_fresh_heartbeat(redis_url: str, key_prefix: str) -> None:
    sync_client = create_sync_redis(redis_url)
    write_heartbeat(sync_client, prefix=key_prefix, worker="worker-1", version="0.1.0", ttl_s=30)
    sync_client.close()

    async_client = create_async_redis(redis_url)
    probe = QueueProbe(
        async_client, key_prefix=key_prefix, max_heartbeat_age_s=_MAX_HEARTBEAT_AGE_S
    )

    result = await probe.check()
    await async_client.aclose()

    assert result.status == "ok"
    assert result.detail is None


async def test_queue_probe_down_without_heartbeat(redis_url: str, key_prefix: str) -> None:
    # `key_prefix` is a fresh unique `aa:test:<uuid>:` prefix, so this never sees the
    # heartbeat a developer's real worker may be writing under the default `aa:` prefix.
    async_client = create_async_redis(redis_url)
    probe = QueueProbe(
        async_client, key_prefix=key_prefix, max_heartbeat_age_s=_MAX_HEARTBEAT_AGE_S
    )

    result = await probe.check()
    await async_client.aclose()

    assert result.status == "down"
    assert result.detail == "no worker heartbeat (worker or beat not running)"


async def test_probes_down_when_backends_unreachable() -> None:
    db_pool = await create_pool("postgresql://postgres:postgres@127.0.0.1:1/postgres")
    redis_client = create_async_redis("redis://127.0.0.1:1/0")
    service = HealthService(
        [
            DatabaseProbe(db_pool),
            QueueProbe(
                redis_client,
                key_prefix="aa:test:unreachable:",
                max_heartbeat_age_s=_MAX_HEARTBEAT_AGE_S,
            ),
        ],
        version="0.1.0",
        timeout_s=2.0,
    )

    start = time.monotonic()
    report = await service.report()
    elapsed_s = time.monotonic() - start

    await db_pool.close()
    await redis_client.aclose()

    assert elapsed_s < 3.0
    assert report.checks["database"].status == "down"
    assert report.checks["queue"].status == "down"
