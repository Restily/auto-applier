---
id: T-014
type: task
title: "M1 plan Task 3: ProfileDraft, resume file sniffing, document text extraction, Anthropic adapter, fake markers"
status: done
milestone: M1
owner: backend-dev
priority: P0
depends_on: [T-010]
files: [backend/src/autoapplier/domain/profile.py, backend/src/autoapplier/domain/resume_files.py, backend/src/autoapplier/ports/documents.py, backend/src/autoapplier/adapters/documents/**, backend/src/autoapplier/adapters/llm/**, backend/tests/fixtures/**, backend/tests/contract/**, backend/tests/unit/test_profile_draft.py, backend/tests/unit/test_resume_files.py, backend/tests/unit/test_document_text_extractor.py, backend/tests/unit/test_llm_fake_markers.py, backend/tests/unit/test_llm_registry.py]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 3 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 12:39 todo → in_progress (team-lead)
- 2026-09-28 20:17 AC 1 ✔ (backend-dev): uv run --directory backend pytest tests/unit tests/contract -q -> 119 passed; gate lint/typecheck red only in T-012 tests/integration files
- 2026-09-28 20:17 in_progress → qa (backend-dev): Task 3 implemented, uncommitted (lead commits wave)
- 2026-09-28 22:50 qa → done (team-lead)
