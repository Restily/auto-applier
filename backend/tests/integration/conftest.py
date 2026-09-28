"""Fixtures for integration tests against the real local Valkey and Postgres (ADR-0012).

Every test gets its own `aa:test:<uuid>:` key prefix and cleans up only the
keys under it via `SCAN MATCH <prefix>*` — this suite never runs
`FLUSHALL`/`FLUSHDB`, since Valkey may be shared with a developer's running
app or another test run.
"""

import os
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator
from pathlib import Path
from uuid import uuid4

import asyncpg
import httpx
import pytest
import redis

from autoapplier.config import Settings
from autoapplier.db.pool import create_pool
from autoapplier.kv.client import create_sync_redis

from .supabase_helpers import TestUser, admin_create_user, admin_delete_user

MAILPIT_URL = "http://127.0.0.1:54324"
_WEB_ENV_LOCAL = Path(__file__).resolve().parents[3] / "apps" / "web" / ".env.local"


@pytest.fixture
async def pool() -> AsyncIterator[asyncpg.Pool]:
    """A live pool against local Supabase Postgres; fails fast with a fix-it hint if unreachable."""
    settings = Settings(_env_file=None)
    db_pool = await create_pool(settings.database_url)
    try:
        await db_pool.fetchval("select 1")
    except Exception:
        await db_pool.close()
        pytest.fail("Local Supabase is not running: bash team/bin/app.sh supabase")
    yield db_pool
    await db_pool.close()


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


@pytest.fixture
def mailpit_url() -> str:
    """The local Mailpit (Supabase Inbucket) base URL; the API lives under `/api/v1`."""
    return MAILPIT_URL


@pytest.fixture
def supabase_url() -> str:
    return Settings(_env_file=None).supabase_url


@pytest.fixture
def supabase_secret() -> str:
    """The `sb_secret_...` key for admin calls; fails with a fix-it hint if it is not synced."""
    secret = Settings().supabase_secret_key
    if secret is None:
        pytest.fail("SUPABASE_SECRET_KEY is not set: python3 scripts/sync_env.py")
    return secret.get_secret_value()


@pytest.fixture
def supabase_publishable_key() -> str:
    """The `sb_publishable_...` key used by public (browser-like) Auth calls."""
    from_env = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if from_env:
        return from_env
    if _WEB_ENV_LOCAL.exists():
        for line in _WEB_ENV_LOCAL.read_text().splitlines():
            key, _, value = line.partition("=")
            if key.strip() == "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" and value.strip():
                return value.strip().strip("\"'")
    pytest.fail("Publishable key not found: python3 scripts/sync_env.py")


@pytest.fixture
async def http() -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(timeout=15) as client:
        yield client


@pytest.fixture
async def make_user(
    http: httpx.AsyncClient, supabase_url: str, supabase_secret: str
) -> AsyncIterator[Callable[..., Awaitable[TestUser]]]:
    """Async factory for confirmed users `be+<uuid>@example.test`; teardown deletes them."""
    created: list[TestUser] = []

    async def factory(*, locale: str = "en") -> TestUser:
        user = await admin_create_user(http, supabase_url, supabase_secret, locale=locale)
        created.append(user)
        return user

    yield factory
    for user in created:
        await admin_delete_user(http, supabase_url, supabase_secret, user.id)
