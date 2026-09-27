---
id: T-005
type: task
title: "M1 plan: 3 contract-review gaps to close before building (password-reset expiry, profile maxLength tests, RLS anon/delete cases)"
status: todo
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

- [ ] Task 1 test_auth_gotrue.py gains a genuine token-expiry case for S-001 AC5, or the plan documents why reused+tampered is an accepted proxy
- [ ] Task 9 schema.test.ts gains a maxLength case per length-limited field family (full_name, headline, phone, location, skill/title item length)
- [ ] Task 1 m1_profiles_resumes.test.sql items 3 and 5 gain an anon sub-case, and item 3 gains an owner-delete-denied sub-case

## Log

- 2026-09-27 15:12 created (qa-automation)
- 2026-09-27 15:12 note (qa-automation): Full gap text, plan-section refs and proposed fixes: docs/qa/plans/M1-test-plan.md#contract-review (section 'Gaps sent to architect'). Severity: all 3 are refinements to an otherwise sound, well-covered plan (25/25 ACs already map to a task+verification) — none blocks building if the architect judges the residual risk acceptable and records that in the plan or the M1 test report instead.
