"""Fixtures for integration tests against the real local Valkey (ADR-0012).

Every test gets its own `aa:test:<uuid>:` key prefix and cleans up only the
keys under it via `SCAN MATCH <prefix>*` — this suite never runs
`FLUSHALL`/`FLUSHDB`, since Valkey may be shared with a developer's running
app or another test run.
"""

from collections.abc import Iterator
from uuid import uuid4

import pytest
import redis

from autoapplier.config import Settings
from autoapplier.kv.client import create_sync_redis


@pytest.fixture
def redis_url() -> str:
    """The local Valkey URL from `Settings`; fails fast with a fix-it hint if unreachable."""
    settings = Settings(_env_file=None)
    client = create_sync_redis(settings.redis_url)
    try:
        client.ping()
    except redis.exceptions.RedisError:
        pytest.fail("Local Valkey is not running: bash scripts/valkey.sh start")
    finally:
        client.close()
    return settings.redis_url


@pytest.fixture
def key_prefix(redis_url: str) -> Iterator[str]:
    """A unique `aa:test:<uuid>:` prefix; teardown deletes only the keys under it."""
    prefix = f"aa:test:{uuid4().hex}:"
    yield prefix
    client = create_sync_redis(redis_url)
    try:
        stray_keys = list(client.scan_iter(match=f"{prefix}*"))
        if stray_keys:
            client.delete(*stray_keys)
    finally:
        client.close()
