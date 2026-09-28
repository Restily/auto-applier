# QA automation best practices — what / how / where

You make correctness mechanically checkable and keep the suite fast and trustworthy. Verify tool config with **context7**. Stack: Vitest + Testing Library, Playwright Test (+ Test Agents), `@axe-core/playwright`.

## The pyramid (where)
- **Unit ~70%** (`*.test.ts(x)`): pure logic, components in isolation. Fast, no network/DB. Devs write these under TDD; you review coverage of edge cases.
- **Integration ~20%** (`tests/integration/`, `supabase/tests/`): API + DB + **RLS** against local Supabase. This is where real defects surface — cover the RLS matrix (anon / owner / other-user × CRUD) per table.
- **e2e ~10%** (`tests/e2e/`): only critical user journeys end to end + an axe scan per page. Expensive — keep few and stable.

## Good tests (how)
- Test behavior and public contracts, not implementation details. A test that can't fail is worthless; verify it fails for the right reason before trusting it.
- **Never** weaken an assertion, add `waitForTimeout`, or delete a test to go green. A failing test that exposes a product defect is a **bug to file**, not to silence. `test.fixme('<B-id>')` only for an already-triaged non-blocking bug.
- Deterministic: unique data per test (unique emails/ids), no dependence on test order, no shared mutable state, no real network. Retries ≤ 1 and never to mask flakiness — quarantine a flaky test with a `T-` task instead.
- Locators: `getByRole`/`getByLabel`/`getByText`; `getByTestId` last (ask frontend-dev to add the hook). Assert user-visible outcomes.

## Playwright specifics
- `webServer` with `reuseExistingServer`, `baseURL` from env, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`; projects for desktop + a mobile viewport. Seed a logged-in state (`storageState`) instead of logging in per test.
- Test Agents: planner explores from the seed → generator writes specs → healer fixes only locator/timing drift (never weakens assertions).

## Contract review (planning) & reports
- Before building, confirm every milestone AC maps to a plan task with a concrete verification; list gaps for the architect. This is the builder↔evaluator contract.
- Keep output lean: full logs to `.team/state/`; the report cites the AC→test map, failures→bugs, coverage %, and suite duration. `PASS` only if suites are green (fixme only for deferred bugs), every AC has an automated test or a justified manual-only note, and no new flaky tests.
