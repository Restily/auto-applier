# vitest-rtl-cleanup-without-globals

_2026-09-27 · Tags: vitest, @testing-library/react, apps/web_

## Symptom
A component test file with multiple `it()` blocks that each `render(...)`
the same component and then `screen.getByTestId(...)` fails only on the
second (or later) test in the file with:
```
TestingLibraryElementError: Found multiple elements by: [data-testid="health-overall"]
```
even though each test renders a fresh tree and the previous test's
assertions passed.

## Root cause
`@testing-library/react` only auto-registers `afterEach(cleanup)` when it
detects a global `afterEach` function
(`node_modules/@testing-library/react/dist/index.js`, `if (typeof afterEach
=== 'function')`). This repo's `apps/web/vitest.config.mts` does not set
`test.globals: true`, and every test file imports `afterEach` from
`"vitest"` explicitly rather than relying on a global — so
`globalThis.afterEach` is `undefined` at the time `@testing-library/react`
is first imported, and the library's own auto-cleanup silently never
registers. Each test's rendered DOM tree is left mounted into the next
test's `document.body`, so `getByTestId` (and similar single-match queries)
start finding duplicates as soon as a file has more than one test that
renders the same testid.

## Fix
`apps/web/vitest.setup.ts` now imports `cleanup` from
`@testing-library/react` and `afterEach` from `"vitest"` directly, and
registers `afterEach(() => cleanup())` itself instead of relying on
`@testing-library/react`'s global-detection. This runs for every test file
via `test.setupFiles` in `vitest.config.mts`.
Commit: `feat(web): health page, readiness route and typed api client`
(surfaced while writing `src/components/health/health-status.test.tsx`,
Task 9).

## Prevention
Any new `*.test.tsx` file that renders more than once (multiple `it()`
blocks, or a `render()` inside a loop/helper) is now covered automatically
by the shared setup file — no per-file `afterEach(cleanup)` needed. If
`vitest.config.mts` ever turns on `test.globals: true`, this explicit
registration becomes redundant but still harmless (double `cleanup()` is a
no-op on an already-clean DOM).
