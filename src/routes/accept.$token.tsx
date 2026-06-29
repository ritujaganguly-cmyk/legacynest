import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, HeartPulse, Landmark, Scale, Loader2, CheckCircle2, X, ShieldCheck } from "lucide-react";
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

type Invite = {
  member_name: string | null;
  email: string;
  block: string;
  rank: "primary" | "backup";
  status: string;
  inviter_name: string;
  child_name: string | null;
};

function AcceptInvite() {
  const { token } = useParams({ from: "/accept/$token" });
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc("get_break_glass_invite", { p_token: token });
      if (err || !data) { setError("This invitation link is invalid or has expired."); setLoading(false); return; }
      const inv = data as Invite;
      setInvite(inv);
      if (inv.status === "accepted") setResponded("accepted");
      if (inv.status === "declined") setResponded("declined");
      setLoading(false);
    })();
  }, [token]);

  async function respond(accept: boolean) {
    setSubmitting(true);
    const { error: err } = await supabase.rpc("respond_break_glass_invite", { p_token: token, p_accept: accept });
    setSubmitting(false);
    if (err) { setError("Could not record your response. Please try again."); return; }
    setResponded(accept ? "accepted" : "declined");
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
          <h1 className="text-xl font-bold text-foreground">A trusted-caregiver request</h1>
        </div>

        {responded ? (
          <div className="px-7 py-10 text-center">
            {responded === "accepted" ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">Thank you 💛</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  You've accepted to be the {invite.rank} caregiver for {child}'s {meta.label.toLowerCase()}.
                  {invite.inviter_name} has been notified.
                </p>
              </>
            ) : (
              <>
                <X className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">Response recorded</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  You've declined this request. {invite.inviter_name} can name someone else.
                </p>
              </>
            )}
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
