-- ============================================================
--  Migration 056: LegacyNest admin approves manual-review break-glass
--
--  Manual-review blocks (medical/financial/legal always; daily_care
--  when the owner chooses "manual review" instead of a timer) are no
--  longer self-released by the parent. A LegacyNest admin reviews and
--  approves release, within 3 working days of activation — the same
--  human-in-the-loop pattern already used for emergency activation
--  approval (admin_get_activation_requests / emergency_activations).
-- ============================================================

-- List every pending manual-review block across all users, for the admin console.
CREATE OR REPLACE FUNCTION public.admin_list_pending_break_glass()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t) ORDER BY t.activated_at ASC) INTO result
  FROM (
    SELECT
      ep.user_id,
      u.email AS parent_email,
      pp.full_name AS parent_name,
      cp.name AS child_name,
      b.block,
      ep.activated_at,
      public.add_working_days(ep.activated_at, 3) AS due_by,
      (
        SELECT json_agg(json_build_object('name', m.name, 'email', m.email, 'rank', m.rank))
        FROM public.break_glass_members m
        WHERE m.user_id = ep.user_id AND m.block = b.block
      ) AS members
    FROM protected.emergency_plan ep
    JOIN auth.users u ON u.id = ep.user_id
    LEFT JOIN protected.parent_profile pp ON pp.user_id = ep.user_id
    LEFT JOIN protected.child_profile  cp ON cp.user_id = ep.user_id
    CROSS JOIN (VALUES ('daily_care'), ('medical'), ('financial'), ('legal')) AS b(block)
    WHERE ep.activation_status = 'Active'
      AND ep.activated_at IS NOT NULL
      -- only manual-mode blocks: daily_care only if owner chose manual; all others are always manual
      AND (
        (b.block = 'daily_care' AND COALESCE(ep.break_glass_release -> 'daily_care' ->> 'mode', 'manual') = 'manual')
        OR b.block <> 'daily_care'
      )
      -- not already released
      AND (ep.break_glass_released ->> b.block) IS NULL
      -- only blocks that actually have at least one caregiver configured
      AND EXISTS (SELECT 1 FROM public.break_glass_members m WHERE m.user_id = ep.user_id AND m.block = b.block)
  ) t;
  RETURN COALESCE(result, '[]'::json);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_break_glass() TO authenticated;

-- Admin approves release for one user's block.
CREATE OR REPLACE FUNCTION public.admin_release_break_glass(p_user_id uuid, p_block text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE v_current jsonb;
BEGIN
  SELECT COALESCE(break_glass_released, '{}'::jsonb) INTO v_current
  FROM protected.emergency_plan WHERE user_id = p_user_id;

  UPDATE protected.emergency_plan
  SET break_glass_released = v_current || jsonb_build_object(p_block, to_jsonb(now())),
      updated_at = now()
  WHERE user_id = p_user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_release_break_glass(uuid, text) TO authenticated;
