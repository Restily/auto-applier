"""Resume persistence port (lifecycle writes the schema forbids to end users)."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Final, Literal, Protocol
from uuid import UUID

# A crash-looping extraction (OOM, hard kill) is redelivered by the broker; after this many
# claims the row is failed instead of looping forever.
MAX_EXTRACTION_ATTEMPTS: Final = 3

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

    async def claim_for_extraction(
        self, resume_id: UUID, *, max_attempts: int = MAX_EXTRACTION_ATTEMPTS
    ) -> ResumeRecord | None:
        """`processing` -> attempts + 1 and return the row; any other state returns None.

        A `processing` row that already used `max_attempts` claims is not claimed: it becomes
        `failed`/`unreadable` (the file is what keeps killing the worker) and None is returned.
        """
        ...

    async def mark_ready(self, resume_id: UUID, draft: Mapping[str, Any]) -> None: ...

    async def mark_failed(self, resume_id: UUID, error_code: ResumeErrorCode) -> None: ...

    async def reset_for_retry(
        self, *, user_id: UUID, resume_id: UUID, stale_after_s: float
    ) -> ResumeRecord | None:
        """`failed`, or `processing` older than `stale_after_s` -> `processing`, error cleared.

        Also resets `attempts` to 0: a user-initiated retry gets a fresh attempt budget.

        Any other state (or another user's row) returns None.
        """
        ...
