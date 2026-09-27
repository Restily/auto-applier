# PRD: AutoApplier — multi-channel automatic job applications

_Owner: Team Lead · Created 2026-09-27 · Source spec: docs/superpowers/specs/2026-09-27-auto-applier-design.md_

## Vision
Job seekers stop spending hours a day scrolling LinkedIn, Telegram channels and job boards and copy-pasting cover letters. AutoApplier finds every relevant vacancy across these sources, scores it against the user's profile and sends a personalized application from the user's own email, Telegram or LinkedIn account within safe limits. The user only reviews what matters and answers recruiters.

## Users and jobs-to-be-done
| Persona | Context | Job to be done | Current alternative |
|---|---|---|---|
| Alex, relocating engineer (CIS, mid/senior) | Remote/relocation roles abroad; LinkedIn + 20+ Telegram job channels | Get the CV to every relevant vacancy fast, with a message that doesn't look like spam | 1–2 h/day of scrolling and copy-paste, Easy Apply by hand |
| Maria, CIS specialist (QA/design/PM) | Mostly Telegram channels, RU-speaking companies | Never miss a vacancy posted in a channel; reach the recruiter first | Dozens of channel subscriptions, DMing recruiters by hand |
| Sam, international job seeker (EN) | LinkedIn and remote job boards | Apply to many good-fit remote roles without evenings of forms | LazyApply/Sonara-type tools (LinkedIn only), manual applying |
| Operator (platform owner) | Runs the platform | Keep sources healthy, curate Telegram channels, help users with credits | — |

## Problems
1. Vacancies are scattered across LinkedIn, hundreds of Telegram channels and many job boards; nobody sees them all, and the best ones close fast.
2. Applying is repetitive: the same CV, a slightly different letter, the same form answers, dozens of times a day.
3. Copy-paste mass messages get ignored, and mass sending gets accounts restricted.
4. Hiring posts hide the contact (email, @username) in free text; existing auto-apply tools ignore them.

## User stories
Stories live on the board (`board.py list --type story`), with their acceptance criteria; this section is the narrative index.
| ID | Story | Priority | Milestone | Owner |
|---|---|---|---|---|
| S-001 | Sign up, sign in, sign out and password reset with free credits | P0 | M1 | frontend-dev |
| S-002 | Sign in with Google | P1 | M1 | frontend-dev |
| S-003 | Upload a resume and get an AI-extracted profile | P0 | M1 | frontend-dev |
| S-004 | Fill and edit the profile manually | P0 | M1 | frontend-dev |
| S-005 | Interface in English and Russian | P0 | M1 | frontend-dev |
| S-006 | Export my data and delete my account | P1 | M1 | backend-dev |
| S-007 | Saved job searches with filters | P0 | M2 | frontend-dev |
| S-008 | Ingest vacancies from job aggregators including Hirify and HireHi | P0 | M2 | backend-dev |
| S-009 | Ingest vacancies from Telegram job channels | P0 | M2 | backend-dev |
| S-010 | Matched vacancy feed with score and reasons | P0 | M2 | frontend-dev |
| S-011 | Manual apply with an AI cover letter | P0 | M2 | frontend-dev |
| S-012 | Operator back office: Telegram channel catalog and source health | P1 | M2 | frontend-dev |
| S-013 | Connect an email mailbox (Gmail or SMTP) | P0 | M3 | backend-dev |
| S-014 | Connect a Telegram account | P0 | M3 | backend-dev |
| S-015 | Review queue and sending applications by email and Telegram | P0 | M3 | backend-dev |
| S-016 | Autopilot with daily limits, pacing and no repeat contacts | P0 | M3 | backend-dev |
| S-017 | Application history and credit ledger | P0 | M3 | frontend-dev |
| S-018 | Install and pair the Chrome extension | P0 | M4 | frontend-dev |
| S-019 | Collect LinkedIn Jobs into the feed | P0 | M4 | frontend-dev |
| S-020 | Easy Apply automation | P0 | M4 | frontend-dev |
| S-021 | Hiring posts on LinkedIn to applications by email or Telegram | P0 | M4 | frontend-dev |
| S-022 | Plans and Stripe subscription | P0 | M5 | backend-dev |
| S-023 | Pay with crypto (USDT) | P0 | M5 | backend-dev |
| S-024 | Pay with Telegram Stars | P0 | M5 | backend-dev |
| S-025 | Credit lifecycle and email notifications | P0 | M5 | backend-dev |
| S-026 | Operator tools for credits and payments | P1 | M5 | frontend-dev |

