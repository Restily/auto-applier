---
id: S-008
type: story
title: Ingest vacancies from job aggregators including Hirify and HireHi
status: todo
milestone: M2
owner: backend-dev
priority: P0
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given the ingestion schedule, When RemoteOK, Remotive, Himalayas, Arbeitnow, We Work Remotely, Hirify and HireHi return vacancies (recorded fixtures in tests), Then each vacancy is stored with title, company, location/remote, salary if present, description, language, source, original URL, published date and extracted apply contacts (email, Telegram username, external link)
- [ ] Given a vacancy that was already ingested, When it is fetched again, Then it is updated, not duplicated
- [ ] Given one source is down or returns malformed data, When ingestion runs, Then the other sources still ingest, no partial records are stored and the failure is recorded in source health
- [ ] Given the default configuration, Then every source is polled at least every 30 minutes and adding a new source requires only a new adapter, not product changes
- [ ] Given a vacancy published more than 30 days ago, Then it never appears in feeds

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
