---
id: S-011
type: story
title: Manual apply with an AI cover letter
status: todo
milestone: M2
owner: frontend-dev
priority: P0
depends_on: [S-010]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a vacancy in the feed, When the user clicks 'Apply manually', Then within 20 seconds an editable cover letter in the vacancy's language, personalized to the profile and vacancy, is shown with a copy button and the original link opens in a new tab; no credits are spent
- [ ] Given the user clicks 'I applied', Then the vacancy is recorded in their history as 'applied manually' and leaves the feed
- [ ] Given the user has generated 30 cover letters today for manual apply, When they request another, Then it is refused until the next day with a message
- [ ] Given the AI provider fails, Then an error with 'Retry' is shown and nothing is recorded

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
