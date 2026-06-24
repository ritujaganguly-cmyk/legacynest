# Emergency Continuity Plan — User Stories

**Page:** `/emergency`
**Status:** Draft v1
**The moment this page serves:** The first 24–48 hours after the worst happens — when a parent dies, is hospitalized, or can no longer provide care, and the child's world must not collapse.

---

## 1. The honest cut — what's real vs fantasy

The current page is a beautiful mockup built on integrations that **do not exist** and never will at our scale. Before writing stories, we separate the dream from the buildable.

### ❌ DROP — fantasy that creates false security
| Mockup claim | Reality |
|---|---|
| "National Death Registry API for automated verification" | India has no queryable death-registry API. A plan that *waits* for this never activates. |
| "Apollo & Fortis Network emergency admission systems" | No such integration exists or is on offer. |
| "Connected health monitors" | IoT health monitoring is out of scope for a planning app. |
| "VERIFIED" badges everywhere | Implies a verification engine we don't have. Dangerous — it tells a parent the plan is "ready" when nothing was checked. |
| "Automated caregiver dispatch" | We can't dispatch anyone. We can *tell people who to call.* |

### ✅ KEEP & make real
| Section | Reframe |
|---|---|
| Trigger scenarios (Death / Hospitalization / Incapacitation) | From *"auto-detected by API"* → *"manually activated by an authorized person, with clear first steps."* |
| Notification Protocol | An ordered **contact chain** pulled from Care Circle — one-tap call/WhatsApp. Not "dispatch." |
| First 24 Hours Protocol | **The crown jewel.** Aggregate meds, triggers, comfort, residence into one break-glass brief. |
| Secure Access Records | From *"tokens issued"* → documented **break-glass access process.** |
| Simulation | A genuine **fire drill** that checks for gaps. Hugely valuable. |
| Download Offline Copy | **Critical.** A printable card for when there's no phone or internet. We already have PDF infra. |

---

## 2. The key design insight

> **This page is built for the person in crisis, not the parent in calm.**

Everywhere else in LegacyNest, the user is Priya, planning at her kitchen table. Here, the primary user is **Rohan the trustee at 2 AM**, hands shaking, needing to know *what to do right now.* Two consequences:

1. **It is mostly an aggregator, not a new data store.** The medications already live in Medical. The triggers and comfort items live in Child Profile. The emergency residence lives in Residential. The contacts live in Care Circle. This page's job is to **surface all of it in one read-only break-glass screen** — and flag what's missing. That's what makes it both powerful *and* realistic.

2. **It must work offline.** In a real emergency, app access can't be assumed. The downloadable one-page card is not a nice-to-have — it's the product.

---

## 3. Personas

| Persona | Their moment |
|---|---|
| **Priya (Parent)** | Sets up the plan calmly; designates who's in charge. |
| **Rohan (Trustee / Coordinator)** | *Activates* the plan and works the first 24 hours. |
| **Emergency caregiver** | May have never cared for the child — needs meds, triggers, comfort *now.* |

---

## 4. User Stories by Section

### 🎯 Activation & Triggers *(reframed from fake API detection)*

**A1 — Designate one Emergency Coordinator**
> As Priya, I want to name the ONE person called first in any emergency, so there is never confusion about who takes charge.
- **AC:** One primary coordinator + one backup (name, phone, relationship), linked to Care Circle. Shown at the very top of the page.

**A2 — Define activation scenarios & who may activate**
> As Priya, I want to document what counts as an emergency and who is authorized to activate the plan, so it triggers correctly and is never misused.
- **AC:** Three scenario cards — **Death / Hospitalization / Incapacitation** — each stating: who can activate, the first step they take, and the legal gate (e.g. *Incapacitation requires Power of Attorney* → links to Legal page).

**A3 — Activate / stand down the plan**
> As Rohan, I want to mark the plan ACTIVATED when an emergency happens, so all critical info surfaces and everyone knows it's live.
- **AC:** Activation toggle records timestamp + who activated; page banner switches to a high-visibility "PLAN ACTIVE" state; can be stood down with a reason.

### 📞 Notification Chain *(reframed from "dispatch")*

**N1 — Build the ordered notification chain**
> As Priya, I want an ordered list of who is contacted and in what sequence, so no critical person is missed in the chaos.
- **AC:** Ordered contacts grouped by role — Coordinator → Trustees → Caregivers → Family → Legal → Institutions. Pulls everyone flagged *emergency contact* from Care Circle.

**N2 — One-tap call / WhatsApp during activation**
> As Rohan, I want to reach each person with one tap and tick them off as I go, so I'm not hunting for numbers mid-crisis.
- **AC:** `tel:` and `wa.me` links per contact; a "notified ✓" toggle to track progress down the chain.

### ❤️ First 24 Hours Brief *(the crown jewel — aggregated, read-only)*

**F1 — The child's critical care brief on one screen**
> As an emergency caregiver who may have never cared for this child, I want their critical medications, sensory triggers, and comfort routines on one screen, so I can keep them safe and calm immediately.
- **AC:** Aggregates **active medications** (Medical, `tillDate ≥ today`), **behavioral triggers** + **comfort items** (Child Profile) into a clean read-only brief.

