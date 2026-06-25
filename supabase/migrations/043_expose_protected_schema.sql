-- ============================================================
--  043 — Expose protected schema to PostgREST + fix grants
--
--  Root cause: PostgREST only serves schemas listed in its
--  "db-schemas" config. The protected schema exists in Postgres
--  with correct RLS, but PostgREST never received queries for it.
--
--  Two steps needed:
--    A) Run this SQL in Supabase SQL Editor
--    B) In Supabase Dashboard → Settings → API → "Exposed schemas"
--       add "protected" to the list, then click Save.
--       (PostgREST will reload automatically.)
-- ============================================================

-- Step 1: Ensure authenticated role can use the schema
GRANT USAGE ON SCHEMA protected TO authenticated;

-- Step 2: Explicit grants on ALL EXISTING tables
--   (ALTER DEFAULT PRIVILEGES only covers tables created AFTER
--    it runs — existing tables need explicit grants)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA protected
  TO authenticated;

-- Step 3: Sequences (needed for uuid/serial columns)
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA protected
  TO authenticated;

-- Step 4: Keep anon role blocked (security — no change to existing REVOKE)
REVOKE ALL ON SCHEMA protected FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA protected FROM anon;

-- Step 5: Verify RLS is enabled on every protected table
--   (safety check — these were already set in 000_initial_schema.sql)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'protected'
  LOOP
    EXECUTE format('ALTER TABLE protected.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
