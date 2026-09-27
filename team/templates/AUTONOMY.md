# Autonomy grant

approved: no
approved_by:
date:

The Team Lead may set `approved: yes` only after the human's explicit consent in chat.

## The team may, without asking
- Create milestone branches, commit locally, `merge --no-ff` into main after `board.py gate <M> --run-checks` = PASS.
- Install dependencies from the public npm registry (dev and runtime) with permissive licenses (MIT/Apache/BSD/ISC).
- Run and reset the local Supabase stack, create and apply local migrations, seed data.
- Run Strix and other scanners against localhost and local source.
- Make product decisions within the PRD (UX details, copy, edge-case behavior) and record them.
- Cut or defer P2/P3 scope with a note in the ROADMAP.

## Requires the human (escalate with `needs_human`)
- Changing or cutting P0/P1 scope, or adding new features beyond the PRD.
- Paid services, new API keys, third-party accounts, copyleft (GPL/AGPL) dependencies in the product.
- Anything remote: deploy, publish, cloud Supabase, DNS, emails to real users; pushing to main. (In cloud sessions the team pushes its working branch — required to persist work.)
- Deleting data or files outside the repository.

## Budget
- Autopilot: up to 200 turns per `/goal` run (`board.py goal --turns N`).
- Fix rounds per milestone: 3; then block the milestone and escalate.
- Models: opus for lead/architect, sonnet for everything else (see the constitution).
