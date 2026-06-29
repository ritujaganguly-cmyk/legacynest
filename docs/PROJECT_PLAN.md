# LegacyNest — Project Plan (MVP → Full Product → Version 2)

> Roadmap and distance-to-launch for each milestone. Sits **above**
> `REDESIGN_PLAN.md` (which details Version 2). Effort is in T-shirt sizes
> (S/M/L/XL), not calendar dates — calendar time depends on build velocity
> (currently a solo founder + AI assistant). Last updated: 2026-06-29.

---

## 1. Milestone map

| | Milestone | What it is | Est. complete |
|---|-----------|-----------|:---:|
| **M0** | Current state | The built, deployed app (single account = single child) | — |
| **M1** | **MVP launch** | The existing full plan, stabilized, reliable, legally launchable — free | **~70%** |
| **M2** | **Full product** | M1 + the freemium 10-minute emergency wedge (the activation fix) | **~35%** |
| **M3** | **Version 2** | The person/child/role redesign, multi-child, subscription infra | **~10%** (design done, build not started) |

Headline: **you are closest to M1** — the gap is mostly stabilization, ops, auth,
and legal, not new features. M2 is a focused build on top. M3 is the large refactor
fully specified in `REDESIGN_PLAN.md`.

---

## 1A. Pre-requisite: Code & Repo Clean-up — target 10 July 2026

**Before any milestone work begins, the codebase and GitHub must be in a clean,
releasable state owned entirely by GitProjectRituja.**

| # | Task | Done by |
|---|------|---------|
| 1 | All edits, commits and pushes go to `ritujaganguly-cmyk/legacynest` only — zero accidental Ganguly80 touches | Ongoing |
| 2 | Remove / replace every remaining hardcoded `GitProjectGanguly80` path in source files | 10 Jul |
| 3 | Relaunch Claude Code from `C:\LegacyNest\Git\GitProjectRituja\legacynest` so the session cwd, preview server and scratchpad are all Rituja | 10 Jul |
| 4 | Run pending migrations **048–051** on the live Supabase instance; verify every module loads | 10 Jul |
| 5 | `routeTree.gen.ts` and any other generated/dirty files committed or discarded — clean `git status` | 10 Jul |
| 6 | No open uncommitted changes on main; branch `main` in sync with `origin/main` | 10 Jul |

**Definition of done:** `git status` is clean, `git log --oneline -1` is on Rituja, and
the app builds without errors from a fresh `npm run build`.

---

## 1B. Target: 15 August 2026 launch (Independence Day)

**15 Aug 2026 is the fixed public-launch milestone** (~6.5 weeks from 30 Jun). The
launch bundles **M1 (stabilized full plan) + the M2 free emergency wedge** — a working
free 10-minute emergency product *and* the full plan, all free. It is **date-driven:
we cut scope, not the date.**

**In scope for 15 Aug (must-have):**
- All M1 launch gates: migrations live, emergency reliability, auth, legal pages,
  backups, plus a QA pass.
- M2 wedge: 4 break-glass blocks, the 10-minute onboarding, landing restructure.
- Wallet card + free-flow instrumentation — *include if pace holds; these are the
  first to cut to fast-follow if the date is threatened.*

**Fast-follow (right after launch):** coordinator login-raise (needs the v2 role model).

**Post-launch track (Sep–Nov):** all of Version 2 (M3).

**6.5-week schedule (start 30 Jun):**
| Week | Focus |
|------|-------|
| Wk 1 (30 Jun) | migrations live + backups; **start legal pages in parallel** (external turnaround); begin QA |
| Wk 2 (7 Jul) | emergency reliability hardening; finish QA |
| Wk 3 (14 Jul) | auth hardening (signup + verification) |
| Wk 4 (21 Jul) | monitoring + mobile pass → **M1 internally ready ~25 Jul** |
| Wk 5 (28 Jul) | 4 break-glass blocks + landing restructure |
| Wk 6 (4 Aug) | 10-minute onboarding + wallet card |
| Wk 7 (11–15 Aug) | instrumentation + polish + final QA → **launch 15 Aug** |

