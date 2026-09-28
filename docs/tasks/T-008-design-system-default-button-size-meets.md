---
id: T-008
type: task
title: "Design system: default Button size meets the 44x44 touch target; chromium-mobile e2e project uses touch + mobile UA"
status: done
milestone: M1
owner: frontend-dev
priority: P2
depends_on: [T-011]
files: [apps/web/src/components/ui/button.tsx, apps/web/src/components/ui/button.test.tsx]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Given the shadcn Button default size, Then it renders at least 44px high, verified by a component test; the chromium-mobile project sets hasTouch and a mobile UA

## Log

- 2026-09-28 07:54 created (team-lead)
- 2026-09-28 09:15 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md, files=[apps/web/src/components/ui/button.tsx, apps/web/src/components/ui/button.test.tsx], depends_on=[T-011] (team-lead)
- 2026-09-28 09:15 note (architect): Plan Task 15 (Button sizes, frontend-dev). The chromium-mobile half (hasTouch + mobile UA) is in Task 5 / T-016 (qa-automation owns playwright.config.ts); rendered 44px check in Task 12 / T-023.
- 2026-09-28 12:39 todo → in_progress (team-lead)
- 2026-09-28 20:15 AC 1 ✔ (frontend-dev): apps/web/src/components/ui/button.test.tsx (3/4 fail on old h-9, pass now); chromium-mobile hasTouch/UA part is plan Task 5 (T-016), not covered here
- 2026-09-28 20:15 note (frontend-dev): Button half done+verified; chromium-mobile hasTouch+UA remains in Task 5 (qa-automation). Left in_progress.
- 2026-09-28 22:43 in_progress → qa (team-lead)
- 2026-09-28 22:50 qa → done (team-lead)
