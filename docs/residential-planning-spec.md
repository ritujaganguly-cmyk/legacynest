# Residential Planning — User Stories

**Page:** `/residential`
**Status:** Draft v1
**Framing question:** *"Who will care for my child after me?"* — answered in bricks, not abstractions.

---

## 1. Why this page is different

Financial planning answers the question in **rupees**. Residential planning answers it in **a roof, a room, a routine, and the people in that home.** For a parent of a special-needs child, "Who will care for my child after me?" is ultimately a residential question: *In whose home will my child wake up? Who will be in the next room? Will it feel safe and familiar?*

The current page treats residence as a **property asset** (Retain / Sell / Lease / Trust). This spec evolves it into a **residential care plan** — a layered, time-phased answer to where the child lives across their whole life, with a fallback that is ready *tonight*.

---

## 2. Personas

| Persona | In this page they need… |
|---|---|
| **Priya (Parent / Planner)** | To name where the child lives now, next, and last — and a fallback for tonight. |
| **Rohan (Successor / Guardian)** | To know exactly where to take the child and how to keep the home familiar. |

---

## 3. Core concept — the layered residential succession

Mirroring the guardian succession, the residence has a **ranked plan with fallbacks**, so there is always a next option:

```
   PRIMARY ───────► BACKUP ───────► EMERGENCY (tonight)
   The intended      If primary       If everything fails
   long-term home    falls through    suddenly, today
   (e.g. group home  (e.g. sibling's  (e.g. grandparent's
    / stay-at-home    home)            home + known caregiver)
    with caregiver)
```

Each option carries: **type · location · caregiver · funding source · readiness (waitlist/application) · suitability rating.**

India reality the plan must respect: good group homes (e.g. National Trust **Gharaunda** / **Samarth** schemes) have **5–10 year waitlists**, family-based care is the cultural default, institutional care carries stigma, and siblings are often the assumed successors. **Plan early, document everything, name a fallback.**

---

## 4. User Stories by Horizon

### ⚡ SHORT TERM (0–6 months) — *Make today safe, name a fallback*

