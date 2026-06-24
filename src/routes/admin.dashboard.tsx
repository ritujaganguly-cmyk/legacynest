import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, FileText, Shield, Heart, Home, AlertTriangle, Wallet, BookOpen, UserCheck, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboard,
});

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [statsRes, signupsRes, statesRes, modulesRes, vaultRes] = await Promise.all([
        supabase.rpc("admin_get_stats"),
        supabase.rpc("admin_get_signups_by_day", { days_back: 30 }),
        supabase.rpc("admin_get_state_distribution"),
        supabase.rpc("admin_get_module_usage"),
        supabase.rpc("admin_get_vault_files_per_user"),
      ]);

      // Log any errors for debugging
      [statsRes, signupsRes, statesRes, modulesRes, vaultRes].forEach((r, i) => {
        if (r.error) console.error(`RPC error [${i}]:`, r.error);
      });

      return {
        stats: (statsRes.data ?? {}) as Record<string, number>,
        signups: (signupsRes.data as { date: string; count: number }[]) ?? [],
        states: (statesRes.data as { state: string; count: number }[]) ?? [],
        modules: (modulesRes.data as { module: string; users: number }[]) ?? [],
        vaultFiles: (vaultRes.data as { email: string; file_count: number; last_upload: string }[]) ?? [],
        errors: [statsRes, signupsRes, statesRes, modulesRes, vaultRes].map(r => r.error?.message).filter(Boolean),
      };
    },
    refetchInterval: 60000,
  });
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  Medical: <Heart className="w-4 h-4" />,
  "Care Circle": <Users className="w-4 h-4" />,
  Financial: <Wallet className="w-4 h-4" />,
  Legal: <Shield className="w-4 h-4" />,
  Vault: <BookOpen className="w-4 h-4" />,
  Succession: <UserCheck className="w-4 h-4" />,
  Insurance: <Shield className="w-4 h-4" />,
  Residential: <Home className="w-4 h-4" />,
  Emergency: <AlertTriangle className="w-4 h-4" />,
  Medications: <Heart className="w-4 h-4" />,
};

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
        <span className="text-primary/70">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, error, refetch, isFetching } = useAdminStats();
  const qc = useQueryClient();

  if (isLoading) return (
    <div className="flex items-center justify-center h-[80vh] text-white/40">Loading metrics…</div>
  );

  // Show RPC errors prominently
  if (data?.errors && data.errors.length > 0) return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-red-400">RPC Errors — SQL not applied yet</h1>
      {data.errors.map((e, i) => (
        <div key={i} className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm font-mono">{e}</div>
      ))}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 text-sm text-white/60">
        <p className="font-semibold text-white mb-2">Fix: Run this in Supabase SQL Editor</p>
        <p>Go to <span className="text-primary">Supabase Dashboard → SQL Editor</span> and run the contents of:</p>
        <code className="text-primary text-xs block mt-2">supabase/migrations/036_admin_stats.sql</code>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center justify-center h-[80vh] text-red-400">Failed to load stats. Check Supabase RPC functions.</div>
  );

  const { stats, signups, states, modules, vaultFiles } = data;
  const totalUsers = stats?.total_users ?? 0;
  const withProfile = stats?.total_child_profiles ?? 0;
  const completionRate = totalUsers > 0 ? Math.round((withProfile / totalUsers) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">LegacyNest platform metrics — live data</p>
        </div>
        <button
          onClick={() => { qc.invalidateQueries({ queryKey: ["admin-stats"] }); refetch(); }}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={totalUsers} sub={`+${stats?.new_users_7d ?? 0} this week`} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Active Plans" value={withProfile} sub={`${completionRate}% of users`} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="New (7 days)" value={stats?.new_users_7d ?? 0} sub={`${stats?.new_users_30d ?? 0} this month`} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Plan Completion" value={`${completionRate}%`} sub="users with child profile" icon={<UserCheck className="w-5 h-5" />} />
      </div>

      {/* Module usage + Signups chart */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Signups over 30 days */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">New Signups — Last 30 Days</h2>
          {signups.length === 0 ? (
            <div className="text-white/30 text-sm text-center py-10">No signup data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={signups}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#ffffff40" }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#ffffff40" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #ffffff20", borderRadius: 8 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#f97316" }} />
                <Bar dataKey="count" fill="#8B3A00" radius={[4, 4, 0, 0]}>
                  {signups.map((_, i) => <Cell key={i} fill="#8B3A00" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Module usage */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Module Adoption (unique users)</h2>
          {modules.length === 0 ? (
            <div className="text-white/30 text-sm text-center py-10">No module data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modules} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "#ffffff40" }} allowDecimals={false} />
                <YAxis type="category" dataKey="module" tick={{ fontSize: 10, fill: "#ffffff80" }} width={80} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #ffffff20", borderRadius: 8 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#f97316" }} />
                <Bar dataKey="users" fill="#8B3A00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Module detail cards */}
      <div>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Module Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {modules.map(m => (
            <div key={m.module} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary/70">{MODULE_ICONS[m.module] ?? <FileText className="w-4 h-4" />}</div>
              <div className="text-xl font-bold text-white">{Number(m.users)}</div>
              <div className="text-xs text-white/40">{m.module}</div>
            </div>
          ))}
        </div>
      </div>

      {/* State distribution */}
      {states.length > 0 && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Users by State</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {states.map(s => (
              <div key={s.state} className="text-center">
                <div className="text-xl font-bold text-white">{s.count}</div>
                <div className="text-xs text-white/40 truncate">{s.state}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vault file stats */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Vault Files</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-white/50">Total files: <span className="text-white font-bold">{stats?.total_vault_files ?? 0}</span></span>
            <span className="text-white/50">Users with files: <span className="text-white font-bold">{stats?.total_vault_users ?? 0}</span></span>
          </div>
        </div>
        {vaultFiles.length === 0 ? (
          <div className="text-white/30 text-sm text-center py-6">No vault files yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40 text-xs uppercase border-b border-white/10">
                  <th className="text-left pb-2 font-medium">User</th>
                  <th className="text-center pb-2 font-medium">Files</th>
                  <th className="text-right pb-2 font-medium">Last Upload</th>
                </tr>
              </thead>
              <tbody>
                {vaultFiles.map((row) => (
                  <tr key={row.email} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 text-white/70">{row.email}</td>
                    <td className="py-2 text-center">
                      <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium">{row.file_count}</span>
                    </td>
                    <td className="py-2 text-right text-white/40 text-xs">
                      {row.last_upload ? new Date(row.last_upload).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw counts */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Platform Totals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Child Profiles", key: "total_child_profiles" },
            { label: "Parent Profiles", key: "total_parent_profiles" },
            { label: "Care Circle Users", key: "total_care_circle" },
            { label: "Medical Records", key: "total_medical_records" },
            { label: "Legal Plans", key: "total_legal" },
            { label: "Financial Users", key: "total_financial_assets" },
            { label: "Vault Users", key: "total_vault_docs" },
            { label: "Insurance Users", key: "total_insurance" },
          ].map(({ label, key }) => (
            <div key={key} className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-white/50 text-sm">{label}</span>
              <span className="text-white font-semibold">{stats?.[key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Emergency Activation Panel ───────────────────────────────────────────────

type ActivationRequest = {
  parent_email: string;
  user_id: string;
  confirmations: number;
  total_coordinators: number;
  first_request_at: string;
  last_request_at: string;
  is_activated: boolean;
  requests: { coordinator_email: string; message: string; submitted_at: string; document_url?: string }[];
};

function EmergencyActivations() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-emergency"],
    queryFn: async () => {
      const res = await supabase.rpc("admin_get_activation_requests");
      return (res.data ?? []) as ActivationRequest[];
    },
    refetchInterval: 30000,
  });

  async function activate(userId: string, parentEmail: string) {
    setActing(userId);
    const { error } = await supabase.from("emergency_activations").insert({
      user_id: userId, activated_by: "admin@legacynest.co.in",
      activation_note: "Approved by admin. Majority coordinator confirmations received.",
    });
    if (!error) {
      await supabase.from("emergency_activation_requests").update({ status: "counted" }).eq("user_id", userId);
      alert(`Activation approved for ${parentEmail}.`);
      refetch();
    }
    setActing(null);
  }

  async function reject(userId: string) {
    setActing(userId);
    await supabase.from("emergency_activation_requests").update({ status: "rejected" }).eq("user_id", userId);
    refetch();
    setActing(null);
  }

  const requests = data ?? [];

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Emergency Activation Requests</h2>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-sm text-center py-4">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-8 flex flex-col items-center gap-2">
          <Shield className="w-8 h-8 text-white/10" />
          No activation requests — all plans are at rest.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const majority = Math.floor(r.total_coordinators / 2) + 1;
            const majorityReached = r.confirmations >= majority;
            const isExp = expanded === r.user_id;
            return (
              <div key={r.user_id} className={`rounded-xl border p-4 ${r.is_activated ? "border-green-500/30 bg-green-900/10" : majorityReached ? "border-orange-500/40 bg-orange-900/10" : "border-white/10 bg-[#222]"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">{r.parent_email}</span>
                      {r.is_activated && <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ ACTIVATED</span>}
                      {!r.is_activated && majorityReached && <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">⚠ MAJORITY REACHED</span>}
                    </div>
                    <div className="text-xs text-white/40 mt-1">{r.confirmations}/{r.total_coordinators} confirmations · majority = {majority} · {new Date(r.first_request_at).toLocaleString("en-IN")}</div>
                  </div>
                  {!r.is_activated && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {majorityReached && (
                        <button onClick={() => activate(r.user_id, r.parent_email)} disabled={acting === r.user_id}
                          className="flex items-center gap-1.5 text-xs font-bold bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      <button onClick={() => reject(r.user_id)} disabled={acting === r.user_id}
                        className="flex items-center gap-1.5 text-xs font-bold bg-red-900/40 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => setExpanded(isExp ? null : r.user_id)} className="text-xs text-white/40 hover:text-white/80 px-2 py-1.5">
                        {isExp ? "Hide" : "Details"}
                      </button>
                    </div>
                  )}
                </div>
                {isExp && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    {r.requests.map((req, i) => (
                      <div key={i} className="text-xs bg-black/20 rounded-lg p-3 space-y-1">
                        <div className="text-white/60 font-semibold">{req.coordinator_email}</div>
                        <div className="text-white/40">{new Date(req.submitted_at).toLocaleString("en-IN")}</div>
                        {req.message && <div className="text-white/70 italic">"{req.message}"</div>}
                        {req.document_url && <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View document</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
