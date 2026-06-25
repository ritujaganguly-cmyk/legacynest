import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2, Circle, ArrowRight, Map, Clock,
  ChevronRight, FileDown, RefreshCw, Heart,
} from "lucide-react";
import { dataService } from "@/lib/data/mock";
import { generateSuccessionReport } from "@/lib/report";
import {
  CHAPTERS, buildCompletionMap, nextChapter, completedCount,
  recordVisit, sessionDay, setPinnedKey, getPinnedKey,
  currentStage, isJourneyComplete,
} from "@/lib/journey";
import { JourneyStageCard } from "@/components/journey/JourneyStageCard";
import { ActionableItems } from "@/components/journey/ActionableItems";
import { supabase } from "@/integrations/supabase/client";
import stage4 from "@/assets/journey/stage-4-banyan.png";

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
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pinnedKey, setPinned] = useState<string | null>(() => getPinnedKey());
  const [userId, setUserId] = useState("");

  // Extra data for action items
  const [actionInput, setActionInput] = useState<import("@/lib/action-items").ActionItemsInput>({});

  async function load(showRefreshing = false) {
    if (showRefreshing) setRefreshing(true);
    try {
      const [child, parent, progress, will, residentialOpts, policies, emergencyPlan, { data: authData }] = await Promise.all([
        dataService.getChildProfile(),
        dataService.getParentProfile(),
        dataService.refreshPlanProgress(),
        dataService.getLegalWill().catch(() => null),
        dataService.listResidentialOptions().catch(() => []),
        dataService.listInsurancePolicies().catch(() => []),
        dataService.getEmergencyPlan().catch(() => null),
        supabase.auth.getUser(),
      ]);

      if (authData.user) setUserId(authData.user.id);
      setChildName(child?.name ?? "");
      setParentName((parent as { full_name?: string } | null)?.full_name ?? "");
      const completionMap = buildCompletionMap(progress, !!child?.name);
      setDone(completionMap);

      // Build action items input
      const hasPrimary = (residentialOpts ?? []).some((o: { successionRank?: string }) => o.successionRank === "Primary");
      const waitlistsNotApplied = (residentialOpts ?? []).filter((o: { waitlistStatus?: string }) => o.waitlistStatus === "Not Applied").length;
      const hasNiramaya = (policies ?? []).some((p: { policyType?: string }) => p.policyType?.toLowerCase().includes("niramaya"));
      const niramayaPolicy = (policies ?? []).find((p: { policyType?: string }) => p.policyType?.toLowerCase().includes("niramaya"));
      const careCircle = await dataService.listCareCircle().catch(() => []);

      setActionInput({
        childName: child?.name,
        childDob: child?.dateOfBirth,
        udidNumber: child?.udidNumber,
        udidValidity: child?.udidValidity,
        disabilityType: child?.disabilityType,
        coordinatorName: emergencyPlan?.coordinatorName,
        willStatus: will?.willStatus,
        hasPrimary,
        waitlistsNotApplied,
        hasNiramaya,
        niramayaRenewalDate: (niramayaPolicy as { renewalReminderDate?: string } | undefined)?.renewalReminderDate,
        careCircleCount: careCircle.length,
        insurancePolicies: (policies ?? []).map((p: { policyType?: string; providerName?: string; renewalReminderDate?: string }) => ({
          policyType: p.policyType ?? "",
          providerName: p.providerName ?? "",
          renewalReminderDate: p.renewalReminderDate,
        })),
        done: completionMap,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    recordVisit();
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = sessionDay();
  const numDone = completedCount(done);
  const next = nextChapter(done);
  const pct = Math.round((numDone / CHAPTERS.length) * 100);
  const allDone = isJourneyComplete(done);
  const stage = currentStage(done);

  const greeting = parentName
    ? `Welcome back, ${parentName.split(" ")[0]}`
    : "Welcome back";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Loading your journey…" : (
              childName ? `Building the plan for ${childName}` : `Your planning journey`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
            title="Refresh progress"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <span className="text-sm font-semibold text-primary">{numDone}/{CHAPTERS.length}</span>
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

      {/* ── Stage card OR Completion card ── */}
      {!loading && (
        allDone ? (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-amber-50 to-amber-100 overflow-hidden">
            <div className="flex items-center gap-5 px-5 py-5">
              <img src={stage4} alt="Eternal Banyan" className="h-20 w-20 object-contain shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Stage 4 of 4 — Eternal Banyan</div>
                <h2 className="text-lg font-bold text-foreground leading-snug">
                  {childName ? `${childName}'s plan is complete` : "Your plan is complete"} 🌳
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All 10 chapters done. You have built a lifetime of protection.
                  Review every 6–12 months to keep it current as life changes.
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={async () => { setGenerating(true); try { await generateSuccessionReport(); } finally { setGenerating(false); } }}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                  >
                    <FileDown className="h-4 w-4" />
                    {generating ? "Generating…" : "Download Full Plan"}
                  </button>
                  <span className="text-xs text-amber-700 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> You are not walking this path alone.
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <JourneyStageCard stageNum={stage} done={done} childName={childName} />
        )
      )}

      {/* ── Encouragement ── */}
      {!loading && !allDone && (
        <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4 py-1">
          {encouragement(numDone, childName)}
        </div>
      )}

      {/* ── Today's Focus (only when not complete) ── */}
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
            <Link to={next.route as never}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-deep transition-colors">
              Open Chapter {next.num} <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-muted-foreground">{next.why}</span>
          </div>
        </div>
      )}

      {/* ── Journey Map (only when not complete) ── */}
      {!loading && !allDone && (
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
      )} {/* end journey map conditional */}

      {/* ── Action Items — visible once 66%+ chapters complete (7 of 10) ── */}
      {!loading && numDone >= 7 && Object.keys(actionInput).length > 0 && (
        <ActionableItems
          input={actionInput}
          storageKey={`legacynest.actionitems.${userId}.v1`}
        />
      )}

      {/* ── Partial plan download (only when not complete) ── */}
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
