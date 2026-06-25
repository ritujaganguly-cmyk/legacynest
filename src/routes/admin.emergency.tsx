import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, Shield,
  Phone, Mail, Users, Clock, Zap, ChevronDown, ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/emergency")({
  component: AdminEmergencyPage,
});

type CareCircleMember = { name: string; phone: string; email: string; relationship: string };
type Coordinator = { name: string; email: string; phone: string; relationship: string };
type Request = { coordinator_email: string; message: string; submitted_at: string; document_url?: string };

type ActivationCase = {
  parent_email: string;
  user_id: string;
  parent_name: string | null;
  parent_phone: string | null;
  call_first_name: string | null;
  call_first_phone: string | null;
  call_first_relationship: string | null;
  backup_name: string | null;
  backup_phone: string | null;
  confirmations: number;
  total_coordinators: number;
  first_request_at: string;
  last_request_at: string;
  is_activated: boolean;
  auto_trigger_hours: number | null;
  majority_reached_at: string | null;
  care_circle: CareCircleMember[] | null;
  coordinators: Coordinator[] | null;
  requests: Request[];
};

function autoTriggerLabel(h: number | null): string {
  if (h === null) return "Manual review";
  if (h === 0.083) return "5 minutes";
  if (h === 1) return "1 hour";
  if (h === 12) return "12 hours";
  if (h === 24) return "24 hours";
  return `${h}h`;
}

