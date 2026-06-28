-- ============================================================
--  Migration 048: Create missing tables in protected schema
--
--  legal_trust and residential_letter_of_intent were defined in
--  000_initial_schema.sql but may not have been created on the
--  live database. Safe to run — all IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS protected.legal_trust (
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
DROP POLICY IF EXISTS "user_owns_row" ON protected.legal_trust;
CREATE POLICY "user_owns_row" ON protected.legal_trust
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS protected.residential_letter_of_intent (
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
DROP POLICY IF EXISTS "user_owns_row" ON protected.residential_letter_of_intent;
CREATE POLICY "user_owns_row" ON protected.residential_letter_of_intent
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Re-grant to cover newly created tables
GRANT SELECT, INSERT, UPDATE, DELETE ON protected.legal_trust TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON protected.residential_letter_of_intent TO authenticated;
