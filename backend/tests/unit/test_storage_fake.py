"""Contract tests for `InMemoryFileStorage` (the `FileStorage` semantics)."""

import pytest

from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.ports.storage import FileStorage, StorageError, StorageNotFoundError


async def test_put_get_roundtrip() -> None:
    storage: FileStorage = InMemoryFileStorage()
    await storage.put(bucket="b", path="u/1.pdf", data=b"x", content_type="application/pdf")

    assert await storage.get(bucket="b", path="u/1.pdf") == b"x"


async def test_put_existing_raises() -> None:
    storage = InMemoryFileStorage()
    await storage.put(bucket="b", path="p", data=b"1", content_type="text/plain")

    with pytest.raises(StorageError):
        await storage.put(bucket="b", path="p", data=b"2", content_type="text/plain")
    assert await storage.get(bucket="b", path="p") == b"1"


async def test_get_missing_raises_not_found() -> None:
    with pytest.raises(StorageNotFoundError):
        await InMemoryFileStorage().get(bucket="b", path="nope")


async def test_not_found_is_a_storage_error() -> None:
    assert issubclass(StorageNotFoundError, StorageError)


async def test_remove_missing_is_ok_and_removes_present() -> None:
    storage = InMemoryFileStorage()
    await storage.put(bucket="b", path="a/1", data=b"1", content_type="text/plain")

    await storage.remove(bucket="b", paths=["a/1", "a/missing"])

    assert storage.objects == {}


async def test_list_paths_directly_under_prefix() -> None:
    storage = InMemoryFileStorage()
    for path in ("u/1", "u/2", "u/sub/3", "other/4"):
        await storage.put(bucket="b", path=path, data=b"", content_type="text/plain")
    await storage.put(bucket="c", path="u/9", data=b"", content_type="text/plain")

    assert sorted(await storage.list_paths(bucket="b", prefix="u")) == ["u/1", "u/2"]
    assert await storage.list_paths(bucket="b", prefix="none") == []


async def test_fail_next_raises_once() -> None:
    storage = InMemoryFileStorage()
    storage.fail_next("put")

    with pytest.raises(StorageError):
        await storage.put(bucket="b", path="p", data=b"1", content_type="text/plain")
    await storage.put(bucket="b", path="p", data=b"1", content_type="text/plain")
    assert storage.objects[("b", "p")] == (b"1", "text/plain")
