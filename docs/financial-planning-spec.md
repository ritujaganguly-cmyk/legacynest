# Financial Planning — Product Specification

**Page:** `/financial`
**Status:** Draft v1
**Audience:** Product, Engineering, Design
**Domain:** Lifetime financial-corpus planning for a special-needs dependent

---

## 1. The Problem This Page Solves

A parent of a special-needs child must answer one terrifying question in numbers:

> **"If I am gone, will there be enough money to care for my child for the rest of their life — and what must I do today to guarantee it?"**

Unlike ordinary retirement planning (which ends when the planner dies), this plan must fund a **dependent who outlives the earner** and whose costs often **rise exactly when the parents' income disappears**. The page is a **lifetime corpus-adequacy engine** that:

1. Captures the family's current expenses, assets, and income.
2. Projects them year-by-year across the child's expected lifetime, accounting for inflation, asset returns, and income increments.
3. Models **life-phase transitions** — especially the moment parents are no longer there — where expenses step up (paid caregiver, independent housing) and income steps down (salary ends).
4. Stress-tests both a **planned transition** (parents live to expected age) and a **sudden loss** (accident today).
5. Recommends concrete actions: **monthly savings (SIP), life-insurance cover, and expense curtailment** to close any gap.

---

## 2. Personas

| Persona | Description | Primary need |
|---|---|---|
| **Priya (the Planner)** | 45, mother of a 14-yr-old with autism. Primary earner's spouse. Financially literate but anxious. | "Tell me the number, and tell me what to change." |
| **Rohan (the Successor)** | Priya's brother, named guardian/trustee. Will inherit the plan. | "Is the corpus enough so I'm not personally liable?" |
| **Advisor (read-only, later phase)** | Family's CA or financial advisor. | Validate assumptions, export projections. |

Primary persona for this page is **Priya**.

---

## 3. Core Domain Model

### 3.1 The lifetime is a sequence of phases

```
 Today                Parent retires       Parents gone (planned)        Child's
   │                       │                       │                  life expectancy
   ▼                       ▼                       ▼                       ▼
   ├───────────────────────┼───────────────────────┼───────────────────────┤
        PHASE 1                  PHASE 2                    PHASE 3
   Parents earning          Parents retired           Parents deceased
   + able to caregive       + drawing pension         Child fully dependent
                            + still caregiving        on corpus + passive income
```

- **Phase 1 — Accumulation.** Salary covers expenses; surplus builds corpus. Caregiving done by parents (≈ ₹0 paid cost).
- **Phase 2 — Drawdown begins.** Salary ends; pension + corpus drawdown. Parents may still caregive, or paid help begins if a parent crosses an age threshold.
- **Phase 3 — Full dependency.** The critical phase. No salary. Corpus + passive income (rent, family pension, annuity) must cover **everything**, including full paid caregiving and independent/assisted housing, for the child's remaining life.

### 3.2 The two scenarios that must always be modelled

| Scenario | Trigger | Why it matters |
|---|---|---|
| **A. Planned transition** | Parents survive to expected age; Phase 3 starts ~25–30 yrs out. | There is time to build corpus via savings. |
| **B. Sudden loss (accident)** | **Both parents die today.** Phase 3 starts *now*. | Corpus is not yet built → **life insurance must bridge the gap.** This is the scenario most families never model. |

The recommendation engine sizes **savings** against Scenario A and **insurance** against Scenario B.

### 3.3 Configurable transition triggers

The "paid caregiving begins" and "housing changes" events are **not fixed** — the parent configures them:

- **Caregiving cost step-up** begins at the *earliest* of:
  - both parents deceased, **OR**
  - a parent reaches age *X* (e.g., 75 — physically unable to caregive), **OR**
  - the child reaches age *Y* (e.g., 50 — needs intensified care).
- **Housing cost change** point: "now" cost (living with parents, marginal) vs "after" cost (group home / assisted living / independent flat + attendant), switching at a configurable event (default: parents deceased).

> The user's examples map directly to this:
> *"caregiver expense will rise at age 50 if no parents"* → child-age trigger Y = 50 **gated on** parent-absence.
> *"it can be immediate for accident"* → Scenario B forces all step-ups to **t = 0**.

---

## 4. Data Model (Inputs)

### 4.1 Expense line items

Each expense is a row the parent can add/edit:

