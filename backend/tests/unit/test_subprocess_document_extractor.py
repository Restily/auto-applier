"""T-028 (M1 review round 2, N1): document parsing runs in a killable child process."""

import asyncio
import os
import sys
import threading
import time
from collections.abc import Sequence
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from autoapplier.adapters.documents.subprocess_extractor import SubprocessDocumentExtractor
from autoapplier.adapters.llm.fake import FakeLLMProvider
from autoapplier.adapters.llm.registry import FIXTURES_DIR
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.domain.resume_files import is_readable_text
from autoapplier.ports.documents import DocumentParseTimeoutError, DocumentUnreadableError
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import RESUME_BUCKET

from .doubles.resume_store import InMemoryResumeStore

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
USER = uuid4()


def _hang_argv(pid_file: Path) -> list[str]:
    """A child that records its pid and then never returns (stands in for a looping parser)."""
    code = (
        f"import os, time\nopen({str(pid_file)!r}, 'w').write(str(os.getpid()))\ntime.sleep(600)\n"
    )
    return [sys.executable, "-c", code]


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def _read_pid(pid_file: Path) -> int:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if pid_file.exists() and pid_file.read_text():
            return int(pid_file.read_text())
        time.sleep(0.02)
    raise AssertionError("child never started")


async def _settled_threads(before: set[int]) -> set[int]:
    """Thread idents beyond `before`, after giving asyncio's child watcher a moment to exit."""
    for _ in range(100):
        extra = {t.ident or 0 for t in threading.enumerate()} - before
        if not extra:
            return extra
        await asyncio.sleep(0.02)
    return extra


async def test_parses_pdf_and_docx_in_a_child_process() -> None:
    extractor = SubprocessDocumentExtractor()
    pdf = await extractor.extract_text((FIXTURES / "resume-text.pdf").read_bytes(), "pdf")
    docx = await extractor.extract_text((FIXTURES / "resume.docx").read_bytes(), "docx")
    assert "Alex Ivanov" in pdf
    assert "Alex Ivanov" in docx
    assert is_readable_text(pdf)
    assert is_readable_text(docx)


@pytest.mark.parametrize("name", ["corrupt.pdf", "encrypted.pdf"])
async def test_unreadable_document_raises_unreadable(name: str) -> None:
    with pytest.raises(DocumentUnreadableError):
        await SubprocessDocumentExtractor().extract_text((FIXTURES / name).read_bytes(), "pdf")


async def test_child_crash_is_unreadable_not_a_timeout() -> None:
    extractor = SubprocessDocumentExtractor(argv=[sys.executable, "-c", "import os; os._exit(9)"])
    with pytest.raises(DocumentUnreadableError) as caught:
        await extractor.extract_text(b"x", "pdf")
    assert not isinstance(caught.value, DocumentParseTimeoutError)


async def test_never_returning_parse_is_killed_at_the_parse_timeout(tmp_path: Path) -> None:
    pid_file = tmp_path / "pid"
    before = {t.ident or 0 for t in threading.enumerate()}
    extractor = SubprocessDocumentExtractor(argv=_hang_argv(pid_file), timeout_s=0.5)

    started = time.monotonic()
    with pytest.raises(DocumentParseTimeoutError):
        await extractor.extract_text(b"%PDF", "pdf")
    assert time.monotonic() - started < 3

    assert not _alive(_read_pid(pid_file))
    assert await _settled_threads(before) == set()


async def test_cancelling_the_await_kills_the_child(tmp_path: Path) -> None:
    pid_file = tmp_path / "pid"
    before = {t.ident or 0 for t in threading.enumerate()}
    extractor = SubprocessDocumentExtractor(argv=_hang_argv(pid_file), timeout_s=60)

    with pytest.raises(TimeoutError):
        async with asyncio.timeout(0.5):
            await extractor.extract_text(b"%PDF", "pdf")

    assert not _alive(_read_pid(pid_file))
    assert await _settled_threads(before) == set()


async def _seed(store: InMemoryResumeStore, storage: InMemoryFileStorage) -> UUID:
    resume_id = uuid4()
    path = f"{USER}/{resume_id}.pdf"
    await store.insert_current(
        user_id=USER,
        resume_id=resume_id,
        storage_path=path,
        file_name="cv.pdf",
        mime_type="application/pdf",
        size_bytes=10,
    )
    await storage.put(
        bucket=RESUME_BUCKET,
        path=path,
        data=(FIXTURES / "resume-text.pdf").read_bytes(),
        content_type="application/pdf",
    )
    return resume_id


@pytest.mark.parametrize(
    ("deadline_s", "parse_timeout_s"),
    [(0.5, 60.0), (60.0, 0.5)],
    ids=["whole-attempt-deadline-first", "parse-timeout-first"],
)
async def test_hung_parse_fails_row_and_leaves_nothing_behind(
    tmp_path: Path, deadline_s: float, parse_timeout_s: float
) -> None:
    pid_file = tmp_path / "pid"
    before = {t.ident or 0 for t in threading.enumerate()}
    store, storage = InMemoryResumeStore(), InMemoryFileStorage()
    resume_id = await _seed(store, storage)
    argv: Sequence[str] = _hang_argv(pid_file)
    service = ResumeExtractionService(
        store,
        storage,
        SubprocessDocumentExtractor(argv=argv, timeout_s=parse_timeout_s),
        FakeLLMProvider(fixtures_dir=FIXTURES_DIR),
        deadline_s=deadline_s,
    )

    started = time.monotonic()
    assert await service.extract(resume_id) == "failed"
    assert time.monotonic() - started < 3

    row = store.rows[resume_id]
    assert (row.status, row.error_code) == ("failed", "ai_failed")
    assert not _alive(_read_pid(pid_file))
    assert await _settled_threads(before) == set()
