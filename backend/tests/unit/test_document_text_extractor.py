"""Unit tests for PDF/DOCX text extraction."""

from pathlib import Path

import pytest

from autoapplier.adapters.documents.pypdf_docx import PyPdfDocxTextExtractor
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
