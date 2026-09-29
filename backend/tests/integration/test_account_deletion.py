"""Account deletion against real GoTrue, Postgres and Storage (S-006 AC2, D5, S-001 AC7)."""

from collections.abc import AsyncIterator, Awaitable, Callable
from uuid import UUID, uuid4

import asyncpg
import httpx
import pytest

from autoapplier.api.app import create_app
from autoapplier.config import Settings
from autoapplier.db.account import count_user_rows, user_owned_tables
from autoapplier.services.account_deletion import AccountDeletionService, ResumeFilesPurge
from autoapplier.services.resumes import RESUME_BUCKET
from autoapplier.wiring import Container, build_container, close_container

from .supabase_helpers import TestUser, admin_delete_user, password_sign_in

MakeUser = Callable[..., Awaitable[TestUser]]
PASSWORD = "correct-horse-battery"  # noqa: S105 - fake test secret

FINGERPRINT_SQL = (
    "select exists (select 1 from private.deleted_account_fingerprints "
    "where email_hmac = internal.email_fingerprint($1))"
)


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


def _auth(user: TestUser) -> dict[str, str]:
    return {"Authorization": f"Bearer {user.access_token}"}


async def _seed(container: Container, user: TestUser) -> str:
    """A profile, a resume row and its Storage object for `user`; returns the object path."""
    await container.pool.execute(
        "insert into public.candidate_profiles (user_id, full_name) values ($1, 'Someone')", user.id
    )
    resume_id = uuid4()
    path = f"{user.id}/{resume_id}.pdf"
    await container.storage.put(
        bucket=RESUME_BUCKET, path=path, data=b"%PDF-1.4 test", content_type="application/pdf"
    )
    await container.pool.execute(
        "insert into public.resumes (id, user_id, storage_path, file_name, mime_type, size_bytes) "
        "values ($1, $2, $3, 'cv.pdf', 'application/pdf', 10)",
        resume_id,
        user.id,
        path,
    )
    return path


async def _delete(client: httpx.AsyncClient, user: TestUser, email: str) -> httpx.Response:
    return await client.post(
        "/v1/account/deletion", json={"confirm_email": email}, headers=_auth(user)
    )


async def test_deletion_removes_everything(
    container: Container,
    client: httpx.AsyncClient,
    make_user: MakeUser,
    supabase_url: str,
    supabase_secret: str,
    http: httpx.AsyncClient,
) -> None:
    user = await make_user()
    await _seed(container, user)
    assert sum((await count_user_rows(container.pool, user.id)).values()) > 0

    assert (await _delete(client, user, user.email)).status_code == 204

    signed_in = await password_sign_in(
        http, supabase_url, supabase_secret, user.email, user.password
    )
    assert signed_in.status_code >= 400
    assert set((await count_user_rows(container.pool, user.id)).values()) == {0}
    assert await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id)) == []


async def test_every_user_owned_table_cascades(pool: asyncpg.Pool) -> None:
    tables = await user_owned_tables(pool)
    assert tables
    assert [(s, t, a) for s, t, a in tables if a != "c"] == []


async def test_mismatch_keeps_account(
    container: Container,
    client: httpx.AsyncClient,
    make_user: MakeUser,
    supabase_url: str,
    supabase_secret: str,
    http: httpx.AsyncClient,
) -> None:
    user = await make_user()
    path = await _seed(container, user)

    response = await _delete(client, user, "someone-else@example.test")
    assert response.status_code == 422
    assert response.json()["code"] == "account.confirmation_mismatch"

    signed_in = await password_sign_in(
        http, supabase_url, supabase_secret, user.email, user.password
    )
    assert signed_in.status_code == 200
    assert await container.storage.list_paths(bucket=RESUME_BUCKET, prefix=str(user.id)) == [path]
    assert await container.pool.fetchval(FINGERPRINT_SQL, user.email) is False


async def test_deletion_keeps_only_email_fingerprint(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    await _seed(container, user)

    assert (await _delete(client, user, user.email)).status_code == 204

    pool = container.pool
    assert await pool.fetchval(FINGERPRINT_SQL, user.email) is True
    assert await pool.fetchval("select count(*) from auth.users where email = $1", user.email) == 0
    assert (
        await pool.fetchval(
            "select count(*) from auth.identities where identity_data ->> 'email' = $1", user.email
        )
        == 0
    )
    assert set((await count_user_rows(pool, user.id)).values()) == {0}
    columns = await pool.fetch(
        "select column_name from information_schema.columns "
        "where table_schema = 'private' and table_name = 'deleted_account_fingerprints'"
    )
    assert [c["column_name"] for c in columns] == ["email_hmac"]


class _ExplodingStep:
    name = "explode"

    async def purge(self, user_id: UUID) -> None:
        raise RuntimeError("purge failed")


async def test_failed_deletion_leaves_no_fingerprint(
    container: Container, client: httpx.AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()
    container.account_deletion = AccountDeletionService(
        container.auth_admin, [_ExplodingStep(), ResumeFilesPurge(container.storage)]
    )

    response = await _delete(client, user, user.email)

    assert response.status_code == 502
    assert response.json()["code"] == "account.delete_failed"
    assert await container.pool.fetchval(FINGERPRINT_SQL, user.email) is False
    assert (
        await container.pool.fetchval("select count(*) from auth.users where id = $1", user.id) == 1
    )


async def test_signup_after_deletion_gets_account_without_bonus(
    container: Container,
    client: httpx.AsyncClient,
    make_user: MakeUser,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    supabase_publishable_key: str,
) -> None:
    user = await make_user()
    assert (await _delete(client, user, user.email)).status_code == 204

    response = await http.post(
        f"{supabase_url}/auth/v1/signup",
        headers={"apikey": supabase_publishable_key},
        json={"email": user.email.upper(), "password": PASSWORD},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    new_id = UUID((body.get("user") or body)["id"])
    try:
        assert new_id != user.id
        pool = container.pool
        assert (
            await pool.fetchval("select count(*) from public.profiles where id = $1", new_id) == 1
        )
        assert (
            await pool.fetchval(
                "select count(*) from public.credit_ledger where user_id = $1", new_id
            )
            == 0
        )
        token = body.get("access_token")
        if token is None:
            token = (
                await password_sign_in(
                    http, supabase_url, supabase_secret, user.email.upper(), PASSWORD
                )
            ).json()["access_token"]
        exported = await client.get(
            "/v1/account/export", headers={"Authorization": f"Bearer {token}"}
        )
        assert exported.status_code == 200
        assert exported.json()["credit_balance"] == 0
        assert exported.json()["credit_ledger"] == []
    finally:
        await admin_delete_user(http, supabase_url, supabase_secret, new_id)
