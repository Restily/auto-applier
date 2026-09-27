---
id: T-003
type: task
title: "App skeleton, local Supabase and health page"
status: todo
milestone: M0
owner: backend-dev
priority: P0
needs_human: false
created: 2026-09-27
updated: 2026-09-27
---

## What to do

…

## Definition of done

- [ ] Given a fresh clone, When `bash team/bin/app.sh start` runs, Then the web app, the Python API and the local Supabase start and `app.sh url` returns a working URL
- [ ] GET /health on the API returns 200 with status of database and queue; the web /health page shows it
- [ ] The first migration enables RLS by default; generated DB types are available to the web app; secrets are read from env with a .env.example
- [ ] An LLM provider interface with a deterministic fake implementation exists and is selected in tests

## Log

- 2026-09-27 12:11 created (team-lead)
