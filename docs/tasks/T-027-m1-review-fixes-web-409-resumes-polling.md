---
id: T-027
type: task
title: "M1 review fixes (web): 409 resumes polling, salary max, OAuth callback locale before exchange, streamed upload cap in route, updatePassword gated on recovery session, dirty-editor warning on resume replace, progress aria-valuenow"
status: done
milestone: M1
owner: frontend-dev
priority: P1
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

…

## Definition of done

- [x] …

## Log

- 2026-10-04 12:36 created (frontend-dev)
- 2026-10-04 12:36 note (team-lead): Findings 2(web),4,7,9(web),10,13,14 in docs/architecture/reviews/M1-code-review.md
- 2026-10-04 12:36 todo → in_progress (team-lead)
- 2026-10-04 12:49 AC 1 ✔ (frontend-dev): findings 2,4,7,9,10,13,14 fixed with tests: src/lib/resume/{actions,status}.test.ts, components/resume/{resume-flow,profile-resume-host}.test.tsx, lib/profile/schema.test.ts, profile-editor.test.tsx, app/api/resume/route.test.ts, lib/auth/{actions,recovery}.test.ts, components/ui/progress.test.tsx; quality-gate fast PASS; e2e password-reset + resume: 9/10 (failure.spec.ts attempts+1 is stale vs T-026 attempts reset, tests/** owner)
- 2026-10-04 12:49 in_progress → qa (frontend-dev): web review fixes #2,#4,#7,#9,#10,#13,#14; not committed by me
- 2026-10-04 18:25 qa → done (team-lead)
