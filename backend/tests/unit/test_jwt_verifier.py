"""Unit tests for `JwtVerifier` (ADR-0004): ES256 via a respx-served JWKS, HS256 fallback."""

import json
import time
from typing import Any

import httpx
import jwt
import pytest
import respx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm
from pydantic import SecretStr

from autoapplier.adapters.auth.jwt_verifier import JwtVerifier
from autoapplier.ports.auth import InvalidTokenError

ISSUER = "http://supabase.test/auth/v1"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"
USER_ID = "3f2b8f0e-6a55-4c33-9d0e-1f2a3b4c5d6e"
KID = "kid-1"


def _new_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(ec.SECP256R1())


def _jwks(key: ec.EllipticCurvePrivateKey, kid: str = KID) -> dict[str, Any]:
    jwk = json.loads(ECAlgorithm.to_jwk(key.public_key()))
    jwk.update({"kid": kid, "alg": "ES256", "use": "sig"})
    return {"keys": [jwk]}


def _claims(**over: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "sub": USER_ID,
        "aud": "authenticated",
        "iss": ISSUER,
        "role": "authenticated",
        "email": "a@example.test",
        "session_id": "sess-1",
        "exp": int(time.time()) + 600,
    }
    base.update(over)
    return {k: v for k, v in base.items() if v is not None}


def _sign(key: ec.EllipticCurvePrivateKey, claims: dict[str, Any], kid: str = KID) -> str:
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": kid})


@pytest.fixture
def key() -> ec.EllipticCurvePrivateKey:
    return _new_key()


@pytest.fixture
async def http() -> Any:
    async with httpx.AsyncClient() as client:
        yield client


class _Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _verifier(http: httpx.AsyncClient, **kw: Any) -> JwtVerifier:
    return JwtVerifier(issuer=ISSUER, jwks_url=JWKS_URL, http=http, **kw)


@respx.mock
async def test_valid_es256_token_returns_claims(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))

    claims = await _verifier(http).verify(_sign(key, _claims()))

    assert str(claims.user_id) == USER_ID
    assert claims.email == "a@example.test"
    assert claims.role == "authenticated"
    assert claims.session_id == "sess-1"
    assert claims.raw["sub"] == USER_ID


@respx.mock
async def test_expired_token_rejected(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))
    token = _sign(key, _claims(exp=int(time.time()) - 3600))

    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(token)


@respx.mock
async def test_wrong_audience_rejected(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))

    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(_sign(key, _claims(aud="other")))


@respx.mock
async def test_wrong_issuer_rejected(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))

    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(_sign(key, _claims(iss="http://evil.test/auth/v1")))


@respx.mock
async def test_wrong_role_and_missing_sub_rejected(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))
    verifier = _verifier(http)

    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(role="anon")))
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(sub=None)))
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(sub="not-a-uuid")))


@respx.mock
async def test_alg_none_rejected(http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))
    token = jwt.encode(_claims(), None, algorithm="none", headers={"kid": KID})  # type: ignore[arg-type]

    with pytest.raises(InvalidTokenError):
        await _verifier(http, hs256_secret=SecretStr("x" * 32)).verify(token)


