import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChapterBanner } from "@/components/ChapterBanner";
import {
  AlertTriangle, Phone, Pill, Music, Heart, Users, Home as HomeIcon, KeyRound,
  Landmark, Wallet, Download, Loader2, Plus, Check, X, Activity, ShieldAlert,
  ChevronDown, ChevronUp, Stethoscope, Scale, Edit3, UserCheck, RefreshCw,
  Bell, Shield, Copy, CheckCircle2, ChevronRight, PlayCircle, ClipboardCheck,
} from "lucide-react";
import { supabase, pdb } from "@/integrations/supabase/client";
import { CareDeliveryPlan } from "@/components/emergency/CareDeliveryPlan";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { dataService, type EmergencyPlan, type EmergencyBrief, type EmergencyInstitution } from "@/lib/data/mock";
import { generateEmergencyCard } from "@/lib/emergency-card";

export const Route = createFileRoute("/_app/emergency")({
  head: () => ({ meta: [{ title: "Emergency Continuity Plan -- LegacyNest" }] }),
  component: EmergencyPage,
});

const INPUT = "w-full rounded-lg border border-border bg-surface-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const LABEL = "block text-xs font-semibold text-muted-foreground mb-1";

const DEFAULT_INSTITUTIONS = [
  "National Trust (Local Level Committee)",
  "Disability Pension Office",
  "School / Day Program",
  "Bank (joint account / nominee)",
  "Insurance Provider",
];

// ── Simulation ──────────────────────────────────────────────────────────────

type SimPath = "parent" | "coordinator";
type StepStatus = "pending" | "running" | "done" | "skipped";

type SimStep = {
  id: string;
  label: string;
  description: string;
  action: string; // button label
  who: string;    // who does it
};

const PARENT_STEPS: SimStep[] = [
  { id: "confirm",    label: "Confirm Emergency",           description: "Mark the emergency as active. This starts the clock.", action: "Confirm & Start", who: "Parent / Device" },
  { id: "coord",      label: "Notify Emergency Coordinator", description: "Send an alert (email + SMS) to your named coordinator with the child's emergency brief.", action: "Send Alert", who: "System → Coordinator" },
  { id: "backup",     label: "Notify Backup Coordinator",   description: "Alert the backup coordinator so they are aware and on standby.", action: "Send Alert", who: "System → Backup" },
  { id: "brief",      label: "Share Emergency Brief",       description: "Send the child's full emergency brief (medications, blood group, contacts, tonight's residence) to the coordinator.", action: "Share Brief", who: "System → Coordinator" },
  { id: "carecircle", label: "Alert Care Circle",           description: "Notify all active care circle members that the emergency plan is now live.", action: "Notify All", who: "System → Care Circle" },
  { id: "institutions", label: "Notify Institutions",       description: "Mark key institutions (school, bank, insurance, National Trust LLC) as notified.", action: "Mark Notified", who: "Parent / Coordinator" },
  { id: "vault",      label: "Grant Break-Glass Vault Access", description: "Share the vault access link so the coordinator can retrieve critical documents.", action: "Share Access", who: "System → Coordinator" },
];

const COORD_STEPS: SimStep[] = [
  { id: "alert",      label: "Coordinator Submits Alert",   description: "The emergency coordinator submits an activation request via the coordinator portal link they received.", action: "Submit Alert", who: "Emergency Coordinator" },
  { id: "second",     label: "Second Coordinator Confirms", description: "A second coordinator confirms via their portal. Majority confirmation is required for activation.", action: "Confirm (2nd)", who: "Backup Coordinator" },
  { id: "legacynest", label: "LegacyNest Reviews & Calls",  description: "LegacyNest admin is alerted. They call the emergency coordinator to verify and get a verbal confirmation.", action: "Mark Called", who: "LegacyNest Admin" },
  { id: "activate",   label: "Emergency Activated",         description: "LegacyNest approves the activation. The emergency plan status changes to Active.", action: "Activate", who: "LegacyNest Admin" },
  { id: "carecircle", label: "Care Circle Notified",        description: "All care circle members receive an alert that the emergency plan is live.", action: "Notify All", who: "System → Care Circle" },
  { id: "brief",      label: "Emergency Brief Shared",      description: "The child's full emergency brief and vault access are shared with all stakeholders.", action: "Share All", who: "System → All" },
];

const SIM_KEY = (userId: string, path: SimPath) => `legacynest.simulation.${path}.${userId}.v1`;

type SimState = { steps: Record<string, StepStatus>; startedAt: string; completedAt?: string };

