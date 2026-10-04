---
id: T-029
type: task
title: "M1 review round 2 N2+N3: salary aria-describedby per field; recovery session max age 15 min"
status: done
milestone: M1
owner: frontend-dev
priority: P2
files: [apps/web/src/components/profile/salary-fields.tsx, apps/web/src/lib/auth/recovery.ts]
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## What to do

See M1-code-review.md Round 2. N2: when both Min and Max invalid, each field must describe its own error (aria-describedby to its own message). N3: isRecoverySession also requires the recovery/otp amr timestamp within 15 minutes; otherwise redirect /reset-password?error=link_invalid. TDD unit tests.

## Definition of done

- [x] …

## Log

- 2026-10-04 18:10 created (frontend-dev)
- 2026-10-04 18:11 todo → in_progress (frontend-dev)
- 2026-10-04 18:14 AC 1 ✔ (frontend-dev): apps/web/src/lib/auth/recovery.test.ts, apps/web/src/components/profile/salary-fields.test.tsx, actions.test.ts; web vitest 62 files/459 tests pass
- 2026-10-04 18:14 in_progress → qa (frontend-dev): N2: separate min/max error ids + per-field aria-describedby; N3: isRecoverySession(claims, nowMs) requires amr[0] otp/recovery timestamp within RECOVERY_MAX_AGE_SECONDS=900; legacy string amr fails closed. Not committed.
- 2026-10-04 18:25 qa → done (team-lead)
