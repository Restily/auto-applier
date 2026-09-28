"""Postgres connection pool: build once per process, share across requests.

`min_size=0` means `asyncpg.create_pool` allocates its internal queue but
opens no sockets — the first real connection happens on the pool's first
acquire (e.g. a query). So building the pool never fails process startup or
a health check just because Postgres happens to be unreachable at that
moment; that shows up as a "down" `db.probes.DatabaseProbe` check instead.
"""

import asyncpg


async def create_pool(
    dsn: str, *, min_size: int = 0, max_size: int = 10, command_timeout: float = 5.0
) -> asyncpg.Pool:
    """Build an asyncpg pool for `dsn`. Does not connect until the first acquire."""
    return await asyncpg.create_pool(
        dsn, min_size=min_size, max_size=max_size, command_timeout=command_timeout
    )