| Field | Type | Example |
|---|---|---|
| `name` | text | "Occupational therapy" |
| `category` | enum | Daily Living · Medical/Therapy · Caregiving · Housing · Education/Vocational · Contingency |
| `currentMonthlyAmount` | number (₹) | 12,000 |
| `inflationRate` | % (default by category) | 10% (medical), 6% (general) |
| `startTrigger` | enum + value | `immediately` · `at_child_age:N` · `at_parent_absence` · `at_parent_age:N` |
| `endTrigger` | enum + value | `lifetime` · `until_child_age:N` |
| `phaseMultipliers` | object | e.g. caregiving: `{phase1: 0, phase2: 0.3, phase3: 1.0}` |

**Default category inflation (India, editable):**
General 6% · Medical/Therapy 10% · Housing 7% · Caregiving (wage) 8% · Education 8%.

### 4.2 Income streams

| Field | Type | Notes |
|---|---|---|
| `name` | text | "Rental — Orchid Heights flat" |
| `type` | enum | Salary · Rental · Family Pension · Annuity/Pension Plan · Investment Income · Govt Disability Benefit |
| `currentMonthlyAmount` | number | |
| `incrementRate` | % | rental ≈ 5%/yr, pension DA-linked ≈ 5% |
| `startTrigger` | enum | `now` · `at_parent_retirement` · `at_parent_absence` |
| `endTrigger` | enum | `at_parent_retirement` (salary) · `at_parent_absence` · `lifetime` |
| `survivesParents` | bool | **Key flag.** Family pension & rental typically `true`; salary `false`. |

> **Family pension nuance (India):** A government/PSU employee's family pension **continues for the lifetime of a disabled dependent** after the spouse, under CCS (Pension) Rules. This is a powerful Phase-3 income stream and must be modelled with `survivesParents: true`, `endTrigger: lifetime`.

### 4.3 Assets (corpus)

| Field | Type | Default expected return |
|---|---|---|
| `name` | text | |
| `assetClass` | enum | Equity 11% · Debt/FD 7% · Real Estate 5%+yield · Gold 6% · EPF/PPF 7.1% · NPS 9% · Sukanya/scheme 8% · Cash 4% |
| `currentValue` | number | |
| `expectedReturn` | % (editable, seeded by class) | |
| `liquidateOnTransition` | bool | e.g. sell second property to fund corpus at Phase 3 |
| `earmarkedForTrust` | bool | flows into Special Needs Trust |

