# Tech debt

_Owner: Architect. Deliberate shortcuts and drift found during gardening._

| ID | Area | Debt | Why taken | Risk | Pay by (milestone) | Task |
|---|---|---|---|---|---|---|
| TD-001 | web / i18n | The M0 `/health` page uses literal English strings; next-intl is not wired yet | i18n implementation belongs to S-005 (M1); M0 stays lean | Low: internal page; lint rule `no-literal-string` arrives with next-intl | M1 | S-005 |
| TD-002 | toolchain | Pinned below latest: TypeScript ~6.0 (not 7), ESLint 9 (not 10), Playwright Test 1.56.1 (not 1.63) | typescript-eslint/eslint-plugin-react peer ranges; Playwright pinned to the preinstalled Chromium 1194 in the cloud VM | Medium: missing fixes; upgrade friction grows | MR | — |
| TD-003 | compliance | No automated dependency-license check (policy in ADR-0011 is enforced by review only) | Keep M0 lean | Medium: a copyleft transitive dependency could slip in | MR | — |
