---
id: S-019
type: story
title: Collect LinkedIn Jobs into the feed
status: todo
milestone: M4
owner: frontend-dev
priority: P0
depends_on: [S-018]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a paired extension and active searches, When Chrome is open, Then the extension runs LinkedIn Jobs searches for them at most once per hour and within a page limit, and the collected jobs appear in the feed with source 'LinkedIn' and an Easy Apply flag (recorded LinkedIn fixture pages in tests)
- [ ] Given a LinkedIn job that was also collected from another source, Then it appears once in the feed
- [ ] Given LinkedIn pages that the extension does not recognize, Then it stops, reports 'LinkedIn changed' to source health and performs no further actions

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
