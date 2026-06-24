import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, ArrowRight, Map, Clock, Flame,
  ChevronRight, TreeDeciduous, FileDown
} from "lucide-react";
import { dataService } from "@/lib/data/mock";
import { generateSuccessionReport } from "@/lib/report";
import {
  CHAPTERS, buildCompletionMap, nextChapter, completedCount,
  recordVisit, streakCount, sessionDay, setPinnedKey, getPinnedKey,
} from "@/lib/journey";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "My Journey — LegacyNest" }] }),
  component: Dashboard,
});

// Banyan stage based on chapter completion (0-6 maps to 0-9 chapters)
function treeStage(done: number): { emoji: string; label: string } {
  if (done === 0) return { emoji: "🌱", label: "Seed planted" };
  if (done <= 2) return { emoji: "🌿", label: "Sprouting" };
  if (done <= 4) return { emoji: "🌳", label: "Growing" };
  if (done <= 6) return { emoji: "🌲", label: "Strengthening" };
  if (done <= 8) return { emoji: "🌴", label: "Branching wide" };
  return { emoji: "🌳", label: "Full canopy" };
}

function encouragement(done: number, childName: string): string {
  const name = childName || "your child";
  if (done === 0) return `Every great plan starts with a single step. Let's begin ${name}'s journey today.`;
  if (done <= 2) return `A strong foundation is taking shape for ${name}. Each chapter adds a layer of protection.`;
  if (done <= 4) return `You're building something real. ${name}'s future is getting safer with every session.`;
  if (done <= 6) return `More than half done. The plan for ${name} is taking the shape of something lasting.`;
  if (done <= 8) return `Almost there. ${name}'s lifetime plan is nearly complete — you've done the hard work.`;
  return `${name}'s plan is complete. A lifetime of protection, documented and ready.`;
}

