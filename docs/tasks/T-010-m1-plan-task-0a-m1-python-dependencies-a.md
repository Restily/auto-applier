---
id: T-010
type: task
title: "M1 plan Task 0A: M1 Python dependencies and import-linter contracts"
status: done
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

- [x] Plan task 0A implemented; its tests pass

## Log

- 2026-09-28 09:15 created (architect)
- 2026-09-28 09:17 todo → in_progress (team-lead)
- 2026-09-28 09:18 in_progress → qa (backend-dev): Task 0A done: pyproject.toml runtime deps (pyjwt[crypto], httpx moved to runtime, python-multipart, anthropic, pypdf, python-docx) + dev deps (respx, pytest-cov); import-linter contracts 1-3 forbid httpx/jwt/anthropic/pypdf/docx; uv.lock regenerated via uv lock. Verified: uv lock --check, uv sync --locked, import probe, lint-imports, mypy, pytest all green. Web-side gate failures (next/vitest/eslint-config-next missing) are T-011's package.json territory.
- 2026-09-28 09:19 note (backend-dev): quality-gate fast red on rerun: src/app/globals.test.ts > globals.css > has no color literals fails because apps/web/src/app/globals.css now contains raw hsl(...) literals (git diff shows them added under --sidebar/--sidebar-foreground etc.). That file and package.json are outside my file set (backend/pyproject.toml, backend/uv.lock); this is T-011/Task 0B's shadcn sidebar addition. My backend deps/import-linter work is unaffected: ruff, mypy, import-linter (6/6 kept), and backend pytest all still pass. Not touching apps/web per the single-owner rule.
- 2026-09-28 12:38 AC 1 ✔ (team-lead): lead verified: quality-gate fast PASS after wave-1 commit
- 2026-09-28 12:38 qa → done (team-lead): wave 1 committed
