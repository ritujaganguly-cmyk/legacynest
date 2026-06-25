import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Mail, Phone, Clock, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  query: string;
  status: string;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  "New":         "bg-red-500/20 text-red-400 border-red-500/30",
  "In Progress": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Resolved":    "bg-green-500/20 text-green-400 border-green-500/30",
};

function AdminSupportPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-support"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportRequest[];
    },
    refetchInterval: 30000,
  });

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from("support_requests").update({ status }).eq("id", id);
    setUpdating(null);
    refetch();
  }

  const counts = {
    new: data.filter(r => r.status === "New").length,
    inProgress: data.filter(r => r.status === "In Progress").length,
    resolved: data.filter(r => r.status === "Resolved").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Requests</h1>
          <p className="text-white/40 text-sm mt-1">
            {counts.new} new · {counts.inProgress} in progress · {counts.resolved} resolved
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-white/40 text-center py-12">Loading…</div>
      ) : data.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-12 text-center">
          <Mail className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <div className="text-white/30 text-sm">No support requests yet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(r => {
            const isExp = expanded === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
                <button
                  onClick={() => setExpanded(isExp ? null : r.id)}
                  className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{r.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? STATUS_COLOR["New"]}`}>{r.status}</span>
                      <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{r.category}</span>
                    </div>
                    <p className="text-sm text-white/60 truncate">{r.query}</p>
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>
                      {r.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.created_at).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </button>

                {isExp && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-4">
                    <div className="bg-[#111] rounded-lg p-4">
                      <p className="text-xs text-white/30 mb-1 uppercase tracking-widest">Query</p>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{r.query}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Update status:</span>
                      {["New", "In Progress", "Resolved"].map(s => (
                        <button
                          key={s}
                          onClick={() => updateStatus(r.id, s)}
                          disabled={updating === r.id || r.status === s}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                            r.status === s
                              ? "bg-primary/20 border-primary/40 text-primary"
                              : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                          }`}
                        >
                          {r.status === s ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {s}
                        </button>
                      ))}
                    </div>
                    <a href={`mailto:${r.email}?subject=Re: LegacyNest Support — ${r.category}&body=Dear ${r.name},%0A%0A`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                      <Mail className="w-4 h-4" /> Reply via email
                    </a>
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
