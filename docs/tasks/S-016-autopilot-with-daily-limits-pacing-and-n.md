---
id: S-016
type: story
title: "Autopilot with daily limits, pacing and no repeat contacts"
status: todo
milestone: M3
owner: backend-dev
priority: P0
depends_on: [S-015]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a search in autopilot, a complete profile, a connected channel and credits > 0, Then vacancies scoring at or above the threshold are sent automatically and those below go to the review queue
- [ ] Given a channel reached its daily limit (defaults: Telegram 10, email 30; maximums: Telegram 20, email 50), Then further applications in that channel wait until the next day in the user's time zone, and the settings never accept values above the maximum
- [ ] Given consecutive sends in the same channel, Then they are separated by a random pause within the configured range
- [ ] Given a recruiter contact (email or @username) that received an application from this user in the last 14 days, Then autopilot does not send to it and the application goes to review with a warning
- [ ] Given the balance reaches 0 or the user turns off the global autopilot switch, Then nothing more is sent automatically and an in-app banner explains why

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
