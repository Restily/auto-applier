"""Unit tests for `close_container` (M0 final review, finding M2): exception-safe close.

Fakes stand in for `container.pool`, `container.redis` and `container.celery_app`, so
these run with no network and no real Postgres/Valkey/Celery connections.
"""

from dataclasses import dataclass
from typing import cast

import asyncpg
import httpx
import pytest
import redis
from celery import Celery

from autoapplier.config import Settings
from autoapplier.ports.auth import AuthAdmin, TokenVerifier
from autoapplier.ports.documents import DocumentTextExtractor
from autoapplier.ports.llm import LLMProvider
from autoapplier.ports.queue import JobQueue
from autoapplier.ports.storage import FileStorage
from autoapplier.services.account_deletion import AccountDeletionService
from autoapplier.services.account_export import AccountExportService
from autoapplier.services.health import HealthService
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import ResumeService
from autoapplier.wiring import Container, close_container


@dataclass
class _FakePool:
    closed: bool = False
    raise_on_close: bool = False

    async def close(self) -> None:
        self.closed = True
        if self.raise_on_close:
            raise RuntimeError("pool.close() failed")


@dataclass
class _FakeRedis:
    closed: bool = False

    async def aclose(self) -> None:
        self.closed = True


@dataclass
class _FakeHttp:
    closed: bool = False

    async def aclose(self) -> None:
        self.closed = True


@dataclass
class _FakeCeleryApp:
    closed: bool = False

    def close(self) -> None:
        self.closed = True


def _container(pool: _FakePool, redis_client: _FakeRedis, celery_app: _FakeCeleryApp) -> Container:
    """A `Container` whose only live fields are the three `close_container` touches."""
    return Container(
        settings=cast(Settings, None),
        pool=cast(asyncpg.Pool, pool),
        redis=cast(redis.asyncio.Redis, redis_client),
        health=cast(HealthService, None),
        llm=cast(LLMProvider, None),
        queue=cast(JobQueue, None),
        celery_app=cast(Celery, celery_app),
        http=cast(httpx.AsyncClient, _FakeHttp()),
        tokens=cast(TokenVerifier, None),
        auth_admin=cast(AuthAdmin, None),
        storage=cast(FileStorage, None),
        documents=cast(DocumentTextExtractor, None),
        resumes=cast(ResumeService, None),
        resume_extraction=cast(ResumeExtractionService, None),
        account_export=cast(AccountExportService, None),
        account_deletion=cast(AccountDeletionService, None),
    )


async def test_closes_all_resources_when_nothing_raises() -> None:
    pool, redis_client, celery_app = _FakePool(), _FakeRedis(), _FakeCeleryApp()

    await close_container(_container(pool, redis_client, celery_app))

    assert (pool.closed, redis_client.closed, celery_app.closed) == (True, True, True)


async def test_pool_close_raising_still_closes_redis_and_celery_app_and_reraises() -> None:
    """M2: `pool.close()` raising must not leak the redis client or the Celery app.

    Chosen behavior: every resource is still closed, and the original error is
    re-raised (not swallowed/logged) so callers see the failure.
    """
    pool = _FakePool(raise_on_close=True)
    redis_client, celery_app = _FakeRedis(), _FakeCeleryApp()

    with pytest.raises(RuntimeError, match=r"pool\.close"):
        await close_container(_container(pool, redis_client, celery_app))

    assert redis_client.closed is True
    assert celery_app.closed is True
