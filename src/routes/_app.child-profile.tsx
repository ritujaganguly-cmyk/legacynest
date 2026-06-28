import { createFileRoute } from "@tanstack/react-router";
import { ChapterBanner } from "@/components/ChapterBanner";
import { useState, useEffect } from "react";
import { Baby, Loader2 } from "lucide-react";
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

const emptyProfile: ChildProfile = {
  id: "", name: "", dateOfBirth: "", disabilityType: "", disabilityPercentage: 0,
  udidNumber: "", udidValidity: "", bloodGroup: "", allergies: "",
  currentMedications: "", communicationStyle: "", behavioralTriggers: "",
  comfortItems: "", dietaryRequirements: "", emergencyMedicalInfo: "",
  currentSchool: "", therapyProviders: "", iepDetails: "", enrolledSchemes: [],
};

const inputCls = "w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";
const labelCls = "text-xs font-semibold text-primary uppercase tracking-wider block mb-1.5";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

function Card({ title, children, onSave, saving }: {
  title: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
      <div className="px-6 pb-5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
        </button>
      </div>
    </div>
  );
}

function ChildProfilePage() {
  const [profile, setProfile] = useState<ChildProfile>(emptyProfile);
  const [savingCard1, setSavingCard1] = useState(false);
  const [savingCard2, setSavingCard2] = useState(false);
  const [savingCard3, setSavingCard3] = useState(false);
  const [savingCard4, setSavingCard4] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasUdid, setHasUdid] = useState(false);
  const [udidFile, setUdidFile] = useState<File | null>(null);
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

  const p = (patch: Partial<ChildProfile>) => setProfile((prev) => ({ ...prev, ...patch }));

  async function doSave(card: 1 | 2 | 3 | 4) {
    if (card === 1 && !profile.name.trim()) {
      toast.error("Please enter your child's name.");
      return;
    }
    if (card === 1) setSavingCard1(true);
    else if (card === 2) setSavingCard2(true);
    else if (card === 3) setSavingCard3(true);
    else setSavingCard4(true);
    try {
      const saved = await dataService.saveChildProfile(profile);
      if (!saved) throw new Error("Save returned null — check Supabase logs.");
      void dataService.markSectionComplete("child_profile");
      if (card === 1 && udidFile && hasUdid) {
        const doc = await dataService.addVaultDocument({
          name: `UDID Card — ${profile.name || "Child"}`,
          category: "Disability",
          notes: profile.udidNumber ? `UDID: ${profile.udidNumber}` : undefined,
        });
        if (doc) {
          const uploaded = await dataService.uploadVaultFile(udidFile, doc.id);
          if (uploaded) {
            setUdidFile(null);
            toast.success("Profile saved. UDID Card uploaded to Digital Vault.");
          } else {
            toast.error("Profile saved, but UDID Card upload failed. Please try again from the Vault.");
          }
        } else {
          toast.error("Profile saved, but could not create vault entry. Please try again.");
        }
      } else {
        toast.success("Saved successfully!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      if (card === 1) setSavingCard1(false);
      else if (card === 2) setSavingCard2(false);
      else if (card === 3) setSavingCard3(false);
      else setSavingCard4(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <ChapterBanner chapterKey="child" />
      <SPDINotice section="child_profile" />

      {/* Header */}
      <div className="flex items-center gap-4">
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
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Baby className="h-7 w-7 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{profile.name || "Child's Profile"}</h1>
          <p className="text-sm text-muted-foreground">Update your child's profile information below</p>
        </div>
      </div>

      {/* Card 1 — Basic + Disability */}
      <Card title="Basic & Disability Information" onSave={() => doSave(1)} saving={savingCard1}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Child's Full Name *">
            <input
              type="text"
              className={inputCls}
              value={profile.name}
              onChange={(e) => p({ name: e.target.value })}
              placeholder="Enter full name"
            />
          </Field>
          <Field label="Date of Birth">
            <input
              type="date"
              className={inputCls}
              value={profile.dateOfBirth || ""}
              onChange={(e) => p({ dateOfBirth: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Type of Disability (RPWD Act)">
          <select
            className={inputCls}
            value={profile.disabilityType || ""}
            onChange={(e) => p({ disabilityType: e.target.value })}
          >
            <option value="">Select disability type</option>
            {DISABILITY_TYPES.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
          </select>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Disability Percentage (%)">
            <input
              type="number" min="0" max="100"
              className={inputCls}
              value={profile.disabilityPercentage || ""}
              onChange={(e) => p({ disabilityPercentage: parseInt(e.target.value) || 0 })}
              placeholder="e.g. 75"
            />
          </Field>
          <Field label="Blood Group">
            <select
              className={inputCls}
              value={profile.bloodGroup || ""}
              onChange={(e) => p({ bloodGroup: e.target.value })}
            >
              <option value="">Select</option>
              {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </Field>
        </div>

        {/* UDID */}
        <div className="rounded-lg border border-border bg-surface-low p-4 space-y-3">
          <div className={labelCls}>Does your child have a UDID Card?</div>
          <div className="flex gap-3">
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const isYes = opt === "Yes";
                  setHasUdid(isYes);
                  if (!isYes) p({ udidNumber: "", udidValidity: "" });
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
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="UDID Number">
                  <input
                    type="text"
                    className={inputCls}
                    value={profile.udidNumber || ""}
                    placeholder="e.g. UDxxx123456"
                    onChange={(e) => p({ udidNumber: e.target.value })}
                  />
                </Field>
                <Field label="Valid Until">
                  <input
                    type="date"
                    className={inputCls}
                    value={profile.udidValidity || ""}
                    onChange={(e) => p({ udidValidity: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Upload UDID Card (saved to Digital Vault)">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className={inputCls}
                  onChange={(e) => setUdidFile(e.target.files?.[0] || null)}
                />
              </Field>
            </div>
          )}
        </div>
      </Card>

      {/* Card 2 — Health & Medical */}
      <Card title="Health & Medical" onSave={() => doSave(2)} saving={savingCard2}>
        <Field label="Allergies">
          <textarea rows={2} className={inputCls} value={profile.allergies || ""} onChange={(e) => p({ allergies: e.target.value })} placeholder="List any known allergies" />
        </Field>
        <Field label="Current Medications">
          <textarea rows={2} className={inputCls} value={profile.currentMedications || ""} onChange={(e) => p({ currentMedications: e.target.value })} placeholder="Medication names and doses" />
        </Field>
        <Field label="Emergency Medical Info">
          <textarea rows={2} className={inputCls} value={profile.emergencyMedicalInfo || ""} onChange={(e) => p({ emergencyMedicalInfo: e.target.value })} placeholder="Critical info for emergency responders" />
        </Field>
        <Field label="Dietary Requirements">
          <textarea rows={2} className={inputCls} value={profile.dietaryRequirements || ""} onChange={(e) => p({ dietaryRequirements: e.target.value })} placeholder="Food allergies, restrictions, preferences" />
        </Field>
      </Card>

      {/* Card 3 — Behaviour & Communication */}
      <Card title="Behaviour & Communication" onSave={() => doSave(3)} saving={savingCard3}>
        <Field label="Communication Style">
          <select className={inputCls} value={profile.communicationStyle || ""} onChange={(e) => p({ communicationStyle: e.target.value })}>
            <option value="">Select</option>
            {COMMUNICATION_STYLES.map((cs) => <option key={cs} value={cs}>{cs}</option>)}
          </select>
        </Field>
        <Field label="Behavioral Triggers">
          <textarea rows={2} className={inputCls} value={profile.behavioralTriggers || ""} onChange={(e) => p({ behavioralTriggers: e.target.value })} placeholder="Situations that cause distress" />
        </Field>
        <Field label="Comfort Items / Calming Strategies">
          <textarea rows={2} className={inputCls} value={profile.comfortItems || ""} onChange={(e) => p({ comfortItems: e.target.value })} placeholder="What helps your child feel safe" />
        </Field>
      </Card>

      {/* Card 4 — Education & Government Schemes */}
      <Card title="Education & Government Schemes" onSave={() => doSave(4)} saving={savingCard4}>
        <Field label="Current School">
          <input type="text" className={inputCls} value={profile.currentSchool || ""} onChange={(e) => p({ currentSchool: e.target.value })} placeholder="School name and location" />
        </Field>
        <Field label="Therapy Providers">
          <textarea rows={2} className={inputCls} value={profile.therapyProviders || ""} onChange={(e) => p({ therapyProviders: e.target.value })} placeholder="OT, speech, ABA therapists etc." />
        </Field>
        <Field label="IEP / Special Education Details">
          <textarea rows={2} className={inputCls} value={profile.iepDetails || ""} onChange={(e) => p({ iepDetails: e.target.value })} placeholder="Individualized Education Program details" />
        </Field>
        <div>
          <div className={labelCls}>Government Schemes Enrolled</div>
          <div className="space-y-2 mt-1">
            {GOVERNMENT_SCHEMES.map((scheme) => (
              <label key={scheme} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-surface-low">
                <input type="checkbox" className="h-4 w-4 rounded accent-primary"
                  checked={profile.enrolledSchemes.includes(scheme)}
                  onChange={() => p({
                    enrolledSchemes: profile.enrolledSchemes.includes(scheme)
                      ? profile.enrolledSchemes.filter((s) => s !== scheme)
                      : [...profile.enrolledSchemes, scheme],
                  })}
                />
                <span className="text-sm text-foreground">{scheme}</span>
              </label>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
