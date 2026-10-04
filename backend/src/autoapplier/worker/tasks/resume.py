"""Resume extraction Celery task (thin sync wrapper over the async service, ADR-0012)."""

from uuid import UUID

from celery import shared_task

from autoapplier.ports.jobs import RESUME_EXTRACT
from autoapplier.worker.celery_app import runtime

# The service bounds one attempt at 55 s (`asyncio.timeout`). The soft limit fires just after
# that and the hard limit is a last resort for a wedged worker; a hanging parser is killed by
# SubprocessDocumentExtractor at its own 25 s deadline. Both stay below
# the 90 s stale-retry window so a retry can never overlap a still-running attempt.
SOFT_TIME_LIMIT_S = 60
HARD_TIME_LIMIT_S = 75


@shared_task(
    name=RESUME_EXTRACT,
    ignore_result=True,
    soft_time_limit=SOFT_TIME_LIMIT_S,
    time_limit=HARD_TIME_LIMIT_S,
)
def extract_resume(resume_id: str) -> None:
    """Extract the profile draft for `resume_id` (a no-op unless the row is `processing`)."""
    runtime.run(lambda container: container.resume_extraction.extract(UUID(resume_id)))
