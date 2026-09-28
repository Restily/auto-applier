"""Resume upload and retry (S-003): validate by content, store privately, enqueue extraction."""

import logging
from typing import Final, Literal
from uuid import UUID, uuid4

from autoapplier.domain.resume_files import MIME_BY_KIND, RESUME_MAX_BYTES, sniff_resume_kind
from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.ports.queue import JobQueue
from autoapplier.ports.resume_store import ResumeRecord, ResumeStore
from autoapplier.ports.storage import FileStorage

RESUME_BUCKET: Final = "resumes"
STALE_PROCESSING_S: Final = 90.0

_log = logging.getLogger(__name__)


class ResumeRejected(Exception):
    def __init__(
        self, code: Literal["resume.unsupported_type", "resume.too_large", "resume.empty"]
    ) -> None:
        super().__init__(code)
        self.code = code


class ResumeNotFound(Exception):
    """The resume does not exist or belongs to someone else."""


class ResumeNotRetryable(Exception):
    """The resume is ready or still freshly processing."""


class ResumeService:
    def __init__(self, store: ResumeStore, storage: FileStorage, queue: JobQueue) -> None:
        self._store = store
        self._storage = storage
        self._queue = queue

    async def upload(self, *, user_id: UUID, file_name: str, data: bytes) -> ResumeRecord:
        if not data:
            raise ResumeRejected("resume.empty")
        if len(data) > RESUME_MAX_BYTES:
            raise ResumeRejected("resume.too_large")
        kind = sniff_resume_kind(data, file_name)
        if kind is None:
            raise ResumeRejected("resume.unsupported_type")

        resume_id = uuid4()
        path = f"{user_id}/{resume_id}.{kind}"
        mime_type = MIME_BY_KIND[kind]
        await self._storage.put(bucket=RESUME_BUCKET, path=path, data=data, content_type=mime_type)
        try:
            record, previous = await self._store.insert_current(
                user_id=user_id,
                resume_id=resume_id,
                storage_path=path,
                file_name=file_name,
                mime_type=mime_type,
                size_bytes=len(data),
            )
        except Exception:
            await self._remove_quietly(path)
            raise

        await self._enqueue(resume_id)

        if previous is not None:
            await self._remove_quietly(previous.storage_path)
            try:
                await self._store.delete(user_id=user_id, resume_id=previous.id)
            except Exception:
                _log.exception("could not delete replaced resume row %s", previous.id)
        return record

    async def retry(self, *, user_id: UUID, resume_id: UUID) -> ResumeRecord:
        existing = await self._store.get_for_user(user_id=user_id, resume_id=resume_id)
        if existing is None:
            raise ResumeNotFound
        record = await self._store.reset_for_retry(
            user_id=user_id, resume_id=resume_id, stale_after_s=STALE_PROCESSING_S
        )
        if record is None:
            raise ResumeNotRetryable
        await self._enqueue(resume_id)
        return record

    async def _enqueue(self, resume_id: UUID) -> None:
        try:
            await self._queue.enqueue(RESUME_EXTRACT, args=[str(resume_id)])
        except Exception:
            # The row stays `processing`; the stale-retry path recovers it (90 s).
            _log.exception("could not enqueue %s for resume %s", RESUME_EXTRACT, resume_id)

    async def _remove_quietly(self, path: str) -> None:
        try:
            await self._storage.remove(bucket=RESUME_BUCKET, paths=[path])
        except Exception:
            _log.exception("could not remove resume object %s", path)
