"""Resume file sniffing: trust content, not the client's claims."""

import io
import zipfile
from collections.abc import Mapping
from typing import Final, Literal

DocumentKind = Literal["pdf", "docx"]

RESUME_MAX_BYTES: Final = 5 * 1024 * 1024
MIN_TEXT_CHARS: Final = 200
MAX_TEXT_CHARS: Final = 50_000
MIME_BY_KIND: Final[Mapping[DocumentKind, str]] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _is_docx(data: bytes) -> bool:
    if not data.startswith(b"PK"):
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            return "word/document.xml" in archive.namelist()
    except zipfile.BadZipFile:
        return False


def sniff_resume_kind(data: bytes, file_name: str) -> DocumentKind | None:
    """Return the document kind only if extension and content agree."""
    extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if extension == "pdf" and data.startswith(b"%PDF-"):
        return "pdf"
    if extension == "docx" and _is_docx(data):
        return "docx"
    return None


def is_readable_text(text: str) -> bool:
    """True when the text has at least `MIN_TEXT_CHARS` non-whitespace characters."""
    return sum(1 for char in text if not char.isspace()) >= MIN_TEXT_CHARS
