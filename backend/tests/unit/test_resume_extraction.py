"""Unit tests for `ResumeExtractionService` (fake LLM, in-memory store and storage)."""

import asyncio
import logging
import time
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from autoapplier.adapters.documents.pypdf_docx import PyPdfDocxTextExtractor
from autoapplier.adapters.llm.fake import FakeLLMProvider, FakeReply
from autoapplier.adapters.llm.registry import FIXTURES_DIR
from autoapplier.adapters.storage.fake import InMemoryFileStorage
from autoapplier.domain.resume_files import DocumentKind
from autoapplier.ports.documents import DocumentUnreadableError
from autoapplier.ports.llm import LLMRequest, LLMResponse, LLMUnavailableError
from autoapplier.ports.resume_store import MAX_EXTRACTION_ATTEMPTS
from autoapplier.services.resume_extraction import (
    EXTRACTION_DEADLINE_S,
    ResumeExtractionService,
)
from autoapplier.services.resumes import RESUME_BUCKET

from .doubles.documents import InlineDocumentExtractor
from .doubles.resume_store import InMemoryResumeStore

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
USER = uuid4()


class _RaisingDocuments:
    def extract_text(self, data: bytes, kind: DocumentKind) -> str:
        raise DocumentUnreadableError("boom")


class _Env:
    def __init__(self, llm: object | None = None, documents: object | None = None) -> None:
        self.store = InMemoryResumeStore()
        self.storage = InMemoryFileStorage()
        self.llm = FakeLLMProvider(fixtures_dir=FIXTURES_DIR)
        self.clock_now = 0.0
        self.service = ResumeExtractionService(
            self.store,
            self.storage,
            InlineDocumentExtractor(documents or PyPdfDocxTextExtractor()),  # type: ignore[arg-type]
            llm or self.llm,  # type: ignore[arg-type]
            clock=lambda: self.clock_now,
        )

    async def seed(self, fixture: str = "resume-text.pdf", *, put: bool = True) -> UUID:
        resume_id = uuid4()
        path = f"{USER}/{resume_id}.pdf"
        await self.store.insert_current(
            user_id=USER,
            resume_id=resume_id,
            storage_path=path,
            file_name="cv.pdf",
            mime_type="application/pdf",
            size_bytes=10,
        )
        if put:
            await self.storage.put(
                bucket=RESUME_BUCKET,
                path=path,
                data=(FIXTURES / fixture).read_bytes(),
                content_type="application/pdf",
            )
        return resume_id


async def test_success_marks_ready_with_normalized_fixture_draft() -> None:
    env = _Env()
    resume_id = await env.seed()
    assert await env.service.extract(resume_id) == "ready"
    row = env.store.rows[resume_id]
    assert row.status == "ready"
    assert row.extracted is not None
    assert row.extracted["full_name"] == "Alex Ivanov"
    assert row.attempts == 1
    request = env.llm.calls[0]
    assert (request.task, request.tier, request.max_output_tokens) == (
        "resume.extract",
        "smart",
        4096,
    )
    assert request.json_schema is not None


async def test_short_text_unreadable_without_llm_call() -> None:
    env = _Env()
    resume_id = await env.seed("scanned.pdf")
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "unreadable"
    assert env.llm.calls == []


async def test_document_error_unreadable() -> None:
    env = _Env(documents=_RaisingDocuments())
    resume_id = await env.seed()
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "unreadable"
    assert env.llm.calls == []


async def test_missing_object_unreadable() -> None:
    env = _Env()
    resume_id = await env.seed(put=False)
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "unreadable"


async def test_unavailable_then_success_ready_two_calls() -> None:
    env = _Env()
    env.llm.fail_next(LLMUnavailableError("blip"))
    resume_id = await env.seed()
    assert await env.service.extract(resume_id) == "ready"
    assert len(env.llm.calls) == 2


async def test_unavailable_twice_ai_failed() -> None:
    class Down:
        name = "down"

        def __init__(self) -> None:
            self.calls = 0

        async def complete(self, request: LLMRequest) -> LLMResponse:
            self.calls += 1
            raise LLMUnavailableError("down")

    down = Down()
    env = _Env(llm=down)
    resume_id = await env.seed()
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "ai_failed"
    assert down.calls == 2


async def test_deadline_exceeded_no_retry_ai_failed() -> None:
    holder: list[_Env] = []

    class Slow:
        name = "slow"
        calls = 0

        async def complete(self, request: LLMRequest) -> LLMResponse:
            self.calls += 1
            holder[0].clock_now += EXTRACTION_DEADLINE_S + 1
            raise LLMUnavailableError("slow")

    slow = Slow()
    env = _Env(llm=slow)
    holder.append(env)
    resume_id = await env.seed()
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "ai_failed"
    assert slow.calls == 1


