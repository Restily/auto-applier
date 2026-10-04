"""In-process test double for the async text-extraction port (wraps a sync parser)."""

import asyncio

from autoapplier.domain.resume_files import DocumentKind
from autoapplier.ports.documents import DocumentTextExtractor


class InlineDocumentExtractor:
    """Runs a sync `DocumentTextExtractor` on a thread, like the pre-T-028 service did.

    Unit tests that exercise service logic (not process isolation) use this; the isolation
    itself is covered against the real `SubprocessDocumentExtractor`.
    """

    def __init__(self, parser: DocumentTextExtractor) -> None:
        self._parser = parser

    async def extract_text(self, data: bytes, kind: DocumentKind) -> str:
        return await asyncio.to_thread(self._parser.extract_text, data, kind)
