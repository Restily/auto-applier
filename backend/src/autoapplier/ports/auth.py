"""Auth ports: verifying a caller's access token and administering Auth users (ADR-0004)."""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AuthClaims:
    """The verified identity of a caller. `raw` is the full claim set (always has sub, role)."""

    user_id: UUID
    email: str | None
    role: str
    session_id: str | None
    raw: Mapping[str, Any]


class InvalidTokenError(Exception):
    """The token is not acceptable. `str(e)` is a short reason and never contains the token."""


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> AuthClaims: ...


class AuthAdminError(Exception):
    """An Auth admin operation failed."""


class AuthAdmin(Protocol):
    async def delete_user(self, user_id: UUID) -> None:
        """Delete a user; idempotent: an already-missing user is success."""
        ...
