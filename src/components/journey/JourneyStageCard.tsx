import { JOURNEY_STAGES, CHAPTERS, type JourneyStageNum } from "@/lib/journey";

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

  const nextStage = JOURNEY_STAGES[stageNum + 1];
  const nextMilestones = nextStage
    ? nextStage.completeWhen
        .filter((k) => !done[k])
        .map((k) => CHAPTERS.find((c) => c.key === k)?.title ?? k)
    : [];

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 shadow-sm">
      {/* Stage icon */}
      <div className="relative shrink-0">
        <img
          src={img}
          alt={stage.label}
          className="h-16 w-16 object-contain drop-shadow-sm"
        />
        <div className="absolute -top-1 -right-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 leading-none">
          {stageNum + 1}/4
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
          Current Stage
        </div>
        <div className="text-sm font-bold text-foreground">{stage.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{stage.tagline}</div>
        {childName && (
          <div className="text-[10px] text-primary/70 font-medium mt-0.5">
            {childName}'s plan
          </div>
        )}
        {nextMilestones.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {nextMilestones.slice(0, 2).map((m) => (
              <span
                key={m}
                className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5"
              >
                {m}
              </span>
            ))}
            {nextMilestones.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{nextMilestones.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
