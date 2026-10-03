"""In-memory `FileStorage` for tests."""

from collections.abc import Sequence

from autoapplier.ports.storage import StorageError, StorageNotFoundError


class InMemoryFileStorage:
    """`objects[(bucket, path)] = (data, content_type)`; `fail_next(op)` fails one call."""

    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], tuple[bytes, str]] = {}
        self._fail: set[str] = set()

    def fail_next(self, op: str) -> None:
        self._fail.add(op)

    def _maybe_fail(self, op: str) -> None:
        if op in self._fail:
            self._fail.discard(op)
            raise StorageError(f"injected {op} failure")

    async def put(self, *, bucket: str, path: str, data: bytes, content_type: str) -> None:
        self._maybe_fail("put")
        if (bucket, path) in self.objects:
            raise StorageError("object already exists")
        self.objects[(bucket, path)] = (data, content_type)

    async def get(self, *, bucket: str, path: str) -> bytes:
        self._maybe_fail("get")
        try:
            return self.objects[(bucket, path)][0]
        except KeyError:
            raise StorageNotFoundError("object not found") from None

    async def remove(self, *, bucket: str, paths: Sequence[str]) -> None:
        self._maybe_fail("remove")
        for path in paths:
            self.objects.pop((bucket, path), None)

    async def list_paths(self, *, bucket: str, prefix: str) -> list[str]:
        self._maybe_fail("list_paths")
        head = f"{prefix.strip('/')}/"
        return sorted(
            path
            for (b, path) in self.objects
            if b == bucket and path.startswith(head) and "/" not in path[len(head) :]
        )
