import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Bell,
  HelpCircle,
  Lightbulb,
  TrendingUp,
  Bot,
  Calendar,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_app/action-plan")({
  head: () => ({ meta: [{ title: "Personalized Action Plan — LegacyNest" }] }),
  component: ActionPlan,
});

function ActionPlan() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">Personalized Action Plan</h1>
        <div className="flex items-center gap-3 text-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search tasks..."
              className="rounded-full bg-surface-container py-2 pl-9 pr-4 text-sm outline-none w-72"
            />
          </div>
          <button className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </button>
          <button className="text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="legacy-card p-6">
        <div className="flex flex-wrap items-start gap-6 justify-between">
          <div className="flex-1">
            <span className="rounded-full bg-warning-soft text-foreground/80 px-3 py-1 text-xs font-semibold uppercase">
              Plan Status: Building Roots
            </span>
            <h2 className="mt-3 text-2xl font-bold">Personal Security Plan Completion</h2>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>35% Complete</span>
              <span className="text-muted-foreground">Target: 100% by Dec 2024</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-primary-soft" style={{ width: "35%" }} />
            </div>
          </div>
          <div className="flex gap-3">
            <Counter big="04" label="Critical Tasks" tone="text-primary" />
            <Counter big="12" label="Total Actions" tone="text-foreground/70" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Prioritized Tasks</h2>
            <div className="flex gap-2 text-sm">
              <button className="rounded-md border border-border px-3 py-1">Filter</button>
              <button className="rounded-md border border-border px-3 py-1">Sort</button>
            </div>
          </div>

          <div className="space-y-4">
            <Task
              tone="gold"
              priority="CRITICAL"
              priorityTone="bg-destructive/10 text-destructive"
              title="Finalize Special Needs Trust Deed"
              cta="Start Legal Drafting"
              desc="Drafting of the legal trust document to ensure financial assets are managed for your child's benefit without disqualifying them from state support."
              why="This is the legal foundation of your entire plan, protecting assets from mismanagement."
            />
            <Task
              tone="orange"
              priority="HIGH PRIORITY"
              priorityTone="bg-warning-soft text-foreground/80"
              title="Increase monthly investment in Corpus Fund"
              cta="View Calculator"
              desc="Adjust your recurring deposits by 15% to meet the inflation-adjusted goal of ₹2.5 Cr for long-term residential care."
              why="Early compounding is vital to cover the rising costs of specialized caregiving."
            />
            <CompletedTask
              priority="MEDIUM"
              title="Identify Backup Caregiver"
              desc="Selected sibling (Rohan) as the primary backup guardian and updated contact info."
            />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="legacy-card p-5">
            <h3 className="text-lg font-semibold">Strategic Roadmap</h3>
            <ol className="mt-4 space-y-5 border-l border-border ml-2 pl-5 relative">
              <RoadStep
                dot="bg-primary"
                tag="SHORT TERM (0-6 MO)"
                tagTone="text-primary"
                title="Foundation Building"
                items={["Trust registration", "Health records digitizing"]}
              />
              <RoadStep
                dot="bg-gold"
                tag="MID TERM (1-3 YRS)"
                tagTone="text-gold"
                title="Growth & Transitions"
                items={["Housing shortlist", "Vocational training plan"]}
              />
              <RoadStep
                dot="bg-muted-foreground/40"
                tag="LONG TERM (LIFETIME)"
                tagTone="text-muted-foreground"
                title="Legacy Secured"
                items={["Trust management handover", "Assisted living activation"]}
              />
            </ol>
          </div>

          <div className="rounded-2xl bg-primary text-primary-foreground p-5">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5" /> AI Assistant Suggestion
            </div>
            <p className="mt-3 text-sm italic opacity-95">
              "Based on your child's age (14), I recommend starting the 'Guardianship Transition'
              research now rather than at 18 to avoid legal delays."
            </p>
            <button className="mt-4 w-full rounded-lg bg-card text-primary font-semibold py-2.5 text-sm">
              Learn about Guardianship
            </button>
          </div>

          <div className="legacy-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Next Review</div>
              <div className="text-xs text-muted-foreground">Oct 15, 2023</div>
            </div>
            <button className="text-sm font-semibold text-primary">Edit</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Counter({ big, label, tone }: { big: string; label: string; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-low p-4 min-w-[110px] text-center">
      <div className={`text-4xl font-bold ${tone}`}>{big}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

interface TaskProps {
  tone: string;
  priority: string;
  priorityTone: string;
  title: string;
  desc: string;
  why: string;
  cta: string;
}
function Task({ tone, priority, priorityTone, title, desc, why, cta }: TaskProps) {
  const topBorder = tone === "gold" ? "border-l-gold" : "border-l-primary-soft";
  return (
    <div className={`legacy-card p-5 border-l-4 ${topBorder}`}>
      <div className="flex items-start gap-3">
        <div className="h-5 w-5 rounded-md border-2 border-border mt-1" />
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${priorityTone}`}>
          {priority}
        </span>
        <div className="flex-1 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-lg bg-primary-soft text-primary-foreground font-semibold px-4 py-2 text-sm whitespace-nowrap">
            {cta}
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground pl-8">{desc}</p>
      <div className="mt-3 ml-8 rounded-lg bg-warning-soft/60 border-l-4 border-warning p-3 flex items-start gap-2 text-sm">
        <Lightbulb className="h-4 w-4 text-warning mt-0.5" />
        <div>
          <strong>Why this matters:</strong> {why}
        </div>
      </div>
    </div>
  );
}

interface CompletedTaskProps {
  priority: string;
  title: string;
  desc: string;
}
function CompletedTask({ priority, title, desc }: CompletedTaskProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface-low p-5 opacity-80">
      <div className="flex items-start gap-3">
        <div className="h-5 w-5 rounded-md bg-success text-white flex items-center justify-center mt-0.5">
          <Check className="h-3 w-3" />
        </div>
        <span className="rounded-md bg-surface-container px-2.5 py-1 text-xs font-bold text-muted-foreground">
          {priority}
        </span>
        <h3 className="text-lg font-semibold line-through flex-1">{title}</h3>
        <span className="inline-flex items-center gap-1 text-success text-sm font-semibold">
          <Check className="h-4 w-4" /> Completed
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground pl-8">{desc}</p>
    </div>
  );
}

interface RoadStepProps {
  dot: string;
  tag: string;
  tagTone: string;
  title: string;
  items: string[];
}
function RoadStep({ dot, tag, tagTone, title, items }: RoadStepProps) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[26px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-card ${dot}`}
      />
      <div className={`text-xs font-bold uppercase ${tagTone}`}>{tag}</div>
      <div className="font-semibold mt-1">{title}</div>
      <ul className="mt-1 text-sm text-muted-foreground space-y-0.5">
        {items.map((i: string) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground" />
            {i}
          </li>
        ))}
      </ul>
    </li>
  );
}
// suppress
void TrendingUp;
