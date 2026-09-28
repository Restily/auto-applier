"""Canonical Celery task names owned by the ports layer (ADR-0012).

Services enqueue by these names without importing `celery`; the worker registers
the tasks under the same constants.
"""

from typing import Final

RESUME_EXTRACT: Final = "resume.extract"
