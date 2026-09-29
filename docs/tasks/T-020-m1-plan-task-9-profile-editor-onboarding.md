---
id: T-020
type: task
title: "M1 plan Task 9: Profile editor, onboarding checklist, D5-aware welcome toast"
status: done
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [T-015]
files: [apps/web/src/lib/profile/**, apps/web/src/components/profile/**, apps/web/src/components/onboarding/**, apps/web/src/app/(onboarding)/onboarding/page.tsx, apps/web/src/app/(onboarding)/onboarding/profile/**, apps/web/src/app/(app)/profile/**, apps/web/messages/en/profile.json, apps/web/messages/ru/profile.json, apps/web/messages/en/onboarding.json, apps/web/messages/ru/onboarding.json]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-29
---

## What to do

…

## Definition of done

- [x] Plan task 9 implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 23:00 note (team-lead): lead: credit-balance popover copy (shell.credits normal/low/empty) was written by frontend-dev without a spec; designer confirms in M1 design review.
- 2026-09-28 23:00 todo → in_progress (team-lead)
- 2026-09-29 07:38 AC 1 ✔ (frontend-dev): apps/web: profile-editor/checklist/welcome-toast/schema/completeness/actions tests; quality-gate fast PASS (276 unit tests); visual check 375+1280 as admin-created qa+uuid@example.test
- 2026-09-29 07:38 in_progress → qa (frontend-dev): Implemented ProfileEditor, Checklist, StepCard, StepDots, WelcomeToast (D5), onboarding/profile pages, loading/error; not committed
- 2026-09-29 07:38 note (team-lead): lead: review items — ui/progress.tsx doesn't pass value to Radix (no aria-valuenow; checklist uses own progressbar); RU list join uses ', ' per S-004; build not run during wave.
- 2026-09-29 07:41 qa → done (team-lead)