function Dashboard() {
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pinnedKey, setPinned] = useState<string | null>(() => getPinnedKey());

  useEffect(() => {
    recordVisit();

    async function load() {
      try {
        const [child, parent, progress] = await Promise.all([
          dataService.getChildProfile(),
          dataService.getParentProfile(),
          dataService.getPlanProgress(),
        ]);
        setChildName(child?.name ?? "");
        setParentName((parent as { full_name?: string } | null)?.full_name ?? "");
        setDone(buildCompletionMap(progress, !!child?.name));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const streak = streakCount();
  const day = sessionDay();
  const numDone = completedCount(done);
  const next = nextChapter(done);
  const tree = treeStage(numDone);
  const pct = Math.round((numDone / CHAPTERS.length) * 100);
  const allDone = numDone === CHAPTERS.length;

  const greeting = parentName
    ? `Welcome back, ${parentName.split(" ")[0]} 👋`
    : "Welcome back 👋";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading your journey…" : (
              childName
                ? `Day ${day} · Building the plan for ${childName}`
                : `Day ${day} · Your planning journey`
            )}
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className="text-3xl">{tree.emoji}</div>
          <div className="text-[10px] font-semibold text-primary uppercase tracking-wide mt-0.5">{tree.label}</div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {numDone} of {CHAPTERS.length} chapters complete
          </span>
          <span className="text-xs font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="legacy-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Flame className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">{streak}</div>
          <div className="text-xs text-muted-foreground">
            {streak === 1 ? "day streak" : "day streak"}
          </div>
        </div>
        <div className="legacy-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">{numDone}</div>
          <div className="text-xs text-muted-foreground">chapters done</div>
        </div>
        <div className="legacy-card p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {CHAPTERS.slice(numDone).reduce((s, c) => s + c.minutes, 0)}
          </div>
          <div className="text-xs text-muted-foreground">min remaining</div>
        </div>
      </div>

      {/* ── Encouragement ── */}
      {!loading && (
        <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4 py-1">
          {encouragement(numDone, childName)}
        </div>
      )}

      {/* ── Today's Focus ── */}
      {!loading && !allDone && (
        <div className="legacy-card legacy-card-accent-top p-5">
          <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-2">
            Recommended next · Chapter {next.num} of {CHAPTERS.length}
          </div>
          <h2 className="text-lg font-bold text-foreground">{next.title}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-1">{next.subtitle}</p>
          <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
            <Clock className="h-3 w-3" /> ~{next.minutes} minutes
          </p>
          <div className="flex items-center gap-3">
            <Link
              to={next.route as never}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-deep transition-colors"
            >
              Open Chapter {next.num} <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-muted-foreground">{next.why}</span>
          </div>
        </div>
      )}

      {/* ── All done celebration ── */}
      {!loading && allDone && (
        <div className="legacy-card legacy-card-gold-top p-5 text-center space-y-3">
          <div className="text-4xl">🌳</div>
          <h2 className="text-xl font-bold">
            {childName ? `${childName}'s plan is complete` : "Your plan is complete"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Every chapter documented. {childName || "Your child"}'s future is protected — revisit anytime to keep it current.
          </p>
          <button
            onClick={async () => { setGenerating(true); try { await generateSuccessionReport(); } finally { setGenerating(false); } }}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg border border-primary px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            {generating ? "Generating…" : "Download Full Plan"}
          </button>
        </div>
      )}

      {/* ── Journey Map ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Map className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Your Journey Map</h2>
        </div>

        <div className="space-y-0">
          {CHAPTERS.map((ch, i) => {
            const isDone = done[ch.key];
            const isNext = !allDone && ch.key === next.key;
            const isLast = i === CHAPTERS.length - 1;

            return (
              <div key={ch.key} className="flex gap-4">
                {/* Timeline spine */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                  ) : isNext ? (
                    <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary/10 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-border shrink-0 mt-0.5" />
                  )}
                  {!isLast && (
                    <div className={`w-px flex-1 my-1 ${isDone ? "bg-success/30" : "bg-border"}`} />
                  )}
                </div>

                {/* Chapter card */}
                <div className={`flex-1 mb-2 rounded-xl border p-4 transition-all ${
                  isDone
                    ? "border-success/20 bg-success/5"
                    : isNext
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <Link to={ch.route as never} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground">
                          Ch {ch.num}
                        </span>
                        <span className={`text-sm font-semibold ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {ch.title}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                            ✓ Done
                          </span>
                        )}
                        {isNext && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                            ▶ My next
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.subtitle}</p>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                      <span className="text-xs whitespace-nowrap">~{ch.minutes}m</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  {isNext && (
                    <p className="text-xs text-primary/70 mt-2 italic">{ch.why}</p>
                  )}
                  {/* Pin button — only on incomplete, non-next chapters */}
                  {!isDone && !isNext && (
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedKey(ch.key);
                        setPinned(ch.key);
                      }}
                      className="mt-2 text-[11px] font-medium text-primary/60 hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Do this next →
                    </button>
                  )}
                  {/* Unpin — only on the pinned chapter (which is also isNext when pinned) */}
                  {isNext && pinnedKey === ch.key && (
                    <button
                      type="button"
                      onClick={() => {
                        import("@/lib/journey").then(m => m.clearPinnedKey());
                        setPinned(null);
                      }}
                      className="mt-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Use suggested order instead
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Generate report (bottom) ── */}
      {!loading && numDone >= 5 && !allDone && (
        <div className="legacy-card p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Partial plan available</div>
            <div className="text-xs text-muted-foreground">
              You have enough to generate a draft succession report.
            </div>
          </div>
          <button
            onClick={async () => { setGenerating(true); try { await generateSuccessionReport(); } finally { setGenerating(false); } }}
            disabled={generating}
            className="inline-flex items-center gap-2 shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-low transition-colors"
          >
            <FileDown className="h-4 w-4" />
            {generating ? "Generating…" : "Download Draft"}
          </button>
        </div>
      )}

    </div>
  );
}
