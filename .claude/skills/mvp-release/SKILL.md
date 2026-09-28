---
name: mvp-release
description: "Team Lead protocol for the release milestone MR — security audit, accessibility/performance hardening, full regression, product README and handover. Use when all feature milestones are done (next-step points to /mvp-release)."
---

# Release (MR) — Team Lead protocol

Same mechanics as `/mvp-milestone` (orientation, branch `milestone/MR-release`, delegation briefs, gates). Differences below.

## 1. Planning — `board.py move MR planning`
Run audits in parallel against `bash team/bin/app.sh start` (independent Agent calls). Each files bugs/tasks into MR:
- **security-auditor**: security-gate skill (Strix + manual checks); writes `docs/security/MR-security.md` (first pass).
- **qa-automation**: full regression (`quality-gate full`), accessibility scan (axe in e2e over every page), a performance smoke (e.g. Lighthouse CI or Playwright timings against the PRD budget).
- **designer**: full-product design review over every screen (consistency across milestones).
- **architect**: gardening pass + TECH-DEBT triage (what must be paid before release).
Then collect open deferred items from earlier milestones. If there are more than ~5 code tasks, ask the architect for a hardening plan (superpowers:writing-plans); otherwise fix bug by bug.

## 2. Building — `board.py move MR building`
Plan → parallel build waves + one whole-branch review (as in /mvp-milestone §3–3b); single bugs → owner with systematic-debugging.
Add the product README (how to install, env vars, `supabase start`, seed, run, test, test accounts) — delegate to backend-dev (code-level) and write the product overview part yourself.

## 3. Verifying — `board.py move MR verifying`
- qa-manual: release acceptance — re-verify every story's AC across the whole MVP (quick pass) + exploratory on cross-feature flows → `docs/qa/reports/MR-qa.md`.
- qa-automation: full suite + a11y + perf → `docs/qa/reports/MR-tests.md`.
- security-auditor: re-test fixed findings → final `docs/security/MR-security.md`.
- designer: `docs/design/reviews/MR-design.md`.
Fix loop as in /mvp-milestone §4.

## 4. Gate and handover
`board.py gate MR --run-checks` → PASS → milestone report `docs/product/changelog/MR.md` (release notes) → `board.py move MR done` → merge to main.
Final message to the human:
- what was built (stories), how to run it locally, demo script, test accounts;
- quality evidence: test counts, gate results, security verdict;
- known limitations and deferred items;
- what the human must do for production (not done by the team): cloud Supabase project and migrations, secrets, hosting/deploy, domain, monitoring, backups, legal pages. Offer to prepare a deployment checklist.
