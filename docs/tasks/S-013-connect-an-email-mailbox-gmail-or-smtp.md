---
id: S-013
type: story
title: Connect an email mailbox (Gmail or SMTP)
status: todo
milestone: M3
owner: backend-dev
priority: P0
depends_on: [S-001]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a user on Connections, When they accept the risk notice and connect Gmail through Google consent (fake OAuth in tests), Then the connection shows 'Connected as <address>'
- [ ] Given SMTP settings (host, port, username, app password), When the test connection succeeds, Then the mailbox is saved; when it fails, an error is shown and nothing is saved
- [ ] Given a connected mailbox, When the user clicks 'Send a test email to myself', Then a test email is sent from that mailbox
- [ ] Given any stored mailbox secret, Then it is encrypted at rest and never returned to the browser by any API
- [ ] Given the user disconnects the mailbox, Then its secrets are deleted and queued email applications move back to review marked 'channel disconnected'

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
