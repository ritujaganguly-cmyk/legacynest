/**
 * ActionableItems — shown on the dashboard after all 9 journey chapters are complete.
 * Replaces the Banyan growth visualization with real planning tasks.
 * Three time horizons: short term (0-6 mo), medium term (6-18 mo), long term (2-5 yr).
 */
import { useState } from "react";
import { ExternalLink, CheckCircle2, Zap, TrendingUp, Clock } from "lucide-react";
import { ACTIONABLE } from "@/lib/journey";
import stage4 from "@/assets/journey/stage-4-banyan.png";

const TABS = [
  { key: "short",  label: "Short term",  sub: "0–6 months",   icon: Zap,        color: "text-red-600 bg-red-50 border-red-200" },
  { key: "medium", label: "Medium term", sub: "6–18 months",  icon: TrendingUp, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "long",   label: "Long term",   sub: "2–5 years",    icon: Clock,      color: "text-blue-600 bg-blue-50 border-blue-200" },
] as const;

interface Props {
  childName?: string;
}

export function ActionableItems({ childName }: Props) {
  const [activeTab, setActiveTab] = useState<"short" | "medium" | "long">("short");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(title: string) {
    setChecked((s) => {
      const n = new Set(s);
      n.has(title) ? n.delete(title) : n.add(title);
      return n;
    });
  }

  const items = ACTIONABLE[activeTab];
  const tab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header — the completed Eternal Banyan */}
      <div className="bg-gradient-to-b from-amber-50 to-amber-100 flex items-center gap-4 px-5 py-4">
        <img src={stage4} alt="Eternal Banyan" className="h-20 w-20 object-contain shrink-0" />
        <div>
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-0.5">
            Eternal Banyan — Journey Complete
          </div>
          <h2 className="text-lg font-bold text-foreground leading-tight">
            {childName ? `${childName}'s plan is fully protected` : "Your plan is fully protected"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            All 9 chapters complete. Now take these real-world actions.
          </p>
        </div>
      </div>

      {/* Time horizon tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="font-normal text-muted-foreground">{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Action items */}
      <div className="p-4 space-y-3">
        <div className={`text-xs font-semibold rounded-lg border px-3 py-1.5 ${tab.color}`}>
          {tab.label} actions — {tab.sub}
        </div>

        {items.map((item) => {
          const done = checked.has(item.title);
          return (
            <div
              key={item.title}
              className={`rounded-xl border p-4 transition-all ${
                done ? "border-success/30 bg-success/5 opacity-60" : "border-border bg-background"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(item.title)}
                  className="mt-0.5 shrink-0"
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  <CheckCircle2
                    className={`h-5 w-5 transition-colors ${
                      done ? "text-success" : "text-border hover:text-primary"
                    }`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.title}
                      {item.urgent && !done && (
                        <span className="ml-2 inline-flex items-center text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                          Urgent
                        </span>
                      )}
                    </p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-primary hover:text-primary/80"
                        aria-label="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
