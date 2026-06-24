# Onboarding — "The Banyan Journey" (greenfield)

**Product:** LegacyNest — digital legacy, family preparedness, health records, life-story preservation
**Primary surface:** **Android mobile browser (80%)**. Desktop (20%) is the *same* single-column flow, centered.
**Theme:** Growth of a **Banyan Tree** — family, wisdom, protection, continuity, legacy across generations.
**Status:** Greenfield. The existing `/onboarding` route and its per-feature draft tables are being dropped.

---

## 0. The one strategic insight (read this first)

For a 40+ audience on a phone, the failure mode is **not** "ugly UI" — it's **front-loading data collection**. A long setup wizard before any value = drop-off.

So the design principle is: **onboarding's job is activation, not data capture.**
Capture the *minimum* to personalize and earn trust; defer everything else into the app, contextually. The Banyan tree keeps growing *inside* the product as they use it — onboarding only plants the seed and shows the first sprout.

This single decision shapes everything below: fewer screens, one question each, account creation as late as defensible, and the heavy "build your plan" data spread across the real app — not the funnel.

---

## 1. The 80/20 → layout strategy

There is **one layout**: a single, centered column with a max width (~`460px`).

- **Mobile (80%):** the column *is* the screen.
- **Desktop (20%):** the same column is centered on a soft, ambient Banyan backdrop — like holding a phone. **We do not build a second desktop layout.** This keeps parity, halves QA, and means the 20% never gets a worse-tested path.

No side-by-side. No sidebars. No multi-column grids. Ever.

---

## 2. Android browser engineering constraints (where this lives or dies)

These are the things that actually break "premium native feel" on Android Chrome/WebView. Each is a first-class requirement, not a polish item.

### 2.1 Viewport height — kill `100vh`
Android Chrome's address bar shows/hides on scroll, so `100vh` is **wrong** (it's the *largest* height and overflows). This is the #1 cause of a "Continue" button sitting below the fold.
- Use **`100dvh`** (dynamic viewport height) for full-screen step containers.
- `@supports` fallback chain: `100vh` → `100svh` → `100dvh`.
- The action zone is a flex footer in a `dvh` column, so the CTA is *always* on-screen without scrolling.

### 2.2 Soft keyboard overlap — the classic bottom-CTA bug
When an input focuses, the Android keyboard changes the viewport. A naively `position: fixed` bottom CTA gets covered.
- Add `interactive-widget=resizes-content` to the viewport meta so layout shrinks and the CTA rides **above** the keyboard.
- Don't `position: fixed` the CTA; make it the last flex child of a `dvh` column so it tracks the resized viewport.
- On focus, scroll the active field into view (`scrollIntoView({block:'center'})`).
- Prefer flows where the keyboard-bearing screen has **only** the input + CTA (nothing to lose behind the keyboard).

### 2.3 Safe areas & gesture nav
Android gesture nav bar sits at the bottom — exactly where our CTA lives.
- `<meta viewport ... viewport-fit=cover>`.
- Action zone gets `padding-bottom: max(16px, env(safe-area-inset-bottom))`.

### 2.4 Hardware/gesture **back button**
Android users press Back constantly. Back must mean "previous step," not "exit the app."
- **Route-per-step** (each step is a real URL) so each step is a history entry and Back is free + correct.
- Exiting from the first step is intentional (returns to landing).

### 2.5 Low-end device performance (fragmentation)
The median Android in this segment is a cheap phone, slow CPU, 360px wide.
- Tree art is **one SVG** with staged reveals — not multiple PNGs. Tiny, scalable, animatable.
- Animate with **CSS transforms/opacity only** (GPU); no layout-animating libraries.
- Onboarding route is code-split; prerender the welcome screen for sub-2s FCP on 3G.
- Reserve image space to avoid layout shift (CLS = 0).

### 2.6 Native feel in the browser
- `theme-color` meta matched to the header so Chrome's address bar adopts the brand color.
- `touch-action: manipulation` (no 300ms tap delay), visible `:active` press feedback (no hover reliance).
- Web app manifest + maskable icon so "Add to Home Screen" looks installed (see open question Q3).
- System font stack first paint; brand font swaps in without shifting layout.

### 2.7 Accessibility for 40+ (Material baseline, not iOS)
- Targets ≥ **48×48dp**, ≥ 8dp apart (Android Material standard).
- Base text ≥ 16px in `rem`; respects OS font scaling.
- WCAG AA contrast; state never by color alone (fill + check + ring).
- Honors `prefers-reduced-motion` (tree grows instantly, no animation).

---

## 3. Flow architecture

Route-per-step under a layout route that owns the tree + draft persistence:

