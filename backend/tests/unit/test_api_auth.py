"""Unit tests for `current_user` and `GET /v1/me` (ASGI, `FakeTokenVerifier`, no network)."""

from typing import cast
from uuid import UUID

import asyncpg
import httpx
import redis
from celery import Celery

from autoapplier.adapters.auth.fake import FakeAuthAdmin, FakeTokenVerifier
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.ports.auth import AuthClaims
from autoapplier.ports.documents import DocumentTextExtractor
from autoapplier.ports.llm import LLMProvider
from autoapplier.ports.queue import JobQueue
from autoapplier.services.account_deletion import AccountDeletionService
from autoapplier.services.account_export import AccountExportService
from autoapplier.services.health import HealthService
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import ResumeService
from autoapplier.wiring import Container

USER = UUID("3f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")
GOOD = "good-token-abc"
CLAIMS = AuthClaims(
    user_id=USER,
    email="a@example.test",
    role="authenticated",
    session_id="s1",
    raw={"sub": str(USER), "role": "authenticated"},
)


def _client() -> httpx.AsyncClient:
    container = Container(
        settings=Settings(_env_file=None),
        pool=cast(asyncpg.Pool, None),
        redis=cast(redis.asyncio.Redis, None),
        health=cast(HealthService, None),
        llm=cast(LLMProvider, None),
        queue=cast(JobQueue, None),
        celery_app=cast(Celery, None),
        http=cast(httpx.AsyncClient, None),
        tokens=FakeTokenVerifier({GOOD: CLAIMS}),
        auth_admin=FakeAuthAdmin(),
        storage=InMemoryFileStorage(),
        documents=cast(DocumentTextExtractor, None),
        resumes=cast(ResumeService, None),
        resume_extraction=cast(ResumeExtractionService, None),
        account_export=cast(AccountExportService, None),
        account_deletion=cast(AccountDeletionService, None),
    )
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(create_app(container=container)), base_url="http://test"
    )


async def test_missing_header_401_missing_token_with_www_authenticate() -> None:
    async with _client() as client:
        response = await client.get("/v1/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "auth.missing_token"


async def test_non_bearer_scheme_is_missing_token() -> None:
    async with _client() as client:
        response = await client.get("/v1/me", headers={"Authorization": "Basic abc"})

    assert response.status_code == 401
    assert response.json()["code"] == "auth.missing_token"


async def test_bad_token_401_invalid_token() -> None:
    async with _client() as client:
        response = await client.get("/v1/me", headers={"Authorization": "Bearer nope"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["code"] == "auth.invalid_token"


async def test_me_returns_user() -> None:
    async with _client() as client:
        response = await client.get("/v1/me", headers={"Authorization": f"Bearer {GOOD}"})

    assert response.status_code == 200
    assert response.json() == {"user_id": str(USER), "email": "a@example.test"}


async def test_problem_never_echoes_token() -> None:
    token = "SUPER-SECRET-TOKEN-VALUE"  # noqa: S105
    async with _client() as client:
        response = await client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})

    assert token not in response.text
    assert token not in str(dict(response.headers))


async def test_openapi_documents_me_with_401_problem() -> None:
    async with _client() as client:
        spec = (await client.get("/openapi.json")).json()

    op = spec["paths"]["/v1/me"]["get"]
    assert op["operationId"] == "get_me"
    assert "401" in op["responses"]
