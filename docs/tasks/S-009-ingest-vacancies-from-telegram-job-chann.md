---
id: S-009
type: story
title: Ingest vacancies from Telegram job channels
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

- [ ] Given a seeded catalog of at least 20 public job channels, When a new post appears in a catalog channel, Then within 15 minutes it is fetched and classified; vacancy posts are structured (role, company, stack, seniority, location/remote, salary, language, contact username/email/link) and non-vacancy posts (ads, resumes, digests without contacts) are discarded
- [ ] Given a post that lists several vacancies, Then each becomes a separate vacancy
- [ ] Given a user adds a channel by @name or t.me link, When the channel is public, Then it becomes a source for that user's searches; a private or non-existent channel is rejected with a message
- [ ] Given the AI provider is unavailable, When posts arrive, Then they are kept and processed later rather than lost

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
- 2026-09-27 20:30 note (designer): Screen spec completed: designed as the 'Manage channels' panel (§5.2 pattern) launched from S-007's Sources section, since the AC's add-by-@name/link flow has no standalone page. Full states incl. private/not-found/duplicate rejection.
