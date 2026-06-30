/**
 * Data service. User-scoped reads/writes go through Supabase
 * (RLS enforces `user_id = auth.uid()`). All RPC/table reads are wrapped
 * in try/catch and return safe fallbacks so the UI never crashes on a
 * missing object or invalid UUID reference.
 */
import { supabase, pdb } from "@/integrations/supabase/client";

export type VaultDocument = {
  id: string;
  name: string;
  category: "Legal" | "Medical" | "Financial" | "Identity" | "Disability" | "Government" | "Educational" | "Insurance";
  size: string;
  updatedAt: string;
  status: "Verified" | "Pending Review" | "Action Required";
  isCriticalForEmergency?: boolean;
  extractedAiSummary?: Record<string, unknown> | null;
  medicalRecordId?: string;
  therapyId?: string;
  storagePath?: string;
  notes?: string;
};

export type BreakGlassBlock = "daily_care" | "medical" | "financial" | "legal";
export type BreakGlassMember = {
  id: string;
  block: BreakGlassBlock;
  rank: "primary" | "backup";
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
  status: "draft" | "invited" | "accepted" | "declined";
  accessToken?: string;
};

export type ChildProfile = {
  id: string;
  name: string;
  dateOfBirth?: string;
  photoUrl?: string;
  disabilityType?: string;
  disabilityPercentage: number;
  udidNumber?: string;
  udidValidity?: string;
  bloodGroup?: string;
  allergies?: string;
  currentMedications?: string;
  emergencyMedicalInfo?: string;
  communicationStyle?: string;
  behavioralTriggers?: string;
  comfortItems?: string;
  dietaryRequirements?: string;
  currentSchool?: string;
  therapyProviders?: string;
  iepDetails?: string;
  enrolledSchemes: string[];
};

export type CareCircleMember = {
  id: string;
  name: string;
  relation: string;
  role: "Primary Caregiver" | "Secondary Caregiver" | "Successor Guardian" | "Legal Guardian" | "Trustee" | "Medical Decision Maker" | "Doctor / Therapist" | "Friend / Supporter";
  phone: string;
  email: string;
  status: "Active" | "Invited" | "Pending";
  avatarColor: string;
  successionOrder: number;
  isEmergencyContact: boolean;
  responsibilities?: string[];
  notes?: string;
};

export type SupportResource = {
  id: string;
  title: string;
  category: "Legal" | "Financial" | "Therapy" | "Community";
  description: string;
  cta: string;
  priority?: number;
  urgency?: "URGENT" | "RECOMMENDED" | null;
  actionType?: string | null;
  targetPk?: string | null;
};

export type Person = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  relation?: string | null;
};

export type Nomination = {
  id: string;
  assetRef: string;
  personId: string;
  status: "REGISTERED" | "PENDING" | "MISSING";
};

export type EmergencyPlan = {
  coordinatorName?: string;
  coordinatorPhone?: string;
  coordinatorRelationship?: string;
  backupCoordinatorName?: string;
  backupCoordinatorPhone?: string;
  activationStatus: "Standby" | "Active";
  activatedAt?: string | null;
  activatedBy?: string | null;
  breakGlassInstructions?: string;
  financialBridgeNotes?: string;
};

export type EmergencyInstitution = {
  id: string;
  orgName: string;
  contact?: string;
  whatToTell?: string;
  isNotified: boolean;
};

// Aggregated read-only "First 24 Hours" brief, assembled from existing data
export type EmergencyContactEntry = {
  name: string;
  role: string;
  relation: string;
  phone: string;
  email: string;
};
export type EmergencyBrief = {
  childName: string;
  bloodGroup: string;
  allergies: string;
  emergencyMedicalInfo: string;
  behavioralTriggers: string;
  comfortItems: string;
  medications: { name: string; dose: string; frequency: string }[];
  doctors: { name: string; role: string; phone: string; facility: string }[];
  emergencyContacts: EmergencyContactEntry[];
  tonightResidence?: {
    name: string; optionType: string; city?: string;
    caregiverName?: string; caregiverPhone?: string;
    hasConsent: boolean; hasKeysAccess: boolean;
  };
  guardianshipStatus?: string;
  poaInPlace?: boolean;
};

export type AdvisorChatLog = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

// Legacy type kept for refreshPlanProgress compatibility
export type ResidentialProperty = {
  id: string;
  name: string;
  address: string;
  legalStatus: string;
  accessibility: string;
  propertyStrategy?: "Retain" | "Sell" | "Lease" | "Trust";
};

export type ResidentialOption = {
  id: string;
  userId: string;
  name: string;
  optionType: "Current Home" | "Stay-at-Home with Caregiver" | "Sibling / Family Home" | "Group Home" | "Assisted Living" | "Independent Living" | "Other";
  address?: string;
  city?: string;
  monthlyCost?: number;
  caregiverName?: string;
  caregiverPhone?: string;
  successionRank?: "Primary" | "Backup" | "Emergency" | null;
  isCurrentHome: boolean;
  propertyStrategy?: "Retain" | "Sell" | "Lease" | "Trust";
  legalStatus?: string;
  accessibilityNotes?: string;
  waitlistStatus: "Not Applied" | "Applied" | "Waitlisted" | "Confirmed";
  appliedDate?: string;
  expectedWaitYears?: number;
  suitabilityRating?: number;
  pros?: string;
  cons?: string;
  hasConsent: boolean;
  hasKeysAccess: boolean;
  notes?: string;
};

export type ResidentialChecklistItem = {
  id: string;
  userId: string;
  optionId?: string;
  item: string;
  category: "Safety" | "Accessibility" | "Suitability" | "Transition";
  isDone: boolean;
  notes?: string;
};

export type ResidentialLetterOfIntent = {
  id: string;
  userId: string;
  dailyRoutine?: string;
  comfortItems?: string;
  foodPreferences?: string;
  sleepRoutine?: string;
  sensoryNeeds?: string;
  socialNeeds?: string;
  communicationNotes?: string;
  importantRelationships?: string;
  transitionNotes?: string;
};

export type FinancialBlueprint = {
  targetCorpus: number;
  currentAccumulated: number;
  monthlySipGap: number;
  sustainability: number;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  tillDate?: string;
  notes?: string;
};

export type HealthContact = {
  id: string;
  name: string;
  role: string;
  facility: string;
  phone: string;
  isPrimary: boolean;
  initials: string;
};

export type Therapy = {
  id: string;
  name: string;
  specialty: string;
  therapistName: string;
  therapistRole: string;
  nextSession: string;
  status?: "done" | "not_done";
};

export type MedicalRecord = {
  id: string;
  title: string;
  category: string;
  doctor: string;
  recordDate: string;
  nextAppointment?: string;
  status?: "done" | "not_done";
};

// Legacy stub — kept for refreshPlanProgress compatibility
export type LegalInfo = {
  primaryExecutor: string; alternateExecutor: string;
  willStatus: string; trustStatus: string; guardianName: string;
  courtOrderRef: string; beneficiaryName: string; trustType: string;
};

export type LegalWill = {
  willStatus: "Not Started" | "Drafted" | "Registered" | "Needs Update";
  primaryExecutorName?: string; primaryExecutorPhone?: string; primaryExecutorEmail?: string;
  alternateExecutorName?: string; alternateExecutorPhone?: string; alternateExecutorEmail?: string;
  lawyerName?: string; lawyerFirm?: string; lawyerPhone?: string;
  lastUpdatedDate?: string; vaultDocumentRef?: string; notes?: string;
};

export type LegalTrust = {
  trustName?: string;
  trustType?: "Private SNT" | "Public / National Trust" | "Composite Trust" | "None";
  trustStatus: "Not Created" | "In Progress" | "Registered" | "Active";
  registrationNumber?: string; registrationDate?: string;
  beneficiaryName?: string; panNumber?: string;
  managingTrusteeName?: string; managingTrusteePhone?: string;
  coTrusteeName?: string; coTrusteePhone?: string;
  successorTrusteeName?: string; successorTrusteePhone?: string;
  annualCorpusTarget?: number; vaultDocumentRef?: string; notes?: string;
};

export type LegalGuardianship = {
  guardianshipStatus: "Not Initiated" | "In Progress" | "Court Order Obtained" | "Active";
  guardianName?: string; guardianPhone?: string; guardianRelationship?: string;
  guardianshipType?: "RPWD Act 2016" | "Guardians and Wards Act 1890" | "National Trust Act" | "Other";
  courtOrderRef?: string; courtOrderDate?: string; appointingCourt?: string;
  nextRenewalDate?: string; vaultDocumentRef?: string; notes?: string;
};

export type LegalPoa = {
  hasPoa: boolean;
  holderName?: string; holderPhone?: string;
  poaScope?: "Financial" | "Medical" | "General" | "Limited";
  executionDate?: string; expiryDate?: string;
  vaultDocumentRef?: string; notes?: string;
};

export type ParentProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  relationshipToChild: string;
  occupation?: string;
  healthStatus?: string;
  notes?: string;
};

export type DisabilityDocument = {
  id: string;
  userId: string;
  documentType: string;
  certificateNumber?: string;
  disabilityPercentage?: number;
  disabilityType?: string;
  certifyingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  udidNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  fileUrl?: string;
  notes?: string;
};

export type FinancialAsset = {
  id: string;
  userId: string;
  assetType: string;
  assetName: string;
  currentValue?: number;
  bankName?: string;
  accountNumber?: string;
  branch?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  maturityDate?: string;
  annualReturnPercentage?: number;
  notes?: string;
};

export type FinancialExpenseRow = {
  id: string;
  userId: string;
  name: string;
  category: string;
  monthlyAmount: number;
  inflationRate: number;
  phase3Only: boolean;
  waivedAfterParents: boolean;
};

export type FinancialIncomeRow = {
  id: string;
  userId: string;
  name: string;
  incomeType: string;
  monthlyAmount: number;
  incrementRate: number;
  survivesParents: boolean;
  endsAtRetirement: boolean;
};

export type FinancialAssumptionsRow = {
  id: string;
  userId: string;
  childCurrentAge: number;
  childLifeExpectancy: number;
  parentAge: number;
  parentRetirementAge: number;
  parentLifeExpectancy: number;
  generalInflation: number;
  blendedReturnPhase1: number;
  blendedReturnPhase3: number;
  existingLifeCover: number;
};

export type InsurancePolicy = {
  id: string;
  userId: string;
  policyType: string;
  providerName: string;
  policyNumber?: string;
  premiumAmount?: number;
  premiumFrequency?: string;
  coverageAmount?: number;
  startDate?: string;
  maturityDate?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  claimStatus?: string;
  documentsUrl?: string;
  renewalReminderDate?: string;
  notes?: string;
};

