# LegacyNest — Person / Child / Role Redesign + Freemium Emergency Plan

> Planning document. No code in this file. This is the agreed design and the
> phased implementation plan derived from the product discussion.
> Last updated: 2026-06-29.

---

## 1. Why we are doing this

Two problems with the current product:

1. **Data model is single-tenant-per-user.** `child_profile.user_id` is `UNIQUE`,
   and every data table is keyed on the parent's auth id. One account = one child =
   one dataset. There is no real concept of caregivers/coordinators as people, no
   multiple children, and no way for a helper to log in and see only what concerns them.

2. **Activation friction.** The full plan takes ~2 hours to fill. People like the app
   but stall at the wall. We need a 10-minute free product that delivers a complete,
   usable result, with the full plan as the paid upgrade.

The redesign solves both: a **child-centric, role-based model**, plus a **free
emergency tier** that is the activation wedge.

---

## 2. Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Tenant = child.** Data is keyed by `child_id`, not the parent's `user_id`. |
| 2 | **person ↔ child is many-to-many**, via a `child_member` role join. |
| 3 | **Roles:** `owner`, `caregiver`, `coordinator`. (`viewer` deferred — add later if needed; `parent` collapsed into `owner`.) |
| 4 | **All planning data is per-child** (separate corpus, trust, succession per child). |
| 5 | **Two owners allowed**, but only when an existing owner invites the second, with an invite→accept handshake. |
| 6 | **Caregiver = view-only.** Never writes. |
| 7 | **Coordinator = view + raise emergency activation.** The only non-owner write, scoped to activation. |
| 8 | **Same person can be caregiver AND coordinator** for the same child → two rows. Uniqueness includes role. |
| 9 | **No-login flows stay.** `/c/{token}` caregiver portal and activation codes remain as delivery mechanisms; `child_member` is the canonical relationship. |
| 10 | **Subscription is per-account (per owning person), capped at 3 owned children** (soft limit). |
| 11 | **Emergency feature is free for everyone.** All other functionality is subscription-gated. |
| 12 | **Activation is purely in-app / web. No email, no SMS, no push, no cost.** A coordinator raises it via the generic URL or by logging in and taking action; the status flips and is seen on next login / via URL. |
| 13 | **Not restricted to special-needs children.** Product works for any dependent (single parents, frequent travelers, expats). Positioning/marketing stays special-needs-focused; this is a marketing choice, not enforced in code. |
| 14 | **Free at launch; price later.** The full entitlement gate is built now but held open by a `FREE_LAUNCH` flag — flipping it on turns pricing live with no rework. `viewer` role deferred; provider = **Razorpay** (swappable); wallet card = client-generated, QR → tokenized URL. |

---

## 3. Target data model

### 3.1 Core entities

- **person** — one `auth.users` row per email. Owns a `person_profile` (the human's
  own info: name, phone, dob). A person can simultaneously be owner of one child and
  caregiver/coordinator of another.
- **child** — the tenant record. Owns all planning data. PK `id`.
- **child_member** — the role + permission join between a person and a child.
- **subscription** — per person; gates the paid features.

### 3.2 ERD (text)

```
person (auth.users + person_profile)
   │ 1
   │
   ∞
child_member  (role: owner | caregiver | coordinator, status, permissions)
   ∞
   │
   │ 1
child  ──1───∞──>  child data (medical, legal, financial, vault, emergency, …)
```

- person 1—∞ child_member
- child  1—∞ child_member
- child  1—∞ each data table (keyed by `child_id`)
- "becoming a parent" = creating a `child` where your role is `owner` (no new account).

---

## 4. Freemium boundary

### Free — open to everyone, no subscription
- A `child` (minimal — just a name/label for the dependent).
- The 4 **break-glass** blocks: `daily_care`, `medical`, `financial`, `legal`
  (hand-typed summaries, independent of the full data modules).
- Coordinators + the **emergency activation protocol** (unchanged logic).
- Coordinator can raise activation by **generic URL** or by **logging in**. In-app
  only; no notifications, no external cost.

### Subscription only
- Creating any full-plan module: medical records, medications, therapies, vault,
  financial (assets/income/expenses/assumptions), insurance, legal docs, residential,
  succession, care circle, disability documents.
