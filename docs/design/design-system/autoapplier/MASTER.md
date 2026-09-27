# AutoApplier — Design system (MASTER)

_Owner: Designer · Created 2026-09-27 · Generated with `ui-ux-pro-max --design-system --persist` (queries logged below) and hand-tuned per `frontend-design` for a distinctive, non-generic direction · Implementation reference: `docs/design/tokens.css`_

This is the single source of truth for how AutoApplier looks, reads and behaves. Screen specs (`docs/design/screens/S-*.md`) inherit everything here and only document what's specific to that screen. If a screen spec and this file disagree, this file wins unless the screen spec explicitly overrides it with a reason.

## 0. Direction

**Concept: an operations desk for your job search.** AutoApplier acts on the user's behalf — it sends real messages from real accounts, under real limits. The interface has to earn the right to do that: it reads like a calm, precise instrument panel that is clearly being monitored and clearly under the user's control, never like a marketing funnel or a growth-hacky consumer app. Status is always visible (credit balance, channel health, send limits); actions are named exactly for what they do; nothing nudges, gamifies or creates false urgency.

This shapes concrete choices below: status expressed as instrument-style dot + label rather than color alone; a credit balance rendered as a legible number with its own token family, not a cutesy progress toy; flat surfaces separated by hairline borders rather than stacked shadow cards; one confident accent color, not a rainbow of gradients.