export type SuccessionPlan = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: "Draft" | "In Progress" | "Complete" | "Active";
  priority: "Low" | "Medium" | "High" | "Critical";
  createdAt: string;
  updatedAt: string;
};

export type SuccessionMilestone = {
  id: string;
  planId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "Pending" | "In Progress" | "Complete" | "On Hold";
  responsibility?: string;
  orderIndex?: number;
};

export type SuccessionGuardian = {
  id: string;
  planId: string;
  personId?: string;
  name: string;
  role: "Primary Guardian" | "Alternate Guardian" | "Successor Guardian" | "Legal Guardian";
  relationship?: string;
  phone?: string;
  email?: string;
  orderIndex?: number;
  responsibilities?: string[];
};

export type SuccessionAsset = {
  id: string;
  planId: string;
  assetType: "Bank Account" | "Investments" | "Property" | "Schemes" | "Insurance" | "Custody";
  assetName: string;
  assetValue?: number;
  allocationPercentage?: number;
  assignedGuardianId?: string;
  notes?: string;
};

export type SuccessionInstruction = {
  id: string;
  planId: string;
  category: "Education" | "Healthcare" | "Residential" | "Financial" | "Legal";
  instruction: string;
  priority: "Low" | "Medium" | "High" | "Critical";
};

const wait = <T>(value: T, ms = 200) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.warn("[data] fallback", e);
    return fallback;
  }
};

/* ---------------------- CARE CIRCLE ---------------------- */
type CareRow = {
  id: string;
  name: string;
  relation: string;
  role: CareCircleMember["role"];
  phone: string;
  email: string | null;
  status: CareCircleMember["status"];
  avatar_color: string;
  succession_order: number | null;
  is_emergency_contact: boolean | null;
  responsibilities: string[] | null;
  notes: string | null;
};
const toMember = (r: CareRow): CareCircleMember => ({
  id: r.id,
  name: r.name,
  relation: r.relation,
  role: r.role,
  phone: r.phone,
  email: r.email ?? "",
  status: r.status,
  avatarColor: r.avatar_color,
  successionOrder: r.succession_order ?? 99,
  isEmergencyContact: r.is_emergency_contact ?? false,
  responsibilities: r.responsibilities ?? [],
  notes: r.notes ?? "",
});
const fromMember = (m: Partial<CareCircleMember>) => ({
  name: m.name,
  relation: m.relation,
  role: m.role,
  phone: m.phone,
  email: m.email || null,
  status: m.status ?? "Active",
  avatar_color: m.avatarColor,
  succession_order: m.successionOrder ?? 99,
  is_emergency_contact: m.isEmergencyContact ?? false,
  responsibilities: m.responsibilities?.length ? m.responsibilities : [],
  notes: m.notes || null,
});

/* ---------------------- VAULT ---------------------- */
type VaultRow = {
  id: string;
  category: VaultDocument["category"];
  document_name: string;
  file_size_bytes?: number | null;
  verification_status?: string | null;
  updated_at: string;
  is_critical_for_emergency?: boolean | null;
  extracted_ai_summary?: Record<string, unknown> | null;
  medical_record_id?: string | null;
  therapy_id?: string | null;
  document_size?: number | null;
  storage_bucket_path?: string | null;
  notes?: string | null;
};
const toVault = (r: VaultRow): VaultDocument => ({
  id: r.id,
  name: r.document_name ?? "Document",
  category: (r.category ?? "Legal") as VaultDocument["category"],
  size: (r.document_size != null ? `${Math.round(r.document_size / 1024 / 1024 * 100) / 100}MB` : r.file_size_bytes != null ? `${Math.round(r.file_size_bytes / 1024)} KB` : "—"),
  status: (r.verification_status as VaultDocument["status"]) ?? "Pending Review",
  updatedAt: new Date(r.updated_at).toLocaleDateString(),
  isCriticalForEmergency: !!r.is_critical_for_emergency,
  extractedAiSummary: r.extracted_ai_summary ?? null,
  medicalRecordId: r.medical_record_id ?? undefined,
  therapyId: r.therapy_id ?? undefined,
  storagePath: r.storage_bucket_path ?? undefined,
  notes: r.notes ?? undefined,
});

const toBreakGlassMember = (r: Record<string, unknown>): BreakGlassMember => ({
  id: r.id as string,
  block: r.block as BreakGlassBlock,
  rank: (r.rank as "primary" | "backup") ?? "primary",
  name: (r.name as string) ?? "",
  email: (r.email as string) ?? "",
  phone: (r.phone as string) ?? undefined,
  relationship: (r.relationship as string) ?? undefined,
  status: (r.status as BreakGlassMember["status"]) ?? "draft",
  accessToken: (r.access_token as string) ?? undefined,
});

/* ---------------------- ROW TYPES ---------------------- */
type PersonRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  relation: string | null;
};
type NominationRow = {
  id: string;
  asset_ref: string;
  person_id: string;
  status: Nomination["status"];
};
type SupportFeedRow = {
  id?: unknown;
  pk?: unknown;
  title?: string;
  category?: string;
  description?: string;
  cta?: string;
  priority?: unknown;
  urgency?: string | null;
  action_type?: string | null;
  target_pk?: unknown;
};
type ChatRow = { id: string; role: "user" | "assistant"; content: string; created_at: string };
type ResidentialRow = {
  id: string;
  property_name: string | null;
  estimated_market_value?: number | null;
  potential_monthly_rent?: number | null;
  legal_ownership_status?: string | null;
  property_strategy: string | null;
};
type FinancialRow = {
  target_corpus?: unknown;
  current_accumulated?: unknown;
  monthly_sip_gap?: unknown;
  corrected_monthly_sip_gap?: unknown;
  sustainability?: unknown;
};

/* ---------------------- PEOPLE LOOKUP ---------------------- */
const peopleCache = new Map<string, Person>();
async function resolvePeople(ids: string[]): Promise<Map<string, Person>> {
  const missing = ids.filter((id) => id && !peopleCache.has(id));
  if (missing.length) {
    const { data } = await supabase.from("profiles").select("id,full_name,phone").in("id", missing);
    (data ?? []).forEach((r: PersonRow) => {
      peopleCache.set(r.id, {
        id: r.id,
        fullName: r.full_name,
        phone: r.phone,
        email: r.email ?? null,
        relation: r.relation ?? null,
      });
    });
  }
  return peopleCache;
}

