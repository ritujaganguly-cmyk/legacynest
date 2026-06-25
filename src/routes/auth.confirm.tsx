import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import logo from "@/assets/LegacyNest_Logo.jpeg";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/confirm")({
  component: AuthConfirmPage,
});

function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function confirm() {
      // Read hash fragment or query params
      const hash = window.location.hash;
      const search = window.location.search;
      const params = new URLSearchParams(hash.replace("#", "?").replace("?", "") || search);

      const errorParam = params.get("error");
      if (errorParam) {
        const desc = params.get("error_description") ?? "The confirmation link is invalid or has expired.";
        setErrorMsg(desc.replace(/\+/g, " "));
        setStatus("error");
        return;
      }

      const tokenHash = params.get("token_hash");
      const type = params.get("type") as "email" | "signup" | null;

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
        } else {
          setStatus("success");
          setTimeout(() => navigate({ to: "/dashboard" }), 2000);
        }
        return;
      }

      // Try to get the session from URL (older flow)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("success");
        setTimeout(() => navigate({ to: "/dashboard" }), 1500);
      } else {
        setErrorMsg("Confirmation link is invalid or has expired. Please request a new one.");
        setStatus("error");
      }
    }

    confirm();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#fdf6ee] flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center space-y-5">
        <img src={logo} alt="LegacyNest" className="h-14 w-14 mx-auto object-contain mix-blend-multiply" />
        <div className="text-xl font-bold text-foreground">LegacyNest</div>

        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Confirming your email address…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Email confirmed!</p>
              <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard…</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Link expired or invalid</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <div className="space-y-2">
              <Link to="/sign-in"
                className="block w-full rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2.5 text-sm hover:bg-primary/90 transition-colors">
                Go to Sign In
              </Link>
              <p className="text-xs text-muted-foreground">Sign in and use the resend confirmation option if needed.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
