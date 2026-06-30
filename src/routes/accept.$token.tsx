import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, HeartPulse, Landmark, Scale, Loader2, CheckCircle2, X, ShieldCheck, FileText, Lock, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/LegacyNest_Logo.jpeg";

export const Route = createFileRoute("/accept/$token")({
  component: AcceptInvite,
});

const BLOCK_META: Record<string, { label: string; Icon: typeof Heart; desc: string }> = {
  daily_care: { label: "Daily Care", Icon: Heart, desc: "their daily routine and comfort" },
  medical: { label: "Medical", Icon: HeartPulse, desc: "their medical needs" },
  financial: { label: "Financial", Icon: Landmark, desc: "financial matters" },
  legal: { label: "Legal", Icon: Scale, desc: "legal matters" },
};

type SharedFile = { id: string; name: string; category: string };

type Invite = {
  member_name: string | null;
  email: string;
  block: string;
  rank: "primary" | "backup";
  status: string;
  inviter_name: string;
  child_name: string | null;
  block_text: string | null;
  is_active: boolean;
  release_mode: "timer" | "manual";
  is_released: boolean;
  unlocks_at: string | null;
  shared_files: SharedFile[] | null;
};

function AcceptInvite() {
  const { token } = useParams({ from: "/accept/$token" });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openingDoc, setOpeningDoc] = useState<string | null>(null);

  async function load() {
    const { data, error: err } = await supabase.rpc("get_break_glass_invite", { p_token: token });
    if (err || !data) { setError("This invitation link is invalid or has expired."); setLoading(false); return; }
    const inv = data as Invite;
    setInvite(inv);
    if (inv.status === "accepted") setResponded("accepted");
    if (inv.status === "declined") setResponded("declined");
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function respond(accept: boolean) {
    setSubmitting(true);
    const { error: err } = await supabase.rpc("respond_break_glass_invite", { p_token: token, p_accept: accept });
    setSubmitting(false);
    if (err) { setError("Could not record your response. Please try again."); return; }
    setResponded(accept ? "accepted" : "declined");
    await load(); // re-fetch with full shared-info now that they've responded
  }

  async function viewDocument(docId: string) {
    setOpeningDoc(docId);
    const { data, error: err } = await supabase.functions.invoke("get-break-glass-file", { body: { token, docId } });
    setOpeningDoc(null);
    if (err || !data?.url) {
      toast.error((data as { error?: string } | null)?.error || "Could not open this document yet.");
      return;
    }
    window.open(data.url, "_blank");
  }

  if (loading) {
    return <div className="min-h-screen bg-[#fdf6ee] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-[#fdf6ee] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-md text-center">
          <X className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-semibold">{error || "Invitation not found."}</p>
          <p className="text-sm text-muted-foreground mt-2">Please contact the family who invited you.</p>
        </div>
      </div>
    );
  }

  const meta = BLOCK_META[invite.block] ?? { label: invite.block, Icon: ShieldCheck, desc: "their care" };
  const Icon = meta.Icon;
  const child = invite.child_name || "their child";
  const files = invite.shared_files ?? [];

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2 mb-6">
        <img src={logo} alt="LegacyNest" className="h-9 w-9 object-contain mix-blend-multiply" />
        <span className="text-xl font-bold text-primary">LegacyNest</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border w-full max-w-lg overflow-hidden">
        <div className="bg-primary/5 border-b border-border px-7 py-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {responded === "accepted" ? `${child}'s ${meta.label}` : "A trusted-caregiver request"}
          </h1>
        </div>

        {responded === "accepted" ? (
          <div className="px-7 py-7 space-y-5">
            <div className="text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You're the <strong>{invite.rank}</strong> {meta.label.toLowerCase()} caregiver for {child}. Here's what's shared with you.
              </p>
            </div>

            {/* Status: not active / pending review / released */}
            {!invite.is_active ? (
              <div className="rounded-xl bg-surface-low border border-border px-4 py-3 flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">No emergency is active right now. This information will be shared if one is declared.</p>
              </div>
            ) : invite.is_released ? (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800"><strong>Emergency is active.</strong> The information below is available now.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Emergency is active.</strong>{" "}
                  {invite.release_mode === "timer"
                    ? `This unlocks automatically${invite.unlocks_at ? ` at ${new Date(invite.unlocks_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`
                    : `This is being reviewed and will be shared${invite.unlocks_at ? ` by ${new Date(invite.unlocks_at).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}` : " soon"}.`}
                </p>
              </div>
            )}

            {/* Break-glass info text — held back until released */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{meta.label} summary</div>
              {!invite.is_released ? (
                <p className="text-sm text-muted-foreground italic">Locked until released.</p>
              ) : invite.block_text ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-surface-low border border-border p-4">{invite.block_text}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">{invite.inviter_name} hasn't written this yet.</p>
              )}
            </div>

            {/* Shared documents — held back until released */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents</span>
              </div>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No documents have been shared for this role yet.</p>
              ) : (
                <ul className="space-y-2">
                  {files.map(f => (
                    <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
                        <div className="text-[10px] text-muted-foreground">{f.category}</div>
                      </div>
                      {invite.is_released ? (
                        <button
                          onClick={() => viewDocument(f.id)}
                          disabled={openingDoc === f.id}
                          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                        >
                          {openingDoc === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} View
                        </button>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : responded === "declined" ? (
          <div className="px-7 py-10 text-center">
            <X className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground">Response recorded</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              You've declined this request. {invite.inviter_name} can name someone else.
            </p>
          </div>
        ) : (
          <div className="px-7 py-7 space-y-5">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>{invite.inviter_name}</strong> has named you as the{" "}
              <strong>{invite.rank === "backup" ? "backup" : "primary"}</strong> caregiver for{" "}
              <strong>{child}'s {meta.label}</strong> in their LegacyNest emergency plan.
            </p>
            <div className="rounded-xl bg-surface-low border border-border p-4 text-sm text-muted-foreground leading-relaxed">
              In an emergency, you may be relied upon to help with {meta.desc}. By accepting, you confirm you're willing to take on this role. You can be removed at any time.
            </div>
            <div className="flex gap-3">
              <button onClick={() => respond(true)} disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold py-3 hover:bg-primary/90 disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Accept
              </button>
              <button onClick={() => respond(false)} disabled={submitting}
                className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-surface-low disabled:opacity-60">
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-5">LegacyNest — securing every child's future</p>
    </div>
  );
}
