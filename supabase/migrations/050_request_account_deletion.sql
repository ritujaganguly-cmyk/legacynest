-- ============================================================
--  Migration 050: request_account_deletion RPC
--
--  Called from the frontend Settings → Delete Account flow.
--  Deletes ALL user data across both schemas, then removes the
--  auth.users row (SECURITY DEFINER runs as postgres superuser).
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, protected, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Protected schema ────────────────────────────────────────
  -- succession children first (FK → succession_plans)
  DELETE FROM protected.succession_instructions
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = uid);
  DELETE FROM protected.succession_assets
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = uid);
  DELETE FROM protected.succession_guardians
    WHERE plan_id IN (SELECT id FROM protected.succession_plans WHERE user_id = uid);
  DELETE FROM protected.succession_plans       WHERE user_id = uid;
  DELETE FROM protected.child_profile          WHERE user_id = uid;
  DELETE FROM protected.parent_profile         WHERE user_id = uid;
  DELETE FROM protected.medical_records        WHERE user_id = uid;
  DELETE FROM protected.medications            WHERE user_id = uid;
  DELETE FROM protected.therapies              WHERE user_id = uid;
  DELETE FROM protected.health_contacts        WHERE user_id = uid;
  DELETE FROM protected.disability_documents   WHERE user_id = uid;
  DELETE FROM protected.financial_assets       WHERE user_id = uid;
  DELETE FROM protected.financial_income       WHERE user_id = uid;
  DELETE FROM protected.financial_expenses     WHERE user_id = uid;
  DELETE FROM protected.financial_assumptions  WHERE user_id = uid;
  DELETE FROM protected.insurance_policies     WHERE user_id = uid;
  DELETE FROM protected.legal_will             WHERE user_id = uid;
  DELETE FROM protected.legal_trust            WHERE user_id = uid;
  DELETE FROM protected.legal_guardianship     WHERE user_id = uid;
  DELETE FROM protected.legal_poa              WHERE user_id = uid;
  DELETE FROM protected.digital_vault_documents WHERE user_id = uid;
  DELETE FROM protected.emergency_plan         WHERE user_id = uid;
  DELETE FROM protected.emergency_institutions WHERE user_id = uid;
  DELETE FROM protected.emergency_coordinators WHERE user_id = uid;
  DELETE FROM protected.emergency_consent      WHERE user_id = uid;
  -- residential children first (FK → residential_options)
  DELETE FROM protected.residential_checklist
    WHERE option_id IN (SELECT id FROM protected.residential_options WHERE user_id = uid);
  DELETE FROM protected.residential_options         WHERE user_id = uid;
  DELETE FROM protected.residential_letter_of_intent WHERE user_id = uid;

  -- ── Public schema ────────────────────────────────────────────
  DELETE FROM public.care_circle              WHERE user_id = uid;
  DELETE FROM public.plan_progress            WHERE user_id = uid;
  DELETE FROM public.profile_images           WHERE user_id = uid;
  DELETE FROM public.nominations              WHERE user_id = uid;
  DELETE FROM public.advisor_chat_logs        WHERE user_id = uid;
  DELETE FROM public.emergency_activations    WHERE user_id = uid;
  DELETE FROM public.emergency_checkins       WHERE user_id = uid;
  DELETE FROM public.caregiver_shares         WHERE user_id = uid;
  DELETE FROM public.financial_planning_preferences WHERE user_id = uid;
  DELETE FROM public.privacy_acknowledgement  WHERE user_id = uid;
  DELETE FROM public.user_consent             WHERE user_id = uid;
  DELETE FROM public.profiles                 WHERE id = uid;

  -- ── Auth user (SECURITY DEFINER allows this) ─────────────────
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