- The **"share documents + extra info" layer** inside an emergency (attach vault docs
  and additional instructions that activated coordinators can see).

### Gating rules
- Free always passes. The gate is purely additive.
- Coordinators and caregivers **never** need a subscription; raising/viewing an
  emergency is always free.
- Subscription lives on the **owner (person)**; one subscription covers all children
  that person owns, up to **3** (soft cap — over 3 is a "contact us" path, not a wall).

---

## 5. Emergency page redesign

### 5.1 Free layout
1. **Break-glass information** — 4 cards: Daily care · Medical · Financial · Legal.
   Each is a short free-text block the owner types. This is the core free artifact.
2. **Emergency activation protocol** — designate coordinators (name, email, phone,
   activation code), majority rule, consent text. Logic unchanged.
3. **"You're ready" confirmation** — after setup, a confidence screen naming the
   coordinators who can act, plus a printable **wallet card**. *(New.)*
   - **Cheapest + compliant:** generated client-side with the existing `jspdf` +
     `html2canvas` deps — no new dependency, no external/server cost.
   - **A lost card must not leak SPDI.** The card face shows only the minimum the owner
     chooses (e.g. dependent name + "in an emergency, contact: <coordinator name/phone>").
   - The **QR encodes a tokenized activation URL** (`/c/{token}` or
     `/emergency-confirm`), never raw personal data. Full break-glass info appears
     **only after a coordinator authenticates** (activation code or login) — so a
     random finder gets a "designated coordinator? enter your code" page, not the data.

### 5.2 Coordinator raise-activation (free, in-app only)
- **Path A — generic URL:** existing `/emergency-confirm` flow with activation code.
- **Path B — logged in:** a coordinator who has an account sees the children they
  coordinate and a "Raise emergency" button. *(New.)*
- Both flip `emergency_activations` / activation-request status. Owner and other
  coordinators see the status **on next login / via URL**. No email/SMS/push.

### 5.3 Paid layer
- A document-share panel (select vault docs + extra instructions). Visible/active only
  if the owner has an active subscription. Activated coordinators then see those docs.

---

## 6. Database changes

### 6.1 New tables
- **`child`** — tenant. Columns = current `child_profile` minus `user_id UNIQUE`,
  plus `created_by uuid`. (Migration backfills one row per existing `child_profile`.)
- **`child_member`** —
  `(id, child_id, person_id NULL, invited_email, role, relationship, status,
  permissions jsonb, invited_by, accepted_at, access_token, created_at)`.
  - `UNIQUE (child_id, person_id, role)`
  - `UNIQUE (child_id, invited_email, role)` for pending invites
  - `role ∈ {owner, caregiver, coordinator}`; `status ∈ {invited, active, revoked}`
- **`subscription`** — `(person_id PK → auth.users, status, plan, started_at,
  current_period_end, updated_at)`. `status ∈ {none, active, past_due, cancelled}`.

### 6.2 Repurposed tables
- **`parent_profile` → `person_profile`** — person's own info. Move
  `relationship_to_child` OUT (it now lives per-relationship in `child_member`).

### 6.3 Add `child_id` to every per-child data table
Protected: `medical_records`, `medications`, `therapies`, `health_contacts`,
`disability_documents`, `financial_assets`, `financial_income`, `financial_expenses`,
`financial_assumptions`, `insurance_policies`, `legal_will`, `legal_trust`,
`legal_guardianship`, `legal_poa`, `succession_plans`, `residential_options`,
`residential_checklist`, `residential_letter_of_intent`, `emergency_plan`,
`emergency_institutions`, `emergency_coordinators`, `emergency_consent`,
`digital_vault_documents`.

Public: `care_circle`, `plan_progress`, `nominations`, `caregiver_shares` (proper FK),
`emergency_activations`, `emergency_checkins`, `financial_planning_preferences`.

Stay **person-keyed** (no `child_id`): `person_profile`, `advisor_chat_logs`,
`privacy_acknowledgement`, `user_consent`, `profiles`, `subscription`.

### 6.4 Emergency-specific schema
- `emergency_plan`: replace single `break_glass_instructions` with structured
  **`break_glass jsonb`** holding `{ daily_care, medical, financial, legal }`
  (keeps room for more categories later).