Acceptance criteria rules: Given/When/Then, observable in the UI or API, include negative and edge cases, no implementation details.

### Product rules (referenced by the acceptance criteria; defaults the product owner may change)
- **Credits:**
  - 20 free credits at sign-up, granted once;
  - 1 credit = 1 application actually sent (email, Telegram DM or Easy Apply);
  - a failed send refunds the credit;
  - preparing, reviewing, skipping and manual apply are free (fair use: 30 AI cover letters/day for manual apply);
  - unused monthly credits do not roll over.
- **Plans (placeholder prices):**
  - Basic: $15/month, 300 credits;
  - Pro: $29/month, 1000 credits;
  - Stripe renews monthly;
  - USDT and Telegram Stars buy 30-day prepaid periods at equivalent prices.
- **Daily send limits** (the user may lower them, never exceed the maximum):

  | Channel | Default | Maximum |
  |---|---|---|
  | Telegram DMs | 10 | 20 |
  | Email | 30 | 50 |
  | LinkedIn Easy Apply | 25 | 50 |

  Random pauses separate consecutive sends in the same channel.
- **De-duplication:**
  - never two applications to the same vacancy (across sources);
  - autopilot never contacts the same recruiter contact twice within 14 days.
- **Autopilot:**
  - opt-in per search; threshold 70 by default;
  - below-threshold items go to the review queue;
  - pauses at zero balance.
- **Channel priority:** Easy Apply → email → Telegram DM. The user can reorder the channels.
- **Vacancy age:** vacancies older than 30 days are never shown.
- **LinkedIn:**
  - works only through the paired Chrome extension while the user's Chrome is open;
  - the platform never sends LinkedIn messages automatically.
- **Consent:** every channel connection requires accepting a risk notice first.

## Non-functional requirements
- **Performance budget** (local, production build):
  - LCP < 2.5 s on key pages at a mid-range mobile profile;
  - API p95 < 300 ms for reads;
  - feed first page < 1 s with 10k vacancies;
  - resume extraction < 60 s;
  - cover letter < 20 s;
  - an approved application is sent within 5 min, subject to limits.
- **Freshness:**
  - aggregators polled at least every 30 min;
  - Telegram channels within 15 min of posting;
  - LinkedIn: Jobs at most hourly, posts every 2 h (while the extension is active).
- **Reliability:**
  - one failing source never blocks the others;
  - AI outages delay processing but lose no data;
  - sending is idempotent: no duplicate applications on retries;
  - payment webhooks are idempotent and signature-verified.
- **Accessibility:** WCAG 2.2 AA for the web app and the extension's UI.
- **Security & privacy:**
  - RLS on every table: users see only their own data; operator tools require the operator role;
  - user secrets (Telegram sessions, OAuth tokens, SMTP passwords, extension tokens) are encrypted at rest, never returned to the browser, and deleted on disconnect or account deletion;
  - least-privilege scopes (e.g. send-only for Gmail);
  - resume files are private;
  - an audit trail of every sent application;
  - data export and full account deletion.
- **Localization:**
  - UI in English and Russian (browser default, switchable, persisted);
  - cover letters in the vacancy's language;
  - no hard-coded UI strings.
- **Supported platforms:**
  - web: the latest two versions of Chrome, Firefox, Safari and Edge; widths 360–1440 px;
  - extension: Chrome/Chromium desktop (Manifest V3).
