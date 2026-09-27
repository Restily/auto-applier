# Roadmap

_Owner: Team Lead · 2026-09-27 · Status of each milestone lives on the board (`board.py status`)._

| Milestone | Goal (user value) | Stories | Demo | UI |
|---|---|---|---|---|
| M0 Foundations | Running skeleton: stack ADRs (Next.js web + Python API/workers + Supabase + Chrome extension MV3 + pluggable LLM), local Supabase, design system, test harness with third-party fakes, CI | T-001…T-004 | `app.sh start` → health page shows DB and queue OK; green `quality-gate full` | ✓ |
| M1 Onboarding & profile | A new user signs up, gets 20 credits, turns a resume into a structured profile, in EN or RU | S-001, S-002, S-003, S-004, S-005, S-006 | Sign up → upload a PDF resume → edit the extracted profile → switch to Russian → export data / delete the account | ✓ |
| M2 Vacancy feed | The user sees fresh vacancies from job boards (incl. Hirify/HireHi) and Telegram channels, scored against their profile, and applies manually with an AI cover letter (free tier value) | S-007, S-008, S-009, S-010, S-011, S-012 | Create a search → feed of fixture-ingested vacancies with scores and reasons → "Apply manually" with a generated letter → operator sees source health | ✓ |
| M3 Auto-apply via email & Telegram | Applications are sent from the user's own mailbox and Telegram account, via the review queue or autopilot within safe limits, and spend credits | S-013, S-014, S-015, S-016, S-017 | Connect fake Gmail and Telegram → approve from the queue → sent, credit deducted → autopilot respects limits → history and ledger | ✓ |
| M4 LinkedIn via Chrome extension | LinkedIn Jobs and hiring posts flow into the feed; Easy Apply is automated in the user's browser | S-018, S-019, S-020, S-021 | Pair the extension → collect jobs from fixture LinkedIn pages → Easy Apply on a fixture form → hiring post → email application | ✓ |
| M5 Billing & credits | Users pay by card (Stripe), USDT or Telegram Stars; credits renew, expire and pause autopilot at zero | S-022, S-023, S-024, S-025, S-026 | Buy Basic in Stripe test mode → credits added → spend to 0 → autopilot pauses and an email arrives → pay by fake USDT/Stars → resumes | ✓ |
| MR Release | Hardening: security audit (secrets, RLS, extension token, webhooks), a11y, performance, full regression, product README with the human live-verification checklist | — | Full end-to-end demo on a clean clone | ✓ |

Principles:
- Every milestone is a vertical, demoable slice.
- P0 first; 3–6 stories per milestone.
- Scope cuts go to P2/P3 first; P0/P1 cuts need the human.
- Ordering rationale: the free, low-risk value comes first (profile → feed → manual apply). Next come the account-based channels (email/Telegram), then LinkedIn through the extension (highest risk, needs the M3 sending pipeline), then monetization.
- All third-party integrations are built against fakes and recorded fixtures. Live checks on real accounts and live payment keys are human steps before launch.
