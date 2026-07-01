import type React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/LegacyNest_Logo.jpeg";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In — LegacyNest" },
      { name: "description", content: "Securely sign in to your LegacyNest family plan." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Enter the email address on your account.");
      return;
    }
    setLoading(true);
    try {
      // Supabase does not error when the email has no account (avoids leaking
      // which emails are registered) — a thrown error here is a real failure
      // (rate limit, malformed address, network) and should be shown.
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        // Create the account
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpErr) throw signUpErr;

        // If email confirmation is required Supabase returns a user with no session
        if (signUpData.session) {
          // Confirmed immediately (email confirmation disabled in Supabase).
          // New users normally arrive via the /start journey; a direct sign-in
          // signup goes straight to the app.
          navigate({ to: "/dashboard" });
        } else {
          // Email confirmation required
          setInfo("Account created! Check your inbox for a confirmation email, then sign in.");
          setMode("signin");
        }
      } else {
        // Sign in
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          // Auto-provision: if user doesn't exist yet, create + sign in
          if (/invalid login credentials/i.test(signInErr.message) || /invalid credentials/i.test(signInErr.message)) {
            const { data: provData, error: provErr } = await supabase.auth.signUp({
              email: email.trim(),
              password,
            });
            if (provErr) throw provErr;
            if (provData.session) {
              navigate({ to: "/dashboard" });
              return;
            }
            // Needs email confirmation
            setInfo("A new account was created. Check your inbox to confirm, then sign in.");
            return;
          }
          throw signInErr;
        }
        if (data.session) {
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/email not confirmed/i.test(msg)) {
        setError("Please confirm your email first. Check your inbox for the verification link.");
      } else if (/user already registered/i.test(msg)) {
        setError("An account with this email already exists. Switch to Sign In.");
        setMode("signin");
      } else {
        setError(msg);
      }
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
          <p className="mt-1 text-sm text-muted-foreground">Securing generations, one plan at a time.</p>
        </div>

        <div className="legacy-card p-7">
          {mode === "forgot" ? (
            <>
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); setInfo(null); setResetSent(false); }}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </button>

              {resetSent ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If an account exists for <strong>{email.trim()}</strong>, we've sent a link to reset your password.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setResetSent(false); }}
                    className="mt-5 text-sm font-semibold text-primary hover:underline"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-foreground mb-1">Reset your password</h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Enter the email on your account and we'll send you a link to set a new password.
                  </p>
                  <form onSubmit={onForgotSubmit} className="space-y-4" noValidate>
                    <Field label="Email Address" htmlFor="forgot-email">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="forgot-email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="parent@example.com"
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
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden mb-6">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    mode === "signin"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-low text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    mode === "signup"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-low text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={onSubmit} className="space-y-4 mt-4" noValidate>
                <Field label="Email Address" htmlFor="email">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full rounded-lg border border-border bg-surface-low pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="password">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                  {mode === "signup" ? (
                    <p className="mt-1 text-xs text-muted-foreground">Minimum 6 characters. This is your permanent password.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); setInfo(null); }}
                      className="mt-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </Field>

                {info && (
                  <div className="flex gap-2 rounded-md bg-primary/10 text-primary px-3 py-2.5 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{info}</span>
                  </div>
                )}

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
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create Account & Continue" : "Sign In"}{" "}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
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

function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center">
      <div className="flex-1 border-t border-border" />
      <span className="mx-3 text-xs text-muted-foreground bg-card px-1">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

