---
id: S-004
type: story
title: Fill and edit the profile manually
status: todo
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [S-001]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user without a resume, When they fill the required fields (full name, contact email, target title, at least one skill, years of experience), Then the profile is saved and the onboarding checklist marks it complete
- [ ] Given required fields are missing or an email/URL is invalid, When the user saves, Then the invalid fields are highlighted and the profile stays incomplete
- [ ] Given a saved profile, When the user edits it (including application answers: work authorization, relocation readiness, notice period, expected salary, phone) and reloads the page, Then the changes persist
- [ ] Given the profile is incomplete, Then the onboarding checklist lists exactly what is missing

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-09-27 15:01 note (team-lead): Plan D1: partial profiles are saved (only format errors block save) so AC4's 'checklist lists what's missing' is reachable; designer to confirm copy profile.savedIncomplete.
- 2026-09-27 15:05 note (designer): D1 copy confirmed: profile.savedIncomplete = "Saved. Fill in the highlighted fields to complete your profile." / "Сохранено. Заполните отмеченные поля, чтобы завершить профиль." (Sonner, info variant); sibling onboarding.missing = "Missing: {list}" / "Не хватает: {list}" (checklist sub-copy). Spec updated: docs/design/screens/S-004.md (States/Copy/Validation/Accessibility/Interactions).
