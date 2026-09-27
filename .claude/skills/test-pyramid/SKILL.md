---
name: test-pyramid
description: "QA automation method — test strategy and harness, contract review of milestone plans, test plans, integration/RLS/e2e tests with Playwright Test Agents, flakiness policy and the test report with verdict. Preloaded into qa-automation."
user-invocable: false
---

# Test pyramid

| Level | Owner | Tooling (default stack) | Share |
|---|---|---|---|
| Unit / component | devs (TDD) — you review gaps | Vitest + Testing Library | ~70% |
| Integration / API / DB + RLS | you + backend-dev | Vitest (node) against local Supabase, or pgTAP in `supabase/tests` | ~20% |
| e2e critical journeys + a11y | you | Playwright Test, `@axe-core/playwright` | ~10% |

Verify tool versions and config with context7 before setting anything up.

## M0 — strategy and harness
1. `board.py scaffold test-strategy` → levels, tools, data strategy, environments (local Supabase), naming, coverage targets (logic ≥ 70% lines), flaky policy, CI.
2. Harness tasks come through the architect's plan (`Owner: qa-automation`): Vitest config, Playwright config (`baseURL` from env, `webServer` with `reuseExistingServer: true` pointing at `bash team/bin/app.sh start`-compatible command, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, projects: desktop Chromium + mobile viewport), package.json scripts `test:unit`, `test:integration`, `test:e2e`, CI workflow check.
3. Playwright Test Agents: `cp .mcp.json .team/state/mcp.backup.json; npx playwright init-agents --loop=claude; python3 team/bin/mcp_merge.py .team/state/mcp.backup.json .mcp.json` (init-agents may overwrite .mcp.json — the merge restores other servers). Create `tests/e2e/seed.spec.ts` that brings the app to a logged-in, seeded state for the planner.

## Planning — contract review + test plan
- For every AC of the milestone: is there a plan task whose verification proves it? Missing or vague ("works correctly") → list the gaps for the architect. This review is the contract between builders and evaluators; don't accept "we'll test it later".
- `board.py scaffold test-plan <M>`: AC → level → test name/file; e2e journeys; negative/edge cases; RLS matrix (anon / owner / other user × select/insert/update/delete per table); test data.

## Verifying — implement and run
1. Integration/RLS tests for new tables, endpoints and policies.
2. e2e: dispatch `playwright-test-planner` (explores the running app from the seed, writes a Markdown plan under `specs/`) → `playwright-test-generator` (turns it into tests) → run. Use `playwright-test-healer` only for locator/timing drift. A healer must never weaken an assertion; if the product is wrong, file a bug and mark the test `test.fixme('<B-id>: …')` only for bugs that are deferred (not critical/high).
3. Rules: semantic locators (`getByRole`, `getByLabel`, `getByText`); `getByTestId` last (ask frontend-dev via a task); no `waitForTimeout`; each test creates unique data; no global DB resets while others test; retries ≤ 1 and never to hide flakiness — a flaky test gets quarantined with a `T-` task.
4. Run `bash team/bin/quality-gate.sh full`; keep console output short, read logs in `.team/state/`.
5. Product defects → bugs (`board.py new bug … --by qa-automation`), with the failing test path as evidence.

## Report — `board.py scaffold tests <M>`
Counts per level (added/total), AC coverage table (AC → automated test or "manual only: reason"), failures and linked bugs, fixme/quarantine list, coverage %, suite duration.
`Verdict: PASS` only if: all suites green (fixme allowed only for deferred non-blocking bugs), every AC of the milestone covered by at least one automated test or a justified manual-only note, no new flaky tests. Otherwise `Verdict: FAIL` with reasons.
