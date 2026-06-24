import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid, Landmark, MapPin, Scale, Users, HeartPulse, AlertTriangle,
  Settings, HelpCircle, Bell, Shield, BookOpen, ClipboardList,
  Menu, X, LogOut, User, Lock, Pill, CalendarClock, ShieldAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/LegacyNest_Logo.jpeg";
import { useSession } from "@/lib/session-store";
import { dataService } from "@/lib/data/mock";

const NAV_PRIMARY = [
  { to: "/dashboard",         label: "Dashboard",          icon: LayoutGrid },
  { to: "/child-profile",     label: "Child Profile",      icon: Users },
  { to: "/parent-profile",    label: "Parent Profile",     icon: User },
  { to: "/care-circle",       label: "Care Circle",        icon: Users },
  { to: "/caregiver",         label: "Succession Planning",icon: ClipboardList },
  { to: "/emergency",         label: "Emergency",          icon: AlertTriangle },
  { to: "/medical",           label: "Medical",            icon: HeartPulse },
  { to: "/insurance-policies",label: "Insurance",          icon: Shield },
  { to: "/financial",         label: "Financial",          icon: Landmark },
  { to: "/legal",             label: "Legal",              icon: Scale },
  { to: "/residential",       label: "Residential",        icon: MapPin },
  { to: "/vault",             label: "Digital Vault",      icon: Lock },
  { to: "/support" as "/support", label: "Support",        icon: BookOpen },
] as const;

// ── Alert computation ────────────────────────────────────────────────────────
type Alert = {
  id: string;
  icon: typeof Bell;
  iconColor: string;
  title: string;
  message: string;
  urgency: "urgent" | "soon";
  link: string;
};

