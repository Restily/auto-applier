"""Integration (needs no running services): the real FastAPI lifespan against unreachable
Postgres and Valkey (Task 6; Review Focus #1 — the API must start and answer even when both
backends are down, never hang, never 500).
"""

import time

from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.wiring import build_container, close_container


async def test_api_starts_and_reports_503_when_backends_unreachable() -> None:
    settings = Settings(
        _env_file=None,
        database_url="postgresql://postgres:postgres@127.0.0.1:1/postgres",
        redis_url="redis://127.0.0.1:1/0",
        health_probe_timeout_s=1,
    )

    # build_container/close_container never raise just because the backends are down —
    # both are lazy (asyncpg pool min_size=0, a redis-py client with no eager connect).
    container = await build_container(settings)
    await close_container(container)

    app = create_app(settings)  # no injected container: the real lifespan builds one.

    async with (
        LifespanManager(app),
        AsyncClient(transport=ASGITransport(app), base_url="http://test") as client,
    ):
        start = time.monotonic()
        response = await client.get("/health")
        elapsed_s = time.monotonic() - start
    # Leaving the lifespan context above raised nothing.

    assert response.status_code == 503
    body = response.json()
    assert body["checks"]["database"]["status"] == "down"
    assert body["checks"]["queue"]["status"] == "down"
    assert elapsed_s < 2.0  # health_probe_timeout_s (1) + 1s
