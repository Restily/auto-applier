---
id: S-015
type: story
title: Review queue and sending applications by email and Telegram
status: todo
milestone: M3
owner: backend-dev
priority: P0
depends_on: [S-010, S-013, S-014]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given a search in review mode and matching vacancies with an email or Telegram contact whose channel is connected, Then prepared applications (cover letter in the vacancy's language, resume attached, chosen channel) appear in the review queue
- [ ] Given the user approves an application (optionally after editing the text), Then it is sent through its channel within 5 minutes subject to pacing and limits, its status goes queued → sent and 1 credit is deducted
- [ ] Given sending fails, Then the status becomes 'failed' with a reason and the credit is refunded
- [ ] Given the user skips an application, Then its status is 'skipped' and no credit is spent
- [ ] Given the user has 0 credits, When they approve, Then approval is blocked with a prompt to get more credits
- [ ] Given an application was already sent for a vacancy, When another application for the same vacancy would be created, Then it is not created
- [ ] Given an email application, Then it is sent from the user's mailbox with the subject 'Application: <role> — <name>' and the resume attached; given a Telegram application, Then the recruiter receives the message and the resume file from the user's account

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