**Two things most likely to threaten the date:** (1) legal-page turnaround — so start it
in week 1, in parallel; (2) the week-7 buffer — protect it. If pace slips, cut the
wallet card and instrumentation to fast-follow and launch with
M1 + break-glass + onboarding.

**Milestone target dates:** M1 internally ready **~25 Jul**; public launch
(M1 + M2 wedge) **15 Aug**; Version 2 (M3) **~late Oct**.

---

## 2. M0 — Where we are today

**Built and deployed** (Vercel, `ritujaganguly-cmyk/legacynest`):
- Full module set: child profile, parent profile, care circle, succession/caregiver,
  medical (records, meds, therapies, contacts), insurance, financial, legal, residential,
  digital vault, emergency, disability documents, AI assistant, action plan.
- Auth + onboarding wizard; admin console (dashboard, emergency, support, feedback,
  users); support + feedback; caregiver token portal (`/c/{token}`); emergency-confirm
  code flow.
- Supabase with `protected` (SPDI) + `public` schemas; RLS per user.

**Recently stabilized** (this work stream):
- protected-schema access via `pdb`; `.single()` → `.maybeSingle()` (406 fixes);
  vault/UDID upload + child-profile link; financial/legal/emergency data reads;
  profile-image reload; legal "I understand" persistence; chapter-banner completion;
  account deletion RPC; admin user delete tab.

**Known gaps (carried into M1):**
- A few migrations (048–051) must be **run on live Supabase**.
- Emergency activation path needs reliability hardening + E2E testing.
- Auth auto-provisions accounts on sign-in (`session-store`) — not launch-grade.
- No public Terms / Privacy Policy pages yet (DPDP).

---

## 3. M1 — MVP launch  ·  ~70% complete

**Definition:** the current full special-needs plan, working end-to-end and legally
launchable to the public, **free**. Single account = single child (no redesign yet).

**What's done:** all modules built; core data bugs fixed; admin tooling; compliance
primitives (SPDI notices, consent, export/delete).

**What's left (the 30%):**

| # | Item | Effort | Type |
|---|------|:---:|------|
| 1 | Run migrations 048–051 on live DB; confirm every module loads/saves live | S | Ops |
| 2 | Full module QA pass (each section: create/edit/delete/reload) | M | QA |
| 3 | Emergency reliability hardening — no silent catches, idempotent activation, E2E checklist (REDESIGN_PLAN §13.1) | M | Eng |
| 4 | Auth hardening — real signup + email verification; stop silent auto-provision | M | Eng |
| 5 | Terms of Service + Privacy Policy pages (DPDP/SPDI) | S | Legal/content |
| 6 | Error monitoring (surface failures instead of silent `safe()` fallbacks) | S | Eng |
| 7 | Mobile/responsive pass on key flows | S | UI |

**Blockers to public launch:** #1, #3, #4, #5 are hard gates. #2/#6/#7 strongly advised.

**Distance:** small-to-medium. No new features — stabilization + ops + legal.

---

## 4. M2 — Full product (freemium emergency wedge)  ·  ~35% complete

**Definition:** the strategic activation fix — a 10-minute free emergency product that
gives instant value, with the full plan as the (still-free-at-launch) upgrade. The
parts that **don't** require the v2 model live here; coordinator-login lands in M3.

**What's left:**

| # | Item | Effort | Needs v2? |
|---|------|:---:|:---:|
| 1 | Emergency page redesign — 4 break-glass blocks (`daily_care/medical/financial/legal`) (REDESIGN_PLAN §5.1) | M | No |
| 2 | 10-minute free onboarding flow (dependent → 4 blocks → 1–2 coordinators → ready) | M | No |
| 3 | "You're ready" wallet card — `jspdf`/`html2canvas`, minimal PII, QR → tokenized URL (§5.1) | M | No |
| 4 | Restructure landing: quick emergency path vs full plan | S | No |
| 5 | Time-to-complete instrumentation for the free flow | S | No |
| 6 | Coordinator **login-raise** path (in-app) | M | **Yes → M3** |

