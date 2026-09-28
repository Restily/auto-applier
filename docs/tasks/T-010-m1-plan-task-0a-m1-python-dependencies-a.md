---
id: T-010
type: task
title: "M1 plan Task 0A: M1 Python dependencies and import-linter contracts"
status: qa
milestone: M1
owner: backend-dev
priority: P0
files: [backend/pyproject.toml, backend/uv.lock]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [ ] Plan task 0A implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 09:17 todo → in_progress (team-lead)
- 2026-09-28 09:18 in_progress → qa (backend-dev): Task 0A done: pyproject.toml runtime deps (pyjwt[crypto], httpx moved to runtime, python-multipart, anthropic, pypdf, python-docx) + dev deps (respx, pytest-cov); import-linter contracts 1-3 forbid httpx/jwt/anthropic/pypdf/docx; uv.lock regenerated via uv lock. Verified: uv lock --check, uv sync --locked, import probe, lint-imports, mypy, pytest all green. Web-side gate failures (next/vitest/eslint-config-next missing) are T-011's package.json territory.
