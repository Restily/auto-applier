---
id: B-001
type: bug
title: "ui/dialog.tsx DialogContent hardcodes an English 'Close' screen-reader label (not localized, S-005)"
status: qa
milestone: M1
owner: frontend-dev
priority: P1
severity: medium
needs_human: false
created: 2026-09-29
updated: 2026-10-04
---

## Description

<what is broken>

## Steps to reproduce

1. …

## Expected

…

## Actual

…

## Evidence

- docs/qa/evidence/…

## Acceptance criteria

- [x] Regression test added that failed before the fix
- [ ] Fix verified by QA

## Log

- 2026-09-29 07:56 created (frontend-dev)
- 2026-10-04 11:56 todo → in_progress (frontend-dev)
- 2026-10-04 11:56 AC 1 ✔ (frontend-dev): apps/web/src/components/ui/dialog.test.tsx + sheet.test.tsx (RU 'Закрыть'); 5 tests failed before the fix, 13/13 ui tests pass after
- 2026-10-04 11:56 in_progress → qa (frontend-dev): Root cause: DialogContent/SheetContent/DialogFooter hardcoded 'Close'. Fix: useTranslations('common').close (+ optional closeLabel prop override); common.close added en/ru. Gate fast PASS.
