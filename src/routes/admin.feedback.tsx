import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Star, Mail, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});

type Feedback = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number | null;
  status: string;
  created_at: string;
};

function AdminFeedbackPage() {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Feedback[];
    },
    refetchInterval: 30000,
  });

  const avgRating = data.filter(f => f.rating).length > 0
    ? (data.filter(f => f.rating).reduce((s, f) => s + (f.rating ?? 0), 0) / data.filter(f => f.rating).length).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Feedback</h1>
          <p className="text-white/40 text-sm mt-1">
            {data.length} submission{data.length !== 1 ? "s" : ""}
            {avgRating && ` · Average rating: ${avgRating} ★`}
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
          <Star className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <div className="text-white/30 text-sm">No feedback received yet.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.map(f => (
            <div key={f.id} className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{f.name}</div>
                  <div className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3" /> {f.email}
                  </div>
                </div>
                {f.rating && (
                  <div className="flex items-center gap-1 text-amber-400 shrink-0">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < f.rating! ? "fill-current" : "opacity-20"}`} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-white/30 uppercase tracking-widest mb-1">{f.subject}</div>
                <p className="text-sm text-white/70 leading-relaxed">{f.message}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(f.created_at).toLocaleString("en-IN")}
                </span>
                <a href={`mailto:${f.email}?subject=Re: ${f.subject}`}
                  className="text-xs text-primary hover:text-primary/80 font-semibold">
                  Reply →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
