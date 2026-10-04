"""Document text extraction port."""

from typing import Protocol

from autoapplier.domain.resume_files import DocumentKind


class DocumentUnreadableError(Exception):
    """The document is corrupt, encrypted or otherwise cannot be parsed."""


class DocumentParseTimeoutError(DocumentUnreadableError):
    """The parse overran its budget and was killed (a hanging or pathological document)."""


class DocumentTextExtractor(Protocol):
    """Extracts plain text from a document. Sync and CPU-bound: never call it on the event
    loop or on a thread you cannot kill; run it through an `AsyncDocumentTextExtractor`."""

    def extract_text(self, data: bytes, kind: DocumentKind) -> str: ...


class AsyncDocumentTextExtractor(Protocol):
    """Extracts plain text without blocking the loop, with the parse killable on cancel.

    Raises `DocumentUnreadableError` for a bad document and `DocumentParseTimeoutError` when
    the parse overran. Cancelling the awaiting task must stop the parse (T-028): a parser
    that outlives its caller is a worker-wide denial of service.
    """

    async def extract_text(self, data: bytes, kind: DocumentKind) -> str: ...
