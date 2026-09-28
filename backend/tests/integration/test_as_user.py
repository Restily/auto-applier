"""Integration: `as_user` runs SQL as the `authenticated` role with the caller's claims (RLS)."""

from collections.abc import Awaitable, Callable
from uuid import UUID

import asyncpg
import pytest

from autoapplier.db.as_user import as_user
from autoapplier.ports.auth import AuthClaims

from .supabase_helpers import TestUser

MakeUser = Callable[..., Awaitable[TestUser]]


def _claims(user: TestUser) -> AuthClaims:
    return AuthClaims(
        user_id=user.id,
        email=user.email,
        role="authenticated",
        session_id=None,
        raw={"sub": str(user.id), "role": "authenticated", "email": user.email},
    )


async def _grant(pool: asyncpg.Pool, user_id: UUID, ref: str) -> None:
    await pool.execute(
        "insert into public.credit_ledger (user_id, delta, reason, ref_type, ref_id)"
        " values ($1, 5, 'operator_adjustment', 'test', $2)",
        user_id,
        ref,
    )


async def test_auth_uid_is_the_caller(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()

    async with as_user(pool, _claims(user)) as conn:
        uid = await conn.fetchval("select auth.uid()")

    assert uid == user.id


async def test_rls_limits_rows_to_caller(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    a, b = await make_user(), await make_user()
    await _grant(pool, a.id, f"a-{a.id}")
    await _grant(pool, b.id, f"b-{b.id}")

    async with as_user(pool, _claims(a)) as conn:
        owners = {r["user_id"] for r in await conn.fetch("select user_id from public.credit_ledger")}

    assert owners == {a.id}


async def test_role_reset_after_block(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()
    async with pool.acquire() as conn:  # single-connection view of the pool: same conn reused
        before = await conn.fetchval("select current_user")
    async with as_user(pool, _claims(user)) as inner:
        assert await inner.fetchval("select current_user") == "authenticated"
    async with pool.acquire() as conn:
        after = await conn.fetchval("select current_user")
        claims = await conn.fetchval("select current_setting('request.jwt.claims', true)")

    assert before == after == "postgres"
    assert claims in (None, "")


async def test_exception_rolls_back(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()

    with pytest.raises(RuntimeError):
        async with as_user(pool, _claims(user)) as conn:
            await conn.execute("update public.profiles set ui_locale = 'ru' where id = $1", user.id)
            raise RuntimeError("boom")

    assert await pool.fetchval("select ui_locale from public.profiles where id = $1", user.id) == "en"


async def test_cross_user_rows_invisible_and_unwritable(
    pool: asyncpg.Pool, make_user: MakeUser
) -> None:
    a, b = await make_user(), await make_user()
    await _grant(pool, a.id, f"x-{a.id}")

    async with as_user(pool, _claims(b)) as conn:
        for table, col in (
            ("public.profiles", "id"),
            ("public.candidate_profiles", "user_id"),
            ("public.credit_ledger", "user_id"),
        ):
            rows = await conn.fetch(f"select 1 from {table} where {col} = $1", a.id)  # noqa: S608
            assert rows == []
        status = await conn.execute("update public.profiles set ui_locale = 'ru' where id = $1", a.id)

    assert status == "UPDATE 0"
    assert await pool.fetchval("select ui_locale from public.profiles where id = $1", a.id) == "en"


async def test_claims_visible_to_sql(pool: asyncpg.Pool, make_user: MakeUser) -> None:
    user = await make_user()

    async with as_user(pool, _claims(user)) as conn:
        role = await conn.fetchval("select current_user")
        sub = await conn.fetchval("select current_setting('request.jwt.claims')::jsonb ->> 'sub'")

    assert role == "authenticated"
    assert sub == str(user.id)
