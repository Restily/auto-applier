"""In-memory auth fakes for tests."""

from collections.abc import Mapping
from uuid import UUID

from autoapplier.ports.auth import AuthAdminError, AuthClaims, InvalidTokenError


class FakeTokenVerifier:
    """Maps opaque token strings to fixed claims."""

    def __init__(self, tokens: Mapping[str, AuthClaims] | None = None) -> None:
        self.tokens: dict[str, AuthClaims] = dict(tokens or {})

    async def verify(self, token: str) -> AuthClaims:
        claims = self.tokens.get(token)
        if claims is None:
            raise InvalidTokenError("unknown token")
        return claims


class FakeAuthAdmin:
    """Records deletions; `fail_next()` makes the next `delete_user` raise once."""

    def __init__(self) -> None:
        self.deleted: list[UUID] = []
        self._fail_next = False

    def fail_next(self) -> None:
        self._fail_next = True

    async def delete_user(self, user_id: UUID) -> None:
        if self._fail_next:
            self._fail_next = False
            raise AuthAdminError("injected failure")
        self.deleted.append(user_id)
