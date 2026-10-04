# Design review M1

_Owner: Designer · 2026-10-04 · Screenshots: docs/qa/evidence/M1/design/ (per lead instruction; naming `<screen>-<1280|375>-<en|ru>.png`)_

Verdict: PASS

Scope: every M1 screen at 1280 and 375, EN and RU, reviewed on the running app (Chromium via playwright-cli) against MASTER.md and specs S-001, S-003, S-004, S-006 (S-002/S-005 only spot-checked). No high visual bug is open; the three medium bugs and two low bugs below should be fixed before MR but do not block M1.

## Scorecard (1-5, strict)
| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Design quality | 4 | >= 3 | Calm, coherent teal/graphite system; flat cards, clear hierarchy, consistent inline-error pattern (icon + text + role=alert), restrained use of the credit amber. Not generic. Dialogs and the empty app shell are the plainest parts. |
| Fidelity to specs/tokens | 4 | >= 4 | Copy, states, validation messages (incl. S-004 salary Max < Min), D1 save semantics and D5 copy match the specs exactly in both languages. Deviations are cosmetic (B-007, B-008): gray dialog surface, missing sidebar logo, settings card shadow, 375 salary grouping, sticky bar at desktop. Borderline 4: the list is long but each item is small. |
| Craft (spacing, type, states) | 3 | >= 3 | RU strings fit everywhere (buttons, step labels, dialogs); all reachable states exist (idle, processing, failed, review, discard, errors, saved, dirty). Marked down for the toast covering the sticky Save button (B-004), the review "Apply" with no dirty cue (B-005), the stale Language radio (B-006), gray-on-gray dialog inputs (B-007) and small spacing slips (B-008). |
| Usability & a11y | 4 | >= 3 | Touch targets measured at 375: auth, profile and onboarding controls are >= 44px (language 43x44, logo 32x44, "Fill in manually" 137x44, inline alert links 44px). Visible focus rings, safe default focus in the discard dialog, focus moves to the first invalid field after an incomplete save, html lang follows the language switch, beforeunload guard works. Toast overlap (B-004) is the one real usability defect. |

## Specific confirmations requested by the lead
- Credit popover copy: reads correctly. EN/RU normal state "Credits are used when AutoApplier applies to jobs for you." / "Кредиты списываются, когда AutoApplier откликается на вакансии за вас."; zero-credit state "Автопилот на паузе, пока у вас нет кредитов." with a warning pill. At 375 the popover touches the left viewport edge (B-008 item 1).
- D5 privacy/delete copy: correct in EN and RU on the delete dialog, /privacy and /account-deleted (only a one-way keyed hash of the email is kept, used solely to withhold the repeat sign-up bonus). Functionally verified with a second throwaway user: delete -> /account-deleted -> sign up again with the same email -> 0 credits, warning pill, no welcome toast. Wording nit: "All your data has been permanently removed" sits one line above the hash note; acceptable because the next paragraph qualifies it.
- Language: header switch persists to the profile and sets html lang; the Settings radio does not follow (B-006). Reset-password email subject is bilingual and body English only (already tracked as B-002, closed).

## Screens reviewed
| Screen | 375 | 1280 | Issues |
|---|---|---|---|
| Sign-up (blank, disabled submit, duplicate-email alert) | ok | ok | Disabled submit is low contrast but conventional; password clears on error |
| Sign-in (+ invalid credentials, EN/RU) | ok | ok | none |
| Forgot password + "check your email" panel | ok | ok | none |
| Reset password form (RU, short password) and "link expired/invalid" panel (EN/RU) | ok | ok | Duplicate "min 8" message (B-008 #7) |
| Onboarding checklist (0/1, done 1/1) | ok | ok | Step dots keep labels at 375 in EN and RU (fit, so acceptable; spec says unlabeled); "1 of 1 steps" plural follows spec copy |
| Resume upload idle, processing, failed/error | ok | ok | Dropzone error lacks icon (B-008 #8); "drag" copy is irrelevant on touch |
| Replace-resume dialog | centered, not sheet | ok | B-007 |
| Review dialog (keep/use, apply) | centered | ok | B-005, B-007 |
| Discard-unsaved-edits dialog | centered | ok | B-007 |
| Profile editor (full, filled, dirty, format errors, salary and URL errors, saved incomplete / complete) | ok | ok | B-004, B-008 #4/#5/#9 |
| Entry dialogs (experience/education/language) + error | centered | ok | B-007 |
| Settings (language, export + toast, delete) | ok | ok | B-004 at 375, B-006, B-008 #3 |
| Delete-account dialog (EN/RU) | sheet, ok | ok | RU email wraps mid-token at 375 (unavoidable, not filed) |
| /account-deleted (EN/RU) | ok | ok | none |
| /privacy (EN/RU) | ok | ok | none |
| Credit popover (normal, zero) | edge-flush | ok | B-008 #1 |
| App shell (sidebar / top bar, language menu, account menu) | ok | no logo in sidebar | B-008 #2/#6 |

## Bugs filed
| ID | Severity | Summary |
|---|---|---|
| B-004 | medium | Bottom-right toast covers the sticky Save button and swallows clicks |
| B-005 | medium | Review dialog Apply: no unsaved cue, appliedHint copy unused |
| B-006 | medium | Settings Language radio stale after header language switch |
| B-007 | low | Dialog surface is --background not --surface; dialogs not sheets at 375 |
| B-008 | low | Polish bundle (popover edge, sidebar logo, card shadow, salary row, sticky bar, lang chevron, duplicate hint, dropzone icon, favicon) |

Existing: B-001 (hardcoded English "Close" in dialog, in qa), B-002 and B-003 (done, behavior confirmed fixed).

## Recommendation
PASS for M1. Fix B-004, B-005 and B-006 before the M2 UI work builds on the same patterns (toasts and dialogs will be reused); the rest can ride along.
