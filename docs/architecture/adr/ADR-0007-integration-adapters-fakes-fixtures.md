# ADR-0007: Integration adapters with fakes and recorded fixtures

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
Every third party sits behind an adapter with a fake and recorded fixtures: LinkedIn pages, Telegram MTProto user accounts, Telegram Bot API/Stars, Gmail/SMTP, LLM, Stripe, the USDT gateway, plus job aggregators. The team never uses real accounts or money (AUTONOMY). Only read-only, low-rate requests to public data are allowed, to record fixtures.

## Options considered
1. **Ports & adapters in Python**: a Protocol per capability, a real adapter and a fake per port, contract tests run against both (real adapter against recorded fixtures), fakes selected by configuration.
2. Mock servers for everything (WireMock-style containers): realistic but adds infra and per-service config.
3. Mocking at call sites in tests: brittle, no reusable fakes for QA/e2e.

## Decision
- One port per capability in `autoapplier/ports/` (e.g. `llm.py`, `queue.py`, later `mail.py` `MailSender`, `telegram_user.py` `TelegramUserClient`, `telegram_bot.py` `TelegramBot`, `payments.py` `PaymentGateway`, `job_sources.py` `VacancySource`). Adapters in `autoapplier/adapters/<port>/{real_name}.py` and `fake.py`. Only `autoapplier/wiring.py` chooses implementations (settings `*_PROVIDER`/`*_MODE`, default `fake` in `.env.example`; `APP_ENV=test` forces fakes).
- Libraries: Telegram user accounts via **Telethon** (MIT; Pyrogram is LGPL → excluded); Telegram Bot API/Stars via **httpx** (plain HTTPS API); SMTP via **aiosmtplib** (MIT); Gmail via the Gmail REST API with `gmail.send` scope over httpx; Stripe via the official `stripe` SDK (MIT); aggregators via httpx + RSS/JSON parsers.
- **Fixtures:** `backend/tests/fixtures/<integration>/…` (HTTP recorded as JSON/HTML with respx; Telegram as scripted event sequences; LinkedIn as saved HTML pages served by a local static fixture site for extension e2e in `tests/fixtures/linkedin/`). Recorded fixtures are scrubbed of personal data beyond what vacancies publish.
- **Contract tests:** each port has a shared test suite (`backend/tests/contract/<port>/`) parametrized over the fake and the real adapter (real adapter wired to recorded fixtures). A fake that diverges from the real adapter fails the same suite.
- **Local fakes that the UI/e2e must see** run inside the Python process under `/dev/fake/*` routes, mounted **only when `APP_ENV` is `local` or `test`** (e.g. fake Stripe checkout page, fake USDT invoice page, fake Telegram login code screen). Email is delivered to the **Supabase local mail catcher** (Mailpit/Inbucket, SMTP on the local stack), so no extra container is needed.
- The operator's source-health view reads per-adapter fetch outcomes, so a failing source is isolated and visible (one failing source never blocks others: one queue job per source).

## Consequences
- Positive: deterministic tests and demos without accounts; QA can drive every flow in the browser.
- Negative: fakes can drift from reality — mitigated by contract tests and the human live-verification checklist before launch (README, MR).
