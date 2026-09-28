"""GoTrue admin API adapter (secret key; server-side only)."""

from uuid import UUID

import httpx
from pydantic import SecretStr

from autoapplier.ports.auth import AuthAdminError


class GoTrueAdmin:
    """Implements `AuthAdmin` over `/auth/v1/admin/users`."""

    def __init__(self, *, base_url: str, secret_key: SecretStr, http: httpx.AsyncClient) -> None:
        self._base_url = base_url.rstrip("/")
        self._secret_key = secret_key
        self._http = http

    async def delete_user(self, user_id: UUID) -> None:
        secret = self._secret_key.get_secret_value()
        try:
            response = await self._http.delete(
                f"{self._base_url}/auth/v1/admin/users/{user_id}",
                headers={"apikey": secret, "Authorization": f"Bearer {secret}"},
            )
        except httpx.HTTPError as exc:
            raise AuthAdminError(f"auth admin unreachable: {type(exc).__name__}") from exc
        if response.status_code == 404 or response.is_success:
            return
        raise AuthAdminError(f"delete user failed: HTTP {response.status_code}")
