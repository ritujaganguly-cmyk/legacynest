-- ============================================================
--  LegacyNest — Consolidated Initial Schema
--  Run this on a FRESH Supabase project (replaces all 40 migrations)
--  Three schemas: config (lookup data) | public (non-sensitive) | protected (SPDI)
--
--  Indian compliance:
--    • SPDI Rules 2011 (IT Act) — medical, financial, disability, legal data
--    • DPDP Act 2023 — all personal data
--    • anon role has ZERO access to protected schema
--    • authenticated role can only read/write their own rows (RLS on every table)
--    • Audit logging hooks can be added on protected tables later
-- ============================================================

-- ── 0. Schema setup ──────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS protected;
CREATE SCHEMA IF NOT EXISTS config;

-- anon gets nothing in protected
REVOKE ALL ON SCHEMA protected FROM anon, public;
GRANT USAGE ON SCHEMA protected TO authenticated;

-- authenticated gets all on protected (RLS restricts per-row below)
ALTER DEFAULT PRIVILEGES IN SCHEMA protected
  GRANT ALL ON TABLES TO authenticated;

-- config is read-only for all
GRANT USAGE ON SCHEMA config TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA config
  GRANT SELECT ON TABLES TO anon, authenticated;

-- ── 1. CONFIG schema — static lookup data, no user rows ──────────────────────

CREATE TABLE config.disability_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  category text   -- 'Physical' | 'Intellectual' | 'Neurological' | 'Sensory' | 'Multiple'
);

INSERT INTO config.disability_types (code, label, category) VALUES
  ('ASD',    'Autism Spectrum Disorder',     'Neurological'),
  ('ADHD',   'ADHD',                         'Neurological'),
  ('DS',     'Down Syndrome',                'Intellectual'),
  ('CP',     'Cerebral Palsy',               'Physical'),
  ('ID',     'Intellectual Disability',      'Intellectual'),
  ('VI',     'Visual Impairment',            'Sensory'),
  ('HI',     'Hearing Impairment',           'Sensory'),
  ('MD',     'Multiple Disabilities',        'Multiple'),
  ('SLD',    'Specific Learning Disability', 'Neurological'),
  ('OTHER',  'Other',                        'Multiple')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE config.government_schemes (
  code  text PRIMARY KEY,
  label text NOT NULL,
  url   text
);

INSERT INTO config.government_schemes (code, label, url) VALUES
  ('UDID',      'UDID — Unique Disability ID',        'https://swavlambancard.gov.in'),
  ('NIRAMAYA',  'Niramaya Health Insurance',           'https://thenationaltrust.gov.in'),
  ('NIDHI',     'NIDHI Scheme (National Trust)',       'https://thenationaltrust.gov.in'),
  ('PMHKM',     'PM-DAKSH / PM Aarogya Mitra',        NULL),
  ('NHFDC',     'NHFDC Loans for PwDs',               'https://nhfdc.nic.in'),
  ('SAMARTH',   'SAMARTH Scheme',                     NULL),
  ('DDRS',      'District Disability Rehabilitation',  NULL)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE config.residential_option_types (
  code  text PRIMARY KEY,
  label text NOT NULL
);

INSERT INTO config.residential_option_types (code, label) VALUES
  ('HOME_CARE',       'Stay-at-Home with Caregiver'),
  ('FAMILY_HOME',     'Family Member''s Home'),
  ('GROUP_HOME',      'Group Home / Community Living'),
  ('CARE_FACILITY',   'Care Facility / Residential School'),
  ('ASSISTED_LIVING', 'Assisted Living'),
  ('INDEPENDENT',     'Supported Independent Living')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE config.vault_document_types (
  code  text PRIMARY KEY,
  label text NOT NULL,
  schema_category text  -- maps to protected schema category
);

INSERT INTO config.vault_document_types (code, label, schema_category) VALUES
  ('UDID_CARD',        'UDID Card',                'Identity'),
  ('DISABILITY_CERT',  'Disability Certificate',   'Disability'),
  ('AADHAAR',          'Aadhaar Card',              'Identity'),
  ('PAN',              'PAN Card',                  'Identity'),
  ('WILL',             'Will / Testament',          'Legal'),
  ('TRUST_DEED',       'Trust Deed',                'Legal'),
  ('GUARDIANSHIP',     'Guardianship Order',        'Legal'),
  ('POA',              'Power of Attorney',         'Legal'),
  ('INSURANCE',        'Insurance Policy',          'Financial'),
  ('BANK_STATEMENT',   'Bank Statement',            'Financial'),
  ('MEDICAL_REPORT',   'Medical Report',            'Medical'),
  ('IEP',              'Individual Education Plan', 'Educational'),
  ('OTHER',            'Other Document',            'Other')
