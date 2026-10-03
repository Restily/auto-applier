"""File storage port (private buckets; the API is the only reader/writer, ADR-0014)."""

from collections.abc import Sequence
from typing import Protocol


class StorageError(Exception):
    """A storage operation failed."""


class StorageNotFoundError(StorageError):
    """The requested object does not exist."""


class FileStorage(Protocol):
    async def put(self, *, bucket: str, path: str, data: bytes, content_type: str) -> None:
        """Store an object without upsert; an existing path raises `StorageError`."""
        ...

    async def get(self, *, bucket: str, path: str) -> bytes:
        """Return the object's bytes; a missing object raises `StorageNotFoundError`."""
        ...

    async def remove(self, *, bucket: str, paths: Sequence[str]) -> None:
        """Delete objects; missing paths are not an error."""
        ...

    async def list_paths(self, *, bucket: str, prefix: str) -> list[str]:
        """Full paths of objects directly under `<prefix>/`."""
        ...
