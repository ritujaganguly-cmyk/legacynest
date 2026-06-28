-- ============================================================
--  Migration 051: admin_delete_user + admin_list_users RPCs
--
--  Admin-only functions to list all users and delete a user
--  + all their data. Both are SECURITY DEFINER (run as postgres).
--  Access is enforced at the app layer (admin email check).
-- ============================================================

-- List all users with basic stats for the admin Users tab
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE result json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      u.raw_user_meta_data->>'full_name' AS display_name,
      (SELECT COUNT(*) FROM public.plan_progress pp WHERE pp.user_id = u.id AND pp.is_complete = true) AS sections_complete,
      EXISTS(SELECT 1 FROM protected.child_profile cp WHERE cp.user_id = u.id) AS has_child_profile,
      EXISTS(SELECT 1 FROM protected.digital_vault_documents vd WHERE vd.user_id = u.id) AS has_vault_docs
    FROM auth.users u
    ORDER BY u.created_at DESC
  ) t;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- Delete a specific user and all their data (admin action)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
BEGIN
  -- ── Protected schema (children before parents for FK) ────────
  DELETE FROM protected.succession_instructions
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = target_user_id);
  DELETE FROM protected.succession_assets
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = target_user_id);
  DELETE FROM protected.succession_guardians
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = target_user_id);
  DELETE FROM protected.succession_plans          WHERE user_id = target_user_id;
  DELETE FROM protected.child_profile             WHERE user_id = target_user_id;
  DELETE FROM protected.parent_profile            WHERE user_id = target_user_id;
  DELETE FROM protected.medical_records           WHERE user_id = target_user_id;
  DELETE FROM protected.medications               WHERE user_id = target_user_id;
  DELETE FROM protected.therapies                 WHERE user_id = target_user_id;
  DELETE FROM protected.health_contacts           WHERE user_id = target_user_id;
  DELETE FROM protected.disability_documents      WHERE user_id = target_user_id;
  DELETE FROM protected.financial_assets          WHERE user_id = target_user_id;
  DELETE FROM protected.financial_income          WHERE user_id = target_user_id;
  DELETE FROM protected.financial_expenses        WHERE user_id = target_user_id;
  DELETE FROM protected.financial_assumptions     WHERE user_id = target_user_id;
  DELETE FROM protected.insurance_policies        WHERE user_id = target_user_id;
  DELETE FROM protected.legal_will                WHERE user_id = target_user_id;
  DELETE FROM protected.legal_trust               WHERE user_id = target_user_id;
  DELETE FROM protected.legal_guardianship        WHERE user_id = target_user_id;
  DELETE FROM protected.legal_poa                 WHERE user_id = target_user_id;
  DELETE FROM protected.digital_vault_documents   WHERE user_id = target_user_id;
  DELETE FROM protected.emergency_plan            WHERE user_id = target_user_id;
  DELETE FROM protected.emergency_institutions    WHERE user_id = target_user_id;
  DELETE FROM protected.emergency_coordinators    WHERE user_id = target_user_id;
  DELETE FROM protected.emergency_consent         WHERE user_id = target_user_id;
  DELETE FROM protected.residential_checklist
    WHERE option_id IN (SELECT id FROM protected.residential_options WHERE user_id = target_user_id);
  DELETE FROM protected.residential_options            WHERE user_id = target_user_id;
  DELETE FROM protected.residential_letter_of_intent   WHERE user_id = target_user_id;

  -- ── Public schema ─────────────────────────────────────────────
  DELETE FROM public.care_circle                       WHERE user_id = target_user_id;
  DELETE FROM public.plan_progress                     WHERE user_id = target_user_id;
  DELETE FROM public.profile_images                    WHERE user_id = target_user_id;
  DELETE FROM public.nominations                       WHERE user_id = target_user_id;
  DELETE FROM public.advisor_chat_logs                 WHERE user_id = target_user_id;
  DELETE FROM public.emergency_activations             WHERE user_id = target_user_id;
  DELETE FROM public.emergency_checkins                WHERE user_id = target_user_id;
  DELETE FROM public.caregiver_shares                  WHERE user_id = target_user_id;
  DELETE FROM public.financial_planning_preferences    WHERE user_id = target_user_id;
  DELETE FROM public.privacy_acknowledgement           WHERE user_id = target_user_id;
  DELETE FROM public.user_consent                      WHERE user_id = target_user_id;
  DELETE FROM public.profiles                          WHERE id = target_user_id;

  -- ── Auth user ─────────────────────────────────────────────────
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
