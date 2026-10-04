"""Postgres `ResumeStore` on the service pool (bypasses RLS): every user-facing method
filters by `user_id` itself (ADR-0004: the pool is for system writes the schema forbids users).
"""

import json
from collections.abc import Mapping
from typing import Any
from uuid import UUID

import asyncpg

from autoapplier.ports.resume_store import (
    MAX_EXTRACTION_ATTEMPTS,
    ResumeErrorCode,
    ResumeRecord,
)


def _record(row: asyncpg.Record) -> ResumeRecord:
    extracted = row["extracted"]
    if isinstance(extracted, str):
        extracted = json.loads(extracted)
    return ResumeRecord(
        id=row["id"],
        user_id=row["user_id"],
        storage_path=row["storage_path"],
        file_name=row["file_name"],
        mime_type=row["mime_type"],
        size_bytes=row["size_bytes"],
        status=row["status"],
        error_code=row["error_code"],
        extracted=extracted,
        is_current=row["is_current"],
        attempts=row["attempts"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class PgResumeStore:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def insert_current(
        self,
        *,
        user_id: UUID,
        resume_id: UUID,
        storage_path: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
    ) -> tuple[ResumeRecord, ResumeRecord | None]:
        async with self._pool.acquire() as conn, conn.transaction():
            previous = await conn.fetchrow(
                "update public.resumes set is_current = false "
                "where user_id = $1 and is_current "
                "returning id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
                "error_code, extracted, is_current, attempts, created_at, updated_at",
                user_id,
            )
            new = await conn.fetchrow(
                "insert into public.resumes "
                "(id, user_id, storage_path, file_name, mime_type, size_bytes) "
                "values ($1, $2, $3, $4, $5, $6) "
                "returning id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
                "error_code, extracted, is_current, attempts, created_at, updated_at",
                resume_id,
                user_id,
                storage_path,
                file_name,
                mime_type,
                size_bytes,
            )
        if new is None:
            raise RuntimeError("insert into public.resumes returned no row")
        return _record(new), (_record(previous) if previous is not None else None)

    async def delete(self, *, user_id: UUID, resume_id: UUID) -> None:
        await self._pool.execute(
            "delete from public.resumes where id = $1 and user_id = $2", resume_id, user_id
        )

    async def get_for_user(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord | None:
        row = await self._pool.fetchrow(
            "select id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
            "error_code, extracted, is_current, attempts, created_at, updated_at "
            "from public.resumes where id = $1 and user_id = $2",
            resume_id,
            user_id,
        )
        return _record(row) if row is not None else None

    async def get(self, resume_id: UUID) -> ResumeRecord | None:
        row = await self._pool.fetchrow(
            "select id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
            "error_code, extracted, is_current, attempts, created_at, updated_at "
            "from public.resumes where id = $1",
            resume_id,
        )
        return _record(row) if row is not None else None

    async def claim_for_extraction(
        self, resume_id: UUID, *, max_attempts: int = MAX_EXTRACTION_ATTEMPTS
    ) -> ResumeRecord | None:
        # One statement: either claim (attempts + 1) or, when the attempt budget is spent, fail
        # the row. A spent row is never handed to a worker, so a crash loop ends.
        row = await self._pool.fetchrow(
            "update public.resumes set "
            "attempts = case when attempts >= $2 then attempts else attempts + 1 end, "
            "status = case when attempts >= $2 then 'failed' else status end, "
            "error_code = case when attempts >= $2 then 'unreadable' else error_code end "
            "where id = $1 and status = 'processing' "
            "returning id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
            "error_code, extracted, is_current, attempts, created_at, updated_at",
            resume_id,
            max_attempts,
        )
        if row is None or row["status"] != "processing":
            return None
        return _record(row)

    async def mark_ready(self, resume_id: UUID, draft: Mapping[str, Any]) -> None:
        await self._pool.execute(
            "update public.resumes set status = 'ready', error_code = null, "
            "extracted = $2::jsonb, parsed_at = now() where id = $1",
            resume_id,
            json.dumps(dict(draft)),
        )

    async def mark_failed(self, resume_id: UUID, error_code: ResumeErrorCode) -> None:
        await self._pool.execute(
            "update public.resumes set status = 'failed', error_code = $2 where id = $1",
            resume_id,
            error_code,
        )

    async def reset_for_retry(
        self, *, user_id: UUID, resume_id: UUID, stale_after_s: float
    ) -> ResumeRecord | None:
        row = await self._pool.fetchrow(
            "update public.resumes set status = 'processing', error_code = null, attempts = 0 "
            "where id = $1 and user_id = $2 and (status = 'failed' or "
            "(status = 'processing' and updated_at < now() - make_interval(secs => $3))) "
            "returning id, user_id, storage_path, file_name, mime_type, size_bytes, status, "
            "error_code, extracted, is_current, attempts, created_at, updated_at",
            resume_id,
            user_id,
            stale_after_s,
        )
        return _record(row) if row is not None else None
