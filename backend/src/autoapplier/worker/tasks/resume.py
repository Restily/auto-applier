"""Resume extraction Celery task (thin sync wrapper over the async service, ADR-0012)."""

from uuid import UUID

from celery import shared_task

from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.worker.celery_app import runtime


@shared_task(name=RESUME_EXTRACT, ignore_result=True)
def extract_resume(resume_id: str) -> None:
    """Extract the profile draft for `resume_id` (a no-op unless the row is `processing`)."""
    runtime.run(lambda container: container.resume_extraction.extract(UUID(resume_id)))
