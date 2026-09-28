---
id: S-006
type: story
title: Export my data and delete my account
status: todo
milestone: M1
owner: backend-dev
priority: P1
depends_on: [S-001]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: true
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a signed-in user, When they request a data export, Then they download a JSON file with their profile, searches, applications and credit ledger
- [ ] Given a signed-in user, When they confirm deletion by typing their email, Then the account, profile, resume files, searches, connections and all stored secrets are deleted, they are signed out and cannot sign in with the old credentials
- [ ] Given the user cancels the deletion dialog, Then nothing is deleted

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-09-27 15:01 set needs_human=true (team-lead)
- 2026-09-27 15:01 note (team-lead): NEEDS HUMAN (D5): after account deletion, re-signing up with the same email grants 20 free credits again. Options: (a) accept for MVP; (b) keep a keyed hash (HMAC) of the normalized email after deletion, used only to block a second sign-up bonus, disclosed in the privacy policy. Lead recommends (b). Until decided, M1 builds (a) with the grant isolated so (b) is a small follow-up.
