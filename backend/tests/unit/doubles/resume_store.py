"""In-memory `ResumeStore` for unit tests; mirrors the Postgres semantics of `PgResumeStore`."""

from collections.abc import Callable, Mapping
from dataclasses import replace
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from autoapplier.ports.resume_store import MAX_EXTRACTION_ATTEMPTS, ResumeErrorCode, ResumeRecord


class InMemoryResumeStore:
    def __init__(self, now: Callable[[], datetime] | None = None) -> None:
        self.rows: dict[UUID, ResumeRecord] = {}
        self.now: Callable[[], datetime] = now or (lambda: datetime.now(UTC))
        self.fail_insert = False

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
        if self.fail_insert:
            raise RuntimeError("injected insert failure")
        previous: ResumeRecord | None = None
        for row_id, row in self.rows.items():
            if row.user_id == user_id and row.is_current:
                previous = replace(row, is_current=False, updated_at=self.now())
                self.rows[row_id] = previous
        stamp = self.now()
        record = ResumeRecord(
            id=resume_id,
            user_id=user_id,
            storage_path=storage_path,
            file_name=file_name,
            mime_type=mime_type,
            size_bytes=size_bytes,
            status="processing",
            error_code=None,
            extracted=None,
            is_current=True,
            attempts=0,
            created_at=stamp,
            updated_at=stamp,
        )
        self.rows[resume_id] = record
        return record, previous

    async def delete(self, *, user_id: UUID, resume_id: UUID) -> None:
        row = self.rows.get(resume_id)
        if row is not None and row.user_id == user_id:
            del self.rows[resume_id]

    async def get_for_user(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord | None:
        row = self.rows.get(resume_id)
        return row if row is not None and row.user_id == user_id else None

    async def get(self, resume_id: UUID) -> ResumeRecord | None:
        return self.rows.get(resume_id)

    async def claim_for_extraction(
        self, resume_id: UUID, *, max_attempts: int = MAX_EXTRACTION_ATTEMPTS
    ) -> ResumeRecord | None:
        row = self.rows.get(resume_id)
        if row is None or row.status != "processing":
            return None
        if row.attempts >= max_attempts:
            self.rows[resume_id] = replace(
                row, status="failed", error_code="unreadable", updated_at=self.now()
            )
            return None
        claimed = replace(row, attempts=row.attempts + 1, updated_at=self.now())
        self.rows[resume_id] = claimed
        return claimed

    async def mark_ready(self, resume_id: UUID, draft: Mapping[str, Any]) -> None:
        self.rows[resume_id] = replace(
            self.rows[resume_id],
            status="ready",
            error_code=None,
            extracted=dict(draft),
            updated_at=self.now(),
        )

    async def mark_failed(self, resume_id: UUID, error_code: ResumeErrorCode) -> None:
        self.rows[resume_id] = replace(
            self.rows[resume_id], status="failed", error_code=error_code, updated_at=self.now()
        )

    async def reset_for_retry(
        self, *, user_id: UUID, resume_id: UUID, stale_after_s: float
    ) -> ResumeRecord | None:
        row = self.rows.get(resume_id)
        if row is None or row.user_id != user_id:
            return None
        age = (self.now() - row.updated_at).total_seconds()
        if row.status == "ready" or (row.status == "processing" and age <= stale_after_s):
            return None
        reset = replace(
            row, status="processing", error_code=None, attempts=0, updated_at=self.now()
        )
        self.rows[resume_id] = reset
        return reset
