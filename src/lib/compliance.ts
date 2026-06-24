/**
 * LegacyNest — Indian Data Protection Compliance
 *
 * Implements obligations under:
 *   • IT (SPDI) Rules 2011 — sensitive personal data collection + consent
 *   • DPDP Act 2023 — user rights: access, correction, erasure, portability,
 *                      consent management and withdrawal
 */
import { supabase, pdb } from "@/integrations/supabase/client";

// ── Consent policy version — bump when privacy policy changes ────────────────
export const CONSENT_VERSION = "1.0";

export const SPDI_CONSENT_TEXT =
  "I consent to LegacyNest collecting and storing sensitive personal data " +
  "about my child and family, including health/medical records, financial " +
  "information, disability documents, legal records, and identity references " +
  "(UDID, Aadhaar last-4, PAN), solely for the purpose of building a lifetime " +
  "care and succession plan. I understand this data is protected under the IT " +
  "(SPDI) Rules 2011 and the Digital Personal Data Protection Act 2023. " +
  "I can withdraw this consent and request data deletion at any time.";

// ── 1. Check if user has acknowledged the current privacy version ─────────────
export async function hasAcknowledgedPrivacy(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("privacy_acknowledgement")
    .select("version")
    .eq("user_id", user.id)
    .eq("version", CONSENT_VERSION)
    .maybeSingle();
  return Boolean(data);
}

// ── 2. Record privacy acknowledgement + SPDI consent ─────────────────────────
export async function recordConsent(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await Promise.all([
    supabase.from("privacy_acknowledgement").upsert(
      { user_id: user.id, version: CONSENT_VERSION, acknowledged_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ),
    supabase.from("user_consent").insert({
      user_id: user.id,
      version: CONSENT_VERSION,
      purpose: "spdi_collection",
      action: "given",
      consent_text: SPDI_CONSENT_TEXT,
      user_agent: navigator.userAgent,
    }),
  ]);
}

// ── 3. Withdraw consent (user requests data deletion) ────────────────────────
export async function withdrawConsent(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  await supabase.from("user_consent").insert({
    user_id: user.id,
    version: CONSENT_VERSION,
    purpose: "spdi_collection",
    action: "withdrawn",
    consent_text: "User withdrew consent and requested account deletion.",
    user_agent: navigator.userAgent,
  });
}

// ── 4. Right to Erasure — delete account + all data (DPDP s.13) ──────────────
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    await withdrawConsent();

    // Delete all protected schema data (cascades via ON DELETE CASCADE)
    // Deleting the auth.users row is done via Supabase admin — we call our
    // account-deletion edge function (or the user's auth session is cleared
    // and an admin webhook handles the actual auth.users deletion).
    const { error } = await supabase.rpc("request_account_deletion");
    if (error) throw error;

    await supabase.auth.signOut();
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ── 5. Right to Portability — export all user data as JSON (DPDP s.12) ────────
export async function exportUserData(): Promise<Record<string, unknown>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [
    child, parent, medical, medications, therapies, contacts,
    disability, assets, income, expenses, assumptions, insurance,
    legalWill, legalTrust, legalGuardianship, legalPoa,
    succession, successionGuardians, successionAssets, successionInstructions,
    residential, residentialLoi, emergency,
    careCircle, vault, planProgress,
  ] = await Promise.all([
    pdb.from("child_profile").select("*").eq("user_id", user.id),
    pdb.from("parent_profile").select("*").eq("user_id", user.id),
    pdb.from("medical_records").select("*").eq("user_id", user.id),
    pdb.from("medications").select("*").eq("user_id", user.id),
    pdb.from("therapies").select("*").eq("user_id", user.id),
    pdb.from("health_contacts").select("*").eq("user_id", user.id),
    pdb.from("disability_documents").select("id,document_type,certificate_number,disability_type,disability_percentage,issue_date,expiry_date,notes,created_at").eq("user_id", user.id),
    pdb.from("financial_assets").select("*").eq("user_id", user.id),
    pdb.from("financial_income").select("*").eq("user_id", user.id),
    pdb.from("financial_expenses").select("*").eq("user_id", user.id),
    pdb.from("financial_assumptions").select("*").eq("user_id", user.id),
    pdb.from("insurance_policies").select("*").eq("user_id", user.id),
    pdb.from("legal_will").select("*").eq("user_id", user.id),
    pdb.from("legal_trust").select("*").eq("user_id", user.id),
    pdb.from("legal_guardianship").select("*").eq("user_id", user.id),
    pdb.from("legal_poa").select("*").eq("user_id", user.id),
    pdb.from("succession_plans").select("*").eq("user_id", user.id),
    pdb.from("succession_guardians").select("*"),
    pdb.from("succession_assets").select("*"),
    pdb.from("succession_instructions").select("*"),
    pdb.from("residential_options").select("*").eq("user_id", user.id),
    pdb.from("residential_letter_of_intent").select("*").eq("user_id", user.id),
    pdb.from("emergency_plan").select("*").eq("user_id", user.id),
    supabase.from("care_circle").select("*").eq("user_id", user.id),
    pdb.from("digital_vault_documents").select("id,document_name,category,verification_status,created_at,notes").eq("user_id", user.id),
    supabase.from("plan_progress").select("*").eq("user_id", user.id),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    note: "Exported under DPDP Act 2023 Right to Data Portability. Sensitive identifiers (Aadhaar, account numbers) are excluded from this export.",
    data: {
      child_profile: child.data,
      parent_profile: parent.data,
      medical: { records: medical.data, medications: medications.data, therapies: therapies.data, contacts: contacts.data },
      disability_documents: disability.data,
      financial: { assets: assets.data, income: income.data, expenses: expenses.data, assumptions: assumptions.data, insurance: insurance.data },
      legal: { will: legalWill.data, trust: legalTrust.data, guardianship: legalGuardianship.data, poa: legalPoa.data },
      succession: { plans: succession.data, guardians: successionGuardians.data, assets: successionAssets.data, instructions: successionInstructions.data },
      residential: { options: residential.data, letter_of_intent: residentialLoi.data },
      emergency: emergency.data,
      care_circle: careCircle.data,
      vault_documents: vault.data,
      plan_progress: planProgress.data,
    },
  };
}

// ── 6. Sensitive field masking helpers ────────────────────────────────────────

/** Show only last 4 digits: XXXXXXXX1234 */
export function maskAadhaar(value: string | null | undefined): string {
  if (!value) return "—";
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 4) return "XXXX-XXXX-" + clean.padStart(4, "X");
  return "XXXX-XXXX-" + clean.slice(-4);
}

