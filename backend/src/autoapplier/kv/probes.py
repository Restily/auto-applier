"""Queue health probe: broker reachability plus worker heartbeat freshness (ADR-0012)."""

import time
from datetime import UTC, datetime

import redis

from autoapplier.domain.health import CheckResult, queue_check
from autoapplier.kv.heartbeat import heartbeat_age_s, read_heartbeat


class QueueProbe:
    """PINGs the broker, then (only if reachable) reads the worker heartbeat under `key_prefix`."""

    name = "queue"

    def __init__(
        self, redis: redis.asyncio.Redis, *, key_prefix: str, max_heartbeat_age_s: float
    ) -> None:
        self._redis = redis
        self._key_prefix = key_prefix
        self._max_heartbeat_age_s = max_heartbeat_age_s

    async def check(self) -> CheckResult:
        start = time.monotonic()
        try:
            await self._redis.ping()
            broker_reachable = True
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            broker_reachable = False

        age: float | None = None
        if broker_reachable:
            heartbeat = await read_heartbeat(self._redis, prefix=self._key_prefix)
            age = heartbeat_age_s(heartbeat, datetime.now(UTC))

        return queue_check(
            broker_reachable=broker_reachable,
            heartbeat_age_s=age,
            max_age_s=self._max_heartbeat_age_s,
            latency_ms=(time.monotonic() - start) * 1000,
        )