```
/start            → Welcome (seed)            [prerendered, fast FCP]
/start/who        → Who are you protecting?   (1 choice)
/start/goal       → What matters most now?    (1 choice)
/start/name       → Name your nest            (1 short input)
/start/trust      → Privacy promise           (read + accept, no data)
/start/account    → Create account            (deferred to here — see Q1)
/start/done       → Full canopy → Enter app
```

- **Layout route** renders the persistent growth header + the bottom action zone, and writes the draft on each step change.
- **Resume:** on load, read progress → redirect to first incomplete step, tree at matching stage.
- **Funnel analytics** come free: each step is a URL.

---

## 4. Data model (greenfield, deliberately minimal)

Don't recreate granular per-feature tables for onboarding. One profile row + one JSONB draft:

```sql
-- 1 row per user; the durable result of onboarding
create table profile (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  protect_for  text,          -- who: self | child | parent | family
  primary_goal text,          -- why: health | legacy | preparedness | story
  nest_name    text,          -- their personalised label
  onboarded_at timestamptz,
  created_at   timestamptz default now()
);

-- transient: lets a half-finished funnel resume across devices/reloads
create table onboarding_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  step       text,            -- last route segment reached
  draft      jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
```

Pre-account drafts live in `localStorage` and are flushed to `onboarding_progress` the moment an account exists. Everything else (records, documents, plan) is captured later, in-app.

---

## 5. Banyan growth → step mapping

| Step | Stage | One thing asked |
|---|---|---|
| Welcome | Seed in soil | (nothing — just "Begin") |
| Who | Sprout | Who you're protecting |
| Goal | Sapling | What matters most right now |
| Name | Young trunk | Name your nest |
| Trust | First branches | Read + accept privacy promise |
| Account | Strengthening roots | Email + password (or social) |
| Done | Full canopy + aerial roots | Enter LegacyNest |

Six taps to value. Each screen: one decision, CTA always in the thumb zone.

---

## 6. Definition of Done
- [ ] Verified on a **360px** Android viewport (not just large phones): CTA visible without scroll on every step.
- [ ] Keyboard-open on the `/name` and `/account` steps does **not** cover the CTA.
- [ ] Android Back button moves one step back on every screen; never dead-ends.
- [ ] `prefers-reduced-motion` shows final stages instantly.
- [ ] Lighthouse mobile (throttled): Performance ≥ 90, Accessibility ≥ 95, CLS = 0.
- [ ] Draft resumes after reload, tab background, and (post-account) on a second device.
- [ ] Desktop = same column centered; zero desktop-specific layout branches.

---

## 7. Decisions (locked)
1. **Account timing → LATE.** User experiences Welcome → Who → Goal → Name first; sign-up happens at `/start/account` near the end. Pre-account answers live in `localStorage`, flushed to `onboarding_progress` the instant the account exists.
2. **Scope → PURE ACTIVATION.** ~6 light screens, one decision each. No real records/documents/plan-building in the funnel — all deferred into the app, contextually.
3. **Installable PWA → YES, NOW.** Ship web manifest + maskable icon + `theme-color` + `standalone` display so "Add to Home Screen" feels installed on Android.

### Consequence of "late account"
- Steps `/who`, `/goal`, `/name`, `/trust` run **unauthenticated**; their routes must not require a session.
- The Banyan draft is anonymous until `/account`; on successful sign-up we (a) create the `profile` row, (b) flush the localStorage draft into it, (c) clear the local draft.
- If a logged-out returning user reopens, localStorage resumes them to the right step + tree stage.

---

## 8. Build sequence
1. **PWA shell** — `manifest.webmanifest`, maskable + any-size icons, `theme-color`, viewport meta (`viewport-fit=cover`, `interactive-widget=resizes-content`), `display: standalone`.
2. **CSS primitives** — `.step-screen` (dvh column), `.action-zone` (safe-area bottom, thumb reach), 48dp target utilities, reduced-motion guard.
3. **Banyan SVG** — single asset, 6 staged reveals driven by a `stage` prop (transform/opacity only).
4. **Layout route** `/start` — owns growth header + action zone + draft read/write + resume redirect.
5. **Step routes** — `who`, `goal`, `name`, `trust`, `account`, `done` (each a real URL; unauth-friendly through `trust`).
6. **Data** — migration for `profile` + `onboarding_progress`; finalize-on-account-create logic.
7. **Drop legacy** — remove old `/onboarding` route + its draft tables once parity is confirmed.
8. **Verify** — 360px Android viewport, keyboard-open CTA, Back button, reduced-motion, Lighthouse, draft resume.
