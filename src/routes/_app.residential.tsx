import { ChapterBanner } from "@/components/ChapterBanner";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Home, Plus, Pencil, Trash2, Check, X, Loader2, ShieldAlert,
  AlertTriangle, Star, ClipboardList, Heart, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { dataService, type ResidentialOption, type ResidentialChecklistItem, type ResidentialLetterOfIntent } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/residential")({
  head: () => ({ meta: [{ title: "Residential Planning — LegacyNest" }] }),
  component: ResidentialPage,
});

const INPUT = "w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const LABEL = "block text-xs font-semibold text-muted-foreground mb-1";

const OPTION_TYPES: ResidentialOption["optionType"][] = [
  "Current Home", "Stay-at-Home with Caregiver", "Sibling / Family Home",
  "Group Home", "Assisted Living", "Independent Living", "Other",
];
const WAITLIST_STATUSES: ResidentialOption["waitlistStatus"][] = [
  "Not Applied", "Applied", "Waitlisted", "Confirmed",
];
const STRATEGIES: NonNullable<ResidentialOption["propertyStrategy"]>[] = ["Retain", "Sell", "Lease", "Trust"];
const CHECKLIST_CATEGORIES: ResidentialChecklistItem["category"][] = ["Safety", "Accessibility", "Suitability", "Transition"];

const RANK_CONFIG = {
  Primary:   { color: "bg-green-50 border-green-200 text-green-800",   icon: "🏠", label: "Primary Home" },
  Backup:    { color: "bg-amber-50 border-amber-200 text-amber-800",   icon: "🏡", label: "Backup Home" },
  Emergency: { color: "bg-red-50 border-red-200 text-red-800",         icon: "🚨", label: "Tonight (Emergency)" },
};

const WAITLIST_COLOR: Record<ResidentialOption["waitlistStatus"], string> = {
  "Not Applied": "bg-surface-low text-muted-foreground",
  "Applied":     "bg-blue-50 text-blue-700",
  "Waitlisted":  "bg-amber-50 text-amber-700",
  "Confirmed":   "bg-green-50 text-green-700",
};

const DEFAULT_CHECKLIST: Omit<ResidentialChecklistItem, "id" | "userId">[] = [
  { item: "Zero-step entry / ramp installed", category: "Accessibility", isDone: false },
  { item: "Widened doorways for wheelchair access", category: "Accessibility", isDone: false },
  { item: "Grab bars in bathroom / toilet", category: "Accessibility", isDone: false },
  { item: "Wandering / exit safety (door sensors or locks)", category: "Safety", isDone: false },
  { item: "Medications secured and labelled", category: "Safety", isDone: false },
  { item: "Sensory-friendly lighting installed", category: "Safety", isDone: false },
  { item: "Emergency contacts posted visibly", category: "Safety", isDone: false },
  { item: "Caregiver trained on child's routine", category: "Suitability", isDone: false },
];

type Tab = "plan" | "options" | "safety" | "loi";

function ResidentialPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("plan");

  const { data: options = [], isLoading } = useQuery({
    queryKey: ["residential-options"],
    queryFn: () => dataService.listResidentialOptions(),
  });
  const { data: checklist = [] } = useQuery({
    queryKey: ["residential-checklist"],
    queryFn: () => dataService.listResidentialChecklist(),
  });
  const { data: loi } = useQuery({
    queryKey: ["residential-loi"],
    queryFn: () => dataService.getResidentialLetterOfIntent(),
  });

  // ── Option dialog ──────────────────────────────────────────────────────
  const [optDialog, setOptDialog] = useState(false);
  const [optEdit, setOptEdit] = useState<string | null>(null);
  const [optDraft, setOptDraft] = useState<Partial<ResidentialOption>>({});
  const [optSaving, setOptSaving] = useState(false);

  const openAddOpt = (rank?: ResidentialOption["successionRank"]) => {
    setOptDraft({ optionType: "Group Home", waitlistStatus: "Not Applied", isCurrentHome: false, hasConsent: false, hasKeysAccess: false, successionRank: rank ?? null });
    setOptEdit(null); setOptDialog(true);
  };
  const openEditOpt = (o: ResidentialOption) => { setOptDraft(o); setOptEdit(o.id); setOptDialog(true); };
  const saveOpt = async () => {
    if (!optDraft.name?.trim()) { toast.error("Name is required"); return; }
    setOptSaving(true);
    try {
      if (optEdit) {
        await dataService.updateResidentialOption(optEdit, optDraft);
        toast.success("Option updated");
      } else {
        const created = await dataService.addResidentialOption(optDraft as Omit<ResidentialOption, "id" | "userId">);
        if (!created) { toast.error("Could not save"); return; }
        void dataService.markSectionComplete("residential");
        // Seed default safety checklist on first current home
        if (optDraft.isCurrentHome && checklist.length === 0) {
          for (const item of DEFAULT_CHECKLIST) {
            await dataService.addResidentialChecklistItem(item);
          }
          qc.invalidateQueries({ queryKey: ["residential-checklist"] });
        }
        toast.success("Option added");
      }
      qc.invalidateQueries({ queryKey: ["residential-options"] });
      setOptDialog(false);
    } finally { setOptSaving(false); }
  };
  const deleteOpt = async (id: string) => {
    if (!confirm("Delete this option?")) return;
    await dataService.deleteResidentialOption(id);
    qc.invalidateQueries({ queryKey: ["residential-options"] });
    toast.success("Deleted");
  };

  // ── Checklist ──────────────────────────────────────────────────────────
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState<ResidentialChecklistItem["category"]>("Safety");
  const [addingItem, setAddingItem] = useState(false);

  const addChecklistItem = async () => {
    if (!newItem.trim()) return;
    setAddingItem(true);
    await dataService.addResidentialChecklistItem({ item: newItem.trim(), category: newCategory, isDone: false });
    qc.invalidateQueries({ queryKey: ["residential-checklist"] });
    setNewItem(""); setAddingItem(false);
  };
  const toggleChecklist = async (item: ResidentialChecklistItem) => {
    qc.setQueryData<ResidentialChecklistItem[]>(["residential-checklist"], prev =>
      (prev ?? []).map(x => x.id === item.id ? { ...x, isDone: !x.isDone } : x));
    await dataService.toggleResidentialChecklistItem(item.id, !item.isDone);
  };

  // ── Letter of Intent ───────────────────────────────────────────────────
  const [loiEdit, setLoiEdit] = useState(false);
  const [loiDraft, setLoiDraft] = useState<Partial<ResidentialLetterOfIntent>>({});
  const [loiSaving, setLoiSaving] = useState(false);

  const openLoi = () => { setLoiDraft(loi ?? {}); setLoiEdit(true); };
  const saveLoi = async () => {
    setLoiSaving(true);
    await dataService.saveResidentialLetterOfIntent(loiDraft as Omit<ResidentialLetterOfIntent, "id" | "userId">);
    qc.invalidateQueries({ queryKey: ["residential-loi"] });
    toast.success("Letter of Intent saved");
    setLoiSaving(false); setLoiEdit(false);
  };

  const primary   = options.find(o => o.successionRank === "Primary");
  const backup    = options.find(o => o.successionRank === "Backup");
  const emergency = options.find(o => o.successionRank === "Emergency");
  const doneChecklist = checklist.filter(c => c.isDone).length;
  const totalChecklist = checklist.length;

  return (
    <div className="space-y-6 max-w-6xl">
      <ChapterBanner chapterKey="residential" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" /> Residential Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Who will care for my child after me — answered in a roof, a room, and the people in that home.
          </p>
        </div>
        <button onClick={() => openAddOpt()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Option
        </button>
      </div>

      {/* Tabs */}
      <div className="legacy-card overflow-hidden">
        <div className="flex border-b border-border">
          {([["plan","The Plan"],["options","All Options"],["safety","Safety Checklist"],["loi","Letter of Intent"]] as [Tab,string][]).map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-low"}`}>
              {label}
              {t === "safety" && totalChecklist > 0 && <span className="ml-1 text-xs opacity-70">({doneChecklist}/{totalChecklist})</span>}
            </button>
          ))}
        </div>

        {/* ── THE PLAN TAB ─────────────────────────────────────────────── */}
        {tab === "plan" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Rank your options as Primary, Backup, and Emergency — so there is always a next home.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {(["Primary","Backup","Emergency"] as const).map(rank => {
                const opt = { Primary: primary, Backup: backup, Emergency: emergency }[rank];
                const cfg = RANK_CONFIG[rank];
                return (
                  <div key={rank} className={`rounded-2xl border p-4 ${opt ? cfg.color : "border-dashed border-border bg-surface-low"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest">{cfg.icon} {cfg.label}</span>
                      {opt && (
                        <button onClick={() => openEditOpt(opt)} className="p-1 rounded hover:bg-white/30">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {opt ? (
                      <div>
                        <div className="font-semibold">{opt.name}</div>
                        <div className="text-xs mt-0.5 opacity-75">{opt.optionType}</div>
                        {opt.city && <div className="text-xs mt-0.5 opacity-75">{opt.city}</div>}
                        {opt.caregiverName && <div className="text-xs mt-1 font-medium">👤 {opt.caregiverName}</div>}
                        {rank === "Emergency" && (
                          <div className="mt-2 flex gap-3 text-xs">
                            <span className={`font-semibold ${opt.hasConsent ? "text-green-700" : "text-red-600"}`}>
                              {opt.hasConsent ? "✓ Consent given" : "✗ No consent"}
                            </span>
                            <span className={`font-semibold ${opt.hasKeysAccess ? "text-green-700" : "text-red-600"}`}>
                              {opt.hasKeysAccess ? "✓ Has keys" : "✗ No keys"}
                            </span>
                          </div>
                        )}
                        {opt.monthlyCost && <div className="text-xs mt-1 opacity-75">₹{opt.monthlyCost.toLocaleString("en-IN")}/mo</div>}
                      </div>
                    ) : (
                      <button onClick={() => openAddOpt(rank)}
                        className="w-full mt-2 rounded-lg border border-dashed border-border py-3 text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                        + Set {rank} option
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* India waitlist warning */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Good group homes in India have 5–10 year waitlists.</strong> National Trust Gharaunda, Samarth, and state-run homes fill up fast. Apply now even if the need is years away.
              </div>
            </div>
          </div>
        )}

        {/* ── ALL OPTIONS TAB ──────────────────────────────────────────── */}
        {tab === "options" && (
          <div className="p-5">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : options.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                No options added yet.{" "}
                <button onClick={() => openAddOpt()} className="text-primary hover:underline">Add your first option</button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {options.map(o => (
                  <div key={o.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{o.name}</span>
                          {o.successionRank && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RANK_CONFIG[o.successionRank].color}`}>
                              {o.successionRank}
                            </span>
                          )}
                          {o.isCurrentHome && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Current</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.optionType}{o.city ? ` · ${o.city}` : ""}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditOpt(o)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => deleteOpt(o.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${WAITLIST_COLOR[o.waitlistStatus]}`}>{o.waitlistStatus}</span>
                      {o.suitabilityRating && <span className="text-amber-600">{"★".repeat(o.suitabilityRating)}{"☆".repeat(5 - o.suitabilityRating)}</span>}
                      {o.monthlyCost && <span className="text-muted-foreground">₹{o.monthlyCost.toLocaleString("en-IN")}/mo</span>}
                      {o.expectedWaitYears && <span className="text-muted-foreground">{o.expectedWaitYears}yr wait</span>}
                    </div>
                    {o.caregiverName && <div className="mt-2 text-xs text-muted-foreground">Caregiver: <span className="font-medium text-foreground">{o.caregiverName}</span></div>}
                    {(o.pros || o.cons) && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {o.pros && <div className="text-xs"><span className="text-green-600 font-semibold">+ </span>{o.pros}</div>}
                        {o.cons && <div className="text-xs"><span className="text-red-500 font-semibold">− </span>{o.cons}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SAFETY CHECKLIST TAB ─────────────────────────────────────── */}
        {tab === "safety" && (
          <div className="p-5 space-y-4">
            {totalChecklist > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((doneChecklist/totalChecklist)*100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-primary">{doneChecklist}/{totalChecklist} done</span>
              </div>
            )}
            {(["Safety","Accessibility","Suitability","Transition"] as const).map(cat => {
              const items = checklist.filter(c => c.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{cat}</h3>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <button onClick={() => toggleChecklist(item)}
                          className={`h-5 w-5 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${item.isDone ? "bg-primary border-primary text-white" : "border-border"}`}>
                          {item.isDone && <Check className="h-3 w-3" />}
                        </button>
                        <span className={`text-sm flex-1 ${item.isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.item}</span>
                        <button onClick={async () => { await dataService.deleteResidentialChecklistItem(item.id); qc.invalidateQueries({ queryKey: ["residential-checklist"] }); }}
                          className="p-1 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Add item */}
            <div className="flex gap-2 pt-2 border-t border-border">
              <select value={newCategory} onChange={e => setNewCategory(e.target.value as ResidentialChecklistItem["category"])}
                className="rounded-lg border border-border bg-surface-low px-2 py-2 text-xs">
                {CHECKLIST_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Add checklist item…"
                className="flex-1 rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={e => e.key === "Enter" && addChecklistItem()} />
              <button onClick={addChecklistItem} disabled={!newItem.trim() || addingItem}
                className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold disabled:opacity-50">
                {addingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
            {checklist.length === 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">How to use the Safety Checklist</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    This checklist helps you make any home safe and accessible for your child.
                    Work through it for your current home and any future care homes.
                  </p>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex gap-2"><span className="text-primary font-bold shrink-0">1.</span><span><strong>Safety</strong> — Door sensors, medication locks, emergency contacts posted visibly</span></div>
                  <div className="flex gap-2"><span className="text-primary font-bold shrink-0">2.</span><span><strong>Accessibility</strong> — Ramps, grab bars, widened doorways for your child's mobility needs</span></div>
                  <div className="flex gap-2"><span className="text-primary font-bold shrink-0">3.</span><span><strong>Suitability</strong> — Is the caregiver trained? Does the environment suit your child's sensory needs?</span></div>
                  <div className="flex gap-2"><span className="text-primary font-bold shrink-0">4.</span><span><strong>Transition</strong> — Steps to move your child to a new home smoothly and without distress</span></div>
                </div>
                <button
                  onClick={async () => {
                    for (const item of DEFAULT_CHECKLIST) {
                      await dataService.addResidentialChecklistItem(item);
                    }
                    qc.invalidateQueries({ queryKey: ["residential-checklist"] });
                    toast.success("Default safety checklist loaded. Tick items as you complete them.");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 text-sm hover:bg-primary/90 transition-colors"
                >
                  <ClipboardList className="h-4 w-4" /> Load Default Safety Checklist
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LETTER OF INTENT TAB ─────────────────────────────────────── */}
        {tab === "loi" && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Letter of Intent</h3>
                <p className="text-xs text-muted-foreground mt-0.5">What makes your home feel like home — for whoever takes over.</p>
              </div>
              {!loiEdit && (
                <button onClick={openLoi} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-low">
                  <Pencil className="h-3.5 w-3.5" /> {loi ? "Edit" : "Write"}
                </button>
              )}
            </div>
            {loiEdit ? (
              <div className="space-y-4">
                {([
                  ["dailyRoutine","Daily Routine","Morning to night — what does a typical day look like?"],
                  ["comfortItems","Comfort Items","Favourite toys, blanket, music, objects that bring calm"],
                  ["foodPreferences","Food & Diet","Favourite foods, foods to avoid, texture preferences"],
                  ["sleepRoutine","Sleep Routine","Bedtime ritual, sleep aids, hours needed"],
                  ["sensoryNeeds","Sensory Needs","Lights, sounds, textures — what to avoid and what helps"],
                  ["socialNeeds","Social & Emotional Needs","Preferred activities, social preferences, alone time"],
                  ["communicationNotes","How to Communicate","How does the child express needs, understand instructions?"],
                  ["importantRelationships","Important Relationships","Key friends, teachers, therapists, family members to maintain contact with"],
                  ["transitionNotes","Transition Notes","How to introduce a new home gradually — timeline and approach"],
                ] as [keyof ResidentialLetterOfIntent, string, string][]).map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label className={LABEL}>{label}</label>
                    <textarea rows={3} placeholder={placeholder} className={`${INPUT} resize-none`}
                      value={(loiDraft[field] as string) ?? ""}
                      onChange={e => setLoiDraft(d => ({ ...d, [field]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setLoiEdit(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
                  <button onClick={saveLoi} disabled={loiSaving}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    {loiSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save Letter
                  </button>
                </div>
              </div>
            ) : loi ? (
              <div className="space-y-4">
                {([
                  ["Daily Routine", loi.dailyRoutine],
                  ["Comfort Items", loi.comfortItems],
                  ["Food & Diet", loi.foodPreferences],
                  ["Sleep Routine", loi.sleepRoutine],
                  ["Sensory Needs", loi.sensoryNeeds],
                  ["Social Needs", loi.socialNeeds],
                  ["Communication", loi.communicationNotes],
                  ["Key Relationships", loi.importantRelationships],
                  ["Transition Plan", loi.transitionNotes],
                ] as [string, string | undefined][]).filter(([,v]) => v).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-surface-low p-4">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
                    <p className="text-sm text-foreground leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 text-primary/30" />
                <p className="text-sm">Write a letter for the person who will care for your child.</p>
                <p className="text-xs mt-1">What makes home feel like home — routines, comfort items, how they communicate.</p>
                <button onClick={openLoi} className="mt-4 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold">
                  Write Letter of Intent
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Option Dialog */}
      <Dialog open={optDialog} onOpenChange={o => !o && setOptDialog(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle>{optEdit ? "Edit Residential Option" : "Add Residential Option"}</DialogTitle>
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Name *</span>
                <input className={INPUT} value={optDraft.name ?? ""} placeholder="e.g. Family Home"
                  onChange={e => setOptDraft(d => ({ ...d, name: e.target.value }))} />
              </label>
              <label className="block">
                <span className={LABEL}>Type</span>
                <select className={INPUT} value={optDraft.optionType ?? "Other"}
                  onChange={e => setOptDraft(d => ({ ...d, optionType: e.target.value as ResidentialOption["optionType"] }))}>
                  {OPTION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>City / Location</span>
                <input className={INPUT} value={optDraft.city ?? ""} placeholder="e.g. Kolkata"
                  onChange={e => setOptDraft(d => ({ ...d, city: e.target.value }))} />
              </label>
              <label className="block">
                <span className={LABEL}>Monthly Cost (₹)</span>
                <input type="number" className={INPUT} value={optDraft.monthlyCost ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, monthlyCost: e.target.value ? Number(e.target.value) : undefined }))} />
              </label>
            </div>
            <label className="block">
              <span className={LABEL}>Succession Rank</span>
              <select className={INPUT} value={optDraft.successionRank ?? ""}
                onChange={e => setOptDraft(d => ({ ...d, successionRank: (e.target.value || null) as ResidentialOption["successionRank"] }))}>
                <option value="">Not ranked</option>
                <option>Primary</option><option>Backup</option><option>Emergency</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Caregiver Name</span>
                <input className={INPUT} value={optDraft.caregiverName ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, caregiverName: e.target.value }))} />
              </label>
              <label className="block">
                <span className={LABEL}>Caregiver Phone</span>
                <input className={INPUT} value={optDraft.caregiverPhone ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, caregiverPhone: e.target.value }))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Waitlist Status</span>
                <select className={INPUT} value={optDraft.waitlistStatus ?? "Not Applied"}
                  onChange={e => setOptDraft(d => ({ ...d, waitlistStatus: e.target.value as ResidentialOption["waitlistStatus"] }))}>
                  {WAITLIST_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Expected Wait (years)</span>
                <input type="number" className={INPUT} value={optDraft.expectedWaitYears ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, expectedWaitYears: e.target.value ? Number(e.target.value) : undefined }))} />
              </label>
            </div>
            <label className="block">
              <span className={LABEL}>Suitability Rating (1–5)</span>
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setOptDraft(d => ({ ...d, suitabilityRating: n }))}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${optDraft.suitabilityRating === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {"★".repeat(n)}
                  </button>
                ))}
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={LABEL}>Pros</span>
                <textarea rows={2} className={`${INPUT} resize-none`} value={optDraft.pros ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, pros: e.target.value }))} />
              </label>
              <label className="block">
                <span className={LABEL}>Cons</span>
                <textarea rows={2} className={`${INPUT} resize-none`} value={optDraft.cons ?? ""}
                  onChange={e => setOptDraft(d => ({ ...d, cons: e.target.value }))} />
              </label>
            </div>
            {optDraft.optionType === "Current Home" || optDraft.isCurrentHome ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={LABEL}>Property Strategy</span>
                  <select className={INPUT} value={optDraft.propertyStrategy ?? ""}
                    onChange={e => setOptDraft(d => ({ ...d, propertyStrategy: e.target.value as ResidentialOption["propertyStrategy"] }))}>
                    <option value="">Select</option>
                    {STRATEGIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className={LABEL}>Legal Status</span>
                  <input className={INPUT} value={optDraft.legalStatus ?? ""}
                    onChange={e => setOptDraft(d => ({ ...d, legalStatus: e.target.value }))} />
                </label>
              </div>
            ) : null}
            {optDraft.successionRank === "Emergency" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-red-700">Emergency access — critical for tonight</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-primary" checked={!!optDraft.hasConsent}
                    onChange={e => setOptDraft(d => ({ ...d, hasConsent: e.target.checked }))} />
                  <span className="text-sm">Caregiver has given consent to care for child</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-primary" checked={!!optDraft.hasKeysAccess}
                    onChange={e => setOptDraft(d => ({ ...d, hasKeysAccess: e.target.checked }))} />
                  <span className="text-sm">Caregiver has keys / access to this home</span>
                </label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" className="accent-primary" checked={!!optDraft.isCurrentHome}
                onChange={e => setOptDraft(d => ({ ...d, isCurrentHome: e.target.checked }))} />
              <span className="text-sm font-medium">This is the child's current home</span>
            </div>
            <label className="block">
              <span className={LABEL}>Notes</span>
              <textarea rows={2} className={`${INPUT} resize-none`} value={optDraft.notes ?? ""}
                onChange={e => setOptDraft(d => ({ ...d, notes: e.target.value }))} />
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setOptDialog(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={saveOpt} disabled={optSaving}
                className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {optSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {optEdit ? "Update" : "Add Option"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