function SimulationPanel({
  path, plan, brief, institutions, careCircle, userId, onComplete, onClose,
}: {
  path: SimPath;
  plan: EmergencyPlan | null | undefined;
  brief: EmergencyBrief | null | undefined;
  institutions: EmergencyInstitution[];
  careCircle: { name: string }[];
  userId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const steps = path === "parent" ? PARENT_STEPS : COORD_STEPS;
  const storageKey = SIM_KEY(userId, path);

  const [state, setState] = useState<SimState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as SimState;
    } catch { /* ignore */ }
    const initial: SimState = {
      steps: Object.fromEntries(steps.map(s => [s.id, "pending" as StepStatus])),
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  });

  const save = (next: SimState) => {
    setState(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const doneCount = steps.filter(s => state.steps[s.id] === "done").length;
  const allDone = doneCount === steps.length;

  async function execute(stepId: string) {
    save({ ...state, steps: { ...state.steps, [stepId]: "running" } });

    // Real actions per step
    try {
      if (stepId === "confirm" || stepId === "activate") {
        await dataService.saveEmergencyPlan({ activationStatus: "Active", activatedAt: new Date().toISOString() });
        toast.success("Emergency plan marked Active in database.");
      } else if (stepId === "institutions") {
        for (const inst of institutions.filter(i => !i.isNotified)) {
          await dataService.toggleEmergencyInstitution(inst.id, true);
        }
        toast.success(`${institutions.length} institutions marked as notified.`);
      } else if (stepId === "alert" || stepId === "second") {
        // Coordinator action — simulated
        toast.success(`Coordinator action recorded. In production this triggers the portal email.`);
      } else if (stepId === "coord" || stepId === "backup" || stepId === "brief" || stepId === "vault" || stepId === "brief" || stepId === "legacynest") {
        toast.success(`Action completed. In production an email + SMS is sent to ${
          stepId === "coord" ? plan?.coordinatorName || "coordinator" :
          stepId === "backup" ? plan?.backupCoordinatorName || "backup" :
          stepId === "legacynest" ? "LegacyNest admin" : "all stakeholders"
        }.`);
      } else if (stepId === "carecircle") {
        toast.success(`${careCircle.length} care circle members notified.`);
      }
      await new Promise(r => setTimeout(r, 600)); // brief pause for UX
    } catch {
      toast.error("Action failed — check your emergency plan data.");
    }

    const nextState: SimState = {
      ...state,
      steps: { ...state.steps, [stepId]: "done" },
    };
    const nowAllDone = steps.every(s => nextState.steps[s.id] === "done");
    if (nowAllDone) {
      nextState.completedAt = new Date().toISOString();
      onComplete();
    }
    save(nextState);
  }

  const statusColor = (s: StepStatus) =>
    s === "done"    ? "border-green-400 bg-green-50" :
    s === "running" ? "border-primary bg-primary/5" :
                      "border-border bg-card";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className={`px-6 py-5 rounded-t-2xl border-b border-border ${path === "parent" ? "bg-red-50" : "bg-amber-50"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${path === "parent" ? "text-red-600" : "text-amber-600"}`}>
                {path === "parent" ? "🔴 Parent-Initiated Emergency" : "🟡 Coordinator-Initiated Emergency"}
              </div>
              <h2 className="text-lg font-bold text-foreground">Emergency Simulation</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone ? "All steps complete — Emergency Process Initiated ✓" : `Step ${doneCount + 1} of ${steps.length}`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${path === "parent" ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {allDone ? (
            <div className="py-8 text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Emergency Process Initiated</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                All {steps.length} steps completed. The emergency plan is now active and all stakeholders have been notified.
              </p>
              {state.completedAt && (
                <p className="text-xs text-muted-foreground">
                  Completed: {new Date(state.completedAt).toLocaleString("en-IN")}
                </p>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem(storageKey);
                  onClose();
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-2.5 hover:bg-primary/90"
              >
                Close & Reset Simulation
              </button>
            </div>
          ) : (
            steps.map((step, i) => {
              const status = state.steps[step.id] ?? "pending";
              const isDone = status === "done";
              const isRunning = status === "running";
              const prevDone = i === 0 || state.steps[steps[i - 1].id] === "done";
              const canRun = prevDone && !isDone && !isRunning;

              return (
                <div key={step.id} className={`rounded-xl border p-4 transition-all ${statusColor(status)}`}>
                  <div className="flex items-start gap-3">
                    <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                      isDone ? "bg-green-500 text-white" :
                      isRunning ? "bg-primary text-white animate-pulse" :
                      "bg-surface-container text-muted-foreground"
                    }`}>
                      {isDone ? <Check className="h-4 w-4" /> : isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className={`text-sm font-semibold ${isDone ? "text-green-800" : "text-foreground"}`}>{step.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1 font-medium uppercase tracking-wide">{step.who}</div>
                        </div>
                        {canRun && (
                          <button
                            onClick={() => execute(step.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground font-semibold px-3 py-1.5 text-xs hover:bg-primary/90 transition-colors"
                          >
                            <PlayCircle className="h-3.5 w-3.5" /> {step.action}
                          </button>
                        )}
                        {isDone && <span className="text-xs font-semibold text-green-700 shrink-0">✓ Done</span>}
                        {isRunning && <span className="text-xs font-semibold text-primary shrink-0">Running…</span>}
                        {!canRun && !isDone && !isRunning && (
                          <span className="text-xs text-muted-foreground/50 shrink-0">Waiting…</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function EmergencyPage() {
  const qc = useQueryClient();

  const { data: plan } = useQuery({ queryKey: ["emergency-plan"], queryFn: () => dataService.getEmergencyPlan() });
  const { data: brief } = useQuery({ queryKey: ["emergency-brief"], queryFn: () => dataService.getEmergencyBrief() });
  const { data: institutions = [] } = useQuery({ queryKey: ["emergency-institutions"], queryFn: () => dataService.listEmergencyInstitutions() });
  const { data: careCircle = [] } = useQuery({ queryKey: ["care-circle"], queryFn: () => dataService.listCareCircle() });

  const [editOpen, setEditOpen] = useState(false);
  const [coordEdit, setCoordEdit] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simPath, setSimPath] = useState<SimPath | null>(null);
  const [simPathPicker, setSimPathPicker] = useState(false);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); });
  }, []);
  const [coordDraft, setCoordDraft] = useState<{ name: string; phone: string; relationship: string; backupName: string; backupPhone: string }>({ name: "", phone: "", relationship: "", backupName: "", backupPhone: "" });
  const [draft, setDraft] = useState<Partial<EmergencyPlan>>({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [newInst, setNewInst] = useState("");
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => { if (plan) setDraft(plan); }, [plan]);
  useEffect(() => {
    if (plan) setCoordDraft({
      name: plan.coordinatorName ?? "", phone: plan.coordinatorPhone ?? "",
      relationship: plan.coordinatorRelationship ?? "",
      backupName: plan.backupCoordinatorName ?? "", backupPhone: plan.backupCoordinatorPhone ?? "",
    });
  }, [plan]);

  async function saveCoordinator() {
    setSaving(true);
    const ok = await dataService.saveEmergencyPlan({
      coordinatorName: coordDraft.name, coordinatorPhone: coordDraft.phone,
      coordinatorRelationship: coordDraft.relationship,
      backupCoordinatorName: coordDraft.backupName, backupCoordinatorPhone: coordDraft.backupPhone,
    });
    if (ok) {
      qc.invalidateQueries({ queryKey: ["emergency-plan"] });
      toast.success("Coordinator saved"); setCoordEdit(false);
    } else toast.error("Could not save");
    setSaving(false);
  }

  const isActive = plan?.activationStatus === "Active";

  async function savePlan() {
    setSaving(true);
    const ok = await dataService.saveEmergencyPlan(draft);
    if (ok) {
      if (draft.coordinatorName) void dataService.markSectionComplete("emergency");
      qc.invalidateQueries({ queryKey: ["emergency-plan"] });
      toast.success("Emergency plan saved");
      setEditOpen(false);
    } else { toast.error("Could not save"); }
    setSaving(false);
  }

  async function toggleActivation() {
    const next = isActive ? "Standby" : "Active";
    if (next === "Active" && !confirm("Activate the emergency plan? This marks the plan LIVE.")) return;
    const ok = await dataService.saveEmergencyPlan({
      activationStatus: next,
      activatedAt: next === "Active" ? new Date().toISOString() : null,
    });
    if (ok) { qc.invalidateQueries({ queryKey: ["emergency-plan"] }); toast.success(next === "Active" ? "Plan ACTIVATED" : "Plan stood down"); }
  }

  async function downloadCard() {
    setDownloading(true);
    try { await generateEmergencyCard(); } catch { toast.error("Could not generate card"); }
    finally { setDownloading(false); }
  }

  async function addInstitution(name: string) {
    if (!name.trim()) return;
    await dataService.addEmergencyInstitution({ orgName: name.trim(), isNotified: false });
    qc.invalidateQueries({ queryKey: ["emergency-institutions"] });
    setNewInst("");
  }
  async function toggleInst(i: EmergencyInstitution) {
    qc.setQueryData<EmergencyInstitution[]>(["emergency-institutions"], prev =>
      (prev ?? []).map(x => x.id === i.id ? { ...x, isNotified: !x.isNotified } : x));
    await dataService.toggleEmergencyInstitution(i.id, !i.isNotified);
  }

  // Readiness drill
  const gaps: string[] = [];
  if (!plan?.coordinatorName) gaps.push("No Emergency Coordinator set");
  if (!brief?.emergencyContacts.length) gaps.push("No emergency contacts (flag members in Care Circle)");
  if (!brief?.medications.length) gaps.push("No current medications recorded");
  if (!brief?.bloodGroup) gaps.push("Blood group missing from Child Profile");
  if (!brief?.tonightResidence) gaps.push("No emergency residence set (Residential plan)");
  else {
    if (!brief.tonightResidence.hasConsent) gaps.push("Emergency residence: caregiver consent not confirmed");
    if (!brief.tonightResidence.hasKeysAccess) gaps.push("Emergency residence: caregiver has no keys/access");
  }
  if (!plan?.breakGlassInstructions) gaps.push("No break-glass access instructions documented");
  const readyCount = 7 - gaps.length;

  return (
    <div className="space-y-5 max-w-5xl">
      <ChapterBanner chapterKey="emergency" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" /> Emergency Continuity Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What to do in the first 24 hours -- if you are gone, can a trusted person keep your child safe?
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadCard} disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-low disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Card
          </button>
          <button onClick={() => setSimPathPicker(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white font-semibold px-4 py-2.5 text-sm hover:bg-amber-700">
            <ClipboardCheck className="h-4 w-4" /> Run Simulation
          </button>
          <button onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 text-sm hover:bg-primary/90">
            <Edit3 className="h-4 w-4" /> Edit Plan
          </button>
        </div>
      </div>

      {/* Activation banner */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${isActive ? "bg-red-50 border-red-300" : "bg-surface-low border-border"}`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
          <div>
            <div className={`font-bold ${isActive ? "text-red-700" : "text-foreground"}`}>
              {isActive ? "PLAN ACTIVE" : "Plan on Standby"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isActive && plan?.activatedAt ? `Activated ${new Date(plan.activatedAt).toLocaleString("en-IN")}` : "Ready to activate when needed"}
            </div>
          </div>
        </div>
        <button onClick={toggleActivation}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${isActive ? "border border-border hover:bg-card" : "bg-red-600 text-white hover:bg-red-700"}`}>
          {isActive ? "Stand Down" : "Activate Plan"}
        </button>
      </div>

      {/* Emergency Coordinator -- CALL FIRST */}
      <div className="legacy-card border-l-4 border-l-red-500 p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="text-xs font-bold uppercase tracking-widest text-red-600">Call First — Emergency Coordinator</div>
          <button onClick={() => setCoordEdit(e => !e)} className="text-xs text-primary hover:underline shrink-0">
            {coordEdit ? "Cancel" : plan?.coordinatorName ? "Edit" : "Set"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Must be someone other than you — a legal guardian, trustee, or second-in-command who can act immediately.</p>

        {coordEdit ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><label className={LABEL}>Name *</label><input className={INPUT} value={coordDraft.name} placeholder="e.g. Priya Sharma" onChange={e => setCoordDraft(d => ({...d, name: e.target.value}))} /></div>
              <div><label className={LABEL}>Phone *</label><input className={INPUT} value={coordDraft.phone} placeholder="+91 99999 99999" onChange={e => setCoordDraft(d => ({...d, phone: e.target.value}))} /></div>
              <div><label className={LABEL}>Relationship</label><input className={INPUT} value={coordDraft.relationship} placeholder="e.g. Sister, Trustee" onChange={e => setCoordDraft(d => ({...d, relationship: e.target.value}))} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={LABEL}>Backup Name</label><input className={INPUT} value={coordDraft.backupName} placeholder="Backup coordinator" onChange={e => setCoordDraft(d => ({...d, backupName: e.target.value}))} /></div>
              <div><label className={LABEL}>Backup Phone</label><input className={INPUT} value={coordDraft.backupPhone} onChange={e => setCoordDraft(d => ({...d, backupPhone: e.target.value}))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCoordEdit(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={saveCoordinator} disabled={saving || !coordDraft.name || !coordDraft.phone}
                className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        ) : plan?.coordinatorName ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <div className="text-lg font-bold text-foreground">{plan.coordinatorName}</div>
              <div className="text-xs text-muted-foreground">{plan.coordinatorRelationship || "Coordinator"}</div>
            </div>
            {plan.coordinatorPhone && (
              <a href={`tel:${plan.coordinatorPhone}`} className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700">
                <Phone className="h-4 w-4" /> {plan.coordinatorPhone}
              </a>
            )}
            {plan.backupCoordinatorName && (
              <div className="text-sm text-muted-foreground">
                Backup: <span className="font-medium text-foreground">{plan.backupCoordinatorName}</span>
                {plan.backupCoordinatorPhone && <a href={`tel:${plan.backupCoordinatorPhone}`} className="ml-2 text-primary">{plan.backupCoordinatorPhone}</a>}
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setCoordEdit(true)} className="text-sm text-primary hover:underline">+ Set the one person to call first</button>
        )}
      </div>

      {/* Readiness drill */}
      <div className={`rounded-2xl border p-5 ${gaps.length === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className={`h-5 w-5 ${gaps.length === 0 ? "text-green-600" : "text-amber-600"}`} />
            Readiness Check
          </div>
          <span className={`text-sm font-bold ${gaps.length === 0 ? "text-green-700" : "text-amber-700"}`}>{readyCount}/7 ready</span>
        </div>
        {gaps.length === 0 ? (
          <p className="text-sm text-green-800">Your emergency plan is complete. Review every 6 months.</p>
        ) : (
          <ul className="space-y-1">
            {gaps.map(g => (
              <li key={g} className="flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {g}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* First 24 Hours brief -- aggregated */}
      <div className="legacy-card p-5">
        <h2 className="font-bold text-foreground flex items-center gap-2 mb-1">
          <Heart className="h-5 w-5 text-primary" /> First 24 Hours -- {brief?.childName ?? "Your child"}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Everything a caregiver needs immediately -- pulled live from your plan.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <BriefBlock icon={Pill} title="Critical Medications">
            {brief?.medications.length ? (
              <ul className="space-y-1 text-sm">
                {brief.medications.map((m, i) => <li key={i}>- <strong>{m.name}</strong> {m.dose} <span className="text-muted-foreground">({m.frequency})</span></li>)}
              </ul>
            ) : <Empty link="/medical" label="Add medications" />}
          </BriefBlock>
          <BriefBlock icon={Stethoscope} title="Medical Snapshot">
            <div className="text-sm space-y-0.5">
              <div>Blood Group: <strong>{brief?.bloodGroup || "--"}</strong></div>
              {brief?.allergies && <div>Allergies: <strong>{brief.allergies}</strong></div>}
              {brief?.emergencyMedicalInfo && <div className="text-muted-foreground">{brief.emergencyMedicalInfo}</div>}
              {!brief?.bloodGroup && !brief?.allergies && <Empty link="/child-profile" label="Add medical info" />}
            </div>
          </BriefBlock>
          <BriefBlock icon={Music} title="Avoid -- Sensory Triggers">
            {brief?.behavioralTriggers ? <p className="text-sm">{brief.behavioralTriggers}</p> : <Empty link="/child-profile" label="Add triggers" />}
          </BriefBlock>
          <BriefBlock icon={Heart} title="Comfort Routines">
            {brief?.comfortItems ? <p className="text-sm">{brief.comfortItems}</p> : <Empty link="/child-profile" label="Add comfort items" />}
          </BriefBlock>
          <BriefBlock icon={HomeIcon} title="Where They Sleep Tonight">
            {brief?.tonightResidence ? (
              <div className="text-sm">
                <div className="font-semibold">{brief.tonightResidence.name}</div>
                <div className="text-xs text-muted-foreground">{brief.tonightResidence.optionType}{brief.tonightResidence.city ? ` - ${brief.tonightResidence.city}` : ""}</div>
                {brief.tonightResidence.caregiverName && <div className="mt-1">{brief.tonightResidence.caregiverName} {brief.tonightResidence.caregiverPhone && <a href={`tel:${brief.tonightResidence.caregiverPhone}`} className="text-primary">{brief.tonightResidence.caregiverPhone}</a>}</div>}
                <div className="mt-1 flex gap-3 text-xs">
                  <span className={brief.tonightResidence.hasConsent ? "text-green-700" : "text-red-600"}>Consent {brief.tonightResidence.hasConsent ? "OK" : "MISSING"}</span>
                  <span className={brief.tonightResidence.hasKeysAccess ? "text-green-700" : "text-red-600"}>Keys {brief.tonightResidence.hasKeysAccess ? "OK" : "MISSING"}</span>
                </div>
              </div>
            ) : <Empty link="/residential" label="Set emergency residence" />}
          </BriefBlock>
          <BriefBlock icon={Stethoscope} title="Doctors">
            {brief?.doctors.length ? (
              <ul className="space-y-1 text-sm">
                {brief.doctors.map((d, i) => <li key={i}><strong>{d.name}</strong> <span className="text-muted-foreground">{d.role}</span> {d.phone && <a href={`tel:${d.phone}`} className="text-primary">{d.phone}</a>}</li>)}
              </ul>
            ) : <Empty link="/medical" label="Add doctors" />}
          </BriefBlock>
        </div>
      </div>


      {/* Who Does What — care circle responsibilities */}
      {careCircle.filter(m => m.responsibilities?.length).length > 0 && (
        <div className="legacy-card p-5">
          <h2 className="font-bold text-foreground flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-primary" /> Who Does What — First 24 Hours
          </h2>
          <div className="space-y-3">
            {careCircle.filter(m => m.responsibilities?.length).map(m => (
              <div key={m.id} className="rounded-xl border border-border bg-surface-low p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <span className="text-sm font-bold text-foreground">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.role} · {m.relation}</span>
                  </div>
                  {m.phone && <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-xs text-primary font-semibold"><Phone className="h-3 w-3" />{m.phone}</a>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.responsibilities?.map(r => (
                    <span key={r} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Care Delivery Plan */}
      <div className="legacy-card p-5">
        <h2 className="font-bold text-foreground flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-primary" /> Care Delivery Plan
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Set what each caregiver and successor receives — via email or secure vault access.
        </p>
        <CareDeliveryPlan />
      </div>

      {/* Break-glass + Financial bridge */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="legacy-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-1"><KeyRound className="h-4 w-4 text-primary" /> Break-Glass Access</h3>
          <p className="text-xs text-muted-foreground mb-2">Physical access instructions — safe location, locker key, who holds copies. Never store passwords here.</p>
          {plan?.breakGlassInstructions ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{plan.breakGlassInstructions}</p>
          ) : (
            <button onClick={() => setEditOpen(true)} className="text-sm text-primary hover:underline">+ Document it</button>
          )}
        </div>
        <div className="legacy-card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-primary" /> Financial Bridge</h3>
          {plan?.financialBridgeNotes ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{plan.financialBridgeNotes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">How will the caregiver fund the first weeks of care? <button onClick={() => setEditOpen(true)} className="text-primary hover:underline">Document it</button>.</p>
          )}
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={o => !o && setEditOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle>Edit Emergency Plan</DialogTitle>
          <div className="space-y-4 mt-3">
            <fieldset className="rounded-lg border border-border p-4 space-y-3">
              <legend className="text-xs font-bold uppercase tracking-widest text-red-600 px-1">Emergency Coordinator (Call First)</legend>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Name</label><input className={INPUT} value={draft.coordinatorName ?? ""} onChange={e => setDraft(d => ({ ...d, coordinatorName: e.target.value }))} /></div>
                <div><label className={LABEL}>Phone</label><input className={INPUT} value={draft.coordinatorPhone ?? ""} onChange={e => setDraft(d => ({ ...d, coordinatorPhone: e.target.value }))} /></div>
              </div>
              <div><label className={LABEL}>Relationship</label><input className={INPUT} value={draft.coordinatorRelationship ?? ""} placeholder="e.g. Brother, Trustee" onChange={e => setDraft(d => ({ ...d, coordinatorRelationship: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Backup Name</label><input className={INPUT} value={draft.backupCoordinatorName ?? ""} onChange={e => setDraft(d => ({ ...d, backupCoordinatorName: e.target.value }))} /></div>
                <div><label className={LABEL}>Backup Phone</label><input className={INPUT} value={draft.backupCoordinatorPhone ?? ""} onChange={e => setDraft(d => ({ ...d, backupCoordinatorPhone: e.target.value }))} /></div>
              </div>
            </fieldset>
            <div><label className={LABEL}>Break-Glass Access (how trustee gets in -- never store passwords)</label>
              <textarea rows={3} className={`${INPUT} resize-none`} value={draft.breakGlassInstructions ?? ""}
                placeholder="e.g. Vault login shared with primary trustee. Originals in the locker at..., key with..."
                onChange={e => setDraft(d => ({ ...d, breakGlassInstructions: e.target.value }))} /></div>
            <div><label className={LABEL}>Financial Bridge (funding the first weeks)</label>
              <textarea rows={3} className={`${INPUT} resize-none`} value={draft.financialBridgeNotes ?? ""}
                placeholder="e.g. Joint savings a/c with nominee, emergency fund of Rs X, reimbursement via trust"
                onChange={e => setDraft(d => ({ ...d, financialBridgeNotes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={savePlan} disabled={saving} className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Plan
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Activation Protocol ── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <ActivationCoordinators />
      </div>

      {/* ── Path Picker Dialog ── */}
      {simPathPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-background rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Emergency Simulation</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choose how the emergency is triggered</p>
              </div>
              <button onClick={() => setSimPathPicker(false)} className="p-2 rounded-lg hover:bg-surface-low">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                <strong>Simulation only</strong> — Steps are real database actions (status updates, notifications) but no actual emergency is raised. Use this to test and rehearse your plan with your family.
              </div>

              <button
                onClick={() => { setSimPath("parent"); setSimPathPicker(false); setSimOpen(true); }}
                className="w-full rounded-xl border-2 border-red-200 bg-red-50 hover:border-red-400 p-4 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-bold text-red-800">Parent-Initiated</div>
                    <div className="text-xs text-red-700/80 mt-0.5">
                      You (the parent) are triggering the emergency. 7 steps: notify coordinator, share brief, alert care circle, notify institutions, grant vault access.
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setSimPath("coordinator"); setSimPathPicker(false); setSimOpen(true); }}
                className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 p-4 text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-800">Coordinator-Initiated</div>
                    <div className="text-xs text-amber-700/80 mt-0.5">
                      Coordinators cannot reach the parent and trigger the process. 6 steps: alert submission, majority confirmation, LegacyNest calls coordinator, activation, care circle notified.
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Simulation Panel ── */}
      {simOpen && simPath && userId && (
        <SimulationPanel
          path={simPath}
          plan={plan}
          brief={brief}
          institutions={institutions}
          careCircle={careCircle}
          userId={userId}
          onComplete={() => {
            qc.invalidateQueries({ queryKey: ["emergency-plan"] });
            toast.success("Simulation complete — Emergency Process Initiated.", { duration: 5000 });
          }}
          onClose={() => { setSimOpen(false); setSimPath(null); }}
        />
      )}
    </div>
  );
}

// ── Activation Coordinators Section ─────────────────────────────────────────

type Coordinator = {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  activation_code: string;
  code_sent_at: string | null;
};

type Consent = {
  signed_at: string;
  checkin_freq: string;
  last_checkin_at: string | null;
  auto_trigger_hours: number | null;
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function majorityNeeded(total: number): number {
  return Math.floor(total / 2) + 1;
}

function ActivationCoordinators() {
  const [coords, setCoords] = useState<Coordinator[]>([]);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState<Coordinator | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [autoTrigger, setAutoTrigger] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", relationship: "" });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [c, co] = await Promise.all([
      pdb.from("emergency_coordinators").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
      pdb.from("emergency_consent").select("*").eq("user_id", user.id).single(),
    ]);
    setCoords((c.data ?? []) as Coordinator[]);
    const con = co.data as Consent | null;
    setConsent(con);
    setAutoTrigger(con?.auto_trigger_hours ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCoordinator() {
    if (!form.name || !form.email || !form.relationship) return toast.error("Name, email and relationship are required.");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not signed in."); return; }
      const code = generateCode();
      const { error } = await pdb.from("emergency_coordinators").insert({
        user_id: user.id, ...form, activation_code: code,
      });
      if (error) toast.error(`Could not add coordinator: ${error.message}`);
      else { toast.success("Coordinator added."); setForm({ name: "", email: "", phone: "", relationship: "" }); setShowAdd(false); await load(); }
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAll() {
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Must delete requests first (FK constraint)
      await supabase.from("emergency_activation_requests").delete().eq("user_id", user.id);
      await pdb.from("emergency_coordinators").delete().eq("user_id", user.id);
      await pdb.from("emergency_consent").delete().eq("user_id", user.id);
      toast.success("Protocol deleted. You can set it up again from scratch.");
      setShowDeleteConfirm(false);
      await load();
    } catch (e: unknown) {
      toast.error(`Delete failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setDeleting(false);
    }
  }

  async function markCodeSent(id: string) {
    await pdb.from("emergency_coordinators").update({ code_sent_at: new Date().toISOString() }).eq("id", id);
    await load();
  }

  async function signConsent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const total = coords.length;
    const needed = majorityNeeded(total);
    const consentText = `I, the account holder, authorise LegacyNest to activate my Emergency Plan when ${needed} of ${total} named Emergency Coordinators submit a confirmation request via legacynest.co.in/emergency-confirm using their registered email and activation code. I consent to LegacyNest notifying my Care Circle members and sharing role-specific documents upon activation. Signed: ${new Date().toISOString()}`;

    // Try with auto_trigger_hours first; fall back without it if column doesn't exist yet
    let { error } = await pdb.from("emergency_consent").upsert({
      user_id: user.id, signed_at: new Date().toISOString(), consent_text: consentText,
      majority_rule: `${needed} of ${total}`, checkin_freq: "monthly",
      auto_trigger_hours: autoTrigger,
    }, { onConflict: "user_id" });

    if (error?.message?.includes("auto_trigger_hours")) {
      // Migration 038 not yet run — save without it
      ({ error } = await pdb.from("emergency_consent").upsert({
        user_id: user.id, signed_at: new Date().toISOString(), consent_text: consentText,
        majority_rule: `${needed} of ${total}`, checkin_freq: "monthly",
      }, { onConflict: "user_id" }));
    }

    if (!error) { toast.success("Consent signed and recorded."); setShowConsent(false); await load(); }
    else toast.error(`Could not save consent: ${error.message}`);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => { setCopied(code); setTimeout(() => setCopied(null), 2000); });
  }

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const total = coords.length;
  const needed = majorityNeeded(total);
  const consentSigned = !!consent?.signed_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <UserCheck className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Emergency Activation Protocol</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Designate 3–5 trusted people. If something happens to you, a majority of them can
                trigger LegacyNest to activate your emergency plan — sharing the right documents with
                the right caregivers.
              </p>
            </div>
          </div>
          {(total > 0 || consentSigned) && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="shrink-0 text-xs text-destructive hover:underline font-semibold mt-1"
            >
              Delete &amp; restart
            </button>
          )}
        </div>

        {/* Status row */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold ${total >= 3 ? "bg-success/10 text-success" : "bg-warning-soft text-warning"}`}>
            {total >= 3 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {total} coordinator{total !== 1 ? "s" : ""} {total >= 3 ? "✓" : "(min 3 needed)"}
          </span>
          {total >= 3 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full font-semibold bg-surface-container text-muted-foreground">
              <Shield className="h-3 w-3" /> Majority = {needed} of {total}
            </span>
          )}
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold ${consentSigned ? "bg-success/10 text-success" : "bg-warning-soft text-warning"}`}>
            {consentSigned ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            Consent {consentSigned ? "signed" : "not signed"}
          </span>
        </div>
      </div>

      {/* Coordinator list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Your Coordinators</h3>
          {!consentSigned && total < 5 && (
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add coordinator
            </button>
          )}
        </div>

        {coords.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No coordinators yet. Add at least 3 trusted people.
          </div>
        )}

        {coords.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-surface-low rounded-full">{c.relationship}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
              </div>
            </div>

            {/* Activation code */}
            <div className="mt-3 rounded-lg bg-surface-low border border-border p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Activation Code</div>
                  <div className="font-mono text-base font-bold text-primary tracking-widest">{c.activation_code}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Share this code privately with {c.name.split(" ")[0]}. They'll need it to confirm activation.</div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => copyCode(c.activation_code)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                  >
                    {copied === c.activation_code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied === c.activation_code ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => setShowEmailPreview(c)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-deep px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Bell className="h-3 w-3" />
                    Send Email
                  </button>
                </div>
              </div>
              {c.code_sent_at && (
                <div className="mt-2 text-[10px] text-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Code shared on {new Date(c.code_sent_at).toLocaleDateString("en-IN")}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <h4 className="text-sm font-bold text-foreground">New coordinator</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={LABEL}>Full Name *</label><input className={INPUT} placeholder="e.g. Priya Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className={LABEL}>Email *</label><input type="email" className={INPUT} placeholder="rituja@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className={LABEL}>Phone</label><input className={INPUT} placeholder="+91 99999 99999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className={LABEL}>Relationship *</label>
                <select className={INPUT} value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}>
                  <option value="">Select…</option>
                  {["Spouse", "Sibling", "Parent", "Child (adult)", "Close Friend", "Trusted Family Member", "Legal Advisor", "Other"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={addCoordinator} disabled={saving} className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto-trigger setting (only before consent is signed) */}
      {total >= 3 && !consentSigned && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Auto-Activation Timer</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Once majority is reached, automatically activate without waiting for manual admin review.
              Leave off to require admin approval (recommended for first setup).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Off (manual review)", value: null },
              { label: "5 minutes", value: 0.083 },
              { label: "1 hour", value: 1 },
              { label: "12 hours", value: 12 },
              { label: "24 hours", value: 24 },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setAutoTrigger(opt.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  autoTrigger === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface-low text-foreground border-border hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {autoTrigger !== null && (
            <p className="text-xs text-warning font-medium">
              ⚡ Once {majorityNeeded(total)} of {total} coordinators confirm, the plan activates automatically after{" "}
              {autoTrigger === 0.083 ? "5 minutes" : autoTrigger === 1 ? "1 hour" : `${autoTrigger} hours`}.
              No admin review required.
            </p>
          )}
        </div>
      )}

      {/* Consent */}
      {total >= 3 && (
        <div className={`rounded-xl border p-5 ${consentSigned ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5"}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {consentSigned ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Shield className="h-4 w-4 text-primary" />}
                Activation Consent
              </h3>
              {consentSigned ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Signed on {new Date(consent!.signed_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
                  Majority rule: {consent?.majority_rule}.{" "}
                  {consent?.auto_trigger_hours
                    ? `Auto-activates ${consent.auto_trigger_hours === 0.083 ? "5 minutes" : consent.auto_trigger_hours === 1 ? "1 hour" : `${consent.auto_trigger_hours} hours`} after majority.`
                    : "Requires admin review."}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  You must sign consent before the activation protocol is active. This authorises LegacyNest
                  to act on coordinator confirmations and is kept as a legal record.
                </p>
              )}
            </div>
            {!consentSigned && (
              <button onClick={() => setShowConsent(true)} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shrink-0">
                Review & Sign
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm URL */}
      {consentSigned && (
        <div className="rounded-xl border border-border bg-surface-low p-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Coordinator Confirmation URL</div>
          <div className="font-mono text-sm text-primary break-all">https://www.legacynest.co.in/emergency-confirm</div>
          <p className="text-xs text-muted-foreground mt-1">Share this URL with your coordinators so they know where to go if needed.</p>
        </div>
      )}

      {/* ── Fixed overlays (guaranteed above everything) ── */}

      {/* Delete confirm overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Delete Activation Protocol?</h3>
            <p className="text-sm text-muted-foreground">
              This permanently deletes all coordinators and the signed consent. Existing activation codes will stop working. You can set up a new protocol from scratch.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={deleteAll} disabled={deleting} className="rounded-lg bg-destructive text-white px-5 py-2 text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2">
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent overlay */}
      {showConsent && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-foreground">Emergency Activation Consent</h3>
            <div className="rounded-lg bg-surface-low border border-border p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">I hereby authorise LegacyNest</strong> to activate my Emergency Continuity Plan under the following conditions:</p>
              <p>1. When <strong className="text-foreground">{needed} of {total}</strong> Emergency Coordinators I have named submit a confirmation request at legacynest.co.in/emergency-confirm using their registered email and unique activation code.</p>
              <p>2. LegacyNest will review all requests before taking any action{autoTrigger ? ` (auto-activates after ${autoTrigger === 0.083 ? "5 minutes" : autoTrigger === 1 ? "1 hour" : `${autoTrigger} hours`})` : " within 24 hours"}.</p>
              <p>3. Upon activation, LegacyNest will share role-specific documents with each named caregiver — limited to what I have tagged them for. Daily caregivers will not receive financial or legal documents.</p>
              <p>4. The Emergency Plan PDF will be sent to all named Emergency Coordinators.</p>
              <p>5. This consent is stored permanently as a legal record.</p>
              <p>6. LegacyNest acts in good faith and is not liable for false activations made in bad faith by coordinators.</p>
              <p className="font-semibold text-foreground pt-1">Coordinators: {coords.map(c => c.name).join(", ")}</p>
              <p className="font-semibold text-foreground">Majority required: {needed} of {total}</p>
              {autoTrigger && <p className="font-semibold text-foreground">Auto-trigger: {autoTrigger === 0.083 ? "5 minutes" : autoTrigger === 1 ? "1 hour" : `${autoTrigger} hours`} after majority</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConsent(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <button onClick={signConsent} className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold">
                I Agree — Sign Consent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email preview overlay */}
      {showEmailPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-foreground">Email to {showEmailPreview.name}</h3>
            <div className="rounded-lg bg-surface-low border border-border p-4 text-xs text-muted-foreground leading-relaxed space-y-2 font-mono whitespace-pre-wrap">
{`To: ${showEmailPreview.email}
Subject: LegacyNest — Your Emergency Activation Code

Hi ${showEmailPreview.name.split(" ")[0]},

I have named you as an Emergency Coordinator on LegacyNest — a lifetime care planning platform for my family.

Your role: If something happens to me, you can trigger the release of my family's care plan to the right people.

To do this, visit:
https://www.legacynest.co.in/emergency-confirm

Your personal activation code is:

${showEmailPreview.activation_code}

Please keep this code private and safe. Only use it if something has genuinely happened to me.

Thank you for being part of my family's plan.`}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEmailPreview(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
              <a
                href={`mailto:${showEmailPreview.email}?subject=LegacyNest%20%E2%80%94%20Your%20Emergency%20Activation%20Code&body=Hi%20${encodeURIComponent(showEmailPreview.name.split(" ")[0])}%2C%0A%0AI%20have%20named%20you%20as%20an%20Emergency%20Coordinator%20on%20LegacyNest%20%E2%80%94%20a%20lifetime%20care%20planning%20platform%20for%20my%20family.%0A%0AYour%20role%3A%20If%20something%20happens%20to%20me%2C%20you%20can%20trigger%20the%20release%20of%20my%20family%E2%80%99s%20care%20plan%20to%20the%20right%20people.%0A%0ATo%20do%20this%2C%20visit%3A%0Ahttps%3A%2F%2Fwww.legacynest.co.in%2Femergency-confirm%0A%0AYour%20personal%20activation%20code%20is%3A%0A%0A${showEmailPreview.activation_code}%0A%0APlease%20keep%20this%20code%20private%20and%20safe.%0A%0AThank%20you%20for%20being%20part%20of%20my%20family%E2%80%99s%20plan.`}
                onClick={() => { markCodeSent(showEmailPreview.id); setShowEmailPreview(null); }}
                className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold inline-flex items-center gap-2"
              >
                <Bell className="h-4 w-4" /> Open Email App & Send
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefBlock({ icon: Icon, title, children }: { icon: typeof Pill; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-low p-4">
      <div className="flex items-center gap-2 font-semibold text-sm mb-2"><Icon className="h-4 w-4 text-primary" /> {title}</div>
      {children}
    </div>
  );
}

function Empty({ link, label }: { link: string; label: string }) {
  return <Link to={link as "/medical"} className="text-xs text-primary hover:underline">+ {label}</Link>;
}
