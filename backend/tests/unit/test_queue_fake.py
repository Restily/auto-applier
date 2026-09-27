"""Unit tests for the in-memory `JobQueue` adapter used by tests and local dev (ADR-0012)."""

from autoapplier.adapters.queue.celery_factory import QUEUE_DEFAULT
from autoapplier.adapters.queue.fake import EnqueuedJob, InMemoryJobQueue
from autoapplier.ports.queue import JobQueue


async def test_records_jobs_in_order_with_incrementing_ids() -> None:
    queue = InMemoryJobQueue()

    first_id = await queue.enqueue("system.ping", args=[1], kwargs={"a": "b"}, queue="ingest")
    second_id = await queue.enqueue("system.heartbeat")

    assert (first_id, second_id) == ("fake-1", "fake-2")
    assert queue.enqueued == [
        EnqueuedJob(task_name="system.ping", args=(1,), kwargs={"a": "b"}, queue="ingest"),
        EnqueuedJob(task_name="system.heartbeat", args=(), kwargs={}, queue=QUEUE_DEFAULT),
    ]


async def test_fake_satisfies_protocol() -> None:
    queue: JobQueue = InMemoryJobQueue()

    job_id = await queue.enqueue("system.ping")

    assert job_id == "fake-1"
