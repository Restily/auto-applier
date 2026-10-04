"""Unit tests for PDF/DOCX text extraction."""

import io
import zipfile
from pathlib import Path

import pytest

from autoapplier.adapters.documents.pypdf_docx import (
    DOCX_MAX_UNCOMPRESSED_BYTES,
    PyPdfDocxTextExtractor,
)
from autoapplier.domain.resume_files import is_readable_text
from autoapplier.ports.documents import DocumentUnreadableError

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"
extractor = PyPdfDocxTextExtractor()


def read(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


def test_text_pdf_contains_name() -> None:
    text = extractor.extract_text(read("resume-text.pdf"), "pdf")

    assert "Alex Ivanov" in text
    assert is_readable_text(text)


def test_docx_contains_name() -> None:
    text = extractor.extract_text(read("resume.docx"), "docx")

    assert "Alex Ivanov" in text
    assert is_readable_text(text)


def test_scanned_pdf_text_is_not_readable() -> None:
    text = extractor.extract_text(read("scanned.pdf"), "pdf")

    assert not is_readable_text(text)


@pytest.mark.parametrize("name", ["corrupt.pdf", "encrypted.pdf"])
def test_corrupt_and_encrypted_pdf_raise_unreadable(name: str) -> None:
    with pytest.raises(DocumentUnreadableError):
        extractor.extract_text(read(name), "pdf")


def test_corrupt_docx_raises_unreadable() -> None:
    with pytest.raises(DocumentUnreadableError):
        extractor.extract_text(b"PK\x03\x04garbage", "docx")


def _zip_of(parts: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, payload in parts.items():
            archive.writestr(name, payload)
    return buffer.getvalue()


def test_docx_zip_bomb_rejected_before_parsing() -> None:
    # 3 MiB of zeros deflate to a few KiB: tiny on the wire, large once inflated.
    bomb = _zip_of({"word/document.xml": b"\x00" * (3 * 1024 * 1024)})
    assert len(bomb) < 20_000
    small_limit = PyPdfDocxTextExtractor(max_docx_uncompressed_bytes=1024 * 1024)

    with pytest.raises(DocumentUnreadableError, match="too large"):
        small_limit.extract_text(bomb, "docx")


def test_docx_many_small_parts_count_towards_the_total() -> None:
    parts = {f"word/p{i}.xml": b"a" * 1000 for i in range(50)}
    limited = PyPdfDocxTextExtractor(max_docx_uncompressed_bytes=10_000)

    with pytest.raises(DocumentUnreadableError, match="too large"):
        limited.extract_text(_zip_of(parts), "docx")


def test_docx_uncompressed_limit_defaults_to_50_mib_and_real_docx_passes() -> None:
    assert DOCX_MAX_UNCOMPRESSED_BYTES == 50 * 1024 * 1024
    assert "Alex Ivanov" in extractor.extract_text(read("resume.docx"), "docx")
