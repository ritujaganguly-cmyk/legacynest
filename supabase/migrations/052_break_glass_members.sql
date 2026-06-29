-- ============================================================
--  Migration 052: Break-glass members (per-domain primary/backup caregivers)
--
--  Each emergency break-glass block (daily_care / medical / financial / legal)
--  gets a primary + backup caregiver with an email + invite/accept flow.
--  All assignees are caregivers (view-only).
--
--  Designed to migrate cleanly into v2 `child_member` (role = caregiver):
--    user_id      -> child_id
--    block        -> permissions.sections[]
--    rank         -> order_index
--    email        -> invited_email
--    status       -> child_member.status
--    access_token -> reused as-is
-- ============================================================

CREATE TABLE IF NOT EXISTS public.break_glass_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block         text NOT NULL CHECK (block IN ('daily_care','medical','financial','legal')),
  rank          text NOT NULL DEFAULT 'primary' CHECK (rank IN ('primary','backup')),
  name          text,
  email         text NOT NULL,
  phone         text,
  relationship  text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','invited','accepted','declined')),
  access_token  text UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  invited_at    timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, block, rank)
);
ALTER TABLE public.break_glass_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_owns_bg_members" ON public.break_glass_members;
CREATE POLICY "user_owns_bg_members" ON public.break_glass_members
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_bg_members_user ON public.break_glass_members(user_id);

-- The 4 break-glass info blocks (structured) on the emergency plan
ALTER TABLE protected.emergency_plan
  ADD COLUMN IF NOT EXISTS break_glass jsonb DEFAULT '{}'::jsonb;

-- ── Public RPC: read invite details for the accept page (token-based, no login) ──
CREATE OR REPLACE FUNCTION public.get_break_glass_invite(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'member_name', m.name,
    'email',       m.email,
    'block',       m.block,
    'rank',        m.rank,
    'status',      m.status,
    'inviter_name', COALESCE(pp.full_name, 'A LegacyNest family'),
    'child_name',   cp.name
  ) INTO result
  FROM public.break_glass_members m
  LEFT JOIN protected.parent_profile pp ON pp.user_id = m.user_id
  LEFT JOIN protected.child_profile  cp ON cp.user_id = m.user_id
  WHERE m.access_token = p_token;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_break_glass_invite(text) TO anon, authenticated;

-- ── Public RPC: accept / decline an invite (token-based, no login) ──
CREATE OR REPLACE FUNCTION public.respond_break_glass_invite(p_token text, p_accept boolean)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE result json;
BEGIN
  UPDATE public.break_glass_members
  SET status      = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      accepted_at = CASE WHEN p_accept THEN now() ELSE accepted_at END,
      updated_at  = now()
  WHERE access_token = p_token
    AND status IN ('invited','accepted','declined')
  RETURNING json_build_object('status', status, 'block', block) INTO result;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.respond_break_glass_invite(text, boolean) TO anon, authenticated;
