"""Resume API schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from autoapplier.ports.resume_store import ResumeErrorCode, ResumeRecord, ResumeStatus


class ResumeOut(BaseModel):
    id: UUID
    file_name: str
    mime_type: str
    size_bytes: int
    status: ResumeStatus
    error_code: ResumeErrorCode | None
    created_at: datetime

    @classmethod
    def from_record(cls, record: ResumeRecord) -> "ResumeOut":
        return cls(
            id=record.id,
            file_name=record.file_name,
            mime_type=record.mime_type,
            size_bytes=record.size_bytes,
            status=record.status,
            error_code=record.error_code,
            created_at=record.created_at,
        )
