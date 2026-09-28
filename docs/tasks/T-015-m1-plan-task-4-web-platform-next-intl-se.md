---
id: T-015
type: task
title: "M1 plan Task 4: Web platform: next-intl, session proxy, app shell and header widgets"
status: qa
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-011, T-012]
files: [apps/web/next.config.ts, apps/web/eslint.config.mjs, apps/web/vitest.config.mts, apps/web/eslint-i18n.test.ts, apps/web/messages/**, apps/web/src/i18n/**, apps/web/src/proxy.ts, apps/web/src/lib/supabase/proxy.ts, apps/web/src/lib/auth/session.ts, apps/web/src/lib/auth/redirects.ts, apps/web/src/lib/auth/redirects.test.ts, apps/web/src/lib/auth/landing.ts, apps/web/src/lib/auth/sign-out.ts, apps/web/src/lib/credits.ts, apps/web/src/lib/credits.test.ts, apps/web/src/lib/health.ts, apps/web/src/lib/health.test.ts, apps/web/src/lib/shell/**, apps/web/src/lib/validation/**, apps/web/src/components/shell/**, apps/web/src/components/health/**, apps/web/src/app/layout.tsx, apps/web/src/app/page.tsx, apps/web/src/app/health/**, apps/web/src/app/(public)/layout.tsx, apps/web/src/app/(onboarding)/layout.tsx, apps/web/src/app/(app)/layout.tsx]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Plan task 4 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 22:50 todo → in_progress (team-lead)
- 2026-09-28 22:59 AC 1 ✔ (frontend-dev): npm run -s lint/typecheck/test:unit/build exit 0 (19 files, 115 tests); quality-gate fast PASS; /health verified 375+1280 and RU via cookie
- 2026-09-28 22:59 in_progress → qa (frontend-dev): Plan task 4 done: next-intl (cookie/profile/Accept-Language), proxy.ts session refresh + redirects, focus/app shell, credit balance, language switcher, account menu, i18n ESLint rule, health i18n (TD-001). Not committed.