- **Integrations & testability:**
  - every third party (LinkedIn, Telegram, Gmail/SMTP, LLM, Stripe, crypto gateway, Telegram Bot API) sits behind an adapter with a fake and recorded fixtures;
  - tests and QA never touch real accounts or real money;
  - LLM provider is pluggable: Claude by default, others by configuration.

## Out of scope (MVP)
- Company ATS forms (Greenhouse, Lever, Workable, Ashby…).
- Hard-to-parse RU aggregators (hh.ru, SuperJob…).
- Tailored resume PDF per vacancy.
- Reading the inbox or Telegram chats to detect or answer recruiter replies. Automated LinkedIn messages.
- Mobile apps. Browsers other than Chrome for the extension.
- Employer/recruiter side, teams, referral program.
- YooKassa / RU cards.

## Success metrics (closed beta)
- Activation ≥ 40%: sign-up → profile complete + ≥1 channel connected + ≥1 application sent within 24 h.
- Median time from sign-up to first sent application ≤ 10 min.
- Send success rate ≥ 95% (sent / attempted).
- Account restriction incidents < 2% of connected Telegram/LinkedIn accounts per month.
- ≥ 70% of reviewed applications approved (not skipped) at the default threshold.
- Free → paid conversion ≥ 5% within 14 days of running out of free credits.

## Assumptions and open questions
- **Assumption:** Hirify and HireHi expose data that can be collected without logging in (API, RSS or public pages). If one can't, it is deferred with a note. The other aggregators still count toward S-008.
- **Assumption:** a curated seed list of ≥ 20 public Telegram job channels (EN and RU) is compiled by the team from public sources, and the operator refines it.
- **Assumption:** the crypto gateway and Telegram Stars are built against sandboxes or fakes. Live accounts, API keys, legal entity and tax setup are the owner's responsibility at launch.
- **Assumption:** Terms of Service and Privacy Policy are placeholders until the owner provides final texts.
- **Open (owner):** final product name and domain; final prices; the choice of crypto gateway provider for production.
- **Open (owner):** live verification on real LinkedIn/Telegram/Gmail accounts before launch (checklist in the product README).

## Decision log
- 2026-09-27 — Kickoff decisions:
  - audience: international + CIS;
  - sources: all four, incl. Hirify/HireHi;
  - channels: email, Telegram DM, Easy Apply; ATS out;
  - review by default, autopilot opt-in;
  - AI in key places;
  - payments: Stripe + USDT + Telegram Stars;
  - UI in EN + RU;
  - LinkedIn via a Chrome extension;
  - risks accepted with protections;
  - Python backend, a UI component library, a pluggable LLM provider.
- 2026-09-27 — Human decision (M0 planning): background jobs use **Celery with Redis** as broker/result backend (Valkey, the BSD-licensed Redis-compatible server, runs locally; any managed Redis/Valkey in production), replacing the Postgres-based PgQueuer choice. Long delays (pacing, next-day sends) are scheduled in the database and enqueued by Celery Beat, not via long ETA tasks.
- 2026-09-27 — M1 planning decisions (architect, accepted by the lead within PRD/AUTONOMY):
  - D1: the profile editor saves partial profiles, so S-004 AC4 (the checklist lists what's missing) stays reachable. Saving is blocked only by format errors (invalid email/URL). Incomplete profiles show a "saved, still incomplete" notice; the designer confirms the copy.
  - D2/D3: operator roles (`user_roles`/`is_operator`) move to M2, where the back office needs them. The OpenAI/OpenRouter LLM adapters also move to M2: M1 ships the Claude adapter and the fake behind the pluggable registry (TD-004).
  - D4: the Google sign-in success path can't be exercised locally. It is covered by unit and DB tests plus a human live check before launch (TD-006).
  - D5: open, needs the human. Re-registering with the same email after deleting an account would grant the 20-credit sign-up bonus again.
  - LCP budget verification moves to MR (TD-005).

