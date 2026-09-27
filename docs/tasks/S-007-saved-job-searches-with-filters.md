---
id: S-007
type: story
title: Saved job searches with filters
status: todo
milestone: M2
owner: frontend-dev
priority: P0
depends_on: [S-004]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user with a complete profile, When they create a search with target roles/keywords, seniority, location (remote, relocation, countries), minimum salary, vacancy languages, exclude-words, sources and match threshold (default 70), Then it is saved and listed, with roles and skills pre-filled from the profile
- [ ] Given a search without any role or keyword, When the user saves it, Then saving is refused with a message
- [ ] Given a user already has 5 searches, When they try to create a sixth, Then it is refused with a message
- [ ] Given an existing search, When the user edits, pauses or deletes it, Then the feed and application preparation follow the new state; a paused search prepares no new applications

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 20:30 note (designer): Screen spec completed (audit found prior session left an empty scaffold; written from scratch per format). Sections: purpose, layout, components, states, EN/RU copy, validation, responsive 375/768/1280, a11y, motion.
