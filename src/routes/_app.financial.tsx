import { ChapterBanner } from "@/components/ChapterBanner";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, Plus, Edit2, Trash2, Loader2, ShieldAlert,
  CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, Settings,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { dataService, type FinancialExpenseRow, type FinancialIncomeRow, type FinancialAssumptionsRow, type FinancialAsset } from "@/lib/data/mock";
import { runProjection, formatCrore, type FinancialExpense, type FinancialIncome, type Assumptions } from "@/lib/financial-projection";

export const Route = createFileRoute("/_app/financial")({
  head: () => ({ meta: [{ title: "Financial Planning — LegacyNest" }] }),
  component: Financial,
});

const INPUT = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary";
const LABEL = "block text-xs font-semibold text-muted-foreground mb-1";

const ASSET_TYPES = ["FD / Fixed Deposit", "Savings Account", "PPF", "Mutual Fund", "Equity / Stocks", "Real Estate", "Gold", "NPS", "EPF", "Insurance", "Other"];

function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const EXPENSE_CATEGORIES = ["Daily Living", "Medical / Therapy", "Caregiving", "Housing", "Education / Vocational", "Contingency"];
const CATEGORY_INFLATION: Record<string, number> = {
  "Daily Living": 6, "Medical / Therapy": 10, "Caregiving": 8,
  "Housing": 7, "Education / Vocational": 8, "Contingency": 6,
};
const INCOME_TYPES = ["Salary", "Rental", "Family Pension", "Annuity / Pension Plan", "Govt Disability Benefit", "Other Investment Income"];
const INCOME_DEFAULTS: Record<string, { increment: number; survivesParents: boolean; endsAtRetirement: boolean }> = {
  "Salary":                  { increment: 8,  survivesParents: false, endsAtRetirement: true  },
  "Rental":                  { increment: 5,  survivesParents: true,  endsAtRetirement: false },
  "Family Pension":          { increment: 5,  survivesParents: true,  endsAtRetirement: false },
  "Annuity / Pension Plan":  { increment: 0,  survivesParents: true,  endsAtRetirement: false },
  "Govt Disability Benefit": { increment: 4,  survivesParents: true,  endsAtRetirement: false },
  "Other Investment Income": { increment: 5,  survivesParents: true,  endsAtRetirement: false },
};

const DEFAULT_ASSUMPTIONS: Omit<FinancialAssumptionsRow, "id" | "userId"> = {
  childCurrentAge: 10, childLifeExpectancy: 75,
  parentAge: 45, parentRetirementAge: 60, parentLifeExpectancy: 80,
  generalInflation: 6, blendedReturnPhase1: 10, blendedReturnPhase3: 7,
  existingLifeCover: 0,
};

type Tab = "expenses" | "income" | "assets" | "assumptions";

