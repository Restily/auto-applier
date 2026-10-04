---
id: S-006
type: story
title: Export my data and delete my account
status: qa
milestone: M1
owner: backend-dev
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
- 2026-09-28 08:58 set needs_human=false (team-lead)
- 2026-09-28 08:58 note (team-lead): D5 decided by human (2026-09-28): no repeat sign-up bonus after deletion — keep an HMAC of the normalized email after deletion, used only to block a second bonus; disclose in privacy policy.
- 2026-09-28 09:15 note (architect): Architect (D5): designer to confirm the privacy placeholder + delete-dialog/account-deleted fingerprint copy in plan Task 10 (legal.privacy.*, account.delete.fingerprintNote, account.deleted.fingerprintNote).
- 2026-09-28 09:18 note (designer): D5 copy confirmed: delete-dialog fingerprint disclosure (account.delete.fingerprintNote) and post-deletion note (account.deleted.fingerprintNote), both linking to /privacy#after-deletion; new /privacy placeholder spec added as S-006 §6d (legal.privacy.* keys). See docs/design/screens/S-006.md.
- 2026-09-28 09:18 note (qa-automation): QA delta contract review (2026-09-28): AC2 D5 fingerprint addendum verified (positive + negative/rollback case). No gaps. See docs/qa/plans/M1-test-plan.md.
- 2026-10-04 18:34 todo → qa (team-lead)