async def test_llm_data_none_ai_failed() -> None:
    env = _Env()
    env.llm = FakeLLMProvider({"resume.extract": FakeReply(text="no data", data={})})
    resume_id = await env.seed()

    class NoData:
        name = "nodata"

        async def complete(self, request: LLMRequest) -> LLMResponse:
            response = await env.llm.complete(request)
            return LLMResponse(
                text=response.text,
                data=None,
                provider=response.provider,
                model=response.model,
                usage=response.usage,
            )

    env.service = ResumeExtractionService(
        env.store,
        env.storage,
        InlineDocumentExtractor(PyPdfDocxTextExtractor()),
        NoData(),
        clock=lambda: 0.0,
    )
    assert await env.service.extract(resume_id) == "failed"
    assert env.store.rows[resume_id].error_code == "ai_failed"


async def test_already_ready_is_noop() -> None:
    env = _Env()
    resume_id = await env.seed()
    await env.service.extract(resume_id)
    calls = len(env.llm.calls)
    assert await env.service.extract(resume_id) == "ready"
    assert len(env.llm.calls) == calls
    assert env.store.rows[resume_id].attempts == 1


async def test_unknown_resume_is_noop() -> None:
    env = _Env()
    assert await env.service.extract(uuid4()) == "failed"
    assert env.llm.calls == []


# --- M1 review fixes (T-026): attempt cap, whole-attempt deadline, catch-all -----------------


async def test_claim_beyond_attempt_cap_fails_row_without_work() -> None:
    env = _Env()
    resume_id = await env.seed()
    for _ in range(MAX_EXTRACTION_ATTEMPTS):
        assert await env.store.claim_for_extraction(resume_id) is not None
    assert await env.service.extract(resume_id) == "failed"
    row = env.store.rows[resume_id]
    assert (row.status, row.error_code) == ("failed", "unreadable")
    assert row.attempts == MAX_EXTRACTION_ATTEMPTS
    assert env.llm.calls == []


async def test_user_retry_after_cap_gets_fresh_attempts() -> None:
    env = _Env()
    resume_id = await env.seed()
    for _ in range(MAX_EXTRACTION_ATTEMPTS):
        await env.store.claim_for_extraction(resume_id)
    assert await env.service.extract(resume_id) == "failed"
    reset = await env.store.reset_for_retry(user_id=USER, resume_id=resume_id, stale_after_s=90)
    assert reset is not None
    assert await env.service.extract(resume_id) == "ready"


async def test_whole_attempt_deadline_marks_ai_failed_and_row_is_reclaimable() -> None:
    class Hang:
        name = "hang"

        async def complete(self, request: LLMRequest) -> LLMResponse:
            await asyncio.sleep(30)
            raise AssertionError("unreachable")

    env = _Env()
    resume_id = await env.seed()
    hung = ResumeExtractionService(
        env.store,
        env.storage,
        InlineDocumentExtractor(PyPdfDocxTextExtractor()),
        Hang(),
        deadline_s=0.05,
    )
    assert await hung.extract(resume_id) == "failed"
    row = env.store.rows[resume_id]
    assert (row.status, row.error_code) == ("failed", "ai_failed")

    # After expiry the row can be re-claimed: a user retry resets it and a healthy attempt wins.
    reset = await env.store.reset_for_retry(user_id=USER, resume_id=resume_id, stale_after_s=90)
    assert reset is not None
    assert await env.service.extract(resume_id) == "ready"


async def test_deadline_bounds_a_hanging_document_parser() -> None:
    class Hanging:
        def extract_text(self, data: bytes, kind: DocumentKind) -> str:
            time.sleep(0.5)
            return "x" * 500

    env = _Env()
    resume_id = await env.seed()
    service = ResumeExtractionService(
        env.store, env.storage, InlineDocumentExtractor(Hanging()), env.llm, deadline_s=0.05
    )
    started = time.monotonic()
    assert await service.extract(resume_id) == "failed"
    assert time.monotonic() - started < 0.4
    assert env.store.rows[resume_id].error_code == "ai_failed"
    assert env.llm.calls == []


async def test_unexpected_error_marks_ai_failed_and_logs_only_the_type(
    caplog: pytest.LogCaptureFixture,
) -> None:
    class Exploding:
        name = "exploding"

        async def complete(self, request: LLMRequest) -> LLMResponse:
            raise KeyError("SECRET-RESUME-TEXT")

    env = _Env(llm=Exploding())
    resume_id = await env.seed()
    with caplog.at_level(logging.DEBUG):
        assert await env.service.extract(resume_id) == "failed"
    row = env.store.rows[resume_id]
    assert (row.status, row.error_code) == ("failed", "ai_failed")
    assert "KeyError" in caplog.text
    assert "SECRET-RESUME-TEXT" not in caplog.text


async def test_malformed_url_in_llm_output_does_not_strand_the_row() -> None:
    env = _Env()
    env.llm = FakeLLMProvider(
        {
            "resume.extract": FakeReply(
                text="x", data={"full_name": "A", "links": {"linkedin": "http://[x"}}
            )
        }
    )
    resume_id = await env.seed()
    service = ResumeExtractionService(
        env.store, env.storage, InlineDocumentExtractor(PyPdfDocxTextExtractor()), env.llm
    )
    assert await service.extract(resume_id) == "ready"
    extracted = env.store.rows[resume_id].extracted
    assert extracted is not None
    assert extracted["links"]["linkedin"] is None
