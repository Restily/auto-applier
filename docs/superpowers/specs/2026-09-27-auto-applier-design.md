# Product spec: AutoApplier — multi-channel automatic job applications

_Kickoff spec · 2026-09-27 · Team Lead with the human (product owner) · Status: approved in chat, see "Approval" below_
_Working name "AutoApplier"; the product owner can rename it at any time._

## 1. Idea in one paragraph
A web platform that finds relevant vacancies everywhere a job seeker would look (LinkedIn Jobs, hiring posts on LinkedIn, Telegram job channels and open job aggregators) and sends personalized applications on the user's behalf from the user's own accounts (email, Telegram, LinkedIn Easy Apply). The user signs up, uploads or fills a resume, connects accounts, sets filters, and the platform keeps applying within safe limits. Users start with free credits (1 credit = 1 application sent) and then pay a subscription.

## 2. Target users and job-to-be-done
**Market:** international job seekers and job seekers from the CIS (Russian-speaking) who apply to international/remote and CIS companies. The first audience is tech and tech-adjacent professionals (engineers, QA, designers, PM, analysts), because the chosen sources are strongest for them. The product is not limited to IT by design.

| Persona | Context | Job to be done | Current alternative |
|---|---|---|---|
| **Alex, relocating engineer** (CIS, mid/senior) | Looks for remote or relocation roles abroad; LinkedIn plus 20+ Telegram job channels | "Get my CV to every relevant vacancy quickly, with a message that doesn't look like spam, so I get more interviews" | 1–2 h/day scrolling channels, copy-pasting cover letters, Easy Apply by hand |
| **Maria, CIS specialist** (QA/design/PM) | Mostly Telegram channels and RU-speaking companies | "Stop missing vacancies posted in channels and answer recruiters first" | Subscribing to dozens of channels, DMing recruiters by hand |
| **Sam, international job seeker** (EN) | LinkedIn and remote job boards | "Apply to many good-fit remote roles without spending evenings on forms" | LazyApply/Sonara-type tools (LinkedIn only), manual applying |
| **Operator** (platform owner) | Runs the platform | Keep sources healthy, curate the Telegram channel catalog, help users with credits | — |

## 3. Problems
1. Vacancies are scattered across LinkedIn, hundreds of Telegram channels and many job boards. Nobody sees them all, and the good ones are gone quickly.
2. Applying is repetitive: the same CV, a slightly different message, the same form answers, dozens of times a day.
3. Mass copy-paste messages look like spam and get ignored, and mass sending gets accounts restricted.
4. Hiring posts (LinkedIn/Telegram) hide the contact (email, @username) in free text. Existing auto-apply tools ignore these posts.

## 4. Core user journeys
1. **Sign up and get started.** Register with email and password or Google, get free credits, choose UI language (EN/RU).
2. **Resume → profile.** Upload a PDF/DOCX resume. AI extracts a structured profile (titles, skills, experience, languages, location, salary expectations, links). The user reviews and edits it, or fills the profile manually without a file. The resume file is what gets attached to applications.
3. **Connect accounts.** Connect an email mailbox (Gmail or any SMTP mailbox), a Telegram account (phone + code + 2FA password), and LinkedIn by installing the platform's Chrome extension and pairing it with the account. Each connection shows its risks and needs explicit consent. It can be disconnected at any time.
4. **Set up searches.** One or more saved searches: target roles and keywords, seniority, location/remote/relocation, minimum salary, languages, exclude-words, sources, match threshold, mode (review or autopilot).
5. **Discover.** The platform continuously collects vacancies from all sources, structures free-text posts with AI, removes duplicates across sources, scores each vacancy against the profile (0–100 with short reasons), and shows a feed per search.
6. **Apply.** For each matching vacancy the platform prepares an application: an AI cover letter in the vacancy's language, the resume, and form answers for Easy Apply. It picks the channel: Easy Apply → LinkedIn, contact email → email, Telegram @username → Telegram DM.
   - **Review mode (default):** the user approves, edits or skips each prepared application in a queue.
   - **Autopilot mode (opt-in per search):** applications with score ≥ threshold are sent automatically within daily limits. The rest go to the review queue.
   - **Manual apply (free):** vacancies without an automatable channel (e.g. an external ATS link) show "Apply manually" with the link and a ready cover letter to copy.
