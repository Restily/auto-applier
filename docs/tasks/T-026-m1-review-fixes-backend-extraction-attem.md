---
id: T-026
type: task
title: "M1 review fixes (backend): extraction attempt cap/time limits/docx bomb guard, whole-attempt timeout, normalize_draft robustness, links CHECK, deletion message+re-purge, JWKS refetch rate-limit, streamed upload size cap, test trigger isolation, explicit columns"
status: done
milestone: M1
owner: backend-dev
priority: P1
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

…

## Definition of done

- [x] …

## Log

- 2026-10-04 12:36 created (backend-dev)
- 2026-10-04 12:36 note (team-lead): Findings 1,2(backend),3,5,6,8,9(backend),11,12 in docs/architecture/reviews/M1-code-review.md
- 2026-10-04 12:36 todo → in_progress (team-lead)
- 2026-10-04 12:46 AC 1 ✔ (backend-dev): backend/tests/unit/{test_resume_extraction,test_document_text_extractor,test_celery_config,test_profile_draft,test_account_deletion_service,test_account_api,test_jwt_verifier,test_resumes_api,test_resume_store_sql}.py; backend/tests/integration/test_resume_repository.py; supabase/tests/database/m1_profiles_resumes.test.sql (62 pgTAP); findings 1,2,3,5,6,8,9,11,12
- 2026-10-04 12:46 in_progress → qa (backend-dev): M1 review backend fixes #1,2,3,5,6,8,9,11,12; migration 20261004124223_m1_profile_jsonb_limits applied via migration up; not committed (lead commits)
- 2026-10-04 18:25 qa → done (team-lead)
