"""ASGI tests for `/v1/account/*` (fake container)."""

from datetime import UTC, datetime
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
from autoapplier.domain.account import AccountExport, ExportAccount
from autoapplier.ports.auth import AuthClaims
from autoapplier.ports.documents import DocumentTextExtractor
from autoapplier.ports.llm import LLMProvider
from autoapplier.ports.queue import JobQueue
from autoapplier.services.account_deletion import AccountDeletionService, ResumeFilesPurge
from autoapplier.services.account_export import AccountExportService
from autoapplier.services.health import HealthService
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import ResumeService
from autoapplier.wiring import Container

USER = UUID("3f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e")
CLAIMS = AuthClaims(
    user_id=USER,
    email="a@example.test",
    role="authenticated",
    session_id="s",
    raw={"sub": str(USER), "role": "authenticated"},
)
NOW = datetime(2026, 9, 29, 12, 0, tzinfo=UTC)


class _FakeExport(AccountExportService):
    def __init__(self) -> None:  # no pool needed
        pass

    async def export(self, claims: AuthClaims, *, now: datetime) -> AccountExport:
        return AccountExport(
            exported_at=now,
            account=ExportAccount(
                id=claims.user_id, email=claims.email, ui_locale="en", created_at=NOW
            ),
            profile=None,
            resumes=[],
            searches=[],
            applications=[],
            credit_ledger=[],
            credit_balance=20,
        )


def _client(admin: FakeAuthAdmin) -> httpx.AsyncClient:
    container = Container(
        settings=Settings(_env_file=None),
        pool=cast(asyncpg.Pool, None),
        redis=cast(redis.asyncio.Redis, None),
        health=cast(HealthService, None),
        llm=cast(LLMProvider, None),
        queue=cast(JobQueue, None),
        celery_app=cast(Celery, None),
        http=cast(httpx.AsyncClient, None),
        tokens=FakeTokenVerifier({"tok": CLAIMS}),
        auth_admin=admin,
        storage=InMemoryFileStorage(),
        documents=cast(DocumentTextExtractor, None),
        resumes=cast(ResumeService, None),
        resume_extraction=cast(ResumeExtractionService, None),
        account_export=_FakeExport(),
        account_deletion=AccountDeletionService(admin, [ResumeFilesPurge(InMemoryFileStorage())]),
    )
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(create_app(container=container)), base_url="http://test"
    )


AUTH = {"Authorization": "Bearer tok"}


async def test_export_headers_and_body_shape() -> None:
    async with _client(FakeAuthAdmin()) as client:
        response = await client.get("/v1/account/export", headers=AUTH)
    assert response.status_code == 200
    disposition = response.headers["content-disposition"]
    assert disposition.startswith('attachment; filename="autoapplier-export-')
    assert disposition.endswith('.json"')
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["format_version"] == 1
    assert body["account"]["id"] == str(USER)
    assert body["credit_balance"] == 20
    assert {"profile", "resumes", "searches", "applications", "credit_ledger"} <= body.keys()


async def test_delete_204() -> None:
    admin = FakeAuthAdmin()
    async with _client(admin) as client:
        response = await client.post(
            "/v1/account/deletion", json={"confirm_email": " A@example.test"}, headers=AUTH
        )
    assert response.status_code == 204
    assert response.content == b""
    assert admin.deleted == [USER]


async def test_delete_mismatch_422_code() -> None:
    admin = FakeAuthAdmin()
    async with _client(admin) as client:
        response = await client.post(
            "/v1/account/deletion", json={"confirm_email": "x@example.test"}, headers=AUTH
        )
    assert response.status_code == 422
    assert response.json()["code"] == "account.confirmation_mismatch"
    assert admin.deleted == []


async def test_delete_failure_502_code() -> None:
    admin = FakeAuthAdmin()
    admin.fail_next()
    async with _client(admin) as client:
        response = await client.post(
            "/v1/account/deletion", json={"confirm_email": "a@example.test"}, headers=AUTH
        )
    assert response.status_code == 502
    assert response.json()["code"] == "account.delete_failed"
    assert "injected" not in response.text


async def test_both_require_auth() -> None:
    async with _client(FakeAuthAdmin()) as client:
        export = await client.get("/v1/account/export")
        delete = await client.post("/v1/account/deletion", json={"confirm_email": "a@example.test"})
    assert export.status_code == 401
    assert delete.status_code == 401
