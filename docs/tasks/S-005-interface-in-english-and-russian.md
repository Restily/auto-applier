---
id: S-005
type: story
title: Interface in English and Russian
status: qa
milestone: M1
owner: frontend-dev
priority: P0
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-10-04
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a first-time visitor whose browser prefers Russian, Then the interface is shown in Russian; for any other language it is shown in English
- [ ] Given a user switches the language, Then every page, validation message and email template uses the chosen language and the choice persists across sessions (for signed-in users, across devices)
- [ ] Given the automated i18n check, Then no page shows a missing translation key in either language

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-10-04 18:34 todo → qa (team-lead)
