import { ChapterBanner } from "@/components/ChapterBanner";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Phone, Mail, Plus, ShieldCheck, Users, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { dataService, type CareCircleMember } from "@/lib/data/mock";
import { ProfileImagePicker } from "@/components/ProfileImagePicker";

export const Route = createFileRoute("/_app/care-circle")({
  head: () => ({ meta: [{ title: "Care Circle — LegacyNest" }] }),
  component: CareCirclePage,
});

const RESPONSIBILITIES = [
  "Daily Care",
  "Medical Decisions",
  "Financial Management",
  "Legal Representation",
  "Education",
  "Emotional Support",
  "Residential",
  "Emergency Decisions",
  "Govt Schemes",
  "Communication",
] as const;

const RESP_COLORS: Record<string, string> = {
  "Daily Care": "bg-orange-50 text-orange-700",
  "Medical Decisions": "bg-red-50 text-red-700",
  "Financial Management": "bg-green-50 text-green-700",
  "Legal Representation": "bg-blue-50 text-blue-700",
  "Education": "bg-purple-50 text-purple-700",
  "Emotional Support": "bg-pink-50 text-pink-700",
  "Residential": "bg-amber-50 text-amber-700",
  "Emergency Decisions": "bg-rose-50 text-rose-700",
  "Govt Schemes": "bg-teal-50 text-teal-700",
  "Communication": "bg-sky-50 text-sky-700",
};

const ROLES: CareCircleMember["role"][] = [
  "Primary Caregiver",
  "Secondary Caregiver",
  "Successor Guardian",
  "Legal Guardian",
  "Trustee",
  "Medical Decision Maker",
  "Doctor / Therapist",
  "Friend / Supporter",
];
const STATUSES: CareCircleMember["status"][] = ["Active", "Invited", "Pending"];
const RELATIONS = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Cousin",
  "Spouse",
  "Son",
  "Daughter",
  "Nephew",
  "Niece",
  "Friend",
  "Godparent",
  "Legal Guardian",
  "Foster Parent",
  "Other",
];
const COLORS = ["#e07b2a", "#d4af37", "#0ea5e9", "#22c55e", "#a855f7", "#ef4444"];