- Ensure activation tables allow a **coordinator** insert (the one non-owner write).

### 6.5 RLS — helper functions
```
can_access_child(child_id)   → EXISTS active member (person = auth.uid())
can_edit_child(child_id)     → … AND role = 'owner'
is_coordinator_of(child_id)  → … AND role = 'coordinator'
can_manage_members(child_id) → … AND role = 'owner'
has_active_subscription(person_id) → TRUE while the free-launch flag is on;
                                     once pricing is live →
                                     subscription.status = 'active'
                                     AND current_period_end > now()
```

### 6.6 RLS — policy rewrite (every data table)
- **read:** `USING (can_access_child(child_id))`
- **write (most tables):** `WITH CHECK (can_edit_child(child_id))`
- **paid modules write:** also require
  `has_active_subscription(owner_of(child_id))` — server-side enforcement of the
  paywall (app-layer gate alone is bypassable).
- **emergency activation tables write:** `can_edit_child OR is_coordinator_of`.
- **`child_member` insert/delete:** `can_manage_members(child_id)` — this is what
  enforces "second owner only if an existing owner grants it."
- **free tables** (`child` basic fields, `emergency_plan` break-glass, coordinators,
  `emergency_consent`): no subscription check.

### 6.7 Functions to update / add
- Update `get_caregiver_portal` / `get_caregiver_all_portals` to resolve via
  `child_member` + `child_id`.
- New RPCs: `create_child`, `add_member(child, email, role, permissions)`,
  `accept_invite(token)`, `raise_emergency_activation(child)`, `list_my_children()`.
- Update `request_account_deletion` and `admin_delete_user`: a person may co-own
  children — delete children where they are the **sole** owner, otherwise just remove
  their membership; cascade per-child data only when the child itself is deleted.

### 6.8 Migration / backfill (additive, non-breaking)
1. Create `child`, `child_member`, `subscription`.
2. One `child` per existing `child_profile`; one `child_member(role=owner, status=active)`
   per existing owning user.
3. Convert `caregiver_shares` → `child_member(role=caregiver)`;
   `emergency_coordinators` → `child_member(role=coordinator)`.
4. Add `child_id` to all data tables; backfill from `user_id` via ownership.
5. Keep `user_id` columns during transition (dual-read) until the RLS cutover.

---

## 7. App data-layer changes (`src/lib/data/mock.ts`)

- **Active-child context:** `listMyChildren()`, `getChild(childId)`, current ~80
  `.eq("user_id", user.id)` calls become `.eq("child_id", activeChildId)`.
- New: `listMyMemberships()`, `getMyRole(childId)`, `createChild()`,
  `addMember()`, `acceptInvite()`, `raiseEmergencyActivation()`, `getSubscription()`.
- `saveChildProfile` → create/update `child` + ensure an `owner` membership.
- Break-glass read/write helpers for the 4-block `emergency_plan.break_glass`.

## 8. Session / context (`src/lib/session-store.tsx`)

- Add `activeChildId`, `myChildren`, `myMemberships`, `roleForActiveChild`,
  `subscriptionStatus` to session state.
- On login: load memberships, choose default active child, derive role + tier.
- Persist `activeChildId` selection (localStorage) across reloads.

## 9. Routing & UI

- **Child switcher** in `AppShell` header (owners with >1 child).
- **Role-aware landing:**
  - owner → full app, paid modules gated behind subscription.
  - coordinator-only / caregiver-only → slim logged-in dashboard (per-child cards,
    only permitted sections + actions). In-app equivalent of `/c/{token}`.
- **New routes:** logged-in helper dashboard (e.g. `/portal` or `/care`),
  member management, subscription/upgrade, "Add my own child."
- **Emergency page:** rebuilt to the §5 layout (4 break-glass cards + activation
  protocol + "you're ready" artifact; paid doc-share panel).
- **Subscription:** paywall/upgrade screens; gate planning routes; show the
  emotional "in an emergency, subscribers can also hand over these documents" nudge
  in the free flow.

## 10. Subscription & billing

### 10.1 Entitlement gate (build now, price later)
Pricing is **free at launch**, switched on later **without rework**. The whole paywall
is built now but held open by a single flag:

