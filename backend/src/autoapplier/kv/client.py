"""Redis/Valkey client construction: short timeouts, decoded responses, no eager connection.

`redis.Redis.from_url`/`redis.asyncio.Redis.from_url` build a client backed by a
lazy connection pool — no socket is opened until the first command runs — so
these are cheap to call at wiring time.
"""

from typing import cast

import redis

_SOCKET_CONNECT_TIMEOUT_S = 2
_SOCKET_TIMEOUT_S = 2


def create_async_redis(url: str) -> redis.asyncio.Redis:
    """Build an async Redis client for `url`. Does not connect until first use."""
    # redis-py's async `from_url` has no return annotation (unlike the sync one), so
    # mypy would otherwise infer `Any` here.
    return cast(
        redis.asyncio.Redis,
        redis.asyncio.Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=_SOCKET_CONNECT_TIMEOUT_S,
            socket_timeout=_SOCKET_TIMEOUT_S,
        ),
    )


def create_sync_redis(url: str) -> redis.Redis:
    """Build a sync Redis client for `url`. Does not connect until first use."""
    return redis.Redis.from_url(
        url,
        decode_responses=True,
        socket_connect_timeout=_SOCKET_CONNECT_TIMEOUT_S,
        socket_timeout=_SOCKET_TIMEOUT_S,
    )
