---
id: S-021
type: story
title: Hiring posts on LinkedIn to applications by email or Telegram
status: todo
milestone: M4
owner: frontend-dev
priority: P0
depends_on: [S-018, S-015]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a paired extension and active searches, When Chrome is open, Then at most every 2 hours it searches LinkedIn posts for hiring keywords from the searches, and AI turns hiring posts into vacancies with contacts (email, Telegram username, post author)
- [ ] Given a hiring post with an email or Telegram contact, Then it goes through the standard feed, review/autopilot and email/Telegram sending
- [ ] Given a hiring post without such a contact, Then it appears in the feed with 'Apply manually: message the author on LinkedIn' and a ready cover letter; the platform never sends LinkedIn messages automatically
- [ ] Given a post that is not a job offer, Then it is discarded

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
