import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, CheckCircle2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/LegacyNest_Logo.jpeg";

export const Route = createFileRoute("/emergency-confirm")({
  head: () => ({ meta: [{ title: "Emergency Activation — LegacyNest" }] }),
  component: EmergencyConfirmPage,
});

type Step = "form" | "submitting" | "done" | "error";

function EmergencyConfirmPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) return;
    setStep("submitting");

    // Use SECURITY DEFINER function — bypasses RLS for unauthenticated lookup
    const { data: result, error: rpcErr } = await supabase.rpc("verify_emergency_coordinator", {
      p_email: email.toLowerCase().trim(),
      p_code: code.toUpperCase().trim(),
    });

    if (rpcErr || !result?.found) {
      setErrorMsg("We could not find a coordinator with this email and activation code. Please check both and try again.");
      setStep("error");
      return;
    }

    if (result.already_submitted) {
      setErrorMsg("Your confirmation has already been recorded. LegacyNest will review all requests before taking action. Thank you.");
      setStep("error");
      return;
    }

    // Insert the activation request
    const { error } = await supabase.from("emergency_activation_requests").insert({
      user_id: result.user_id,
      coordinator_id: result.coordinator_id,
      coordinator_email: email.toLowerCase().trim(),
      message: message.trim() || null,
    });

    if (error) {
      setErrorMsg("Something went wrong. Please try again or contact support.");
      setStep("error");
      return;
    }

    // Check if majority just reached — stamp majority_reached_at
    const { data: allReqs } = await supabase
      .from("emergency_activation_requests")
      .select("coordinator_email")
      .eq("user_id", result.user_id)
      .neq("status", "rejected");

    const { data: totalCoords } = await supabase
      .from("emergency_coordinators")
      .select("id")
      .eq("user_id", result.user_id);

    const confirmations = new Set((allReqs ?? []).map((r: { coordinator_email: string }) => r.coordinator_email)).size;
    const total = (totalCoords ?? []).length;
    const majority = Math.floor(total / 2) + 1;

    if (confirmations >= majority) {
      // Only stamp if not already stamped
      await supabase
        .from("emergency_consent")
        .update({ majority_reached_at: new Date().toISOString() })
        .eq("user_id", result.user_id)
        .is("majority_reached_at", null);
    }

    setStep("done");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="LegacyNest" className="h-12 w-12 rounded-xl mx-auto mb-3 object-cover" />
          <div className="text-lg font-bold text-foreground">LegacyNest</div>
          <div className="text-sm text-muted-foreground">Emergency Activation Request</div>
        </div>

        {step === "done" ? (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Confirmation Received</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your request has been recorded. LegacyNest will review all coordinator confirmations
              within 24 hours before taking any action. Thank you for your care.
            </p>
            <p className="text-xs text-muted-foreground">
              If you have questions, email us at legacynest.co.in@gmail.com
            </p>
          </div>
        ) : step === "error" ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-sm text-foreground leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => setStep("form")}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-low"
            >
              Try again
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-8 space-y-5 shadow-sm">
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-sm text-foreground/80 leading-relaxed">
              <strong>You have been named as an Emergency Coordinator.</strong> If something has happened
              to the plan owner, please complete this form. LegacyNest will review all requests before
              taking any action.
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">Must match the email the plan owner registered you with.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Activation Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3C7XYZ"
                maxLength={8}
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">The 8-character code shared with you by the plan owner.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">What happened? (optional)</label>
              <textarea
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Brief description of the situation — e.g. hospitalised, passed away, incapacitated..."
                className="w-full rounded-lg border border-border bg-surface-low px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={step === "submitting" || !email || !code}
              className="w-full rounded-lg bg-primary text-primary-foreground py-3 text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {step === "submitting" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                "Submit Activation Request"
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              LegacyNest reviews all requests within 24 hours. No plan is activated without human review.
              Your submission is permanently recorded as a legal document.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