**Explicitly avoided** (per `frontend-design`'s list of AI-generated tells — checked against this system):
- No warm cream background + terracotta accent, no near-black + neon-accent theme.
- No "SaaS card kit": we do not wrap every block in an identical rounded-shadow card. Default surfaces use a border, not a shadow; radius varies by role (§3.3) instead of one radius on everything.
- No tracked-out ALL-CAPS eyebrows, no `WORD — fragment` labels, no middle-dot-joined meta strings, no arrow glyphs appended to buttons/links.
- No decorative numbered badges (01/02/03) — the onboarding checklist uses real checkmarks against real steps, not a marketing "process" motif.
- Headings are plain sentence case; nothing is italicized or single-word-colored for emphasis.
- Flags are never used for language — “EN” / “RU” text labels only (a flag conflates language with country, and RU as a flag is a bad proxy for "Russian-speaking users across many countries," which is exactly this product's CIS audience).

**Generator queries used** (`~/.claude/skills/ui-ux-pro-max/scripts/search.py`), logged for traceability — outputs below are curated and hand-adjusted from these, not applied verbatim (the first pass returned a wellness/spa font pairing that was clearly off-topic and was discarded per the skill's own retry rule):
- `"job search automation control panel trustworthy calm SaaS" --design-system --variance 4 --motion 3 --density 6`
- `"productivity dashboard professional tool control center fintech" --design-system --variance 4 --motion 3 --density 6`
- `"professional dashboard dense readable clean" --domain typography`
- `"fintech trustworthy calm professional" --domain color`

## 1. Personas this serves (from the PRD)

Alex (relocating engineer, CIS→international), Maria (CIS specialist, RU-speaking), Sam (international, EN) — all mid/senior professionals under time pressure, applying in bursts around a day job, anxious about both missing good roles and about their accounts getting restricted. The Operator is a internal power user managing source health and credits. None of these personas want to be delighted; they want to trust the tool and get through their queue fast. Design for speed, legibility and reversibility over ornament.

---

## 2. Color tokens

Implementation: `docs/design/tokens.css`. Every pair below is computed (WCAG 2.2 relative-luminance formula), not eyeballed — see the ratio column. Text pairs are checked against the 4.5:1 AA minimum for normal text; UI-boundary pairs (input borders, focus rings) against the 3:1 minimum for non-text contrast (SC 1.4.11).

### 2.1 Light theme (default, required)

| Token | Hex | Role | Paired with | Ratio | AA |
|---|---|---|---|---|---|
| `--background` | `#F5F7F9` | App canvas | — | — | — |
| `--surface` | `#FFFFFF` | Cards, header, sidebar, inputs | — | — | — |
| `--surface-sunken` | `#EEF1F4` | Inset wells, inactive track, avatar bg | — | — | — |
| `--foreground` | `#10171F` | Primary text | on surface / background | 18.0:1 / 16.8:1 | AAA |
| `--muted-foreground` | `#4B5563` | Secondary text, descriptions | on surface | 7.6:1 | AAA |
| `--subtle-foreground` | `#5B6572` | Meta: timestamps, helper text | on surface | 5.9:1 | AA |
| `--disabled-foreground` | `#8A94A0` | Disabled control text/icon | on surface | 3.1:1 | exempt (disabled) |
| `--border` | `#E2E5EA` | Decorative dividers, card edges | — | non-text, decorative | n/a |
| `--input-border` | `#7C8797` | Form control boundary | on surface | 3.6:1 | AA (1.4.11) |
| `--primary` | `#0B6E8F` | Primary actions, links, active nav, focus ring | on surface (as text/icon) | 5.8:1 | AA |
| `--primary-hover` | `#085572` | Primary hover/active | on surface | 8.2:1 | AAA |
| `--primary-subtle` | `#E3F1F5` | Selected/info tint background | — | — | — |
| `--on-primary` | `#FFFFFF` | Text/icon on primary fill | on primary | 5.8:1 | AA |
| `--credit` | `#8A5A00` | Credit balance, plan price, "buy credits" | on surface | 5.9:1 | AA |
| `--credit-subtle` | `#FBF1DE` | Credit callouts, low-balance banner bg | — | — | — |
| `--on-credit` | `#FFFFFF` | Text on credit fill | on credit | 5.9:1 | AA |
| `--success` | `#157F3C` | Connected, sent, match ≥80, positive | on surface | 5.1:1 | AA |
| `--success-subtle` | `#E4F5EA` | Success/info Alert & banner tint background | — | — | — |
| `--warning` | `#B45309` | Needs attention, match 50–79, low balance | on surface | 5.0:1 | AA |
| `--warning-subtle` | `#FDF1E3` | Warning Alert tint background | — | — | — |
| `--danger` | `#C0233C` | Errors, disconnected/restricted, destructive | on surface | 5.9:1 | AA |
| `--danger-subtle` | `#FBE7EA` | Danger Alert tint background | — | — | — |
| `--ring` | `#0B6E8F` | Focus ring (2px, 2px offset) | on surface | 5.8:1 | AA |

Never use raw hex in component code — reference the CSS variable so a future palette pass is a one-file change. `--success` / `--warning` / `--danger` are also the only colors that carry state; every place they appear, state is *also* carried by an icon and/or text label (color is never the sole signal — WCAG 1.4.1).

### 2.2 Dark theme (optional, provided)

Full token list in `tokens.css` under `.dark`. Same bar: e.g. `--foreground` (`#E7ECF1`) is 13.9:1 on `--surface` (`#16202B`); `--primary` (`#5FB8D6`) is 7.3:1 on surface with `--on-primary` (`#062430`) at 7.2:1 on primary. M1 ships light only; dark is not required until a UI milestone explicitly schedules it, but every token has a value ready.

### 2.3 Contrast rules for anyone adding a new color

1. Text ≥ 4.5:1 against the surface it sits on (large text ≥24px/19px-bold may use 3:1, but we don't currently rely on that exception anywhere).
2. Interactive boundaries (input borders, unfilled icon-button outlines, focus rings) ≥ 3:1 against the adjacent surface.
3. Decorative-only borders (a divider between two rows of the same background) are exempt — don't force contrast onto them, it just adds visual noise.
4. Compute, don't eyeball. Any WCAG contrast calculator is fine; record the ratio in the PR/spec like the tables above.

### 2.4 Text on tinted (`-subtle`) fills

Alert/Banner and any other tint-filled surface (`--danger-subtle`, `--success-subtle`, `--warning-subtle`, `--primary-subtle`, `--credit-subtle`) needs its own check — the ratios in §2.1 are against `--surface`/`--background`, and computing the tint pairs exposes a real trap: the raw semantic color is **not** reliably 4.5:1 against its own tint —

| Pair | Ratio | AA (4.5:1 text) |
|---|---|---|
| `--success` on `--success-subtle` | 4.49:1 | **fails** |
| `--warning` on `--warning-subtle` | 4.51:1 | passes, no margin |
| `--danger` on `--danger-subtle` | 5.00:1 | passes |
| `--primary` on `--primary-subtle` | 4.99:1 | passes |
| `--credit` on `--credit-subtle` | 5.29:1 | passes |
| `--foreground` on any of the five tints above | 15.2–16.2:1 | passes, large margin |

**Rule: body text inside a tinted Alert/Banner/callout is always `--foreground`**, never the raw semantic color — the table is exactly why "it's already a design token" isn't a safe enough check on its own. The semantic color stays on the icon and/or a short bold lead-in, where it only needs the 3:1 non-text/graphical-object minimum (SC 1.4.11), which every pair above clears. This generalizes what S-002's neutral cancel alert already does (`--foreground` text on `--surface-sunken`) into the default for every tinted surface, instead of a per-screen judgment call.

---

## 3. Typography, spacing, radii, shadows, motion

### 3.1 Typeface

**UI: Golos Text** (400/500/600/700/800, Google Fonts, SIL Open Font License). Chosen deliberately, not defaulted to Inter: Golos Text is designed for **equal-weight Latin and Cyrillic** — the product's core constraint (EN/RU parity, everywhere, always) is a typeface decision, not just a copy decision. Most Latin-first faces treat Cyrillic as an afterthought (different apparent weight, awkward italics); Golos Text doesn't. One family for the whole product — headings differ by size/weight, not by switching faces (per `frontend-design`: a second display face is a decision to earn, not a default, and this product has no marketing hero moments that would earn it).

**Numerals only: IBM Plex Mono** — credit ledger amounts, salary figures in tables, timestamps in dense lists, application IDs. Never for labels, buttons or anything a screen reader announces as a word; tabular numerals only, so columns of numbers align.

```css
--font-sans: 'Golos Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

Google Fonts import: `https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap` (self-host at build time if the architect's ADR prefers it — either way, subset to `latin,cyrillic`).

### 3.2 Type scale

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `--text-display` | 32/40px (2/2.5rem) | 700, −0.01em | Rare: big credit number on empty dashboard, "Account deleted" confirmation |
| `--text-h1` | 26/34px | 700 | Page title (one per screen) |
| `--text-h2` | 21/28px | 600 | Section heading within a page |
| `--text-h3` | 17/24px | 600 | Card/subsection heading |
| `--text-body` | 16/26px | 400 | Paragraphs, descriptions, empty-state copy, form field help text |
| `--text-ui` | 15/22px | 400 (500 for buttons/active states) | Default interactive/UI text: inputs, buttons, nav labels, table cells |
| `--text-small` | 13/20px | 500 | Badges, table headers, pagination, chips |
| `--text-tiny` | 12/16px | 500 | Floor. Meta only: relative timestamps, char counters. Never body copy or anything decision-critical — and even here, use `--subtle-foreground` (5.9:1), never a lighter gray. |

Base body text is 16px (never below 12px anywhere, per the a11y checklist); dense UI (`--text-ui`, `--text-small`) is deliberately smaller than body because it's chrome, not reading content — this matches how shadcn/ui components ship by default and keeps the review queue/table screens scannable at density 6/10.

### 3.3 Fitting Russian text (~30% longer strings)

This is a layout rule, not a font-size rule — shrinking type to make RU fit is not an option (see floor above). Instead:

1. **Never hard-fix the width of anything that contains translated text.** Buttons, nav items, tabs, badges, chips: `min-width` + horizontal padding (`--space-4`/`--space-3`), width follows content. A button sized for "Sign in" must not clip "Продолжить через Google".
2. **Labels sit above their input**, never inline to the left at a fixed column width — top-aligned labels are immune to the classic RU-overflow bug of a fixed-width label column.
3. **Primary buttons wrap to two lines** rather than clip or ellipsize, with `line-height` from the scale above giving enough row height; `white-space: normal` on button text, not `nowrap`.
4. **Sidebar nav labels** may wrap to two lines at `--shell-sidebar-width` (248px); the icon rail (collapsed, 72px) drops text entirely rather than truncating it — full words or no words, never `…`.
5. **Tables**: identifying text columns (vacancy title, contact name, screen names) wrap or clamp to 2 lines with a `title` attribute for the full string; they never use single-line `text-overflow: ellipsis` with no way to read the rest. Numeric/status/date columns stay fixed-width — those don't expand under translation.
6. **Every screen spec gives the literal EN and RU strings** for anything load-bearing (buttons, errors, labels) precisely so this gets tested against real copy, not lorem ipsum. See each `docs/design/screens/S-*.md` Copy table and the glossary in §6.2.

### 3.4 Spacing

4px base unit. Use Tailwind's default numeric spacing scale (`p-4` = 16px, `gap-6` = 24px, …) for ordinary layout; the named tokens in `tokens.css` (`--space-1`…`--space-24`) exist for non-Tailwind contexts (emails, the extension popup in a later milestone) and for the shell's structural constants:

| Token | Value | Use |
|---|---|---|
| `--shell-header-height` | 60px | Top bar, both desktop and mobile |
| `--shell-sidebar-width` | 248px | Desktop expanded sidebar |
| `--shell-sidebar-rail-width` | 72px | Desktop collapsed sidebar |
| `--shell-bottom-nav-height` | 60px | Mobile bottom tab bar |
| `--shell-content-max-width` | 1120px | Centered content column on wide screens |
| `--shell-gutter-mobile` / `-tablet` / `-desktop` | 16 / 24 / 32px | Page-edge padding |

Minimum touch target 44×44px for anything tappable (WCAG 2.2 SC 2.5.8), including icon-only buttons — pad the hit area even if the visible glyph is smaller.

### 3.5 Radii

Deliberately not one radius everywhere — this is one of the concrete things that keeps the product off the generic-SaaS-card look:

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Buttons, inputs, checkboxes/radio boxes, badges, chips |
| `--radius-md` (`--radius`) | 10px | Cards, panels, popovers, dropdown menus |
| `--radius-lg` | 14px | Dialogs, sheets, the command palette |
| `--radius-full` | 999px | Avatars, switches, status dots, pill badges |

### 3.6 Shadows

Flat-first (Style match: Flat Design). Default surfaces — cards, list rows, the sidebar, the header — use `--border` only, **no shadow**. Shadow is reserved for things that visually float above the page:

| Token | Use |
|---|---|
| `--shadow-none` | Default: cards, panels, table rows, the shell itself |
| `--shadow-sm` | A card/row that is currently hovered/draggable |
| `--shadow-md` | Dropdown menu, popover, toast |
| `--shadow-lg` | Dialog, sheet, command palette |

### 3.7 Motion

Motion dial 3/10 — subtle, purposeful, never decorative. One orchestrated moment at a time beats scattered micro-animations on every element.

| Token | Value |
|---|---|
| `--duration-fast` | 120ms — hover/focus state changes, checkbox/switch toggle |
| `--duration-base` | 180ms — dropdown/popover open, tab switch, toast in |
| `--duration-slow` | 260ms — dialog/sheet open, review-queue card exit |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` — decelerate, default for anything entering |
| `--ease-emphasis` | `cubic-bezier(0.32, 0, 0.15, 1)` — review-queue approve/skip card exit |

Rules:
- `@media (prefers-reduced-motion: reduce)`: disable all non-essential transitions/transforms; state changes happen instantly. This is not optional anywhere in the product.
- **No entrance animation on lists** — feed cards, table rows, checklist items render immediately, fully opaque. Staggered fade-in-on-scroll for every card is exactly the generic-AI motion pattern this system avoids.
- Motion is reserved for things that answer a user action: a review-queue card sliding out on approve/skip, a dropdown/popover opening, a toast confirming a save, the credit number ticking when a send consumes one. Not for decoration, not on page load.
- Loading states use skeletons or a determinate/indeterminate progress affordance (§7), not a spinning brand mark.

### 3.8 Breakpoints & layout grid

Tested reference widths: **375px** (mobile), **768px** (tablet), **1280px** (desktop). Supported range per NFR: 360–1440px. Maps onto Tailwind's default `sm/md/lg/xl/2xl` = 640/768/1024/1280/1536.

- **Desktop ≥1280px**: fixed sidebar (`--shell-sidebar-width`, collapsible to the icon rail) + content area, `--shell-content-max-width` centered, `--shell-gutter-desktop` (32px) side padding. Forms are single-column up to ~640px wide even on a wide viewport — don't stretch inputs edge to edge; two-column only for genuinely paired short fields (e.g. city/country).
- **Tablet 768–1279px**: sidebar defaults to the collapsed icon rail (72px), expandable by a toggle; `--shell-gutter-tablet` (24px).
- **Mobile <768px**: no sidebar. Top bar + bottom tab bar (§8.4); `--shell-gutter-mobile` (16px); single-column everything; dialogs become full-height sheets from the bottom.
- No horizontal scroll at any width for page content (tables that must scroll horizontally get an explicit, visible scroll affordance and stay inside their own container, never the page).

---

## 4. Iconography

**Lucide** (the shadcn/ui default icon set) exclusively — no emoji anywhere in the product UI (emoji render inconsistently across OSes/locales and read as informal, working against the "calm, trustworthy" tone). Default stroke width 1.75–2, default size 20px inline / 16px in dense table rows / 24px for standalone status icons. Every icon-only control has an accessible name via `aria-label` or adjacent `sr-only` text, and a `Tooltip` on hover/focus (per the a11y checklist: no icon-only buttons without labels). Purely decorative icons get `aria-hidden="true"`.

---

## 5. Component inventory (shadcn/ui)

All components are `shadcn/ui` primitives unless marked **custom**. "States" lists what must be built even if a screen spec doesn't call it out explicitly — hover/focus-visible/disabled are baseline for every interactive component and are not re-listed per row below unless there's something non-default to say.

| Component | shadcn primitive | Variants | Notes / non-default states |
|---|---|---|---|
| Button | `Button` | `default` (primary fill), `outline` (secondary), `ghost`, `destructive`, `link` | Sizes `sm`/`default`/`lg`/`icon`. Loading: spinner replaces the label, button keeps its resolved width (no layout jump), stays disabled to double-submit. Text wraps (§3.3), never truncates. |
| Input | `Input` | text/email/password/number/tel/url | Password has a reveal toggle (icon button, `aria-label` "Show/hide password" · "Показать/скрыть пароль"). Invalid state: `--danger` border + inline message (§9). |
| Textarea | `Textarea` | — | Auto-grow up to a max height, then internal scroll. |
| Select / Combobox | `Select`, `Command` (searchable) | — | Combobox for long lists (target titles, skills, languages) so typing filters instead of scrolling. |
| Checkbox / Radio Group | `Checkbox`, `RadioGroup` | — | 44×44px hit area even though the visible box is smaller. |
| Switch | `Switch` | — | Autopilot on/off (M2+), consent toggles. Label always states the resulting state, not just the action ("Autopilot: on", not just an unlabeled toggle). |
| Form field | `Form` (react-hook-form) + `Label` | — | **custom composition**: label above field → control → helper text (muted) → error text (replaces helper, `--danger`, `role="alert"`). Required fields marked with a trailing `*` plus `aria-required`, not color alone. |
| Tabs | `Tabs` | — | Profile sections, Settings sections. |
| Card | `Card` | — | Border only, `--shadow-none` by default (§3.6); used for the Profile Editor's field groups and the onboarding checklist steps. |
| Badge | `Badge` | `default` (primary-subtle), `success`, `warning`, `danger`, `neutral` | Status pills: connection status, match-score band, plan tier. Always paired with an icon or text, never color-only. |
| Alert / Banner | `Alert` | `info`, `success`, `warning`, `danger` | Page-level (e.g. "Your session will expire") and inline (e.g. above a form). Body text is always `--foreground` on the tint fill, never the raw semantic color (§2.4) — the semantic color stays on the icon and/or a short bold lead-in. |
| Toast | `Sonner` | success/info/error | Transient confirms: "Profile saved," "Signed out." Auto-dismiss ≥5s, also closable, also announced via `aria-live="polite"`. |
| Dialog | `Dialog` | — | Non-destructive confirmations, "replace resume?" |
| Alert Dialog | `AlertDialog` | — | Destructive, hard-to-reverse actions: delete account (typed-confirmation, §S-006). |
| Dropdown Menu | `DropdownMenu` | — | Account menu, language switcher, row actions. |
| Popover | `Popover` | — | Credit balance detail breakdown, match-score reasons. |
| Tooltip | `Tooltip` | — | Icon-only buttons, truncated/clamped text, disabled-button reasons. |
| Avatar | `Avatar` | — | Initials fallback (no silhouette placeholder graphic — initials on `--primary-subtle` read calmer and avoid the generic-illustration look). |
| Progress | `Progress` | determinate, indeterminate | Upload %, resume-extraction wait, onboarding-checklist completion. |
| Skeleton | `Skeleton` | — | Initial load of any list/table/profile — shaped like the eventual content, never a bare spinner on a blank page. |
| Table | `Table` (+ TanStack Table for sorting, M3+) | — | Credit ledger, application history. |
| Separator | `Separator` | — | |
| Sheet | `Sheet` | — | Mobile nav drawer ("More"), mobile filter panel. |
| Breadcrumb | `Breadcrumb` | — | Back office (operator), M2+. |
| Pagination | `Pagination` | — | History table. |
| File dropzone | — | — | **custom**, built on a hidden `<input type=file>` + drag target. States: idle, drag-over, uploading (Progress), success, error (with reason), file-attached (replace/remove). See S-003. |
| Onboarding checklist | — | — | **custom**, built from `Card` + a check-circle icon (Lucide `CheckCircle2`) per step + `Progress`. Not a numbered-steps motif — real checkmarks against named tasks. |
| Password requirements list | — | — | **custom**, small text rows with a check/dot icon, live-updates as the user types (see S-001). |
| Connection status indicator | — | — | **custom** (`Badge`-based): dot + label, dot color from `--status-*` tokens, label is always real text ("Connected", "Needs attention", "Disconnected", "Restricted") never color alone. |
| Credit balance | — | — | **custom**: `--font-mono` tabular number + "credits" label in `--credit`, opens a `Popover` with the breakdown link to Credits & Plans. Lives in the header (§8.3). |
| Language switcher | `DropdownMenu` | — | **custom trigger**: text "EN" / "RU" (current language), not a flag. Full names inside the menu ("English", "Русский"). See §8.3 and S-005. |
| App sidebar / nav | `Sidebar` (shadcn block) | expanded / rail | Composition described in §8. |

---

## 6. Voice & tone

**Trustworthy, efficient, calm.** The product acts on the user's behalf, so every string either tells them exactly what's about to happen / just happened, or gets out of the way. Concretely:

- **Active voice, name the actual effect.** A button says what happens when pressed — "Save changes," "Send reset link," "Delete account" — never "Submit" or "OK." The vocabulary stays identical end to end: a button that says "Save" produces a toast that says "Saved," not "Success!" or "Your changes have been recorded."
- **Plain language, no salesmanship.** Describe what a control does, don't sell it. No exclamation marks in UI copy (a toast is "Profile saved," not "Profile saved!"). No urgency manufactured where none exists ("Only 3 credits left" is fine because it's true and useful; "Don't miss out!" is not fine because it's manufactured).
- **Errors state the fact and the fix, without apologizing or blaming the user.** "We couldn't read this resume. Try a different file, or fill your profile manually." Not "Oops! Something went wrong :(". Not "You uploaded an invalid file."
- **Empty states are a direction, not a mood.** State what's missing and the one action that fills it. No illustrations of the generic-AI-page kind (no isometric characters, no "undraw"-style people) — an icon, a heading, one line, one button (§7).
- **Sentence case everywhere** — headings, buttons, nav labels, badges. No tracked-out ALL-CAPS labels.
- **Numbers are exact, not vague.** "20 credits," "5 MB max," "60 seconds" — never "a few" or "shortly."
- Consent and risk language (channel connections, autopilot) is factual and specific about what the product will do and its limits — never reassuring filler ("don't worry!"). This is a safety-relevant surface; vague comfort language undermines trust more than a plain statement of the limit does.

### 6.1 Formality in Russian

Use formal **вы** throughout (standard for RU product UI, matches the calm/professional tone) — never ты. Keep translations natural rather than literal; several entries in the glossary below intentionally aren't word-for-word (e.g. "Первые шаги" for the onboarding checklist reads calmer and is shorter than a literal "Чек-лист адаптации").

### 6.2 Core glossary (EN → RU)

Every screen spec reuses these exact strings for these concepts — don't retranslate ad hoc. Screen-specific strings not covered here are defined in that screen's Copy table.

| Concept | EN | RU |
|---|---|---|
| Sign up (button) | Sign up | Зарегистрироваться |
| Sign up (heading) | Create your account | Создайте аккаунт |
| Sign in (button/heading) | Sign in | Войти |
| Sign out | Sign out | Выйти |
| Email field | Email | Email |
| Password field | Password | Пароль |
| Confirm password | Confirm password | Подтвердите пароль |
| Forgot password link | Forgot password? | Забыли пароль? |
| Reset password heading | Reset your password | Восстановление пароля |
| Reset password button | Send reset link | Отправить инструкции |
| New password field | New password | Новый пароль |
| Continue with Google | Continue with Google | Продолжить через Google |
| Divider before/after Google | Or continue with email | Или используйте email |
| Link to sign in | Already have an account? Sign in | Уже есть аккаунт? Войти |
| Link to sign up | Don't have an account? Sign up | Нет аккаунта? Зарегистрироваться |
| Credits (noun) | credits | кредитов / кредита / кредит (RU plural forms — see note) |
| Credit balance | Credit balance | Баланс кредитов |
| Free sign-up credits toast | You've got 20 free credits | Вам начислено 20 бесплатных кредитов |
| Profile | Profile | Профиль |
| Resume/CV | Resume | Резюме |
| Upload resume (button) | Upload resume | Загрузить резюме |
| Upload dropzone hint | Drag and drop, or browse files | Перетащите файл сюда или выберите на устройстве |
| Extraction in progress | Reading your resume… | Анализируем резюме… |
| Extraction failed | We couldn't read this resume | Не удалось прочитать это резюме |
| Fill manually (button) | Fill in manually | Заполнить вручную |
| Save / Save changes | Save changes | Сохранить изменения |
| Saved (toast) | Saved | Сохранено |
| Cancel | Cancel | Отмена |
| Edit (inline) | Edit | Изменить |
| Remove / Delete (inline) | Remove | Удалить |
| Full name | Full name | Полное имя |
| Target title(s) | Target titles | Желаемые должности |
| Skills | Skills | Навыки |
| Experience | Experience | Опыт работы |
| Education | Education | Образование |
| Languages | Languages | Языки |
| Location | Location | Местоположение |
| Links | Links | Ссылки |
| Work authorization | Work authorization | Право на работу |
| Relocation readiness | Relocation readiness | Готовность к релокации |
| Notice period | Notice period | Срок уведомления |
| Expected salary | Expected salary | Ожидаемая зарплата |
| Phone | Phone | Телефон |
| Onboarding checklist heading | Let's get you set up | Первые шаги |
| Complete your profile | Complete your profile | Заполните профиль |
| Settings | Settings | Настройки |
| Interface language | Language | Язык |
| Export data (section) | Your data | Ваши данные |
| Export data (button) | Download my data | Скачать мои данные |
| Delete account (section) | Danger zone | Опасная зона |
| Delete account (button) | Delete account | Удалить аккаунт |
| Delete confirm instruction | Type your email to confirm | Введите свой email для подтверждения |
| Irreversible warning | This can't be undone | Это действие нельзя отменить |
| Generic auth error | Invalid email or password | Неверный email или пароль |
| Required field | This field is required | Обязательное поле |
| Invalid email | Enter a valid email address | Введите корректный email |
| Password length rule | At least 8 characters | Минимум 8 символов |
| Generic load error heading | Something went wrong | Что-то пошло не так |
| Retry button | Try again | Попробовать снова |
| Connected status | Connected | Подключено |
| Needs attention status | Needs attention | Требует внимания |
| Disconnected status | Disconnected | Отключено |
| Restricted status | Restricted | Ограничено |

Note on "credits": Russian has three plural forms (1 кредит, 2–4 кредита, 5+ кредитов, plus the 11–14 exception). The i18n layer must pluralize this correctly wherever a count is shown, not just interpolate a fixed word — flag this to frontend-dev/architect as an i18n-library requirement (ICU MessageFormat or equivalent handles RU plural rules; a naive `count + " " + "credits"` template will not).

---

## 7. Empty / error / loading patterns

One system, reused everywhere a list, section or page can be empty, broken or waiting — consistency here is what makes the product feel controlled rather than assembled from parts.

**Empty (nothing here yet — first run)**
Centered in the content area (not the full viewport): a single Lucide icon (24px, `--muted-foreground`, in a 48px `--surface-sunken` circle — no illustration), `--text-h3` heading naming what's missing, one line of `--text-body` in `--muted-foreground` explaining why / what to do, one primary-button action. Example: no saved searches yet → icon `Search` → "No searches yet" / "Создайте поиск и мы начнём подбирать вакансии" → button "Create a search."

**Empty (filtered to nothing)**
Same layout, lighter: icon `FilterX`, heading "No results for these filters" / "Нет результатов по этим фильтрам", secondary (outline) button "Clear filters" — not a primary button, since the fix is to undo something, not to create something.

**Error (section/page failed to load)**
Icon `AlertTriangle` (24px, `--danger`, in a `--danger-subtle` circle), `--text-h3` "Something went wrong" / "Что-то пошло не так", one line naming what failed to load, primary button "Try again" that retries the same request. If it's the third consecutive failure, add a muted line: "If this keeps happening, contact support" / "Если проблема повторяется, напишите в поддержку" (email link from Settings).

**Error (inline, form field)**
`--danger` border on the field, `--danger` text below it (replaces helper text, doesn't stack under it), small `AlertCircle` icon prefix, `role="alert"` so it's announced. Field-level, appears on blur or submit — never only in a top-of-form summary (per the checklist: no error-summary-only pattern; summary *and* inline both when there are ≥2 errors, inline alone for 1).

**Loading (page/section, expected <1s)**
`Skeleton` shaped like the eventual content (card outlines, table rows) — never a bare centered spinner on an otherwise blank page.

**Loading (short action, <2s: save, sign in)**
Spinner inside the triggering button, button keeps its width, stays disabled.

**Loading (long-running: resume extraction, up to 60s)**
Indeterminate `Progress` bar + status text that changes every ~10–15s to show real progress ("Reading your resume…" → "Extracting your experience…" → "Almost done…" / "Читаем резюме…" → "Извлекаем опыт работы…" → "Почти готово…"). This is the one place a slightly longer wait is expected and named up front ("This can take up to a minute" / "Это может занять до минуты") so the user isn't guessing. Under reduced motion, keep the text updates, drop the bar's animation (show a static filled state instead).

---

## 8. App shell

The shell is the persistent chrome around every signed-in screen: navigation, header, and the two states it can be in (**focus** during onboarding/auth, **full** once the user has a profile). It is data-driven — a nav item only renders once its destination exists; nothing links to a route that isn't built yet (a disabled nav item that goes nowhere is a dead click, which is worse than not showing it). In M1 that means the full shell effectively shows Profile and Settings; Feed/Review queue/History/Searches/Connections/Credits & Plans/Back office appear as their milestones ship (M2–M5) without the shell itself changing shape. **Mobile bottom tab bar exception**: it needs ≥3 top-level destinations to earn a persistent bar (§8.3's ≤5 guidance has an implicit floor too — 1–2 items in a full-width bar reads broken, not minimal). Below that threshold (M1: Profile + Settings), mobile uses the top bar alone; Settings is still one tap away via the account menu. The bottom bar switches on once Feed ships (M2) and there are enough destinations to justify it.

### 8.1 Product areas (target information architecture, all milestones)

| Area | Icon (Lucide) | Ships | Notes |
|---|---|---|---|
| Feed | `LayoutGrid` | M2 | Default landing once a profile is complete and feed exists |
| Review queue | `ListChecks` | M2/M3 | Badge = pending count |
| History | `History` | M3 | Applications sent/failed/skipped |
| Searches | `Search` | M2 | Saved searches, filters |
| Connections | `Plug` | M3/M4 | Email, Telegram, LinkedIn (extension) |
| Credits & Plans | `Wallet` | M1 (balance only) / M5 (plans, purchase) | Balance is visible from sign-up (S-001); the Plans/purchase screen ships M5 |
| Settings | `Settings2` | M1 | Account, language, data & privacy |
| Back office _(operator only)_ | `ShieldCheck` | M2+ | Visually separated (divider + "Operator" label) at the bottom of the nav. Hiding it for non-operators is a UI courtesy, not the access boundary — RLS/role checks on the backend are what actually gate it. |

Order (top to bottom in the sidebar / left to right where it appears): Feed, Review queue, History, Searches, Connections, Credits & Plans, Settings — reflects daily-use frequency (glance at feed/queue first, configure searches/connections less often). Back office sits below a divider, operator accounts only.

### 8.2 Focus shell (auth screens, onboarding)

Used for: sign up, sign in, reset password (S-001/S-002) and the onboarding steps before the profile is complete (checklist, resume upload, manual fill — S-003/S-004). No sidebar, no bottom tabs — a brand-new user isn't ready for 7 nav destinations before they have a profile, and this matches the "progressive disclosure" pattern for funnel-shaped flows.

```
Desktop / tablet (≥768px)
┌──────────────────────────────────────────────────────────┐
│ [AutoApplier]                    [Баланс: 20 ·][EN ▾][@]  │  60px header
├──────────────────────────────────────────────────────────┤
│                                                            │
│                    (centered content,                     │
│                     max 480px auth card /                 │
│                     720px onboarding step)                │
│                                                            │
└──────────────────────────────────────────────────────────┘

Mobile (<768px) — identical structure, header content compresses:
┌───────────────────────────────┐
│ [Logo]      [20·][EN▾][@]      │  60px header, no wordmark, icon only
├───────────────────────────────┤
│                                 │
│         (full-width             │
│          content,               │
│          16px gutter)           │
│                                 │
└───────────────────────────────┘
```

Header in focus mode: logo (left), then — once signed in — credit balance, language switcher, account menu (right). Pre-auth (sign-up/sign-in/reset screens themselves), only the logo and language switcher show (no credit balance or account menu yet, nothing to sign out of).

### 8.3 Full shell (post-onboarding)

```
Desktop ≥1280px
┌────┬───────────────────────────────────────────────────────────┐
│Aa  │  ← page title / breadcrumb        [20 credits ▾][EN ▾][@] │ 60px header
│    ├───────────────────────────────────────────────────────────┤
│Feed│                                                            │
│Rvq │                                                            │
│Hist│                    page content                           │
│Sear│              (max-width 1120px, centered,                 │
│Conn│               32px side gutter)                            │
│Cred│                                                            │
│Sett│                                                            │
│────│                                                            │
│Ops │                                                            │
└────┴───────────────────────────────────────────────────────────┘
 248px          sidebar collapses to a 72px icon rail via the
 expanded       toggle (top of sidebar); labels disappear, icons
                + tooltips remain. Active item: --primary-subtle
                background + --primary text/icon + 2px left bar.

Tablet 768–1279px: sidebar defaults to the 72px icon rail (same
active-state treatment), expandable by the same toggle. Header
and content behave as desktop, gutter drops to 24px.
```

```
Mobile <768px
┌───────────────────────────────┐
│ [☰]   Page title    [20][EN▾][@]│ 60px top bar
├───────────────────────────────┤
│                                 │
│         page content            │
│         (16px gutter)           │
│                                 │
├───────────────────────────────┤
│ Feed   Queue   History   More  │ 60px bottom tab bar (≤5 items,
└───────────────────────────────┘ icon + tiny label; "More" opens
                                   a Sheet: Searches, Connections,
                                   Credits & Plans, Settings,
                                   [Back office if operator])
```

Bottom tab bar keeps to Nielsen/shadcn convention of ≤5 destinations (here: 4 + More) — see §5's UX priority table. `☰` opens the same full nav as a left `Sheet` (248px) for anyone who prefers it to the bottom bar or is on a device without one.

### 8.4 Header contents (both shell modes)

Left to right, right-aligned cluster:

1. **Credit balance** (`--credit` token, `--font-mono` number + "credits"/"кредитов" label): a `Button`-styled trigger ("20 credits" / "20 кредитов") opening a `Popover` with a one-line breakdown and a link to Credits & Plans. Below 5 credits, the number turns to the balance still using `--credit` (not `--danger` — running low is expected/normal, not an error) but the popover leads with a line about topping up. At 0, the badge itself switches to a `--warning`-toned treatment (icon + "0 credits") since autopilot is now paused (PRD rule) — that's a real state change, not decoration.
2. **Language switcher**: `DropdownMenu`, trigger shows the current language as plain text ("EN" or "RU", not a flag), menu lists "English" / "Русский" with a check on the active one. Persists immediately on selection (no separate save step) — see S-005.
3. **Account menu**: `Avatar` (initials) → `DropdownMenu`: Settings, Sign out. Operator accounts get an extra "Back office" entry here too, not just in the sidebar, since it's a small target to find otherwise.

### 8.5 Connection-status indicators

Wherever a channel (email, Telegram, LinkedIn) is shown — Connections screen (M3/M4), a compact strip on Feed/Review queue (M2+) — status renders as the custom dot+label component (§5): a `--radius-full` 8px dot in the `--status-*` color, plus the literal text label next to it (never the dot alone). Four states: Connected (`--success`), Needs attention (`--warning` — e.g. re-auth needed soon), Disconnected (`--disabled-foreground`, neutral gray — the user chose this, it's not an error), Restricted (`--danger` — the platform paused it after detecting risk). Not part of M1's build (no channels connect until M3/M4) but specified here so the token/component choice is set once and M3's designer work (extending this file) only adds the screen, not new tokens.

### 8.6 Accessibility of the shell

- Landmark roles: `header` (banner), `nav` (sidebar / bottom bar), `main` (page content). Skip link ("Skip to content" / "Перейти к содержимому") as the first focusable element, visually hidden until focused.
- Focus order: skip link → header left-to-right (logo, page title) → header right cluster (credit balance, language, account) → sidebar top-to-bottom → main content. On mobile: skip link → top bar (menu toggle, title, credit balance, language, account) → main content → bottom tab bar.
- Sidebar/bottom-bar active item is conveyed by more than color: `aria-current="page"` plus the left bar / icon fill, not background tint alone.
- The sidebar collapse toggle and mobile menu toggle are real buttons with `aria-expanded` and an accessible name ("Collapse navigation" / "Свернуть навигацию"), not bare icons.
- All header/nav interactive elements meet the 44×44px minimum target even where the visual icon is 20px.

---

## 9. Accessibility summary (WCAG 2.2 AA)

This section is the checklist a screen spec's "Accessibility" section should be read against; it doesn't replace the per-screen focus-order/labels work, it's the baseline that applies everywhere.

- **Contrast**: text ≥4.5:1, UI boundaries ≥3:1 — all current tokens verified in §2. Anyone adding a color reruns the check (§2.3).
- **Color is never the only signal**: status, validation, and score bands all pair color with an icon and/or text label.
- **Keyboard**: every interactive element reachable and operable by keyboard alone, in a visually logical order; no keyboard traps (dialogs/sheets trap focus intentionally while open and return it on close, which is the one correct kind of trap).
- **Focus visible**: the default browser/shadcn focus ring is never removed; `--ring` token, 2px, 2px offset, visible on every focusable element including inside custom components (dropzone, checklist rows).
- **Touch targets**: ≥44×44px, ≥8px spacing between adjacent targets (icon buttons in a table row, chip remove buttons).
- **Reduced motion**: respected globally (§3.7); no functionality depends on an animation completing.
- **Forms**: every input has a real, visible `Label` (not a placeholder standing in for one); errors are specific and programmatically associated (`aria-describedby`) and announced (`role="alert"`); required fields marked with `aria-required` and a visible `*`, not color alone.
- **Live regions**: toasts (`aria-live="polite"`), inline form errors and the resume-extraction status text (`aria-live="polite"`, updates on each phase change) are announced without moving focus.
- **Language**: `<html lang="en">` / `lang="ru"` set to match the active UI language, updated on switch.
- **No hard-coded strings**: every user-facing string goes through the i18n layer, including RU pluralization (§6.2 note) — this is also an M1 acceptance criterion (S-005).

---

## Change log
- 2026-09-27 — Initial version (T-002): tokens, type scale + RU-fit rules, spacing/radii/shadow/motion, breakpoints, component inventory, voice & tone + EN/RU glossary, empty/error/loading patterns, app shell (desktop + mobile, focus + full).
- 2026-09-27 — T-002 completion pass (continuing the session above, same day): added §2.4 (text-on-tinted-fill contrast rule — computing it caught `--success` on `--success-subtle` failing AA at 4.49:1), added the three light-theme `-subtle` rows to §2.1's table, corrected S-001.md/S-003.md accessibility sections that had cited the wrong (passing-looking) ratio for alerts actually rendered on a tint, refreshed the stale S-001 prototype screenshots and removed an undocumented hardcoded color from S-001.html.
