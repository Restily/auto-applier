---
id: B-006
type: bug
title: "settings: Language radio stays on the old language after switching via the header menu"
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

Screen: /settings (S-005), 1280.
Repro: open /settings in RU, header language menu -> English. html lang becomes en and copy switches, but the Language radio group still has Russian checked (aria-checked=true on the Russian radio). Correct only after a full reload.
Expected: the radio reflects the active locale immediately (derive from useLocale(), not from initial server props).
Evidence: docs/qa/evidence/M1/design/settings-radio-desync-1280-en.png

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
- 2026-10-04 19:09 AC 1 ✔ (frontend-dev): apps/web/src/components/settings/language-card.test.tsx
- 2026-10-04 19:09 todo → qa (frontend-dev): Root cause: LanguageCard seeded state from server prop once. Fix: derive from useLocale(), optimistic selection resynced when active locale changes; locale prop removed.
