---
id: T-028
type: task
title: "M1 review round 2 N1: make resume parsing killable (hanging PDF/DOCX parser thread outlives asyncio.timeout)"
status: done
milestone: M1
owner: backend-dev
priority: P1
files: [backend/src/autoapplier/services/resume_extraction.py, backend/src/autoapplier/worker/tasks/resume.py, backend/src/autoapplier/adapters/documents]
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

See docs/architecture/reviews/M1-code-review.md Round 2 N1. Parser runs in asyncio.to_thread; the 55s timeout abandons the thread, the task returns, so Celery time_limit=75 never fires; leaked CPU-bound threads exhaust the pool. Make the parse killable (run in a child process terminated at the deadline, or exit the worker process when the parse overruns). Regression test with an extractor that never returns: row ends failed/ai_failed AND no live thread/process left behind. Also N4 (JWKS forged kid burns 30s window): record in TECH-DEBT only, no code.

## Definition of done

- [x] …

## Log

- 2026-10-04 18:10 created (backend-dev)
- 2026-10-04 18:11 todo → in_progress (backend-dev)
- 2026-10-04 18:22 AC 1 ✔ (backend-dev): backend/tests/unit/test_subprocess_document_extractor.py
- 2026-10-04 18:22 in_progress → qa (backend-dev): N1: parse in killable child process (SubprocessDocumentExtractor); uncommitted, lead commits wave
- 2026-10-04 18:25 qa → done (team-lead)
