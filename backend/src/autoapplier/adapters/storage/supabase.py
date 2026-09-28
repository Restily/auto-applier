"""Supabase Storage adapter (`/storage/v1/object/...`, secret key; server-side only)."""

from collections.abc import Sequence
from typing import Any
from urllib.parse import quote

import httpx
from pydantic import SecretStr

from autoapplier.ports.storage import StorageError, StorageNotFoundError

_LIST_PAGE = 100


class SupabaseStorage:
    """Implements `FileStorage`."""

    def __init__(self, *, base_url: str, secret_key: SecretStr, http: httpx.AsyncClient) -> None:
        self._base = f"{base_url.rstrip('/')}/storage/v1"
        self._secret_key = secret_key
        self._http = http

    def _headers(self) -> dict[str, str]:
        secret = self._secret_key.get_secret_value()
        return {"apikey": secret, "Authorization": f"Bearer {secret}"}

    def _object_url(self, bucket: str, path: str) -> str:
        return f"{self._base}/object/{quote(bucket, safe='')}/{quote(path, safe='/')}"

    async def _send(
        self,
        method: str,
        url: str,
        *,
        content: bytes | None = None,
        json: Any = None,
        extra_headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        headers = {**self._headers(), **(extra_headers or {})}
        try:
            return await self._http.request(
                method, url, headers=headers, content=content, json=json
            )
        except httpx.HTTPError as exc:
            raise StorageError(f"storage unreachable: {type(exc).__name__}") from exc

    async def put(self, *, bucket: str, path: str, data: bytes, content_type: str) -> None:
        response = await self._send(
            "POST",
            self._object_url(bucket, path),
            content=data,
            extra_headers={"Content-Type": content_type, "x-upsert": "false"},
        )
        if not response.is_success:
            raise StorageError(f"put failed: HTTP {response.status_code}")

    async def get(self, *, bucket: str, path: str) -> bytes:
        response = await self._send("GET", self._object_url(bucket, path))
        if response.status_code == 404 or _is_not_found(response):
            raise StorageNotFoundError("object not found")
        if not response.is_success:
            raise StorageError(f"get failed: HTTP {response.status_code}")
        return response.content

    async def remove(self, *, bucket: str, paths: Sequence[str]) -> None:
        if not paths:
            return
        response = await self._send(
            "DELETE",
            f"{self._base}/object/{quote(bucket, safe='')}",
            json={"prefixes": list(paths)},
        )
        if not response.is_success:
            raise StorageError(f"remove failed: HTTP {response.status_code}")

    async def list_paths(self, *, bucket: str, prefix: str) -> list[str]:
        folder = prefix.strip("/")
        found: list[str] = []
        offset = 0
        while True:
            response = await self._send(
                "POST",
                f"{self._base}/object/list/{quote(bucket, safe='')}",
                json={"prefix": folder, "limit": _LIST_PAGE, "offset": offset},
            )
            if not response.is_success:
                raise StorageError(f"list failed: HTTP {response.status_code}")
            items = response.json()
            # Folders come back with id null; only objects are returned as paths.
            found.extend(f"{folder}/{item['name']}" for item in items if item.get("id"))
            if len(items) < _LIST_PAGE:
                return sorted(found)
            offset += _LIST_PAGE


def _is_not_found(response: httpx.Response) -> bool:
    if response.is_success:
        return False
    try:
        body = response.json()
    except ValueError:
        return False
    return isinstance(body, dict) and (
        body.get("statusCode") in (404, "404") or body.get("error") == "not_found"
    )
