"""Document text extraction port."""

from typing import Protocol

from autoapplier.domain.resume_files import DocumentKind


class DocumentUnreadableError(Exception):
    """The document is corrupt, encrypted or otherwise cannot be parsed."""


class DocumentTextExtractor(Protocol):
    """Extracts plain text from a document. Sync and CPU-bound: use `asyncio.to_thread`."""

    def extract_text(self, data: bytes, kind: DocumentKind) -> str: ...
