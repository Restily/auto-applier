"""Child-process entry point for document parsing (T-028).

    python -m autoapplier.adapters.documents.child <pdf|docx>   # bytes on stdin, text on stdout

Runs the in-process parser in a throw-away interpreter so the parent can kill it at a
deadline. Exit codes: 0 text on stdout; 3 the document is unreadable (no output); anything
else is a crash. Nothing from the document is written to stderr (it can carry PII).
"""

import sys
from typing import Final

from autoapplier.adapters.documents.pypdf_docx import PyPdfDocxTextExtractor
from autoapplier.domain.resume_files import MAX_TEXT_CHARS, DocumentKind
from autoapplier.ports.documents import DocumentUnreadableError

EXIT_UNREADABLE: Final = 3
# The service keeps the first MAX_TEXT_CHARS; the margin keeps the readability check honest.
MAX_OUTPUT_CHARS: Final = MAX_TEXT_CHARS * 2


def main(argv: list[str]) -> int:
    kind: DocumentKind
    if argv[1:2] == ["pdf"]:
        kind = "pdf"
    elif argv[1:2] == ["docx"]:
        kind = "docx"
    else:
        return 2
    data = sys.stdin.buffer.read()
    try:
        text = PyPdfDocxTextExtractor().extract_text(data, kind)
    except DocumentUnreadableError:
        return EXIT_UNREADABLE
    sys.stdout.buffer.write(text[:MAX_OUTPUT_CHARS].encode("utf-8", errors="replace"))
    sys.stdout.buffer.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
