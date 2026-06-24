# Database Architecture & Compliance — LegacyNest

## A. Complete table inventory (40 migrations, all tables active in code)

### Currently in `public` schema — needs restructuring

| Table | Data sensitivity | Indian law category |
|---|---|---|
| `auth.users` | High — email, password hash | Personal data (DPDP 2023) |
| `child_profile` | **Critical** — name, disability, DOB, UDID, blood group, allergies | SPDI (disability + health) |
| `parent_profile` / `parent_profiles` | High — name, DOB, phone, occupation | Personal data |
| `profile` / `profile_images` | Medium — display name, photo | Personal data |
| `medical_records` | **Critical** — diagnoses, doctor names, dates | SPDI (health records) |
| `medications` | **Critical** — drug names, doses, frequency | SPDI (health records) |
| `therapies` | **Critical** — therapy type, therapist, sessions | SPDI (health records) |
| `health_contacts` | High — doctor names, phones, hospitals | Personal data |
| `disability_documents` | **Critical** — UDID no., Aadhaar no., PAN no., disability %, cert. authority | SPDI + financial identifier |
| `legal_will` | **Critical** — executor, beneficiary, will status | Legal document data |
| `legal_trust` | **Critical** — trustee names, trust type, beneficiary | Legal document data |
| `legal_guardianship` | **Critical** — guardian names, court order, legal status | Legal document data |
| `legal_poa` | **Critical** — attorney name, scope, legal status | Legal document data |
| `legal_info` (old) | Critical | Legal document data |
| `financial_assets` | **Critical** — account numbers, bank names, asset values | SPDI (financial information) |
| `financial_income` | **Critical** — income sources, monthly amounts | SPDI (financial information) |
| `financial_expenses` | High — monthly expense categories | Financial data |
| `financial_assumptions` | Low — planning parameters | Config / calculation |
| `insurance_policies` | **Critical** — policy numbers, coverage, premiums | SPDI (financial information) |
| `care_circle` | High — names, phones, email, relationship | Personal data |
| `caregiver_shares` | High — access tokens, shared data scope | Access control |
| `succession_plans` | High — plan name, status, dates | Planning data |
| `succession_guardians` | High — guardian names, contact, order | Personal data |
| `succession_instructions` | High — written instructions | Personal data |
| `succession_assets` | **Critical** — asset values, account details | SPDI (financial) |
| `succession_milestones` | Low — milestone tracking | Planning data |
| `residential_options` | High — address, facility name, cost | Personal data |
| `residential_checklist` | Low — checklist items | Planning data |
| `residential_letter_of_intent` | High — written intent | Personal data |
| `emergency_plan` | High — 24-hour plan, instructions | Planning data |
| `emergency_coordinators` | High — name, phone, role | Personal data |
| `emergency_institutions` | Medium — hospital, facility names | Institutional data |
| `emergency_consent` | High — consent records | Legal consent |
| `emergency_activations` | High — activation status, timestamps | Operational data |
| `emergency_activation_requests` | High — request details | Operational data |
| `emergency_checkins` | Medium — check-in logs | Operational data |
| `digital_vault_documents` | **Critical** — file references, document type, notes | SPDI (all categories) |
| `plan_progress` | Low — completion flags | App state |
| `onboarding_progress` | Low — onboarding step, draft JSON | App state |
| `support_requests` | Medium — user messages | Personal data |
| `advisor_chat_logs` | High — AI conversation history | Personal data |

**Functions (all in public schema):**
- `admin_get_*` — 6 admin reporting functions
- `get_caregiver_portal` / `get_caregiver_all_portals` — caregiver access functions
- `get_activation_status` — emergency activation check

---

## B. Do you need multiple schemas? Yes. Here's why and how.

### Indian legal framework that applies to LegacyNest

**1. SPDI Rules 2011 (IT Act)** — currently in force
"Sensitive Personal Data or Information" requiring explicit consent and reasonable security:
- ✅ Medical records and health information
- ✅ Financial information (bank account, credit card, financial statements)
- ✅ Physical/physiological and mental health condition
- ✅ Biometric data

**2. DPDP Act 2023** — in force, rules being notified
- "Personal data" requires a consent framework
- "Sensitive personal data" (to be defined by rules) = SPDI + more
- Data fiduciary (LegacyNest) must implement appropriate technical safeguards
- **Data localisation**: Data of Indian citizens must be stored in India
  - Supabase does not have an India region natively
  - AWS Mumbai (ap-south-1) or Azure India Central are compliant
  - **Action required: when scaling, migrate to a Supabase-compatible India-hosted instance**

**3. Reasonable Security Practices (IS/ISO/IEC 27001)**
The SPDI Rules require implementing IS/ISO/IEC 27001 or equivalent practices.

---

## C. Recommended schema structure (do this now)

### One Supabase project, three schemas:

