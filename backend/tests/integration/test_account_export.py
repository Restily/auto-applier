"""Account export against real Postgres/GoTrue: caller-only rows, table coverage (S-006, T-007)."""

import json
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import UTC, datetime
from uuid import UUID, uuid4

import asyncpg
import httpx
import pytest

from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.db.account import user_owned_tables
from autoapplier.ports.auth import AuthClaims
from autoapplier.services.account_export import (
    EXPORT_EXCLUDED,
    EXPORT_SECTIONS,
    AccountExportService,
)
from autoapplier.wiring import Container, build_container, close_container

from .supabase_helpers import TestUser

MakeUser = Callable[..., Awaitable[TestUser]]


@pytest.fixture
async def container(supabase_secret: str) -> AsyncIterator[Container]:
    built = await build_container(Settings(llm_provider="fake"))
    yield built
    await close_container(built)


@pytest.fixture
async def client(container: Container) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(create_app(container=container)), base_url="http://test"
    ) as api:
        yield api


def _claims(user: TestUser) -> AuthClaims:
    return AuthClaims(
        user_id=user.id,
        email=user.email,
        role="authenticated",
        session_id=None,
        raw={"sub": str(user.id), "role": "authenticated", "email": user.email},
    )


async def _seed(pool: asyncpg.Pool, user: TestUser, full_name: str) -> UUID:
    await pool.execute(
        "insert into public.candidate_profiles (user_id, full_name, contact_email) "
        "values ($1, $2, $3)",
        user.id,
        full_name,
        user.email,
    )
    resume_id = uuid4()
    await pool.execute(
        "insert into public.resumes (id, user_id, storage_path, file_name, mime_type, size_bytes) "
        "values ($1, $2, $3, $4, 'application/pdf', 10)",
        resume_id,
        user.id,
        f"{user.id}/{resume_id}.pdf",
        f"cv-{resume_id}.pdf",
    )
    return resume_id


async def test_export_contains_only_callers_rows(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    a, b = await make_user(), await make_user()
    a_name, b_name = f"Alice {uuid4().hex}", f"Bob {uuid4().hex}"
    a_resume = await _seed(pool, a, a_name)
    b_resume = await _seed(pool, b, b_name)

    exported = await AccountExportService(pool).export(_claims(a), now=datetime.now(UTC))

    assert exported.account.id == a.id
    assert exported.profile is not None
    assert exported.profile["full_name"] == a_name
    assert "user_id" not in exported.profile
    assert [r.id for r in exported.resumes] == [a_resume]
    assert exported.credit_balance == 20
    assert [(e.delta, e.reason) for e in exported.credit_ledger] == [(20, "signup_grant")]
    assert exported.searches == []
    assert exported.applications == []
    text = exported.model_dump_json()
    for foreign in (str(b.id), b.email, b_name, str(b_resume)):
        assert foreign not in text


async def test_export_covers_every_user_owned_table(pool: asyncpg.Pool) -> None:
    covered = set(EXPORT_SECTIONS.values()) | set(EXPORT_EXCLUDED)
    tables = await user_owned_tables(pool)
    assert tables, "expected user-owned tables"
    missing = [f"{s}.{t}" for s, t, _ in tables if t not in covered and f"{s}.{t}" not in covered]
    assert missing == []


async def test_export_api_with_b_token_has_no_a_rows(
    pool: asyncpg.Pool, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    a, b = await make_user(), await make_user()
    a_name = f"Alice {uuid4().hex}"
    a_resume = await _seed(pool, a, a_name)
    await _seed(pool, b, f"Bob {uuid4().hex}")

    response = await client.get(
        "/v1/account/export", headers={"Authorization": f"Bearer {b.access_token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["account"]["id"] == str(b.id)
    serialized = json.dumps(body)
    for foreign in (str(a.id), a.email, a_name, str(a_resume)):
        assert foreign not in serialized

    head, _, signature = b.access_token.rpartition(".")
    middle = len(signature) // 2
    flipped = "A" if signature[middle] != "A" else "B"
    tampered = f"{head}.{signature[:middle]}{flipped}{signature[middle + 1 :]}"
    bad = await client.get("/v1/account/export", headers={"Authorization": f"Bearer {tampered}"})
    assert bad.status_code == 401
    assert bad.json()["code"] == "auth.invalid_token"
