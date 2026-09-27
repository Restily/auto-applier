"""Integration tests: the worker heartbeat round-trips through real local Valkey (ADR-0012)."""

from datetime import UTC, datetime
from typing import cast
from uuid import uuid4

from autoapplier.kv.client import create_async_redis, create_sync_redis
from autoapplier.kv.heartbeat import Heartbeat, read_heartbeat, write_heartbeat
from autoapplier.kv.keys import HEARTBEAT_WORKER, key


async def test_write_then_read_roundtrip(redis_url: str, key_prefix: str) -> None:
    sync_client = create_sync_redis(redis_url)
    async_client = create_async_redis(redis_url)
    now = datetime.now(UTC)

    write_heartbeat(
        sync_client, prefix=key_prefix, worker="worker-1", version="0.1.0", ttl_s=30, now=now
    )
    heartbeat = await read_heartbeat(async_client, prefix=key_prefix)

    assert heartbeat == Heartbeat(worker="worker-1", version="0.1.0", at=now)
    await async_client.aclose()
    sync_client.close()


async def test_heartbeat_has_ttl(redis_url: str, key_prefix: str) -> None:
    sync_client = create_sync_redis(redis_url)
    ttl_s = 30.0

    write_heartbeat(sync_client, prefix=key_prefix, worker="worker-1", version="0.1.0", ttl_s=ttl_s)
    # redis-py's shared command mixin types this `Awaitable[Any] | Any` for both sync
    # and async clients; the sync client always returns the value directly.
    pttl_ms = cast(int, sync_client.pttl(key(key_prefix, *HEARTBEAT_WORKER)))

    assert 1 <= pttl_ms <= ttl_s * 1000
    sync_client.close()


async def test_missing_heartbeat_reads_none(redis_url: str, key_prefix: str) -> None:
    async_client = create_async_redis(redis_url)

    heartbeat = await read_heartbeat(async_client, prefix=key_prefix)

    assert heartbeat is None
    await async_client.aclose()


async def test_prefixes_are_isolated(redis_url: str, key_prefix: str) -> None:
    sync_client = create_sync_redis(redis_url)
    async_client = create_async_redis(redis_url)
    write_heartbeat(sync_client, prefix=key_prefix, worker="worker-1", version="0.1.0", ttl_s=30)

    other_prefix = f"aa:test:{uuid4().hex}:"
    heartbeat = await read_heartbeat(async_client, prefix=other_prefix)

    assert heartbeat is None
    sync_client.close()
    await async_client.aclose()