function CountdownTimer({ reachedAt, hours }: { reachedAt: string; hours: number }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const deadline = new Date(reachedAt).getTime() + hours * 60 * 60 * 1000;
      const diff = deadline - Date.now();
      if (diff <= 0) { setRemaining("NOW — auto-activating"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m remaining` : m > 0 ? `${m}m ${s}s remaining` : `${s}s remaining`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [reachedAt, hours]);

  const deadline = new Date(reachedAt).getTime() + hours * 60 * 60 * 1000;
  const expired = Date.now() >= deadline;

  return (
    <span className={`text-xs font-bold flex items-center gap-1 ${expired ? "text-red-400" : "text-orange-400"}`}>
      <Clock className="w-3 h-3" /> {remaining}
    </span>
  );
}

function AdminEmergencyPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ type: "approved" | "rejected"; case: ActivationCase } | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-emergency"],
    queryFn: async () => {
      const res = await supabase.rpc("admin_get_activation_requests");
      return (res.data ?? []) as ActivationCase[];
    },
    refetchInterval: 10000,
  });

  // Auto-approve cases where timer has expired
  useEffect(() => {
    if (!data) return;
    data.forEach(async (r) => {
      if (r.is_activated || !r.auto_trigger_hours || !r.majority_reached_at) return;
      const majority = Math.floor(r.total_coordinators / 2) + 1;
      if (r.confirmations < majority) return;
      const deadline = new Date(r.majority_reached_at).getTime() + r.auto_trigger_hours * 3600000;
      if (Date.now() >= deadline) {
        await doActivate(r.user_id, r.parent_email, true);
      }
    });
  }, [data]);

  async function doActivate(userId: string, parentEmail: string, auto = false) {
    const r = data?.find(x => x.user_id === userId);
    setActing(userId);
    const { error } = await supabase.from("emergency_activations").insert({
      user_id: userId,
      activated_by: auto ? "auto-trigger" : "admin@legacynest.co.in",
      activation_note: auto
        ? "Auto-activated after timer expired following majority coordinator confirmation."
        : "Approved by admin after majority coordinator confirmation.",
    });
    if (!error) {
      await supabase.from("emergency_activation_requests")
        .update({ status: "counted" }).eq("user_id", userId);
      if (!auto && r) setActionResult({ type: "approved", case: r });
      refetch();
    }
    setActing(null);
  }

  async function reject(userId: string) {
    const r = data?.find(x => x.user_id === userId);
    setActing(userId);
    await supabase.from("emergency_activation_requests")
      .update({ status: "rejected" }).eq("user_id", userId);
    if (r) setActionResult({ type: "rejected", case: r });
    refetch();
    setActing(null);
  }

  const cases = data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" /> Emergency Activations
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Review coordinator confirmations and approve or reject emergency plan activations.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-center py-12">Loading…</div>
      ) : cases.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <div className="text-white/30 text-sm">No activation requests — all plans are at rest.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((r) => {
            const majority = Math.floor(r.total_coordinators / 2) + 1;
            const majorityReached = r.confirmations >= majority;
            const isExp = expanded === r.user_id;
            const autoTriggerActive = r.auto_trigger_hours !== null && majorityReached && r.majority_reached_at;

            return (
              <div key={r.user_id} className={`rounded-xl border overflow-hidden ${
                r.is_activated ? "border-green-500/30" : majorityReached ? "border-orange-500/40" : "border-white/10"
              }`}>
                {/* Case header */}
                <div className={`p-5 ${r.is_activated ? "bg-green-900/10" : majorityReached ? "bg-orange-900/10" : "bg-[#1a1a1a]"}`}>
                  {/* CALL FIRST — hero element */}
                  {r.call_first_name ? (
                    <div className="mb-4 rounded-xl bg-red-900/40 border-2 border-red-500/60 p-4">
                      <div className="text-[10px] font-bold text-red-300 uppercase tracking-widest mb-2">📞 CALL THIS PERSON FIRST — Emergency Coordinator</div>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-white font-bold text-xl">{r.call_first_name}</div>
                          <div className="text-red-300/80 text-sm">{r.call_first_relationship || "Emergency Coordinator"}</div>
                        </div>
                        {r.call_first_phone && (
                          <a href={`tel:${r.call_first_phone}`} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black px-5 py-3 rounded-xl text-base transition-colors shadow-lg">
                            <Phone className="w-5 h-5" /> {r.call_first_phone}
                          </a>
                        )}
                      </div>
                      {r.backup_name && (
                        <div className="mt-3 pt-3 border-t border-red-500/30 text-xs text-white/50 flex items-center gap-2 flex-wrap">
                          <span className="text-white/30">If no answer, call backup:</span>
                          <span className="text-white/70 font-semibold">{r.backup_name}</span>
                          {r.backup_phone && <a href={`tel:${r.backup_phone}`} className="text-red-400 font-bold">{r.backup_phone}</a>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30 p-3 text-xs text-yellow-400">
                      ⚠ No emergency coordinator set by parent. Review care circle contacts below.
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold">{r.parent_name || r.parent_email}</span>
                        {r.is_activated && <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ ACTIVATED</span>}
                        {!r.is_activated && majorityReached && <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">⚠ MAJORITY REACHED</span>}
                        {autoTriggerActive && !r.is_activated && (
                          <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> AUTO-TRIGGER: {autoTriggerLabel(r.auto_trigger_hours)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-3 flex-wrap">
                        <span>{r.parent_email}</span>
                        {r.parent_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.parent_phone}</span>}
                        <span>{r.confirmations}/{r.total_coordinators} confirmations · majority = {majority}</span>
                        <span>{new Date(r.first_request_at).toLocaleString("en-IN")}</span>
                      </div>
                      {autoTriggerActive && !r.is_activated && r.majority_reached_at && (
                        <CountdownTimer reachedAt={r.majority_reached_at} hours={r.auto_trigger_hours!} />
                      )}
                      {!r.is_activated && (
                        <span className="text-xs text-white/30">Manual review required</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {!r.is_activated && majorityReached && (
                        <button
                          onClick={() => doActivate(r.user_id, r.parent_email)}
                          disabled={acting === r.user_id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {!r.is_activated && (
                        <button
                          onClick={() => reject(r.user_id)}
                          disabled={acting === r.user_id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-red-900/40 hover:bg-red-900/70 text-red-400 px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(isExp ? null : r.user_id)}
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 px-2 py-2 transition-colors"
                      >
                        {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExp ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div className="border-t border-white/10 bg-[#111] p-5 grid md:grid-cols-3 gap-6">
                    {/* Coordinator confirmations */}
                    <div>
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Confirmations
                      </h4>
                      <div className="space-y-2">
                        {r.requests.map((req, i) => (
                          <div key={i} className="bg-black/30 rounded-lg p-3 space-y-1">
                            <div className="text-xs font-semibold text-white/70 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {req.coordinator_email}
                            </div>
                            <div className="text-[10px] text-white/30">{new Date(req.submitted_at).toLocaleString("en-IN")}</div>
                            {req.message && <div className="text-xs text-white/60 italic">"{req.message}"</div>}
                            {req.document_url && <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View document</a>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emergency coordinators */}
                    <div>
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-primary" /> All Coordinators
                      </h4>
                      <div className="space-y-2">
                        {(r.coordinators ?? []).map((c, i) => (
                          <div key={i} className="bg-black/30 rounded-lg p-3 space-y-0.5">
                            <div className="text-xs font-semibold text-white/80">{c.name} <span className="text-white/30 font-normal">· {c.relationship}</span></div>
                            <div className="text-[10px] text-white/40 flex items-center gap-2 flex-wrap">
                              {c.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{c.phone}</span>}
                              <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{c.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Care circle */}
                    <div>
                      <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" /> Care Circle
                      </h4>
                      {(r.care_circle ?? []).length === 0 ? (
                        <div className="text-xs text-white/30">No care circle members</div>
                      ) : (
                        <div className="space-y-2">
                          {(r.care_circle ?? []).map((m, i) => (
                            <div key={i} className="bg-black/30 rounded-lg p-3 space-y-0.5">
                              <div className="text-xs font-semibold text-white/80">{m.name} <span className="text-white/30 font-normal">· {m.relationship}</span></div>
                              <div className="text-[10px] text-white/40 flex items-center gap-2 flex-wrap">
                                {m.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{m.phone}</span>}
                                {m.email && <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{m.email}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Action result overlay */}
      {actionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className={`rounded-2xl border p-6 max-w-lg w-full shadow-2xl space-y-5 ${
            actionResult.type === "approved" ? "bg-[#0a1f0a] border-green-500/40" : "bg-[#1f0a0a] border-red-500/40"
          }`}>
            <div className="flex items-center gap-3">
              {actionResult.type === "approved"
                ? <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                : <XCircle className="w-8 h-8 text-red-400 shrink-0" />}
              <div>
                <h3 className="text-white font-bold text-lg">
                  {actionResult.type === "approved" ? "Plan Activated" : "Request Rejected"}
                </h3>
                <p className="text-white/50 text-sm">{actionResult.case.parent_name || actionResult.case.parent_email}</p>
              </div>
            </div>

            {actionResult.type === "approved" ? (
              <div className="space-y-3">
                <p className="text-green-300 text-sm font-medium">✓ Recorded in database. Now do the following manually:</p>
                <div className="space-y-2">
                  {/* Contact coordinators */}
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">1. Notify Coordinators</div>
                    {(actionResult.case.coordinators ?? []).map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <span className="text-xs text-white/70">{c.name}</span>
                        <div className="flex gap-2">
                          {c.phone && <a href={`tel:${c.phone}`} className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded">{c.phone}</a>}
                          <a href={`mailto:${c.email}?subject=LegacyNest%20Emergency%20Plan%20Activated&body=The%20emergency%20plan%20for%20${encodeURIComponent(actionResult.case.parent_name || actionResult.case.parent_email)}%20has%20been%20activated.%20Please%20follow%20the%20care%20instructions%20shared%20with%20you.`}
                            className="text-[10px] bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">Email</a>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Care circle */}
                  {(actionResult.case.care_circle ?? []).length > 0 && (
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">2. Alert Care Circle</div>
                      {(actionResult.case.care_circle ?? []).map((m, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <span className="text-xs text-white/70">{m.name} <span className="text-white/30">· {m.relationship}</span></span>
                          <div className="flex gap-2">
                            {m.phone && <a href={`tel:${m.phone}`} className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded">{m.phone}</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-white/40 text-xs">3. Send the Emergency Plan PDF to all coordinators from the Vault section.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-red-300 text-sm">Request rejected. The coordinators' submissions have been marked as rejected.</p>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Inform the coordinator who contacted you:</div>
                  {(actionResult.case.coordinators ?? []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-xs text-white/70">{c.name}</span>
                      {c.phone && <a href={`tel:${c.phone}`} className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded">{c.phone}</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setActionResult(null)} className="rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
