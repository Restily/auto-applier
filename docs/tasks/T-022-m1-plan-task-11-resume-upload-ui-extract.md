---
id: T-022
type: task
title: "M1 plan Task 11: Resume upload UI, extraction status, replace and review-changes dialog"
status: qa
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-017, T-020]
files: [apps/web/src/app/(onboarding)/onboarding/resume/**, apps/web/src/app/api/resume/**, apps/web/src/lib/resume/**, apps/web/src/lib/profile/merge.ts, apps/web/src/lib/profile/merge.test.ts, apps/web/src/components/resume/**, apps/web/src/app/(onboarding)/onboarding/profile/page.tsx, apps/web/src/app/(app)/profile/page.tsx, apps/web/messages/en/resume.json, apps/web/messages/ru/resume.json]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-29
---

## What to do

…

## Definition of done

- [x] Plan task 11 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-29 07:42 todo → in_progress (team-lead)
- 2026-09-29 07:56 AC 1 ✔ (frontend-dev): unit: 57 files/397 tests green incl. validate/upload/status/merge/route/actions/dropzone/review-changes-dialog/extraction-failed/resume-flow/profile-resume-host; e2e evidence docs/qa/evidence/M1/T-022-*.png (upload, extraction, failure, replace, review dialog, EN/RU, 360/1280)
- 2026-09-29 07:56 in_progress → qa (frontend-dev): Resume upload flow, polling, failure panel, replace dialog, review-changes (keep-current default, no silent overwrite); pages extended, not committed
