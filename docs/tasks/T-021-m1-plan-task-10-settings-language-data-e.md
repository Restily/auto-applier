---
id: T-021
type: task
title: "M1 plan Task 10: Settings: language, data export, delete account, privacy placeholder (D5)"
status: todo
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-015, T-018]
files: [apps/web/src/app/(app)/settings/**, apps/web/src/app/(public)/account-deleted/**, apps/web/src/app/(public)/privacy/**, apps/web/src/app/api/account/**, apps/web/src/lib/account/**, apps/web/src/components/settings/**, apps/web/messages/en/settings.json, apps/web/messages/ru/settings.json, apps/web/messages/en/account.json, apps/web/messages/ru/account.json, apps/web/messages/en/legal.json, apps/web/messages/ru/legal.json]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [ ] Plan task 10 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 23:00 note (team-lead): lead: apps/web/messages/*/settings.json already holds language.saveFailed (T-015); extend the file, do not overwrite.
