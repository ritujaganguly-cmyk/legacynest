# LegacyNest — MVP & Product Checklist

**Last updated:** June 2026
**Live at:** https://www.legacynest.co.in

---

## ✅ DONE

### Infrastructure
- [x] Clean GitHub repo
- [x] Deployed on Vercel, custom domain `legacynest.co.in`
- [x] Supabase auth (sign up / sign in / session)
- [x] Row Level Security on all 32+ tables
- [x] Commits configured

### Landing Page
- [x] Hero section, problem stats, features, how it works, CTA
- [x] WhatsApp contact, Google Maps address, footer
- [x] Domain connected and live

### Core App Pages (DB-backed CRUD)
- [x] **Dashboard** — plan progress (11 steps, Refresh button), action plan, PDF report
- [x] **Child Profile** — full profile, UDID Yes/No + file upload to vault
- [x] **Parent Profile** — full profile
- [x] **Care Circle** — members, responsibility tags, care notes, emergency contact flag, RLS fixed
- [x] **Succession Planning** — guardian cards (Primary/Secondary/Legal), responsibility tags
- [x] **Medical** — medications (with till-date), health contacts, therapies, medical records
- [x] **Insurance** — full CRUD, snake_case mapping fixed, Niramaya alert
- [x] **Financial Planning** — expenses, income, assets, lifetime corpus projection, SIP & insurance gap
- [x] **Legal** — Will/Executor, Special Needs Trust (3 trustees), Guardianship (RPWD), POA
- [x] **Residential** — options inventory, Primary/Backup/Emergency succession, safety checklist, Letter of Intent
- [x] **Emergency Continuity** — coordinator, activation, aggregated First-24-Hours brief, institutions checklist, offline card
- [x] **Digital Vault** — file upload/download (signed URL), categories, edit, status, RLS

### Reports & Exports
- [x] PDF succession plan report (9 pages, Page X of Y, legal disclaimer)
- [x] Emergency offline card (one-page PDF, printable)

### Spec Documents (for future build)
- [x] Financial Planning spec
- [x] Residential Planning spec
- [x] Emergency Continuity spec

---

## 🔴 MVP GAPS (must fix before calling it MVP)

### Broken / Untested Pages
- [ ] **Medical page** — likely has same camelCase/snake_case mapping bug as insurance/assets. Test: add a medication and check if it saves.
- [ ] **Residential** — migration 030 must be run. Test the Add Option flow.
- [ ] **Emergency** — migration 032 must be run. Test: add coordinator, generate offline card.
- [ ] **Legal** — migration 031 must be run. Test all 4 accordion saves.

### Auth & Onboarding
- [ ] **Onboarding flow** — exists (`/onboarding`) but never polished; new users land there on sign-up but flow is incomplete
- [ ] **Sign-out redirect** — currently goes to `/caregiver` instead of landing page or sign-in
- [ ] **Email confirmation** — not tested on live domain; Supabase Site URL set to `www.legacynest.co.in`?

### Dashboard
- [ ] **Generate Report gate** — requires 5/11 steps; verify Refresh button works for all 11 sections
- [ ] **Action plan items** — verify they appear/disappear based on child's actual age (DOB from profile)

### Vault
- [ ] **File download from private bucket** — test signed URL works on production (Vercel, not localhost)
- [ ] **Storage policies** — migration 025 (split_part RLS) must be confirmed running

### Settings & Support
- [ ] **Settings page** — placeholder; at minimum needs: change display name, change password
- [ ] **Support page** — form submits but no confirmation email; test Supabase Edge Function works

---

## 🟡 POST-MVP (important but not blocking launch)

### Pages Not Yet Built
- [ ] **Action Plan page** (`/action-plan`) — currently a static placeholder from Lovable; should reflect the dashboard's Short/Mid/Long action items dynamically
- [ ] **AI Assistant** (`/ai-assistant`) — placeholder; replace with Claude API or remove from nav

### Missing Features on Existing Pages
- [ ] **Succession Planning** — `_app.caregiver.tsx` has UDID removal from Disability Docs but succession page is separate from caregiver; review if two pages are needed
- [ ] **Medical** — therapy session tracking, appointment reminders
- [ ] **Financial** — "Sudden Loss" scenario (insurance gap second pass), expense curtailment simulator
- [ ] **Vault** — link vault documents to sections (e.g. UDID card shows under Disability)
- [ ] **Emergency** — "explaining it to the child" note; bridge duration to permanent plan
- [ ] **PDF Report** — parental guide Letter of Intent section; emergency coordinator card in report

### Data Quality
- [ ] **Medical snake_case audit** — verify all medical tables (medications, health_contacts, therapies, medical_records) have correct camelCase↔snake_case mapping like we fixed for insurance/assets
- [ ] **Disability Documents page** — removed from nav; data still queryable; decide if `disability_documents` table is still used anywhere

---

## ⚪ FULL PRODUCT (6–18 months)

### Multi-User / Sharing
- [ ] **Guardian read-only portal** — named guardian gets a secure link to view (not edit) the plan
- [ ] **Trustee access** — Co-trustee can view Financial and Legal sections
- [ ] **Family sharing** — second parent / spouse as co-editor

### Notifications & Reminders
- [ ] **Insurance renewal reminders** — email/SMS 30/60 days before `renewal_reminder_date`
- [ ] **Legal guardianship renewal** — alert when `next_renewal_date` approaches
- [ ] **Annual plan review nudge** — prompt to review and run Refresh once a year
- [ ] **Medication till-date alert** — flag when a medication is about to expire

### Government Scheme Integration
- [ ] **UDID portal status check** — link to swavlambancard.gov.in
- [ ] **National Trust scheme enrollments** — Niramaya, Gharaunda, Samarth
- [ ] **Scheme eligibility checker** — based on child's disability type and percentage

### AI Features
- [ ] **AI Advisor** — Claude API integration; answers "what government schemes am I missing?", "is my corpus adequate?", "what happens if I die today?"
- [ ] **Document OCR** — extract key data from uploaded PDFs (UDID card, insurance policy)
- [ ] **Plan completeness suggestions** — "your emergency plan has no residence set; here's how to fix it"

### Mobile & Offline
- [ ] **PWA (Progressive Web App)** — install on home screen, offline access to emergency card
- [ ] **Responsive audit** — ensure all pages work on mobile (375px)
- [ ] **Print stylesheet** — clean printable version of any page

### Legal & Compliance
- [ ] **DPDP Act 2023 compliance** — data export, right to deletion, consent management
- [ ] **Data backup / export** — export all data as JSON or PDF
- [ ] **Audit log** — who viewed or changed what (for trust/legal accountability)

### Growth & Business
- [ ] **Referral flow** — parent refers a family; both get acknowledgement
- [ ] **NBO / NGO partnerships** — integration with Muskaan, Action for Autism, etc.
- [ ] **Advisor access tier** — CA / lawyer / social worker as read-only collaborator
- [ ] **Multi-child support** — currently one child per account

---

## Summary

| Horizon | Status | Estimate |
|---|---|---|
| **MVP** (a real family can use it end-to-end) | ~75% done | 1–2 weeks to close gaps |
| **Post-MVP** (polished, full feature parity) | ~40% done | 2–3 months |
| **Full Product** (multi-user, AI, notifications) | ~15% done | 6–18 months |

### The 5 things that would make this MVP-complete right now:
1. Run migrations 030, 031, 032 and verify all pages save correctly
2. Fix Medical page camelCase/snake_case (same bug pattern as insurance)
3. Polish the onboarding flow for new users
4. Verify vault upload/download works on production (legacynest.co.in)
5. Settings page minimum: change name + change password
