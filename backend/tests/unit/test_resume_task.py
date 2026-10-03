"""Unit tests for the `resume.extract` Celery task."""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID, uuid4

import pytest

from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.worker import jobs
from autoapplier.worker.tasks import resume as resume_tasks


def test_task_registered_under_resume_extract() -> None:
    from autoapplier.worker.celery_app import app

    assert RESUME_EXTRACT == "resume.extract"
    assert jobs.RESUME_EXTRACT == RESUME_EXTRACT
    assert RESUME_EXTRACT in app.tasks


def test_task_runs_extraction_through_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[UUID] = []

    class _Extraction:
        async def extract(self, resume_id: UUID) -> str:
            seen.append(resume_id)
            return "ready"

    class _Container:
        resume_extraction = _Extraction()

    class _Runtime:
        def run(self, fn: Callable[[Any], Awaitable[Any]]) -> Any:
            async def _go() -> Any:
                return await fn(_Container())

            return asyncio.run(_go())

    monkeypatch.setattr(resume_tasks, "runtime", _Runtime())
    resume_id = uuid4()
    resume_tasks.extract_resume.apply(args=[str(resume_id)]).get()
    assert seen == [resume_id]
