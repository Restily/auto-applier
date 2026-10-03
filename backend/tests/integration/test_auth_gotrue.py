"""Auth behaviour against the real local GoTrue, Postgres triggers and Mailpit (M1 Task 1)."""

from collections.abc import AsyncIterator, Awaitable, Callable
from uuid import UUID, uuid4

import asyncpg
import httpx
import pytest

from .supabase_helpers import (
    TestUser,
    admin_create_user,
    admin_delete_user,
    password_sign_in,
    recovery_token_hash,
    unique_email,
    verify_recovery,
    wait_for_email,
)

MakeUser = Callable[..., Awaitable[TestUser]]
PASSWORD = "correct-horse-battery"  # noqa: S105 - fake test secret


@pytest.fixture
async def signup(
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    supabase_publishable_key: str,
) -> AsyncIterator[Callable[..., Awaitable[httpx.Response]]]:
    """Public email sign-up (as the browser does it); every created user is deleted on teardown."""
    created: list[UUID] = []

    async def do_signup(
        email: str, *, password: str = PASSWORD, locale: str | None = None
    ) -> httpx.Response:
        body: dict[str, object] = {"email": email, "password": password}
        if locale:
            body["data"] = {"locale": locale}
        response = await http.post(
            f"{supabase_url}/auth/v1/signup",
            headers={"apikey": supabase_publishable_key},
            json=body,
        )
        if response.status_code == 200:
            user = response.json().get("user") or response.json()
            created.append(UUID(user["id"]))
        return response

    yield do_signup
    for user_id in created:
        await admin_delete_user(http, supabase_url, supabase_secret, user_id)


def _uid(response: httpx.Response) -> UUID:
    body = response.json()
    return UUID((body.get("user") or body)["id"])


async def _grants(pool: asyncpg.Pool, user_id: UUID) -> list[asyncpg.Record]:
    rows: list[asyncpg.Record] = await pool.fetch(
        "select delta, reason from public.credit_ledger where user_id = $1", user_id
    )
    return rows


async def test_email_signup_creates_profile_and_single_grant(
    pool: asyncpg.Pool, signup: Callable[..., Awaitable[httpx.Response]]
) -> None:
    response = await signup(unique_email(), locale="ru")
    assert response.status_code == 200, response.text
    user_id = _uid(response)
    locale = await pool.fetchval("select ui_locale from public.profiles where id = $1", user_id)
    assert locale == "ru"
    rows = await _grants(pool, user_id)
    assert [(r["delta"], r["reason"]) for r in rows] == [(20, "signup_grant")]


