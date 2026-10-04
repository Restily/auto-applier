---
id: B-008
type: bug
title: "M1 polish: spec deviations in app shell, settings, salary row, popover, reset form"
status: todo
milestone: M1
owner: frontend-dev
priority: P1
severity: low
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## Description

Low-severity deviations from MASTER/S-001/S-004/S-005, none blocking:
1. Credit popover at 375 sits flush against the left viewport edge (no 16px gutter); open state recolors the trigger teal.
2. Desktop sidebar has no logo/wordmark at top (MASTER 8.3 / S-001).
3. Settings cards use shadow-sm; profile cards are flat (MASTER: flat cards, shadow only for floating).
4. 375 salary row: Min alone on a row, Max+Currency, Period below; S-004 asks Min/Max paired, Currency/Period below.
5. Save bar is sticky at desktop; spec: inline at desktop, sticky <=768. Bar is translucent, content shows through.
6. Language switcher has no chevron (spec "EN v"); menu shows bullet and check on the active item.
7. /reset-password short password shows "Minimum 8 characters" twice (error + hint).
8. Dropzone error lacks the AlertCircle icon used by other inline errors; indeterminate extraction bar reads as 100%.
9. Profile "Links" legend sits tight on the LinkedIn label (no gap).
10. favicon.ico returns 404.
Evidence: docs/qa/evidence/M1/design/credit-popover-375-ru.png, profile-salary-error-375-en.png, reset-form-short-375-ru.png, settings-1280-en.png, profile-full-1280-ru.png

## Steps to reproduce

1. …

## Expected

…

## Actual

…

## Evidence

- docs/qa/evidence/…

## Acceptance criteria

- [ ] Regression test added that failed before the fix
- [ ] Fix verified by QA

## Log

- 2026-10-04 19:01 created (designer)
