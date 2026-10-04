---
id: B-007
type: bug
title: "dialogs: surface is --background (gray) not --surface, inputs blend in; not bottom sheets at 375"
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

Screens: discard, replace-resume, entry, review dialogs (EN/RU).
Actual: ui/dialog.tsx DialogContent uses bg-background (#F5F7F9) with shadow-lg; inputs and option rows become gray-on-gray. At 375 these dialogs stay centered cards; only the delete AlertDialog is a bottom sheet.
Expected (MASTER 3.4): floating surfaces use --surface (#FFFFFF); dialogs become bottom sheets on mobile.
Evidence: docs/qa/evidence/M1/entry-dialog-{1280,375}-en.png, discard-dialog-{1280,375}-en.png, review-dialog-375-ru.png

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
