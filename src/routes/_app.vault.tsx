import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Filter, Lock, Pencil, Plus, Search, Shield, Siren, Trash2, Upload } from "lucide-react";
import { ChapterBanner } from "@/components/ChapterBanner";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { dataService, type VaultDocument } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/vault")({
  head: () => ({ meta: [{ title: "Digital Vault — LegacyNest" }] }),
  component: VaultPage,
});

const STATUS_STYLES: Record<VaultDocument["status"], string> = {
  Verified: "bg-green-50 text-green-700",
  "Pending Review": "bg-amber-50 text-amber-700",
  "Action Required": "bg-red-50 text-red-700",
};

const CATEGORIES: VaultDocument["category"][] = [
  "Legal", "Medical", "Financial", "Identity",
  "Disability", "Government", "Educational", "Insurance",
];

const STATUSES: VaultDocument["status"][] = ["Pending Review", "Verified", "Action Required"];

const INPUT = "w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function VaultPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["vault"],
    queryFn: () => dataService.listVaultDocuments(),
  });

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultDocument["category"] | "All">("All");
  const [openDoc, setOpenDoc] = useState<VaultDocument | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState<VaultDocument["category"]>("Legal");
  const [addNotes, setAddNotes] = useState("");
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<VaultDocument | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<VaultDocument["category"]>("Legal");
  const [editStatus, setEditStatus] = useState<VaultDocument["status"]>("Pending Review");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const docs = useMemo(() => {
    return (data ?? [])
      .filter(d => filter === "All" ? true : d.category === filter)
      .filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  }, [data, query, filter]);

  async function toggleCritical(d: VaultDocument, next: boolean) {
    qc.setQueryData<VaultDocument[]>(["vault"], prev =>
      (prev ?? []).map(x => x.id === d.id ? { ...x, isCriticalForEmergency: next } : x)
    );
    if (openDoc?.id === d.id) setOpenDoc(prev => prev ? { ...prev, isCriticalForEmergency: next } : prev);
    const ok = await dataService.setVaultCriticalForEmergency(d.id, next);
    if (!ok) {
      qc.invalidateQueries({ queryKey: ["vault"] });
      toast.error("Could not update emergency visibility.");
    } else {
      toast.success(next ? "Now visible to Care Circle" : "Hidden from Care Circle");
    }
  }

  async function handleDownload(d: VaultDocument) {
    if (!d.storagePath) { toast.error("No file attached to this document."); return; }
    setDownloading(true);
    try {
      const url = await dataService.getVaultFileSignedUrl(d.storagePath);
      if (!url) { toast.error("Could not generate download link."); return; }
      const a = document.createElement("a");
      a.href = url; a.download = d.name; a.target = "_blank";
      a.click();
    } finally { setDownloading(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) { toast.error("Document name is required."); return; }
    setAddSubmitting(true);
    try {
      const doc = await dataService.addVaultDocument({ name: addName.trim(), category: addCategory, notes: addNotes.trim() || undefined });
      if (!doc) { toast.error("Could not create document."); return; }
      if (addFile) {
        const url = await dataService.uploadVaultFile(addFile, doc.id);
        if (!url) toast.warning("Document added, but file upload failed.");
        else toast.success("Document and file uploaded");
      } else {
        toast.success("Document added");
      }
      await qc.invalidateQueries({ queryKey: ["vault"] });
      setAddOpen(false); setAddName(""); setAddFile(null);
      setAddCategory("Legal"); setAddNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add document");
    } finally { setAddSubmitting(false); }
  }

  function openEdit(d: VaultDocument) {
    setEditDoc(d); setEditName(d.name);
    setEditCategory(d.category); setEditStatus(d.status);
    setEditNotes(d.notes ?? ""); setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editDoc || !editName.trim()) return;
    setEditSubmitting(true);
    try {
      const ok = await dataService.updateVaultDocument(editDoc.id, {
        name: editName.trim(), category: editCategory,
        status: editStatus, notes: editNotes.trim() || undefined,
      });
      if (!ok) { toast.error("Could not update document."); return; }
      qc.setQueryData<VaultDocument[]>(["vault"], prev =>
        (prev ?? []).map(x => x.id === editDoc.id
          ? { ...x, name: editName.trim(), category: editCategory, status: editStatus, notes: editNotes.trim() || undefined }
          : x)
      );
      if (openDoc?.id === editDoc.id) {
        setOpenDoc(prev => prev ? { ...prev, name: editName.trim(), category: editCategory, status: editStatus, notes: editNotes.trim() || undefined } : prev);
      }
      toast.success("Document updated");
      setEditOpen(false);
    } finally { setEditSubmitting(false); }
  }

  async function handleDelete(d: VaultDocument) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const ok = await dataService.deleteVaultDocument(d.id);
    if (ok) {
      qc.invalidateQueries({ queryKey: ["vault"] });
      if (openDoc?.id === d.id) setOpenDoc(null);
      toast.success("Document deleted");
    } else {
      toast.error("Failed to delete document");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <ChapterBanner chapterKey="vault" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Digital Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encrypted document storage for your family most important records.
          </p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors">
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </div>

      <div className="legacy-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-lg border border-border bg-surface-low pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            {(["All", ...CATEGORIES] as const).map(c => (
              <button key={c} onClick={() => setFilter(c as VaultDocument["category"] | "All")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                  filter === c ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:bg-surface-low"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 divide-y divide-border">
          {isLoading ? (
            <div className="py-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {data?.length === 0 ? "No documents yet. Click Upload Document to add one." : "No documents match your filters."}
            </div>
          ) : docs.map(d => (
            <div key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <FileText className="h-5 w-5" />
              </div>
              <button onClick={() => setOpenDoc(d)} className="min-w-0 text-left">
                <div className="font-medium text-foreground truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.category} · {d.size} · {d.updatedAt}</div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <label className="hidden md:flex items-center gap-1.5 cursor-pointer" title="Visible to Care Circle in an emergency">
                  <Siren className={`h-3.5 w-3.5 ${d.isCriticalForEmergency ? "text-destructive" : "text-muted-foreground"}`} />
                  <Switch checked={!!d.isCriticalForEmergency} onCheckedChange={v => toggleCritical(d, v)} />
                </label>
                <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[d.status]}`}>
                  {d.status}
                </span>
                <button onClick={() => openEdit(d)} className="p-1.5 rounded-md hover:bg-surface-low text-muted-foreground hover:text-primary" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setOpenDoc(d)} className="p-1.5 rounded-md hover:bg-surface-low text-muted-foreground" aria-label="View">
                  <Lock className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(d)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={!!openDoc} onOpenChange={o => !o && setOpenDoc(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {openDoc && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> {openDoc.name}
                </SheetTitle>
                <SheetDescription>{openDoc.category} · {openDoc.size} · {openDoc.updatedAt}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[openDoc.status]}`}>
                  {openDoc.status}
                </div>
                {openDoc.notes && (
                  <div className="rounded-lg border border-border bg-surface-low p-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Notes</div>
                    <p className="text-sm text-foreground leading-relaxed">{openDoc.notes}</p>
                  </div>
                )}
                <div className="rounded-lg border border-border bg-surface-low p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Visible to Care Circle</div>
                    <div className="text-xs text-muted-foreground">Surfaces in Emergency Plan</div>
                  </div>
                  <Switch checked={!!openDoc.isCriticalForEmergency} onCheckedChange={v => toggleCritical(openDoc, v)} />
                </div>
                {openDoc.storagePath ? (
                  <button onClick={() => handleDownload(openDoc)} disabled={downloading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary text-primary font-semibold px-4 py-2.5 hover:bg-primary/5 transition-colors disabled:opacity-60">
                    <Download className="h-4 w-4" />
                    {downloading ? "Preparing download..." : "Download File"}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">No file attached.</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button onClick={() => { setOpenDoc(null); openEdit(openDoc); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(openDoc)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 text-destructive px-4 py-2 text-sm font-semibold hover:bg-destructive/5">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={addOpen} onOpenChange={o => { if (!addSubmitting) setAddOpen(o); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Add Document</SheetTitle>
            <SheetDescription>Upload a document to your encrypted Digital Vault.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Document Name *</span>
              <input required value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="e.g. Last Will and Testament" className={`mt-1 ${INPUT}`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Category</span>
                <select value={addCategory} onChange={e => setAddCategory(e.target.value as VaultDocument["category"])} className={`mt-1 ${INPUT}`}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Status</span>
                <select className={`mt-1 ${INPUT}`} defaultValue="Pending Review">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Notes</span>
              <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)}
                placeholder="Any notes about this document..." rows={3} className={`mt-1 ${INPUT} resize-none`} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">File</span>
              <input type="file" onChange={e => setAddFile(e.target.files?.[0] || null)}
                accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" className={`mt-1 ${INPUT}`} />
              <p className="text-xs text-muted-foreground mt-1">PDF, images, Word, Excel - max 10 MB</p>
            </label>
            <button type="submit" disabled={addSubmitting || !addName.trim()}
              className="w-full rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50">
              {addSubmitting ? "Adding..." : "Add Document"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={editOpen} onOpenChange={o => { if (!editSubmitting) setEditOpen(o); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> Edit Document</SheetTitle>
            <SheetDescription>Update document details.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEdit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Document Name *</span>
              <input required value={editName} onChange={e => setEditName(e.target.value)} className={`mt-1 ${INPUT}`} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Category</span>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value as VaultDocument["category"])} className={`mt-1 ${INPUT}`}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Status</span>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as VaultDocument["status"])} className={`mt-1 ${INPUT}`}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Notes</span>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                rows={3} className={`mt-1 ${INPUT} resize-none`} />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditOpen(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button type="submit" disabled={editSubmitting || !editName.trim()}
                className="flex-1 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 disabled:opacity-50">
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
