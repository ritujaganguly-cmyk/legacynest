import { useState } from "react";
import { ExternalLink, CheckCircle2, Zap, TrendingUp, Clock, RefreshCw } from "lucide-react";
import type { ActionItem, ActionItemsInput } from "@/lib/action-items";
import { generateActionItems } from "@/lib/action-items";

const TABS = [
  { key: "short",  label: "Short term",  sub: "0–6 months",   icon: Zap,        color: "text-red-600 bg-red-50 border-red-200" },
  { key: "medium", label: "Medium term", sub: "6 mo – 2 yr",  icon: TrendingUp, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "long",   label: "Long term",   sub: "2+ years",     icon: Clock,      color: "text-blue-600 bg-blue-50 border-blue-200" },
] as const;

interface Props {
  input: ActionItemsInput;
  storageKey: string; // per-user localStorage key for checked state
}

export function ActionableItems({ input, storageKey }: Props) {
  const [activeTab, setActiveTab] = useState<"short" | "medium" | "long">("short");
  const [checked, setChecked] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]") as string[]); } catch { return new Set(); }
  });

  function toggle(title: string) {
    setChecked((s) => {
      const n = new Set(s);
      n.has(title) ? n.delete(title) : n.add(title);
      try { localStorage.setItem(storageKey, JSON.stringify([...n])); } catch { /* ignore */ }
      return n;
    });
  }

  const all = generateActionItems(input);
  const items = all[activeTab].filter(i => !checked.has(i.title));
  const doneItems = all[activeTab].filter(i => checked.has(i.title));
  const tab = TABS.find((t) => t.key === activeTab)!;
  const totalUrgent = all.short.filter(i => i.urgent && !checked.has(i.title)).length;

  function ItemCard({ item }: { item: ActionItem }) {
    const done = checked.has(item.title);
    return (
      <div className={`rounded-xl border p-4 transition-all ${done ? "border-success/30 bg-success/5 opacity-60" : item.urgent ? "border-red-200 bg-red-50/30" : "border-border bg-background"}`}>
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => toggle(item.title)} className="mt-0.5 shrink-0" aria-label={done ? "Mark incomplete" : "Mark complete"}>
            <CheckCircle2 className={`h-5 w-5 transition-colors ${done ? "text-success" : "text-border hover:text-primary"}`} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.title}
                {item.urgent && !done && (
                  <span className="ml-2 inline-flex items-center text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">Urgent</span>
                )}
              </p>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:text-primary/80" aria-label="Open link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1 font-medium uppercase tracking-wide">{item.source}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            Action Items
            {totalUrgent > 0 && (
              <span className="inline-flex items-center text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{totalUrgent} urgent</span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Personalised actions based on your plan data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          const count = all[t.key].filter(i => !checked.has(i.title)).length;
          return (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold border-b-2 transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="font-normal text-muted-foreground">{count > 0 ? `${count} item${count !== 1 ? "s" : ""}` : t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {items.length === 0 && doneItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {activeTab}-term actions needed. Your plan is in great shape for this horizon.
          </div>
        ) : (
          <>
            <div className={`text-xs font-semibold rounded-lg border px-3 py-1.5 ${tab.color}`}>
              {tab.label} · {tab.sub}
            </div>
            {items.map((item) => <ItemCard key={item.title} item={item} />)}
            {doneItems.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {doneItems.length} completed item{doneItems.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 space-y-2">
                  {doneItems.map((item) => <ItemCard key={item.title} item={item} />)}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
