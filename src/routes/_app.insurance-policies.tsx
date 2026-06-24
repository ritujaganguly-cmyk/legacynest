import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, AlertCircle, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { dataService, type InsurancePolicy } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/insurance-policies")({
  head: () => ({ meta: [{ title: "Insurance Policies — LegacyNest" }] }),
  component: InsurancePoliciesPage,
});

const INPUT = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const POLICY_TYPES = [
  "Niramaya Health Insurance",
  "LIC Life Insurance",
  "PMJJBY (₹500k coverage)",
  "Term Insurance",
  "Health Insurance",
  "Disability Insurance",
  "Accident Insurance",
  "Other",
];

const PREMIUM_FREQUENCY = ["Annual", "Semi-annual", "Quarterly", "Monthly"];

function InsurancePoliciesPage() {
  const qc = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["insurance-policies"],
    queryFn: () => dataService.listInsurancePolicies(),
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<InsurancePolicy>>({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setDraft({ policyType: "Niramaya Health Insurance", premiumFrequency: "Annual" });
    setEditingId(null);
    setOpenDialog(true);
  };

  const openEdit = (policy: InsurancePolicy) => {
    setDraft(policy);
    setEditingId(policy.id);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDraft({});
    setEditingId(null);
  };

  const save = async () => {
    if (!draft.policyType || !draft.providerName?.trim()) {
      toast.error("Policy type and provider name are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const ok = await dataService.updateInsurancePolicy(editingId, draft);
        if (!ok) {
          toast.error("Could not update policy.");
          setSaving(false);
          return;
        }
      } else {
        const ok = await dataService.addInsurancePolicy(draft as Omit<InsurancePolicy, "id" | "userId">);
        if (!ok) {
          toast.error("Could not save policy.");
          setSaving(false);
          return;
        }
      }
      qc.invalidateQueries({ queryKey: ["insurance-policies"] });
      if (!editingId) void dataService.markSectionComplete("insurance");
      toast.success(editingId ? "Policy updated" : "Policy added");
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm("Delete this policy?")) return;
    const ok = await dataService.deleteInsurancePolicy(id);
    if (ok) {
      qc.invalidateQueries({ queryKey: ["insurance-policies"] });
      toast.success("Policy deleted");
    } else {
      toast.error("Could not delete policy.");
    }
  };

  const totalCoverage = policies.reduce((sum, p) => sum + (p.coverageAmount ?? 0), 0);
  const totalPremium = policies.reduce((sum, p) => sum + (p.premiumAmount ?? 0), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Insurance Policies
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track health, life, and disability insurance policies including Niramaya, LIC, and government schemes.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="legacy-card p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Coverage</div>
          <div className="text-3xl font-bold text-foreground mt-2">₹{(totalCoverage / 100000).toFixed(1)}L</div>
          <div className="text-xs text-muted-foreground mt-1">{policies.length} policy{policies.length !== 1 ? "ies" : ""}</div>
        </div>
        <div className="legacy-card p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Annual Premium</div>
          <div className="text-3xl font-bold text-foreground mt-2">₹{(totalPremium / 1000).toFixed(0)}K</div>
          <div className="text-xs text-muted-foreground mt-1">Next 12 months</div>
        </div>
      </div>

      {/* Info Alert — hide once Niramaya is added */}
      {!policies.some(p => p.policyType?.toLowerCase().includes("niramaya")) && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">Niramaya Health Insurance:</strong> Covers ₹1 lakh/year for UDID cardholders. Check eligibility via your state disability bureau. Most families don't claim this — don't leave money on the table!
          </div>
        </div>
      )}

      {/* Policies List */}
      <div className="legacy-card overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <h2 className="text-base font-semibold">Your Policies</h2>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5"
          >
            <Plus className="h-4 w-4" /> Add Policy
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No insurance policies recorded yet. <button onClick={openAdd} className="text-primary hover:underline">Add your first policy</button>.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {policies.map((policy) => (
              <div key={policy.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{policy.policyType}</div>
                  <div className="text-sm text-muted-foreground mt-1">{policy.providerName}</div>
                  {policy.policyNumber && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">Policy #:</span> {policy.policyNumber}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {policy.coverageAmount && (
                      <span>Coverage: <strong>₹{(policy.coverageAmount / 100000).toFixed(1)}L</strong></span>
                    )}
                    {policy.premiumAmount && (
                      <span>Premium: <strong>₹{policy.premiumAmount.toLocaleString("en-IN")}</strong></span>
                    )}
                  </div>
                  {policy.renewalReminderDate && (
                    <div className={`text-xs mt-2 font-medium ${new Date(policy.renewalReminderDate) < new Date() ? "text-destructive" : "text-primary"}`}>
                      Renewal: {new Date(policy.renewalReminderDate).toLocaleDateString("en-IN")}
                    </div>
                  )}
                  {policy.nomineeName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Nominee: {policy.nomineeName}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(policy)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deletePolicy(policy.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle>{editingId ? "Edit Policy" : "Add Insurance Policy"}</DialogTitle>
          <div className="space-y-4 mt-4">
            <Field label="Policy Type *" htmlFor="policyType">
              <select
                id="policyType"
                className={INPUT}
                value={draft.policyType ?? ""}
                onChange={(e) => setDraft({ ...draft, policyType: e.target.value })}
              >
                <option value="">Select type</option>
                {POLICY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Provider Name *" htmlFor="provider">
              <input
                id="provider"
                className={INPUT}
                value={draft.providerName ?? ""}
                onChange={(e) => setDraft({ ...draft, providerName: e.target.value })}
                placeholder="e.g. LIC, HDFC, ICICI, Religare"
              />
            </Field>

            <Field label="Policy Number" htmlFor="policyNum">
              <input
                id="policyNum"
                className={INPUT}
                value={draft.policyNumber ?? ""}
                onChange={(e) => setDraft({ ...draft, policyNumber: e.target.value })}
                placeholder="Your policy number"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Coverage Amount (₹)" htmlFor="coverage">
                <input
                  id="coverage"
                  type="number"
                  className={INPUT}
                  value={draft.coverageAmount ?? ""}
                  onChange={(e) => setDraft({ ...draft, coverageAmount: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 500000"
                />
              </Field>

              <Field label="Premium Amount (₹)" htmlFor="premium">
                <input
                  id="premium"
                  type="number"
                  className={INPUT}
                  value={draft.premiumAmount ?? ""}
                  onChange={(e) => setDraft({ ...draft, premiumAmount: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 5000"
                />
              </Field>
            </div>

            <Field label="Premium Frequency" htmlFor="frequency">
              <select
                id="frequency"
                className={INPUT}
                value={draft.premiumFrequency ?? ""}
                onChange={(e) => setDraft({ ...draft, premiumFrequency: e.target.value })}
              >
                <option value="">Select frequency</option>
                {PREMIUM_FREQUENCY.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" htmlFor="startDate">
                <input
                  id="startDate"
                  type="date"
                  className={INPUT}
                  value={draft.startDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                />
              </Field>

              <Field label="Maturity Date" htmlFor="maturityDate">
                <input
                  id="maturityDate"
                  type="date"
                  className={INPUT}
                  value={draft.maturityDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, maturityDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Renewal Reminder Date" htmlFor="renewalDate">
              <input
                id="renewalDate"
                type="date"
                className={INPUT}
                value={draft.renewalReminderDate ?? ""}
                onChange={(e) => setDraft({ ...draft, renewalReminderDate: e.target.value })}
              />
            </Field>

            <Field label="Nominee Name" htmlFor="nominee">
              <input
                id="nominee"
                className={INPUT}
                value={draft.nomineeName ?? ""}
                onChange={(e) => setDraft({ ...draft, nomineeName: e.target.value })}
                placeholder="Your child's name"
              />
            </Field>

            <Field label="Notes" htmlFor="notes">
              <textarea
                id="notes"
                rows={2}
                className={INPUT}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeDialog}
                className="rounded-lg px-4 py-2 text-sm font-semibold border border-border hover:bg-surface-low"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}