function daysFromToday(dateStr: string): number {
  const d = new Date(dateStr);
  const t = new Date();
  d.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

function useAlerts(loggedIn: boolean) {
  const { data: medRecords = [] } = useQuery({
    queryKey: ["medicalRecords"], queryFn: () => dataService.listMedicalRecords(),
    enabled: loggedIn, staleTime: 5 * 60 * 1000,
  });
  const { data: therapies = [] } = useQuery({
    queryKey: ["therapies"], queryFn: () => dataService.listTherapies(),
    enabled: loggedIn, staleTime: 5 * 60 * 1000,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["medications"], queryFn: () => dataService.listMedications(),
    enabled: loggedIn, staleTime: 5 * 60 * 1000,
  });
  const { data: insurance = [] } = useQuery({
    queryKey: ["insurance-policies"], queryFn: () => dataService.listInsurancePolicies(),
    enabled: loggedIn, staleTime: 5 * 60 * 1000,
  });

  const alerts: Alert[] = [];

  // Appointments in next 3 days
  medRecords.forEach(r => {
    const dateStr = r.nextAppointment || r.recordDate;
    if (!dateStr || r.status) return;
    const days = daysFromToday(dateStr);
    if (days >= 0 && days <= 3) {
      alerts.push({
        id: `appt-${r.id}`,
        icon: CalendarClock,
        iconColor: "text-blue-600",
        title: `Appointment: ${r.title}`,
        message: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`,
        urgency: days <= 1 ? "urgent" : "soon",
        link: "/medical",
      });
    }
  });

  // Therapy sessions in next 3 days
  therapies.forEach(t => {
    if (!t.nextSession || t.status) return;
    const days = daysFromToday(t.nextSession);
    if (days >= 0 && days <= 3) {
      alerts.push({
        id: `therapy-${t.id}`,
        icon: HeartPulse,
        iconColor: "text-purple-600",
        title: `Therapy: ${t.name}`,
        message: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days${t.therapistName ? ` — ${t.therapistName}` : ""}`,
        urgency: days <= 1 ? "urgent" : "soon",
        link: "/medical",
      });
    }
  });

  // Medications expiring in next 7 days
  medications.forEach(m => {
    if (!m.tillDate) return;
    const days = daysFromToday(m.tillDate);
    if (days >= 0 && days <= 7) {
      alerts.push({
        id: `med-${m.id}`,
        icon: Pill,
        iconColor: "text-amber-600",
        title: `Medication ending: ${m.name}`,
        message: days === 0 ? "Ends today" : days === 1 ? "Ends tomorrow" : `Ends in ${days} days${m.dose ? ` (${m.dose})` : ""}`,
        urgency: days <= 2 ? "urgent" : "soon",
        link: "/medical",
      });
    }
  });

  // Insurance renewal within 7 days
  insurance.forEach(p => {
    const dateStr = (p as Record<string, unknown>).renewalReminderDate as string | undefined;
    if (!dateStr) return;
    const days = daysFromToday(dateStr);
    if (days >= 0 && days <= 7) {
      alerts.push({
        id: `ins-${p.id}`,
        icon: ShieldAlert,
        iconColor: "text-red-600",
        title: `Insurance renewal: ${p.policyType}`,
        message: days === 0 ? "Renewal due today" : days === 1 ? "Renewal due tomorrow" : `Renewal in ${days} days — ${p.providerName}`,
        urgency: days <= 2 ? "urgent" : "soon",
        link: "/insurance-policies",
      });
    }
  });

  // Sort: urgent first
  alerts.sort((a,b) => (a.urgency === "urgent" ? -1 : 1) - (b.urgency === "urgent" ? -1 : 1));

  return alerts;
}

// ── Main AppShell ────────────────────────────────────────────────────────────
export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, hydrated, signOut } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [childName, setChildName] = useState<string>("");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/sign-in" });
  }, [hydrated, user, navigate]);

  useEffect(() => {
    if (user) dataService.getChildProfile().then(p => { if (p?.name) setChildName(p.name); });
  }, [user]);

  useEffect(() => setMobileOpen(false), [pathname]);

  // Close notification panel on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [notifOpen]);

  const alerts = useAlerts(!!user);

  const initials =
    user?.displayName
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "·";

  return (
    <div className="min-h-screen flex bg-surface-low">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="LegacyNest" className="h-9 w-9 object-contain shrink-0 mix-blend-multiply" />
            <div className="leading-tight min-w-0">
              <div className="text-lg font-bold text-primary truncate">LegacyNest</div>
              <div className="text-[11px] text-muted-foreground">Legacy Secured</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 -mr-1 text-muted-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 mt-2 flex-1 space-y-0.5 overflow-y-auto">
          {NAV_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`sidebar-link ${active ? "active" : ""}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6 pt-4 border-t border-sidebar-border space-y-0.5">
          {user?.email === "admin@legacynest.co.in" && (
            <a href="/admin/dashboard" className="sidebar-link flex items-center gap-2 text-primary font-medium">
              <Shield className="h-4 w-4 shrink-0" /> <span className="text-sm">Admin</span>
            </a>
          )}
          <Link to="/settings" className={`sidebar-link ${pathname === "/settings" ? "active" : ""}`}>
            <Settings className="h-4 w-4 shrink-0" /> <span className="text-sm">Settings</span>
          </Link>
          <Link to="/support" className="sidebar-link">
            <HelpCircle className="h-4 w-4 shrink-0" /> <span className="text-sm">Support</span>
          </Link>
          <button
            onClick={() => { signOut(); navigate({ to: "/sign-in" }); }}
            className="sidebar-link w-full text-left text-destructive hover:!bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" /> <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between gap-4 px-4 sm:px-8 bg-surface border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base text-muted-foreground italic leading-snug">
              Every step you take today secures{" "}
              <span className="font-semibold text-primary">
                {childName || "your loved ones"}
              </span>'s tomorrow.
            </p>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-1.5 text-foreground/70 hover:text-foreground transition-colors"
              aria-label={`Notifications${alerts.length > 0 ? ` (${alerts.length})` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              )}
            </button>

            {/* Notification panel */}
            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                  {alerts.length > 0 && (
                    <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">All clear — no upcoming alerts.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {alerts.map(alert => {
                        const Icon = alert.icon;
                        return (
                          <Link
                            key={alert.id}
                            to={alert.link as "/dashboard"}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-surface-low transition-colors"
                          >
                            <div className={`mt-0.5 shrink-0 ${alert.iconColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground leading-tight">{alert.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                            </div>
                            {alert.urgency === "urgent" && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                Urgent
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-border bg-surface-low">
                  <p className="text-[10px] text-muted-foreground">
                    Appointments &amp; therapy: next 3 days · Medications &amp; insurance: next 7 days
                  </p>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/settings"
            className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-soft to-gold ring-2 ring-card grid place-items-center text-xs font-bold text-white"
            aria-label="Account"
          >
            {initials}
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
