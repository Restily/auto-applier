"""Resume persistence port (lifecycle writes the schema forbids to end users)."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Protocol
from uuid import UUID

ResumeStatus = Literal["processing", "ready", "failed"]
ResumeErrorCode = Literal["unreadable", "ai_failed"]


@dataclass(frozen=True, slots=True)
class ResumeRecord:
    id: UUID
    user_id: UUID
    storage_path: str
    file_name: str
    mime_type: str
    size_bytes: int
    status: ResumeStatus
    error_code: ResumeErrorCode | None
    extracted: Mapping[str, Any] | None
    is_current: bool
    attempts: int
    created_at: datetime
    updated_at: datetime


class ResumeStore(Protocol):
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
        """One transaction: demote the previous current row, insert the new one.

        Returns `(new, previous)`.
        """
        ...

    async def delete(self, *, user_id: UUID, resume_id: UUID) -> None: ...

    async def get_for_user(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord | None: ...

    async def get(self, resume_id: UUID) -> ResumeRecord | None:
        """Worker (system) use: not scoped to a user."""
        ...

    async def claim_for_extraction(self, resume_id: UUID) -> ResumeRecord | None:
        """`processing` -> attempts + 1 and return the row; any other state returns None."""
        ...

    async def mark_ready(self, resume_id: UUID, draft: Mapping[str, Any]) -> None: ...

    async def mark_failed(self, resume_id: UUID, error_code: ResumeErrorCode) -> None: ...

    async def reset_for_retry(
        self, *, user_id: UUID, resume_id: UUID, stale_after_s: float
    ) -> ResumeRecord | None:
        """`failed`, or `processing` older than `stale_after_s` -> `processing`, error cleared.

        Any other state (or another user's row) returns None.
        """
        ...
