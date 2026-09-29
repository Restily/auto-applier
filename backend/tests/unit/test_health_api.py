"""Unit tests for `GET /health` (Task 6): status codes, headers, body shape, OpenAPI docs.

Uses httpx `AsyncClient(transport=ASGITransport(app))` against `create_app(container=...)`
with a stub `HealthService` (in-file stub probes, as in `test_health_service.py`) — never
the real db/kv adapters, so these run with no network and no lifespan.
"""

from typing import cast

import asyncpg
import httpx
import redis
from celery import Celery

from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.domain.health import CheckResult
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
from autoapplier.wiring import Container


class _StubProbe:
    """A `HealthProbe` returning a fixed `result`."""

    def __init__(self, name: str, result: CheckResult) -> None:
        self.name = name
        self._result = result

    async def check(self) -> CheckResult:
        return self._result


def _container(health: HealthService) -> Container:
    """A `Container` whose only field the `/health` route touches is `health`."""
    return Container(
        settings=Settings(_env_file=None),
        pool=cast(asyncpg.Pool, None),
        redis=cast(redis.asyncio.Redis, None),
        health=health,
        llm=cast(LLMProvider, None),
        queue=cast(JobQueue, None),
        celery_app=cast(Celery, None),
        http=cast(httpx.AsyncClient, None),
        tokens=cast(TokenVerifier, None),
        auth_admin=cast(AuthAdmin, None),
        storage=cast(FileStorage, None),
        documents=cast(DocumentTextExtractor, None),
        resumes=cast(ResumeService, None),
        resume_extraction=cast(ResumeExtractionService, None),
        account_export=cast(AccountExportService, None),
        account_deletion=cast(AccountDeletionService, None),
    )


async def test_health_ok_returns_200_with_both_checks() -> None:
    health = HealthService(
        [
            _StubProbe("database", CheckResult(status="ok", latency_ms=1.0, detail=None)),
            _StubProbe("queue", CheckResult(status="ok", latency_ms=2.0, detail=None)),
        ],
        version="0.1.0",
        timeout_s=1.0,
    )
    app = create_app(container=_container(health))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "status": "ok",
        "version": "0.1.0",
        "checks": {
            "database": {"status": "ok", "latency_ms": 1.0, "detail": None},
            "queue": {"status": "ok", "latency_ms": 2.0, "detail": None},
        },
    }


async def test_health_degraded_returns_503_with_body() -> None:
    health = HealthService(
        [
            _StubProbe("database", CheckResult(status="ok", latency_ms=1.0, detail=None)),
            _StubProbe(
                "queue",
                CheckResult(status="down", latency_ms=2.0, detail="queue broker unreachable"),
            ),
        ],
        version="0.1.0",
        timeout_s=1.0,
    )
    app = create_app(container=_container(health))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"]["status"] == "ok"
    assert body["checks"]["queue"]["status"] == "down"


async def test_health_sets_no_store() -> None:
    health = HealthService(
        [
            _StubProbe("database", CheckResult(status="ok", latency_ms=1.0, detail=None)),
            _StubProbe("queue", CheckResult(status="ok", latency_ms=2.0, detail=None)),
        ],
        version="0.1.0",
        timeout_s=1.0,
    )
    app = create_app(container=_container(health))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.headers["Cache-Control"] == "no-store"


async def test_health_body_has_no_secret_fields() -> None:
    health = HealthService(
        [
            _StubProbe(
                "database",
                CheckResult(status="down", latency_ms=1.0, detail="check failed: OSError"),
            ),
            _StubProbe("queue", CheckResult(status="ok", latency_ms=2.0, detail=None)),
        ],
        version="0.1.0",
        timeout_s=1.0,
    )
    app = create_app(container=_container(health))

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    text = response.text
    assert "database_url" not in text
    assert "postgres:" not in text
    assert "key" not in text


async def test_openapi_documents_200_and_503() -> None:
    app = create_app(Settings(_env_file=None))

    spec = app.openapi()

    responses = spec["paths"]["/health"]["get"]["responses"]
    assert responses["200"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "HealthResponse"
    )
    assert responses["503"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "HealthResponse"
    )
    assert spec["paths"]["/health"]["get"]["operationId"] == "get_health"
