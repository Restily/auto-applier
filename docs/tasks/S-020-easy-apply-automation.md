---
id: S-020
type: story
title: Easy Apply automation
status: todo
milestone: M4
owner: frontend-dev
priority: P0
depends_on: [S-019, S-016]
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## Description

As a <user>, I want <action>, so that <value>.

## Acceptance criteria

- [ ] Given an approved (or autopilot-eligible) application for an Easy Apply job and an active extension, Then it fills the Easy Apply form from the profile and saved answers, uploads the resume, answers free-text questions with AI, submits and reports 'sent'; 1 credit is deducted
- [ ] Given a required question it cannot answer confidently, Then it does not submit, the application returns to review showing the question, and the user's answer is saved for future forms
- [ ] Given the daily Easy Apply limit (default 25, maximum 50) or pacing, Then they are respected as for other channels
- [ ] Given LinkedIn shows a captcha, a restriction or a sign-in wall, Then all LinkedIn activity stops, the connection shows 'Needs attention' and the user is notified
- [ ] Given a failure in the middle of a form, Then the application is marked failed with the credit refunded and the form is discarded, not left submitted halfway

## Notes

- Design: docs/design/screens/<id>.md
- Plan: (set by architect)

## Log

- 2026-09-27 12:11 created (team-lead)
