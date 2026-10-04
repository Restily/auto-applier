---
id: B-005
type: bug
title: "resume review dialog: Apply gives no unsaved-changes cue and appliedHint copy is unused"
status: todo
milestone: M1
owner: frontend-dev
priority: P1
severity: medium
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## Description

Screen: review dialog on /profile (S-003 review states), EN/RU.
Actual: after Apply the dialog closes and new values appear in the editor, but there is no "Unsaved changes" indicator and no hint; messages key resume.review.appliedHint ("Review the highlighted changes and save when you're happy.") exists in en/ru but is never rendered. Values are not saved: on reload they are lost and the review dialog reappears.
Expected: after Apply the editor is dirty (indicator shown, beforeunload armed) and the appliedHint is visible near the save bar / as a banner, with applied fields highlighted per S-003.
Evidence: docs/qa/evidence/M1/design/review-applied-1280-en.png, review-dialog-{1280,375}-{en,ru}.png

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
