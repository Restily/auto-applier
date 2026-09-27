---
id: S-018
type: story
title: Install and pair the Chrome extension
status: todo
milestone: M4
owner: frontend-dev
priority: P0
depends_on: [S-001]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a signed-in user on Connections, When they install the extension and pair it with a one-time code, Then the extension shows 'Connected to <email>' and the web app shows 'Extension connected, last seen <time>'
- [ ] Given a pairing code older than 10 minutes or already used, Then pairing fails with a message
- [ ] Given the user unpairs from the web app or the extension, Then the extension immediately stops all LinkedIn activity and its token no longer works
- [ ] Given the extension token, Then it only grants access to that user's LinkedIn tasks and results
- [ ] Given the user has not accepted the LinkedIn risk notice or is not logged in to LinkedIn, Then the extension does nothing on LinkedIn and tells the user what is needed

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
