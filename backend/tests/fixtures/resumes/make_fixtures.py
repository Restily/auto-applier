"""Build the tiny resume fixtures (no third-party PDF writer needed).

Usage: python tests/fixtures/resumes/make_fixtures.py --out DIR
"""

import argparse
import io
import struct
import zlib
from pathlib import Path

from docx import Document
from pypdf import PdfWriter

CV_LINES = [
    "Alex Ivanov",
    "Senior Backend Engineer",
    "alex.ivanov@example.test | +1 555 0100 | Berlin, Germany",
    "Experience: Acme GmbH, Senior Backend Engineer, 2019-03 to present.",
    "Built payment services in Python and PostgreSQL; led a team of four engineers.",
    "Education: TU Berlin, BSc Computer Science, 2014.",
    "Skills: Python, PostgreSQL, Docker, Kubernetes, FastAPI, Redis, Celery.",
    "Languages: English (fluent), German (advanced), Russian (native).",
]


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_pdf(lines: list[str]) -> bytes:
    """A one-page PDF with a real text layer (Helvetica)."""
    stream = "BT /F1 12 Tf 14 TL 50 750 Td\n"
    stream += "".join(f"({_pdf_escape(line)}) Tj T*\n" for line in lines) + "ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{body}\nendobj\n".encode("latin-1")
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)


def blank_pdf() -> bytes:
    """A one-page PDF with no text layer (stands in for a scan)."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def encrypted_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.encrypt("secret", algorithm="RC4-128")
    buffer = io.BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def docx_bytes(lines: list[str]) -> bytes:
    document = Document()
    for line in lines:
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def png_bytes() -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    pixels = zlib.compress(b"\x00\xff\xff\xff")
    return (
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", pixels) + chunk(b"IEND", b"")
    )


def build(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    png = png_bytes()
    files: dict[str, bytes] = {
        "resume-text.pdf": text_pdf(CV_LINES),
        "resume.docx": docx_bytes(CV_LINES),
        "resume-v2.docx": docx_bytes([*CV_LINES, "[[fake-llm:variant=v2]]"]),
        "ai-fail.pdf": text_pdf([*CV_LINES, "[[fake-llm:fail]]"]),
        "scanned.pdf": blank_pdf(),
        "encrypted.pdf": encrypted_pdf(),
        "corrupt.pdf": b"%PDF-1.4\nthis is not a real pdf body\n",
        "not-a-resume.png": png,
        "png-renamed.pdf": png,
    }
    for name, data in files.items():
        (out / name).write_bytes(data)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    build(parser.parse_args().out)


if __name__ == "__main__":
    main()
