"""Database health probe: proves Postgres is reachable through the shared pool."""

import time

import asyncpg

from autoapplier.domain.health import CheckResult


class DatabaseProbe:
    """Runs `select 1` through `pool`. Any failure is left to the caller (see `services.health`)."""

    name = "database"

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def check(self) -> CheckResult:
        start = time.monotonic()
        await self._pool.fetchval("select 1")
        return CheckResult(status="ok", latency_ms=(time.monotonic() - start) * 1000)
