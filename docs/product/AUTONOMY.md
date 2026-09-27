# Autonomy grant

approved: yes
approved_by: russian.lolik@gmail.com (product owner, in kickoff chat)
date: 2026-09-27

The Team Lead may set `approved: yes` only after the human's explicit consent in chat.

## The team may, without asking
- Create milestone branches, commit locally, `merge --no-ff` into the integration branch after `board.py gate <M> --run-checks` = PASS. In this cloud session the integration branch is `claude/gracious-goodall-6nnbii`, and it is pushed after every phase.
- Install dependencies with permissive licenses (MIT/Apache/BSD/ISC/PSF, and MPL-2.0 used unmodified) from the public npm registry and PyPI (dev and runtime).
- Run and reset the local Supabase stack, create and apply local migrations, seed data.
- Run Strix and other scanners against localhost and local source.
- Build the Chrome extension locally and load it unpacked into the local Chromium for tests.
- Build every third-party integration against a local fake and recorded fixtures:
  - LinkedIn pages;
  - Telegram (MTProto and Bot API);
  - Gmail/SMTP (local mail catcher);
  - the LLM;
  - Stripe (local mock);
  - the crypto gateway;
  - Telegram Stars.
- Make read-only, low-rate requests to **public** data (job aggregator APIs/RSS, Hirify/HireHi public pages, public Telegram channel previews `t.me/s/…`) to record test fixtures and compile the seed channel catalog. No logins, no writes, no personal data beyond what is published in vacancies.
- Make product decisions within the PRD (UX details, copy, edge-case behavior, exact pacing ranges) and record them in the PRD decision log.
- Cut or defer P2/P3 scope with a note in the ROADMAP.

## Requires the human (escalate with `needs_human`)
- Changing or cutting P0/P1 scope, adding new features beyond the PRD, changing prices, credits or limit defaults.
- Paid services, new API keys, third-party accounts, copyleft (GPL/AGPL/LGPL) dependencies in the product.
- **Never:**
  - logging into or acting through real LinkedIn, Telegram, Google/Gmail or email accounts;
  - sending real applications or messages;
  - taking real payments.
- Calls to a live LLM or payment **sandbox** are allowed only with keys the human put into the environment, within the limits below.
- Anything remote: deploy, publish (incl. Chrome Web Store), cloud Supabase, DNS, emails to real users, pushing to main.
- Deleting data or files outside the repository.

## Budget
- Autopilot: up to 300 turns per `/goal` run (`board.py goal --turns N`).
- Fix rounds per milestone: 3; then block the milestone and escalate.
- Live LLM usage: none by default (tests and QA use the fake LLM). If the human adds an LLM key, only for a small smoke check per milestone (≤ 50 calls).
- Models: opus for lead/architect, sonnet for everything else (see the constitution).
