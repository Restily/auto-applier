# ADR-0009: Payment providers (Stripe, USDT gateway, Telegram Stars) and credit ledger

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
Plans (Basic $15/300 credits, Pro $29/1000 credits): Stripe renews monthly; USDT and Telegram Stars buy 30-day prepaid periods at equivalent prices. 20 free credits once at sign-up; 1 credit per sent application; failed send refunds; unused monthly credits do not roll over; autopilot pauses at zero. Webhooks must be idempotent and signature-verified. The team works only with sandboxes/fakes; the production crypto provider is an open owner decision.

## Options considered
Card: 1. **Stripe Checkout + Billing subscriptions** (hosted pages, test mode, signed webhooks). 2. Paddle/LemonSqueezy (merchant of record — a business decision for the owner, not MVP).
Crypto: A. **A provider-neutral `CryptoGateway` port** ("create invoice → hosted pay page → signed callback") with a fake; concrete provider (e.g. NOWPayments, Cryptomus, CryptoCloud) chosen by the owner at launch. B. Self-hosted chain watcher (TRON/ETH nodes) — out of scope.
Stars: I. **Telegram Bot API invoices in `XTR`** (`createInvoiceLink`, `pre_checkout_query`, `successful_payment`) through our bot. II. Third-party wrappers — unnecessary.

## Decision
- Ports: `PaymentGateway` implementations `StripeGateway`, `CryptoGateway` (fake in MVP; real provider adapter added when the owner picks it), `TelegramStarsGateway` (via the `TelegramBot` port). All have fakes (ADR-0007); fake pay pages under `/dev/fake/*`.
- **Webhooks:** `/webhooks/stripe`, `/webhooks/crypto`, `/webhooks/telegram` verify signatures/secret tokens before parsing, store the raw event in `payment_events(provider, provider_event_id UNIQUE, payload, received_at, processed_at)` and enqueue processing; duplicates are no-ops (unique constraint).
- **Credit ledger:** append-only `credit_ledger(id, user_id, delta, reason: signup_grant|plan_grant|application_sent|send_refund|period_expiry|operator_adjustment, ref_type, ref_id, created_at)` with a **unique (reason, ref_type, ref_id)** so grants, spends and refunds are idempotent; balance = SUM(delta) per user (view `credit_balances`, later materialized if needed). Users read their own ledger (RLS); only the backend writes. Spending happens in the same transaction that marks an application as `sending`; a failure writes a `send_refund` row.
- **Plans and periods:** `plans` (code, price_usd_cents, credits, price_xtr, price_usdt), `subscriptions(user_id, provider, provider_ref, status, current_period_start/end)`. Period start grants the plan credits; period end writes a `period_expiry` row that zeroes the remaining **plan** credits (free sign-up credits are separate reason and never expire, unless the owner decides otherwise).
- Prices are placeholders in a seed migration; changing them is a human decision.

## Consequences
- Positive: one ledger for all providers; idempotency by constraint; switching crypto provider is an adapter change.
- Negative: expiry logic must distinguish credit sources (covered by M5 unit tests).
- Follow-ups: M5 plan; live keys, legal entity and tax setup are owner tasks (PRD assumptions).
