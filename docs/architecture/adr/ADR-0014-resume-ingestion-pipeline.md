# ADR-0014: Resume ingestion pipeline (upload, private storage, parsing, AI extraction, confirm-before-overwrite)

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
S-003: a user uploads a PDF or DOCX of at most 5 MB and sees an editable profile draft within 60 s. Other types and larger files are rejected and nothing is stored. Unreadable files (scanned PDFs) and AI failures fall back to manual entry, and the file stays attached. A new upload replaces the attached file, and it overwrites the profile only after the user confirms per field. Files are private. The license policy (ADR-0011) excludes GPL/AGPL/LGPL, which rules out PyMuPDF (AGPL). The LLM must be behind the port from ADR-0006; AI work runs in Celery (ADR-0012).

## Options considered
Upload path: A. **Browser → Next.js route handler → Python API `POST /v1/resumes` (multipart)**. The API checks magic bytes and size, stores the file with the service key, inserts the row and enqueues extraction. B. The browser uploads straight to Supabase Storage with the user session, then calls the API: file validation happens after the bytes are stored, and it needs user write policies on the bucket.
Text extraction: I. **pypdf (BSD-3) for PDF, python-docx (MIT, lxml BSD-3) for DOCX**, both pure-Python or wheels. II. pdfminer.six (MIT): heavier, slower. III. PyMuPDF: AGPL, excluded. IV. Send the PDF to the LLM as a document block: provider-specific, and DOCX isn't supported.
Status delivery: polling the `resumes` row (RLS read-own) every 2 s vs Supabase Realtime. Polling is simpler and testable.

## Decision
- **Upload (A).** `POST /v1/resumes` (user JWT, `multipart/form-data`, field `file`). It reads at most 5 MiB + 1 byte, then accepts only:
  - `%PDF-` magic with a `.pdf` name, stored as `application/pdf`;
  - a ZIP whose entries include `word/document.xml` with a `.docx` name, stored as the DOCX MIME type.
  Anything else returns 422 `resume.unsupported_type`; more than 5 MiB returns 413 `resume.too_large`. In both cases nothing is written to Storage or Postgres.
- **Storage:** private bucket `resumes` (created by migration, `public = false`, `file_size_limit = 5242880`, allowed MIME types PDF/DOCX). There are **no storage policies for `anon`/`authenticated`**: only the backend's secret key can read or write, at object path `<user_id>/<resume_id>.<pdf|docx>`. No UI path exposes a file URL.
- **Table `resumes`** follows RLS pattern R (read own, backend writes). Its columns and states are in the M1 plan. At most one `is_current` row per user (partial unique index). A successful new upload deletes the previous resume's row and object after the new row commits.
- **Extraction:** the API enqueues Celery task `resume.extract` (name in `autoapplier/ports/jobs.py`) with the resume id. The worker's `ResumeExtractionService`:
  1. downloads the file;
  2. extracts text through the `DocumentTextExtractor` port (pypdf / python-docx adapters). Fewer than 200 non-whitespace characters marks the resume `failed/unreadable` without an LLM call;
  3. calls `LLMProvider.complete(task="resume.extract", tier="smart", json_schema=ProfileDraft schema)`;
  4. validates and normalizes the result into `ProfileDraft` (domain) and stores it in `resumes.extracted` with status `ready`.
  `LLMUnavailableError` gets one retry inside the job while the 55 s deadline allows it. Any `LLMError` or invalid output marks the resume `failed/ai_failed`. `POST /v1/resumes/{id}/extraction` re-runs a failed or stale (> 90 s processing) extraction.
- **Draft → profile (web):** a draft is *pending* when the current resume is `ready` and `candidate_profiles.source_resume_id` is not that resume. If the saved profile is empty, the editor is pre-filled with the draft. Otherwise a per-field review dialog runs, with "Keep current" as the default. The profile is written only by an explicit save, which sets `source_resume_id`. The merge logic is a pure function in `apps/web/src/lib/profile/merge.ts`.
- **Status:** the web polls the `resumes` row through supabase-js (RLS) every 2 s. After 90 s without a terminal state it shows the failure panel.
- **Local and QA fakes:** the registry's `fake` provider loads `resume.extract` fixtures shipped in the package, and supports two markers in the input text: `[[fake-llm:fail]]` (raise `LLMUnavailableError`) and `[[fake-llm:variant=<name>]]` (use fixture `<task>.<name>.json`). These markers exist only in the fake.

## Consequences
- Positive: validation happens before anything is stored; storage has no user-facing policy surface; permissive licenses only; AI outages leave a readable failed state instead of a lost upload.
- Negative: the file passes through two servers (Next.js → API), which is acceptable at 5 MB. The Next.js `proxy.ts` body limit must allow it (verified by a test). Scanned PDFs are not OCR'd (MVP: manual fill).
- Follow-ups: OCR for scanned resumes, and signed download links for the owner, are not in the MVP.
