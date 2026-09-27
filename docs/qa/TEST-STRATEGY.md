# Test strategy

_Owner: QA Automation · 2026-09-27_

Project-wide strategy, written at M0 (T-004 AC1) per the M0 plan's Task 10. It applies to every milestone: M0 establishes the pyramid, harness and fakes for the skeleton (health, LLM, queue); M1–M5 add packages (extension in M4), ports (mail, Telegram, payments, job sources) and tables, but extend this document's structure rather than replace it. Sources: `docs/architecture/ARCHITECTURE.md` (Testing approach, data model, RLS patterns), ADR-0006 (LLM), ADR-0007 (adapters/fakes), ADR-0010 (i18n), ADR-0011 (local runtime), ADR-0012 (Celery/Redis), `docs/product/PRD.md` (NFRs), `team/config.sh` / `team/bin/quality-gate.sh`.

## Pyramid

Target split (`test-pyramid` skill): unit/component ~70%, integration/API/DB+RLS ~20%, e2e+a11y ~10%. Every level below has one owner who writes it first (TDD) and qa-automation, who reviews gaps and adds the levels marked "you".

| Level | Scope — must cover | Must **not** cover | Tool | Location | Owner |
|---|---|---|---|---|---|
| Web unit/component | pure `lib/*.ts` helpers, view-model mapping, component rendering/interaction in isolation | network calls to the real API, Supabase | Vitest + Testing Library + jsdom | `apps/web/src/**/*.test.ts(x)` | frontend-dev (TDD), qa-automation reviews |
| Backend unit | `domain` (pure), `services` with fake ports, `adapters` logic that doesn't need a live backend (e.g. the LLM fake, Celery task bodies via `.apply()`) | a live Postgres or Valkey | pytest + pytest-asyncio | `backend/tests/unit/` | backend-dev (TDD), qa-automation reviews |
| Backend integration | repositories, health probes, Celery round-trips, the API against a **local** Supabase + Valkey | mocking the DB/queue — these run for real, locally, with unique test data | pytest + local Supabase + local Valkey | `backend/tests/integration/` | backend-dev (TDD), qa-automation extends |
| Backend contract | one shared suite per port (`ports/<name>`), parametrized over the fake and the real adapter wired to recorded fixtures | anything that reaches a real third party | pytest | `backend/tests/contract/<port>/` | backend-dev (TDD), qa-automation reviews |
| DB/RLS — schema invariants | RLS-by-default trigger, per-table policies exist and match the documented pattern (O/C/B/R) | app-level business logic | pgTAP | `supabase/tests/database/` | backend-dev (migration TDD), qa-automation |
| DB/RLS — as real users | the RLS matrix: anon / owner / other authenticated user × select/insert/update/delete, per table | schema shape (that's pgTAP's job) | Vitest (node) + supabase-js with real throwaway JWTs | `tests/integration/rls/` | qa-automation |
| Black-box integration | API + web route handlers over HTTP, cross-package contracts (OpenAPI/DB-types drift, no-secrets-leaked), CI workflow shape | UI rendering | Vitest (node) | `tests/integration/` | qa-automation |
| Extension unit (M4) | service-worker message handling, pairing state, popup/options logic, with `chrome.*` mocked | real Chrome, real LinkedIn | Vitest | `apps/extension/**/*.test.ts` | frontend-dev (TDD), qa-automation reviews |
| Extension e2e (M4) | the unpacked build loaded into Chromium against the recorded fixture LinkedIn site (collection, Easy Apply) | a real LinkedIn account (never) | Playwright Test (persistent context) | `tests/e2e/extension/` | qa-automation |
| e2e + a11y | critical user journeys end to end, accessibility scans, responsive layout (360 px mobile) | anything a lower level can prove faster/more reliably | Playwright Test + `@axe-core/playwright` | `tests/e2e/` | qa-automation |

