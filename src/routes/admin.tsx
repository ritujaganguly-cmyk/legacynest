import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS: string[] = [
  "ganguly80@gmail.com",
  "legacynest.co.in@gmail.com",
  ...(import.meta.env.VITE_ADMIN_EMAIL ? [import.meta.env.VITE_ADMIN_EMAIL as string] : []),
];

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user?.email;
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw redirect({ to: "/sign-in" });
    }
  },
  component: AdminShell,
});

function AdminShell() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const tabs = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/emergency", label: "🚨 Emergency" },
    { to: "/admin/support", label: "📩 Support" },
    { to: "/admin/feedback", label: "💬 Feedback" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="border-b border-white/10 bg-[#1a1a1a] px-6 py-0 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 py-3">
            <span className="text-lg font-bold text-primary">LegacyNest</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">ADMIN</span>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map(t => (
              <Link
                key={t.to}
                to={t.to}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  pathname.startsWith(t.to)
                    ? "border-primary text-primary"
                    : "border-transparent text-white/50 hover:text-white/80"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <span className="text-xs text-white/40">Admin</span>
      </header>
      <Outlet />
    </div>
  );
}
