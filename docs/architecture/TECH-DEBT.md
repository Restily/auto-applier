# Tech debt

_Owner: Architect. Deliberate shortcuts and drift found during gardening._

| ID | Area | Debt | Why taken | Risk | Pay by (milestone) | Task |
|---|---|---|---|---|---|---|
| TD-001 | web / i18n (paid by M1 Task 4) | The M0 `/health` page uses literal English strings; next-intl is not wired yet | i18n implementation belongs to S-005 (M1); M0 stays lean | Low: internal page; lint rule `no-literal-string` arrives with next-intl | M1 | S-005 |
| TD-002 | toolchain | Pinned below latest: TypeScript ~6.0 (not 7), ESLint 9 (not 10), Playwright Test 1.56.1 (not 1.63) | typescript-eslint/eslint-plugin-react peer ranges; Playwright pinned to the preinstalled Chromium 1194 in the cloud VM | Medium: missing fixes; upgrade friction grows | MR | — |
| TD-003 | compliance | No automated dependency-license check (policy in ADR-0011 is enforced by review only) | Keep M0 lean | Medium: a copyleft transitive dependency could slip in | MR | — |
| TD-004 | backend / LLM | OpenAI and OpenRouter adapters (ADR-0006) not built in M1; only Anthropic + fake are registered | M1 only needs one real provider; all tests use the fake | Low: `LLM_PROVIDER=openai` fails fast with LLMConfigError | M2 | — |
| TD-005 | qa / performance | PRD LCP < 2.5 s is not measured in M1 (the app runs `next dev` via app.sh; a production-build perf run needs its own start path) | Keep M1 scope; TEST-STRATEGY planned it for M1 | Medium: slow pages found late | MR | — |
| TD-006 | auth | Google OAuth success path is only unit/DB-tested; GoTrue discovers Google's OIDC endpoints, so no local fake is possible | No real Google accounts in tests (AUTONOMY) | Medium: a misconfiguration surfaces only at launch | MR (README live-check item, human) | — |
