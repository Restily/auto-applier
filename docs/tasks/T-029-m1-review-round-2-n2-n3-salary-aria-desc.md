---
id: T-029
type: task
title: "M1 review round 2 N2+N3: salary aria-describedby per field; recovery session max age 15 min"
status: in_progress
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

- [ ] …

## Log

- 2026-10-04 18:10 created (frontend-dev)
- 2026-10-04 18:11 todo → in_progress (frontend-dev)
