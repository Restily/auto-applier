---
name: exploratory-qa
description: "Manual QA method with playwright-cli — acceptance of AC with evidence, exploratory charters, bug reports, re-verification and a scored QA report with verdict. Preloaded into qa-manual."
user-invocable: false
---

# Manual QA with playwright-cli

## 0. Prepare
- Inputs: stories of the milestone (`board.py list --milestone <M> --type story`), their AC (`board.py ac <S>`), screen specs, `docs/qa/plans/<M>-test-plan.md`, your memory.
- App: `bash team/bin/app.sh status` (start it with `app.sh start` if stopped); URL from `app.sh url`.
- Browser: `playwright-cli --help` for exact syntax (skills installed by `playwright-cli install --skills`). Core loop: `open <url>` → `snapshot` (element refs like e12) → `click e12` / `fill e5 "text"` / `press Enter` → `snapshot` → `screenshot`. Use a named session per persona when testing multiple users. Check the console and network errors after each flow.
- Test data: create unique accounts/data (`qa+<story>-<timestamp>@example.com`); never reset the shared DB.
- Evidence folder: `docs/qa/evidence/<M>/` — name files `<S-id>-ac<N>.png`, `<B-id>-*.png`.

## 1. Acceptance (every story or task in status `qa`)
For each AC, execute Given/When/Then literally from a clean state, at 1280px and at 375px for UI flows.
- Pass → screenshot → `board.py check <S> <N> --by qa-manual --note "<evidence path>"`.
- Fail → file a bug (§3), leave the AC unchecked, `board.py note <S> "AC<N> fails: <B-id>"`.
Story with every AC checked and no open critical/high bug linked → `board.py move <S> done --by qa-manual`.

## 2. Exploratory charters (time-boxed, ~10–15 min each)
Write a charter ("Explore <area> with <resources> to discover <risk>") and cover at least:
inputs (empty, long, unicode/emoji, whitespace, boundary numbers, paste) · double submit / back / refresh / deep link · auth (logged out access, another user's data by changing URL ids, expired session) · error handling (server errors, validation messages, offline) · states (loading, empty, error) · responsive 375/768/1280 · keyboard only + visible focus · copy/typos · console errors.

## 3. Bugs
`board.py new bug "<screen/flow>: <what is wrong>" --milestone <M> --severity <sev> --owner <frontend-dev|backend-dev> --by qa-manual --body-file -` with a heredoc body: steps (numbered, from clean state), expected, actual, evidence, environment (URL, viewport, account). UI/rendering → frontend-dev; data/API/permissions → backend-dev. One bug per defect; check for duplicates first (`board.py list --type bug --open`).

## 4. Re-verification (bugs in status `qa`)
Reproduce the original steps. Fixed → `board.py check <B> 2 --by qa-manual --note "<evidence>"` and `board.py move <B> done --by qa-manual`. Not fixed → `board.py move <B> in_progress --by qa-manual --note "<what still happens>"`. Re-run a quick smoke of the affected story.

## 5. Report — `board.py scaffold qa <M>`
Fill the scorecard (1–5 each; be strict — 5 is "nothing to improve", 3 is "works but rough"):
- **Functionality** — every AC observed working (hard threshold: 100% of AC checked).
- **Robustness** — behavior under the exploratory charters (threshold ≥ 3).
- **UX clarity** — a new user completes the core flows without guessing (threshold ≥ 3).
- **Accessibility** — keyboard, focus, labels, contrast (threshold ≥ 3).
`Verdict: PASS` only if every threshold is met, every story is `done`, and no critical/high bug is open; otherwise `Verdict: FAIL` with the reasons. Never soften a verdict to help the schedule.
