---
id: S-010
type: story
title: Matched vacancy feed with score and reasons
status: todo
milestone: M2
owner: frontend-dev
priority: P0
depends_on: [S-007, S-008, S-009]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a search and ingested vacancies, When the user opens the feed, Then it shows only vacancies passing the hard filters (exclude-words, location, minimum salary when salary is known, sources, age ≤ 30 days), sorted by match score 0–100 with 2–3 short reasons, a source badge and the available apply channels
- [ ] Given the same vacancy was collected from several sources, Then it appears once with all its sources listed
- [ ] Given the user opens a vacancy, Then they see the full description, extracted contacts and a link to the original
- [ ] Given the user marks a vacancy 'Not interested', Then it disappears from all their feeds
- [ ] Given no vacancies match, Then an empty state explains how to broaden the filters
- [ ] Given 10,000 vacancies in the local database, When the feed's first page (20 items) loads, Then it renders in under 1 second

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
