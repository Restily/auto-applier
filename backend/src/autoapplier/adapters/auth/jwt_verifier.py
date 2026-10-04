"""Access-token verification (ADR-0004): asymmetric keys via JWKS, optional HS256 fallback."""

import time
from collections.abc import Callable
from typing import Any
from uuid import UUID

import httpx
import jwt
from jwt import PyJWK
from pydantic import SecretStr

from autoapplier.ports.auth import AuthClaims, InvalidTokenError

_ASYMMETRIC = ("ES256", "RS256")


class JwtVerifier:
    """Implements `TokenVerifier`.

    ES256/RS256 tokens are checked against the JWKS key with the token's `kid` (a refetch on an
    unknown `kid`, at most once per `min_refetch_interval_s`). HS256 is accepted only when
    `hs256_secret` is set and the header says HS256; the allowed algorithm list is derived from
    the header against that policy, never from the key material, so a MAC keyed with a public
    key cannot verify.
    """

    def __init__(
        self,
        *,
        issuer: str,
        jwks_url: str,
        http: httpx.AsyncClient,
        hs256_secret: SecretStr | None = None,
        cache_ttl_s: float = 600,
        leeway_s: float = 10,
        min_refetch_interval_s: float = 30,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._issuer = issuer
        self._jwks_url = jwks_url
        self._http = http
        self._hs256_secret = hs256_secret
        self._cache_ttl_s = cache_ttl_s
        self._leeway_s = leeway_s
        self._min_refetch_interval_s = min_refetch_interval_s
        self._clock = clock
        self._keys: dict[str, PyJWK] = {}
        self._fetched_at: float | None = None
        self._last_attempt_at: float | None = None

    async def verify(self, token: str) -> AuthClaims:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise InvalidTokenError("malformed token") from exc
        alg = header.get("alg")
        if alg == "HS256":
            if self._hs256_secret is None:
                raise InvalidTokenError("unsupported algorithm")
            key: Any = self._hs256_secret.get_secret_value()
            algorithms = ["HS256"]
        elif alg in _ASYMMETRIC:
            kid = header.get("kid")
            if not isinstance(kid, str):
                raise InvalidTokenError("missing key id")
            key = (await self._key_for(kid)).key
            algorithms = [alg]
        else:
            raise InvalidTokenError("unsupported algorithm")
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=algorithms,
                audience="authenticated",
                issuer=self._issuer,
                leeway=self._leeway_s,
                options={"require": ["exp", "sub", "aud", "iss"]},
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(f"invalid token: {type(exc).__name__}") from exc
        if payload.get("role") != "authenticated":
            raise InvalidTokenError("invalid role")
        try:
            user_id = UUID(str(payload["sub"]))
        except ValueError as exc:
            raise InvalidTokenError("invalid subject") from exc
        email = payload.get("email")
        session_id = payload.get("session_id")
        return AuthClaims(
            user_id=user_id,
            email=email if isinstance(email, str) else None,
            role="authenticated",
            session_id=session_id if isinstance(session_id, str) else None,
            raw=payload,
        )

    async def _key_for(self, kid: str) -> PyJWK:
        now = self._clock()
        if self._fetched_at is None or now - self._fetched_at >= self._cache_ttl_s:
            await self._refresh()
        elif kid not in self._keys and (
            self._last_attempt_at is None
            or now - self._last_attempt_at >= self._min_refetch_interval_s
        ):
            # Unknown kid with a warm cache: a rotation, or a forged header. Refetch at most
            # once per interval so unauthenticated requests cannot make us hammer the JWKS URL.
            await self._refresh()
        key = self._keys.get(kid)
        if key is None:
            raise InvalidTokenError("unknown key id")
        return key

    async def _refresh(self) -> None:
        self._last_attempt_at = self._clock()
        try:
            response = await self._http.get(self._jwks_url)
            response.raise_for_status()
            document = response.json()
            keys = {
                str(entry["kid"]): PyJWK.from_dict(entry)
                for entry in document["keys"]
                if "kid" in entry
            }
        except (httpx.HTTPError, ValueError, KeyError, TypeError, jwt.PyJWTError) as exc:
            raise InvalidTokenError("signing keys unavailable") from exc
        self._keys = keys
        self._fetched_at = self._clock()
