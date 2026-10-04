---
id: S-003
type: story
title: Upload a resume and get an AI-extracted profile
status: qa
milestone: M1
owner: frontend-dev
priority: P0
depends_on: [S-001]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-27
updated: 2026-10-04
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [x] Given a signed-in user on onboarding, When they upload a PDF or DOCX resume up to 5 MB, Then within 60 seconds they see an editable profile draft with name, contacts, headline/target titles, skills, experience entries, education, languages, location and links
- [x] Given a file of another type or larger than 5 MB, When it is uploaded, Then it is rejected with a clear message and nothing is stored
- [x] Given an unreadable file (e.g. a scanned image PDF) or an AI failure, When extraction fails, Then the user sees 'we could not read this resume' and can fill the profile manually while the file stays attached
- [ ] Given a user already has a profile, When they upload a new resume, Then the new file replaces the attached one and the profile is only overwritten after the user confirms which fields to take
- [x] Given a stored resume file, When another user or an anonymous visitor requests it, Then access is denied

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 15:00 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md (team-lead)
- 2026-10-04 18:34 todo → qa (team-lead)
- 2026-10-04 19:08 AC 1 ✔ (qa-manual): docs/qa/evidence/M1/S-003-ac1-pdf-draft-en-1280.png, S-003-ac1-pdf-saved-en-1280.png, S-003-ac1-docx-draft-en-1280.png (draft in <1s with fake LLM; links empty because fixtures contain none; real-LLM accuracy not testable locally)
- 2026-10-04 19:08 AC 2 ✔ (qa-manual): docs/qa/evidence/M1/S-003-ac2-png-rejected-en-1280.png, S-003-ac2-png-renamed-pdf-rejected-en-1280.png, S-003-ac2-big-pdf-rejected-en-1280.png, S-003-ac2-note-txt-rejected-en-1280.png; API checks 422/413, 0 resume rows, 0 storage objects
- 2026-10-04 19:08 AC 5 ✔ (qa-manual): docs/qa/evidence/M1/S-003-ac5-access-denied.txt
- 2026-10-04 19:09 AC 3 ✔ (qa-manual): docs/qa/evidence/M1/S-003-ac3-corrupt-en-1280.png, S-003-ac3-scanned-en-1280.png, S-003-ac3-try-again-en-1280.png, S-003-ac3-onboarding-after-fail-en-1280.png (file stays attached, verified after reload; see bugs for 'Fill in manually' dead link and stale resume region)
