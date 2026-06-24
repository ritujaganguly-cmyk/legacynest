/**
 * DataRights — Settings section for DPDP Act 2023 user rights.
 * Export data, delete account, view consent history.
 */
import { useState } from "react";
import { Download, Trash2, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { exportUserData, deleteAccount, withdrawConsent } from "@/lib/compliance";

export function DataRights() {
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting">("idle");
  const [confirmText, setConfirmText] = useState("");

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legacynest-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported. Check your downloads.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleteStep("deleting");
    try {
      const { success, error } = await deleteAccount();
      if (success) {
        toast.success("Account deletion requested. All data will be permanently removed.");
        window.location.assign("/");
      } else {
        toast.error(error ?? "Deletion failed. Contact support.");
        setDeleteStep("confirm");
      }
    } catch {
      toast.error("An error occurred. Please contact support.");
      setDeleteStep("confirm");
    }
  }

  return (
    <div className="space-y-4">

      {/* Law reference */}
      <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Your Data Rights</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Under the Digital Personal Data Protection Act 2023 and IT (SPDI) Rules 2011, you have the
            right to access, correct, export, and delete all personal data LegacyNest holds about you.
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl border border-border p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Export My Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download a complete copy of all data stored about you and your family in JSON format.
              Sensitive identifiers (Aadhaar numbers, bank account numbers) are excluded.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low disabled:opacity-50 transition-colors"
        >
          {exporting ? "Exporting…" : "Export"}
        </button>
      </div>

      {/* Consent history */}
      <div className="rounded-xl border border-border p-5 flex items-start gap-3">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Consent Record</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your consent to collect sensitive personal data was recorded when you first signed in.
            A timestamped record is stored in accordance with DPDP Act 2023.
          </p>
        </div>
      </div>

      {/* Delete account */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Delete Account & All Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes your account, child profile, medical records, financial data,
              legal documents, vault files, and all associated data. This cannot be undone.
            </p>
          </div>
        </div>

        {deleteStep === "idle" && (
          <button
            type="button"
            onClick={() => setDeleteStep("confirm")}
            className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4 inline mr-1.5" />
            Request Account Deletion
          </button>
        )}

        {deleteStep === "confirm" && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:border-destructive"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE"}
                className="rounded-lg bg-destructive text-white px-4 py-2 text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                Permanently Delete
              </button>
              <button
                type="button"
                onClick={() => { setDeleteStep("idle"); setConfirmText(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStep === "deleting" && (
          <p className="text-sm text-muted-foreground">Deleting your account…</p>
        )}
      </div>
    </div>
  );
}
