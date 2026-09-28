"""Integration: `GoTrueAdmin.delete_user` against the real local GoTrue."""

import httpx
import pytest
from pydantic import SecretStr

from autoapplier.adapters.auth.gotrue_admin import GoTrueAdmin

from .supabase_helpers import TestUser, admin_create_user, password_sign_in


@pytest.fixture
def admin(http: httpx.AsyncClient, supabase_url: str, supabase_secret: str) -> GoTrueAdmin:
    return GoTrueAdmin(base_url=supabase_url, secret_key=SecretStr(supabase_secret), http=http)


async def test_delete_user_blocks_password_sign_in(
    admin: GoTrueAdmin, http: httpx.AsyncClient, supabase_url: str, supabase_secret: str
) -> None:
    user: TestUser = await admin_create_user(http, supabase_url, supabase_secret)

    await admin.delete_user(user.id)

    response = await password_sign_in(
        http, supabase_url, supabase_secret, user.email, user.password
    )
    assert response.status_code == 400


async def test_delete_twice_is_ok(
    admin: GoTrueAdmin, http: httpx.AsyncClient, supabase_url: str, supabase_secret: str
) -> None:
    user = await admin_create_user(http, supabase_url, supabase_secret)

    await admin.delete_user(user.id)
    await admin.delete_user(user.id)
