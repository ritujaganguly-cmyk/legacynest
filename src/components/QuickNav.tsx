import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Users,
  HeartPulse,
  AlertTriangle,
  Scale,
  Landmark,
  MapPin,
  Shield,
  Bot,
  ClipboardList,
  BookOpen,
} from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/care-circle", label: "Care Circle", icon: Users },
  { to: "/medical", label: "Medical", icon: HeartPulse },
  { to: "/caregiver", label: "Succession", icon: Users },
  { to: "/emergency", label: "Emergency", icon: AlertTriangle },
  { to: "/legal", label: "Legal", icon: Scale },
  { to: "/financial", label: "Financial", icon: Landmark },
  { to: "/residential", label: "Residential", icon: MapPin },
  { to: "/vault", label: "Digital Vault", icon: Shield },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/action-plan", label: "Action Plan", icon: ClipboardList },
  { to: "/support", label: "Support", icon: BookOpen },
] as const;

export function QuickNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap gap-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface-low text-foreground/80 border-border hover:bg-primary-soft hover:text-primary-foreground hover:border-primary-soft"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
