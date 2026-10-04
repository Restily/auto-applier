---
id: S-002
type: story
title: Sign in with Google
status: qa
milestone: M1
owner: frontend-dev
priority: P1
depends_on: [S-001]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-10-04
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a visitor, When they choose 'Continue with Google' and consent, Then an account is created (or the existing one with the same verified email is signed in) and new accounts get the 20-credit sign-up bonus once
- [ ] Given the visitor cancels on the Google consent screen, Then they return to sign-in with a neutral message and no account is created
- [ ] Given Google credentials are not configured in the environment, Then the Google button is hidden and email sign-in keeps working

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-10-04 18:34 todo → qa (team-lead)