/** Show only last 4 digits of an account/policy number */
export function maskAccountNumber(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return "X".repeat(value.length - 4) + value.slice(-4);
}

/** PAN: show first 3 + XXX + last 2 chars: ABCXXXxx */
export function maskPan(value: string | null | undefined): string {
  if (!value || value.length < 5) return "—";
  return value.slice(0, 3) + "XXXXX" + value.slice(-2);
}

// ── 7. SPDI section metadata — purpose notice for each protected section ──────
export const SPDI_SECTIONS: Record<string, { label: string; purpose: string; lawRef: string }> = {
  child_profile: {
    label: "Child Profile",
    purpose: "Stored to personalise your care plan and ensure successor caregivers understand your child's needs.",
    lawRef: "SPDI Rules 2011 — health & disability data",
  },
  medical: {
    label: "Medical Records",
    purpose: "Stored so caregivers and emergency contacts can provide informed, continuous care.",
    lawRef: "SPDI Rules 2011 — medical records",
  },
  financial: {
    label: "Financial Planning",
    purpose: "Stored to project lifetime care costs and ensure financial continuity for your child.",
    lawRef: "SPDI Rules 2011 — financial information",
  },
  legal: {
    label: "Legal Documents",
    purpose: "Stored to ensure legal guardianship and asset succession are documented and accessible.",
    lawRef: "IT Act 2000 — legal documentation",
  },
  disability_documents: {
    label: "Disability Documents",
    purpose: "Stored to maintain UDID/certificate records required for government scheme eligibility.",
    lawRef: "SPDI Rules 2011 — disability & identity data",
  },
  vault: {
    label: "Digital Vault",
    purpose: "Encrypted document storage — accessible only to you and those you explicitly share with.",
    lawRef: "SPDI Rules 2011 — all categories",
  },
  emergency: {
    label: "Emergency Plan",
    purpose: "Stored so trusted coordinators can act immediately and correctly in a crisis.",
    lawRef: "SPDI Rules 2011 — health & personal data",
  },
  residential: {
    label: "Residential Planning",
    purpose: "Stored to document housing succession options with addresses and caregiver contacts.",
    lawRef: "IT Act 2000 — personal data",
  },
};