```
public          → Non-sensitive app data (safe to expose via anon key with RLS)
protected       → All SPDI and sensitive personal data (never exposed to anon key)
config          → System config, lookup tables, no user data
```

### Mapping:

**`config` schema** (no user data, static reference data)
```
config.disability_types       -- lookup: ASD, Down syndrome, CP, etc.
config.government_schemes     -- UDID, Niramaya, PM-DAKSH, etc.
config.residential_categories -- care home, assisted living, etc.
config.document_types         -- vault document type options
```

**`public` schema** (with RLS — non-sensitive user data)
```
public.profile                -- display name, nest name, onboarding stage
public.profile_images         -- photo URLs only (actual files in Storage)
public.plan_progress          -- completion flags per module
public.onboarding_progress    -- step tracking, draft JSON
public.care_circle            -- caregiver names + contact (medium sensitivity)
public.caregiver_shares       -- access tokens for caregiver portal
public.emergency_activations  -- activation status + timestamps
public.emergency_checkins     -- check-in logs
public.support_requests       -- user support messages
public.advisor_chat_logs      -- AI conversation (consider encryption)
```

**`protected` schema** (strict RLS — SPDI data, never via anon key)
```
protected.child_profile            -- name, DOB, disability, UDID, health
protected.parent_profile           -- parent personal data
protected.medical_records          -- diagnoses, records
protected.medications              -- drug names, doses
protected.therapies                -- therapy, therapist details
protected.health_contacts          -- doctors, hospitals
protected.disability_documents     -- UDID no., Aadhaar no., PAN no.
protected.financial_assets         -- bank accounts, asset values
protected.financial_income         -- income sources
protected.financial_expenses       -- expense data
protected.financial_assumptions    -- financial planning params
protected.insurance_policies       -- policy numbers, coverage
protected.legal_will               -- will details, executor
protected.legal_trust              -- trust details, trustee
protected.legal_guardianship       -- guardianship details
protected.legal_poa                -- power of attorney
protected.succession_plans         -- succession plan data
protected.succession_guardians     -- guardian hierarchy
protected.succession_instructions  -- written instructions
protected.succession_assets        -- asset details in succession
protected.succession_milestones    -- milestones
protected.residential_options      -- addresses, facility details
protected.residential_checklist    -- checklist
protected.residential_letter_of_intent -- written intent
protected.emergency_plan           -- 24-hour plan
protected.emergency_coordinators   -- emergency contact details
protected.emergency_institutions   -- hospital, facility details
protected.emergency_consent        -- consent records
protected.digital_vault_documents  -- document metadata + file refs
```

---

## D. Migration strategy (how to do this safely)

### Phase 1 — New Supabase project (do this before more data accumulates)

1. **Create a new Supabase project** (currently very little user data — now is the easiest time)
2. Write a **consolidated migration** that creates all three schemas with correct RLS
3. Move **environment variables** to the new project keys
4. **No user data to migrate** — users re-register (or if needed, export + import auth.users)

### Phase 2 — Schema separation within the project

The schema separation can be done in the same project or the new one. Recommend doing both at once:
```sql
CREATE SCHEMA IF NOT EXISTS protected;
CREATE SCHEMA IF NOT EXISTS config;
-- Grant authenticated role access to protected (never anon)
GRANT USAGE ON SCHEMA protected TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA protected TO authenticated;
-- Anon gets nothing in protected
REVOKE ALL ON SCHEMA protected FROM anon;
```

### Phase 3 — RLS on protected schema

Every table in `protected` gets the same RLS policy pattern:
```sql
ALTER TABLE protected.child_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.child_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Phase 4 — Vault encryption for ultra-sensitive fields

Use Supabase Vault (`pgsodium`) to encrypt at the column level for:
- `disability_documents.aadhaar_number`
- `disability_documents.udid_number`
- `financial_assets.account_number`
- `legal_will.*` (entire row encryption)

---

## E. Immediate action recommendation

**Now (low user base — best time to restructure):**
1. Create a new Supabase project
2. Write one consolidated `000_initial_schema.sql` with all three schemas + RLS
3. Update `.env` keys
4. Deploy — users re-register (or you migrate the 1-2 test users manually)

**Deferred (when scaling):**
1. Move to an India-hosted database (AWS Mumbai) for DPDP localisation compliance
2. Implement Supabase Vault encryption for Aadhaar/UDID/account fields
3. Add audit logging table (`protected.audit_log`) for SPDI access events
4. Formal privacy policy + consent management (DPDP requires documented consent)

---

## F. What does NOT need to move

The **Supabase Storage buckets** (where actual files are stored) are already separate from the database. Keep them in the same project. Bucket-level RLS policies already restrict access to authenticated users.

The **admin functions** (`admin_get_*`) can stay in `public` schema as they are — they use `SECURITY DEFINER` and only return aggregates, not raw PII.
