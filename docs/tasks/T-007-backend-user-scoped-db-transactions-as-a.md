---
id: T-007
type: task
title: "Backend: user-scoped DB transactions as authenticated role (SET LOCAL ROLE + request.jwt.claims) with cross-user denial test; add SUPABASE_JWT_SECRET to Settings/.env.example; drop or document unused API_HOST/API_PORT/WEB_ORIGIN"
status: done
milestone: M1
owner: architect
priority: P2
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Given the M1 plan, Then it specifies the user-scoped transaction helper, the JWT secret setting and an integration test proving a cross-user read via the API is denied

## Log

- 2026-09-28 07:54 created (team-lead)
- 2026-09-28 09:15 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-09-28 09:15 note (architect): Folded into plan Task 2 (as_user contract + RULE, SUPABASE_JWT_SECRET, removal of API_HOST/API_PORT/WEB_ORIGIN, test_cross_user_rows_invisible_and_unwritable) and Task 7 (test_export_api_with_b_token_has_no_a_rows: real app + GoTrue tokens). Implementation is tracked by build items T-013 and T-018.
- 2026-09-28 09:15 AC 1 ✔ (architect): docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md Task 2 (Interfaces: as_user, config; tests) + Task 7 (test_export_api_with_b_token_has_no_a_rows); traceability row T-007
- 2026-09-28 09:15 todo → done (architect): planning item: plan specifies helper, JWT secret setting and cross-user API test; build via T-013/T-018
