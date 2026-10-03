"""Unit tests for resume file sniffing."""

from pathlib import Path

from autoapplier.domain.resume_files import (
    MIN_TEXT_CHARS,
    is_readable_text,
    sniff_resume_kind,
)

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "resumes"


def read(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


def test_pdf_detected() -> None:
    assert sniff_resume_kind(read("resume-text.pdf"), "cv.pdf") == "pdf"


def test_docx_detected() -> None:
    assert sniff_resume_kind(read("resume.docx"), "cv.docx") == "docx"


def test_png_renamed_pdf_rejected() -> None:
    assert sniff_resume_kind(read("png-renamed.pdf"), "cv.pdf") is None


def test_zip_without_document_xml_rejected() -> None:
    import io
    import zipfile

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("hello.txt", "hi")

    assert sniff_resume_kind(buffer.getvalue(), "cv.docx") is None


def test_doc_extension_rejected() -> None:
    assert sniff_resume_kind(read("resume.docx"), "cv.doc") is None


def test_pdf_magic_with_docx_name_rejected() -> None:
    assert sniff_resume_kind(read("resume-text.pdf"), "cv.docx") is None


def test_empty_rejected() -> None:
    assert sniff_resume_kind(b"", "cv.pdf") is None


def test_uppercase_extension_accepted() -> None:
    assert sniff_resume_kind(read("resume-text.pdf"), "CV.PDF") == "pdf"


def test_readable_text_threshold() -> None:
    assert is_readable_text("a" * MIN_TEXT_CHARS)
    assert not is_readable_text("a" * (MIN_TEXT_CHARS - 1))
    assert not is_readable_text(" \n\t" * 500)
