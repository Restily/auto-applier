"""Integration: `GET /health` through the real FastAPI app, real local Postgres and Valkey.

Builds a real `Container` via `autoapplier.wiring.build_container` (no injected stub) and
drives it through the ASGI app with httpx — the same wiring the running API uses, just
without the lifespan. Uses the shared `key_prefix` fixture, so this never collides with a
developer's real worker heartbeat under the default `aa:` prefix.
"""

import httpx

from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.kv.client import create_sync_redis
from autoapplier.kv.heartbeat import write_heartbeat
from autoapplier.wiring import build_container, close_container


async def test_live_health_ok_with_heartbeat(key_prefix: str) -> None:
    settings = Settings(_env_file=None, redis_key_prefix=key_prefix)

    sync_client = create_sync_redis(settings.redis_url)
    write_heartbeat(sync_client, prefix=key_prefix, worker="worker-1", version="0.1.0", ttl_s=30)
    sync_client.close()

    container = await build_container(settings)
    app = create_app(container=container)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app), base_url="http://test"
        ) as client:
            response = await client.get("/health")
    finally:
        await close_container(container)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["database"]["status"] == "ok"
    assert body["checks"]["queue"]["status"] == "ok"


async def test_live_health_degraded_without_heartbeat(key_prefix: str) -> None:
    # `key_prefix` is a fresh unique `aa:test:<uuid>:` prefix: no heartbeat was ever
    # written under it, so the queue check is "down" regardless of a real worker
    # running under the default `aa:` prefix.
    settings = Settings(_env_file=None, redis_key_prefix=key_prefix)

    container = await build_container(settings)
    app = create_app(container=container)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app), base_url="http://test"
        ) as client:
            response = await client.get("/health")
    finally:
        await close_container(container)

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["queue"]["status"] == "down"