7. **Track and pay.** History of applications with status (prepared, queued, sent, failed, skipped), channel, credit spent. Credit balance. Buy a subscription by card (Stripe), crypto (USDT) or Telegram Stars. When credits run out, autopilot pauses and the user is notified.

## 5. MVP scope

### Must (P0)
- Accounts: email and password sign-up, sign-in, password reset. Free credits granted once at sign-up.
- Resume upload (PDF/DOCX) with AI profile extraction, manual profile editing and filling.
- Saved searches with filters, match threshold and mode.
- Vacancy ingestion:
  - open job aggregators with official API/RSS (e.g. RemoteOK, Remotive, Himalayas, Arbeitnow, We Work Remotely);
  - Hirify and HireHi;
  - other popular sources that are easy to parse can be added later without product changes;
  - public Telegram job channels from a curated catalog, plus channels the user adds;
  - LinkedIn Jobs and LinkedIn hiring posts, collected by the Chrome extension.
- AI structuring of free-text posts (role, company, stack, location, salary, contact), cross-source de-duplication, match scoring with reasons.
- Vacancy feed per search and manual apply with a ready AI cover letter (free).
- Channel connections with explicit risk consent: email (Gmail + generic SMTP), Telegram account, LinkedIn via Chrome extension.
- Sending applications via email, Telegram DM and LinkedIn Easy Apply. Review queue (default) and autopilot (opt-in).
- Safety rules: per-channel daily limits, human-like pacing between sends, never two applications to the same vacancy, no repeat contact of the same recruiter within 14 days in autopilot.
- Credits: 1 credit per application actually sent. A failed send refunds the credit. Balance and ledger are visible to the user.
- Billing: subscription plans paid by Stripe (recurring), crypto USDT and Telegram Stars (prepaid 30-day periods). Monthly credit package. Autopilot pauses at zero balance.
- Application history with statuses.
- UI in English and Russian.
- Disconnect any channel. Delete the account together with all data (resume, sessions, tokens).