Notes:
- "Backend contract" only exists for a port once it has a real adapter; M0 ships only the LLM and queue ports, so `backend/tests/contract/` starts empty and gains a suite per port as M1+ add real adapters (LLM: M1; mail/Telegram/payments/sources: M3–M5). Until a port has a real adapter, its fake is still exercised by unit/integration tests, just not by a fake-vs-real contract suite.
- Celery tasks are thin sync wrappers (ADR-0012): unit tests call the task function directly (`task.apply(args=…).get()`, no broker) or test the underlying async service it delegates to; only the round-trip through a real broker (task registration, routing, result backend) needs the integration level.
- e2e never talks to a live third party — pages under `/dev/fake/*` and the fixture LinkedIn site stand in (see Third-party fakes).

## Third-party fakes

Every third party sits behind a port (`autoapplier/ports/<name>.py`) with a real adapter and a fake adapter (`autoapplier/adapters/<name>/{real,fake}.py`), chosen only in `wiring.py` from settings; `APP_ENV=test` forces fakes wherever a setting would otherwise pick a real one (enforced today for the LLM by `Settings` validation — `test_test_env_requires_fake_llm` — the same guard is added for every new `*_PROVIDER`/`*_MODE` setting as it's introduced, and contract review checks it at that milestone).

| Port | Real adapter | Fake / local stand-in | Fixtures | Contract test |
|---|---|---|---|---|
| `llm.py` (`LLMProvider`) | `anthropic` SDK default, `openai` SDK for OpenAI/OpenRouter (M1) | `adapters/llm/fake.py` — deterministic, fingerprinted, scriptable failures | `backend/tests/fixtures/llm/<task>.json` | `backend/tests/contract/llm/` (from M1) |
| `queue.py` (`JobQueue`) | `adapters/queue/celery_factory.py` + `CeleryJobQueue` (real local Valkey — this is infrastructure, not a fake) | `adapters/queue/fake.py` `InMemoryJobQueue` | — | both implementations pass the same Protocol-conformance tests (`test_queue_fake.py`, `test_celery_queue.py`) |
| `mail.py` (`MailSender`, M3) | `aiosmtplib` (SMTP), Gmail REST API via `httpx` | no separate fake needed in dev/test: real SMTP sends land in the **Supabase local mail catcher** (Mailpit/Inbucket on the local stack) | — | `backend/tests/contract/mail/` (M3) |
| `telegram_user.py` (`TelegramUserClient`, M3) | Telethon (MTProto) | scripted event-sequence fake | `backend/tests/fixtures/telegram_user/` | `backend/tests/contract/telegram_user/` |
| `telegram_bot.py` (`TelegramBot`, Bot API/Stars, M3/M5) | `httpx` against the Bot API | fake + `/dev/fake/telegram-login` page (local/test only) | `backend/tests/fixtures/telegram_bot/` | `backend/tests/contract/telegram_bot/` |
| `payments.py` — `StripeGateway` (M5) | `stripe` SDK, test mode | fake + `/dev/fake/checkout` page | `backend/tests/fixtures/stripe/` | `backend/tests/contract/payments/stripe/` |
| `payments.py` — `CryptoGateway` / USDT (M5) | provider TBD (owner decision, PRD open question) | fake + `/dev/fake/usdt-invoice` page | `backend/tests/fixtures/usdt/` | `backend/tests/contract/payments/crypto/` |
| `job_sources.py` (`VacancySource`, incl. Hirify/HireHi, M2) | `httpx` + RSS/JSON parsers | recorded fixture responses per source | `backend/tests/fixtures/sources/<source>/` | `backend/tests/contract/job_sources/` |
| LinkedIn (extension, M4) | never a real adapter in tests | static fixture site served locally | `tests/fixtures/linkedin/*.html` | `tests/e2e/extension/` runs against the fixture site |

Rules:
- **No real accounts, no real money, no live LLM** — in any automated test, ever. `APP_ENV=test` is the enforcement point; AUTONOMY.md additionally forbids it for the whole team outside a human-provided sandbox key.
- Local-UI fakes (fake Stripe/USDT/Telegram-login pages) are mounted only when `APP_ENV` is `local` or `test`, never reachable otherwise.
- A fake is only trustworthy as long as it agrees with the real adapter on the same fixtures — that's what the contract-test suite per port enforces; a fake that drifts fails the same suite as the real adapter.

## Test data isolation

### Postgres
- Every test creates its own rows with unique identifiers — emails as `qa+<uuid4>@example.test` (or `<role>+<uuid4>@example.test` for other synthetic actors), unique ids/slugs elsewhere. No test reads or mutates another test's rows.
- No test ever runs `TRUNCATE`, a broad `DELETE`, or `supabase db reset` against the shared local database while other roles might be testing.
- `supabase db reset` is a **dev-only, migration-time** operation (see M0 Task 2): run at most once per migration change, by backend-dev, and announced in that task's report because it wipes local data — never run casually by a test or by qa-automation mid-milestone.
- `supabase/seed.sql` is baseline-only ("Seed data for local dev; owned by qa-automation. Tests create their own unique data.") — never a substitute for per-test data, and never mutated by a test.
- RLS-as-real-users tests sign in as throwaway users created per test run (unique email), never a shared fixture account another test could also be mutating.

### Redis / Valkey
- Every test touching Redis gets a fresh, unique key prefix `aa:test:<uuid4>:` (fixture `key_prefix` in `backend/tests/integration/conftest.py`); teardown deletes only the keys `SCAN MATCH <prefix>*` finds — never a blanket delete.
- **`FLUSHALL` / `FLUSHDB` are forbidden everywhere in test code**, including ad hoc debugging: the same Valkey instance is shared with whatever real `dev:worker`/`dev:beat` processes happen to be running locally.
- A Celery integration test that needs an in-process worker uses a **unique queue name** (`test-<uuid4>`) for both the enqueue call and the worker's `queues=[…]`, so its tasks are never consumed by — and never steal tasks from — the real `dev:worker` process (which only listens on `default`).
  - **Known risk, flagged in the M0 contract review:** `test_ping_roundtrip_through_valkey`'s documented fallback ("if the installed Celery doesn't accept `queues`, use `default`") reintroduces a shared queue with any concurrently running dev worker/Beat. If that fallback is ever exercised, the test must still avoid the literal `default` queue (e.g. set `task_default_queue` to the unique name for that app instance) rather than share it — see gap 3 of the M0 contract review.
- No test relies on Celery `eta`/`countdown` for timing — forbidden product-wide (ADR-0012, redelivery risk on the Redis transport); delayed work is `scheduled_at` in Postgres, dispatched by Beat. `test_enqueue_never_schedules_eta_or_countdown` guards this at the adapter level.
- The heartbeat key (`aa:heartbeat:worker`, unprefixed) is real, shared, disposable state written by the actual worker/Beat. Tests only *read* it at the black-box/e2e layer (against the live system), never assert exact timing beyond the documented staleness window, and never write to it directly.

### Concurrency
Multiple roles may run tests against the same local Supabase and Valkey at the same time; isolation comes entirely from unique data/keys/queues above, never from locking other roles out of shared services.

## Commands

| Command | Runs | When |
|---|---|---|
| `bash team/bin/quality-gate.sh fast` | lint + typecheck + unit (web + backend) | every task, before handing in work (dev-gate hook) |
| `bash team/bin/quality-gate.sh full` | fast + integration + build + e2e | milestone gate (`board.py gate <M>`), CI on every push |
| `bash team/bin/quality-gate.sh e2e` | e2e only | ad hoc re-run after fixing a Playwright test |
| `npm run -s lint` (`lint:py`, `lint:web`) | ruff check + ruff format --check + import-linter; ESLint across npm workspaces | part of `fast`/`full` |
| `npm run -s typecheck` (`typecheck:py`, `typecheck:web`, `typecheck:tests`) | mypy --strict; `next typegen && tsc --noEmit`; `tsc -p tests` | part of `fast`/`full` |
| `npm run -s test:unit` (`test:unit:py`, `test:unit:web`) | `pytest tests/unit`; `vitest run` (web) | part of `fast`/`full` |
| `npm run -s test:integration` | `app.sh start` + `test:integration:py` (needs local Valkey) + `test:db` (pgTAP) + `test:integration:web` (black-box) + `check:db-types` + `check:openapi` | part of `full` |
| `npm run -s test:db` (= `bash scripts/supabase.sh test db`) | the pgTAP suite | part of `test:integration`; standalone after a migration change |
| `npm run -s test:e2e` | `app.sh start` + `playwright test` | part of `full`; standalone during e2e work |
| `bash scripts/valkey.sh start\|stop\|status` | local Valkey container lifecycle (idempotent `start`; never flushes data) | before backend integration tests; `npm run dev` runs it automatically |
| `bash team/bin/app.sh start\|stop\|status\|url\|logs` | the **only** way to run the app under test | e2e, black-box integration, manual/exploratory QA |

CI (`.github/workflows/ci.yml`) runs `bash team/bin/quality-gate.sh full` on every push and PR, after installing Node 22, uv, the Supabase CLI and Chromium, and starting Valkey the same way local dev does; on failure it uploads `.team/state/*.log`, `playwright-report/` and `test-results/`.

## AC coverage rule

Every acceptance criterion of every story/task/bug gets at least one automated test at the lowest level that can actually prove it; a criterion describing a user-visible journey also gets an e2e test, not only a unit test of its parts. The mapping is written down twice: once per milestone as the **contract review** (before building — this document's sibling check, run against the architect's plan for every AC), and once as the **AC coverage table** in `docs/qa/reports/<M>-tests.md` (after building — AC → automated test, or a justified manual-only note; "works correctly" or a bare "checked manually" is never accepted as that justification). Evidence — the failing/passing test path, or a screenshot/trace for a manual or exploratory check — lives under `docs/qa/evidence/<M>/`. A milestone's test report can only say `Verdict: PASS` when every one of its ACs is covered this way.

## Flakiness policy

- No `waitForTimeout`/sleeps to synchronize a test with the system under test. Use polling (`expect.poll`, health-probe timeouts that are themselves bounded and tested) or Playwright's built-in auto-waiting and web-first assertions.
- Retries: `0` locally, `1` in CI only (`playwright.config.ts`: `retries: process.env.CI ? 1 : 0`) — a retry recovers from CI noise, it never hides a real flake.
- Semantic locators first (`getByRole`, `getByLabel`, `getByText`); `getByTestId` is last resort, requested from frontend-dev via a task when no semantic locator exists (the M0 health page's status elements are an accepted exception: a status chip's machine-readable state has no natural role, so it's asserted by `data-testid` **and** by its exact text content, never by color).
- A test that fails intermittently is **quarantined**, never deleted or weakened: mark it `test.fixme('<B-id>: reason')` only when the underlying bug is deferred (not critical/high), file the bug or a `T-` task on the board, and keep the fixme list in the milestone test report.
- A `playwright-test-healer` may fix locator/timing drift only; it must never weaken an assertion — a real product defect becomes a bug, not a loosened test.
- Once a flaky test's root cause is understood, it's worth recording: non-obvious causes go to `docs/solutions/` (`board.py scaffold solution <slug>`) so nobody re-debugges the same flake.

## Coverage expectations

Target: **≥ 70% line coverage** for logic worth measuring — backend `domain`/`services` (pure rules and orchestration) and web `lib/*.ts` (view-model mapping, pure helpers). Excluded from the target: generated files (`schema.gen.ts`, `database.types.ts`, `openapi.json`), thin route/adapter passthrough code, and shadcn/ui primitives.

Not yet gated in CI at M0: `backend/pyproject.toml`'s dev group has no coverage plugin, and `vitest.config.mts` has no `coverage` block. M0's binding gate is the **AC coverage rule** above, not a percentage. Wiring `pytest-cov` and Vitest's `v8` coverage provider into `test:unit`, with a threshold, is a task for qa-automation at the start of the first milestone with real domain logic to measure (M1) — tracked so it isn't silently dropped.

## Performance checks

PRD budgets have no feature to measure yet at M0 beyond the health endpoint; each lands with the milestone that ships the feature it bounds:

| Budget (PRD) | Level / tool | Lands |
|---|---|---|
| LCP < 2.5 s, mid-range mobile | Playwright + web-vitals (or Lighthouse CI) in `tests/e2e/perf/` | M1 — first real page |
| API p95 < 300 ms for reads | small load probe (autocannon/k6-style) over N requests in `tests/integration/perf/` | M2 — first list/read endpoints with realistic data |
| Feed first page < 1 s @ 10k vacancies | seeded 10k-row perf fixture + timed request | M2 — vacancy feed (S-010) |
| Resume extraction < 60 s | integration test timing the orchestration around the LLM port (the fake is near-instant, so this bounds our overhead, not model latency; real-provider timing is a human pre-launch step per PRD's open question) | M1 (S-003) |
| Cover letter < 20 s | same pattern | M2 (S-011) |
| Approved send within 5 min | Celery Beat dispatch-latency integration test (enqueue-to-claim timing against real Valkey) | M3 (S-015/S-016) |

M0 baseline already in place: every `HealthReport` check carries `latency_ms`; the black-box integration test asserts it's numeric and non-negative, an early signal if a probe regresses badly — this is a smoke signal, not a budget gate.

## Accessibility

Target: **WCAG 2.2 AA** for the web app and the extension UI (PRD NFR). `@axe-core/playwright` is wired into `tests/e2e/` specs from **M1** onward (the first real UI beyond the minimal M0 health page): every journey's key screens get `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()` with zero `serious`/`critical` violations allowed. M4 adds the same scan for the extension's popup/options pages.

Already true at M0 without axe tooling, and kept as the seed of this suite: `tests/e2e/health.spec.ts` asserts status is conveyed by **text** ("OK"/"Down"), never color alone, and that there's no horizontal scroll at a 360 px viewport (`chromium-mobile` project) — both accessibility-relevant and already automated. They're not a substitute for axe once there's a real design system to check (color contrast, landmarks, focus order, form labeling).

Manual spot checks (keyboard-only pass, screen-reader smoke) stay with qa-manual (`exploratory-qa`); axe covers the automatable subset continuously in CI.

## Localization (EN/RU) completeness

From **M1** (S-005, `next-intl` wired per ADR-0010):
- A Vitest unit test diffs the key sets of `apps/web/messages/en.json` and `ru.json` and fails on any key present in one but not the other, either direction.
- The same pattern in pytest for the backend's notification-email catalogs `backend/src/autoapplier/i18n/{en,ru}.json`.
- From M4, the same pattern for the extension's `_locales/en/messages.json` vs `_locales/ru/messages.json`.
- `eslint-plugin-i18next`'s `no-literal-string` rule (`jsx-text-only`) on `apps/web/src/**/*.tsx` is a lint failure (part of the `fast` gate), not a test, but enforces "no hard-coded UI strings" continuously alongside the key-parity tests.
- e2e smoke: at least one journey runs with the RU locale and asserts no raw i18n key leaks into rendered text (nothing matching an unresolved-key shape like `^[a-z]+(\.[a-z]+)+$`) and no layout break from longer Russian strings on key screens.

M0 status: the health page uses literal English strings by design (TECH-DEBT TD-001, ADR-0010) — no i18n test applies to it. This section is the binding policy starting M1.