export const dataService = {
  /* PLAN PROGRESS */
  async getPlanProgress(): Promise<Record<string, boolean>> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("plan_progress")
        .select("section, is_complete")
        .eq("user_id", user.id);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: { section: string; is_complete: boolean }) => [r.section, r.is_complete]));
    }, {} as Record<string, boolean>);
  },

  async markSectionComplete(section: string, complete = true): Promise<void> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase
        .from("plan_progress")
        .upsert(
          { user_id: user.id, section, is_complete: complete, updated_at: new Date().toISOString() },
          { onConflict: "user_id,section" }
        );
      if (error) throw error;
    }, undefined);
  },

  async refreshPlanProgress(): Promise<Record<string, boolean>> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const [
        child, parent, careCircle, plans, emergency,
        medications, disabilityDocs, insurance, financialAssets,
        legal, residential,
      ] = await Promise.all([
        this.getChildProfile(),
        this.getParentProfile(),
        this.listCareCircle(),
        this.listSuccessionPlans(),
        this.getEmergencyPlan(),
        this.listMedications(),
        this.listDisabilityDocuments(),
        this.listInsurancePolicies(),
        this.listFinancialAssets(),
        this.getLegalInfo(),
        this.listResidential(),
      ]);

      const sections = [
        { section: "child_profile",       is_complete: !!child?.name },
        { section: "parent_profile",      is_complete: !!parent },
        { section: "care_circle",         is_complete: (careCircle ?? []).length > 0 },
        { section: "succession",          is_complete: (plans ?? []).length > 0 },
        { section: "emergency",           is_complete: !!(emergency as EmergencyPlan | null)?.coordinatorName },
        { section: "medical",             is_complete: (medications ?? []).length > 0 },
        { section: "disability_documents",is_complete: (disabilityDocs ?? []).length > 0 },
        { section: "insurance",           is_complete: (insurance ?? []).length > 0 },
        { section: "financial",           is_complete: (financialAssets ?? []).length > 0 },
        { section: "legal",               is_complete: !!legal },
        { section: "residential",         is_complete: (residential ?? []).length > 0 },
      ];

      const { error } = await supabase
        .from("plan_progress")
        .upsert(
          sections.map(s => ({ user_id: user.id, ...s, updated_at: new Date().toISOString() })),
          { onConflict: "user_id,section" }
        );
      if (error) throw error;

      return Object.fromEntries(sections.map(s => [s.section, s.is_complete]));
    }, {} as Record<string, boolean>);
  },

  /* CARE CIRCLE */
  async listCareCircle(): Promise<CareCircleMember[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("care_circle")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toMember);
    }, []);
  },
  async createCareCircleMember(m: Omit<CareCircleMember, "id">) {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = { ...fromMember(m), user_id: user.id };      const { data, error } = await supabase.from("care_circle").insert(payload).select().maybeSingle();
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }      return toMember(data as CareRow);
    }, null as CareCircleMember | null);
  },
  async updateCareCircleMember(m: CareCircleMember) {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await supabase
        .from("care_circle")
        .update(fromMember(m))
        .eq("id", m.id)
        .eq("user_id", user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return toMember(data as CareRow);
    }, null as CareCircleMember | null);
  },
  async deleteCareCircleMember(id: string) {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("care_circle").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* VAULT */
  async listVaultDocuments(): Promise<VaultDocument[]> {
    return safe(async () => {
      const { data, error } = await pdb
        .from("digital_vault_documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: VaultRow) =>
        toVault({
          ...r,
          document_name: r.document_name ?? "Document",
          file_size_bytes: r.file_size_bytes ?? null,
          category: r.category ?? "Legal",
          verification_status: r.verification_status ?? "Pending Review",
          updated_at: r.updated_at ?? new Date().toISOString(),
        }),
      );
    }, []);
  },
  async setVaultCriticalForEmergency(id: string, value: boolean) {
    return safe(async () => {
      const { error } = await pdb
        .from("digital_vault_documents")
        .update({ is_critical_for_emergency: value })
        .eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* PEOPLE */
  async getPerson(id: string): Promise<Person | null> {
    if (!id) return null;
    const map = await resolvePeople([id]);
    return map.get(id) ?? null;
  },
  async listPeople(): Promise<Person[]> {
    return safe(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,phone")
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((r: PersonRow) => ({
        id: r.id,
        fullName: r.full_name,
        phone: r.phone,
        email: r.email ?? null,
        relation: r.relation ?? null,
      }));
    }, []);
  },

  /* NOMINATIONS */
  async listNominations(): Promise<Nomination[]> {
    return safe(async () => {
      const { data, error } = await supabase
        .from("nominations")
        .select("id,asset_ref,person_id,status");
      if (error) throw error;
      return (data ?? []).map((r: NominationRow) => ({
        id: r.id,
        assetRef: r.asset_ref,
        personId: r.person_id,
        status: r.status,
      }));
    }, []);
  },

  /* PRIORITIZED SUPPORT FEED (RPC) */
  async getPrioritizedSupportFeed(): Promise<SupportResource[]> {
    return safe(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      const { data, error } = await supabase.rpc("get_prioritized_support_feed", {
        user_id: user.id,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: SupportFeedRow, i: number) => ({
        id: String(r.id ?? r.pk ?? i),
        title: String(r.title ?? "Recommended action"),
        category: (r.category ?? "Community") as SupportResource["category"],
        description: String(r.description ?? ""),
        cta: String(r.cta ?? "Open"),
        priority: typeof r.priority === "number" ? r.priority : Number(r.priority) || 99,
        urgency: (r.urgency ??
          (Number(r.priority) <= 2 ? "URGENT" : "RECOMMENDED")) as SupportResource["urgency"],
        actionType: r.action_type ?? null,
        targetPk: r.target_pk != null ? String(r.target_pk) : r.pk != null ? String(r.pk) : null,
      }));
    }, []);
  },

  /* SUPPORT (static fallback) */
  async listSupportResources(): Promise<SupportResource[]> {
    const live = await this.getPrioritizedSupportFeed();
    if (live.length) return live;
    return wait<SupportResource[]>([
      {
        id: "r1",
        title: "Set up a Special Needs Trust",
        category: "Legal",
        description: "Step-by-step guide tailored to the Indian Trust Act, 1882.",
        cta: "Open Guide",
        priority: 1,
        urgency: "URGENT",
      },
      {
        id: "r2",
        title: "Apply for the UDID Card",
        category: "Legal",
        description: "Eligibility, documents required, and online application walkthrough.",
        cta: "Start Application",
        priority: 2,
        urgency: "URGENT",
      },
      {
        id: "r3",
        title: "LIC Jeevan Aadhar Calculator",
        category: "Financial",
        description: "Estimate the corpus needed to fund a lifetime of care.",
        cta: "Run Calculator",
        priority: 3,
        urgency: "RECOMMENDED",
      },
      {
        id: "r4",
        title: "Find an Occupational Therapist",
        category: "Therapy",
        description: "Verified directory of OTs near you.",
        cta: "Browse Therapists",
        priority: 4,
        urgency: "RECOMMENDED",
      },
      {
        id: "r5",
        title: "Parent Support Circles",
        category: "Community",
        description: "Join private moderated groups of parents on the same journey.",
        cta: "Join a Circle",
        priority: 5,
        urgency: "RECOMMENDED",
      },
      {
        id: "r6",
        title: "Talk to a Care Advisor",
        category: "Community",
        description: "30-minute confidential call with a LegacyNest expert.",
        cta: "Book a Slot",
        priority: 6,
        urgency: "RECOMMENDED",
      },
    ]);
  },

  /* EMERGENCY PLAN */
  async getEmergencyPlan(): Promise<EmergencyPlan | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("emergency_plan").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        coordinatorName: r.coordinator_name as string | undefined,
        coordinatorPhone: r.coordinator_phone as string | undefined,
        coordinatorRelationship: r.coordinator_relationship as string | undefined,
        backupCoordinatorName: r.backup_coordinator_name as string | undefined,
        backupCoordinatorPhone: r.backup_coordinator_phone as string | undefined,
        activationStatus: (r.activation_status as EmergencyPlan["activationStatus"]) ?? "Standby",
        activatedAt: r.activated_at as string | null,
        activatedBy: r.activated_by as string | null,
        breakGlassInstructions: r.break_glass_instructions as string | undefined,
        financialBridgeNotes: r.financial_bridge_notes as string | undefined,
      };
    }, null);
  },
  async saveEmergencyPlan(p: Partial<EmergencyPlan>): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
      if (p.coordinatorName !== undefined)         patch.coordinator_name = p.coordinatorName;
      if (p.coordinatorPhone !== undefined)        patch.coordinator_phone = p.coordinatorPhone;
      if (p.coordinatorRelationship !== undefined) patch.coordinator_relationship = p.coordinatorRelationship;
      if (p.backupCoordinatorName !== undefined)   patch.backup_coordinator_name = p.backupCoordinatorName;
      if (p.backupCoordinatorPhone !== undefined)  patch.backup_coordinator_phone = p.backupCoordinatorPhone;
      if (p.activationStatus !== undefined)        patch.activation_status = p.activationStatus;
      if (p.activatedAt !== undefined)             patch.activated_at = p.activatedAt;
      if (p.activatedBy !== undefined)             patch.activated_by = p.activatedBy;
      if (p.breakGlassInstructions !== undefined)  patch.break_glass_instructions = p.breakGlassInstructions;
      if (p.financialBridgeNotes !== undefined)    patch.financial_bridge_notes = p.financialBridgeNotes;
      const { error } = await pdb.from("emergency_plan").upsert(patch, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* BREAK-GLASS BLOCKS (4 info summaries) + per-domain caregiver members */
  async getBreakGlassBlocks(): Promise<Record<BreakGlassBlock, string>> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {} as Record<BreakGlassBlock, string>;
      const { data } = await pdb.from("emergency_plan").select("break_glass").eq("user_id", user.id).maybeSingle();
      return ((data as { break_glass?: Record<BreakGlassBlock, string> } | null)?.break_glass ?? {}) as Record<BreakGlassBlock, string>;
    }, {} as Record<BreakGlassBlock, string>);
  },
  async saveBreakGlassBlocks(blocks: Record<BreakGlassBlock, string>): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("emergency_plan")
        .upsert({ user_id: user.id, break_glass: blocks, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },
  async getBreakGlassFiles(): Promise<Record<BreakGlassBlock, string[]>> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {} as Record<BreakGlassBlock, string[]>;
      const { data } = await pdb.from("emergency_plan").select("break_glass_files").eq("user_id", user.id).maybeSingle();
      return ((data as { break_glass_files?: Record<BreakGlassBlock, string[]> } | null)?.break_glass_files ?? {}) as Record<BreakGlassBlock, string[]>;
    }, {} as Record<BreakGlassBlock, string[]>);
  },
  async saveBreakGlassFiles(files: Record<BreakGlassBlock, string[]>): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("emergency_plan")
        .upsert({ user_id: user.id, break_glass_files: files, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },
  async listBreakGlassMembers(): Promise<BreakGlassMember[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("break_glass_members")
        .select("*").eq("user_id", user.id).order("block").order("rank");
      if (error) throw error;
      return (data ?? []).map(toBreakGlassMember);
    }, []);
  },
  async upsertBreakGlassMember(m: {
    block: BreakGlassBlock; rank: "primary" | "backup"; name: string; email: string; phone?: string; relationship?: string;
  }): Promise<BreakGlassMember | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from("break_glass_members")
        .upsert({
          user_id: user.id, block: m.block, rank: m.rank,
          name: m.name || null, email: m.email,
          phone: m.phone || null, relationship: m.relationship || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,block,rank" })
        .select().maybeSingle();
      if (error) throw error;
      return data ? toBreakGlassMember(data as Record<string, unknown>) : null;
    }, null);
  },
  async deleteBreakGlassMember(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await supabase.from("break_glass_members").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async sendBreakGlassInvite(member: BreakGlassMember, ctx: { inviterName: string; childName: string }): Promise<boolean> {
    return safe(async () => {
      if (!member.accessToken) throw new Error("Invite link not ready — save the member first.");
      const acceptUrl = `${window.location.origin}/accept/${member.accessToken}`;
      const { error } = await supabase.functions.invoke("send-break-glass-invite", {
        body: {
          to: member.email, memberName: member.name, block: member.block, rank: member.rank,
          acceptUrl, inviterName: ctx.inviterName, childName: ctx.childName,
        },
      });
      if (error) throw error;
      await supabase.from("break_glass_members")
        .update({ status: "invited", invited_at: new Date().toISOString() })
        .eq("id", member.id);
      return true;
    }, false);
  },

  /* EMERGENCY INSTITUTIONS (checklist) */
  async listEmergencyInstitutions(): Promise<EmergencyInstitution[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("emergency_institutions").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, orgName: r.org_name as string,
        contact: r.contact as string | undefined, whatToTell: r.what_to_tell as string | undefined,
        isNotified: Boolean(r.is_notified),
      }));
    }, []);
  },
  async addEmergencyInstitution(inst: Omit<EmergencyInstitution, "id">): Promise<EmergencyInstitution | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("emergency_institutions").insert({
        user_id: user.id, org_name: inst.orgName, contact: inst.contact ?? null,
        what_to_tell: inst.whatToTell ?? null, is_notified: inst.isNotified,
      }).select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return { id: r.id as string, orgName: r.org_name as string, contact: r.contact as string | undefined,
        whatToTell: r.what_to_tell as string | undefined, isNotified: Boolean(r.is_notified) };
    }, null);
  },
  async toggleEmergencyInstitution(id: string, notified: boolean): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("emergency_institutions").update({ is_notified: notified }).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async deleteEmergencyInstitution(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("emergency_institutions").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* EMERGENCY BRIEF — aggregated read-only view over existing data */
  async getEmergencyBrief(): Promise<EmergencyBrief> {
    const [child, careMembers, medications, contacts, residentialOpts, guardianship, poa] = await Promise.all([
      this.getChildProfile(),
      this.listCareCircle(),
      this.listMedications(),
      this.listHealthContacts(),
      this.listResidentialOptions(),
      this.getLegalGuardianship(),
      this.getLegalPoa(),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeMeds = (medications ?? []).filter(m => !m.tillDate || new Date(m.tillDate) >= today);
    const emergencyContacts = (careMembers ?? [])
      .filter(m => m.isEmergencyContact)
      .map(m => ({ name: m.name, role: m.role, relation: m.relation, phone: m.phone, email: m.email }));
    const tonight = (residentialOpts ?? []).find(o => o.successionRank === "Emergency");

    return {
      childName: child?.name ?? "Your child",
      bloodGroup: child?.bloodGroup ?? "",
      allergies: child?.allergies ?? "",
      emergencyMedicalInfo: child?.emergencyMedicalInfo ?? "",
      behavioralTriggers: child?.behavioralTriggers ?? "",
      comfortItems: child?.comfortItems ?? "",
      medications: activeMeds.map(m => ({ name: m.name, dose: m.dose, frequency: m.frequency })),
      doctors: (contacts ?? []).map(c => ({ name: c.name, role: c.role, phone: c.phone, facility: c.facility })),
      emergencyContacts,
      tonightResidence: tonight ? {
        name: tonight.name, optionType: tonight.optionType, city: tonight.city,
        caregiverName: tonight.caregiverName, caregiverPhone: tonight.caregiverPhone,
        hasConsent: tonight.hasConsent, hasKeysAccess: tonight.hasKeysAccess,
      } : undefined,
      guardianshipStatus: guardianship?.guardianshipStatus,
      poaInPlace: poa?.hasPoa,
    };
  },

  /* AI ADVISOR CHAT */
  async listAdvisorChat(): Promise<AdvisorChatLog[]> {
    return safe(async () => {
      const { data, error } = await supabase
        .from("advisor_chat_logs")
        .select("id,role,content,created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: ChatRow) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        createdAt: r.created_at,
      }));
    }, []);
  },
  async appendAdvisorChat(role: "user" | "assistant", content: string) {
    return safe(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("advisor_chat_logs").insert({
        role,
        content,
        user_id: user?.id,
      });
      if (error) throw error;
      return true;
    }, false);
  },

  /* RESIDENTIAL — legacy stub for refreshPlanProgress */
  async listResidential(): Promise<ResidentialProperty[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("residential_options").select("id").eq("user_id", user.id).limit(1);
      if (error) throw error;
      return (data ?? []).map((r: { id: string }) => ({
        id: r.id, name: "", address: "", legalStatus: "", accessibility: "",
      }));
    }, []);
  },
  async setPropertyStrategy(id: string, strategy: ResidentialProperty["propertyStrategy"]) {
    return safe(async () => {
      const { error } = await pdb.from("residential_options").update({ property_strategy: strategy }).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* RESIDENTIAL OPTIONS (full plan) */
  async listResidentialOptions(): Promise<ResidentialOption[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("residential_options").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, userId: r.user_id as string,
        name: r.name as string,
        optionType: (r.option_type as ResidentialOption["optionType"]) ?? "Other",
        address: r.address as string | undefined,
        city: r.city as string | undefined,
        monthlyCost: r.monthly_cost != null ? Number(r.monthly_cost) : undefined,
        caregiverName: r.caregiver_name as string | undefined,
        caregiverPhone: r.caregiver_phone as string | undefined,
        successionRank: r.succession_rank as ResidentialOption["successionRank"],
        isCurrentHome: Boolean(r.is_current_home),
        propertyStrategy: r.property_strategy as ResidentialOption["propertyStrategy"],
        legalStatus: r.legal_status as string | undefined,
        accessibilityNotes: r.accessibility_notes as string | undefined,
        waitlistStatus: (r.waitlist_status as ResidentialOption["waitlistStatus"]) ?? "Not Applied",
        appliedDate: r.applied_date as string | undefined,
        expectedWaitYears: r.expected_wait_years != null ? Number(r.expected_wait_years) : undefined,
        suitabilityRating: r.suitability_rating != null ? Number(r.suitability_rating) : undefined,
        pros: r.pros as string | undefined,
        cons: r.cons as string | undefined,
        hasConsent: Boolean(r.has_consent),
        hasKeysAccess: Boolean(r.has_keys_access),
        notes: r.notes as string | undefined,
      }));
    }, []);
  },
  async addResidentialOption(opt: Omit<ResidentialOption, "id" | "userId">): Promise<ResidentialOption | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("residential_options").insert({
        user_id: user.id, name: opt.name, option_type: opt.optionType,
        address: opt.address ?? null, city: opt.city ?? null,
        monthly_cost: opt.monthlyCost ?? null,
        caregiver_name: opt.caregiverName ?? null, caregiver_phone: opt.caregiverPhone ?? null,
        succession_rank: opt.successionRank ?? null, is_current_home: opt.isCurrentHome,
        property_strategy: opt.propertyStrategy ?? null, legal_status: opt.legalStatus ?? null,
        accessibility_notes: opt.accessibilityNotes ?? null,
        waitlist_status: opt.waitlistStatus ?? "Not Applied",
        applied_date: opt.appliedDate ?? null, expected_wait_years: opt.expectedWaitYears ?? null,
        suitability_rating: opt.suitabilityRating ?? null,
        pros: opt.pros ?? null, cons: opt.cons ?? null,
        has_consent: opt.hasConsent, has_keys_access: opt.hasKeysAccess,
        notes: opt.notes ?? null, updated_at: new Date().toISOString(),
      }).select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return { id: r.id as string, userId: r.user_id as string, name: r.name as string,
        optionType: r.option_type as ResidentialOption["optionType"],
        isCurrentHome: Boolean(r.is_current_home), hasConsent: Boolean(r.has_consent),
        hasKeysAccess: Boolean(r.has_keys_access),
        waitlistStatus: (r.waitlist_status as ResidentialOption["waitlistStatus"]) ?? "Not Applied",
      };
    }, null);
  },
  async updateResidentialOption(id: string, opt: Partial<Omit<ResidentialOption, "id" | "userId">>): Promise<boolean> {
    return safe(async () => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (opt.name !== undefined)              patch.name = opt.name;
      if (opt.optionType !== undefined)        patch.option_type = opt.optionType;
      if (opt.address !== undefined)           patch.address = opt.address;
      if (opt.city !== undefined)              patch.city = opt.city;
      if (opt.monthlyCost !== undefined)       patch.monthly_cost = opt.monthlyCost;
      if (opt.caregiverName !== undefined)     patch.caregiver_name = opt.caregiverName;
      if (opt.caregiverPhone !== undefined)    patch.caregiver_phone = opt.caregiverPhone;
      if (opt.successionRank !== undefined)    patch.succession_rank = opt.successionRank;
      if (opt.isCurrentHome !== undefined)     patch.is_current_home = opt.isCurrentHome;
      if (opt.propertyStrategy !== undefined)  patch.property_strategy = opt.propertyStrategy;
      if (opt.legalStatus !== undefined)       patch.legal_status = opt.legalStatus;
      if (opt.accessibilityNotes !== undefined) patch.accessibility_notes = opt.accessibilityNotes;
      if (opt.waitlistStatus !== undefined)    patch.waitlist_status = opt.waitlistStatus;
      if (opt.appliedDate !== undefined)       patch.applied_date = opt.appliedDate;
      if (opt.expectedWaitYears !== undefined) patch.expected_wait_years = opt.expectedWaitYears;
      if (opt.suitabilityRating !== undefined) patch.suitability_rating = opt.suitabilityRating;
      if (opt.pros !== undefined)              patch.pros = opt.pros;
      if (opt.cons !== undefined)              patch.cons = opt.cons;
      if (opt.hasConsent !== undefined)        patch.has_consent = opt.hasConsent;
      if (opt.hasKeysAccess !== undefined)     patch.has_keys_access = opt.hasKeysAccess;
      if (opt.notes !== undefined)             patch.notes = opt.notes;
      const { error } = await pdb.from("residential_options").update(patch).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async deleteResidentialOption(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("residential_options").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* RESIDENTIAL CHECKLIST */
  async listResidentialChecklist(optionId?: string): Promise<ResidentialChecklistItem[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let q = pdb.from("residential_checklist").select("*").eq("user_id", user.id);
      if (optionId) q = q.eq("option_id", optionId);
      else q = q.is("option_id", null);
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, userId: r.user_id as string,
        optionId: r.option_id as string | undefined,
        item: r.item as string,
        category: r.category as ResidentialChecklistItem["category"],
        isDone: Boolean(r.is_done), notes: r.notes as string | undefined,
      }));
    }, []);
  },
  async addResidentialChecklistItem(item: Omit<ResidentialChecklistItem, "id" | "userId">): Promise<ResidentialChecklistItem | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("residential_checklist").insert({
        user_id: user.id, item: item.item, category: item.category,
        option_id: item.optionId ?? null, is_done: item.isDone, notes: item.notes ?? null,
      }).select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return { id: r.id as string, userId: r.user_id as string, item: r.item as string,
        category: r.category as ResidentialChecklistItem["category"], isDone: Boolean(r.is_done) };
    }, null);
  },
  async toggleResidentialChecklistItem(id: string, done: boolean): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("residential_checklist").update({ is_done: done }).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async deleteResidentialChecklistItem(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("residential_checklist").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* LETTER OF INTENT */
  async getResidentialLetterOfIntent(): Promise<ResidentialLetterOfIntent | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("residential_letter_of_intent").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        dailyRoutine: r.daily_routine as string | undefined,
        comfortItems: r.comfort_items as string | undefined,
        foodPreferences: r.food_preferences as string | undefined,
        sleepRoutine: r.sleep_routine as string | undefined,
        sensoryNeeds: r.sensory_needs as string | undefined,
        socialNeeds: r.social_needs as string | undefined,
        communicationNotes: r.communication_notes as string | undefined,
        importantRelationships: r.important_relationships as string | undefined,
        transitionNotes: r.transition_notes as string | undefined,
      };
    }, null);
  },
  async saveResidentialLetterOfIntent(loi: Omit<ResidentialLetterOfIntent, "id" | "userId">): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("residential_letter_of_intent").upsert({
        user_id: user.id,
        daily_routine: loi.dailyRoutine ?? null, comfort_items: loi.comfortItems ?? null,
        food_preferences: loi.foodPreferences ?? null, sleep_routine: loi.sleepRoutine ?? null,
        sensory_needs: loi.sensoryNeeds ?? null, social_needs: loi.socialNeeds ?? null,
        communication_notes: loi.communicationNotes ?? null,
        important_relationships: loi.importantRelationships ?? null,
        transition_notes: loi.transitionNotes ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* FINANCIAL BLUEPRINT (RPC) */
  async getFinancialBlueprint(): Promise<FinancialBlueprint | null> {
    return safe(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.rpc("calculate_interactive_financial_blueprint", {
        user_id: user.id,
      });
      if (error) throw error;
      const r: FinancialRow | undefined = Array.isArray(data) ? data[0] : data;
      if (!r) return null;
      return {
        targetCorpus: Number(r.target_corpus ?? 0),
        currentAccumulated: Number(r.current_accumulated ?? 0),
        monthlySipGap: Number(r.monthly_sip_gap ?? r.corrected_monthly_sip_gap ?? 0),
        sustainability: Number(r.sustainability ?? 0),
      };
    }, null);
  },
  async saveFinancialPreferences(prefs: Record<string, number>) {
    return safe(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from("financial_planning_preferences")
        .upsert(
          {
            user_id: user.id,
            inflation_expectation: prefs.inflation_rate ?? 0,
            parent_milestone_age_for_extra_care: prefs.assist_age ?? 0,
            estimated_future_caregiver_monthly_cost:
              prefs.parent1_age && prefs.parent2_age && prefs.child_age
                ? Math.round((prefs.parent1_age + prefs.parent2_age + prefs.child_age) / 3)
                : 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      return true;
    }, false);
  },

  async triggerSystemActionItems() {
    return safe(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.rpc("generate_system_action_items", {
        user_id: user.id,
      });
      if (error) throw error;
      return data;
    }, null);
  },

  /* MEDICATIONS */
  async listMedications(): Promise<Medication[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("medications").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: { id: string; name: string; dose: string | null; frequency: string | null; till_date: string | null; notes: string | null }) => ({
        id: r.id, name: r.name, dose: r.dose ?? "", frequency: r.frequency ?? "", tillDate: r.till_date ?? "", notes: r.notes ?? "",
      }));
    }, []);
  },
  async createMedication(m: Omit<Medication, "id">): Promise<Medication | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("medications")
        .insert({ user_id: user.id, name: m.name, dose: m.dose, frequency: m.frequency, till_date: m.tillDate, notes: m.notes })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; dose: string | null; frequency: string | null; till_date: string | null; notes: string | null };
      return { id: r.id, name: r.name, dose: r.dose ?? "", frequency: r.frequency ?? "", tillDate: r.till_date ?? "", notes: r.notes ?? "" };
    }, null);
  },
  async updateMedication(m: Medication): Promise<Medication | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("medications")
        .update({ name: m.name, dose: m.dose, frequency: m.frequency, till_date: m.tillDate, notes: m.notes })
        .eq("id", m.id).eq("user_id", user.id).select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; dose: string | null; frequency: string | null; till_date: string | null; notes: string | null };
      return { id: r.id, name: r.name, dose: r.dose ?? "", frequency: r.frequency ?? "", tillDate: r.till_date ?? "", notes: r.notes ?? "" };
    }, null);
  },
  async deleteMedication(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("medications").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* HEALTH CONTACTS */
  async listHealthContacts(): Promise<HealthContact[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("health_contacts").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: { id: string; name: string; role: string | null; facility: string | null; phone: string | null; is_primary: boolean | null; initials: string | null }) => ({
        id: r.id, name: r.name, role: r.role ?? "", facility: r.facility ?? "",
        phone: r.phone ?? "", isPrimary: !!r.is_primary, initials: r.initials ?? r.name.slice(0, 2).toUpperCase(),
      }));
    }, []);
  },
  async createHealthContact(c: Omit<HealthContact, "id">): Promise<HealthContact | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("health_contacts")
        .insert({ user_id: user.id, name: c.name, role: c.role, facility: c.facility, phone: c.phone, is_primary: c.isPrimary, initials: c.initials })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; role: string | null; facility: string | null; phone: string | null; is_primary: boolean | null; initials: string | null };
      return { id: r.id, name: r.name, role: r.role ?? "", facility: r.facility ?? "", phone: r.phone ?? "", isPrimary: !!r.is_primary, initials: r.initials ?? c.initials };
    }, null);
  },
  async updateHealthContact(c: HealthContact): Promise<HealthContact | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("health_contacts")
        .update({ name: c.name, role: c.role, facility: c.facility, phone: c.phone, is_primary: c.isPrimary, initials: c.initials })
        .eq("id", c.id).select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; role: string | null; facility: string | null; phone: string | null; is_primary: boolean | null; initials: string | null };
      return { id: r.id, name: r.name, role: r.role ?? "", facility: r.facility ?? "", phone: r.phone ?? "", isPrimary: !!r.is_primary, initials: r.initials ?? c.initials };
    }, null);
  },
  async deleteHealthContact(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("health_contacts").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* THERAPIES */
  async listTherapies(): Promise<Therapy[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("therapies").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: { id: string; name: string; specialty: string | null; therapist_name: string | null; therapist_role: string | null; next_session: string | null; status: string | null }) => ({
        id: r.id, name: r.name, specialty: r.specialty ?? "", therapistName: r.therapist_name ?? "",
        therapistRole: r.therapist_role ?? "", nextSession: r.next_session ?? "",
        status: r.status as Therapy["status"] ?? undefined,
      }));
    }, []);
  },
  async createTherapy(t: Omit<Therapy, "id">): Promise<Therapy | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("therapies")
        .insert({ user_id: user.id, name: t.name, specialty: t.specialty, therapist_name: t.therapistName, therapist_role: t.therapistRole, next_session: t.nextSession, status: t.status ?? null })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; specialty: string | null; therapist_name: string | null; therapist_role: string | null; next_session: string | null };
      return { id: r.id, name: r.name, specialty: r.specialty ?? "", therapistName: r.therapist_name ?? "", therapistRole: r.therapist_role ?? "", nextSession: r.next_session ?? "" };
    }, null);
  },
  async updateTherapy(t: Therapy): Promise<Therapy | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("therapies")
        .update({ name: t.name, specialty: t.specialty, therapist_name: t.therapistName, therapist_role: t.therapistRole, next_session: t.nextSession, status: t.status ?? null })
        .eq("id", t.id).select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; name: string; specialty: string | null; therapist_name: string | null; therapist_role: string | null; next_session: string | null };
      return { id: r.id, name: r.name, specialty: r.specialty ?? "", therapistName: r.therapist_name ?? "", therapistRole: r.therapist_role ?? "", nextSession: r.next_session ?? "" };
    }, null);
  },
  async deleteTherapy(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("therapies").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* MEDICAL RECORDS */
  async listMedicalRecords(): Promise<MedicalRecord[]> {
    return safe(async () => {
      const { data, error } = await pdb.from("medical_records").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: { id: string; title: string; category: string | null; doctor: string | null; record_date: string | null; next_appointment: string | null; status: string | null }) => ({
        id: r.id, title: r.title, category: r.category ?? "", doctor: r.doctor ?? "", recordDate: r.record_date ?? "", nextAppointment: r.next_appointment ?? "", status: r.status as "done" | "not_done" | undefined,
      }));
    }, []);
  },
  async createMedicalRecord(rec: Omit<MedicalRecord, "id">): Promise<MedicalRecord | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("medical_records")
        .insert({ user_id: user.id, title: rec.title, category: rec.category, doctor: rec.doctor, record_date: rec.recordDate, next_appointment: rec.nextAppointment, status: rec.status })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; title: string; category: string | null; doctor: string | null; record_date: string | null; next_appointment: string | null; status: string | null };
      return { id: r.id, title: r.title, category: r.category ?? "", doctor: r.doctor ?? "", recordDate: r.record_date ?? "", nextAppointment: r.next_appointment ?? "", status: r.status as "done" | "not_done" | undefined };
    }, null);
  },
  async updateMedicalRecord(rec: MedicalRecord): Promise<MedicalRecord | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await pdb.from("medical_records")
        .update({ title: rec.title, category: rec.category, doctor: rec.doctor, record_date: rec.recordDate, next_appointment: rec.nextAppointment, status: rec.status })
        .eq("id", rec.id)
        .eq("user_id", user.id)
        .select().maybeSingle();
      if (error) throw error;
      const r = data as { id: string; title: string; category: string | null; doctor: string | null; record_date: string | null; next_appointment: string | null; status: string | null };
      return { id: r.id, title: r.title, category: r.category ?? "", doctor: r.doctor ?? "", recordDate: r.record_date ?? "", nextAppointment: r.next_appointment ?? "", status: r.status as "done" | "not_done" | undefined };
    }, null);
  },
  async deleteMedicalRecord(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("medical_records").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* LEGAL INFO — legacy stub for refreshPlanProgress */
  async getLegalInfo(): Promise<LegalInfo | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("legal_will").select("will_status").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      return { primaryExecutor: "", alternateExecutor: "", willStatus: (data as Record<string,string>).will_status ?? "",
        trustStatus: "", guardianName: "", courtOrderRef: "", beneficiaryName: "", trustType: "" };
    }, null);
  },
  async saveLegalInfo(_info: LegalInfo): Promise<boolean> { return true; },

  /* LEGAL WILL */
  async getLegalWill(): Promise<LegalWill | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("legal_will").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        willStatus: (r.will_status as LegalWill["willStatus"]) ?? "Not Started",
        primaryExecutorName: r.primary_executor_name as string | undefined,
        primaryExecutorPhone: r.primary_executor_phone as string | undefined,
        primaryExecutorEmail: r.primary_executor_email as string | undefined,
        alternateExecutorName: r.alternate_executor_name as string | undefined,
        alternateExecutorPhone: r.alternate_executor_phone as string | undefined,
        alternateExecutorEmail: r.alternate_executor_email as string | undefined,
        lawyerName: r.lawyer_name as string | undefined,
        lawyerFirm: r.lawyer_firm as string | undefined,
        lawyerPhone: r.lawyer_phone as string | undefined,
        lastUpdatedDate: r.last_updated_date as string | undefined,
        vaultDocumentRef: r.vault_document_ref as string | undefined,
        notes: r.notes as string | undefined,
      };
    }, null);
  },
  async saveLegalWill(w: LegalWill): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("legal_will").upsert({
        user_id: user.id, will_status: w.willStatus,
        primary_executor_name: w.primaryExecutorName ?? null, primary_executor_phone: w.primaryExecutorPhone ?? null, primary_executor_email: w.primaryExecutorEmail ?? null,
        alternate_executor_name: w.alternateExecutorName ?? null, alternate_executor_phone: w.alternateExecutorPhone ?? null, alternate_executor_email: w.alternateExecutorEmail ?? null,
        lawyer_name: w.lawyerName ?? null, lawyer_firm: w.lawyerFirm ?? null, lawyer_phone: w.lawyerPhone ?? null,
        last_updated_date: w.lastUpdatedDate ?? null, vault_document_ref: w.vaultDocumentRef ?? null,
        notes: w.notes ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* LEGAL TRUST */
  async getLegalTrust(): Promise<LegalTrust | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("legal_trust").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        trustName: r.trust_name as string | undefined, trustType: r.trust_type as LegalTrust["trustType"],
        trustStatus: (r.trust_status as LegalTrust["trustStatus"]) ?? "Not Created",
        registrationNumber: r.registration_number as string | undefined, registrationDate: r.registration_date as string | undefined,
        beneficiaryName: r.beneficiary_name as string | undefined, panNumber: r.pan_number as string | undefined,
        managingTrusteeName: r.managing_trustee_name as string | undefined, managingTrusteePhone: r.managing_trustee_phone as string | undefined,
        coTrusteeName: r.co_trustee_name as string | undefined, coTrusteePhone: r.co_trustee_phone as string | undefined,
        successorTrusteeName: r.successor_trustee_name as string | undefined, successorTrusteePhone: r.successor_trustee_phone as string | undefined,
        annualCorpusTarget: r.annual_corpus_target != null ? Number(r.annual_corpus_target) : undefined,
        vaultDocumentRef: r.vault_document_ref as string | undefined, notes: r.notes as string | undefined,
      };
    }, null);
  },
  async saveLegalTrust(t: LegalTrust): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("legal_trust").upsert({
        user_id: user.id, trust_name: t.trustName ?? null, trust_type: t.trustType ?? null, trust_status: t.trustStatus,
        registration_number: t.registrationNumber ?? null, registration_date: t.registrationDate ?? null,
        beneficiary_name: t.beneficiaryName ?? null, pan_number: t.panNumber ?? null,
        managing_trustee_name: t.managingTrusteeName ?? null, managing_trustee_phone: t.managingTrusteePhone ?? null,
        co_trustee_name: t.coTrusteeName ?? null, co_trustee_phone: t.coTrusteePhone ?? null,
        successor_trustee_name: t.successorTrusteeName ?? null, successor_trustee_phone: t.successorTrusteePhone ?? null,
        annual_corpus_target: t.annualCorpusTarget ?? null, vault_document_ref: t.vaultDocumentRef ?? null,
        notes: t.notes ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* LEGAL GUARDIANSHIP */
  async getLegalGuardianship(): Promise<LegalGuardianship | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("legal_guardianship").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        guardianshipStatus: (r.guardianship_status as LegalGuardianship["guardianshipStatus"]) ?? "Not Initiated",
        guardianName: r.guardian_name as string | undefined, guardianPhone: r.guardian_phone as string | undefined,
        guardianRelationship: r.guardian_relationship as string | undefined,
        guardianshipType: r.guardianship_type as LegalGuardianship["guardianshipType"],
        courtOrderRef: r.court_order_ref as string | undefined, courtOrderDate: r.court_order_date as string | undefined,
        appointingCourt: r.appointing_court as string | undefined, nextRenewalDate: r.next_renewal_date as string | undefined,
        vaultDocumentRef: r.vault_document_ref as string | undefined, notes: r.notes as string | undefined,
      };
    }, null);
  },
  async saveLegalGuardianship(g: LegalGuardianship): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("legal_guardianship").upsert({
        user_id: user.id, guardianship_status: g.guardianshipStatus,
        guardian_name: g.guardianName ?? null, guardian_phone: g.guardianPhone ?? null,
        guardian_relationship: g.guardianRelationship ?? null, guardianship_type: g.guardianshipType ?? null,
        court_order_ref: g.courtOrderRef ?? null, court_order_date: g.courtOrderDate ?? null,
        appointing_court: g.appointingCourt ?? null, next_renewal_date: g.nextRenewalDate ?? null,
        vault_document_ref: g.vaultDocumentRef ?? null, notes: g.notes ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* LEGAL POA */
  async getLegalPoa(): Promise<LegalPoa | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("legal_poa").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        hasPoa: Boolean(r.has_poa), holderName: r.holder_name as string | undefined,
        holderPhone: r.holder_phone as string | undefined, poaScope: r.poa_scope as LegalPoa["poaScope"],
        executionDate: r.execution_date as string | undefined, expiryDate: r.expiry_date as string | undefined,
        vaultDocumentRef: r.vault_document_ref as string | undefined, notes: r.notes as string | undefined,
      };
    }, null);
  },
  async saveLegalPoa(p: LegalPoa): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("legal_poa").upsert({
        user_id: user.id, has_poa: p.hasPoa,
        holder_name: p.holderName ?? null, holder_phone: p.holderPhone ?? null,
        poa_scope: p.poaScope ?? null, execution_date: p.executionDate ?? null,
        expiry_date: p.expiryDate ?? null, vault_document_ref: p.vaultDocumentRef ?? null,
        notes: p.notes ?? null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* PROFILE IMAGES — public schema */
  async getProfileImage(entityType: string, entityId: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profile_images")
        .select("image_data")
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) { console.warn("[getProfileImage]", error.message); return null; }
      return data ? (data as { image_data: string }).image_data : null;
    } catch (e) {
      console.warn("[getProfileImage]", e);
      return null;
    }
  },

  async saveProfileImage(entityType: string, entityId: string, dataUrl: string, sizeBytes: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("profile_images")
      .upsert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        image_data: dataUrl,
        size_bytes: sizeBytes,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,entity_type,entity_id" });
    if (error) {
      console.error("[saveProfileImage]", error.code, error.message);
      throw new Error(error.message);
    }
    return true;
  },

  async deleteProfileImage(entityType: string, entityId: string): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from("profile_images")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) throw error;
      return true;
    }, false);
  },

  /* PROFILE UPDATE — updates phone only in protected.parent_profile.
     full_name is NEVER touched here — it belongs to saveParentProfile. */
  async updateProfile(_displayName: string, phone?: string): Promise<boolean> {
    if (!phone) return true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    // Use UPDATE (not upsert) to avoid NOT NULL violation on full_name
    // when a parent_profile row doesn't exist yet.
    const { error } = await pdb.from("parent_profile")
      .update({ phone })
      .eq("user_id", user.id);
    if (error) {
      console.error("[updateProfile]", error.message);
      throw new Error(error.message);
    }
    return true;
  },

  /* VAULT DOCUMENT - add metadata */
  async addVaultDocument(doc: { name: string; category: VaultDocument["category"]; notes?: string; size?: number; status?: string; isCriticalForEmergency?: boolean; medicalRecordId?: string; therapyId?: string; storageBucketPath?: string }): Promise<VaultDocument | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await pdb.from("digital_vault_documents")
        .insert({
          user_id: user.id,
          child_id: null,
          document_name: doc.name,
          category: doc.category,
          notes: doc.notes ?? null,
          verification_status: doc.status ?? "Pending Review",
          file_size_bytes: doc.size,
          document_size: doc.size,
          is_critical_for_emergency: doc.isCriticalForEmergency ?? false,
          medical_record_id: doc.medicalRecordId ?? null,
          therapy_id: doc.therapyId ?? null,
          storage_bucket_path: doc.storageBucketPath ?? null,
          updated_at: new Date().toISOString(),
        })
        .select().maybeSingle();
      if (error) throw error;
      return toVault({ ...(data as VaultRow), document_name: (data as VaultRow).document_name ?? doc.name });
    }, null);
  },
  async updateVaultDocument(id: string, patch: { name?: string; category?: VaultDocument["category"]; status?: VaultDocument["status"]; notes?: string }): Promise<boolean> {
    return safe(async () => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) update.document_name = patch.name;
      if (patch.category !== undefined) update.category = patch.category;
      if (patch.status !== undefined) update.verification_status = patch.status;
      if (patch.notes !== undefined) update.notes = patch.notes;
      const { error } = await pdb.from("digital_vault_documents").update(update).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  async deleteVaultDocument(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("digital_vault_documents").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  async getVaultFileSignedUrl(storagePath: string): Promise<string | null> {
    return safe(async () => {
      const cleanPath = storagePath.replace(/^vault-documents\//, "");      const { data, error } = await supabase.storage
        .from("vault-documents")
        .createSignedUrl(cleanPath, 60 * 60);
      if (error) { console.error("[vault] signed URL error:", error); throw error; }
      return data.signedUrl;
    }, null);
  },

  /* PARENT PROFILE */
  async getParentProfile(): Promise<ParentProfile | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await pdb.from("parent_profile").select("*").eq("user_id", user.id).maybeSingle();
      if (error && error.code === "PGRST116") return null;
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        fullName: data.full_name,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        relationshipToChild: data.relationship_to_child,
        occupation: data.occupation,
        healthStatus: data.health_status,
        notes: data.notes,
      };
    }, null);
  },
  async saveParentProfile(profile: Omit<ParentProfile, "id" | "userId">): Promise<ParentProfile | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const payload = {
        user_id: user.id,
        full_name: profile.fullName,
        phone: profile.phone || null,
        date_of_birth: profile.dateOfBirth || null,
        relationship_to_child: profile.relationshipToChild || null,
        occupation: profile.occupation || null,
        health_status: profile.healthStatus || null,
        notes: profile.notes || null,
      };

      const { data, error } = await pdb.from("parent_profile")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        fullName: data.full_name,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        relationshipToChild: data.relationship_to_child,
        occupation: data.occupation,
        healthStatus: data.health_status,
        notes: data.notes,
      };
    }, null);
  },

  /* DISABILITY DOCUMENTS */
  async listDisabilityDocuments(): Promise<DisabilityDocument[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("disability_documents").select("*").eq("user_id", user.id);
      if (error) throw error;
      return data as DisabilityDocument[];
    }, []);
  },
  async addDisabilityDocument(doc: Omit<DisabilityDocument, "id" | "userId">): Promise<DisabilityDocument | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("disability_documents")
        .insert({ user_id: user.id, ...doc })
        .select().maybeSingle();
      if (error) throw error;
      return data as DisabilityDocument;
    }, null);
  },
  async updateDisabilityDocument(id: string, doc: Partial<Omit<DisabilityDocument, "id" | "userId">>): Promise<DisabilityDocument | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("disability_documents")
        .update(doc)
        .eq("id", id)
        .select().maybeSingle();
      if (error) throw error;
      return data as DisabilityDocument;
    }, null);
  },
  async deleteDisabilityDocument(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("disability_documents").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* FINANCIAL ASSETS */
  async listFinancialAssets(): Promise<FinancialAsset[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb
        .from("financial_assets").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        userId: r.user_id as string,
        assetName: r.asset_name as string,
        assetType: r.asset_type as string,
        currentValue: r.current_value != null ? Number(r.current_value) : undefined,
        bankName: r.bank_name as string | undefined,
        accountNumber: r.account_number as string | undefined,
        branch: r.branch as string | undefined,
        nomineeName: r.nominee_name as string | undefined,
        nomineeRelation: r.nominee_relation as string | undefined,
        maturityDate: r.maturity_date as string | undefined,
        annualReturnPercentage: r.annual_return_percentage != null ? Number(r.annual_return_percentage) : undefined,
        notes: r.notes as string | undefined,
      }));
    }, []);
  },
  async addFinancialAsset(asset: Omit<FinancialAsset, "id" | "userId">): Promise<FinancialAsset | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("not authenticated");
    {
      const { data, error } = await pdb.from("financial_assets")
        .insert({
          user_id: user.id,
          asset_name: asset.assetName,
          asset_type: asset.assetType,
          current_value: asset.currentValue ?? null,
          bank_name: asset.bankName ?? null,
          account_number: asset.accountNumber ?? null,
          branch: asset.branch ?? null,
          nominee_name: asset.nomineeName ?? null,
          nominee_relation: asset.nomineeRelation ?? null,
          maturity_date: asset.maturityDate ?? null,
          annual_return_percentage: asset.annualReturnPercentage ?? null,
          notes: asset.notes ?? null,
        })
        .select().maybeSingle();
      if (error) {
        console.error("[addFinancialAsset]", error.message);
        throw new Error(error.message);
      }
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        assetName: r.asset_name as string, assetType: r.asset_type as string,
        currentValue: r.current_value != null ? Number(r.current_value) : undefined,
        nomineeName: r.nominee_name as string | undefined,
      };
    }
  },
  async updateFinancialAsset(id: string, asset: Partial<Omit<FinancialAsset, "id" | "userId">>): Promise<FinancialAsset | null> {
    return safe(async () => {
      const patch: Record<string, unknown> = {};
      if (asset.assetName !== undefined)              patch.asset_name = asset.assetName;
      if (asset.assetType !== undefined)              patch.asset_type = asset.assetType;
      if (asset.currentValue !== undefined)           patch.current_value = asset.currentValue;
      if (asset.bankName !== undefined)               patch.bank_name = asset.bankName;
      if (asset.accountNumber !== undefined)          patch.account_number = asset.accountNumber;
      if (asset.branch !== undefined)                 patch.branch = asset.branch;
      if (asset.nomineeName !== undefined)            patch.nominee_name = asset.nomineeName;
      if (asset.nomineeRelation !== undefined)        patch.nominee_relation = asset.nomineeRelation;
      if (asset.maturityDate !== undefined)           patch.maturity_date = asset.maturityDate;
      if (asset.annualReturnPercentage !== undefined) patch.annual_return_percentage = asset.annualReturnPercentage;
      if (asset.notes !== undefined)                  patch.notes = asset.notes;
      const { data, error } = await pdb.from("financial_assets")
        .update(patch).eq("id", id).select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        assetName: r.asset_name as string, assetType: r.asset_type as string,
        currentValue: r.current_value != null ? Number(r.current_value) : undefined,
        nomineeName: r.nominee_name as string | undefined,
      };
    }, null);
  },
  async deleteFinancialAsset(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("financial_assets").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* FINANCIAL EXPENSES */
  async listFinancialExpenses(): Promise<FinancialExpenseRow[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("financial_expenses").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, userId: r.user_id as string, name: r.name as string,
        category: r.category as string, monthlyAmount: Number(r.monthly_amount),
        inflationRate: Number(r.inflation_rate), phase3Only: Boolean(r.phase3_only),
        waivedAfterParents: Boolean(r.waived_after_parents),
      }));
    }, []);
  },
  async addFinancialExpense(row: Omit<FinancialExpenseRow, "id" | "userId">): Promise<FinancialExpenseRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("not authenticated");
    const { data, error } = await pdb.from("financial_expenses")
      .insert({ user_id: user.id, name: row.name, category: row.category,
        monthly_amount: row.monthlyAmount, inflation_rate: row.inflationRate,
        phase3_only: row.phase3Only, waived_after_parents: row.waivedAfterParents ?? false })
      .select().maybeSingle();
    if (error) {
      console.error("[addFinancialExpense]", error.message);
      throw new Error(error.message);
    }
    const r = data as Record<string, unknown>;
    return { id: r.id as string, userId: r.user_id as string, name: r.name as string,
      category: r.category as string, monthlyAmount: Number(r.monthly_amount),
      inflationRate: Number(r.inflation_rate), phase3Only: Boolean(r.phase3_only),
      waivedAfterParents: Boolean(r.waived_after_parents) };
  },
  async updateFinancialExpense(id: string, row: Partial<Omit<FinancialExpenseRow, "id" | "userId">>): Promise<boolean> {
    return safe(async () => {
      const patch: Record<string, unknown> = {};
      if (row.name !== undefined) patch.name = row.name;
      if (row.category !== undefined) patch.category = row.category;
      if (row.monthlyAmount !== undefined) patch.monthly_amount = row.monthlyAmount;
      if (row.inflationRate !== undefined) patch.inflation_rate = row.inflationRate;
      if (row.phase3Only !== undefined) patch.phase3_only = row.phase3Only;
      if (row.waivedAfterParents !== undefined) patch.waived_after_parents = row.waivedAfterParents;
      const { error } = await pdb.from("financial_expenses").update(patch).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async deleteFinancialExpense(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("financial_expenses").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* FINANCIAL INCOME */
  async listFinancialIncome(): Promise<FinancialIncomeRow[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("financial_income").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string, userId: r.user_id as string, name: r.name as string,
        incomeType: r.income_type as string, monthlyAmount: Number(r.monthly_amount),
        incrementRate: Number(r.increment_rate), survivesParents: Boolean(r.survives_parents),
        endsAtRetirement: Boolean(r.ends_at_retirement),
      }));
    }, []);
  },
  async addFinancialIncome(row: Omit<FinancialIncomeRow, "id" | "userId">): Promise<FinancialIncomeRow | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("financial_income")
        .insert({ user_id: user.id, name: row.name, income_type: row.incomeType,
          monthly_amount: row.monthlyAmount, increment_rate: row.incrementRate,
          survives_parents: row.survivesParents, ends_at_retirement: row.endsAtRetirement })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return { id: r.id as string, userId: r.user_id as string, name: r.name as string,
        incomeType: r.income_type as string, monthlyAmount: Number(r.monthly_amount),
        incrementRate: Number(r.increment_rate), survivesParents: Boolean(r.survives_parents),
        endsAtRetirement: Boolean(r.ends_at_retirement) };
    }, null);
  },
  async updateFinancialIncome(id: string, row: Partial<Omit<FinancialIncomeRow, "id" | "userId">>): Promise<boolean> {
    return safe(async () => {
      const patch: Record<string, unknown> = {};
      if (row.name !== undefined) patch.name = row.name;
      if (row.incomeType !== undefined) patch.income_type = row.incomeType;
      if (row.monthlyAmount !== undefined) patch.monthly_amount = row.monthlyAmount;
      if (row.incrementRate !== undefined) patch.increment_rate = row.incrementRate;
      if (row.survivesParents !== undefined) patch.survives_parents = row.survivesParents;
      if (row.endsAtRetirement !== undefined) patch.ends_at_retirement = row.endsAtRetirement;
      const { error } = await pdb.from("financial_income").update(patch).eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
  async deleteFinancialIncome(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("financial_income").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* FINANCIAL ASSUMPTIONS */
  async getFinancialAssumptions(): Promise<FinancialAssumptionsRow | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await pdb.from("financial_assumptions").select("*").eq("user_id", user.id).maybeSingle();
      if (!data) return null;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        childCurrentAge: Number(r.child_current_age), childLifeExpectancy: Number(r.child_life_expectancy),
        parentAge: Number(r.parent_age), parentRetirementAge: Number(r.parent_retirement_age),
        parentLifeExpectancy: Number(r.parent_life_expectancy), generalInflation: Number(r.general_inflation),
        blendedReturnPhase1: Number(r.blended_return_phase1), blendedReturnPhase3: Number(r.blended_return_phase3),
        existingLifeCover: Number(r.existing_life_cover),
      };
    }, null);
  },
  async saveFinancialAssumptions(row: Omit<FinancialAssumptionsRow, "id" | "userId">): Promise<boolean> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await pdb.from("financial_assumptions").upsert({
        user_id: user.id,
        child_current_age: row.childCurrentAge, child_life_expectancy: row.childLifeExpectancy,
        parent_age: row.parentAge, parent_retirement_age: row.parentRetirementAge,
        parent_life_expectancy: row.parentLifeExpectancy, general_inflation: row.generalInflation,
        blended_return_phase1: row.blendedReturnPhase1, blended_return_phase3: row.blendedReturnPhase3,
        existing_life_cover: row.existingLifeCover, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      return true;
    }, false);
  },

  /* INSURANCE POLICIES */
  async listInsurancePolicies(): Promise<InsurancePolicy[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await pdb.from("insurance_policies").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        userId: r.user_id as string,
        policyType: r.policy_type as string,
        providerName: r.provider_name as string,
        policyNumber: r.policy_number as string | undefined,
        premiumAmount: r.premium_amount != null ? Number(r.premium_amount) : undefined,
        premiumFrequency: r.premium_frequency as string | undefined,
        coverageAmount: r.coverage_amount != null ? Number(r.coverage_amount) : undefined,
        startDate: r.start_date as string | undefined,
        maturityDate: r.maturity_date as string | undefined,
        nomineeName: r.nominee_name as string | undefined,
        nomineeRelation: r.nominee_relation as string | undefined,
        claimStatus: r.claim_status as string | undefined,
        documentsUrl: r.documents_url as string | undefined,
        renewalReminderDate: r.renewal_reminder_date as string | undefined,
        notes: r.notes as string | undefined,
      }));
    }, []);
  },
  async addInsurancePolicy(policy: Omit<InsurancePolicy, "id" | "userId">): Promise<InsurancePolicy | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("insurance_policies")
        .insert({
          user_id: user.id,
          policy_type: policy.policyType,
          provider_name: policy.providerName,
          policy_number: policy.policyNumber ?? null,
          premium_amount: policy.premiumAmount ?? null,
          premium_frequency: policy.premiumFrequency ?? null,
          coverage_amount: policy.coverageAmount ?? null,
          start_date: policy.startDate ?? null,
          maturity_date: policy.maturityDate ?? null,
          nominee_name: policy.nomineeName ?? null,
          nominee_relation: policy.nomineeRelation ?? null,
          claim_status: policy.claimStatus ?? null,
          renewal_reminder_date: policy.renewalReminderDate ?? null,
          notes: policy.notes ?? null,
        })
        .select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        policyType: r.policy_type as string, providerName: r.provider_name as string,
        policyNumber: r.policy_number as string | undefined,
        premiumAmount: r.premium_amount != null ? Number(r.premium_amount) : undefined,
        coverageAmount: r.coverage_amount != null ? Number(r.coverage_amount) : undefined,
        nomineeName: r.nominee_name as string | undefined,
        renewalReminderDate: r.renewal_reminder_date as string | undefined,
        notes: r.notes as string | undefined,
      };
    }, null);
  },
  async updateInsurancePolicy(id: string, policy: Partial<Omit<InsurancePolicy, "id" | "userId">>): Promise<InsurancePolicy | null> {
    return safe(async () => {
      const patch: Record<string, unknown> = {};
      if (policy.policyType !== undefined)         patch.policy_type = policy.policyType;
      if (policy.providerName !== undefined)        patch.provider_name = policy.providerName;
      if (policy.policyNumber !== undefined)        patch.policy_number = policy.policyNumber;
      if (policy.premiumAmount !== undefined)       patch.premium_amount = policy.premiumAmount;
      if (policy.premiumFrequency !== undefined)    patch.premium_frequency = policy.premiumFrequency;
      if (policy.coverageAmount !== undefined)      patch.coverage_amount = policy.coverageAmount;
      if (policy.startDate !== undefined)           patch.start_date = policy.startDate;
      if (policy.maturityDate !== undefined)        patch.maturity_date = policy.maturityDate;
      if (policy.nomineeName !== undefined)         patch.nominee_name = policy.nomineeName;
      if (policy.nomineeRelation !== undefined)     patch.nominee_relation = policy.nomineeRelation;
      if (policy.claimStatus !== undefined)         patch.claim_status = policy.claimStatus;
      if (policy.renewalReminderDate !== undefined) patch.renewal_reminder_date = policy.renewalReminderDate;
      if (policy.notes !== undefined)               patch.notes = policy.notes;
      const { data, error } = await pdb.from("insurance_policies")
        .update(patch).eq("id", id).select().maybeSingle();
      if (error) throw error;
      const r = data as Record<string, unknown>;
      return {
        id: r.id as string, userId: r.user_id as string,
        policyType: r.policy_type as string, providerName: r.provider_name as string,
        premiumAmount: r.premium_amount != null ? Number(r.premium_amount) : undefined,
        coverageAmount: r.coverage_amount != null ? Number(r.coverage_amount) : undefined,
      };
    }, null);
  },
  async deleteInsurancePolicy(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("insurance_policies").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  /* VAULT FILE UPLOAD */
  async uploadVaultFile(file: File, documentId: string): Promise<string | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${documentId}/${Date.now()}_${safeFileName}`;
      const { error: uploadError } = await supabase.storage
        .from("vault-documents")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      // Save the storage path back to the document record
      const { error: updateError } = await pdb
        .from("digital_vault_documents")
        .update({ storage_bucket_path: storagePath, updated_at: new Date().toISOString() })
        .eq("id", documentId);
      if (updateError) console.warn("[vault] could not save storage path", updateError);
      return storagePath;
    }, null);
  },

  /* SUPPORT REQUESTS (public — no auth required) */
  async submitSupportRequest(req: {
    name: string;
    email: string;
    phone?: string;
    category: string;
    query: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase.from("support_requests").insert({
        name: req.name,
        email: req.email,
        phone: req.phone ?? null,
        category: req.category,
        query: req.query,
        status: "New",
      });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  },

  /* CHILD PROFILE */
  async getChildProfile(): Promise<ChildProfile | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("child_profile").select("*").eq("user_id", user.id).maybeSingle();
      if (error && error.code === "PGRST116") return null; // No rows found
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        dateOfBirth: data.date_of_birth,
        photoUrl: data.photo_url,
        disabilityType: data.disability_type,
        disabilityPercentage: data.disability_percentage ?? 0,
        udidNumber: data.udid_number,
        udidValidity: data.udid_validity,
        bloodGroup: data.blood_group,
        allergies: data.allergies,
        currentMedications: data.current_medications,
        emergencyMedicalInfo: data.emergency_medical_info,
        communicationStyle: data.communication_style,
        behavioralTriggers: data.behavioral_triggers,
        comfortItems: data.comfort_items,
        dietaryRequirements: data.dietary_requirements,
        currentSchool: data.current_school,
        therapyProviders: data.therapy_providers,
        iepDetails: data.iep_details,
        enrolledSchemes: data.enrolled_schemes ?? [],
      };
    }, null);
  },
  async saveChildProfile(profile: Omit<ChildProfile, "id">): Promise<ChildProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const payload = {
      user_id: user.id,
      name: profile.name,
      date_of_birth: profile.dateOfBirth || null,
      photo_url: profile.photoUrl || null,
      disability_type: profile.disabilityType || null,
      disability_percentage: profile.disabilityPercentage ?? 0,
      udid_number: profile.udidNumber || null,
      udid_validity: profile.udidValidity || null,
      blood_group: profile.bloodGroup || null,
      allergies: profile.allergies || null,
      current_medications: profile.currentMedications || null,
      emergency_medical_info: profile.emergencyMedicalInfo || null,
      communication_style: profile.communicationStyle || null,
      behavioral_triggers: profile.behavioralTriggers || null,
      comfort_items: profile.comfortItems || null,
      dietary_requirements: profile.dietaryRequirements || null,
      current_school: profile.currentSchool || null,
      therapy_providers: profile.therapyProviders || null,
      iep_details: profile.iepDetails || null,
      enrolled_schemes: profile.enrolledSchemes || [],
    };

    const { data, error } = await pdb.from("child_profile")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[saveChildProfile]", error.message);
      throw new Error(error.message);
    }
    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      photoUrl: data.photo_url,
      disabilityType: data.disability_type,
      disabilityPercentage: data.disability_percentage ?? 0,
      udidNumber: data.udid_number,
      udidValidity: data.udid_validity,
      bloodGroup: data.blood_group,
      allergies: data.allergies,
      currentMedications: data.current_medications,
      emergencyMedicalInfo: data.emergency_medical_info,
      communicationStyle: data.communication_style,
      behavioralTriggers: data.behavioral_triggers,
      comfortItems: data.comfort_items,
      dietaryRequirements: data.dietary_requirements,
      currentSchool: data.current_school,
      therapyProviders: data.therapy_providers,
      iepDetails: data.iep_details,
      enrolledSchemes: data.enrolled_schemes ?? [],
    };
  },

  /* ─── SUCCESSION PLANNING ─── */
  async listSuccessionPlans(): Promise<SuccessionPlan[]> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await pdb.from("succession_plans").select().eq("user_id", user.id);
      return (data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        title: p.title,
        description: p.description,
        status: p.status,
        priority: p.priority,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    }, []);
  },

  async createSuccessionPlan(plan: Omit<SuccessionPlan, "id" | "userId" | "createdAt" | "updatedAt">): Promise<SuccessionPlan | null> {
    return safe(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { data, error } = await pdb.from("succession_plans").insert({
        user_id: user.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        priority: plan.priority,
      }).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }, null);
  },

  async listSuccessionGuardians(planId: string): Promise<SuccessionGuardian[]> {
    return safe(async () => {
      const { data } = await pdb.from("succession_guardians").select().eq("plan_id", planId).order("order_index");
      return (data || []).map(g => ({
        id: g.id,
        planId: g.plan_id,
        personId: g.person_id,
        name: g.name,
        role: g.role,
        relationship: g.relationship,
        phone: g.phone,
        email: g.email,
        orderIndex: g.order_index,
        responsibilities: g.responsibilities ?? [],
      }));
    }, []);
  },

  async createSuccessionGuardian(guardian: Omit<SuccessionGuardian, "id">): Promise<SuccessionGuardian | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("succession_guardians").insert({
        plan_id: guardian.planId,
        person_id: guardian.personId,
        name: guardian.name,
        role: guardian.role,
        relationship: guardian.relationship,
        phone: guardian.phone,
        email: guardian.email,
        order_index: guardian.orderIndex,
        responsibilities: guardian.responsibilities ?? [],
      }).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        planId: data.plan_id,
        personId: data.person_id,
        name: data.name,
        role: data.role,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email,
        orderIndex: data.order_index,
        responsibilities: data.responsibilities ?? [],
      };
    }, null);
  },

  async listSuccessionAssets(planId: string): Promise<SuccessionAsset[]> {
    return safe(async () => {
      const { data } = await pdb.from("succession_assets").select().eq("plan_id", planId);
      return (data || []).map(a => ({
        id: a.id,
        planId: a.plan_id,
        assetType: a.assetType,
        assetName: a.asset_name,
        assetValue: a.asset_value,
        allocationPercentage: a.allocation_percentage,
        assignedGuardianId: a.assigned_guardian,
        notes: a.notes,
      }));
    }, []);
  },

  async createSuccessionAsset(asset: Omit<SuccessionAsset, "id">): Promise<SuccessionAsset | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("succession_assets").insert({
        plan_id: asset.planId,
        assetType: asset.assetType,
        asset_name: asset.assetName,
        asset_value: asset.assetValue,
        allocation_percentage: asset.allocationPercentage,
        assigned_guardian: asset.assignedGuardianId,
        notes: asset.notes,
      }).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        planId: data.plan_id,
        assetType: data.assetType,
        assetName: data.asset_name,
        assetValue: data.asset_value,
        allocationPercentage: data.allocation_percentage,
        assignedGuardianId: data.assigned_guardian,
        notes: data.notes,
      };
    }, null);
  },

  async listSuccessionInstructions(planId: string): Promise<SuccessionInstruction[]> {
    return safe(async () => {
      const { data } = await pdb.from("succession_instructions").select().eq("plan_id", planId);
      return (data || []).map(i => ({
        id: i.id,
        planId: i.plan_id,
        category: i.category,
        instruction: i.instruction,
        priority: i.priority,
      }));
    }, []);
  },

  async createSuccessionInstruction(instruction: Omit<SuccessionInstruction, "id">): Promise<SuccessionInstruction | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("succession_instructions").insert({
        plan_id: instruction.planId,
        category: instruction.category,
        instruction: instruction.instruction,
        priority: instruction.priority,
      }).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        planId: data.plan_id,
        category: data.category,
        instruction: data.instruction,
        priority: data.priority,
      };
    }, null);
  },

  async updateSuccessionPlan(id: string, plan: Partial<Omit<SuccessionPlan, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<SuccessionPlan | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("succession_plans").update({
        title: plan.title,
        description: plan.description,
        status: plan.status,
        priority: plan.priority,
      }).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }, null);
  },

  async updateSuccessionGuardian(id: string, guardian: Partial<Omit<SuccessionGuardian, "id" | "planId">>): Promise<SuccessionGuardian | null> {
    return safe(async () => {
      const { data, error } = await pdb.from("succession_guardians").update({
        name: guardian.name,
        role: guardian.role,
        relationship: guardian.relationship,
        phone: guardian.phone,
        email: guardian.email,
        responsibilities: guardian.responsibilities ?? [],
      }).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return {
        id: data.id,
        planId: data.plan_id,
        personId: data.person_id,
        name: data.name,
        role: data.role,
        relationship: data.relationship,
        phone: data.phone,
        email: data.email,
        orderIndex: data.order_index,
        responsibilities: data.responsibilities ?? [],
      };
    }, null);
  },

  async deleteSuccessionGuardian(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("succession_guardians").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  async deleteSuccessionAsset(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("succession_assets").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },

  async deleteSuccessionInstruction(id: string): Promise<boolean> {
    return safe(async () => {
      const { error } = await pdb.from("succession_instructions").delete().eq("id", id);
      if (error) throw error;
      return true;
    }, false);
  },
};
