import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Heart, Users, FileText, CheckCircle, AlertCircle, Edit2, Trash2, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { dataService, type SuccessionPlan, type SuccessionGuardian, type SuccessionAsset, type SuccessionInstruction } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/succession")({
  head: () => ({ meta: [{ title: "Succession Planning — LegacyNest" }] }),
  component: Succession,
});

function Succession() {
  const [activeTab, setActiveTab] = useState("overview");
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [instructionDialogOpen, setInstructionDialogOpen] = useState(false);

  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ["successionPlans"],
    queryFn: () => dataService.listSuccessionPlans(),
  });

  const activePlan = plans.length > 0 ? plans[0] : null;

  // Auto-create a default plan silently on first visit
  useEffect(() => {
    if (plans.length === 0) {
      dataService.createSuccessionPlan({
        title: "My Child's Succession Plan",
        description: "Comprehensive plan for care continuity",
        status: "Draft",
        priority: "High",
      }).then(() => qc.invalidateQueries({ queryKey: ["successionPlans"] }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans.length]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Succession Planning</h1>
            <p className="text-sm text-muted-foreground mt-1">Secure your child's future with a comprehensive succession plan</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 relative">
        <Tabs defaultValue="overview" className="flex-1" onValueChange={setActiveTab}>
          <TabsList className="flex w-full gap-3 mb-0 bg-transparent p-0 items-end justify-between">
            <TabsTrigger value="overview" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 hover:bg-blue-50/50 transition-all group">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-foreground hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="guardians" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-green-50 hover:bg-green-50/50 transition-all group">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-bold text-foreground hidden sm:inline">Guardians</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-50 hover:bg-purple-50/50 transition-all group">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-foreground hidden sm:inline">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-50 hover:bg-red-50/50 transition-all group">
              <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs font-bold text-foreground hidden sm:inline">Instructions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-12">
            <OverviewTab activePlan={activePlan} onNewPlan={() => {}} />
          </TabsContent>

          <TabsContent value="guardians" className="pt-12">
            <GuardiansTab activePlan={activePlan} onAdd={() => setGuardianDialogOpen(true)} />
          </TabsContent>

          <TabsContent value="assets" className="pt-12">
            <AssetsTab activePlan={activePlan} onAdd={() => setAssetDialogOpen(true)} />
          </TabsContent>

          <TabsContent value="instructions" className="pt-12">
            <InstructionsTab activePlan={activePlan} onAdd={() => setInstructionDialogOpen(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {activePlan && <NewGuardianDialog open={guardianDialogOpen} onOpenChange={setGuardianDialogOpen} planId={activePlan.id} />}
      {activePlan && <NewAssetDialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen} planId={activePlan.id} />}
      {activePlan && <NewInstructionDialog open={instructionDialogOpen} onOpenChange={setInstructionDialogOpen} planId={activePlan.id} />}
    </div>
  );
}

// Dialog Components
function NewPlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", status: "Draft" as const, priority: "High" as const });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Plan title is required");
      return;
    }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionPlan(formData);
      if (!result) {
        toast.error("Failed to create plan");
        return;
      }
      toast.success("Plan created");
      await qc.invalidateQueries({ queryKey: ["successionPlans"] });
      onOpenChange(false);
      setFormData({ title: "", description: "", status: "Draft", priority: "High" });
    } catch {
      toast.error("Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">New Succession Plan</DialogTitle>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">New Succession Plan</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Plan Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Primary Succession Plan"
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes about this plan..."
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
                <option value="Active">Active</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating..." : "Create Plan"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGuardianDialog({ open, onOpenChange, planId }: { open: boolean; onOpenChange: (open: boolean) => void; planId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "Primary Guardian" as const, relationship: "", email: "" });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Guardian name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionGuardian({ ...formData, planId });
      if (!result) {
        toast.error("Failed to add guardian");
        return;
      }
      toast.success("Guardian added");
      await qc.invalidateQueries({ queryKey: ["successionGuardians", planId] });
      onOpenChange(false);
      setFormData({ name: "", role: "Primary Guardian", relationship: "", email: "" });
    } catch {
      toast.error("Failed to add guardian");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Add Guardian</DialogTitle>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Guardian</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Guardian Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Primary Guardian">Primary Guardian</option>
              <option value="Alternate Guardian">Alternate Guardian</option>
              <option value="Successor Guardian">Successor Guardian</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Relationship</label>
              <input
                type="text"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="e.g., Sibling"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Adding..." : "Add Guardian"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewAssetDialog({ open, onOpenChange, planId }: { open: boolean; onOpenChange: (open: boolean) => void; planId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ assetName: "", assetType: "Bank Account" as const, assetValue: "", allocationPercentage: "" });

  const handleSave = async () => {
    if (!formData.assetName.trim()) {
      toast.error("Asset name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionAsset({
        ...formData,
        planId,
        assetValue: formData.assetValue ? parseFloat(formData.assetValue) : undefined,
        allocationPercentage: formData.allocationPercentage ? parseFloat(formData.allocationPercentage) : undefined,
      });
      if (!result) {
        toast.error("Failed to add asset");
        return;
      }
      toast.success("Asset added");
      await qc.invalidateQueries({ queryKey: ["successionAssets", planId] });
      onOpenChange(false);
      setFormData({ assetName: "", assetType: "Bank Account", assetValue: "", allocationPercentage: "" });
    } catch {
      toast.error("Failed to add asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Add Asset</DialogTitle>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Asset</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Asset Name *</label>
            <input
              type="text"
              value={formData.assetName}
              onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
              placeholder="e.g., SBI Savings Account"
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Asset Type</label>
            <select
              value={formData.assetType}
              onChange={(e) => setFormData({ ...formData, assetType: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Bank Account">Bank Account</option>
              <option value="Investments">Investments</option>
              <option value="Property">Property</option>
              <option value="Schemes">Schemes</option>
              <option value="Insurance">Insurance</option>
              <option value="Custody">Custody</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Asset Value (₹)</label>
              <input
                type="number"
                value={formData.assetValue}
                onChange={(e) => setFormData({ ...formData, assetValue: e.target.value })}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary uppercase tracking-wider">Allocation %</label>
              <input
                type="number"
                value={formData.allocationPercentage}
                onChange={(e) => setFormData({ ...formData, allocationPercentage: e.target.value })}
                placeholder="0-100"
                min="0"
                max="100"
                className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Adding..." : "Add Asset"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewInstructionDialog({ open, onOpenChange, planId }: { open: boolean; onOpenChange: (open: boolean) => void; planId: string }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ instruction: "", category: "Healthcare" as const, priority: "High" as const });

  const handleSave = async () => {
    if (!formData.instruction.trim()) {
      toast.error("Instruction text is required");
      return;
    }
    setSaving(true);
    try {
      const result = await dataService.createSuccessionInstruction({ ...formData, planId });
      if (!result) {
        toast.error("Failed to add instruction");
        return;
      }
      toast.success("Instruction added");
      await qc.invalidateQueries({ queryKey: ["successionInstructions", planId] });
      onOpenChange(false);
      setFormData({ instruction: "", category: "Healthcare", priority: "High" });
    } catch {
      toast.error("Failed to add instruction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogTitle className="sr-only">Add Instruction</DialogTitle>
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Add Instruction</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Education">Education</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Residential">Residential</option>
              <option value="Financial">Financial</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Instruction *</label>
            <textarea
              value={formData.instruction}
              onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
              placeholder="Describe the instruction in detail..."
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-primary uppercase tracking-wider">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Adding..." : "Add Instruction"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Tab Components
function OverviewTab({ activePlan, onNewPlan }: { activePlan: SuccessionPlan | null; onNewPlan: () => void }) {
  const { data: guardians = [] } = useQuery({
    queryKey: ["successionGuardians", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionGuardians(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["successio Assets", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionAssets(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  const { data: instructions = [] } = useQuery({
    queryKey: ["successionInstructions", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionInstructions(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  return (
    <div className="space-y-6 relative">
      <div className="absolute -top-12 right-0">
        <button onClick={onNewPlan} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-4 w-4" /> New Plan
        </button>
      </div>

      {!activePlan ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No succession plan yet. Click <span className="font-semibold">New Plan</span> to create one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Plan Status</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-2xl font-bold text-blue-600 capitalize">{activePlan.status}</div>
                    <p className="text-xs text-muted-foreground">{activePlan.title}</p>
                  </div>
                </div>
                <div className="text-3xl">📋</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Guardians</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-2xl font-bold text-green-600">{guardians.length}</div>
                    <p className="text-xs text-muted-foreground">Assigned guardians</p>
                  </div>
                </div>
                <div className="text-3xl">👥</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Assets</h3>
                  <div className="mt-2 space-y-1">
                    <div className="text-2xl font-bold text-purple-600">{assets.length}</div>
                    <p className="text-xs text-muted-foreground">Assets documented</p>
                  </div>
                </div>
                <div className="text-3xl">💎</div>
              </div>
            </div>
          </div>

          {instructions.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <h3 className="font-semibold text-foreground mb-3">Key Instructions ({instructions.length})</h3>
              <div className="space-y-2">
                {instructions.slice(0, 3).map(inst => (
                  <div key={inst.id} className="flex items-start gap-2 text-sm">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{inst.category}</span>
                    <span className="text-muted-foreground">{inst.instruction}</span>
                  </div>
                ))}
                {instructions.length > 3 && <p className="text-xs text-muted-foreground mt-2">+{instructions.length - 3} more</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GuardiansTab({ activePlan, onAdd }: { activePlan: SuccessionPlan | null; onAdd: () => void }) {
  const qc = useQueryClient();
  const { data: guardians = [] } = useQuery({
    queryKey: ["successionGuardians", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionGuardians(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  if (!activePlan) {
    return <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">Create a plan first to add guardians.</div>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guardian?")) return;
    const result = await dataService.deleteSuccessionGuardian(id);
    if (result) {
      toast.success("Guardian deleted");
      await qc.invalidateQueries({ queryKey: ["successionGuardians", activePlan.id] });
    } else {
      toast.error("Failed to delete guardian");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="absolute -top-12 right-0">
        <button onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-4 w-4" /> Add Guardian
        </button>
      </div>

      {guardians.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No guardians assigned yet. Click <span className="font-semibold">Add Guardian</span> to assign one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guardians.map(guardian => (
            <div key={guardian.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{guardian.name}</h4>
                  <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                    <div>Role: <span className="font-medium">{guardian.role}</span></div>
                    {guardian.relationship && <div>Relation: {guardian.relationship}</div>}
                    {guardian.email && <div>Email: {guardian.email}</div>}
                  </div>
                </div>
                <button onClick={() => handleDelete(guardian.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetsTab({ activePlan, onAdd }: { activePlan: SuccessionPlan | null; onAdd: () => void }) {
  const qc = useQueryClient();
  const { data: assets = [] } = useQuery({
    queryKey: ["successionAssets", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionAssets(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  if (!activePlan) {
    return <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">Create a plan first to document assets.</div>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;
    const result = await dataService.deleteSuccessionAsset(id);
    if (result) {
      toast.success("Asset deleted");
      await qc.invalidateQueries({ queryKey: ["successionAssets", activePlan.id] });
    } else {
      toast.error("Failed to delete asset");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="absolute -top-12 right-0">
        <button onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No assets documented yet. Click <span className="font-semibold">Add Asset</span> to document one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map(asset => (
            <div key={asset.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{asset.assetName}</h4>
                  <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                    <div>Type: <span className="font-medium">{asset.assetType}</span></div>
                    {asset.assetValue && <div>Value: ₹{asset.assetValue.toLocaleString()}</div>}
                    {asset.allocationPercentage && <div>Allocation: {asset.allocationPercentage}%</div>}
                  </div>
                </div>
                <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstructionsTab({ activePlan, onAdd }: { activePlan: SuccessionPlan | null; onAdd: () => void }) {
  const qc = useQueryClient();
  const { data: instructions = [] } = useQuery({
    queryKey: ["successionInstructions", activePlan?.id],
    queryFn: () => activePlan ? dataService.listSuccessionInstructions(activePlan.id) : Promise.resolve([]),
    enabled: !!activePlan,
  });

  if (!activePlan) {
    return <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">Create a plan first to add instructions.</div>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this instruction?")) return;
    const result = await dataService.deleteSuccessionInstruction(id);
    if (result) {
      toast.success("Instruction deleted");
      await qc.invalidateQueries({ queryKey: ["successionInstructions", activePlan.id] });
    } else {
      toast.error("Failed to delete instruction");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="absolute -top-12 right-0">
        <button onClick={onAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-4 w-4" /> Add Instruction
        </button>
      </div>

      {instructions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No instructions documented yet. Click <span className="font-semibold">Add Instruction</span> to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map(instruction => (
            <div key={instruction.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">{instruction.category}</span>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">{instruction.priority}</span>
                  </div>
                  <p className="text-sm text-foreground">{instruction.instruction}</p>
                </div>
                <button onClick={() => handleDelete(instruction.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Succession;