const emptyDraft = (): CareCircleMember => ({
  id: "",
  name: "",
  relation: "",
  role: "Primary Caregiver",
  phone: "",
  email: "",
  status: "Active",
  avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
  successionOrder: 99,
  isEmergencyContact: false,
  responsibilities: [],
  notes: "",
});

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function CareCirclePage() {
  const [members, setMembers] = useState<CareCircleMember[] | null>(null);
  const [editing, setEditing] = useState<CareCircleMember | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [respSelection, setRespSelection] = useState<string[]>([]);

  useEffect(() => {
    dataService.listCareCircle().then(setMembers);
  }, []);

  const openAdd = () => {
    setEditing(emptyDraft());
    setRespSelection([]);
    setIsNew(true);
  };
  const openEdit = (m: CareCircleMember) => {
    setEditing({ ...m });
    setRespSelection(m.responsibilities ?? []);
    setIsNew(false);
  };
  const closeDialog = () => {
    setEditing(null);
    setRespSelection([]);
  };
  const toggleResp = (r: string) => {
    setRespSelection((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };
  const remove = async (id: string) => {
    if (!confirm("Remove this member?")) return;
    const ok = await dataService.deleteCareCircleMember(id);
    if (!ok) {
      toast.error("Could not delete. Please try again.");
      return;
    }
    setMembers((prev) => (prev ?? []).filter((m) => m.id !== id));
    toast.success("Member removed");
  };
  const save = async () => {
    if (!editing) return;

    if (!editing.name.trim()) {
      toast.error("Please enter a name.");
      return;
    }
    if (!editing.relation) {
      toast.error("Please select a relation.");
      return;
    }

    const payload = { ...editing, responsibilities: respSelection };

    if (isNew) {
      const { id: _omit, ...rest } = payload;
      void _omit;
      const created = await dataService.createCareCircleMember(rest);
      if (!created) {
        toast.error("Could not save. Please check your connection and try again.");
        return;
      }
      setMembers((prev) => [...(prev ?? []), created]);
      void dataService.markSectionComplete("care_circle");
      toast.success("Member added to Care Circle");
    } else {
      const updated = await dataService.updateCareCircleMember(payload);
      if (!updated) {
        toast.error("Could not update. Please check your connection and try again.");
        return;
      }
      setMembers((prev) => (prev ?? []).map((m) => (m.id === updated.id ? updated : m)));
      toast.success("Member updated");
    }
    closeDialog();
  };

  const sorted = [...(members ?? [])].sort((a, b) => {
    if (a.successionOrder !== b.successionOrder) return a.successionOrder - b.successionOrder;
    return a.name.localeCompare(b.name);
  });

  const successionChain = sorted.filter(m => m.successionOrder < 99).slice(0, 4);

  return (
    <div className="space-y-6 max-w-6xl">
      <ChapterBanner chapterKey="care_circle" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Care Circle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The trusted network that surrounds and protects your child.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {members && members.length > 0 && successionChain.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 px-6 py-5">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Succession Chain</div>
          <div className="flex flex-wrap items-center gap-2.5">
            {successionChain.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <div className="flex items-center gap-2 rounded-xl bg-white border border-border px-3 py-2 shadow-sm">
                  <div
                    className="h-8 w-8 rounded-full grid place-items-center text-white text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: m.avatarColor }}
                  >
                    {initials(m.name)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground leading-tight">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.role.split(" ")[0]}</div>
                  </div>
                </div>
                {i < successionChain.length - 1 && (
                  <div className="text-xs text-muted-foreground font-bold shrink-0">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {members === null ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </div>
      ) : members.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No members yet. Click <span className="font-semibold">Add Member</span> to add one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((m) => (
            <div key={m.id} className="legacy-card legacy-card-gold-top p-5">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <ProfileImagePicker
                    entityType="care_circle"
                    entityId={m.id}
                    initials={initials(m.name)}
                    size={48}
                    avatarColor={m.avatarColor}
                  />
                  {m.isEmergencyContact && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center z-10">
                      <AlertTriangle className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground truncate">{m.name}</h3>
                    {m.status === "Active" && <ShieldCheck className="h-4 w-4 text-success shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.relation}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-low hover:text-primary"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 truncate">
                  {m.role}
                </span>
                <span className="rounded-full text-[11px] font-semibold px-2.5 py-1 bg-green-50 text-green-700">
                  {m.status}
                </span>
              </div>
              {m.successionOrder < 99 && (
                <div className="mt-2 text-[11px] text-muted-foreground font-medium">
                  Succession #{m.successionOrder}
                </div>
              )}
              {m.responsibilities && m.responsibilities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {m.responsibilities.map((r) => (
                    <span
                      key={r}
                      className={`rounded-full text-[10px] font-semibold px-2 py-0.5 ${RESP_COLORS[r] ?? "bg-surface-low text-foreground"}`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              )}
              {m.notes && (
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3 italic">
                  {m.notes}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
                {m.phone && (
                  <a
                    href={`tel:${m.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" /> {m.phone}
                  </a>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary truncate"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" /> {m.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 grid place-items-center p-4"
          onClick={closeDialog}
        >
          <div
            className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isNew ? "Add Member" : "Edit Member"}
              </h2>
              <button onClick={closeDialog} className="p-1 rounded-md text-muted-foreground hover:bg-surface-low">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Full Name *">
                <input
                  type="text"
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.name}
                  maxLength={100}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Name"
                />
              </Field>
              <Field label="Relation *">
                <select
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.relation}
                  onChange={(e) => setEditing({ ...editing, relation: e.target.value })}
                >
                  <option value="">Select a relation</option>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role *">
                <select
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value as CareCircleMember["role"] })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.phone}
                  maxLength={30}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="+91-XXXXX XXXXX"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label="Status">
                <select
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as CareCircleMember["status"] })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Succession Order">
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={editing.successionOrder === 99 ? "" : editing.successionOrder}
                  onChange={(e) => setEditing({ ...editing, successionOrder: e.target.value ? parseInt(e.target.value) : 99 })}
                  placeholder="1 = first in succession"
                />
              </Field>

              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">Responsibilities</span>
                <div className="grid grid-cols-2 gap-2">
                  {RESPONSIBILITIES.map((r) => {
                    const active = respSelection.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleResp(r)}
                        className={`text-left rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                          active
                            ? `${RESP_COLORS[r]} border-current`
                            : "border-border bg-surface-low text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {active ? "✓ " : ""}{r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Care Approach Notes">
                <textarea
                  className="w-full rounded-md border border-border bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  rows={3}
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="How does this person care for the child? Daily routines, special needs handling, communication style… (helps the successor understand)"
                />
              </Field>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={editing.isEmergencyContact}
                  onChange={(e) => setEditing({ ...editing, isEmergencyContact: e.target.checked })}
                />
                <span className="text-sm font-medium text-foreground">Mark as emergency contact</span>
              </label>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-2">
              <button
                onClick={closeDialog}
                className="rounded-lg px-4 py-2 text-sm font-semibold border border-border hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
