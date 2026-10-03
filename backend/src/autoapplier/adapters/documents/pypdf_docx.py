"""PDF (pypdf) and DOCX (python-docx) text extraction."""

import io

from docx import Document
from pypdf import PdfReader

from autoapplier.domain.resume_files import DocumentKind
from autoapplier.ports.documents import DocumentUnreadableError


class PyPdfDocxTextExtractor:
    """`DocumentTextExtractor` backed by pypdf and python-docx."""

    def extract_text(self, data: bytes, kind: DocumentKind) -> str:
        try:
            if kind == "pdf":
                return self._pdf(data)
            return self._docx(data)
        except DocumentUnreadableError:
            raise
        except Exception as exc:  # third-party parsers raise many types; all mean unreadable
            raise DocumentUnreadableError(f"cannot read {kind}: {type(exc).__name__}") from exc

    @staticmethod
    def _pdf(data: bytes) -> str:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise DocumentUnreadableError("encrypted pdf")
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    @staticmethod
    def _docx(data: bytes) -> str:
        document = Document(io.BytesIO(data))
        parts = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                parts.extend(cell.text for cell in row.cells)
        return "\n".join(parts)
