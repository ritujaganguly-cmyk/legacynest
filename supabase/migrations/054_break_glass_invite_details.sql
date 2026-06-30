-- ============================================================
--  Migration 054: Extend the break-glass invite RPC with the
--  "what's shared with you" details for the accept-page landing.
--
--  Adds to get_break_glass_invite():
--    block_text   — the owner's written summary for this block
--    is_active    — whether the emergency plan is currently Active
--    shared_files — vault documents enabled for this block (metadata only;
--                    actual file access is granted via the
--                    get-break-glass-file edge function, gated on is_active)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_break_glass_invite(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'member_name',  m.name,
    'email',        m.email,
    'block',        m.block,
    'rank',         m.rank,
    'status',       m.status,
    'inviter_name', COALESCE(pp.full_name, 'A LegacyNest family'),
    'child_name',   cp.name,
    'block_text',   ep.break_glass ->> m.block,
    'is_active',    COALESCE(ep.activation_status, 'Standby') = 'Active',
    'shared_files', (
      SELECT json_agg(json_build_object('id', vd.id, 'name', vd.document_name, 'category', vd.category))
      FROM protected.digital_vault_documents vd
      WHERE vd.user_id = m.user_id
        AND vd.id::text IN (
          SELECT jsonb_array_elements_text(COALESCE(ep.break_glass_files -> m.block, '[]'::jsonb))
        )
    )
  ) INTO result
  FROM public.break_glass_members m
  LEFT JOIN protected.parent_profile pp ON pp.user_id = m.user_id
  LEFT JOIN protected.child_profile  cp ON cp.user_id = m.user_id
  LEFT JOIN protected.emergency_plan ep ON ep.user_id = m.user_id
  WHERE m.access_token = p_token;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_break_glass_invite(text) TO anon, authenticated;
