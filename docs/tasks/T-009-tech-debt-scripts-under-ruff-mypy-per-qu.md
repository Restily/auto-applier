---
id: T-009
type: task
title: "Tech debt: scripts/ under ruff+mypy; per-queue worker heartbeats; valkey.sh checks docker exit status"
status: done
milestone: M1
owner: backend-dev
priority: P2
depends_on: [T-010, T-011, T-012]
files: [scripts/**, package.json, backend/pyproject.toml, backend/tests/unit/test_valkey_script.py, backend/tests/unit/test_sync_env.py]
plan: docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md
needs_human: false
created: 2026-09-28
updated: 2026-09-28
---

## What to do

…

## Definition of done

- [x] Given quality-gate fast, Then scripts/*.py are linted and type-checked; heartbeat design per queue is recorded in TECH-DEBT.md; valkey.sh exits non-zero immediately when docker start/run fails

## Log

- 2026-09-28 07:54 created (team-lead)
- 2026-09-28 09:15 set plan=docs/superpowers/plans/2026-09-27-M1-onboarding-profile.md, files=[scripts/**, package.json, backend/pyproject.toml, backend/tests/unit/test_valkey_script.py, backend/tests/unit/test_sync_env.py], depends_on=[T-010, T-011, T-012] (team-lead)
- 2026-09-28 09:15 note (architect): Plan Task 16 (scripts under ruff+mypy, valkey.sh fail-fast). Per-queue heartbeat design recorded as TD-007 in docs/architecture/TECH-DEBT.md.
- 2026-09-28 22:50 todo → in_progress (team-lead)
- 2026-09-28 22:52 AC 1 ✔ (backend-dev): test_valkey_script.py 4 pass; probes (F401, untyped def) exit 1; lint:py/typecheck:py cover scripts/*.py; TD-007 in TECH-DEBT.md
- 2026-09-28 22:52 in_progress → qa (backend-dev): scripts under ruff+mypy, valkey.sh fail-fast; uncommitted
- 2026-09-28 23:00 qa → done (team-lead)