ON CONFLICT (code) DO NOTHING;

-- ── 2. PUBLIC schema — non-sensitive user data ────────────────────────────────

-- User profile (display metadata only)
CREATE TABLE public.profile (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  protect_for  text,          -- 'child' (only real option for LegacyNest)
  primary_goal text,          -- 'health' | 'preparedness' | 'legacy' | 'story'
  nest_name    text,          -- child's name used as nest label
  onboarded_at timestamptz,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_profile" ON public.profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile images (Base64, max 10 KB, for child/parent/caregiver avatars)
CREATE TABLE public.profile_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,   -- 'child' | 'parent' | 'care_circle' | 'guardian'
  entity_id    text NOT NULL,
  image_data   text NOT NULL,   -- Base64 data URL
  size_bytes   int  NOT NULL CHECK (size_bytes <= 10240),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_images" ON public.profile_images
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plan completion flags (which sections have at least one record)
CREATE TABLE public.plan_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section     text NOT NULL,
  is_complete boolean DEFAULT true,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, section)
);
ALTER TABLE public.plan_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_progress" ON public.plan_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Onboarding journey state (transient; cleared when onboarded_at is set)
CREATE TABLE public.onboarding_progress (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step       text,
  draft      jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_onboarding" ON public.onboarding_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Care circle (names + contact, medium sensitivity; in public with RLS)
CREATE TABLE public.care_circle (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  relationship       text,
  phone              text,
  email              text,
  role               text,           -- 'Primary Caregiver' | 'Backup' | 'Trustee' | etc.
  status             text DEFAULT 'Active' CHECK (status IN ('Active', 'Invited', 'Pending')),
  succession_order   int  DEFAULT 99,
  is_emergency_contact boolean DEFAULT false,
  responsibilities   text[] DEFAULT '{}',
  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE public.care_circle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_care_circle" ON public.care_circle
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Caregiver portal access tokens + what is shared
CREATE TABLE public.caregiver_shares (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_profile_id  uuid,
  caregiver_name    text NOT NULL,
  caregiver_email   text NOT NULL,
  caregiver_phone   text,
  relationship      text,
  caregiver_type    text NOT NULL DEFAULT 'care_circle',  -- 'care_circle' | 'succession'
  info_categories   text[] DEFAULT '{}',
  vault_doc_ids     uuid[] DEFAULT '{}',
  access_token      text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  share_note        text,
  category_comments jsonb DEFAULT '{}'::jsonb,
  shared_at         timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, caregiver_email)
);
ALTER TABLE public.caregiver_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_shares" ON public.caregiver_shares
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Emergency activation flow (operational, not SPDI)
CREATE TABLE public.emergency_activations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activated_by   text NOT NULL,
  activation_note text,
  status         text NOT NULL DEFAULT 'active',  -- 'active' | 'revoked'
  activated_at   timestamptz DEFAULT now(),
  revoked_at     timestamptz
);
ALTER TABLE public.emergency_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_reads_activation" ON public.emergency_activations
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.emergency_checkins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now()
);
ALTER TABLE public.emergency_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_checkins" ON public.emergency_checkins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Support requests (public contact form, no auth)
CREATE TABLE public.support_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  category   text NOT NULL DEFAULT 'General',
  query      text NOT NULL,
  status     text NOT NULL DEFAULT 'New',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_can_submit" ON public.support_requests
  FOR INSERT WITH CHECK (true);
CREATE POLICY "authenticated_can_read" ON public.support_requests
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE INDEX idx_support_status ON public.support_requests(status);
CREATE INDEX idx_support_created ON public.support_requests(created_at DESC);

-- AI advisor chat logs
CREATE TABLE public.advisor_chat_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL,  -- 'user' | 'assistant'
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.advisor_chat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_chats" ON public.advisor_chat_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. PROTECTED schema — SPDI data (no anon access) ─────────────────────────
--  RLS: authenticated users see ONLY their own rows.
--  Admin reporting uses SECURITY DEFINER functions (returns aggregates only).

