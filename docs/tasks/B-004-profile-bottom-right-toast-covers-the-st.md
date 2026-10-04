---
id: B-004
type: bug
title: "profile: bottom-right toast covers the sticky Save button and swallows clicks"
status: qa
milestone: M1
owner: frontend-dev
priority: P1
severity: medium
needs_human: false
created: 2026-10-04
updated: 2026-10-04
---

## Description

Screen: /profile (S-004 save states), 1280 and 375, EN/RU.
Actual: after a save the Sonner toast ("Saved. Fill in the highlighted fields...") is rendered bottom-right, directly over the sticky Save button. A second click on Save does nothing until the toast is gone (Sonner also pauses its timer on hover, so the toast stays while the pointer is on it). Same overlap with Delete account at 375 in settings.
Expected: toast must never cover the primary action (S-004: sticky save bar). Offset the Toaster above the sticky bar (mobile: bottom offset >= bar height + 8px) or place it top-center.
Evidence: docs/qa/evidence/M1/design/profile-saved-incomplete-1280-en.png, delete-dialog-matched-375-en.png

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

- 2026-10-04 19:01 created (designer)
- 2026-10-04 19:09 AC 1 ✔ (frontend-dev): apps/web/src/components/ui/sonner.test.tsx
- 2026-10-04 19:09 todo → qa (frontend-dev): Root cause: Sonner default bottom-right overlapped sticky Save bar. Fix: Toaster position top-center, offset below shell header (--shell-header-height + 8px), desktop+mobile.
