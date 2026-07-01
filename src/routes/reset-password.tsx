import type React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/LegacyNest_Logo.jpeg";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — LegacyNest" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase processes the recovery link's tokens on load (detectSessionInUrl)
    // and fires a PASSWORD_RECOVERY auth event once the user is authenticated
    // for the sole purpose of setting a new password.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // In case the event already fired before this listener attached, also check
    // for an existing session established from the recovery link.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === "checking" ? "ready" : s));
    });

    const timeout = window.setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setDone(true);
      window.setTimeout(() => navigate({ to: "/dashboard" }), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-soft/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gold/30 blur-3xl" />
      </div>

      <main className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="LegacyNest" className="mx-auto h-24 w-24 object-contain mix-blend-multiply" />
          <h1 className="mt-4 text-3xl font-bold text-foreground">LegacyNest™</h1>
        </div>

        <div className="legacy-card p-7">
          {status === "checking" && (
            <div className="flex flex-col items-center py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground">This link has expired</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Password reset links are only valid for a short time. Request a new one from the sign-in page.
              </p>
              <a href="/sign-in" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
                Back to Sign In
              </a>
            </div>
          )}

          {status === "ready" && !done && (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">Set a new password</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose a new password for your account.</p>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <Field label="New Password" htmlFor="new-password">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-border bg-surface-low pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters.</p>
                </Field>

                <Field label="Confirm New Password" htmlFor="confirm-password">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="confirm-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-border bg-surface-low pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </Field>

                {error && (
                  <div className="flex gap-2 rounded-md bg-destructive/10 text-destructive px-3 py-2.5 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary-soft hover:bg-primary text-primary-foreground font-semibold py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Update Password <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground">Password updated</h2>
              <p className="mt-2 text-sm text-muted-foreground">Taking you to your dashboard…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