-- Macro to reduce repetition
-- Each table: user_id FK + RLS policy "user_owns_row"

-- ── 3a. Child ────────────────────────────────────────────────────────────────
CREATE TABLE protected.child_profile (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic
  name                  text NOT NULL,
  date_of_birth         date,
  photo_url             text,
  -- Disability
  disability_type       text,
  disability_percentage int DEFAULT 0,
  udid_number           text,
  udid_validity         date,
  -- Health
  blood_group           text,
  allergies             text,
  current_medications   text,
  emergency_medical_info text,
  -- Behavioural & communication
  communication_style   text,
  behavioral_triggers   text,
  comfort_items         text,
  dietary_requirements  text,
  -- Education
  current_school        text,
  therapy_providers     text,
  iep_details           text,
  -- Government schemes
  enrolled_schemes      jsonb DEFAULT '[]'::jsonb,
  -- Metadata
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE protected.child_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.child_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3b. Parent ───────────────────────────────────────────────────────────────
CREATE TABLE protected.parent_profile (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name              text NOT NULL,
  phone                  text,
  date_of_birth          date,
  relationship_to_child  text,
  occupation             text,
  health_status          text,
  notes                  text,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE protected.parent_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.parent_profile
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3c. Medical ───────────────────────────────────────────────────────────────
CREATE TABLE protected.medical_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  category        text,
  doctor          text,
  record_date     text,
  next_appointment text,
  status          text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE protected.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.medical_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.medications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  dose       text,
  frequency  text,
  till_date  text,
  notes      text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE protected.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.medications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.therapies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  specialty       text,
  therapist_name  text,
  therapist_role  text,
  next_session    text,
  status          text,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE protected.therapies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.therapies
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.health_contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  role       text,
  facility   text,
  phone      text,
  is_primary boolean DEFAULT false,
  initials   text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE protected.health_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.health_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3d. Identity & disability documents ───────────────────────────────────────
--  Contains Aadhaar, UDID, PAN — highest sensitivity in the system.
CREATE TABLE protected.disability_documents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type        text NOT NULL,
  certificate_number   text,
  disability_percentage int,
  disability_type      text,
  certifying_authority text,
  issue_date           date,
  expiry_date          date,
  udid_number          text,   -- NOT UNIQUE here; uniqueness enforced at app level
  aadhar_number        text,   -- last 4 only; never store full Aadhaar
  pan_number           text,
  file_url             text,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
ALTER TABLE protected.disability_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.disability_documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3e. Financial ─────────────────────────────────────────────────────────────
CREATE TABLE protected.financial_assets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_name               text NOT NULL,
  asset_type               text NOT NULL DEFAULT 'FD / Fixed Deposit',
  current_value            numeric(15,2),
  bank_name                text,
  account_number           text,   -- store masked: XXXX1234
  branch                   text,
  nominee_name             text,
  nominee_relation         text,
  maturity_date            date,
  annual_return_percentage numeric(5,2),
  notes                    text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);
ALTER TABLE protected.financial_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.financial_assets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.financial_income (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  income_type        text NOT NULL DEFAULT 'Salary',
  monthly_amount     numeric NOT NULL DEFAULT 0,
  increment_rate     numeric NOT NULL DEFAULT 5,
  survives_parents   boolean NOT NULL DEFAULT false,
  ends_at_retirement boolean NOT NULL DEFAULT false,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE protected.financial_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.financial_income
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.financial_expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  category       text NOT NULL DEFAULT 'Daily Living',
  monthly_amount numeric NOT NULL DEFAULT 0,
  inflation_rate numeric NOT NULL DEFAULT 6,
  phase3_only    boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE protected.financial_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.financial_expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.financial_assumptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  child_current_age      int NOT NULL DEFAULT 10,
  child_life_expectancy  int NOT NULL DEFAULT 75,
  parent_age             int NOT NULL DEFAULT 45,
  parent_retirement_age  int NOT NULL DEFAULT 60,
  parent_life_expectancy int NOT NULL DEFAULT 80,
  general_inflation      numeric NOT NULL DEFAULT 6,
  blended_return_phase1  numeric NOT NULL DEFAULT 10,
  blended_return_phase3  numeric NOT NULL DEFAULT 7,
  existing_life_cover    numeric NOT NULL DEFAULT 0,
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE protected.financial_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.financial_assumptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.insurance_policies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type          text NOT NULL,
  provider_name        text NOT NULL,
  policy_number        text,
  premium_amount       numeric(10,2),
  premium_frequency    text,
  coverage_amount      numeric(15,2),
  start_date           date,
  maturity_date        date,
  nominee_name         text,
  nominee_relation     text,
  claim_status         text,
  documents_url        text,
  renewal_reminder_date date,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);
ALTER TABLE protected.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.insurance_policies
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_insurance_renewal ON protected.insurance_policies(renewal_reminder_date);

-- ── 3f. Legal ─────────────────────────────────────────────────────────────────
CREATE TABLE protected.legal_will (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  will_status              text NOT NULL DEFAULT 'Not Started',
  primary_executor_name    text,
  primary_executor_phone   text,
  primary_executor_email   text,
  alternate_executor_name  text,
  alternate_executor_phone text,
  alternate_executor_email text,
  lawyer_name              text,
  lawyer_firm              text,
  lawyer_phone             text,
  last_updated_date        date,
  vault_document_ref       text,
  notes                    text,
  updated_at               timestamptz DEFAULT now()
);
ALTER TABLE protected.legal_will ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.legal_will
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.legal_trust (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  trust_name              text,
  trust_type              text,
  trust_status            text NOT NULL DEFAULT 'Not Created',
  registration_number     text,
  registration_date       date,
  beneficiary_name        text,
  pan_number              text,
  managing_trustee_name   text,
  managing_trustee_phone  text,
  co_trustee_name         text,
  co_trustee_phone        text,
  successor_trustee_name  text,
  successor_trustee_phone text,
  annual_corpus_target    numeric(15,2),
  vault_document_ref      text,
  notes                   text,
  updated_at              timestamptz DEFAULT now()
);
ALTER TABLE protected.legal_trust ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.legal_trust
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.legal_guardianship (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  guardianship_status   text NOT NULL DEFAULT 'Not Initiated',
  guardian_name         text,
  guardian_phone        text,
  guardian_relationship text,
  guardianship_type     text,
  court_order_ref       text,
  court_order_date      date,
  appointing_court      text,
  next_renewal_date     date,
  vault_document_ref    text,
  notes                 text,
  updated_at            timestamptz DEFAULT now()
);
ALTER TABLE protected.legal_guardianship ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.legal_guardianship
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.legal_poa (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  has_poa            boolean NOT NULL DEFAULT false,
  holder_name        text,
  holder_phone       text,
  poa_scope          text,
  execution_date     date,
  expiry_date        date,
  vault_document_ref text,
  notes              text,
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE protected.legal_poa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.legal_poa
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3g. Succession plan ───────────────────────────────────────────────────────
CREATE TABLE protected.succession_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text DEFAULT 'Draft',
  priority    text DEFAULT 'High',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE protected.succession_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.succession_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.succession_guardians (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid NOT NULL REFERENCES protected.succession_plans(id) ON DELETE CASCADE,
  person_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name           text NOT NULL,
  role           text NOT NULL,
  relationship   text,
  phone          text,
  email          text,
  responsibilities text[] DEFAULT '{}',
  order_index    int,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE protected.succession_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.succession_guardians
  FOR ALL TO authenticated
  USING (plan_id IN (
    SELECT id FROM protected.succession_plans WHERE user_id = auth.uid()
  ));

CREATE TABLE protected.succession_assets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              uuid NOT NULL REFERENCES protected.succession_plans(id) ON DELETE CASCADE,
  asset_type           text NOT NULL,
  asset_name           text NOT NULL,
  asset_value          numeric,
  allocation_percentage numeric,
  assigned_guardian    uuid REFERENCES protected.succession_guardians(id) ON DELETE SET NULL,
  notes                text,
  created_at           timestamptz DEFAULT now()
);
ALTER TABLE protected.succession_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.succession_assets
  FOR ALL TO authenticated
  USING (plan_id IN (
    SELECT id FROM protected.succession_plans WHERE user_id = auth.uid()
  ));

CREATE TABLE protected.succession_instructions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    uuid NOT NULL REFERENCES protected.succession_plans(id) ON DELETE CASCADE,
  category   text NOT NULL,
  instruction text NOT NULL,
  priority   text DEFAULT 'Medium',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE protected.succession_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.succession_instructions
  FOR ALL TO authenticated
  USING (plan_id IN (
    SELECT id FROM protected.succession_plans WHERE user_id = auth.uid()
  ));

CREATE TABLE protected.succession_milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES protected.succession_plans(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  due_date    text,
  status      text DEFAULT 'Pending',
  responsibility text,
  order_index int,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE protected.succession_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.succession_milestones
  FOR ALL TO authenticated
  USING (plan_id IN (
    SELECT id FROM protected.succession_plans WHERE user_id = auth.uid()
  ));

-- ── 3h. Residential ───────────────────────────────────────────────────────────
CREATE TABLE protected.residential_options (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  option_type         text NOT NULL DEFAULT 'Stay-at-Home with Caregiver',
  address             text,
  city                text,
  monthly_cost        numeric(12,2),
  caregiver_name      text,
  caregiver_phone     text,
  succession_rank     text,
  is_current_home     boolean NOT NULL DEFAULT false,
  property_strategy   text,
  legal_status        text,
  accessibility_notes text,
  waitlist_status     text NOT NULL DEFAULT 'Not Applied',
  applied_date        date,
  expected_wait_years int,
  suitability_rating  int CHECK (suitability_rating BETWEEN 1 AND 5),
  pros                text,
  cons                text,
  has_consent         boolean NOT NULL DEFAULT false,
  has_keys_access     boolean NOT NULL DEFAULT false,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE protected.residential_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.residential_options
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.residential_checklist (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id uuid REFERENCES protected.residential_options(id) ON DELETE CASCADE,
  item      text NOT NULL,
  category  text NOT NULL DEFAULT 'Safety',
  is_done   boolean NOT NULL DEFAULT false,
  notes     text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE protected.residential_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.residential_checklist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.residential_letter_of_intent (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_routine           text,
  comfort_items           text,
  food_preferences        text,
  sleep_routine           text,
  sensory_needs           text,
  social_needs            text,
  communication_notes     text,
  important_relationships text,
  transition_notes        text,
  updated_at              timestamptz DEFAULT now()
);
ALTER TABLE protected.residential_letter_of_intent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.residential_letter_of_intent
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3i. Emergency plan ────────────────────────────────────────────────────────
CREATE TABLE protected.emergency_plan (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  coordinator_name         text,
  coordinator_phone        text,
  coordinator_relationship text,
  backup_coordinator_name  text,
  backup_coordinator_phone text,
  activation_status        text NOT NULL DEFAULT 'Standby',
  activated_at             timestamptz,
  activated_by             text,
  break_glass_instructions text,
  financial_bridge_notes   text,
  updated_at               timestamptz DEFAULT now()
);
ALTER TABLE protected.emergency_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.emergency_plan
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.emergency_coordinators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  relationship    text NOT NULL,
  activation_code text NOT NULL,
  code_sent_at    timestamptz,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, email)
);
ALTER TABLE protected.emergency_coordinators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.emergency_coordinators
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.emergency_consent (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  signed_at          timestamptz NOT NULL DEFAULT now(),
  consent_text       text NOT NULL,
  majority_rule      text NOT NULL,
  checkin_freq       text NOT NULL DEFAULT 'monthly',
  last_checkin_at    timestamptz,
  next_checkin_due   timestamptz,
  auto_trigger_hours numeric DEFAULT NULL,
  majority_reached_at timestamptz DEFAULT NULL
);
ALTER TABLE protected.emergency_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.emergency_consent
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE protected.emergency_institutions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name     text NOT NULL,
  contact      text,
  what_to_tell text,
  is_notified  boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE protected.emergency_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.emergency_institutions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Activation requests: submitted by coordinators, read-only for parent
CREATE TABLE public.emergency_activation_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coordinator_id    uuid,  -- references protected.emergency_coordinators(id)
  coordinator_email text NOT NULL,
  message           text,
  document_url      text,
  ip_address        text,
  status            text NOT NULL DEFAULT 'pending',
  submitted_at      timestamptz DEFAULT now()
);
ALTER TABLE public.emergency_activation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_reads_requests" ON public.emergency_activation_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "public_can_submit" ON public.emergency_activation_requests
  FOR INSERT WITH CHECK (true);

-- ── 3j. Digital Vault ─────────────────────────────────────────────────────────
CREATE TABLE protected.digital_vault_documents (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id                 uuid,
  document_name            text NOT NULL DEFAULT 'Document',
  title                    text,
  category                 text,
  file_url                 text,
  file_size_bytes          bigint,
  document_size            bigint,
  verification_status      text DEFAULT 'Pending Review',
  is_critical_for_emergency boolean DEFAULT false,
  extracted_ai_summary     jsonb,
  medical_record_id        uuid,
  therapy_id               uuid,
  storage_bucket_path      text,
  notes                    text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);
ALTER TABLE protected.digital_vault_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_row" ON protected.digital_vault_documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 4. Storage buckets ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('vault-documents', 'vault-documents', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "vault_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "vault_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "vault_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "vault_storage_delete" ON storage.objects;

-- File path format: {user_id}/{document_id}/{timestamp}_{filename}
CREATE POLICY "vault_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "vault_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "vault_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "vault_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);

-- ── 5. Admin functions (public schema, SECURITY DEFINER, aggregate only) ──────

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_users',           (SELECT COUNT(*) FROM auth.users),
    'total_child_profiles',  (SELECT COUNT(*) FROM protected.child_profile),
    'total_parent_profiles', (SELECT COUNT(*) FROM protected.parent_profile),
    'total_care_circle',     (SELECT COUNT(DISTINCT user_id) FROM public.care_circle),
    'total_medical_records', (SELECT COUNT(DISTINCT user_id) FROM protected.medical_records),
    'total_medications',     (SELECT COUNT(DISTINCT user_id) FROM protected.medications),
    'total_therapies',       (SELECT COUNT(DISTINCT user_id) FROM protected.therapies),
    'total_legal',           (SELECT COUNT(DISTINCT user_id) FROM protected.legal_will),
    'total_financial_assets',(SELECT COUNT(DISTINCT user_id) FROM protected.financial_assets),
    'total_vault_users',     (SELECT COUNT(DISTINCT user_id) FROM protected.digital_vault_documents),
    'total_vault_files',     (SELECT COUNT(*) FROM protected.digital_vault_documents),
    'total_succession',      (SELECT COUNT(DISTINCT user_id) FROM protected.succession_plans),
    'total_insurance',       (SELECT COUNT(DISTINCT user_id) FROM protected.insurance_policies),
    'total_residential',     (SELECT COUNT(DISTINCT user_id) FROM protected.residential_options),
    'total_emergency',       (SELECT COUNT(DISTINCT user_id) FROM protected.emergency_plan),
    'new_users_7d',          (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_30d',         (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '30 days')
  ) INTO result; RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_signups_by_day(days_back int DEFAULT 30)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM auth.users
    WHERE created_at > now() - (days_back || ' days')::interval
    GROUP BY DATE(created_at) ORDER BY DATE(created_at)
  ) t; RETURN COALESCE(result, '[]'::json);
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_module_usage()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT * FROM (VALUES
      ('Medical',     (SELECT COUNT(DISTINCT user_id) FROM protected.medical_records)),
      ('Care Circle', (SELECT COUNT(DISTINCT user_id) FROM public.care_circle)),
      ('Financial',   (SELECT COUNT(DISTINCT user_id) FROM protected.financial_assets)),
      ('Legal',       (SELECT COUNT(DISTINCT user_id) FROM protected.legal_will)),
      ('Vault',       (SELECT COUNT(DISTINCT user_id) FROM protected.digital_vault_documents)),
      ('Succession',  (SELECT COUNT(DISTINCT user_id) FROM protected.succession_plans)),
      ('Insurance',   (SELECT COUNT(DISTINCT user_id) FROM protected.insurance_policies)),
      ('Residential', (SELECT COUNT(DISTINCT user_id) FROM protected.residential_options)),
      ('Emergency',   (SELECT COUNT(DISTINCT user_id) FROM protected.emergency_plan)),
      ('Medications', (SELECT COUNT(DISTINCT user_id) FROM protected.medications))
    ) AS t(module, users) ORDER BY users DESC
  ) t; RETURN COALESCE(result, '[]'::json);
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_vault_files_per_user()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT u.email, COUNT(v.id) AS file_count, MAX(v.created_at) AS last_upload
    FROM auth.users u
    LEFT JOIN protected.digital_vault_documents v ON v.user_id = u.id
    GROUP BY u.email ORDER BY file_count DESC LIMIT 50
  ) t; RETURN COALESCE(result, '[]'::json);
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_activation_requests()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT
      u.email                                        AS parent_email,
      r.user_id,
      pp.full_name                                   AS parent_name,
      pp.phone                                       AS parent_phone,
      ep.coordinator_name                            AS call_first_name,
      ep.coordinator_phone                           AS call_first_phone,
      ep.coordinator_relationship                    AS call_first_relationship,
      ep.backup_coordinator_name                     AS backup_name,
      ep.backup_coordinator_phone                    AS backup_phone,
      COUNT(DISTINCT r.coordinator_email)            AS confirmations,
      (SELECT COUNT(*) FROM protected.emergency_coordinators ec WHERE ec.user_id = r.user_id) AS total_coordinators,
      MIN(r.submitted_at)                            AS first_request_at,
      MAX(r.submitted_at)                            AS last_request_at,
      bool_or(a.id IS NOT NULL)                      AS is_activated,
      ec_consent.auto_trigger_hours,
      ec_consent.majority_reached_at,
      (SELECT json_agg(json_build_object('name',cc.name,'phone',cc.phone,'email',cc.email,'relationship',cc.relationship))
         FROM public.care_circle cc WHERE cc.user_id = r.user_id)  AS care_circle,
      (SELECT json_agg(json_build_object('name',ecc.name,'email',ecc.email,'phone',ecc.phone,'relationship',ecc.relationship))
         FROM protected.emergency_coordinators ecc WHERE ecc.user_id = r.user_id) AS coordinators,
      json_agg(json_build_object('coordinator_email',r.coordinator_email,'message',r.message,
        'submitted_at',r.submitted_at,'document_url',r.document_url) ORDER BY r.submitted_at) AS requests
    FROM public.emergency_activation_requests r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN protected.parent_profile pp ON pp.user_id = r.user_id
    LEFT JOIN protected.emergency_plan ep ON ep.user_id = r.user_id
    LEFT JOIN protected.emergency_consent ec_consent ON ec_consent.user_id = r.user_id
    LEFT JOIN public.emergency_activations a ON a.user_id = r.user_id AND a.status = 'active'
    WHERE r.status != 'rejected'
    GROUP BY u.email, r.user_id, pp.full_name, pp.phone,
             ep.coordinator_name, ep.coordinator_phone, ep.coordinator_relationship,
             ep.backup_coordinator_name, ep.backup_coordinator_phone,
             ec_consent.auto_trigger_hours, ec_consent.majority_reached_at
    ORDER BY last_request_at DESC LIMIT 50
  ) t; RETURN COALESCE(result, '[]'::json);