- One global config flag, **`FREE_LAUNCH`** (an `app_config` row or env var).
- The entitlement helper `has_active_subscription(person)` returns **TRUE for everyone
  while `FREE_LAUNCH` is on**; when it's flipped off it reads real
  `subscription.status`. Flipping the flag = pricing live. No schema or app rewrite.
- During the free period: build the full plan, no upgrade walls — optionally a subtle
  "free during launch" badge. UI reads the same flag, so it stays in sync with RLS.
- The **cap of 3 owned children is anti-abuse, not a paywall** → it stays enforced
  **regardless** of `FREE_LAUNCH` (in the `create_child` RPC).

### 10.2 Provider — Razorpay (locked)
- India-first (₹, UPI/cards/netbanking, subscriptions API); cheapest **regulation-
  compliant** option for the Indian market (RBI / PCI-DSS handled by the provider).
- Wrapped behind a thin provider abstraction so it remains swappable.
- A webhook updates `subscription.status`; the app reads entitlement, RLS enforces it.
- Integration is a separate workstream, started only when pricing is turned on.

## 11. Backward compatibility

- `/c/{token}` caregiver portal: unchanged for no-account caregivers.
- `/emergency-confirm` code flow: unchanged.
- `user_id` columns retained until Phase 7 cutover; dual-read keeps the live app
  working throughout.

---

## 12. Phased implementation plan

> Each phase is independently shippable and non-breaking. The free emergency product
> (Phase 4) is the business priority; Phases 1–3 are the foundation it needs.

| Phase | Scope | Breaks anything? |
|-------|-------|------------------|
| **1** | Additive schema: `child`, `child_member`, `subscription`, `person_profile` reuse. Backfill from existing data. | No |
| **2** | Add `child_id` to all data tables; backfill; dual-read. | No |
| **3** | App active-child context + header switcher; data layer cutover to `child_id`. | Behavior change (multi-child) |
| **4** | **Emergency redesign (free):** 4 break-glass blocks, coordinator login-raise, "you're ready" wallet card. | Free product ships |
| **5** | Caregiver/coordinator logged-in dashboards. | Additive |
| **6** | Subscription gating + paywall + emergency doc-share (paid). | Paid product ships |
| **7** | RLS cutover to membership; retire `user_id UNIQUE`; drop dual-read. | Internal |
| **8** | Billing provider integration + webhooks. | Additive |

---

## 13. Risks & mitigations

### 13.1 Activation reliability — the free emergency path must never silently fail
This is the spine of the free product and a trust/liability surface.

- **Single server-side entry point.** Both the URL-code path and the logged-in path
  call one `raise_emergency_activation(child_id)` RPC (SECURITY DEFINER). It validates
  the actor (active `coordinator` membership **or** a valid activation code), flips
  status, and records who/when/how. No client-side status mutation — there is one
  tested code path, not two.
- **Idempotent.** Double-click / retry must not create duplicate active states. Use an
  upsert keyed on `child_id` + a unique partial index on active activations; mirror the
  existing `/emergency-confirm` pattern that stamps `majority_reached_at` only if null.
- **Append-only audit.** Every raise inserts an `emergency_activations` row
  (actor, timestamp, method = code|login). Never overwrite; the owner sees a timeline.
- **No silent catches on this path.** Forbid `.catch(() => …)` and
  `safe(fn, fallback)` swallowing on emergency reads/writes. Errors surface to the user
  (toast + retry) and are logged. Reads use `.maybeSingle()` (never `.single()` → 406).
- **No external dependencies in the critical path.** Activation is DB + web only (no
  Twilio/email/push), so failure modes are minimal. Keep it that way — never add a
  third-party call to the activation path.
- **Free forever, even on lapse.** Emergency + break-glass tables carry **no**
  subscription check in RLS, so a lapsed subscriber's emergency plan keeps working.
- **Release gate — manual E2E checklist (every release):**
  (a) brand-new user with zero rows can open the emergency page;
  (b) coordinator raises via code in a fresh browser (no login);
  (c) coordinator raises while logged in;
  (d) double-raise is idempotent;
  (e) owner sees the status on next login;
  (f) a revoked coordinator cannot raise.

