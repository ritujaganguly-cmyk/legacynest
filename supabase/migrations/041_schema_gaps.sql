-- ============================================================
--  Migration 041: Fill gaps found during schema consolidation audit
--  Run this on the existing database after 000_initial_schema.sql
-- ============================================================

-- ── 1. Missing function: admin_get_state_distribution ────────────────────────
--  Was in old migrations, missing from 000_initial_schema.sql
CREATE OR REPLACE FUNCTION public.admin_get_state_distribution()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = protected, public
AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT COALESCE(relationship_to_child, 'Unknown') AS relationship, COUNT(*) AS count
    FROM protected.parent_profile
    GROUP BY relationship_to_child
    ORDER BY count DESC
    LIMIT 15
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_state_distribution() TO anon, authenticated;

-- ── 2. Missing table: profiles ────────────────────────────────────────────────
--  Used in app code for people lookup (full_name, phone, email, relation).
--  Different from public.profile which holds onboarding metadata.
--  This is the legacy Supabase auth-linked profiles table.
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  phone      text,
  email      text,
  relation   text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_owns_profiles" ON public.profiles;
CREATE POLICY "user_owns_profiles" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 3. Missing table: nominations ────────────────────────────────────────────
--  Linked to financial assets — tracks nominee assignments.
CREATE TABLE IF NOT EXISTS public.nominations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_ref  text NOT NULL,   -- references a financial_assets id or name
  person_id  uuid,            -- references profiles.id
  status     text DEFAULT 'Pending',  -- 'Pending' | 'Confirmed' | 'Rejected'
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_owns_nominations" ON public.nominations;
CREATE POLICY "user_owns_nominations" ON public.nominations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_nominations_user ON public.nominations(user_id);

-- ── 4. Missing table: financial_planning_preferences ─────────────────────────
--  Stores user-level financial planning parameters (inflation, ages, costs).
CREATE TABLE IF NOT EXISTS public.financial_planning_preferences (
  user_id                               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inflation_expectation                 numeric DEFAULT 6,
  parent_milestone_age_for_extra_care   int,
  estimated_future_caregiver_monthly_cost numeric,
  updated_at                            timestamptz DEFAULT now()
);
ALTER TABLE public.financial_planning_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_owns_fin_prefs" ON public.financial_planning_preferences;
CREATE POLICY "user_owns_fin_prefs" ON public.financial_planning_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 5. Ensure care_circle has all columns used in app code ───────────────────
--  The base care_circle table was created before migration 001 (in Supabase dashboard).
--  Add any columns that may be missing.
ALTER TABLE public.care_circle
  ADD COLUMN IF NOT EXISTS avatar_color text,
  ADD COLUMN IF NOT EXISTS relation text;

-- ── 6. Ensure digital_vault_documents (protected) has all app-used columns ───
ALTER TABLE protected.digital_vault_documents
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS title text;

-- ── 7. Add admin_get_state_distribution to 000_initial_schema note ───────────
--  (No SQL needed — tracked here for documentation)

-- ── 8. Verify grants are complete ────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_signups_by_day(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_state_distribution() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_module_usage() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_vault_files_per_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_activation_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activation_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_caregiver_portal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_caregiver_all_portals(text) TO anon, authenticated;