**F2 — Emergency medical snapshot**
> As a responder, I want the child's blood group, allergies, conditions, and treating doctor's number, so I can hand emergency staff what they need.
- **AC:** Pulls blood group/allergies/emergency-medical-info (Child Profile) + health contacts (Medical).

**F3 — Tonight's residence**
> As Rohan, I want to know where the child sleeps tonight and who is with them, so there is no gap in shelter.
- **AC:** Pulls the **Emergency-ranked residence** from Residential, showing consent ✓ and keys ✓ status.

### 🔐 Break-Glass Access *(reframed from fake "tokens")*

**S1 — Document how the trustee gets in**
> As Priya, I want to document how my trustee accesses the vault, key accounts, and physical documents in an emergency, so they're not locked out when it matters most.
- **AC:** Break-glass instructions — vault access method, where originals are physically kept, key institution contacts. **Stores process and pointers, never passwords.** (Future: real time-limited access tokens.)

### 🏛️ Institutional Notifications *(NEW)*

**I1 — Checklist of organizations to inform**
> As Rohan, I want a checklist of bodies to notify — National Trust, disability pension office, school/day-program, bank, insurer — so legal and financial continuity isn't silently broken.
- **AC:** Checklist with organization, contact, what to tell them, and a done toggle.

### 💰 Financial Bridge *(NEW)*

**B1 — Access to immediate funds**
> As Rohan, I want to know how to fund the child's care in the first weeks before the trust/estate settles, so care never pauses for money.
- **AC:** Documents the emergency fund / account / reimbursement process for the caregiver.

### 🧪 Simulation — Fire Drill *(reframed from fake "Run Simulation")*

**D1 — Test the plan without sending real alerts**
> As Priya, I want to walk through the whole plan as a drill, so I find the gaps *before* a real emergency.
- **AC:** A readiness check that verifies each piece is actually filled — coordinator set? every contact has a phone? medications current? emergency residence has consent + keys? legal POA in place for the incapacitation path? — and lists every gap. **Sends nothing.**

### 🖨️ Offline Emergency Card *(the product, not a nice-to-have)*

**O1 — Download a printable one-page emergency card**
> As Priya, I want a compact printable card, so the plan works even with no phone or internet — on the fridge, in a wallet, with the caregiver.
- **AC:** Generates a one-page PDF (reuse existing PDF infra): coordinator, notification chain, critical meds, triggers, comfort routines, blood group, allergies, tonight's residence, break-glass pointers. Regenerate any time; stamped with date.

---

## 5. What I'd ADD beyond the current layout

| Addition | Why it matters for a special-needs family |
|---|---|
| **Single Emergency Coordinator** at the top | The current page has 4 contact groups but no *single first call.* In crisis, "who's in charge?" must have one answer. |
| **Emergency medical snapshot** | Blood group, allergies, conditions — what an ER actually asks for. |
| **Tonight's residence** | The child has to sleep *somewhere* tonight. Links the Residential emergency plan. |
| **Institutional notifications** | Pension and National Trust benefits can lapse if not reported — real financial loss. |
| **Financial bridge** | The estate takes months; the child needs care *this week.* |
| **Readiness gaps in the drill** | Turn the fake "VERIFIED" badges into an honest "here's what's actually missing." |
| **"Explaining it to the child"** (optional) | A short note on how to tell the child what's happening, in a way they can process. |

---

## 6. Data model (mostly aggregation)

**New table — `emergency_plan`** (one per user):
`activation_status` (Standby / Active) · `activated_at` · `activated_by` · `coordinator_name` · `coordinator_phone` · `backup_coordinator_name` · `backup_coordinator_phone` · `break_glass_instructions` · `financial_bridge_notes` · `offline_card_generated_at`

**New table — `emergency_institutions`** (checklist rows): `org_name` · `contact` · `what_to_tell` · `is_notified`

**Aggregated live (no new storage):**
- Notification chain ← Care Circle (`isEmergencyContact`)
- Critical meds ← Medical (active medications)
- Triggers + comfort ← Child Profile
- Medical snapshot ← Child Profile + Medical health contacts
- Tonight's residence ← Residential (Emergency-ranked option)
- POA gate ← Legal (guardianship/POA status)

> The power of this page is that **80% of it is a view over data the parent already entered.** That's what makes it both trustworthy and fast to build.

---

## 7. Build approach (MVP → V2)

| Phase | Scope |
|---|---|
| **MVP** | A1 coordinator · N1 notification chain (from Care Circle) · F1–F3 aggregated 24-hour brief · O1 offline PDF card · D1 readiness drill. This is a *real* emergency plan that works offline — and almost entirely an aggregator. |
| **V2** | A2/A3 activation scenarios + live "PLAN ACTIVE" state · S1 break-glass docs · I1 institutional checklist · B1 financial bridge. |
| **V3** | Real time-limited trustee access tokens · SMS/WhatsApp broadcast to the chain (with explicit consent) · "explaining it to the child." |

---

## 8. The one-line test for this page

> If Priya were gone tomorrow and Rohan opened this page (or the printed card) for the first time, **could he keep her child safe, calm, and sheltered for 48 hours?**

Everything on the page earns its place by answering yes. Everything that doesn't — the fake APIs, the dispatch theatre, the verification badges — comes off.