@respx.mock
async def test_hs256_rejected_without_secret(http: httpx.AsyncClient) -> None:
    secret = "a-shared-secret-of-at-least-32-bytes!"  # noqa: S105
    token = jwt.encode(_claims(), secret, algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(token)


@respx.mock
async def test_hs256_accepted_with_secret(http: httpx.AsyncClient) -> None:
    secret = "a-shared-secret-of-at-least-32-bytes!"  # noqa: S105
    token = jwt.encode(_claims(), secret, algorithm="HS256")

    claims = await _verifier(http, hs256_secret=SecretStr(secret)).verify(token)

    assert str(claims.user_id) == USER_ID


@respx.mock
async def test_hs256_signed_with_public_key_bytes_rejected(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    """Algorithm confusion: HS256 MAC keyed with the public key material must not verify."""
    respx.get(JWKS_URL).respond(json=_jwks(key))
    public_pem = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    mac = _hs256_manual(public_pem)
    verifier = _verifier(http, hs256_secret=SecretStr("a-different-secret-of-32-bytes-len!"))

    with pytest.raises(InvalidTokenError):
        await verifier.verify(mac)
    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(mac)


def _hs256_manual(secret: bytes) -> str:
    import base64
    import hashlib
    import hmac

    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    head = b64(json.dumps({"alg": "HS256", "typ": "JWT", "kid": KID}).encode())
    body = b64(json.dumps(_claims()).encode())
    sig = hmac.new(secret, f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{b64(sig)}"


@respx.mock
async def test_unknown_kid_refetches_once_then_rejects(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    route = respx.get(JWKS_URL).respond(json=_jwks(key))
    clock = _Clock()
    verifier = _verifier(http, clock=clock)
    await verifier.verify(_sign(key, _claims()))
    assert route.call_count == 1

    clock.now += 31  # past the refetch rate limit
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(), kid="rotated-away"))

    assert route.call_count == 2


@respx.mock
async def test_rotated_key_found_after_refetch(http: httpx.AsyncClient) -> None:
    old, new = _new_key(), _new_key()
    route = respx.get(JWKS_URL).mock(
        side_effect=[
            httpx.Response(200, json=_jwks(old)),
            httpx.Response(200, json=_jwks(new, kid="kid-2")),
        ]
    )
    clock = _Clock()
    verifier = _verifier(http, clock=clock)
    await verifier.verify(_sign(old, _claims()))

    clock.now += 31  # past the refetch rate limit
    claims = await verifier.verify(_sign(new, _claims(), kid="kid-2"))

    assert str(claims.user_id) == USER_ID
    assert route.call_count == 2


@respx.mock
async def test_jwks_cached_between_verifications(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    route = respx.get(JWKS_URL).respond(json=_jwks(key))
    verifier = _verifier(http)

    await verifier.verify(_sign(key, _claims()))
    await verifier.verify(_sign(key, _claims()))

    assert route.call_count == 1


@respx.mock
async def test_jwks_unreachable_is_invalid_token(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).mock(side_effect=httpx.ConnectError("boom"))

    with pytest.raises(InvalidTokenError):
        await _verifier(http).verify(_sign(key, _claims()))


@respx.mock
async def test_garbage_token_rejected_without_echo(http: httpx.AsyncClient) -> None:
    with pytest.raises(InvalidTokenError) as info:
        await _verifier(http).verify("not.a.jwt-SECRETMARK")

    assert "SECRETMARK" not in str(info.value)


@respx.mock
async def test_unknown_kid_refetch_is_rate_limited_to_one_per_30_seconds(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    route = respx.get(JWKS_URL).respond(json=_jwks(key))
    clock = _Clock()
    verifier = _verifier(http, clock=clock)
    await verifier.verify(_sign(key, _claims()))
    assert route.call_count == 1

    # A flood of tokens with an unknown kid inside the window never reaches the JWKS endpoint.
    for _ in range(20):
        clock.now += 1
        with pytest.raises(InvalidTokenError, match="unknown key id"):
            await verifier.verify(_sign(key, _claims(), kid="attacker"))
    assert route.call_count == 1

    # Once the window has passed, exactly one refetch is allowed, then the limit applies again.
    clock.now += 30
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(), kid="attacker"))
    assert route.call_count == 2
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(), kid="attacker"))
    assert route.call_count == 2


@respx.mock
async def test_known_kid_still_verifies_inside_the_rate_limit_window(
    http: httpx.AsyncClient, key: ec.EllipticCurvePrivateKey
) -> None:
    respx.get(JWKS_URL).respond(json=_jwks(key))
    clock = _Clock()
    verifier = _verifier(http, clock=clock)
    await verifier.verify(_sign(key, _claims()))
    with pytest.raises(InvalidTokenError):
        await verifier.verify(_sign(key, _claims(), kid="attacker"))

    claims = await verifier.verify(_sign(key, _claims()))

    assert str(claims.user_id) == USER_ID
