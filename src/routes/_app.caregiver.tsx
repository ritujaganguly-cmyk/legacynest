import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Info, Phone, Mail, Pencil, UserPlus, Plus, Check, Download, Trash2, Loader2, CheckSquare, Square,
} from "lucide-react";

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
  "Daily Care":            "bg-orange-50 text-orange-700",
  "Medical Decisions":     "bg-red-50 text-red-700",
  "Financial Management":  "bg-green-50 text-green-700",
  "Legal Representation":  "bg-blue-50 text-blue-700",
  "Education":             "bg-purple-50 text-purple-700",
  "Emotional Support":     "bg-pink-50 text-pink-700",
  "Residential":           "bg-amber-50 text-amber-700",
  "Emergency Decisions":   "bg-rose-50 text-rose-700",
  "Govt Schemes":          "bg-teal-50 text-teal-700",
  "Communication":         "bg-sky-50 text-sky-700",
};
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { dataService, type SuccessionGuardian, type SuccessionAsset } from "@/lib/data/mock";
import { ProfileImagePicker } from "@/components/ProfileImagePicker";

export const Route = createFileRoute("/_app/caregiver")({
  head: () => ({ meta: [{ title: "Caregiver Succession — LegacyNest" }] }),
  component: Caregiver,
});

function Caregiver() {
  const [searchTerm, setSearchTerm] = useState("");
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<SuccessionGuardian | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["successionPlans"],
    queryFn: () => dataService.listSuccessionPlans(),
  });

  const activePlan = plans.length > 0 ? plans[0] : null;

  const { data: guardians = [] } = useQuery({
    queryKey: ["successionGuardians", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionGuardians(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["successionAssets", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionAssets(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  const readinessScore = activePlan ? Math.min(100, 30 + guardians.length * 20 + assets.length * 10) : 0;
  const pendingCount = guardians.filter(g => !g.email).length;

  const filtered = searchTerm
    ? guardians.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : guardians;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 max-w-xl relative">
          <input
            placeholder="Search guardians or assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full bg-surface-container py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-primary">Caregiver Succession Planning</h1>
        <p className="mt-2 text-muted-foreground">
          Ensure your child's future is anchored in trusted hands. Define the hierarchy of care
          and verify readiness for those who will follow in your footsteps.
        </p>
      </div>

      <div className="rounded-xl border-l-4 border-warning bg-warning-soft/60 p-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-warning mt-0.5" />
        <div>
          <div className="font-semibold">The Importance of Succession Planning</div>
          <p className="text-sm text-muted-foreground mt-1">
            Legal documentation of these caregivers ensures a seamless transition. Without a
            designated heir of care, local authorities may decide your child's living arrangements.
            Consider including professional caregivers in the hierarchy.
          </p>
        </div>
      </div>

      {!activePlan ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No Plan Created Yet</h3>
          <p className="text-muted-foreground mt-1">Create a succession plan to add guardians and assets</p>
          <button
            onClick={() => setPlanDialogOpen(true)}
            className="mt-4 rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-2.5 text-sm"
          >
            Create Succession Plan
          </button>
        </div>
      ) : (
        <>
          {/* Guardian Cards — Primary, Secondary, Legal + additional */}
          <div className="grid lg:grid-cols-3 gap-5">
            {(["Primary", "Secondary", "Legal"] as const).map((slot, idx) => {
              const guardian = filtered[idx];
              return guardian ? (
                <GuardianCard
                  key={guardian.id}
                  guardian={guardian}
                  planId={activePlan.id}
                  slot={slot}
                  onEdit={() => setEditingGuardian(guardian)}
                />
              ) : (
                <EmptyGuardianCard key={slot} slot={slot} onAdd={() => setGuardianDialogOpen(true)} />
              );
            })}
            {/* Extra cards for guardians beyond the first 3 */}
            {filtered.slice(3).map((guardian) => (
              <GuardianCard
                key={guardian.id}
                guardian={guardian}
                planId={activePlan.id}
                slot="Primary"
                slotLabel={guardian.role}
                onEdit={() => setEditingGuardian(guardian)}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setGuardianDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-soft text-primary-foreground font-semibold px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" /> Add Guardian
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium">
              <Mail className="h-4 w-4" /> Send Verification Request
            </button>
          </div>

          {/* Assets Table */}
          {assets.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">Documented Assets ({assets.length})</h3>
                <button className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                  <Download className="h-4 w-4" /> Download Report
                </button>
              </div>
              <div className="legacy-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-low">
                    <tr className="text-left">
                      <th className="py-3 px-5 font-medium">Asset Name</th>
                      <th className="font-medium">Type</th>
                      <th className="font-medium">Value (₹)</th>
                      <th className="font-medium">Allocation %</th>
                      <th className="font-medium pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <AssetRow key={asset.id} asset={asset} planId={activePlan.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}

      {/* Dialogs */}
      <NewPlanDialog open={planDialogOpen} onOpenChange={setPlanDialogOpen} />
      {activePlan && (
        <GuardianDialog
          open={guardianDialogOpen}
          onOpenChange={setGuardianDialogOpen}
          planId={activePlan.id}
          mode="add"
        />
      )}
      {activePlan && editingGuardian && (
        <GuardianDialog
          open={!!editingGuardian}
          onOpenChange={(open) => { if (!open) setEditingGuardian(null); }}
          planId={activePlan.id}
          mode="edit"
          guardian={editingGuardian}
        />
      )}
      {activePlan && (
        <NewAssetDialog
          open={assetDialogOpen}
          onOpenChange={setAssetDialogOpen}
          planId={activePlan.id}
        />
      )}
    </div>
  );
}

// ─── Plan Dialog ───────────────────────────────────────────────────────────────
function NewPlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Plan title is required"); return; }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionPlan({ title, description, status: "Draft", priority: "High" });
      if (!result) { toast.error("Failed to create plan"); return; }
      toast.success("Plan created");
      await qc.invalidateQueries({ queryKey: ["successionPlans"] });
      onOpenChange(false);
      setTitle(""); setDescription("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create plan");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Create Succession Plan</DialogTitle>
        <div className="bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Create Succession Plan</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Plan Title *">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Primary Succession Plan" className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add notes..." className={inputCls} rows={3} />
          </Field>
        </div>
        <DialogFooter saving={saving} onCancel={() => onOpenChange(false)} onSave={handleSave} saveLabel="Create Plan" />
      </DialogContent>
    </Dialog>
  );
}

// ─── Guardian Dialog (Add + Edit) ──────────────────────────────────────────────
interface GuardianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  mode: "add" | "edit";
  guardian?: SuccessionGuardian;
}

function GuardianDialog({ open, onOpenChange, planId, mode, guardian }: GuardianDialogProps) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(guardian?.name ?? "");
  const [role, setRole] = useState<SuccessionGuardian["role"]>(guardian?.role ?? "Primary Guardian");
  const [relationship, setRelationship] = useState(guardian?.relationship ?? "");
  const [phone, setPhone] = useState(guardian?.phone ?? "");
  const [email, setEmail] = useState(guardian?.email ?? "");
  const [responsibilities, setResponsibilities] = useState<string[]>(guardian?.responsibilities ?? []);

  // Reset when guardian changes (switching edit targets)
  React.useEffect(() => {
    setName(guardian?.name ?? "");
    setRole(guardian?.role ?? "Primary Guardian");
    setRelationship(guardian?.relationship ?? "");
    setPhone(guardian?.phone ?? "");
    setEmail(guardian?.email ?? "");
    setResponsibilities(guardian?.responsibilities ?? []);
  }, [guardian]);

  const toggleResp = (r: string) =>
    setResponsibilities(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Guardian name is required"); return; }
    setSaving(true);
    try {
      if (mode === "edit" && guardian) {
        const result = await dataService.updateSuccessionGuardian(guardian.id, { name, role, relationship, phone, email, responsibilities });
        if (!result) { toast.error("Failed to update guardian"); return; }
        toast.success("Guardian updated");
      } else {
        const result = await dataService.createSuccessionGuardian({
          planId, name, role, relationship, phone, email, responsibilities,
          personId: undefined, orderIndex: undefined,
        });
        if (!result) { toast.error("Failed to add guardian"); return; }
        void dataService.markSectionComplete("succession");
        toast.success("Guardian added");
      }
      await qc.invalidateQueries({ queryKey: ["successionGuardians", planId] });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(mode === "edit" ? "Failed to update guardian" : "Failed to add guardian");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">{mode === "edit" ? "Edit Guardian" : "Add Guardian"}</DialogTitle>
        <div className="bg-card border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold">{mode === "edit" ? "Edit Guardian" : "Add Guardian"}</h2>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <Field label="Full Name *">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputCls} />
          </Field>
          <Field label="Role">
            <select value={role} onChange={e => setRole(e.target.value as SuccessionGuardian["role"])} className={inputCls}>
              <option value="Primary Guardian">Primary Guardian</option>
              <option value="Alternate Guardian">Alternate Guardian</option>
              <option value="Successor Guardian">Successor Guardian</option>
              <option value="Legal Guardian">Legal Guardian</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Relationship">
              <input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g., Brother" className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className={inputCls} />
          </Field>
          <Field label="Responsibilities (select all that apply)">
            <div className="grid grid-cols-2 gap-2 mt-1">
              {RESPONSIBILITIES.map(r => {
                const checked = responsibilities.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleResp(r)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium text-left transition-all ${
                      checked
                        ? `${RESP_COLORS[r]} border-current`
                        : "border-border text-muted-foreground hover:bg-surface-low"
                    }`}
                  >
                    {checked
                      ? <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                      : <Square className="h-3.5 w-3.5 shrink-0" />
                    }
                    {r}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <DialogFooter
          saving={saving}
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
          saveLabel={mode === "edit" ? "Save Changes" : "Add Guardian"}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Asset Dialog ─────────────────────────────────────────────────────────────
function NewAssetDialog({ open, onOpenChange, planId }: { open: boolean; onOpenChange: (open: boolean) => void; planId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<SuccessionAsset["assetType"]>("Bank Account");
  const [assetValue, setAssetValue] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState("");

  const handleSave = async () => {
    if (!assetName.trim()) { toast.error("Asset name is required"); return; }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionAsset({
        planId, assetName, assetType,
        assetValue: assetValue ? parseFloat(assetValue) : undefined,
        allocationPercentage: allocationPercentage ? parseFloat(allocationPercentage) : undefined,
        assignedGuardianId: undefined, notes: undefined,
      });
      if (!result) { toast.error("Failed to add asset"); return; }
      toast.success("Asset added");
      await qc.invalidateQueries({ queryKey: ["successionAssets", planId] });
      onOpenChange(false);
      setAssetName(""); setAssetType("Bank Account"); setAssetValue(""); setAllocationPercentage("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add asset");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Add Asset</DialogTitle>
        <div className="bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Asset</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Field label="Asset Name *">
            <input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g., SBI Savings Account" className={inputCls} />
          </Field>
          <Field label="Asset Type">
            <select value={assetType} onChange={e => setAssetType(e.target.value as SuccessionAsset["assetType"])} className={inputCls}>
              <option value="Bank Account">Bank Account</option>
              <option value="Investments">Investments</option>
              <option value="Property">Property</option>
              <option value="Schemes">Schemes</option>
              <option value="Insurance">Insurance</option>
              <option value="Custody">Custody</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Value (₹)">
              <input type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Allocation %">
              <input type="number" value={allocationPercentage} onChange={e => setAllocationPercentage(e.target.value)} placeholder="0-100" min="0" max="100" className={inputCls} />
            </Field>
          </div>
        </div>
        <DialogFooter saving={saving} onCancel={() => onOpenChange(false)} onSave={handleSave} saveLabel="Add Asset" />
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty Guardian Card ──────────────────────────────────────────────────────
function EmptyGuardianCard({ slot, onAdd }: { slot: "Primary" | "Secondary" | "Legal"; onAdd: () => void }) {
  const colors = {
    Primary: "border-t-primary-soft",
    Secondary: "border-t-gold",
    Legal: "border-t-blue-400",
  };
  return (
    <div className={`rounded-2xl border-2 border-dashed border-border border-t-4 ${colors[slot]} p-6 flex flex-col`}>
      <span className="inline-flex items-center self-start rounded-full bg-surface-container px-3 py-1 text-xs font-medium">
        {slot}
      </span>
      <div className="mt-8 flex-1 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-full bg-surface-container flex items-center justify-center text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <div className="mt-3 font-semibold">Assign {slot} Guardian</div>
        <p className="mt-1 text-xs text-muted-foreground max-w-[180px]">
          {slot === "Primary" && "Main caregiver responsible for daily care."}
          {slot === "Secondary" && "Backup caregiver when primary is unavailable."}
          {slot === "Legal" && "Legally designated guardian for official matters."}
        </p>
        <button
          onClick={onAdd}
          className="mt-4 rounded-lg border border-primary text-primary font-semibold px-4 py-2 text-sm hover:bg-primary/5 transition-colors"
        >
          Add Guardian
        </button>
      </div>
    </div>
  );
}

// ─── Guardian Card ─────────────────────────────────────────────────────────────
function GuardianCard({ guardian, planId, slot, slotLabel, onEdit }: { guardian: SuccessionGuardian; planId: string; slot: "Primary" | "Secondary" | "Legal"; slotLabel?: string; onEdit: () => void }) {
  const qc = useQueryClient();
  const toneMap = {
    Primary: { top: "border-t-primary-soft", badge: "bg-primary-soft/15 text-primary" },
    Secondary: { top: "border-t-gold", badge: "bg-gold-soft text-foreground/80" },
    Legal: { top: "border-t-blue-400", badge: "bg-blue-50 text-blue-700" },
  };
  const { top: topClass, badge: badgeCls } = toneMap[slot];
  const displayLabel = slotLabel ?? slot;

  const handleDelete = async () => {
    if (!confirm(`Delete ${guardian.name}?`)) return;
    const ok = await dataService.deleteSuccessionGuardian(guardian.id);
    if (ok) { toast.success("Guardian deleted"); await qc.invalidateQueries({ queryKey: ["successionGuardians", planId] }); }
    else toast.error("Failed to delete guardian");
  };

  return (
    <div className={`legacy-card p-5 border-t-4 ${topClass}`}>
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeCls}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="text-muted-foreground hover:text-primary transition-colors" title="Edit guardian">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={handleDelete} className="text-muted-foreground hover:text-red-600 transition-colors" title="Delete guardian">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProfileImagePicker
          entityType="guardian"
          entityId={guardian.id}
          initials={guardian.name.charAt(0).toUpperCase()}
          size={56}
          avatarColor="#e07b2a"
        />
        <div>
          <div className="text-lg font-semibold">{guardian.name}</div>
          <div className="text-xs text-muted-foreground">{guardian.relationship || "—"}</div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-foreground/80">
          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
          {guardian.phone || "No phone"}
        </div>
        <div className="flex items-center gap-2 text-foreground/80">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          {guardian.email || "No email"}
        </div>
      </div>
      <hr className="my-4 border-border" />
      {guardian.responsibilities && guardian.responsibilities.length > 0 ? (
        <div>
          <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Responsibilities</div>
          <div className="flex flex-wrap gap-1.5">
            {guardian.responsibilities.map(r => (
              <span key={r} className={`rounded-md px-2 py-0.5 text-xs font-medium ${RESP_COLORS[r] ?? "bg-surface-low text-foreground"}`}>
                {r}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-success" /> {guardian.role}
        </div>
      )}
    </div>
  );
}

// ─── Guardian Row ─────────────────────────────────────────────────────────────
function GuardianRow({ guardian, planId, onEdit }: { guardian: SuccessionGuardian; planId: string; onEdit: () => void }) {
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!confirm(`Delete ${guardian.name}?`)) return;
    const ok = await dataService.deleteSuccessionGuardian(guardian.id);
    if (ok) { toast.success("Guardian deleted"); await qc.invalidateQueries({ queryKey: ["successionGuardians", planId] }); }
    else toast.error("Failed to delete guardian");
  };

  return (
    <tr className="border-t border-border hover:bg-surface-low/50">
      <td className="py-3 px-5 font-medium">{guardian.name}</td>
      <td className="text-muted-foreground">{guardian.role}</td>
      <td className="text-muted-foreground">{guardian.relationship || "—"}</td>
      <td className="text-muted-foreground">{guardian.email || "—"}</td>
      <td className="pr-5">
        <div className="flex items-center justify-end gap-3">
          <button onClick={onEdit} className="text-primary hover:text-primary/80 font-semibold text-xs inline-flex items-center gap-1">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-700 font-semibold text-xs inline-flex items-center gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Asset Row ────────────────────────────────────────────────────────────────
function AssetRow({ asset, planId }: { asset: SuccessionAsset; planId: string }) {
  const qc = useQueryClient();

  const handleDelete = async () => {
    if (!confirm(`Delete ${asset.assetName}?`)) return;
    const ok = await dataService.deleteSuccessionAsset(asset.id);
    if (ok) { toast.success("Asset deleted"); await qc.invalidateQueries({ queryKey: ["successionAssets", planId] }); }
    else toast.error("Failed to delete asset");
  };

  return (
    <tr className="border-t border-border hover:bg-surface-low/50">
      <td className="py-3 px-5 font-medium">{asset.assetName}</td>
      <td className="text-muted-foreground">{asset.assetType}</td>
      <td className="text-muted-foreground">{asset.assetValue ? `₹${asset.assetValue.toLocaleString()}` : "—"}</td>
      <td className="text-muted-foreground">{asset.allocationPercentage ? `${asset.allocationPercentage}%` : "—"}</td>
      <td className="pr-5">
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleDelete} className="text-red-600 hover:text-red-700 font-semibold text-xs inline-flex items-center gap-1">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function DialogFooter({ saving, onCancel, onSave, saveLabel }: { saving: boolean; onCancel: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
      <button onClick={onCancel} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors">
        Cancel
      </button>
      <button onClick={onSave} disabled={saving} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

function Ring78({ percentage }: { percentage: number }) {
  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16">
      <circle cx="40" cy="40" r="32" fill="none" stroke="var(--surface-container)" strokeWidth="8" />
      <circle
        cx="40" cy="40" r="32" fill="none" stroke="var(--primary-soft)" strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(percentage / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="46" textAnchor="middle" className="fill-foreground" style={{ fontSize: 18, fontWeight: 700 }}>
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}