The engine computes a **blended portfolio return** = Σ(value × return) ÷ Σ(value), and lets the user model a **post-transition reallocation** (typically shift to lower-risk debt-heavy mix once parents are gone, since there's no earner to recover from a market crash).

### 4.4 Global assumptions

| Field | Default | Notes |
|---|---|---|
| Child current age | from Child Profile | |
| Child life expectancy | 75 (editable) | drives projection horizon |
| Parent 1 / Parent 2 age | from Parent Profile | |
| Parent retirement age | 60 | |
| Parent planning horizon (life expectancy) | 80 | when Phase 3 starts in Scenario A |
| General inflation | 6% | |
| Existing life cover | sum from Insurance page | feeds Scenario B gap |

---

## 5. The Projection Engine

A deterministic year-by-year simulation. For each year `t` from 0 to `(childLifeExpectancy − childAge)`:

```
for t in 0 .. horizon:
    phase   = resolvePhase(t, scenario, triggers)
    expense = Σ activeExpenses(t).map(e =>
                e.currentMonthly*12
                 * (1 + e.inflationRate)^t
                 * e.phaseMultiplier[phase])
    income  = Σ activeIncome(t).map(i =>
                i.currentMonthly*12
                 * (1 + i.incrementRate)^t)               // if active & survives per scenario
    netFlow = income − expense
    corpus  = corpus * (1 + blendedReturn(phase))         // growth first
            + netFlow                                      // then add surplus / withdraw deficit
    record(t, phase, income, expense, corpus)
```

**Adequacy rule:** the plan is *adequate* if `corpus(t) ≥ 0` for every `t` up to the horizon. The **stress point** is almost always the first years of Phase 3 (income collapses, costs peak).

**Two passes:** run once for **Scenario A** (planned) and once for **Scenario B** (sudden loss at t=0, all step-ups immediate, salary income removed).

**Outputs per scenario:**
- Year-by-year table & chart of income, expense, corpus balance.
- **Corpus depletion age** (the child's age at which corpus hits ₹0, if ever).
- **Required corpus at Phase-3 start** = present value, at the transition date, of all future Phase-3 deficits discounted at the post-transition return.
- **Sustainability ratio** = projected corpus ÷ required corpus at transition.

---

## 6. Recommendation Engine

From the two passes, produce **three levers** and let the parent simulate trade-offs live:

### 6.1 Monthly Savings (SIP) — closes the *planned* gap
```
requiredCorpusAtTransition  = PV of Phase-3 deficits (Scenario A)
projectedCorpusAtTransition = corpus(transitionYear) from Scenario A
gap                         = max(0, required − projected)
monthlySIP                  = gap / FV_annuity_factor(blendedReturn, monthsToTransition)
```
> "To stay on track, save **₹X/month** until [parent retirement/transition]."

### 6.2 Life Insurance — closes the *sudden-loss* gap
```
requiredCorpusToday = PV today of ALL Phase-3 expenses minus surviving passive income (Scenario B)
insuranceGap        = max(0, requiredCorpusToday − currentCorpus − existingLifeCover)
```
> "If something happened today, the plan is short **₹Y**. Recommended additional term cover: **₹Y**, routed to the Special Needs Trust."
This is the single most important output for young families — savings can't help if there's no time to save.

### 6.3 Expense Curtailment — when the gap is too big to fund
If `monthlySIP` exceeds the family's current surplus, surface **rank-ordered curtailment options** with corpus impact:
> "Reducing discretionary spend by ₹8,000/month closes 40% of the gap" — each toggle re-runs the projection live.

### 6.4 Headline outputs (always visible)
- ✅/⚠️ **Plan status**: *Secure* / *At Risk* / *Critical Shortfall* (from sustainability ratio).
- **Corpus needed** vs **corpus on track for**.
- **Three actions**: Save ₹X/mo · Insure for ₹Y · (optional) Trim ₹Z/mo.

---

## 7. User Stories

### Epic A — Capture the financial picture

**A1.** *As Priya, I want to add my current monthly expenses by category, so the plan reflects our real cost of living.*
- AC: Add/edit/delete expense rows with name, category, monthly amount, inflation rate (pre-filled by category, editable).
- AC: Categories: Daily Living, Medical/Therapy, Caregiving, Housing, Education/Vocational, Contingency.
- AC: Total current monthly & annual expense shown live.

**A2.** *As Priya, I want to record our assets by class, so the plan knows what corpus already exists.*
- AC: Add assets with class, current value, expected return (seeded by class, editable), and a "liquidate at transition" flag.
- AC: Show total corpus and **blended expected return**.
- AC: Pull existing values where available (e.g., link to Insurance page for policies).

**A3.** *As Priya, I want to record recurring income — salary, rent, family pension — with whether it survives us, so post-transition income is modelled correctly.*
- AC: Income rows with type, monthly amount, increment %, and a **"continues after parents"** toggle.
- AC: Family pension and rental default to "continues"; salary defaults to "ends at retirement".

**A4.** *As Priya, I want global assumptions (inflation, child life expectancy, parent retirement & life expectancy, returns) defaulted but editable, so I can be conservative or optimistic.*
- AC: Child age & parent ages pre-filled from Child/Parent Profiles.
- AC: All assumptions editable; "Reset to defaults" available.

### Epic B — Model life-phase transitions

**B1.** *As Priya, I want to set when paid caregiving begins, so the model reflects that we caregive until we can't.*
- AC: Configure caregiving step-up trigger: earliest of (both parents gone) / (parent age N) / (child age N).
- AC: Per-phase multiplier for caregiving cost (e.g., 0 → 0.3 → 1.0).
- AC: Example preset: *"Full paid care at child age 50, but immediately if parents are gone sooner."*

**B2.** *As Priya, I want housing cost to differ between "now" and "after we're gone", so independent/assisted living is funded.*
- AC: Two housing figures (current marginal vs post-transition full) with a switch event (default: parents gone).
- AC: Option to fund post-transition housing by liquidating a flagged property asset.

**B3.** *As Priya, I want to see the plan under a sudden-loss scenario, so I know what happens if we die in an accident tomorrow.*
- AC: Toggle between **Planned** and **Sudden Loss (today)** scenarios.
- AC: Sudden-loss forces all step-ups to t=0 and removes salary; shows resulting corpus depletion age.

### Epic C — See the projection

**C1.** *As Priya, I want a year-by-year chart of income, expenses, and corpus balance, so I can see when (if ever) money runs out.*
- AC: Line/area chart across child's lifetime; markers at phase transitions.
- AC: Hover shows year, child age, phase, income, expense, corpus.
- AC: Clear callout of **corpus depletion age** or "Corpus lasts a lifetime ✅".

**C2.** *As Priya, I want a clear plan-status verdict, so I'm not left interpreting charts.*
- AC: Banner: Secure / At Risk / Critical, driven by sustainability ratio thresholds.
- AC: One-line plain-English explanation.

### Epic D — Get recommendations & simulate

**D1.** *As Priya, I want to know the monthly savings needed to be on track, so I have a concrete target.*
- AC: Show required SIP to close the planned gap by the transition date.
- AC: Updates live as inputs change.

**D2.** *As Priya, I want a recommended life-insurance cover for the sudden-loss gap, so my child is protected before the corpus is built.*
- AC: Compute insurance gap = required-today − current corpus − existing cover.
- AC: Recommend additional term cover routed to the Special Needs Trust; link to Insurance page.

**D3.** *As Priya, I want to simulate expense cuts and asset reallocation, so I can see how to close the gap without more income.*
- AC: Toggleable curtailment suggestions ranked by impact; live re-projection.
- AC: Optional post-transition reallocation slider (equity→debt) with effect on sustainability.

**D4.** *As Priya, I want the financial summary to flow into the PDF report and mark the section complete, so the dashboard and the guardian's report stay in sync.*
- AC: On save, write `financial` to `plan_progress` (already wired).
- AC: Key figures (corpus, required, SIP, insurance gap, status) appear in the generated report's Financial section.

### Epic E — (Later) Advisor & exports
**E1.** Export the projection table to CSV/PDF.
**E2.** Read-only advisor share link.

---

## 8. Suggested Page Layout

```
┌────────────────────────────────────────────────────────────┐
│  Financial Planning            [Planned ▢ Sudden-Loss ▢]    │  ← scenario toggle
├────────────────────────────────────────────────────────────┤
│  PLAN STATUS:  ⚠ At Risk                                    │
│  Corpus needed ₹3.2 Cr · On track for ₹2.1 Cr · Gap ₹1.1 Cr │  ← headline
│  → Save ₹18,400/mo   → Insure ₹95 L   → Trim ₹6k/mo         │  ← 3 levers
├──────────────────────────────┬─────────────────────────────┤
│  Lifetime projection chart    │  Assumptions (editable)     │
│  (income/expense/corpus)      │  inflation, returns, ages   │
├──────────────────────────────┴─────────────────────────────┤
│  Tabs:  [ Expenses ] [ Income ] [ Assets ] [ Transitions ]  │  ← input tables
└────────────────────────────────────────────────────────────┘
```

---

## 9. Edge Cases & Assumptions

- **Single parent / single income** — model with one earner; sudden-loss gap is larger.
- **Child predeceases plan horizon** — not modelled; horizon is an estimate, kept conservative.
- **Market sequence risk** — v1 uses deterministic blended returns. A later phase can add a Monte-Carlo "confidence %" band.
- **Real vs nominal** — engine works in nominal ₹; all growth and inflation applied explicitly. Display can offer "in today's money" toggle (deflate by general inflation).
- **Negative-surplus families** — if income < expenses today, flag immediately; SIP recommendation becomes "curtail first".
- **Family-pension eligibility** is rule-dependent (govt/PSU service, disability certified) — surface an info note, don't assume.
- All defaults are **editable and conservative**; the tool is a planning aid, not financial advice (mirror the report's legal disclaimer).

---

## 10. Phasing

| Phase | Scope |
|---|---|
| **MVP** | Expenses, Income, Assets, global assumptions; single deterministic projection (planned); corpus-depletion chart; required-corpus & SIP; status banner; write to `plan_progress` + report. |
| **V2** | Sudden-loss scenario + insurance-gap recommendation; configurable caregiving/housing transition triggers; curtailment simulator. |
| **V3** | Post-transition reallocation; Monte-Carlo confidence band; CSV/PDF export; advisor read-only share. |

---

## 11. Data Persistence (Supabase)

New tables (RLS by `user_id`):
- `financial_expenses` (line items)
- `financial_income` (streams)
- `financial_assumptions` (one row per user; or reuse a settings table)
- existing `financial_assets` reused for the corpus
- existing `insurance_policies` read for existing cover

The projection is computed **client-side** from these inputs (no server math needed), keeping it instant and offline-friendly — same pattern as the PDF report.