async def test_repeated_sign_in_never_grants_again(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    for _ in range(2):
        response = await password_sign_in(
            http, supabase_url, supabase_secret, user.email, user.password
        )
        assert response.status_code == 200
    assert len(await _grants(pool, user.id)) == 1


async def test_password_shorter_than_8_is_rejected(
    pool: asyncpg.Pool, signup: Callable[..., Awaitable[httpx.Response]]
) -> None:
    email = unique_email()
    response = await signup(email, password="1234567")  # noqa: S106 - fake, too short on purpose
    assert response.status_code == 422
    assert response.json()["error_code"] == "weak_password"
    assert await pool.fetchval("select count(*) from auth.users where email = $1", email) == 0


async def test_duplicate_signup_creates_no_second_user(
    pool: asyncpg.Pool, signup: Callable[..., Awaitable[httpx.Response]]
) -> None:
    email = unique_email()
    assert (await signup(email)).status_code == 200
    second = await signup(email)
    assert second.status_code >= 400
    assert second.json()["error_code"] == "user_already_exists"
    assert await pool.fetchval("select count(*) from auth.users where email = $1", email) == 1


async def test_resignup_after_deletion_gets_no_bonus(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    signup: Callable[..., Awaitable[httpx.Response]],
) -> None:
    email = unique_email()
    first = await signup(email)
    first_id = _uid(first)
    assert len(await _grants(pool, first_id)) == 1
    await admin_delete_user(http, supabase_url, supabase_secret, first_id)

    again = await signup(email.upper())
    assert again.status_code == 200, again.text
    new_id = _uid(again)
    assert new_id != first_id
    assert await pool.fetchval("select count(*) from public.profiles where id = $1", new_id) == 1
    assert await _grants(pool, new_id) == []
    known = await pool.fetchval(
        "select exists (select 1 from private.deleted_account_fingerprints "
        "where email_hmac = internal.email_fingerprint($1))",
        email,
    )
    assert known is True


async def test_signup_after_unrelated_deletion_still_gets_bonus(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    signup: Callable[..., Awaitable[httpx.Response]],
) -> None:
    gone = await admin_create_user(http, supabase_url, supabase_secret)
    await admin_delete_user(http, supabase_url, supabase_secret, gone.id)
    response = await signup(unique_email())
    assert response.status_code == 200, response.text
    rows = await _grants(pool, _uid(response))
    assert [(r["delta"], r["reason"]) for r in rows] == [(20, "signup_grant")]


async def _request_recovery(
    http: httpx.AsyncClient, supabase_url: str, publishable: str, email: str
) -> None:
    response = await http.post(
        f"{supabase_url}/auth/v1/recover", headers={"apikey": publishable}, json={"email": email}
    )
    assert response.status_code == 200, response.text


async def test_recovery_email_english_by_default(
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_publishable_key: str,
    mailpit_url: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    await _request_recovery(http, supabase_url, supabase_publishable_key, user.email)
    html = str((await wait_for_email(http, mailpit_url, user.email))["HTML"])
    assert "/auth/confirm?token_hash=" in html
    assert "type=recovery" in html
    assert "Reset your password" in html


async def test_recovery_email_russian_after_locale_switch(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_publishable_key: str,
    mailpit_url: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    await pool.execute("update public.profiles set ui_locale = 'ru' where id = $1", user.id)
    await _request_recovery(http, supabase_url, supabase_publishable_key, user.email)
    html = str((await wait_for_email(http, mailpit_url, user.email))["HTML"])
    assert "Восстановление пароля" in html
    assert "Reset your password" not in html


async def _recover_and_hash(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    publishable: str,
    user: TestUser,
) -> str:
    await _request_recovery(http, supabase_url, publishable, user.email)
    token_hash = await recovery_token_hash(pool, user.id)
    assert token_hash is not None, "recovery token row must exist after /recover"
    return token_hash


async def test_recovery_token_fresh_verifies(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    supabase_publishable_key: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    token_hash = await _recover_and_hash(pool, http, supabase_url, supabase_publishable_key, user)
    response = await verify_recovery(http, supabase_url, supabase_secret, token_hash)
    assert response.status_code == 200, response.text
    assert response.json()["access_token"]


async def test_recovery_token_expired_is_rejected(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    supabase_publishable_key: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    token_hash = await _recover_and_hash(pool, http, supabase_url, supabase_publishable_key, user)
    await pool.execute(
        "update auth.users set recovery_sent_at = now() - interval '2 hours' where id = $1", user.id
    )
    # Precondition: the token was never consumed, so the rejection below is about expiry.
    assert await recovery_token_hash(pool, user.id) == token_hash
    response = await verify_recovery(http, supabase_url, supabase_secret, token_hash)
    assert response.status_code == 403
    assert response.json()["error_code"] == "otp_expired"
    still = await password_sign_in(http, supabase_url, supabase_secret, user.email, user.password)
    assert still.status_code == 200


async def test_recovery_token_reused_is_rejected(
    pool: asyncpg.Pool,
    http: httpx.AsyncClient,
    supabase_url: str,
    supabase_secret: str,
    supabase_publishable_key: str,
    make_user: MakeUser,
) -> None:
    user = await make_user()
    token_hash = await _recover_and_hash(pool, http, supabase_url, supabase_publishable_key, user)
    first = await verify_recovery(http, supabase_url, supabase_secret, token_hash)
    assert first.status_code == 200
    assert await recovery_token_hash(pool, user.id) is None
    second = await verify_recovery(http, supabase_url, supabase_secret, token_hash)
    assert second.status_code == 403
    assert second.json()["error_code"] == "otp_expired"


async def test_recovery_token_unknown_is_rejected(
    http: httpx.AsyncClient, supabase_url: str, supabase_secret: str
) -> None:
    unknown = uuid4().hex + uuid4().hex[:24]
    response = await verify_recovery(http, supabase_url, supabase_secret, unknown)
    assert response.status_code == 403
    assert response.json()["error_code"] == "otp_expired"
