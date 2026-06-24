import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, AlertCircle, Loader2, FileCheck, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { dataService, type DisabilityDocument } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/disability-documents")({
  head: () => ({ meta: [{ title: "Disability Documents — LegacyNest" }] }),
  component: DisabilityDocumentsPage,
});

const INPUT = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";

const DISABILITY_TYPES = [
  "Autism Spectrum Disorder",
  "Intellectual Disability",
  "Down Syndrome",
  "Cerebral Palsy",
  "ADHD",
  "Hearing Impairment",
  "Visual Impairment",
  "Multiple Disabilities",
  "Speech & Language Disorder",
  "Physical Disability",
  "Learning Disability",
  "Mental Health Condition",
  "Other",
];

const DOCUMENT_TYPES = ["Disability Certificate", "UDID Card", "Both"];

function DisabilityDocumentsPage() {
  const qc = useQueryClient();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["disability-documents"],
    queryFn: () => dataService.listDisabilityDocuments(),
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<DisabilityDocument>>({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setDraft({ documentType: "Disability Certificate" });
    setEditingId(null);
    setOpenDialog(true);
  };

  const openEdit = (doc: DisabilityDocument) => {
    setDraft(doc);
    setEditingId(doc.id);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDraft({});
    setEditingId(null);
  };

  const save = async () => {
    if (!draft.documentType) {
      toast.error("Document type is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const ok = await dataService.updateDisabilityDocument(editingId, draft);
        if (!ok) {
          toast.error("Could not update document.");
          setSaving(false);
          return;
        }
      } else {
        const ok = await dataService.addDisabilityDocument(draft as Omit<DisabilityDocument, "id" | "userId">);
        if (!ok) {
          toast.error("Could not save document.");
          setSaving(false);
          return;
        }
      }
      qc.invalidateQueries({ queryKey: ["disability-documents"] });
      if (!editingId) void dataService.markSectionComplete("disability_documents");
      toast.success(editingId ? "Document updated" : "Document added");
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const ok = await dataService.deleteDisabilityDocument(id);
    if (ok) {
      qc.invalidateQueries({ queryKey: ["disability-documents"] });
      toast.success("Document deleted");
    } else {
      toast.error("Could not delete document.");
    }
  };

  const hasUDID = documents.some((d) => d.udidNumber);
  const hasDisabilityCert = documents.some((d) => d.disabilityPercentage);
  const expiredDocs = documents.filter((d) => d.expiryDate && new Date(d.expiryDate) < new Date());
  const expiringDocs = documents.filter(
    (d) => d.expiryDate &&
    new Date(d.expiryDate) > new Date() &&
    new Date(d.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-primary" /> Disability Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track UDID card, disability certificate, and expiry dates for government benefits and schemes.
        </p>
      </div>

      {/* Alerts */}
      {expiredDocs.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">{expiredDocs.length} document(s) have expired.</strong> Renew them immediately to maintain benefit eligibility.
          </div>
        </div>
      )}

      {expiringDocs.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
          <Clock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">{expiringDocs.length} document(s) expiring within 3 months.</strong> Start the renewal process now — paperwork takes time!
          </div>
        </div>
      )}

      {!hasUDID && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">UDID Card:</strong> The Unique Disability ID is your key to government schemes and tax benefits. Apply at <code className="text-xs bg-background px-1 rounded">swavlamban.gov.in</code> if you haven't already.
          </div>
        </div>
      )}

      {!hasDisabilityCert && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-foreground">Disability Certificate:</strong> Required for most government benefits, special education, tax deductions. Get from your state's medical board.
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="legacy-card overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <h2 className="text-base font-semibold">Your Documents</h2>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5"
          >
            <Plus className="h-4 w-4" /> Add Document
          </button>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No disability documents recorded yet. <button onClick={openAdd} className="text-primary hover:underline">Add your first document</button>.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{doc.documentType}</div>

                  {doc.disabilityType && (
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Type: <span className="font-medium">{doc.disabilityType}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 mt-2 text-xs">
                    {doc.disabilityPercentage && (
                      <div>
                        Disability %: <strong>{doc.disabilityPercentage}%</strong>
                      </div>
                    )}
                    {doc.udidNumber && (
                      <div>
                        UDID: <strong className="font-mono">{doc.udidNumber}</strong>
                      </div>
                    )}
                    {doc.certificateNumber && (
                      <div>
                        Cert #: <strong>{doc.certificateNumber}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    {doc.issueDate && <span>Issued: {new Date(doc.issueDate).toLocaleDateString("en-IN")}</span>}
                    {doc.certifyingAuthority && <span>Authority: {doc.certifyingAuthority}</span>}
                  </div>

                  {doc.expiryDate && (
                    <div className={`text-xs font-medium mt-2 ${
                      new Date(doc.expiryDate) < new Date()
                        ? "text-destructive"
                        : new Date(doc.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                        ? "text-warning"
                        : "text-success"
                    }`}>
                      Expires: {new Date(doc.expiryDate).toLocaleDateString("en-IN")}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(doc)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteDoc(doc.id)}
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
          <DialogTitle>{editingId ? "Edit Document" : "Add Disability Document"}</DialogTitle>
          <div className="space-y-4 mt-4">
            <Field label="Document Type *" htmlFor="docType">
              <select
                id="docType"
                className={INPUT}
                value={draft.documentType ?? ""}
                onChange={(e) => setDraft({ ...draft, documentType: e.target.value })}
              >
                <option value="">Select type</option>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Disability Type *" htmlFor="disabilityType">
              <select
                id="disabilityType"
                className={INPUT}
                value={draft.disabilityType ?? ""}
                onChange={(e) => setDraft({ ...draft, disabilityType: e.target.value })}
              >
                <option value="">Select disability type</option>
                {DISABILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="UDID Number" htmlFor="udid">
              <input
                id="udid"
                className={INPUT}
                value={draft.udidNumber ?? ""}
                onChange={(e) => setDraft({ ...draft, udidNumber: e.target.value })}
                placeholder="e.g. UD2024ABC12345"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Disability %" htmlFor="percentage">
                <input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  className={INPUT}
                  value={draft.disabilityPercentage ?? ""}
                  onChange={(e) => setDraft({ ...draft, disabilityPercentage: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0-100"
                />
              </Field>

              <Field label="Certificate #" htmlFor="certNum">
                <input
                  id="certNum"
                  className={INPUT}
                  value={draft.certificateNumber ?? ""}
                  onChange={(e) => setDraft({ ...draft, certificateNumber: e.target.value })}
                  placeholder="Cert number"
                />
              </Field>
            </div>

            <Field label="Certifying Authority" htmlFor="authority">
              <input
                id="authority"
                className={INPUT}
                value={draft.certifyingAuthority ?? ""}
                onChange={(e) => setDraft({ ...draft, certifyingAuthority: e.target.value })}
                placeholder="e.g. State Medical Board"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue Date" htmlFor="issueDate">
                <input
                  id="issueDate"
                  type="date"
                  className={INPUT}
                  value={draft.issueDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })}
                />
              </Field>

              <Field label="Expiry Date" htmlFor="expiryDate">
                <input
                  id="expiryDate"
                  type="date"
                  className={INPUT}
                  value={draft.expiryDate ?? ""}
                  onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes">
              <textarea
                id="notes"
                rows={2}
                className={INPUT}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Renewal status, benefits applied, etc..."
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
