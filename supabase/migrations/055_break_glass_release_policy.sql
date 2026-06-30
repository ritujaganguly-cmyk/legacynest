-- ============================================================
--  Migration 055: Per-block break-glass release policy
--
--  daily_care: owner chooses 'timer' (auto-release N hours after
--    activation) or 'manual' (owner reviews and releases by hand).
--  medical / financial / legal: ALWAYS 'manual' — reviewed and
--    released by the owner, expected within 3 working days of
--    activation. Not user-configurable (enforced server-side).
--
--  Release readiness ("is the info actually visible to the
--  caregiver yet") is computed once here and reused by both the
--  invite RPC (accept page) and the edge function (file access),
--  so there is exactly one source of truth.
-- ============================================================

ALTER TABLE protected.emergency_plan
  ADD COLUMN IF NOT EXISTS break_glass_release  jsonb DEFAULT '{}'::jsonb,  -- { block: { mode, timer_hours } }
  ADD COLUMN IF NOT EXISTS break_glass_released jsonb DEFAULT '{}'::jsonb; -- { block: iso_timestamp }  (manual release marker)

-- ── Working-day arithmetic (Mon–Fri), used for the 3-working-day SLA ─────────
CREATE OR REPLACE FUNCTION public.add_working_days(start_ts timestamptz, n int)
RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  d timestamptz := start_ts;
  added int := 0;
BEGIN
  IF start_ts IS NULL THEN RETURN NULL; END IF;
  WHILE added < n LOOP
    d := d + interval '1 day';
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN d;
END $$;

-- ── Extend the invite RPC with release-policy fields ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_break_glass_invite(p_token text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE
  v_member               public.break_glass_members%ROWTYPE;
  v_activation_status     text;
  v_activated_at          timestamptz;
  v_break_glass           jsonb;
  v_break_glass_files     jsonb;
  v_break_glass_release   jsonb;
  v_break_glass_released  jsonb;
  v_inviter_name          text;
  v_child_name            text;
  v_is_active             boolean;
  v_mode                  text;
  v_timer_hours           numeric;
  v_is_released           boolean;
  v_unlocks_at            timestamptz;
  v_shared_files          json;
BEGIN
  SELECT * INTO v_member FROM public.break_glass_members WHERE access_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT ep.activation_status, ep.activated_at, ep.break_glass, ep.break_glass_files,
         ep.break_glass_release, ep.break_glass_released
    INTO v_activation_status, v_activated_at, v_break_glass, v_break_glass_files,
         v_break_glass_release, v_break_glass_released
  FROM protected.emergency_plan ep WHERE ep.user_id = v_member.user_id;

  SELECT pp.full_name INTO v_inviter_name FROM protected.parent_profile pp WHERE pp.user_id = v_member.user_id;
  SELECT cp.name       INTO v_child_name  FROM protected.child_profile  cp WHERE cp.user_id = v_member.user_id;

  v_is_active := COALESCE(v_activation_status, 'Standby') = 'Active';

  -- Only daily_care may use 'timer'; every other block is forced to 'manual'.
  IF v_member.block = 'daily_care' THEN
    v_mode := COALESCE(v_break_glass_release -> 'daily_care' ->> 'mode', 'manual');
  ELSE
    v_mode := 'manual';
  END IF;

  IF NOT v_is_active THEN
    v_is_released := false;
    v_unlocks_at := NULL;
  ELSIF v_mode = 'timer' THEN
    v_timer_hours := COALESCE((v_break_glass_release -> 'daily_care' ->> 'timer_hours')::numeric, 0);
    v_unlocks_at := v_activated_at + (v_timer_hours::text || ' hours')::interval;
    v_is_released := now() >= v_unlocks_at;
    IF v_is_released THEN v_unlocks_at := NULL; END IF;
  ELSE
    v_is_released := (v_break_glass_released ->> v_member.block) IS NOT NULL;
    v_unlocks_at := CASE WHEN v_is_released THEN NULL ELSE public.add_working_days(v_activated_at, 3) END;
  END IF;

  SELECT json_agg(json_build_object('id', vd.id, 'name', vd.document_name, 'category', vd.category))
    INTO v_shared_files
  FROM protected.digital_vault_documents vd
  WHERE vd.user_id = v_member.user_id
    AND vd.id::text IN (
      SELECT jsonb_array_elements_text(COALESCE(v_break_glass_files -> v_member.block, '[]'::jsonb))
    );

  RETURN json_build_object(
    'member_name',  v_member.name,
    'email',        v_member.email,
    'block',        v_member.block,
    'rank',         v_member.rank,
    'status',       v_member.status,
    'inviter_name', COALESCE(v_inviter_name, 'A LegacyNest family'),
    'child_name',   v_child_name,
    'block_text',   v_break_glass ->> v_member.block,
    'is_active',    v_is_active,
    'release_mode', v_mode,
    'is_released',  v_is_released,
    'unlocks_at',   v_unlocks_at,
    'shared_files', v_shared_files
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_break_glass_invite(text) TO anon, authenticated;
