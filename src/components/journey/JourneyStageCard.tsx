/**
 * JourneyStageCard — shows the current Banyan growth stage image
 * with label, tagline, and progress toward the next milestone.
 */
import { JOURNEY_STAGES, CHAPTERS, type JourneyStageNum } from "@/lib/journey";

// Import the 4 growth stage images
import stage1 from "@/assets/journey/stage-1-seed.png";
import stage2 from "@/assets/journey/stage-2-roots.png";
import stage3 from "@/assets/journey/stage-3-stream.png";
import stage4 from "@/assets/journey/stage-4-banyan.png";

const STAGE_IMAGES = [stage1, stage2, stage3, stage4];

interface Props {
  stageNum: JourneyStageNum;
  done: Record<string, boolean>;
  childName?: string;
}

export function JourneyStageCard({ stageNum, done, childName }: Props) {
  const stage = JOURNEY_STAGES[stageNum];
  const img = STAGE_IMAGES[stageNum];
  const numDone = CHAPTERS.filter((c) => done[c.key]).length;
  const pct = Math.round((numDone / CHAPTERS.length) * 100);

  // What's needed to reach the next stage
  const nextStage = JOURNEY_STAGES[stageNum + 1];
  const nextMilestones = nextStage
    ? nextStage.completeWhen
        .filter((k) => !done[k])
        .map((k) => CHAPTERS.find((c) => c.key === k)?.title ?? k)
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Image */}
      <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 flex justify-center py-6">
        <img
          src={img}
          alt={stage.label}
          className="h-52 w-52 object-contain drop-shadow-md"
        />
        {/* Stage badge */}
        <div className="absolute top-3 left-3 rounded-full bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1">
          Stage {stageNum + 1} of 4
        </div>
      </div>

      {/* Info */}
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{stage.label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{stage.tagline}</p>
          {childName && (
            <p className="text-xs text-primary/80 mt-1 font-medium">
              Building {childName}'s lifetime security plan
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{numDone} of {CHAPTERS.length} chapters complete</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Next milestone hint */}
        {nextMilestones.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              To reach "{nextStage?.label}":
            </p>
            <ul className="space-y-0.5">
              {nextMilestones.slice(0, 3).map((m) => (
                <li key={m} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
