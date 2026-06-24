import { ChapterBanner } from "@/components/ChapterBanner";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, X, Loader2, Heart, Pill, Users, ClipboardList, FileUp, AlertCircle, FileText, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  dataService,
  type MedicalRecord,
  type Medication,
  type Therapy,
  type HealthContact,
} from "@/lib/data/mock";

export const Route = createFileRoute("/_app/medical")({
  head: () => ({ meta: [{ title: "Medical Management — LegacyNest" }] }),
  component: Medical,
});

/* ─── helpers ─────────────────────────────────────────────────────────── */

function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{label}{required && " *"}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{label}{required && " *"}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function RowSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

/* ─── Reusable file upload field ─────────────────────────────────────── */

function FileUploadField({
  label, hint, file, error, onChange, onRemove, disabled, show = true,
}: {
  label: string; hint: string;
  file: File | null; error: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  disabled?: boolean; show?: boolean;
}) {
  if (!show) return null;
  const uid = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{label}</span>
      <div className="relative">
        <input type="file" id={uid} accept="application/pdf,image/jpeg,image/jpg"
          onChange={onChange} disabled={disabled} className="hidden" />
        <label htmlFor={uid}
          className="flex items-center gap-3 w-full rounded-lg border border-border bg-surface-low px-4 py-2.5 text-sm cursor-pointer hover:border-primary/40 hover:bg-card transition-all">
          <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className={file ? "text-foreground font-medium" : "text-muted-foreground"}>
            {file ? file.name : "Choose file…"}
          </span>
          {file && (
            <button type="button" onClick={(e) => { e.preventDefault(); onRemove(); }}
              className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {file && !error && <p className="text-xs text-success font-medium">✓ Ready to upload ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>}
    </div>
  );
}

/* ─── Sectioned card grid helper ─────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionedGrid({ future, past, renderCard }: {
  future: any[]; past: any[]; renderCard: (item: any) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {future.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            Upcoming ({future.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">{future.map(renderCard)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
            Past ({past.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">{past.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Medical Records tab ─────────────────────────────────────────────── */

const APPOINTMENT_TYPES = [
  "Doctor",
  "Clinic",
  "Psychiatrist",
  "Other"
];

function MedicalRecordsTab() {
  const qc = useQueryClient();
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["medicalRecords"],
    queryFn: () => dataService.listMedicalRecords(),
  });

  const { data: vaultDocs = [], isLoading: vaultLoading } = useQuery({
    queryKey: ["vaultDocuments"],
    queryFn: () => dataService.listVaultDocuments(),
  });

  type Draft = Omit<MedicalRecord, "id">;
  const empty: Draft = { title: "", category: "", doctor: "", recordDate: "", nextAppointment: "" };

  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Split and sort records into upcoming / past
  const todayAppt = new Date(); todayAppt.setHours(0,0,0,0);
  const getApptDate = (r: MedicalRecord) => r.recordDate ? new Date(r.recordDate) : null;
  const isApptFuture = (r: MedicalRecord) => { const d = getApptDate(r); d?.setHours(0,0,0,0); return !r.status && !!d && d > todayAppt; };
  const futureRecords = records.filter(isApptFuture).sort((a,b) => (getApptDate(a)?.getTime()||0) - (getApptDate(b)?.getTime()||0));
  const pastRecords   = records.filter(r => !isApptFuture(r)).sort((a,b) => (getApptDate(b)?.getTime()||0) - (getApptDate(a)?.getTime()||0));

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openAdd() {
    setEditing(null);
    setDraft(empty);
    setOpen(true);
  }

  function openEdit(rec: MedicalRecord) {
    setEditing(rec);
    const nextAppointmentValue = markingDone ? "" : (rec.nextAppointment ?? "");
    setDraft({ title: rec.title, category: rec.category, doctor: rec.doctor, recordDate: rec.recordDate, nextAppointment: nextAppointmentValue });
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    setSaving(true);
    try {
      // If marking as done/not done
      if (markingDone && editing) {
        // Create new record if next appointment is provided
        if (draft.nextAppointment) {
          const newRecord = await dataService.createMedicalRecord({
            title: editing.title,
            category: editing.category,
            doctor: editing.doctor,
            recordDate: draft.nextAppointment,
            nextAppointment: "",
          });

          if (!newRecord) {
            toast.error("Failed to create new appointment");
            setSaving(false);
            return;
          }
        }

        // Update current record with status and clear next appointment
        const updatedRecord = await dataService.updateMedicalRecord({
          ...editing,
          status: markingDone as "done" | "not_done",
          nextAppointment: "",
        });

        if (!updatedRecord) {
          toast.error("Failed to save appointment status");
          setSaving(false);
          return;
        }

        // Upload file to vault if one was selected and status is "done"
        if (selectedFile && (markingDone === "done" || editing?.status === "done")) {
          try {
            setUploadingFile(true);
            console.log("Uploading file:", selectedFile.name, "to medical record:", editing.id);
            const uploadResult = await dataService.uploadVaultFile(selectedFile, editing.id);
            if (!uploadResult) {
              toast.error("Failed to upload document to vault - no URL returned");
              setSaving(false);
              return;
            }

            console.log("File uploaded successfully:", uploadResult);

            // Extract the storage path from the upload result URL
            // URL format: https://...supabase.co/storage/v1/object/public/vault-documents/user_id/record_id/timestamp_filename
            const pathMatch = uploadResult.match(/\/public\/(.+?)(?:\?|$)/);
            const storagePath = pathMatch ? pathMatch[1] : null;

            if (!storagePath) {
              toast.error("Failed to determine storage path for document");
              setSaving(false);
              return;
            }

            // Add vault document entry linked to medical record
            const docResult = await dataService.addVaultDocument({
              name: selectedFile.name,
              category: "Medical",
              size: selectedFile.size,
              status: "active",
              isCriticalForEmergency: false,
              medicalRecordId: editing.id,
              storageBucketPath: storagePath,
            });

            if (!docResult) {
              toast.error("File uploaded but failed to create vault document entry");
              setSaving(false);
              return;
            }

            setSelectedFile(null);
            toast.success(`Appointment marked as done. Document uploaded to vault.`);
          } catch (err) {
            console.error("File upload error:", err);
            toast.error(`Failed to upload document: ${err instanceof Error ? err.message : "Unknown error"}`);
            setSaving(false);
            return;
          } finally {
            setUploadingFile(false);
          }
        } else if (draft.nextAppointment) {
          toast.success(`Appointment marked as ${markingDone}. New appointment created for ${draft.nextAppointment}`);
        } else {
          toast.success(`Appointment marked as ${markingDone}`);
        }
      } else {
        if (editing) {
          // If editing a record with done/not_done status and next appointment is provided, create new record
          if (editing.status && draft.nextAppointment) {
            const newRecord = await dataService.createMedicalRecord({
              title: editing.title,
              category: editing.category,
              doctor: editing.doctor,
              recordDate: draft.nextAppointment,
              nextAppointment: "",
            });

            if (!newRecord) {
              toast.error("Failed to create new appointment");
              setSaving(false);
              return;
            }
          }

          await dataService.updateMedicalRecord({ ...editing, ...draft });
          if (editing.status && draft.nextAppointment) {
            toast.success("Record updated and new appointment created");
          } else {
            toast.success("Record updated");
          }
        } else {
          await dataService.createMedicalRecord(draft);
          toast.success("Record added");
        }
      }
      await qc.invalidateQueries({ queryKey: ["medicalRecords"] });
      setOpen(false);
      setMarkingDone(null);
    } catch {
      toast.error("Failed to save record");
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError("");

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setFileError("Only PDF and JPG files are allowed");
      setSelectedFile(null);
      return;
    }

    // Validate file size (2MB = 2097152 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError(`File size must be less than 2MB (your file: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    try {
      await dataService.deleteMedicalRecord(id);
      await qc.invalidateQueries({ queryKey: ["medicalRecords"] });
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  }

  function renderApptCard(rec: MedicalRecord) {
    const apptDate = rec.recordDate ? new Date(rec.recordDate) : null;
    apptDate?.setHours(0,0,0,0);
    const isPastOrToday = apptDate && apptDate <= todayAppt;
    const isToday = apptDate?.toDateString() === todayAppt.toDateString();
    let dateLabel = "";
    if (apptDate && !isPastOrToday) {
      const days = Math.ceil((apptDate.getTime() - todayAppt.getTime()) / 86400000);
      dateLabel = days === 1 ? "Tomorrow" : days <= 30 ? `In ${days} days` : `In ${Math.ceil(days/7)} weeks`;
    } else if (isToday) {
      dateLabel = "Today";
    } else if (isPastOrToday && apptDate) {
      const ago = Math.ceil((todayAppt.getTime() - apptDate.getTime()) / 86400000);
      dateLabel = ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`;
    }
    const showMark = isPastOrToday && !rec.status;
    const docs = vaultDocs.filter(d => d.medicalRecordId === rec.id);
    const cardBg = rec.status === "done" ? "border-green-200 bg-green-50"
      : rec.status === "not_done" ? "border-red-200 bg-red-50"
      : isPastOrToday ? "border-amber-200 bg-amber-50"
      : "border-border bg-card hover:shadow-md";
    return (
      <div key={rec.id} className={`rounded-xl border p-4 transition-all ${cardBg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground">{rec.title}</h4>
              {rec.status ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.status === "done" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                  {rec.status === "done" ? "✓ Done" : "✗ Incomplete"}
                </span>
              ) : dateLabel ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPastOrToday ? "bg-amber-200 text-amber-800" : "bg-blue-100 text-blue-700"}`}>{dateLabel}</span>
              ) : null}
            </div>
            {rec.category && <div className="mt-1 text-xs text-muted-foreground">{rec.category}</div>}
            {rec.doctor && <div className="mt-1 text-sm text-muted-foreground">Dr. {rec.doctor}</div>}
            {rec.recordDate && <div className="mt-1 text-xs text-muted-foreground">{rec.recordDate}</div>}
            {docs.length > 0 && (
              <button onClick={async () => {
                const doc = docs[0]; if (!doc.storagePath) return;
                const url = await dataService.getVaultFileSignedUrl(doc.storagePath);
                if (url) { const a = document.createElement("a"); a.href = url; a.download = doc.name; a.target = "_blank"; a.click(); }
                else toast.error("Could not generate download link");
              }} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <FileText className="h-3.5 w-3.5" /> {docs[0].name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-low hover:text-primary transition-colors"><Edit2 className="h-4 w-4" /></button>
            <button onClick={() => handleDelete(rec.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        {showMark && (
          <div className="mt-3 pt-3 border-t border-amber-200 flex gap-2">
            <button onClick={() => { setMarkingDone("done"); openEdit(rec); }} className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">✓ Done</button>
            <button onClick={() => { setMarkingDone("not_done"); openEdit(rec); }} className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">✗ Not Done</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="absolute -top-12 right-0">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Appointment
        </button>
      </div>

      {isLoading ? (
        <RowSkeleton />
      ) : records.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
          No appointments yet. Click <span className="font-semibold">Add Appointment</span> to add one.
        </div>
      ) : (
        <SectionedGrid future={futureRecords} past={pastRecords} renderCard={renderApptCard} />
      )}

      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedFile(null);
          setFileError("");
          setMarkingDone(null);
        }
        setOpen(isOpen);
      }}>
        <DialogContent className="max-w-lg p-0">
          <div className="bg-card border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Appointment" : "Add Appointment"}
            </h2>
          </div>
          <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-5 space-y-4">
            {!markingDone ? (
              <>
                <SelectField
                  label="Appointment Type"
                  value={draft.title}
                  onChange={(v) => set("title", v)}
                  options={APPOINTMENT_TYPES}
                  required
                />
                <SelectField
                  label="Category"
                  value={draft.category}
                  onChange={(v) => set("category", v)}
                  options={["Neurology", "Therapy", "Allergy", "Cardiology", "General", "Pediatrics", "Surgery", "Other"]}
                />
                <InputField label="Doctor" value={draft.doctor} onChange={(v) => set("doctor", v)} />
                <InputField
                  label="Appointment Date"
                  value={draft.recordDate}
                  onChange={(v) => set("recordDate", v)}
                  type="date"
                />
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  {markingDone === "done" ? "Mark as Done" : "Mark as Not Done"}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {markingDone === "done"
                    ? "Optionally enter next appointment date and upload the completed medical record"
                    : "Optionally enter next appointment date"}
                </p>
              </div>
            )}

            {(markingDone || editing) && (
              <InputField
                label="Next Appointment"
                value={draft.nextAppointment}
                onChange={(v) => set("nextAppointment", v)}
                type="date"
              />
            )}

            {(markingDone || editing?.status === "done") && (
              <FileUploadField
                label="Attach Document (optional)"
                hint="PDF or JPG • Max 2MB — saved to Digital Vault"
                file={selectedFile}
                error={fileError}
                onChange={handleFileSelect}
                onRemove={() => { setSelectedFile(null); setFileError(""); }}
                disabled={uploadingFile}
                show={markingDone !== "not_done"}
              />
            )}
          </div>
          <div className="bg-card border-t border-border px-6 py-4 flex justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
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
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Medications tab ─────────────────────────────────────────────────── */

function MedicationsTab() {
  const qc = useQueryClient();
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: () => dataService.listMedications(),
  });

  type Draft = Omit<Medication, "id">;
  const empty: Draft = { name: "", dose: "", frequency: "", tillDate: "", notes: "" };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openAdd() {
    setEditing(null);
    setDraft(empty);
    setOpen(true);
  }

  function openEdit(med: Medication) {
    setEditing(med);
    setDraft({ name: med.name, dose: med.dose, frequency: med.frequency, tillDate: med.tillDate ?? "", notes: med.notes ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Please enter medication name.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const result = await dataService.updateMedication({ ...editing, ...draft });
        if (!result) {
          toast.error("Failed to save medication");
          setSaving(false);
          return;
        }
        toast.success("Medication updated");
      } else {
        const result = await dataService.createMedication(draft);
        if (!result) {
          toast.error("Failed to save medication");
          setSaving(false);
          return;
        }
        void dataService.markSectionComplete("medical");
        toast.success("Medication added");
      }
      await qc.invalidateQueries({ queryKey: ["medications"] });
      setOpen(false);
    } catch {
      toast.error("Failed to save medication");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this medication?")) return;
    try {
      await dataService.deleteMedication(id);
      await qc.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Medication deleted");
    } catch {
      toast.error("Failed to delete medication");
    }
  }

  return (
    <div className="space-y-4 relative">
      <div className="absolute -top-12 right-0">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Medication
        </button>
      </div>
      {isLoading ? (
        <RowSkeleton />
      ) : medications.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No medications yet. Click <span className="font-semibold">Add Medication</span> to add one.
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const active = medications.filter(med => !med.tillDate || new Date(med.tillDate) >= today);
            const expired = medications.filter(med => med.tillDate && new Date(med.tillDate) < today);

            return (
              <>
                {active.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Active Medications</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {active.map((med) => (
                        <div key={med.id} className="rounded-xl border border-green-200 bg-green-50 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{med.name}</h4>
                              <div className="mt-1.5 text-xs text-muted-foreground">
                                {med.dose && <span>{med.dose}</span>}
                                {med.dose && med.frequency && <span> • </span>}
                                {med.frequency && <span>{med.frequency}</span>}
                              </div>
                              {med.tillDate && <div className="mt-1.5 text-xs font-medium text-green-700">Till: {med.tillDate}</div>}
                              {med.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{med.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => openEdit(med)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-green-100 hover:text-primary transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(med.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expired.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">Past Dated Medications</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {expired.map((med) => (
                        <div key={med.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 hover:shadow-md transition-shadow opacity-75">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground line-through">{med.name}</h4>
                              <div className="mt-1.5 text-xs text-muted-foreground">
                                {med.dose && <span>{med.dose}</span>}
                                {med.dose && med.frequency && <span> • </span>}
                                {med.frequency && <span>{med.frequency}</span>}
                              </div>
                              {med.tillDate && <div className="mt-1.5 text-xs font-medium text-amber-700">Till: {med.tillDate} • EXPIRED</div>}
                              {med.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{med.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => openEdit(med)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-amber-100 hover:text-primary transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(med.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Medication" : "Add Medication"}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <InputField label="Medication Name" value={draft.name} onChange={(v) => set("name", v)} required />
            <InputField label="Dose" value={draft.dose} onChange={(v) => set("dose", v)} />
            <InputField label="Frequency" value={draft.frequency} onChange={(v) => set("frequency", v)} />
            <InputField label="Till Date" value={draft.tillDate} onChange={(v) => set("tillDate", v)} type="date" />
            <InputField label="Notes" value={draft.notes} onChange={(v) => set("notes", v)} />
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
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
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Therapies tab ─────────────────────────────────────────────────── */

const THERAPY_TYPES = [
  "Occupational Therapy",
  "Physical Therapy",
  "Speech Therapy",
  "Behavioral Therapy",
  "Cognitive Behavioral Therapy",
  "Psychotherapy",
  "Music Therapy",
  "Art Therapy",
  "Aquatic Therapy",
  "Equine Therapy",
  "Other"
];

function TherapiesTab() {
  const qc = useQueryClient();
  const { data: therapies = [], isLoading } = useQuery({
    queryKey: ["therapies"],
    queryFn: () => dataService.listTherapies(),
  });
  const { data: vaultDocs = [] } = useQuery({
    queryKey: ["vaultDocuments"],
    queryFn: () => dataService.listVaultDocuments(),
  });

  type Draft = Omit<Therapy, "id">;
  const empty: Draft = { name: "", specialty: "", therapistName: "", therapistRole: "", nextSession: "", status: undefined };

  const [markingDone, setMarkingDone] = useState<"done" | "not_done" | null>(null);
  const [nextSessionForNew, setNextSessionForNew] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Therapy | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  // Split and sort therapies into upcoming / past
  const todayTh = new Date(); todayTh.setHours(0,0,0,0);
  const getThDate = (t: Therapy) => { const d = t.nextSession ? new Date(t.nextSession) : null; d?.setHours(0,0,0,0); return d; };
  const isThFuture = (t: Therapy) => { const d = getThDate(t); return !t.status && !!d && d > todayTh; };
  const futureTherapies = therapies.filter(isThFuture).sort((a,b) => (getThDate(a)?.getTime()||0) - (getThDate(b)?.getTime()||0));
  const pastTherapies   = therapies.filter(t => !isThFuture(t)).sort((a,b) => (getThDate(b)?.getTime()||0) - (getThDate(a)?.getTime()||0));

  function openAdd() {
    setEditing(null); setDraft(empty); setMarkingDone(null);
    setNextSessionForNew(""); setSelectedFile(null); setFileError("");
    setOpen(true);
  }

  function openEdit(therapy: Therapy) {
    setEditing(therapy);
    setDraft({ name: therapy.name, specialty: therapy.specialty, therapistName: therapy.therapistName, therapistRole: therapy.therapistRole, nextSession: therapy.nextSession, status: therapy.status });
    setMarkingDone(null); setNextSessionForNew(""); setSelectedFile(null); setFileError("");
    setOpen(true);
  }

  function openMarkDone(therapy: Therapy, outcome: "done" | "not_done") {
    setEditing(therapy);
    setDraft({ name: therapy.name, specialty: therapy.specialty, therapistName: therapy.therapistName, therapistRole: therapy.therapistRole, nextSession: "", status: outcome });
    setMarkingDone(outcome); setNextSessionForNew(""); setSelectedFile(null); setFileError("");
    setOpen(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    if (!["application/pdf","image/jpeg","image/jpg"].includes(file.type)) { setFileError("Only PDF and JPG allowed"); setSelectedFile(null); return; }
    if (file.size > 2 * 1024 * 1024) { setFileError(`Max 2MB (yours: ${(file.size/1024/1024).toFixed(1)}MB)`); setSelectedFile(null); return; }
    setSelectedFile(file);
  }

  async function handleSave() {
    if (!draft.name.trim()) { toast.error("Please enter therapy name."); return; }
    setSaving(true);
    try {
      if (markingDone && editing) {
        // Mark current session with outcome
        await dataService.updateTherapy({ ...editing, status: markingDone, nextSession: "" });

        // Create new session if next date provided
        if (nextSessionForNew) {
          await dataService.createTherapy({
            name: editing.name, specialty: editing.specialty,
            therapistName: editing.therapistName, therapistRole: editing.therapistRole,
            nextSession: nextSessionForNew, status: undefined,
          });
        }

        // Upload session notes to vault if done + file attached
        if (markingDone === "done" && selectedFile) {
          setUploadingFile(true);
          try {
            const doc = await dataService.addVaultDocument({
              name: selectedFile.name, category: "Medical",
              notes: `Session notes — ${editing.name}`,
              therapyId: editing.id,
            });
            if (doc) await dataService.uploadVaultFile(selectedFile, doc.id);
          } finally { setUploadingFile(false); }
        }

        toast.success(nextSessionForNew
          ? `Session marked ${markingDone === "done" ? "done" : "not done"}. Next session scheduled.`
          : `Session marked ${markingDone === "done" ? "done" : "not done"}.`);
      } else if (editing) {
        await dataService.updateTherapy({ ...editing, ...draft });
        // Upload notes if editing a done session with a file attached
        if (editing.status === "done" && selectedFile) {
          setUploadingFile(true);
          try {
            const doc = await dataService.addVaultDocument({
              name: selectedFile.name, category: "Medical",
              notes: `Session notes — ${editing.name}`, therapyId: editing.id,
            });
            if (doc) await dataService.uploadVaultFile(selectedFile, doc.id);
          } finally { setUploadingFile(false); }
        }
        toast.success("Therapy updated");
      } else {
        await dataService.createTherapy(draft);
        toast.success("Therapy added");
      }
      await qc.invalidateQueries({ queryKey: ["therapies"] });
      setOpen(false);
    } catch {
      toast.error("Failed to save therapy");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this therapy?")) return;
    await dataService.deleteTherapy(id);
    await qc.invalidateQueries({ queryKey: ["therapies"] });
    toast.success("Therapy deleted");
  }

  function renderTherapyCard(therapy: Therapy) {
    const sessionDate = getThDate(therapy); sessionDate?.setHours(0,0,0,0);
    const isPast = sessionDate && sessionDate < todayTh;
    const isToday = sessionDate?.toDateString() === todayTh.toDateString();
    const showMark = (isPast || isToday) && !therapy.status;
    const docs = vaultDocs.filter(d => d.therapyId === therapy.id);
    let dateLabel = "";
    if (sessionDate && !therapy.status) {
      const days = Math.ceil((sessionDate.getTime() - todayTh.getTime()) / 86400000);
      if (days < 0) { const ago = Math.abs(days); dateLabel = ago === 1 ? "Yesterday" : `${ago} days ago`; }
      else if (days === 0) dateLabel = "Today";
      else if (days === 1) dateLabel = "Tomorrow";
      else if (days <= 30) dateLabel = `In ${days} days`;
      else dateLabel = `In ${Math.ceil(days / 7)} weeks`;
    }
    const cardBg = therapy.status === "done" ? "border-green-200 bg-green-50"
      : therapy.status === "not_done" ? "border-red-200 bg-red-50"
      : isPast ? "border-amber-200 bg-amber-50"
      : "border-border bg-card hover:shadow-md";
    return (
      <div key={therapy.id} className={`rounded-xl border p-4 transition-all ${cardBg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground">{therapy.name}</h4>
              {therapy.status ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${therapy.status === "done" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                  {therapy.status === "done" ? "✓ Done" : "✗ Not Done"}
                </span>
              ) : dateLabel ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPast || isToday ? "bg-amber-200 text-amber-800" : "bg-blue-100 text-blue-700"}`}>{dateLabel}</span>
              ) : null}
            </div>
            {therapy.therapistName && <div className="mt-1 text-sm text-muted-foreground"><strong>{therapy.therapistName}</strong></div>}
            {therapy.specialty && <div className="mt-0.5 text-xs text-muted-foreground">{therapy.specialty}</div>}
            {therapy.nextSession && <div className="mt-1 text-xs text-muted-foreground">Session: {therapy.nextSession}</div>}
            {docs.length > 0 && (
              <button onClick={async () => {
                const doc = docs[0]; if (!doc.storagePath) return;
                const url = await dataService.getVaultFileSignedUrl(doc.storagePath);
                if (url) { const a = document.createElement("a"); a.href = url; a.download = doc.name; a.target = "_blank"; a.click(); }
                else toast.error("Could not generate download link");
              }} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <FileText className="h-3.5 w-3.5" /> {docs[0].name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => openEdit(therapy)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-low hover:text-primary transition-colors"><Edit2 className="h-4 w-4" /></button>
            <button onClick={() => handleDelete(therapy.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        {showMark && (
          <div className="mt-3 pt-3 border-t border-amber-200 flex gap-2">
            <button onClick={() => openMarkDone(therapy, "done")} className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors">✓ Done</button>
            <button onClick={() => openMarkDone(therapy, "not_done")} className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors">✗ Not Done</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="absolute -top-12 right-0">
        <button onClick={openAdd} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          <Plus className="h-4 w-4" /> Add Therapy
        </button>
      </div>
      {isLoading ? (
        <RowSkeleton />
      ) : therapies.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No therapies yet. Click <span className="font-semibold">Add Therapy</span> to add one.
        </div>
      ) : (
        <SectionedGrid future={futureTherapies} past={pastTherapies} renderCard={renderTherapyCard} />
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setMarkingDone(null); setSelectedFile(null); setFileError(""); } setOpen(o); }}>
        <DialogContent className="max-w-lg p-0">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              {markingDone ? `Mark Session as ${markingDone === "done" ? "Done" : "Not Done"}` : editing ? "Edit Therapy" : "Add Therapy"}
            </h2>
          </div>
          <div className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-5 space-y-4">
            {markingDone ? (
              // Mark done/not-done dialog
              <>
                <div className="rounded-lg bg-surface-low border border-border p-3 text-sm">
                  <span className="font-semibold">{editing?.name}</span>
                  {editing?.therapistName && <span className="text-muted-foreground"> · {editing.therapistName}</span>}
                  {editing?.nextSession && <span className="text-muted-foreground"> · {editing.nextSession}</span>}
                </div>
                <InputField
                  label="Next Session Date (optional — creates new entry)"
                  value={nextSessionForNew}
                  onChange={setNextSessionForNew}
                  type="date"
                />
                {markingDone === "done" && (
                  <FileUploadField
                    label="Session Notes / Report (optional)"
                    hint="PDF or JPG • Max 2MB — saved to Digital Vault"
                    file={selectedFile}
                    error={fileError}
                    onChange={handleFileSelect}
                    onRemove={() => { setSelectedFile(null); setFileError(""); }}
                    disabled={uploadingFile}
                  />
                )}
              </>
            ) : (
              // Add / Edit dialog
              <>
                <SelectField label="Therapy Type" value={draft.name} onChange={(v) => set("name", v)} options={THERAPY_TYPES} required />
                <InputField label="Therapist Name" value={draft.therapistName} onChange={(v) => set("therapistName", v)} />
                <SelectField label="Specialty" value={draft.specialty} onChange={(v) => set("specialty", v)}
                  options={["Occupational","Physical","Speech","Behavioral","Cognitive","Music","Art","Aquatic","Other"]} />
                <InputField label="Next Session" value={draft.nextSession} onChange={(v) => set("nextSession", v)} type="date" />
                {editing?.status === "done" && (
                  <FileUploadField
                    label="Upload Session Notes (optional)"
                    hint="PDF or JPG • Max 2MB — saved to Digital Vault"
                    file={selectedFile}
                    error={fileError}
                    onChange={handleFileSelect}
                    onRemove={() => { setSelectedFile(null); setFileError(""); }}
                    disabled={uploadingFile}
                  />
                )}
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-low transition-colors" disabled={saving}>Cancel</button>
            <button onClick={handleSave} disabled={saving || uploadingFile}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
              {(saving || uploadingFile) && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadingFile ? "Uploading..." : saving ? "Saving..." : markingDone ? `Mark ${markingDone === "done" ? "Done" : "Not Done"}` : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Emergency Contacts tab ──────────────────────────────────────────── */

const CONTACT_TYPES = [
  "Doctor",
  "Therapist",
  "Lab Assistant",
  "Family Member"
];

function HealthContactsTab() {
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["healthContacts"],
    queryFn: () => dataService.listHealthContacts(),
  });

  type Draft = Omit<HealthContact, "id">;
  const empty: Draft = { name: "", role: "", facility: "", phone: "", isPrimary: false, initials: "" };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HealthContact | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function openAdd() {
    setEditing(null);
    setDraft(empty);
    setOpen(true);
  }

  function openEdit(contact: HealthContact) {
    setEditing(contact);
    setDraft({ name: contact.name, role: contact.role, facility: contact.facility, phone: contact.phone, isPrimary: contact.isPrimary, initials: contact.initials });
    setOpen(true);
  }

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Please enter contact name.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await dataService.updateHealthContact({ ...editing, ...draft });
        toast.success("Contact updated");
      } else {
        await dataService.createHealthContact(draft);
        toast.success("Contact added");
      }
      await qc.invalidateQueries({ queryKey: ["healthContacts"] });
      setOpen(false);
    } catch {
      toast.error("Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    try {
      await dataService.deleteHealthContact(id);
      await qc.invalidateQueries({ queryKey: ["healthContacts"] });
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    }
  }

  return (
    <div className="space-y-4 relative">
      <div className="absolute -top-12 right-0">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>
      {isLoading ? (
        <RowSkeleton />
      ) : contacts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          No emergency contacts yet. Click <span className="font-semibold">Add Contact</span> to add one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {contact.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{contact.name}</h4>
                  {contact.role && <div className="text-xs text-muted-foreground">{contact.role}</div>}
                  {contact.isPrimary && <span className="rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 mt-1 inline-block">Primary</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(contact)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-surface-low hover:text-primary transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {contact.facility && <div className="text-xs text-muted-foreground">{contact.facility}</div>}
                {contact.phone && <a href={`tel:${contact.phone}`} className="text-xs text-primary hover:underline">{contact.phone}</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">
              {editing ? "Edit Contact" : "Add Contact"}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <InputField label="Name" value={draft.name} onChange={(v) => set("name", v)} required />
            <SelectField label="Contact Type" value={draft.role} onChange={(v) => set("role", v)} options={CONTACT_TYPES} required />
            <InputField label="Hospital/Clinic" value={draft.facility} onChange={(v) => set("facility", v)} />
            <InputField label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} type="tel" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isPrimary}
                onChange={(e) => set("isPrimary", e.target.checked)}
                className="h-4 w-4 accent-primary rounded"
              />
              <span className="text-sm font-medium text-foreground">Primary Contact</span>
            </label>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <button
              onClick={() => setOpen(false)}
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
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────── */

function Medical() {
  const [activeTab, setActiveTab] = useState("records");
  const { data: records = [] } = useQuery({ queryKey: ["medicalRecords"], queryFn: () => dataService.listMedicalRecords() });
  const { data: medications = [] } = useQuery({ queryKey: ["medications"], queryFn: () => dataService.listMedications() });
  const { data: therapies = [] } = useQuery({ queryKey: ["therapies"], queryFn: () => dataService.listTherapies() });
  const { data: contacts = [] } = useQuery({ queryKey: ["healthContacts"], queryFn: () => dataService.listHealthContacts() });

  const addButtonText = {
    records: "Add Appointment",
    medications: "Add Medication",
    therapies: "Add Therapy",
    contacts: "Add Contact"
  };

  return (
    <div className="space-y-12">
      <ChapterBanner chapterKey="medical" />
      {/* Header with Stats */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            <Heart className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Medical Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Comprehensive health oversight and care coordination</p>
          </div>
        </div>
      </div>

      {/* Tabs with Add Button */}
      <div className="flex items-center gap-6 relative">
        <Tabs defaultValue="records" className="flex-1" onValueChange={setActiveTab}>
        <TabsList className="flex w-full gap-3 mb-0 bg-transparent p-0 items-end justify-between">
          <TabsTrigger value="records" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 hover:bg-surface-low transition-all group">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-bold text-foreground hidden sm:inline">Appointments</span>
          </TabsTrigger>
          <TabsTrigger value="therapies" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:bg-purple-50 hover:bg-surface-low transition-all group">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-bold text-foreground hidden sm:inline">Therapy</span>
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-green-50 hover:bg-surface-low transition-all group">
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Pill className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-bold text-foreground hidden sm:inline">Medications</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex-1 flex flex-col items-center gap-2 py-2 px-3 rounded-xl border-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-red-50 hover:bg-surface-low transition-all group">
            <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-xs font-bold text-foreground hidden sm:inline">Contacts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="pt-12">
          <MedicalRecordsTab />
        </TabsContent>

        <TabsContent value="therapies" className="pt-12">
          <TherapiesTab />
        </TabsContent>

        <TabsContent value="medications" className="pt-12">
          <MedicationsTab />
        </TabsContent>

        <TabsContent value="contacts" className="pt-12">
          <HealthContactsTab />
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Medical;
