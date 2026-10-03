---
id: T-021
type: task
title: "M1 plan Task 10: Settings: language, data export, delete account, privacy placeholder (D5)"
status: qa
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-015, T-018]
files: [apps/web/src/app/(app)/settings/**, apps/web/src/app/(public)/account-deleted/**, apps/web/src/app/(public)/privacy/**, apps/web/src/app/api/account/**, apps/web/src/lib/account/**, apps/web/src/components/settings/**, apps/web/messages/en/settings.json, apps/web/messages/ru/settings.json, apps/web/messages/en/account.json, apps/web/messages/ru/account.json, apps/web/messages/en/legal.json, apps/web/messages/ru/legal.json]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-29
---

## What to do

…

## Definition of done

- [x] Plan task 10 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 23:00 note (team-lead): lead: apps/web/messages/*/settings.json already holds language.saveFailed (T-015); extend the file, do not overwrite.
- 2026-09-29 07:49 todo → in_progress (team-lead)
- 2026-09-29 07:59 AC 1 ✔ (frontend-dev): 36 new unit tests pass (src/lib/account, src/components/settings, src/app/(public)/privacy, src/app/api/account/export); fast gate PASS; screenshots docs/qa/evidence/M1/T-021-*.png
- 2026-09-29 07:59 note (frontend-dev): frontend-dev: live E2E of export/delete/D5 re-signup NOT done: the API on :8000 is a stale process started before T-018 (openapi lacks /v1/account/*, returns 404), and killing it would trip concurrently --kill-others-on-fail. Needs 'bash team/bin/app.sh restart' by the lead, then qa runs export, delete, /account-deleted, re-signup without the 20-credit bonus.
- 2026-09-29 07:59 in_progress → qa (frontend-dev): Settings, language, export route+client, delete dialog+action, /account-deleted, /privacy D5 placeholder; uncommitted
