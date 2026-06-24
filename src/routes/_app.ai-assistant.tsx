import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import React from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Bell,
  HelpCircle,
  Search,
  Bot,
  User,
  Paperclip,
  Mic,
  Send,
  Check,
  AlertCircle,
  FileText,
  Calculator,
  ShieldQuestion,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { dataService } from "@/lib/data/mock";

export const Route = createFileRoute("/_app/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Legacy Advisor — LegacyNest" }] }),
  component: AIAssistant,
});

function AIAssistant() {
  const {
    data: history,
    isLoading: histLoading,
    isError: histErr,
  } = useQuery({
    queryKey: ["advisor-chat"],
    queryFn: () => dataService.listAdvisorChat(),
  });
  useEffect(() => {
    if (histErr)
      toast.error("Data Refresh Required", { description: "Couldn't load chat history." });
  }, [histErr]);
  return (
    <div className="grid xl:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary">Legacy Advisory Hub</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Encrypted Advisory Session
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search archive..."
                className="rounded-full bg-surface-container py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
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

        <div className="legacy-card p-6 space-y-5">
          {histLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-2/3 rounded-xl" />
              ))}
            </div>
          ) : (history ?? []).length > 0 ? (
            (history ?? []).map((m) =>
              m.role === "assistant" ? (
                <BotBubble key={m.id}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </BotBubble>
              ) : (
                <UserBubble key={m.id}>{m.content}</UserBubble>
              ),
            )
          ) : (
            <>
              <BotBubble>
                <p>
                  Namaste. I am your LegacyNest Advisor. I have analyzed your current financial
                  corpus, trust deeds, and caregiving logs. How can I assist with your child's
                  long-term security today?
                </p>
                <p className="mt-2 text-xs italic text-muted-foreground">
                  No prior conversations yet.
                </p>
              </BotBubble>
              <UserBubble>
                Can you review my recent Private Trust draft for Indian tax compliance?
              </UserBubble>
              <BotBubble>
                <p>
                  I've scanned the draft. Here are 3 critical points to ensure 100% compliance with
                  the Indian Trusts Act, 1882:
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5" /> Define the "Beneficiary" with
                    specific special needs provisions to avoid future legal ambiguity.
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" /> Clause 4.2 needs
                    revision to qualify for 'Indeterminate Trust' status for tax efficiency.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5" /> Ensure at least two resident
                    Indian trustees are named.
                  </li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-md border border-primary text-primary text-sm font-semibold px-3 py-1.5">
                    Review Revised Draft
                  </button>
                  <button className="rounded-md border border-border text-sm font-medium px-3 py-1.5">
                    Download Compliance Report
                  </button>
                </div>
              </BotBubble>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              '"Will my corpus last until age 80?"',
              '"How much should I invest monthly?"',
              '"What is the best trust structure in India?"',
              '"What happens if my sibling refuses caregiving?"',
            ].map((q) => (
              <button
                key={q}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-low"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-surface-low border border-border p-3 flex items-center gap-2">
            <button className="text-muted-foreground p-2">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Ask your legacy advisor anything..."
            />
            <button className="text-muted-foreground p-2">
              <Mic className="h-4 w-4" />
            </button>
            <button className="h-10 w-10 rounded-xl bg-primary-soft text-primary-foreground flex items-center justify-center">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Powered by EternalBanyan AI • Financial & Legal Context Aware
          </p>
        </div>
      </div>

      <aside className="space-y-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Live Projections
          </div>
          <div className="mt-3 legacy-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Financial Longevity</div>
              <div className="text-primary font-bold">
                82 Years <Info className="h-4 w-4 inline ml-1 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-surface-container overflow-hidden">
              <div className="h-full bg-primary-soft" style={{ width: "72%" }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Projection based on current 7.2% CAGR & inflation-adjusted care costs.
            </p>
          </div>
          <div className="mt-3 legacy-card p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Legal Compliance</div>
              <div className="text-gold font-bold">94%</div>
            </div>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${i < 5 ? "bg-gold" : "bg-surface-container"}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              1 critical update required for Guardian Designation.
            </p>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Financial Parameters
          </div>
          <div className="mt-3 rounded-2xl bg-surface-container p-5 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inflation Rate</span>
              <span className="font-semibold">6%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expected Return</span>
              <span className="font-semibold">8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caregiver Start</span>
              <span className="font-semibold">Age 40</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Recommended Resources
          </div>
          <div className="mt-3 space-y-2">
            <Resource icon={FileText} title="Trust Taxation Guide" sub="2024 Indian Tax Laws" />
            <Resource
              icon={Calculator}
              title="Inflation Calculator"
              sub="Special Needs Care Tool"
            />
            <Resource icon={ShieldQuestion} title="Guardianship FAQ" sub="Legal Rights & Duties" />
          </div>
        </div>

        <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="font-semibold">Human Expert Backup</div>
          <p className="text-sm mt-1 opacity-90">
            Stuck? Speak with a licensed legacy planner today.
          </p>
          <button className="mt-4 w-full rounded-lg bg-card text-primary font-semibold py-2.5 text-sm">
            Schedule Call
          </button>
        </div>
      </aside>
    </div>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-card border border-border p-4 max-w-2xl">
        {children}
      </div>
    </div>
  );
}
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="rounded-2xl rounded-tr-sm bg-primary-soft text-primary-foreground p-4 max-w-xl">
        {children}
      </div>
      <div className="h-9 w-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}
interface ResourceProps {
  icon: React.ElementType;
  title: string;
  sub: string;
}
function Resource({ icon: Icon, title, sub }: ResourceProps) {
  return (
    <button className="w-full text-left rounded-xl border border-border bg-card p-3 flex items-center gap-3 hover:bg-surface-low">
      <div className="h-9 w-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </button>
  );
}
