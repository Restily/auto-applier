# Test strategy

_Owner: QA Automation · {{DATE}}_

## Levels and tools
| Level | Scope | Tool | Location | Script |
|---|---|---|---|---|
| Unit/component | logic, components | Vitest + Testing Library | colocated `*.test.ts(x)` | `test:unit` |
| Integration/RLS | API, DB, policies | Vitest (node) / pgTAP | `tests/integration`, `supabase/tests` | `test:integration` |
| e2e + a11y | critical journeys | Playwright Test + axe | `tests/e2e` | `test:e2e` |

## Test data
Unique data per test; seed for baseline; no global resets during parallel runs.

## Coverage targets
Logic ≥ 70% lines; every AC covered by an automated test or a justified manual-only note.

## Flaky policy
Retries ≤ 1 in CI; flaky → quarantine + `T-` task; never hidden.

## CI
`.github/workflows/ci.yml` runs `quality-gate.sh fast` and e2e.
