"""Run SQL as the caller so RLS decides what they see (ADR-0004, T-007)."""

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from autoapplier.ports.auth import AuthClaims


@asynccontextmanager
async def as_user(pool: asyncpg.Pool, claims: AuthClaims) -> AsyncIterator[asyncpg.Connection]:
    """Yield a connection inside a transaction acting as `authenticated` with `claims`.

    `SET LOCAL ROLE` and the claims setting are transaction-scoped, so they reset when the
    block ends (commit or rollback) and the connection returns to the pool unchanged.
    """
    async with pool.acquire() as conn, conn.transaction():
        await conn.execute("set local role authenticated")
        await conn.execute(
            "select set_config('request.jwt.claims', $1, true)", json.dumps(dict(claims.raw))
        )
        yield conn