function Financial() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("expenses");
  const [showAssumptions, setShowAssumptions] = useState(false);

  // ── Profile queries for age auto-fill ────────────────────
  const { data: childProfile } = useQuery({
    queryKey: ["child-profile"], queryFn: () => dataService.getChildProfile(),
  });
  const { data: parentProfile } = useQuery({
    queryKey: ["parent-profile"], queryFn: () => dataService.getParentProfile(),
  });

  const derivedChildAge  = calcAge((childProfile as { dateOfBirth?: string } | null)?.dateOfBirth);
  const derivedParentAge = calcAge((parentProfile as { dateOfBirth?: string } | null)?.dateOfBirth);

  // ── Data queries ──────────────────────────────────────────
  const { data: expenses = [], isLoading: loadingExp } = useQuery({
    queryKey: ["fin-expenses"], queryFn: () => dataService.listFinancialExpenses(),
  });
  const { data: income = [], isLoading: loadingInc } = useQuery({
    queryKey: ["fin-income"], queryFn: () => dataService.listFinancialIncome(),
  });
  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ["financial-assets"], queryFn: () => dataService.listFinancialAssets(),
  });
  const { data: savedAssumptions } = useQuery({
    queryKey: ["fin-assumptions"], queryFn: () => dataService.getFinancialAssumptions(),
  });

  const [assumptions, setAssumptions] = useState<Omit<FinancialAssumptionsRow, "id" | "userId">>(DEFAULT_ASSUMPTIONS);
  const [savingAssumptions, setSavingAssumptions] = useState(false);

  useEffect(() => {
    const base = savedAssumptions
      ? (() => { const { id: _i, userId: _u, ...rest } = savedAssumptions; void _i; void _u; return rest; })()
      : DEFAULT_ASSUMPTIONS;
    setAssumptions(a => ({
      ...base,
      childCurrentAge:  derivedChildAge  ?? base.childCurrentAge,
      parentAge:        derivedParentAge ?? base.parentAge,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAssumptions, derivedChildAge, derivedParentAge]);

  // ── Projection ────────────────────────────────────────────
  const currentCorpus = useMemo(
    () => assets.reduce((s, a) => s + (a.currentValue ?? 0), 0),
    [assets]
  );

  const projection = useMemo(() => {
    if (expenses.length === 0 && income.length === 0) return null;
    const expInput: FinancialExpense[] = expenses.map(e => ({
      id: e.id, name: e.name, category: e.category,
      monthlyAmount: e.monthlyAmount, inflationRate: e.inflationRate, phase3Only: e.phase3Only,
    }));
    const incInput: FinancialIncome[] = income.map(i => ({
      id: i.id, name: i.name, incomeType: i.incomeType,
      monthlyAmount: i.monthlyAmount, incrementRate: i.incrementRate,
      survivesParents: i.survivesParents, endsAtRetirement: i.endsAtRetirement,
    }));
    const ass: Assumptions = { ...assumptions };
    return runProjection(expInput, incInput, currentCorpus, ass);
  }, [expenses, income, currentCorpus, assumptions]);

  const transitionYear = assumptions.parentLifeExpectancy - assumptions.parentAge;

  // chart data — sample every year
  const chartData = useMemo(() => {
    if (!projection) return [];
    return projection.years.map(y => ({
      age: y.childAge,
      income: Math.round(y.annualIncome / 12),
      expense: Math.round(y.annualExpense / 12),
      corpus: Math.round(y.corpus / 100_000),
      phase: y.phase,
    }));
  }, [projection]);

  // ── Expense dialog ────────────────────────────────────────
  const [expDialog, setExpDialog] = useState(false);
  const [expEdit, setExpEdit] = useState<string | null>(null);
  const [expDraft, setExpDraft] = useState<Partial<FinancialExpenseRow>>({});
  const [expSaving, setExpSaving] = useState(false);

  const openExpAdd = () => {
    setExpDraft({ category: "Daily Living", inflationRate: 6, phase3Only: false, monthlyAmount: 0 });
    setExpEdit(null); setExpDialog(true);
  };
  const openExpEdit = (e: FinancialExpenseRow) => {
    setExpDraft(e); setExpEdit(e.id); setExpDialog(true);
  };
  const saveExp = async () => {
    if (!expDraft.name?.trim()) { toast.error("Name is required"); return; }
    setExpSaving(true);
    try {
      if (expEdit) {
        await dataService.updateFinancialExpense(expEdit, expDraft);
        toast.success("Expense updated");
      } else {
        await dataService.addFinancialExpense(expDraft as Omit<FinancialExpenseRow, "id" | "userId">);
        void dataService.markSectionComplete("financial");
        toast.success("Expense added");
      }
      qc.invalidateQueries({ queryKey: ["fin-expenses"] });
      setExpDialog(false);
    } finally { setExpSaving(false); }
  };

  // ── Income dialog ─────────────────────────────────────────
  const [incDialog, setIncDialog] = useState(false);
  const [incEdit, setIncEdit] = useState<string | null>(null);
  const [incDraft, setIncDraft] = useState<Partial<FinancialIncomeRow>>({});
  const [incSaving, setIncSaving] = useState(false);

  const openIncAdd = () => {
    const defaults = INCOME_DEFAULTS["Salary"];
    setIncDraft({ incomeType: "Salary", incrementRate: defaults.increment,
      survivesParents: defaults.survivesParents, endsAtRetirement: defaults.endsAtRetirement, monthlyAmount: 0 });
    setIncEdit(null); setIncDialog(true);
  };
  const openIncEdit = (i: FinancialIncomeRow) => {
    setIncDraft(i); setIncEdit(i.id); setIncDialog(true);
  };
  const saveInc = async () => {
    if (!incDraft.name?.trim()) { toast.error("Name is required"); return; }
    setIncSaving(true);
    try {
      if (incEdit) {
        await dataService.updateFinancialIncome(incEdit, incDraft);
        toast.success("Income updated");
      } else {
        await dataService.addFinancialIncome(incDraft as Omit<FinancialIncomeRow, "id" | "userId">);
        toast.success("Income stream added");
      }
      qc.invalidateQueries({ queryKey: ["fin-income"] });
      setIncDialog(false);
    } finally { setIncSaving(false); }
  };

  // ── Asset dialog ──────────────────────────────────────────
  const [assetDialog, setAssetDialog] = useState(false);
  const [assetEdit, setAssetEdit] = useState<string | null>(null);
  const [assetDraft, setAssetDraft] = useState<Partial<FinancialAsset>>({});
  const [assetSaving, setAssetSaving] = useState(false);

  const openAssetAdd = () => {
    setAssetDraft({ assetType: "FD / Fixed Deposit", assetName: "", currentValue: 0 });
    setAssetEdit(null); setAssetDialog(true);
  };
  const openAssetEdit = (a: FinancialAsset) => {
    setAssetDraft(a); setAssetEdit(a.id); setAssetDialog(true);
  };
  const saveAsset = async () => {
    if (!assetDraft.assetName?.trim()) { toast.error("Asset name is required"); return; }
    setAssetSaving(true);
    try {
      if (assetEdit) {
        await dataService.updateFinancialAsset(assetEdit, assetDraft);
        toast.success("Asset updated");
      } else {
        await dataService.addFinancialAsset(assetDraft as Omit<FinancialAsset, "id" | "userId">);
        void dataService.markSectionComplete("financial");
        toast.success("Asset added");
      }
      qc.invalidateQueries({ queryKey: ["financial-assets"] });
      setAssetDialog(false);
    } finally { setAssetSaving(false); }
  };

  const saveAssumptions = async () => {
    setSavingAssumptions(true);
    await dataService.saveFinancialAssumptions(assumptions);
    qc.invalidateQueries({ queryKey: ["fin-assumptions"] });
    toast.success("Assumptions saved");
    setSavingAssumptions(false);
    setShowAssumptions(false);
  };

  const totalMonthlyExpense = expenses.reduce((s, e) => s + e.monthlyAmount, 0);
  const totalMonthlyIncome = income.reduce((s, i) => s + i.monthlyAmount, 0);

  const statusColor = !projection ? "bg-surface-low text-muted-foreground" :
    projection.status === "secure"   ? "bg-green-50 border-green-200 text-green-800" :
    projection.status === "at_risk"  ? "bg-amber-50 border-amber-200 text-amber-800" :
                                       "bg-red-50 border-red-200 text-red-800";
  const StatusIcon = !projection ? Info :
    projection.status === "secure" ? CheckCircle2 :
    projection.status === "at_risk" ? AlertTriangle : ShieldAlert;

  return (
    <div className="space-y-6 max-w-6xl">
      <ChapterBanner chapterKey="financial" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Financial Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lifetime corpus adequacy for your child's care — built from your actual numbers.
          </p>
        </div>
        <button
          onClick={() => setShowAssumptions(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-low"
        >
          <Settings className="h-4 w-4" />
          Assumptions
          {showAssumptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Assumptions panel */}
      {showAssumptions && (
        <div className="legacy-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Planning Assumptions</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Child age — locked to Child Profile DOB */}
            <div>
              <span className={LABEL}>Child's current age</span>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-low px-3 py-2 text-sm">
                <span className="font-semibold">{assumptions.childCurrentAge} yrs</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {derivedChildAge != null ? "from Child Profile" : "set in Child Profile"}
                </span>
              </div>
            </div>
            {/* Parent age — locked to Parent Profile DOB */}
            <div>
              <span className={LABEL}>Parent's current age</span>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-low px-3 py-2 text-sm">
                <span className="font-semibold">{assumptions.parentAge} yrs</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {derivedParentAge != null ? "from Parent Profile" : "set in Parent Profile"}
                </span>
              </div>
            </div>
            {[
              { label: "Child's life expectancy", key: "childLifeExpectancy" as const, max: 100 },
              { label: "Parent retirement age", key: "parentRetirementAge" as const, max: 80 },
              { label: "Parent life expectancy", key: "parentLifeExpectancy" as const, max: 100 },
              { label: "Existing life cover (₹)", key: "existingLifeCover" as const, max: undefined },
            ].map(({ label, key, max }) => (
              <label key={key}>
                <span className={LABEL}>{label}</span>
                <input
                  type="number"
                  className={INPUT}
                  value={assumptions[key]}
                  max={max}
                  onChange={e => setAssumptions(a => ({ ...a, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            {[
              { label: "General inflation (%)", key: "generalInflation" as const },
              { label: "Portfolio return — earning years (%)", key: "blendedReturnPhase1" as const },
              { label: "Portfolio return — after parents gone (%)", key: "blendedReturnPhase3" as const },
            ].map(({ label, key }) => (
              <label key={key}>
                <span className={LABEL}>{label}</span>
                <input
                  type="number"
                  step="0.5"
                  className={INPUT}
                  value={assumptions[key]}
                  onChange={e => setAssumptions(a => ({ ...a, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAssumptions(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-low">Cancel</button>
            <button onClick={saveAssumptions} disabled={savingAssumptions}
              className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2">
              {savingAssumptions && <Loader2 className="h-4 w-4 animate-spin" />} Save Assumptions
            </button>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {projection ? (
        <div className={`rounded-2xl border p-5 ${statusColor}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <StatusIcon className="h-7 w-7 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-lg">
                {projection.status === "secure" ? "Plan is on track" :
                 projection.status === "at_risk" ? "Plan needs attention" : "Critical shortfall"}
              </div>
              <div className="text-sm mt-0.5 opacity-80">
                {projection.status === "secure"
                  ? `Corpus is projected to cover the full lifetime. Sustainability: ${Math.round(projection.sustainabilityRatio * 100)}%.`
                  : `Corpus covers ${Math.round(projection.sustainabilityRatio * 100)}% of lifetime need.${projection.depletionChildAge ? ` Funds run out when ${assumptions.childCurrentAge < projection.depletionChildAge ? "child" : "child"} turns ${projection.depletionChildAge}.` : ""}`}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm sm:text-right">
              <div>
                <div className="opacity-60 text-xs font-semibold uppercase tracking-wide">Corpus needed</div>
                <div className="font-bold text-base">{formatCrore(projection.requiredAtTransition)}</div>
              </div>
              <div>
                <div className="opacity-60 text-xs font-semibold uppercase tracking-wide">On track for</div>
                <div className="font-bold text-base">{formatCrore(projection.corpusAtTransition)}</div>
              </div>
            </div>
          </div>

          {/* Three levers */}
          {(projection.recommendedMonthlySIP > 0 || projection.insuranceGap > 0) && (
            <div className="mt-4 pt-4 border-t border-current/20 flex flex-wrap gap-4">
              {projection.recommendedMonthlySIP > 0 && (
                <div className="rounded-xl bg-white/40 px-4 py-2.5">
                  <div className="text-xs font-semibold opacity-70">Monthly SIP needed</div>
                  <div className="font-bold text-lg">₹{projection.recommendedMonthlySIP.toLocaleString("en-IN")}</div>
                </div>
              )}
              {projection.insuranceGap > 0 && (
                <div className="rounded-xl bg-white/40 px-4 py-2.5">
                  <div className="text-xs font-semibold opacity-70">Insurance gap (sudden loss)</div>
                  <div className="font-bold text-lg">{formatCrore(projection.insuranceGap)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface-low p-5 flex items-center gap-3 text-sm text-muted-foreground">
          <Info className="h-5 w-5 shrink-0" />
          Add expenses and income to see the lifetime projection and recommendations.
        </div>
      )}

      {/* Lifetime Projection Chart */}
      {projection && chartData.length > 0 && (
        <div className="legacy-card p-5">
          <h3 className="font-semibold mb-1">Lifetime Corpus Projection</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Corpus balance (₹ Lakh) vs child's age. Shaded area = Phase 3 (parents gone).
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e07b2a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#e07b2a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="age" label={{ value: "Child's Age", position: "insideBottom", offset: -2, fontSize: 11 }} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `₹${v}L`} tick={{ fontSize: 11 }} width={62} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === "corpus" ? [`₹${v}L`, "Corpus"] :
                  name === "income" ? [`₹${v.toLocaleString("en-IN")}/mo`, "Monthly Income"] :
                  [`₹${v.toLocaleString("en-IN")}/mo`, "Monthly Expense"]}
                labelFormatter={age => `Child age: ${age}`}
              />
              <Legend verticalAlign="top" height={28} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              {/* Phase 3 start marker */}
              <ReferenceLine
                x={assumptions.childCurrentAge + transitionYear}
                stroke="#ef4444"
                strokeDasharray="4 2"
                label={{ value: "Parents gone", position: "top", fontSize: 10, fill: "#ef4444" }}
              />
              <Area type="monotone" dataKey="corpus" name="corpus"
                stroke="#e07b2a" strokeWidth={2} fill="url(#corpusGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Input Tabs */}
      <div className="legacy-card overflow-hidden">
        <div className="flex border-b border-border">
          {(["expenses", "income", "assets", "assumptions"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-low"
              }`}
            >
              {t === "assumptions" ? "Rates" : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "expenses" && expenses.length > 0 && ` (${expenses.length})`}
              {t === "income"   && income.length   > 0 && ` (${income.length})`}
              {t === "assets"   && assets.length   > 0 && ` (${assets.length})`}
            </button>
          ))}
        </div>

        {/* EXPENSES TAB */}
        {tab === "expenses" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <span className="font-semibold text-sm">Monthly expenses</span>
                {expenses.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Total: ₹{totalMonthlyExpense.toLocaleString("en-IN")}/mo
                  </span>
                )}
              </div>
              <button onClick={openExpAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {loadingExp ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No expenses yet.{" "}
                <button onClick={openExpAdd} className="text-primary hover:underline">Add your monthly expenses</button>
                {" "}to begin the projection.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-low text-left">
                  <tr>
                    <th className="py-2.5 px-5 font-medium">Name</th>
                    <th className="py-2.5 font-medium">Category</th>
                    <th className="py-2.5 font-medium text-right">₹/mo</th>
                    <th className="py-2.5 font-medium text-center">Inflation</th>
                    <th className="py-2.5 font-medium text-center">Phase 3 only</th>
                    <th className="py-2.5 pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="py-3 px-5 font-medium">{e.name}</td>
                      <td className="py-3 text-xs text-muted-foreground">{e.category}</td>
                      <td className="py-3 text-right font-semibold">₹{e.monthlyAmount.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-center text-muted-foreground text-xs">{e.inflationRate}%</td>
                      <td className="py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.phase3Only ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                          {e.phase3Only ? "After parents" : "Always"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 flex gap-1 justify-end">
                        <button onClick={() => openExpEdit(e)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => {
                          if (!confirm("Delete this expense?")) return;
                          await dataService.deleteFinancialExpense(e.id);
                          qc.invalidateQueries({ queryKey: ["fin-expenses"] });
                          toast.success("Deleted");
                        }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* INCOME TAB */}
        {tab === "income" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <span className="font-semibold text-sm">Income streams</span>
                {income.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Total: ₹{totalMonthlyIncome.toLocaleString("en-IN")}/mo
                  </span>
                )}
              </div>
              <button onClick={openIncAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {loadingInc ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : income.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No income streams yet.{" "}
                <button onClick={openIncAdd} className="text-primary hover:underline">Add salary, rental, or pension</button>.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-low text-left">
                  <tr>
                    <th className="py-2.5 px-5 font-medium">Name</th>
                    <th className="py-2.5 font-medium">Type</th>
                    <th className="py-2.5 font-medium text-right">₹/mo</th>
                    <th className="py-2.5 font-medium text-center">Growth</th>
                    <th className="py-2.5 font-medium text-center">After parents</th>
                    <th className="py-2.5 pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {income.map(i => (
                    <tr key={i.id}>
                      <td className="py-3 px-5 font-medium">{i.name}</td>
                      <td className="py-3 text-xs text-muted-foreground">{i.incomeType}</td>
                      <td className="py-3 text-right font-semibold">₹{i.monthlyAmount.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-center text-muted-foreground text-xs">{i.incrementRate}%/yr</td>
                      <td className="py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${i.survivesParents ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {i.survivesParents ? "Continues" : "Stops"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 flex gap-1 justify-end">
                        <button onClick={() => openIncEdit(i)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => {
                          if (!confirm("Delete this income stream?")) return;
                          await dataService.deleteFinancialIncome(i.id);
                          qc.invalidateQueries({ queryKey: ["fin-income"] });
                          toast.success("Deleted");
                        }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ASSETS TAB */}
        {tab === "assets" && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <span className="font-semibold text-sm">Corpus assets</span>
                {assets.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Total: {formatCrore(currentCorpus)}
                  </span>
                )}
              </div>
              <button onClick={openAssetAdd}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5">
                <Plus className="h-4 w-4" /> Add Asset
              </button>
            </div>
            {loadingAssets ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : assets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No assets recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-low text-left">
                  <tr>
                    <th className="py-2.5 px-5 font-medium">Asset</th>
                    <th className="py-2.5 font-medium w-40">Type</th>
                    <th className="py-2.5 px-4 font-medium text-right w-32">Value</th>
                    <th className="py-2.5 px-4 font-medium w-36">Nominee</th>
                    <th className="py-2.5 pr-4 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td className="py-3 px-5 font-medium">{a.assetName}</td>
                      <td className="py-3 text-xs text-muted-foreground">{a.assetType}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCrore(a.currentValue ?? 0)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">{a.nomineeName || "—"}</td>
                      <td className="py-3 pr-4 flex gap-1 justify-end">
                        <button onClick={() => openAssetEdit(a)} className="p-1.5 rounded-md text-muted-foreground hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={async () => {
                          if (!confirm("Delete this asset?")) return;
                          await dataService.deleteFinancialAsset(a.id);
                          qc.invalidateQueries({ queryKey: ["financial-assets"] });
                          toast.success("Asset deleted");
                        }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-5 py-3 bg-surface-low/50 text-xs text-muted-foreground border-t border-border">
              Assets feed into the corpus total used in the projection. Expected returns are set globally in <button onClick={() => setShowAssumptions(true)} className="text-primary underline">Assumptions</button>.
            </div>
          </div>
        )}

        {/* RATES TAB (quick reference) */}
        {tab === "assumptions" && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Current planning assumptions used in the projection. Click <strong>Assumptions</strong> above to edit.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ["Child current age", `${assumptions.childCurrentAge} yrs`],
                ["Child life expectancy", `${assumptions.childLifeExpectancy} yrs`],
                ["Parent current age", `${assumptions.parentAge} yrs`],
                ["Parent retires at", `${assumptions.parentRetirementAge} yrs`],
                ["Phase 3 starts (parents gone)", `Parent age ${assumptions.parentLifeExpectancy} / Child age ${assumptions.childCurrentAge + transitionYear}`],
                ["Years to plan for", `${assumptions.childLifeExpectancy - assumptions.childCurrentAge} yrs`],
                ["General inflation", `${assumptions.generalInflation}%`],
                ["Portfolio return (earning years)", `${assumptions.blendedReturnPhase1}%`],
                ["Portfolio return (after parents)", `${assumptions.blendedReturnPhase3}%`],
                ["Existing life cover", formatCrore(assumptions.existingLifeCover)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-surface-low px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Asset Dialog */}
      <Dialog open={assetDialog} onOpenChange={o => !o && setAssetDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogTitle>{assetEdit ? "Edit Asset" : "Add Asset"}</DialogTitle>
          <div className="space-y-4 mt-3">
            <label>
              <span className={LABEL}>Asset Name *</span>
              <input className={INPUT} value={assetDraft.assetName ?? ""} placeholder="e.g. SBI Fixed Deposit"
                onChange={e => setAssetDraft(d => ({ ...d, assetName: e.target.value }))} />
            </label>
            <label>
              <span className={LABEL}>Type *</span>
              <select className={INPUT} value={assetDraft.assetType ?? "FD / Fixed Deposit"}
                onChange={e => setAssetDraft(d => ({ ...d, assetType: e.target.value }))}>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>
              <span className={LABEL}>Current Value (₹)</span>
              <input type="number" className={INPUT} value={assetDraft.currentValue ?? ""}
                placeholder="e.g. 2500000"
                onChange={e => setAssetDraft(d => ({ ...d, currentValue: e.target.value ? Number(e.target.value) : undefined }))} />
            </label>
            <label>
              <span className={LABEL}>Nominee Name</span>
              <input className={INPUT} value={assetDraft.nomineeName ?? ""}
                placeholder="e.g. Child's guardian"
                onChange={e => setAssetDraft(d => ({ ...d, nomineeName: e.target.value }))} />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setAssetDialog(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-low">Cancel</button>
              <button onClick={saveAsset} disabled={assetSaving}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2">
                {assetSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {assetEdit ? "Update" : "Add Asset"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={expDialog} onOpenChange={o => !o && setExpDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogTitle>{expEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <div className="space-y-4 mt-3">
            <label>
              <span className={LABEL}>Name *</span>
              <input className={INPUT} value={expDraft.name ?? ""} placeholder="e.g. Occupational Therapy"
                onChange={e => setExpDraft(d => ({ ...d, name: e.target.value }))} />
            </label>
            <label>
              <span className={LABEL}>Category</span>
              <select className={INPUT} value={expDraft.category ?? "Daily Living"}
                onChange={e => {
                  const cat = e.target.value;
                  setExpDraft(d => ({ ...d, category: cat, inflationRate: CATEGORY_INFLATION[cat] ?? 6 }));
                }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={LABEL}>Monthly amount (₹) *</span>
                <input type="number" className={INPUT} value={expDraft.monthlyAmount ?? ""}
                  onChange={e => setExpDraft(d => ({ ...d, monthlyAmount: Number(e.target.value) }))} />
              </label>
              <label>
                <span className={LABEL}>Inflation rate (%)</span>
                <input type="number" step="0.5" className={INPUT} value={expDraft.inflationRate ?? 6}
                  onChange={e => setExpDraft(d => ({ ...d, inflationRate: Number(e.target.value) }))} />
              </label>
            </div>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border p-3">
              <input type="checkbox" className="mt-0.5 accent-primary"
                checked={expDraft.phase3Only ?? false}
                onChange={e => setExpDraft(d => ({ ...d, phase3Only: e.target.checked }))} />
              <div>
                <div className="text-sm font-medium">Only after parents are gone</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Tick for costs that don't exist today but kick in when parents can't caregive
                  (e.g. full-time paid caregiver, assisted living rent).
                </div>
              </div>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setExpDialog(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-low">Cancel</button>
              <button onClick={saveExp} disabled={expSaving}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2">
                {expSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {expEdit ? "Update" : "Add Expense"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Income Dialog */}
      <Dialog open={incDialog} onOpenChange={o => !o && setIncDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogTitle>{incEdit ? "Edit Income" : "Add Income Stream"}</DialogTitle>
          <div className="space-y-4 mt-3">
            <label>
              <span className={LABEL}>Name *</span>
              <input className={INPUT} value={incDraft.name ?? ""} placeholder="e.g. HDFC Bank Salary"
                onChange={e => setIncDraft(d => ({ ...d, name: e.target.value }))} />
            </label>
            <label>
              <span className={LABEL}>Type</span>
              <select className={INPUT} value={incDraft.incomeType ?? "Salary"}
                onChange={e => {
                  const type = e.target.value;
                  const defs = INCOME_DEFAULTS[type] ?? INCOME_DEFAULTS["Salary"];
                  setIncDraft(d => ({ ...d, incomeType: type, incrementRate: defs.increment,
                    survivesParents: defs.survivesParents, endsAtRetirement: defs.endsAtRetirement }));
                }}>
                {INCOME_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={LABEL}>Monthly amount (₹) *</span>
                <input type="number" className={INPUT} value={incDraft.monthlyAmount ?? ""}
                  onChange={e => setIncDraft(d => ({ ...d, monthlyAmount: Number(e.target.value) }))} />
              </label>
              <label>
                <span className={LABEL}>Annual growth (%)</span>
                <input type="number" step="0.5" className={INPUT} value={incDraft.incrementRate ?? 5}
                  onChange={e => setIncDraft(d => ({ ...d, incrementRate: Number(e.target.value) }))} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3">
                <input type="checkbox" className="accent-primary"
                  checked={incDraft.survivesParents ?? false}
                  onChange={e => setIncDraft(d => ({ ...d, survivesParents: e.target.checked }))} />
                <div>
                  <div className="text-sm font-medium">Continues after parents</div>
                  <div className="text-xs text-muted-foreground">Rental, pension, annuity</div>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3">
                <input type="checkbox" className="accent-primary"
                  checked={incDraft.endsAtRetirement ?? false}
                  onChange={e => setIncDraft(d => ({ ...d, endsAtRetirement: e.target.checked }))} />
                <div>
                  <div className="text-sm font-medium">Ends at retirement</div>
                  <div className="text-xs text-muted-foreground">Salary, employment</div>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setIncDialog(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-surface-low">Cancel</button>
              <button onClick={saveInc} disabled={incSaving}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center gap-2">
                {incSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {incEdit ? "Update" : "Add Income"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