**S1 — Document the current living arrangement**
> As Priya, I want to record where and how my child lives today, so the plan has a clear starting point.
- **AC:** Capture current residence (address, who lives there, the child's own space, accessibility features already present).

**S2 — Name the "tonight" emergency residence**
> As Priya, I want to designate where my child would go *immediately* if something happened to me tonight, so there is never a gap.
- **AC:** One primary emergency residence + caregiver with address, phone, **consent given (Y/N)**, and **has keys/access (Y/N)**.
- **AC:** Surfaces on the Emergency page.

**S3 — Make the current home safe & accessible**
> As Priya, I want a checklist of home-safety and accessibility fixes, so my child's current environment is secure.
- **AC:** Checklist — wandering/exit safety, grab bars/ramps, sensory-safe space, secured medications, emergency exits. Mark done/pending.

**S4 — Start the housing conversation with trusted people**
> As Priya, I want to record who has agreed *in principle* to give my child a home, so I know my real options.
- **AC:** Pull guardians from Care Circle; flag **"willing to provide a home: Yes / No / Maybe."**

---

### 📈 MEDIUM TERM (1–3 years) — *Build the layered plan, get on waitlists*

**M1 — Inventory & compare residential options**
> As Priya, I want to record and compare options (stay-at-home with caregiver, sibling's home, group home, assisted living), so I can choose deliberately, not in panic.
- **AC:** Add option with type, location, monthly cost, capacity, waitlist length, pros/cons, **suitability rating (1–5)**.

**M2 — Join waitlists early**
> As Priya, I want to track applications and waitlists, so we don't lose years to delay.
- **AC:** Per-option status — Not started / Applied / Waitlisted / Confirmed — with date applied and expected wait.
- **AC:** Reminder surfaces in the dashboard action plan ("waitlists can be 5–10 years").

**M3 — Rank the residential succession (Primary → Backup → Emergency)**
> As Priya, I want a ranked plan for where my child lives after we're gone, so there's always a next option.
- **AC:** Order options as Primary / Backup / Emergency; each links a caregiver and a funding source.

**M4 — Decide each property's strategy**
> As Priya, I want to decide what happens to our property — keep it as the child's home, sell to fund care, lease for income, or move to trust — so housing and funding align.
- **AC:** Per-property strategy (existing feature, retained); estimated value links to the **financial plan corpus**.

**M5 — Assess the future residence's suitability**
> As Priya, I want to evaluate whether the *planned* future home actually meets my child's needs, so there are no surprises later.
- **AC:** Accessibility/suitability checklist per planned residence; flag gaps to fix.

---

### 🌳 LONG TERM (lifetime) — *Activate with continuity*

**L1 — Write a residential "Letter of Intent"**
> As Priya, I want to record what makes a place feel like *home* to my child — routines, comfort items, foods, sleep, sensory needs, social needs — so whoever provides the home can recreate that comfort.
- **AC:** Structured Letter of Intent; flows into the generated PDF report and the Care Circle notes.

**L2 — Ensure legal authority over residential decisions**
> As Priya, I want the designated guardian to have legal authority to decide where my child lives, so the plan can actually be executed.
- **AC:** Link to legal guardianship status; flag whether **residential decision authority** is in place.

**L3 — Fund the long-term residence from the trust**
> As Priya, I want the lifetime residential cost funded by the corpus/trust, so the arrangement is sustainable.
- **AC:** Chosen residence's annual cost feeds the **Phase-3 housing line** in the financial projection.

**L4 — Plan the move itself**
> As Priya, I want a gentle transition plan — familiar items move with the child, gradual introduction, key relationships kept — so the change doesn't traumatize.
- **AC:** Transition checklist; designate who supervises the move and over what period.

**L5 — Schedule suitability reviews**
> As Rohan, I want reminders to review whether the home still suits my nephew as he ages, so the arrangement stays right for life.
- **AC:** Annual review reminder; re-rate suitability; capture changes.

---

### 🚨 EMERGENCY — *The "tonight" answer, always ready*

**E1 — One-glance emergency residence card**
> As a guardian in a crisis, I want to instantly see where the child should go and who cares for them, so there's no confusion in the first 24 hours.
- **AC:** On the Emergency page — emergency residence, caregiver, address, keys/access status, and the child's critical routine, all in one card.

**E2 — Emergency caregiver has what they need, immediately**
> As Priya, I want the emergency caregiver to reach the child's routine, medications, and comfort-items list without me, so care continues seamlessly.
- **AC:** Emergency residence links to critical Vault docs + Care Circle notes + active medication list.

**E3 — Bridge to the permanent plan**
> As Rohan, I want to know how long the emergency arrangement lasts and what activates the permanent home, so I can manage the handover calmly.
- **AC:** Document bridge duration + the trigger and steps to activate the Primary residential plan.

---

## 5. How it connects to the rest of LegacyNest

| Links to | What flows |
|---|---|
| **Care Circle** | Which guardians will house the child; caregiver per residence option |
| **Financial Planning** | Residential cost → Phase-3 housing; property value → corpus |
| **Legal** | Guardianship authority over residential decisions |
| **Emergency** | The "tonight" residence + caregiver + critical routine |
| **Digital Vault** | Facility brochures, lease/sale deeds, group-home admission letters |
| **Dashboard action plan** | Short/Mid/Long residential readiness items (already age-phased) |
| **PDF report** | Residential succession + Letter of Intent for the guardian |

---

## 6. Suggested build order (MVP → V2)

| Phase | Scope |
|---|---|
| **MVP** | S1, S2, M1, M3 — residence inventory, layered Primary/Backup/Emergency ranking, the "tonight" emergency card. The minimum that answers *"where does my child live after me, and tonight?"* |
| **V2** | M2 (waitlist tracking), S3/M5 (suitability checklists), L1 (Letter of Intent), funding linkage to financial plan. |
| **V3** | L4 transition plan, L5 review reminders, full Emergency-page integration (E1–E3). |
