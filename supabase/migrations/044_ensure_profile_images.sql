-- 044 — Ensure profile_images table exists with correct structure
-- Profile images are stored as Base64 (≤10 KB) in public schema.

CREATE TABLE IF NOT EXISTS public.profile_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,   -- 'child' | 'parent' | 'care_circle'
  entity_id    text NOT NULL,
  image_data   text NOT NULL,
  size_bytes   int  NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy cleanly
DROP POLICY IF EXISTS "user_owns_images" ON public.profile_images;
CREATE POLICY "user_owns_images" ON public.profile_images
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.profile_images TO authenticated;
