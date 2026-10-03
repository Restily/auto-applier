"""Integration: `JwtVerifier` against the real local GoTrue (ES256 via its JWKS)."""

import httpx
import pytest

from autoapplier.adapters.auth.jwt_verifier import JwtVerifier
from autoapplier.ports.auth import InvalidTokenError

from .supabase_helpers import TestUser


def _verifier(http: httpx.AsyncClient, supabase_url: str) -> JwtVerifier:
    issuer = f"{supabase_url}/auth/v1"
    return JwtVerifier(issuer=issuer, jwks_url=f"{issuer}/.well-known/jwks.json", http=http)


async def test_token_from_local_gotrue_verifies(
    http: httpx.AsyncClient, supabase_url: str, make_user: object
) -> None:
    user: TestUser = await make_user()  # type: ignore[operator]

    claims = await _verifier(http, supabase_url).verify(user.access_token)

    assert claims.user_id == user.id
    assert claims.email == user.email
    assert claims.role == "authenticated"


async def test_tampered_token_rejected(
    http: httpx.AsyncClient, supabase_url: str, make_user: object
) -> None:
    user: TestUser = await make_user()  # type: ignore[operator]
    head, body, sig = user.access_token.split(".")
    tampered = f"{head}.{body}.{sig[:-4]}AAAA"

    with pytest.raises(InvalidTokenError):
        await _verifier(http, supabase_url).verify(tampered)