### 13.2 Keep the 10 minutes at 10 minutes
- **Hard-scoped free flow, exactly 4 steps:** (1) name the dependent;
  (2) the 4 break-glass blocks (short text areas with example placeholders);
  (3) add 1–2 coordinators (name + email + auto-generated code);
  (4) the "you're ready" confirmation. Nothing optional inline.
- **Minimal required set to reach "ready":** dependent name + at least one break-glass
  block *or* one coordinator. Everything else is "skip for now."
- **No paid forms in the free path.** Full modules are visible but clearly
  "unlock with subscription" — never interleaved into the free line.
- **No re-entry, no forced sync.** A subscriber filling the full medical module is not
  forced to re-type the break-glass medical block (they stay separate hand-written
  summaries); offer an optional "copy a summary?" helper, never mandatory.
- **Instrument it.** Track median time-to-complete for the free flow; treat a creep
  past ~12–15 min as a regression to fix.

### 13.3 Server-side paywall (defense in depth)
- **RLS is the real gate, UI is UX.** Paid-module tables' INSERT/UPDATE policies
  include `has_active_subscription(owner_of(child_id))`. The UI also hides/locks paid
  features, but never relies on the client.
- **Helpers.** `has_active_subscription(person)` = `status='active' AND
  current_period_end > now()`. `owner_of(child_id)` resolves the owning person(s); if
  **any** owner has an active sub, the child's paid features unlock (covers a co-owned
  child where one spouse pays).
- **Free tables explicitly excluded** from the check: `child` (basic), `emergency_plan`
  (break-glass), `emergency_coordinators`, `emergency_consent`, `emergency_activations`,
  `child_member`.
- **Lapse = read-only, not lockout.** A lapsed subscriber keeps **read + export** on
  paid data (DPDP data-portability friendly); only **writes** to paid modules are
  blocked. Gentler, and avoids "I lost my data" churn.
- **Cap-3 enforced server-side.** `create_child` RPC rejects a 4th owned child with a
  clear "contact us" error — not just a UI check.

### 13.4 Account deletion with co-owners
- **Membership-aware algorithm** (rewrite `request_account_deletion` and
  `admin_delete_user`, which currently assume 1:1):
  - child where the leaver is the **sole active owner** → delete the child + all its
    data (FK cascade) + all its memberships;
  - child with **other active owners** → delete only the leaver's `child_member`
    row(s); child and data survive;
  - remove the leaver's caregiver/coordinator memberships everywhere;
  - delete person-keyed data (person_profile, consents, chat logs, subscription, profiles).
- **Last-owner guard.** If a person tries to leave/remove themselves as the *last*
  owner of a child that still has caregivers/coordinators, block with:
  "You're the only owner of X — transfer ownership first, or X's plan will be deleted."
- **Ownership transfer path.** An owner can promote a member to owner (or invite a new
  owner, accept handshake) before leaving — supports spouse/handoff.
- **Transactional + audited.** Run in one transaction; roll back on partial failure;
  log the deletion.

### 13.5 Design note — the conversion moment (opportunity, not a risk)
In the free flow, surface the felt gap: a coordinator in a real crisis will wish they
had the actual UDID / insurance policy / doctor's letter. That wish is the upgrade —
show a gentle "subscribers can also hand over these documents instantly" nudge where
coordinators are set up.

---

## 14. Decisions (all locked)

| Item | Decision | Status |
|------|----------|--------|
| `viewer` role | **Deferred.** Ship with `owner / caregiver / coordinator`; add `viewer` later if a real need appears (trivial, non-breaking). | ✅ Locked |
| Payment provider | **Razorpay**, behind a thin swappable abstraction. Cheapest regulation-compliant option for India. | ✅ Locked |
| Pricing | **Free at launch.** Build the full entitlement gate now, held open by the `FREE_LAUNCH` flag (see §10.1); set the ₹ amount and flip the flag later — no rework. | ✅ Locked (amount TBD later) |
| `plan_progress` / journey per-child | **Per-child.** Each child has its own plan + completion state + journey; `plan_progress` gains `child_id`; `ChapterBanner` reads the active child's progress. | ✅ Locked |
| "You're ready" artifact | **Client-generated printable wallet card** (`jspdf` + `html2canvas`, no new dep). Minimal PII on the face; **QR → tokenized activation URL**; full break-glass shown only after a coordinator authenticates (see §5.1). | ✅ Locked |
