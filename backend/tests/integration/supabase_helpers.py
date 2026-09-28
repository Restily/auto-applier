"""Helpers for integration tests against the real local GoTrue and Mailpit.

All calls are async and use `httpx`. Admin calls send the `sb_secret_...` key as both
`apikey` and `Authorization: Bearer` (see docs/solutions/gotrue-secret-key-and-local-auth-testing.md).
"""

import asyncio
import time
from dataclasses import dataclass
from uuid import UUID, uuid4

import asyncpg
import httpx


@dataclass(frozen=True)
class TestUser:
    __test__ = False  # not a pytest class

    id: UUID
    email: str
    password: str
    access_token: str


def _admin_headers(secret: str) -> dict[str, str]:
    return {"apikey": secret, "Authorization": f"Bearer {secret}"}


def unique_email() -> str:
    return f"be+{uuid4().hex}@example.test"


async def admin_create_user(
    http: httpx.AsyncClient,
    base_url: str,
    secret: str,
    *,
    locale: str = "en",
    email: str | None = None,
) -> TestUser:
    """Create a confirmed user with a unique email and return it with a fresh access token."""
    email = email or unique_email()
    password = f"pw-{uuid4().hex}"
    response = await http.post(
        f"{base_url}/auth/v1/admin/users",
        headers=_admin_headers(secret),
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"locale": locale},
        },
    )
    response.raise_for_status()
    user_id = UUID(response.json()["id"])
    signed_in = await password_sign_in(http, base_url, secret, email, password)
    signed_in.raise_for_status()
    return TestUser(user_id, email, password, signed_in.json()["access_token"])


async def password_sign_in(
    http: httpx.AsyncClient, base_url: str, secret: str, email: str, password: str
) -> httpx.Response:
    return await http.post(
        f"{base_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers=_admin_headers(secret),
        json={"email": email, "password": password},
    )


async def admin_delete_user(
    http: httpx.AsyncClient, base_url: str, secret: str, user_id: UUID
) -> None:
    response = await http.delete(
        f"{base_url}/auth/v1/admin/users/{user_id}", headers=_admin_headers(secret)
    )
    if response.status_code != 404:
        response.raise_for_status()


async def wait_for_email(
    http: httpx.AsyncClient, mailpit_url: str, to: str, *, timeout_s: float = 10
) -> dict[str, object]:
    """Poll Mailpit until a message to `to` exists; return its full message JSON."""
    deadline = time.monotonic() + timeout_s
    while True:
        found = await http.get(f"{mailpit_url}/api/v1/search", params={"query": f'to:"{to}"'})
        found.raise_for_status()
        messages = found.json().get("messages") or []
        if messages:
            message = await http.get(f"{mailpit_url}/api/v1/message/{messages[0]['ID']}")
            message.raise_for_status()
            body: dict[str, object] = message.json()
            return body
        if time.monotonic() > deadline:
            raise TimeoutError(f"no email to {to} within {timeout_s}s")
        await asyncio.sleep(0.25)


async def recovery_token_hash(pool: asyncpg.Pool, user_id: UUID) -> str | None:
    value = await pool.fetchval(
        "select token_hash from auth.one_time_tokens "
        "where user_id = $1 and token_type = 'recovery_token' order by created_at desc limit 1",
        user_id,
    )
    return str(value) if value is not None else None


async def verify_recovery(
    http: httpx.AsyncClient, base_url: str, secret: str, token_hash: str
) -> httpx.Response:
    return await http.post(
        f"{base_url}/auth/v1/verify",
        headers=_admin_headers(secret),
        json={"type": "recovery", "token_hash": token_hash},
    )
