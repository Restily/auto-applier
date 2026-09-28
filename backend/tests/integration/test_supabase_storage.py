"""Integration: `SupabaseStorage` against the real local Storage API (private `resumes` bucket)."""

from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr

from autoapplier.adapters.storage.supabase import SupabaseStorage
from autoapplier.ports.storage import StorageError, StorageNotFoundError

BUCKET = "resumes"
PDF = "application/pdf"


@pytest.fixture
def storage(http: httpx.AsyncClient, supabase_url: str, supabase_secret: str) -> SupabaseStorage:
    return SupabaseStorage(base_url=supabase_url, secret_key=SecretStr(supabase_secret), http=http)


async def test_put_get_list_remove_roundtrip(storage: SupabaseStorage) -> None:
    prefix = f"be-test-{uuid4().hex}"
    paths = [f"{prefix}/a.pdf", f"{prefix}/b.pdf"]
    try:
        for path in paths:
            await storage.put(bucket=BUCKET, path=path, data=b"%PDF-1.4 x", content_type=PDF)

        assert await storage.get(bucket=BUCKET, path=paths[0]) == b"%PDF-1.4 x"
        assert sorted(await storage.list_paths(bucket=BUCKET, prefix=prefix)) == paths
    finally:
        await storage.remove(bucket=BUCKET, paths=paths)

    assert await storage.list_paths(bucket=BUCKET, prefix=prefix) == []


async def test_put_existing_path_raises(storage: SupabaseStorage) -> None:
    path = f"be-test-{uuid4().hex}/a.pdf"
    try:
        await storage.put(bucket=BUCKET, path=path, data=b"1", content_type=PDF)
        with pytest.raises(StorageError):
            await storage.put(bucket=BUCKET, path=path, data=b"2", content_type=PDF)
        assert await storage.get(bucket=BUCKET, path=path) == b"1"
    finally:
        await storage.remove(bucket=BUCKET, paths=[path])


async def test_get_missing_raises_not_found(storage: SupabaseStorage) -> None:
    with pytest.raises(StorageNotFoundError):
        await storage.get(bucket=BUCKET, path=f"be-test-{uuid4().hex}/missing.pdf")


async def test_remove_missing_is_ok(storage: SupabaseStorage) -> None:
    await storage.remove(bucket=BUCKET, paths=[f"be-test-{uuid4().hex}/missing.pdf"])
