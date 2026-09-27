---
id: T-005
type: task
title: "M1 plan: 3 contract-review gaps to close before building (password-reset expiry, profile maxLength tests, RLS anon/delete cases)"
status: done
milestone: M1
owner: architect
priority: P1
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [x] Task 1 test_auth_gotrue.py gains a genuine token-expiry case for S-001 AC5, or the plan documents why reused+tampered is an accepted proxy
- [x] Task 9 schema.test.ts gains a maxLength case per length-limited field family (full_name, headline, phone, location, skill/title item length)
- [x] Task 1 m1_profiles_resumes.test.sql items 3 and 5 gain an anon sub-case, and item 3 gains an owner-delete-denied sub-case

## Log

- 2026-09-27 15:12 created (qa-automation)
- 2026-09-27 15:12 note (qa-automation): Full gap text, plan-section refs and proposed fixes: docs/qa/plans/M1-test-plan.md#contract-review (section 'Gaps sent to architect'). Severity: all 3 are refinements to an otherwise sound, well-covered plan (25/25 ACs already map to a task+verification) — none blocks building if the architect judges the residual risk acceptable and records that in the plan or the M1 test report instead.
- 2026-09-27 15:15 AC 1 ✔ (architect): Plan Task 1 test_auth_gotrue.py: test_recovery_token_expired_is_rejected (backdates auth.users.recovery_sent_at, verified live against GoTrue v2.197; one_time_tokens.created_at is not checked) + fresh/reused/unknown controls; traceability S-001 AC5
- 2026-09-27 15:15 AC 2 ✔ (architect): Plan Task 9 schema.test.ts 'maxLength per field family' (N pass / N+1 -> maxLength on exact path) + actions.test.ts over-long fullName; limits defined in SQL (Task 1), zod PROFILE_LIMITS (Task 9), Python PROFILE_LIMITS (Task 3), table in Global Constraints; traceability S-004 AC2
- 2026-09-27 15:15 AC 3 ✔ (architect): Plan Task 1 m1_profiles_resumes.test.sql §3 and §5: anon select/insert/update/delete denied on candidate_profiles and resumes, owner delete denied on candidate_profiles; plan(45); m1_accounts plan(21) adds profiles owner insert/delete denied; traceability S-003 AC5
- 2026-09-27 15:15 todo → done (architect): All 3 contract-review gaps closed in docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
