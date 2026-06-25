import { createFileRoute } from "@tanstack/react-router";
import { ChapterBanner } from "@/components/ChapterBanner";
import { useState, useEffect } from "react";
import { Baby, Loader2, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import { dataService, type ChildProfile } from "@/lib/data/mock";
import { ProfileImagePicker } from "@/components/ProfileImagePicker";
import { supabase } from "@/integrations/supabase/client";
import { SPDINotice } from "@/components/compliance/SPDINotice";

export const Route = createFileRoute("/_app/child-profile")({
  head: () => ({ meta: [{ title: "Child Profile — LegacyNest" }] }),
  component: ChildProfilePage,
});

const DISABILITY_TYPES = [
  "Autism Spectrum Disorder", "Cerebral Palsy", "Down Syndrome",
  "Intellectual Disability", "Physical Disability", "Hearing Impairment",
  "Visual Impairment", "Speech/Language Disorder", "Specific Learning Disability",
  "Multiple Disabilities", "Other",
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMMUNICATION_STYLES = ["Verbal", "Non-verbal", "Sign Language", "AAC Device", "Picture Cards", "Mixed Methods"];
const GOVERNMENT_SCHEMES = [
  "UDID (Unique Disability ID)", "Niramaya Health Insurance", "PM-JANMAN (Jan Man Arogya Scheme)",
  "National Trust Benefits", "RPWD Act Concessions", "RTE (Right to Education)", "Disability Pension",
];

type SectionKey = "basic" | "disability" | "health" | "behavioral" | "education" | "benefits";

const emptyProfile: ChildProfile = {
  id: "",
  name: "", dateOfBirth: "", disabilityType: "", disabilityPercentage: 0,
  udidNumber: "", udidValidity: "", bloodGroup: "", allergies: "",
  currentMedications: "", communicationStyle: "", behavioralTriggers: "",
  comfortItems: "", dietaryRequirements: "", emergencyMedicalInfo: "",
  currentSchool: "", therapyProviders: "", iepDetails: "", enrolledSchemes: [],
};

interface SectionProps {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  children: React.ReactNode;
}

function Section({ title, isEditing, onEdit, onCancel, onSave, isSaving, children }: SectionProps) {
  return (
    <div className={`rounded-xl border transition-all ${
      isEditing
        ? "border-primary/30 bg-primary/5 shadow-lg"
        : "border-border bg-card shadow-sm hover:shadow-md"
    }`}>
      <div className={`flex items-center justify-between px-6 py-5 border-b ${isEditing ? "border-primary/20" : "border-border"}`}>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
              title="Cancel"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-1"
              title="Save"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg text-primary text-sm font-medium hover:bg-primary/10 transition-colors inline-flex items-center gap-1"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-5 last:mb-0">
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</span>
      <div className="mt-2.5">{children}</div>
    </label>
  );
}

function ChildProfilePage() {
  const [profile, setProfile] = useState<ChildProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [hasUdid, setHasUdid] = useState(false);
  const [udidFile, setUdidFile] = useState<File | null>(null);
  const [uploadingUdid, setUploadingUdid] = useState(false);
  const [childImage, setChildImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        dataService.getProfileImage("child", data.user.id).then(img => setChildImage(img));
      }
    });
    dataService.getChildProfile().then((existing) => {
      if (existing) {
        setProfile(existing);
        setHasUdid(!!existing.udidNumber);
      }
      setLoading(false);
    });
  }, []);

  const handleSectionSave = async () => {
    if (!profile.name.trim()) { toast.error("Please enter your child's name."); return; }
    if (!profile.disabilityType) { toast.error("Please select a disability type."); return; }
    setSaving(true);
    const saved = await dataService.saveChildProfile(profile);
    setSaving(false);
    if (saved) {
      void dataService.markSectionComplete("child_profile");
      // Upload UDID card to vault if provided
      if (udidFile && editingSection === "disability") {
        setUploadingUdid(true);
        try {
          const doc = await dataService.addVaultDocument({
            name: `UDID Card — ${profile.name || "Child"}`,
            category: "Identity",
            notes: profile.udidNumber ? `UDID: ${profile.udidNumber}` : undefined,
          });
          if (doc) await dataService.uploadVaultFile(udidFile, doc.id);
          setUdidFile(null);
        } catch { /* non-blocking */ }
        finally { setUploadingUdid(false); }
      }
      toast.success("Changes saved!");
      setEditingSection(null);
    } else {
      toast.error("Failed to save profile.");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <ChapterBanner chapterKey="child" />
      <SPDINotice section="child_profile" />
      <div className="pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          {userId ? (
            <ProfileImagePicker
              entityType="child"
              entityId={userId}
              currentImage={childImage}
              initials={profile.name ? profile.name.charAt(0).toUpperCase() : "C"}
              size={56}
              onImageChange={setChildImage}
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Baby className="h-7 w-7 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{profile.name || "Child's Profile"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your child's comprehensive profile information</p>
          </div>
        </div>
      </div>

      {/* BASIC INFORMATION */}
      <Section
        title="Basic Information"
        isEditing={editingSection === "basic"}
        onEdit={() => setEditingSection("basic")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "basic" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Child's Full Name *">
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter child's full name"
              />
            </Field>
            <Field label="Date of Birth">
              <input
                type="date"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.dateOfBirth || ""}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Name</div>
              <div className="text-lg font-semibold text-foreground">{profile.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Date of Birth</div>
              <div className="text-lg text-foreground">{profile.dateOfBirth || "—"}</div>
            </div>
          </div>
        )}
      </Section>

      {/* DISABILITY & GOVERNMENT IDs */}
      <Section
        title="Disability & Government IDs"
        isEditing={editingSection === "disability"}
        onEdit={() => setEditingSection("disability")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "disability" ? (
          <div className="space-y-4">
            <Field label="Type of Disability (RPWD Act) *">
              <select
                className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profile.disabilityType || ""}
                onChange={(e) => setProfile({ ...profile, disabilityType: e.target.value })}
              >
                <option value="">Select disability type</option>
                {DISABILITY_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
              </select>
            </Field>
            <Field label="Disability Percentage (%)">
              <input
                type="number" min="0" max="100"
                className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={profile.disabilityPercentage}
                onChange={(e) => setProfile({ ...profile, disabilityPercentage: parseInt(e.target.value) || 0 })}
              />
            </Field>

            {/* UDID Yes/No */}
            <div className="rounded-lg border border-border bg-surface-low p-4">
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                Does your child have a UDID Card?
              </div>
              <div className="flex gap-3">
                {["Yes", "No"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const isYes = opt === "Yes";
                      setHasUdid(isYes);
                      if (!isYes) setProfile({ ...profile, udidNumber: "", udidValidity: "" });
                    }}
                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                      (opt === "Yes" ? hasUdid : !hasUdid)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-card"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {hasUdid && (
                <div className="mt-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">UDID Number <span className="text-muted-foreground normal-case font-normal">(optional)</span></span>
                      <input
                        type="text"
                        className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        value={profile.udidNumber || ""}
                        placeholder="e.g. UDxxx123456"
                        onChange={(e) => setProfile({ ...profile, udidNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">Valid Until <span className="text-muted-foreground normal-case font-normal">(optional)</span></span>
                      <input
                        type="date"
                        className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                        value={profile.udidValidity || ""}
                        onChange={(e) => setProfile({ ...profile, udidValidity: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Upload UDID Card <span className="text-muted-foreground normal-case font-normal">(optional — saved to Digital Vault)</span></span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      onChange={(e) => setUdidFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  {uploadingUdid && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading UDID card to vault…
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Disability Type</div>
              <div className="text-lg font-semibold text-foreground">{profile.disabilityType || "—"} {profile.disabilityPercentage > 0 ? `(${profile.disabilityPercentage}%)` : ""}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">UDID Card</div>
              {profile.udidNumber ? (
                <div>
                  <div className="text-lg text-foreground font-medium">{profile.udidNumber}</div>
                  {profile.udidValidity && <div className="text-xs text-muted-foreground mt-0.5">Valid until {new Date(profile.udidValidity).toLocaleDateString("en-IN")}</div>}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Not registered</div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* HEALTH & MEDICAL */}
      <Section
        title="Health & Medical"
        isEditing={editingSection === "health"}
        onEdit={() => setEditingSection("health")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "health" ? (
          <div className="space-y-4">
            <Field label="Blood Group">
              <select className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.bloodGroup || ""} onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </Field>
            <Field label="Allergies">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.allergies || ""} onChange={(e) => setProfile({ ...profile, allergies: e.target.value })} />
            </Field>
            <Field label="Current Medications">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.currentMedications || ""} onChange={(e) => setProfile({ ...profile, currentMedications: e.target.value })} />
            </Field>
            <Field label="Emergency Medical Info">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.emergencyMedicalInfo || ""} onChange={(e) => setProfile({ ...profile, emergencyMedicalInfo: e.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Blood Group</div>
                <div className="text-lg text-foreground">{profile.bloodGroup || "—"}</div>
              </div>
            </div>
            {profile.allergies && <div><div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Allergies</div><div className="text-lg text-foreground">{profile.allergies}</div></div>}
            {profile.currentMedications && <div><div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Medications</div><div className="text-lg text-foreground">{profile.currentMedications}</div></div>}
          </div>
        )}
      </Section>

      {/* BEHAVIORAL & COMMUNICATION */}
      <Section
        title="Behavioral & Communication"
        isEditing={editingSection === "behavioral"}
        onEdit={() => setEditingSection("behavioral")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "behavioral" ? (
          <div className="space-y-4">
            <Field label="Communication Style">
              <select className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.communicationStyle || ""} onChange={(e) => setProfile({ ...profile, communicationStyle: e.target.value })}>
                <option value="">Select</option>
                {COMMUNICATION_STYLES.map((cs) => <option key={cs} value={cs}>{cs}</option>)}
              </select>
            </Field>
            <Field label="Behavioral Triggers">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.behavioralTriggers || ""} onChange={(e) => setProfile({ ...profile, behavioralTriggers: e.target.value })} />
            </Field>
            <Field label="Comfort Items">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.comfortItems || ""} onChange={(e) => setProfile({ ...profile, comfortItems: e.target.value })} />
            </Field>
            <Field label="Dietary Requirements">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.dietaryRequirements || ""} onChange={(e) => setProfile({ ...profile, dietaryRequirements: e.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Communication</div>
                <div className="mt-2 text-foreground">{profile.communicationStyle || "—"}</div>
              </div>
            </div>
            {profile.behavioralTriggers && <div><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Behavioral Triggers</div><div className="mt-2 text-foreground">{profile.behavioralTriggers}</div></div>}
          </div>
        )}
      </Section>

      {/* EDUCATION & THERAPY */}
      <Section
        title="Education & Therapy"
        isEditing={editingSection === "education"}
        onEdit={() => setEditingSection("education")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "education" ? (
          <div className="space-y-4">
            <Field label="Current School">
              <input type="text" className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" value={profile.currentSchool || ""} onChange={(e) => setProfile({ ...profile, currentSchool: e.target.value })} />
            </Field>
            <Field label="Therapy Providers">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.therapyProviders || ""} onChange={(e) => setProfile({ ...profile, therapyProviders: e.target.value })} />
            </Field>
            <Field label="IEP Details">
              <textarea rows={2} className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" value={profile.iepDetails || ""} onChange={(e) => setProfile({ ...profile, iepDetails: e.target.value })} />
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">School</div>
              <div className="mt-2 text-foreground">{profile.currentSchool || "—"}</div>
            </div>
            {profile.therapyProviders && <div><div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Therapies</div><div className="mt-2 text-foreground">{profile.therapyProviders}</div></div>}
          </div>
        )}
      </Section>

      {/* GOVERNMENT BENEFITS */}
      <Section
        title="Government Benefits"
        isEditing={editingSection === "benefits"}
        onEdit={() => setEditingSection("benefits")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "benefits" ? (
          <div className="space-y-2">
            {GOVERNMENT_SCHEMES.map((scheme) => (
              <label key={scheme} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-surface-low">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={profile.enrolledSchemes.includes(scheme)}
                  onChange={() => setProfile((p) => ({
                    ...p, enrolledSchemes: p.enrolledSchemes.includes(scheme)
                      ? p.enrolledSchemes.filter((s) => s !== scheme)
                      : [...p.enrolledSchemes, scheme],
                  }))}
                />
                <span className="text-sm font-medium text-foreground">{scheme}</span>
              </label>
            ))}
          </div>
        ) : (
          <div>
            {profile.enrolledSchemes.length > 0 ? (
              <div className="space-y-2">
                {profile.enrolledSchemes.map((scheme) => (
                  <div key={scheme} className="text-sm text-foreground">• {scheme}</div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No schemes enrolled</div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