END $$;

CREATE OR REPLACE FUNCTION public.get_activation_status(p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public AS $$
DECLARE
  total_coordinators int; confirmations int; majority_needed int; result json;
BEGIN
  SELECT COUNT(*) INTO total_coordinators
    FROM protected.emergency_coordinators WHERE user_id = p_user_id AND is_active = true;
  SELECT COUNT(DISTINCT coordinator_email) INTO confirmations
    FROM public.emergency_activation_requests WHERE user_id = p_user_id AND status = 'pending';
  majority_needed := (total_coordinators / 2) + 1;
  SELECT json_build_object(
    'total_coordinators', total_coordinators,
    'confirmations',      confirmations,
    'majority_needed',    majority_needed,
    'majority_reached',   confirmations >= majority_needed,
    'is_activated',       EXISTS(SELECT 1 FROM public.emergency_activations WHERE user_id = p_user_id AND status = 'active')
  ) INTO result; RETURN result;
END $$;

-- Caregiver portal (unauthenticated — token-based read of SPDI data)
-- Note: This function intentionally exposes protected data to unauthenticated callers
-- via a cryptographically random token. The token is treated as a secret.
CREATE OR REPLACE FUNCTION public.get_caregiver_portal(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public, auth AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'share',       row_to_json(s),
    'child',       row_to_json(cp),
    'parent_name', pp.full_name,
    'vault_docs',  (
      SELECT json_agg(json_build_object('id',vd.id,'title',vd.title,'category',vd.category,
        'file_url',vd.file_url,'notes',vd.notes,'created_at',vd.created_at))
      FROM protected.digital_vault_documents vd
      WHERE vd.id = ANY(s.vault_doc_ids) AND vd.user_id = s.user_id
    )
  ) INTO result
  FROM public.caregiver_shares s
  LEFT JOIN protected.child_profile cp ON cp.user_id = s.user_id
  LEFT JOIN protected.parent_profile pp ON pp.user_id = s.user_id
  WHERE s.access_token = p_token;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_caregiver_all_portals(p_token text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public, auth AS $$
DECLARE p_email text; result json;
BEGIN
  SELECT caregiver_email INTO p_email FROM public.caregiver_shares WHERE access_token = p_token;
  IF p_email IS NULL THEN RETURN NULL; END IF;
  SELECT json_agg(json_build_object(
    'share', row_to_json(s), 'child', row_to_json(cp), 'parent_name', pp.full_name,
    'vault_docs', (
      SELECT json_agg(json_build_object('id',vd.id,'title',vd.title,'category',vd.category,
        'file_url',vd.file_url,'notes',vd.notes,'created_at',vd.created_at))
      FROM protected.digital_vault_documents vd
      WHERE vd.id = ANY(s.vault_doc_ids) AND vd.user_id = s.user_id
    )
  ) ORDER BY s.created_at) INTO result
  FROM public.caregiver_shares s
  LEFT JOIN protected.child_profile cp ON cp.user_id = s.user_id
  LEFT JOIN protected.parent_profile pp ON pp.user_id = s.user_id
  WHERE s.caregiver_email = p_email AND s.shared_at IS NOT NULL;
  RETURN COALESCE(result, '[]'::json);
END $$;

-- ── 5b. Additional tables used by app code ───────────────────────────────────

-- Profiles (people lookup — full_name, phone; differs from public.profile)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  phone      text,
  email      text,
  relation   text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_profiles" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Nominations (financial asset → person mappings)
CREATE TABLE IF NOT EXISTS public.nominations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_ref  text NOT NULL,
  person_id  uuid,
  status     text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_nominations" ON public.nominations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Financial planning preferences (per-user calculation parameters)
CREATE TABLE IF NOT EXISTS public.financial_planning_preferences (
  user_id                                 uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inflation_expectation                   numeric DEFAULT 6,
  parent_milestone_age_for_extra_care     int,
  estimated_future_caregiver_monthly_cost numeric,
  updated_at                              timestamptz DEFAULT now()
);
ALTER TABLE public.financial_planning_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_fin_prefs" ON public.financial_planning_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 5c. admin_get_state_distribution (was missing from initial draft) ─────────
CREATE OR REPLACE FUNCTION public.admin_get_state_distribution()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = protected, public AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT COALESCE(relationship_to_child, 'Unknown') AS relationship, COUNT(*) AS count
    FROM protected.parent_profile
    GROUP BY relationship_to_child ORDER BY count DESC LIMIT 15
  ) t; RETURN COALESCE(result, '[]'::json);
END $$;

-- ── 6. Grant execute on all functions ─────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_signups_by_day(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_state_distribution() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_module_usage() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_vault_files_per_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_activation_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activation_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_caregiver_portal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_caregiver_all_portals(text) TO anon, authenticated;

-- ── 7. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_care_circle_user ON public.care_circle(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_shares_user ON public.caregiver_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_progress_user ON public.plan_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_user ON protected.medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_user ON protected.medications(user_id);
CREATE INDEX IF NOT EXISTS idx_therapies_user ON protected.therapies(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_assets_user ON protected.financial_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_docs_user ON protected.digital_vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_succession_plans_user ON protected.succession_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_residential_options_user ON protected.residential_options(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_renewal ON protected.insurance_policies(renewal_reminder_date);
CREATE INDEX IF NOT EXISTS idx_disability_docs_user ON protected.disability_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_user ON public.emergency_activation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_nominations_user ON public.nominations(user_id);

-- ── END ───────────────────────────────────────────────────────────────────────
-- Tables removed vs old schema (intentionally dropped / consolidated):
--   parent_profiles (old, replaced by protected.parent_profile)
--   legal_info (old, replaced by protected.legal_will/trust/guardianship/poa)
--   digital_vault_documents in public (moved to protected)
--   All old tables directly in public schema
