---
id: T-019
type: task
title: "M1 plan Task 8: Auth screens: sign up, sign in, forgot/reset password, sign out, Google"
status: done
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-015]
files: [apps/web/src/app/(public)/sign-up/**, apps/web/src/app/(public)/sign-in/**, apps/web/src/app/(public)/reset-password/**, apps/web/src/app/(public)/auth/**, apps/web/src/app/auth/**, apps/web/src/lib/auth/schemas.ts, apps/web/src/lib/auth/schemas.test.ts, apps/web/src/lib/auth/errors.ts, apps/web/src/lib/auth/errors.test.ts, apps/web/src/lib/auth/actions.ts, apps/web/src/lib/auth/actions.test.ts, apps/web/src/lib/auth/providers.ts, apps/web/src/lib/auth/providers.test.ts, apps/web/src/lib/auth/oauth.ts, apps/web/src/lib/auth/oauth.test.ts, apps/web/src/components/auth/**, apps/web/src/lib/env.server.ts, apps/web/.env.example, apps/web/messages/en/auth.json, apps/web/messages/ru/auth.json]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-29
---

## What to do

…

## Definition of done

- [x] Plan task 8 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 23:00 note (team-lead): lead: tests/e2e/helpers/auth.ts (T-016) assumes /sign-up and /sign-in with en/ru label regexes; align with the real screens.
- 2026-09-28 23:00 todo → in_progress (team-lead)
- 2026-09-29 07:40 AC 1 ✔ (frontend-dev): unit 276 pass (lib/auth/*, components/auth/*, app/auth/confirm); live flow evidence docs/qa/evidence/M1/T-019-*.png
- 2026-09-29 07:40 in_progress → qa (frontend-dev): Pages added (sign-up, sign-in, forgot, reset, auth/callback), fixed reset-form unbraced if bug, moved parseSignInNotice to lib/auth/notices.ts (was client-only import in server page). Not committed.
- 2026-09-29 07:41 note (team-lead): lead: for QA — after sign-in the UI locale follows profiles.ui_locale, overriding a RU cookie set before sign-in; verify against S-005 AC.
- 2026-09-29 07:41 qa → done (team-lead)