**Distance:** medium. Items 1–5 ship on the current single-child model and deliver the
core strategy (fast time-to-value). Item 6 (logged-in coordinator) inherently needs the
v2 role model, so it crosses into M3.

---

## 5. M3 — Version 2 (the redesign)  ·  ~10% complete

**Definition:** everything in `REDESIGN_PLAN.md` — person/child/`child_member` role
model, multiple children per parent, caregiver/coordinator logged-in dashboards,
subscription/entitlement infrastructure (held open by `FREE_LAUNCH`), Razorpay.

**Status:** design 100% locked; build 0%. Maps directly to the 8 phases in
`REDESIGN_PLAN.md §12`:

| v2 Phase | Scope | Effort |
|---|---|:---:|
| 1 | Additive schema: `child`, `child_member`, `subscription`, backfill | M |
| 2 | `child_id` on all data tables + backfill + dual-read | M |
| 3 | App active-child context + switcher; data-layer cutover | L |
| 4 | Emergency redesign tie-in + coordinator login-raise | M |
| 5 | Caregiver/coordinator logged-in dashboards | M |
| 6 | Subscription gating + entitlement flag + paywall UI | M |
| 7 | RLS cutover to membership; retire `user_id` UNIQUE | M |
| 8 | Razorpay integration + webhooks (only when pricing turns on) | M |

**Distance:** large (XL overall). It touches every table, every RLS policy, the session
store, routing, and ~80 data-layer call sites. Non-breaking if done in the phased order.

---

## 6. Honest distance summary

| Milestone | Complete | What stands between you and it | Relative effort remaining |
|-----------|:---:|--------------------------------|:---:|
| **M1 MVP** | ~70% | Run migrations, QA, harden emergency, real auth, legal pages | **S–M** |
| **M2 Full product** | ~35% | M1 + the 4-block emergency, 10-min onboarding, wallet card | **M** |
| **M3 Version 2** | ~10% | The full 8-phase redesign (design done, build not started) | **XL** |

You can **launch M1 soon** (it's stabilization, not features), layer **M2** to fix the
activation funnel, and run **M3** as a separate, phased track.

---

## 7. Recommended sequencing

1. **Close M1 → launch.** Run migrations, QA, harden the emergency code-path, ship real
   auth + legal pages. Launch the full plan free. *(Validates the product with real users
   on the model you already have.)*
2. **M2 wedge (no-v2 parts).** Build the 4-block emergency, the 10-minute onboarding, and
   the wallet card on the current model. *(Fixes the 2-hour-wall activation problem fast,
   without waiting for the refactor.)*
3. **M3 redesign, phased.** Start `REDESIGN_PLAN` Phase 1 (additive schema) — safe and
   non-breaking — and work through to multi-child, caregiver/coordinator dashboards, and
   the entitlement gate. Flip pricing on only when you choose.

Rationale: don't block a near-ready launch on a large refactor. Ship, learn, then redesign
with real usage data — and the freemium wedge (M2) buys you activation in the meantime.

---

## 8. Cross-cutting pre-launch must-dos (apply before ANY public launch)

- **Run pending migrations on live** and verify (048–051).
- **Real auth**: signup + email verification; remove silent auto-provision.
- **Emergency reliability**: the activation path must fail loudly and be E2E-tested
  (REDESIGN_PLAN §13.1) — it's the trust/liability surface.
- **Legal**: Terms + Privacy Policy (DPDP/SPDI), cookie/consent basics.
- **Monitoring**: replace silent `safe(fn, fallback)` swallowing with surfaced errors
  on critical paths; add basic error logging.
- **Backups**: confirm Supabase point-in-time recovery is on before real user data lands.

---

## 9. Relationship to REDESIGN_PLAN.md

- `PROJECT_PLAN.md` (this doc) = the **what-ships-when** across MVP, full product, v2.
- `REDESIGN_PLAN.md` = the **how** of Version 2 (M3): data model, RLS, migrations,
  freemium/entitlement, risk mitigations, and the 8 build phases.
- M1 and M2 run on the **current single-child model**; M3 introduces the new model.