### Should (P1)
- Google sign-in.
- Operator back office: Telegram channel catalog (add/disable), source health (last successful fetch, error rate), per-user credit adjustment.
- Notifications by email: out of credits, channel disconnected or restricted, daily summary.
- Answer memory for Easy Apply questions (the user's answers are reused next time).

### Won't (this MVP)
- Company ATS forms (Greenhouse, Lever, Workable, Ashby…).
- Hard-to-parse RU aggregators (hh.ru, SuperJob, etc.).
- Tailored resume PDF per vacancy.
- Reading the user's inbox or Telegram chats to detect recruiter replies or to reply with AI.
- Mobile apps, and browser extensions other than Chrome/Chromium.
- Recruiter/employer-side product. Referral program. Teams.
- YooKassa and RU card payments.

## 6. Product rules (defaults, adjustable by the product owner)
- **Credits:** 20 free credits at sign-up. 1 credit = 1 application sent through any channel. Preparing, reviewing, skipping and manual apply are free, with a fair-use cap on AI cover letters for manual apply of 30 per day. Unused monthly credits do not roll over.
- **Plans (placeholder prices):**
  - Basic: $15/month, 300 credits;
  - Pro: $29/month, 1000 credits.
  - Crypto and Telegram Stars buy the same plans as 30-day prepaid periods at equivalent prices.
- **Daily send limits per channel** (the user may lower, never exceed):
  - Telegram DMs: 20 max, 10 by default;
  - email: 50 max, 30 by default;
  - LinkedIn Easy Apply: 50 max, 25 by default.
  - Random pauses between sends in the same channel.
- **Autopilot threshold:** a match score of 70 by default.
- **Channel priority when a vacancy has several:** LinkedIn Easy Apply → email → Telegram DM. The user can reorder the channels.
- **LinkedIn runs only while the extension is active** in the user's Chrome. Pending LinkedIn applications wait until then.

## 7. Constraints
- **Stack preferences (human):** backend and parsers in **Python**. Web UI in TypeScript/Next.js with a ready-made component library (e.g. shadcn/ui). Supabase (Postgres/Auth/Storage). Chrome extension in TypeScript. The architect records the final choices in ADRs.
- **LLM:** a provider-agnostic layer. Claude API by default, and other providers (OpenAI, OpenRouter, …) can be plugged in by configuration.
- **Integrations are built and tested against fakes and fixtures.** The team never logs into real LinkedIn/Telegram/Gmail accounts, never sends real applications, and never takes real payments (Stripe test mode or local mocks, crypto/Stars sandboxes or fakes). Live verification on real accounts is a human step with a checklist in the README.
- **Languages:**
  - UI: EN and RU.
  - Cover letters: the vacancy's language.
  - Team artifacts: English.
- **Compliance posture (accepted by the human):**
  - LinkedIn automation is against LinkedIn's User Agreement.
  - Unsolicited Telegram DMs can trigger spam restrictions.
  - The product mitigates rather than avoids these risks: explicit consent per connection, conservative limits, pacing, de-duplication, encryption of all user secrets, one-click disconnect and deletion.
  - Legal pages (Terms, Privacy) are placeholders until the owner provides final texts.

## 8. Success metrics (closed beta)
- Activation ≥ 40%: signed up → profile ready + ≥1 channel connected + ≥1 application sent within 24 h.
- Time from sign-up to first sent application ≤ 10 minutes (median).
- Send success rate ≥ 95% (sent / attempted, excluding user skips).
- Account restriction incidents < 2% of connected Telegram/LinkedIn accounts per month.
- Match quality: ≥ 70% of reviewed applications approved (not skipped) at the default threshold.
- Free → paid conversion ≥ 5% within 14 days of running out of free credits.

## 9. Non-goals
Not an ATS, not a CRM for conversations with recruiters, not a resume builder/designer, not a job board for employers.

## 10. Top risks
| Risk | Impact | Mitigation in product |
|---|---|---|
| LinkedIn detects automation, or UI changes break the extension | Users' accounts restricted, LinkedIn features stop working | Runs in the user's browser and session, conservative limits and pacing, extension health checks and fast fixes, clear consent |
| Telegram spam restrictions (PEER_FLOOD) on user accounts | Users lose the ability to DM | Low default limits, pacing, no repeat contacts, detect restriction → pause the channel and notify |
| Source parsing breaks (APIs, markup, channel formats) | Feed dries up | Adapter per source, source health monitoring for the operator, AI structuring tolerant to format changes |
| LLM cost per application vs price | Margin | Cheap model tier for structuring and scoring, caching per vacancy, fair-use caps |
| Leak of user sessions/tokens | Severe: account takeover | Encryption at rest, never sent to the client, least-privilege scopes, audit log, security audit in release |
| Email deliverability from user mailboxes | Applications land in spam | Send from the user's own mailbox, personalized text, attachment limits, daily caps |
| The team cannot verify live integrations | Bugs appear only on real accounts | Contract-level fakes and recorded fixtures, human live-smoke checklist before launch |
| Payments via crypto/Stars, jurisdiction | Legal and accounting exposure | Provider sandboxes in MVP, live keys and legal setup by the owner |

## 11. Approach and milestone outline (detailed in ROADMAP.md)
Chosen approach: **value-first vertical slices.** The free, low-risk parts (profile, feed, manual apply) come first so that there is a demoable product early. The risky account-based channels follow, then LinkedIn via the extension, then billing.
Alternatives considered:
- **LinkedIn first.** The most valuable source, but also the riskiest, and it depends on the extension and pairing that come later. Rejected.
- **Billing first.** Monetization early but nothing to sell yet. Rejected.

- M0 Foundations
- M1 Onboarding & profile
- M2 Vacancy feed (aggregators, Hirify/HireHi, Telegram channels, matching, manual apply)
- M3 Auto-apply via email & Telegram (connections, review queue, autopilot, history)
- M4 LinkedIn via Chrome extension (Jobs, Easy Apply, hiring posts)
- M5 Billing (Stripe, USDT, Telegram Stars, credits lifecycle)
- MR Release

## Approval
Decisions taken in the kickoff chat (2026-09-27):
- audience: international + CIS;
- sources: all of LinkedIn Jobs + Easy Apply, LinkedIn posts, Telegram channels, open aggregators, Hirify/HireHi and other easy-to-parse sources;
- channels: email, Telegram DM, Easy Apply; ATS forms out of scope;
- mode: user's choice with review by default;
- AI in key places;
- payments: Stripe + crypto USDT + Telegram Stars;
- UI in EN + RU;
- LinkedIn via a Chrome extension;
- risks accepted with protections;
- Python backend, a UI component library, a pluggable LLM provider.
