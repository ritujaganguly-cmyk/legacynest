-- ============================================================
--  Migration 049: Ensure vault-documents storage bucket exists
--
--  The bucket was defined in 000_initial_schema.sql but may not
--  have been created if that migration wasn't fully run.
--  ON CONFLICT DO NOTHING makes this safe to run multiple times.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('vault-documents', 'vault-documents', false, 10485760, null)
  ON CONFLICT (id) DO NOTHING;

-- RLS policies for vault-documents bucket (safe to recreate)
DROP POLICY IF EXISTS "vault_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "vault_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "vault_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "vault_owner_delete" ON storage.objects;

CREATE POLICY "vault_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "vault_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "vault_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "vault_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vault-documents' AND split_part(name, '/', 1) = auth.uid()::text);
