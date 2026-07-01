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
import { BreakGlassBlocks } from "@/components/emergency/BreakGlassBlocks";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { dataService, type EmergencyPlan, type EmergencyBrief, type EmergencyInstitution } from "@/lib/data/mock";
import { generateEmergencyCard } from "@/lib/emergency-card";
import { EMAIL_PROVIDERS, sendViaProvider, type EmailProvider } from "@/lib/email-providers";

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


function EmergencyPage() {
  const qc = useQueryClient();

  const { data: plan } = useQuery({ queryKey: ["emergency-plan"], queryFn: () => dataService.getEmergencyPlan() });
  const { data: brief } = useQuery({ queryKey: ["emergency-brief"], queryFn: () => dataService.getEmergencyBrief() });
  const { data: institutions = [] } = useQuery({ queryKey: ["emergency-institutions"], queryFn: () => dataService.listEmergencyInstitutions() });
  const { data: careCircle = [] } = useQuery({ queryKey: ["care-circle"], queryFn: () => dataService.listCareCircle() });

  const [coordEdit, setCoordEdit] = useState(false);

  const [coordDraft, setCoordDraft] = useState<{ name: string; phone: string; relationship: string; backupName: string; backupPhone: string }>({ name: "", phone: "", relationship: "", backupName: "", backupPhone: "" });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [newInst, setNewInst] = useState("");

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

  async function toggleActivation() {
    const next = isActive ? "Standby" : "Active";
    if (next === "Active" && !confirm("Activate the emergency plan? This marks the plan LIVE.")) return;
    const ok = await dataService.saveEmergencyPlan({
      activationStatus: next,
      activatedAt: next === "Active" ? new Date().toISOString() : null,
    });
    if (ok) {
      if (next === "Standby") await dataService.resetBreakGlassReleased();
      qc.invalidateQueries({ queryKey: ["emergency-plan"] });
      toast.success(next === "Active" ? "Plan ACTIVATED" : "Plan stood down");
    }
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
            Decide what your caregivers should know, name who gets it, and set up how your coordinators can act if something happens to you.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadCard} disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-low disabled:opacity-60">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Card
          </button>
        </div>
      </div>

      {/* Activation banner — always at top, prominent */}
      <div className={`rounded-2xl border-2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isActive ? "bg-red-50 border-red-400" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`h-4 w-4 rounded-full shrink-0 ${isActive ? "bg-red-500 animate-pulse" : "bg-red-300"}`} />
          <div className="min-w-0">
            <div className={`font-bold text-lg ${isActive ? "text-red-700" : "text-red-800"}`}>
              {isActive ? "🔴 EMERGENCY PLAN ACTIVE" : "Activate Emergency Plan"}
            </div>
            <div className="text-xs text-red-600/80">
              {isActive && plan?.activatedAt
                ? `Activated ${new Date(plan.activatedAt).toLocaleString("en-IN")} — coordinators can now see the plan as live`
                : "Press only in a real emergency — this marks the plan live for your coordinators"}
            </div>
          </div>
        </div>
        <button
          onClick={toggleActivation}
          disabled={!isActive && !plan?.coordinatorName}
          title={!plan?.coordinatorName && !isActive ? "Set Emergency Coordinator before activating" : undefined}
          className={`shrink-0 w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isActive
              ? "border-2 border-red-300 text-red-700 hover:bg-red-100"
              : "bg-red-600 text-white hover:bg-red-700 shadow-md"
          }`}>
          {isActive ? "Stand Down" : <>🚨 <span className="sm:hidden">Activate</span><span className="hidden sm:inline">Activate Emergency</span></>}
        </button>
      </div>

      {/* Emergency Coordinator -- CALL FIRST */}
      <div className="legacy-card border-l-4 border-l-green-400 p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="text-xs font-bold uppercase tracking-widest text-green-700">Call First — Emergency Coordinator</div>
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
              <a href={`tel:${plan.coordinatorPhone}`} className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700">
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

      {/* Break-glass information — 4 domain blocks with primary/backup caregivers */}
      <BreakGlassBlocks />

      {/* ── Activation Protocol ── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <ActivationCoordinators />
      </div>
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
  const [form, setForm] = useState({ name: "", email: "", phone: "", relationship: "" });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [c, co] = await Promise.all([
      pdb.from("emergency_coordinators").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
      pdb.from("emergency_consent").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setCoords((c.data ?? []) as Coordinator[]);
    const con = co.data as Consent | null;
    setConsent(con);
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

  function buildCoordinatorEmail(c: Coordinator) {
    const subject = "LegacyNest — Your Emergency Activation Code";
    const body =
      `Hi ${c.name.split(" ")[0]},\n\n` +
      `I have named you as an Emergency Coordinator on LegacyNest — a lifetime care planning platform for my family.\n\n` +
      `Your role: If something happens to me, you can trigger the release of my family's care plan to the right people.\n\n` +
      `To do this, visit:\nhttps://www.legacynest.co.in/emergency-confirm\n\n` +
      `Your personal activation code is:\n\n${c.activation_code}\n\n` +
      `Please keep this code private and safe. Only use it if something has genuinely happened to me.\n\n` +
      `Thank you for being part of my family's plan.`;
    return { to: c.email, subject, body };
  }

  async function sendCoordinatorEmail(c: Coordinator, provider: EmailProvider) {
    const draft = buildCoordinatorEmail(c);
    const providerInfo = EMAIL_PROVIDERS.find(p => p.key === provider)!;
    await sendViaProvider(provider, draft, draft.body);
    toast.success(
      providerInfo.opensNewTab
        ? `Opening ${providerInfo.label} with the code ready to send…`
        : "Opening your default email app…",
      { duration: 4000 },
    );
    await markCodeSent(c.id);
    setShowEmailPreview(null);
  }

  async function signConsent() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const total = coords.length;
    const needed = majorityNeeded(total);
    const consentText = `I, the account holder, authorise LegacyNest to activate my Emergency Plan when ${needed} of ${total} named Emergency Coordinators submit a confirmation request via legacynest.co.in/emergency-confirm using their registered email and activation code. I consent to LegacyNest notifying my Care Circle members and sharing role-specific documents upon activation. Signed: ${new Date().toISOString()}`;

    // Plan activation is always reviewed and approved by a LegacyNest admin — no auto-trigger option.
    const { error } = await pdb.from("emergency_consent").upsert({
      user_id: user.id, signed_at: new Date().toISOString(), consent_text: consentText,
      majority_rule: `${needed} of ${total}`, checkin_freq: "monthly",
    }, { onConflict: "user_id" });

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
              <p>2. LegacyNest will review all requests before taking any action, within 24 hours.</p>
              <p>3. Upon activation, LegacyNest will share role-specific documents with each named caregiver — limited to what I have tagged them for. Daily caregivers will not receive financial or legal documents.</p>
              <p>4. The Emergency Plan PDF will be sent to all named Emergency Coordinators.</p>
              <p>5. This consent is stored permanently as a legal record.</p>
              <p>6. LegacyNest acts in good faith and is not liable for false activations made in bad faith by coordinators.</p>
              <p className="font-semibold text-foreground pt-1">Coordinators: {coords.map(c => c.name).join(", ")}</p>
              <p className="font-semibold text-foreground">Majority required: {needed} of {total}</p>
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
              {`To: ${showEmailPreview.email}\nSubject: ${buildCoordinatorEmail(showEmailPreview).subject}\n\n${buildCoordinatorEmail(showEmailPreview).body}`}
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">Send with:</div>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_PROVIDERS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => sendCoordinatorEmail(showEmailPreview, p.key)}
                    className="inline-flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-low transition-colors"
                  >
                    {p.label}
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowEmailPreview(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
