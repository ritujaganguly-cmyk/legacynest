import { ChapterBanner } from "@/components/ChapterBanner";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Loader2, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import { dataService, type ParentProfile } from "@/lib/data/mock";
import { ProfileImagePicker } from "@/components/ProfileImagePicker";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/parent-profile")({
  head: () => ({ meta: [{ title: "Parent Profile — LegacyNest" }] }),
  component: ParentProfilePage,
});

const RELATIONSHIPS = ["Parent", "Guardian", "Legal Guardian", "Grandparent", "Sibling", "Other"];
const OCCUPATIONS = ["Working", "Retired", "Self-employed", "Freelance", "Homemaker", "Student", "Other"];
const HEALTH_STATUS = ["Good", "Managing Condition", "Multiple Conditions", "Critical", "Prefer not to say"];

type SectionKey = "personal" | "relationship" | "health";

const emptyProfile: ParentProfile = {
  id: "",
  userId: "",
  fullName: "",
  phone: undefined,
  dateOfBirth: undefined,
  relationshipToChild: undefined,
  occupation: undefined,
  healthStatus: undefined,
  notes: undefined,
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

function ParentProfilePage() {
  const [profile, setProfile] = useState<ParentProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [parentImage, setParentImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        dataService.getProfileImage("parent", data.user.id).then(img => setParentImage(img));
      }
    });
    dataService.getParentProfile().then((existing) => {
      if (existing) setProfile(existing);
      setLoading(false);
    });
  }, []);

  const handleSectionSave = async () => {
    if (!profile.fullName?.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    setSaving(true);
    const saved = await dataService.saveParentProfile(profile);
    setSaving(false);
    if (saved) {
      void dataService.markSectionComplete("parent_profile");
      toast.success("Changes saved!");
      setEditingSection(null);
    } else {
      toast.error("Failed to save profile.");
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <ChapterBanner chapterKey="parent_profile" />
      <div className="pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          {userId ? (
            <ProfileImagePicker
              entityType="parent"
              entityId={userId}
              currentImage={parentImage}
              initials={profile.fullName ? profile.fullName.charAt(0).toUpperCase() : "P"}
              size={56}
              onImageChange={setParentImage}
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Users className="h-7 w-7 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{profile.fullName || "Your Profile"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your personal and family information</p>
          </div>
        </div>
      </div>

      {/* PERSONAL INFORMATION */}
      <Section
        title="Personal Information"
        isEditing={editingSection === "personal"}
        onEdit={() => setEditingSection("personal")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "personal" ? (
          <div className="space-y-4">
            <Field label="Full Name *">
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.fullName || ""}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="Your full name"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Phone">
                <input
                  type="tel"
                  className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value || undefined })}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Date of Birth">
                <input
                  type="date"
                  className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  value={profile.dateOfBirth || ""}
                  onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value || undefined })}
                />
              </Field>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Full Name</div>
              <div className="text-lg font-semibold text-foreground">{profile.fullName || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Phone</div>
              <div className="text-lg text-foreground">{profile.phone || "—"}</div>
            </div>
            {profile.dateOfBirth && (
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Date of Birth</div>
                <div className="text-lg text-foreground">{profile.dateOfBirth}</div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* RELATIONSHIP & OCCUPATION */}
      <Section
        title="Relationship & Occupation"
        isEditing={editingSection === "relationship"}
        onEdit={() => setEditingSection("relationship")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "relationship" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Relationship to Child">
              <select
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.relationshipToChild || ""}
                onChange={(e) => setProfile({ ...profile, relationshipToChild: e.target.value || undefined })}
              >
                <option value="">Select relationship</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Occupation">
              <select
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.occupation || ""}
                onChange={(e) => setProfile({ ...profile, occupation: e.target.value || undefined })}
              >
                <option value="">Select occupation</option>
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Relationship</div>
              <div className="text-lg text-foreground">{profile.relationshipToChild || "—"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Occupation</div>
              <div className="text-lg text-foreground">{profile.occupation || "—"}</div>
            </div>
          </div>
        )}
      </Section>

      {/* HEALTH & NOTES */}
      <Section
        title="Health & Notes"
        isEditing={editingSection === "health"}
        onEdit={() => setEditingSection("health")}
        onCancel={() => setEditingSection(null)}
        onSave={handleSectionSave}
        isSaving={saving}
      >
        {editingSection === "health" ? (
          <div className="space-y-4">
            <Field label="Health Status">
              <select
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.healthStatus || ""}
                onChange={(e) => setProfile({ ...profile, healthStatus: e.target.value || undefined })}
              >
                <option value="">Select health status</option>
                {HEALTH_STATUS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
            <Field label="Additional Notes">
              <textarea
                rows={4}
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                value={profile.notes || ""}
                onChange={(e) => setProfile({ ...profile, notes: e.target.value || undefined })}
                placeholder="Any other information you'd like to share about your health or situation..."
              />
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Health Status</div>
              <div className="text-lg text-foreground">{profile.healthStatus || "—"}</div>
            </div>
            {profile.notes && (
              <div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Notes</div>
                <div className="mt-2 text-foreground whitespace-pre-wrap">{profile.notes}</div>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
