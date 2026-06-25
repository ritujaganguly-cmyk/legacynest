/**
 * LegacyNest — Simplified Lifetime Financial Model
 *
 * Mental model:
 *   Phase 1 (now → parents gone): child has current expenses + their own income.
 *   Phase 2 (after parents gone): current expenses + additional care costs
 *     minus any expenses that get waived, plus child income that continues,
 *     plus returns on assets assigned to child via will/trust.
 *
 * Investment return assumption: 8% per annum flat.
 * All monetary values in ₹.
 */

export type FinancialExpense = {
  id: string;
  name: string;
  category: string;
  monthlyAmount: number;
  inflationRate: number;        // % per year
  phase3Only: boolean;          // = "additional cost AFTER parents gone"
  waivedAfterParents?: boolean; // = "this expense disappears after parents gone"
};

export type FinancialIncome = {
  id: string;
  name: string;
  incomeType: string;
  monthlyAmount: number;
  incrementRate: number;        // % per year growth
  survivesParents: boolean;     // continues after parents gone
  endsAtRetirement: boolean;    // irrelevant for child model — keep for compat
};

export type Assumptions = {
  childCurrentAge: number;
  childLifeExpectancy: number;
  parentAge: number;
  parentRetirementAge: number;  // kept for compat
  parentLifeExpectancy: number; // years until Phase 2 starts
  generalInflation: number;
  blendedReturnPhase1: number;  // kept for compat (we use returnRate internally)
  blendedReturnPhase3: number;  // kept for compat
  existingLifeCover: number;    // ₹ existing insurance
};

export type ProjectionResult = {
  // Core output
  fundsDurationYears: number | null; // null = fully funded through life expectancy
  shortfallTotal: number;            // total undiscounted shortfall (0 if none)
  investmentLumpSum: number;         // lump sum needed TODAY at 8% to cover gap
  insuranceGap: number;              // cover needed if parent dies NOW
  assetsNeededInWillTrust: number;   // corpus needed at parent death in Phase 2
  status: "secure" | "at_risk" | "critical";

  // Summary numbers for display
  monthlyPhase1Expense: number;  // current monthly spend on child
  monthlyPhase2Expense: number;  // monthly spend after parents gone
  monthlyPhase2Income: number;   // child's monthly income after parents gone
  monthlyPhase2Net: number;      // net monthly (positive = surplus, negative = deficit)

  // Kept for compat
  corpusAtTransition: number;
  requiredAtTransition: number;
  gap: number;
  sustainabilityRatio: number;
  depletionChildAge: number | null;
  recommendedMonthlySIP: number;
  years: { year: number; childAge: number; phase: 1|2|3; annualIncome: number; annualExpense: number; netFlow: number; corpus: number }[];
};

const RETURN_RATE = 0.08; // 8% annual

function inflated(monthly: number, rate: number, years: number): number {
  return monthly * 12 * Math.pow(1 + rate / 100, years);
}

export function runProjection(
  expenses: FinancialExpense[],
  income: FinancialIncome[],
  currentCorpus: number,
  assumptions: Assumptions,
): ProjectionResult {
  const {
    childCurrentAge,
    childLifeExpectancy,
    parentAge,
    parentLifeExpectancy,
    existingLifeCover,
  } = assumptions;

  const yearsToParentDeath = Math.max(1, parentLifeExpectancy - parentAge);
  const totalYears = childLifeExpectancy - childCurrentAge;

  // ── Phase 1 summary (now) ──────────────────────────────────
  const phase1Expenses = expenses.filter(e => !e.phase3Only && !e.waivedAfterParents);
  const monthlyPhase1Expense = phase1Expenses.reduce((s, e) => s + e.monthlyAmount, 0);

  // ── Phase 2 summary (after parents) ───────────────────────
  // Current expenses that continue + additional (phase3Only) - waived
  const phase2ExpenseList = expenses.filter(e => !e.waivedAfterParents);
  const monthlyPhase2Expense = phase2ExpenseList.reduce((s, e) => s + e.monthlyAmount, 0);
  const monthlyPhase2Income = income
    .filter(i => i.survivesParents)
    .reduce((s, i) => s + i.monthlyAmount, 0);
  const monthlyPhase2Net = monthlyPhase2Income - monthlyPhase2Expense;

  // ── Year-by-year simulation ────────────────────────────────
  let corpus = currentCorpus;
  let depletionChildAge: number | null = null;
  let corpusAtTransition = 0;
  const years: ProjectionResult["years"] = [];

  for (let t = 0; t <= totalYears; t++) {
    const phase: 1|2|3 = t < yearsToParentDeath ? 1 : 3;

    // Expenses this year
    let annualExpense = 0;
    for (const e of expenses) {
      if (e.waivedAfterParents && phase === 3) continue;
      if (e.phase3Only && phase !== 3) continue;
      annualExpense += inflated(e.monthlyAmount, e.inflationRate, t);
    }

    // Income this year (child's own income)
    let annualIncome = 0;
    for (const i of income) {
      if (!i.survivesParents && phase === 3) continue;
      annualIncome += inflated(i.monthlyAmount, i.incrementRate, t);
    }

    const netFlow = annualIncome - annualExpense;
    corpus = corpus * (1 + RETURN_RATE) + netFlow;

    if (t === yearsToParentDeath) {
      corpusAtTransition = Math.max(0, corpus);
    }

    if (corpus <= 0 && depletionChildAge === null) {
      depletionChildAge = childCurrentAge + t;
      corpus = 0;
    }

    years.push({
      year: t, childAge: childCurrentAge + t, phase,
      annualIncome, annualExpense, netFlow,
      corpus: Math.max(0, corpus),
    });
  }

  // ── Shortfall and funds duration ──────────────────────────
  const fundsDurationYears = depletionChildAge !== null
    ? Math.max(0, depletionChildAge - childCurrentAge)
    : null;

  // Total undiscounted Phase 2 shortfall
  let shortfallTotal = 0;
  for (let t = yearsToParentDeath; t <= totalYears; t++) {
    const phase2AnnualExpense = phase2ExpenseList.reduce(
      (s, e) => s + inflated(e.monthlyAmount, e.inflationRate, t), 0
    );
    const phase2AnnualIncome = income
      .filter(i => i.survivesParents)
      .reduce((s, i) => s + inflated(i.monthlyAmount, i.incrementRate, t), 0);
    shortfallTotal += Math.max(0, phase2AnnualExpense - phase2AnnualIncome);
  }

  // Required corpus at parent death (PV of Phase 2 net deficits)
  let requiredAtTransition = 0;
  for (let t = yearsToParentDeath; t <= totalYears; t++) {
    const phase2AnnualExpense = phase2ExpenseList.reduce(
      (s, e) => s + inflated(e.monthlyAmount, e.inflationRate, t), 0
    );
    const phase2AnnualIncome = income
      .filter(i => i.survivesParents)
      .reduce((s, i) => s + inflated(i.monthlyAmount, i.incrementRate, t), 0);
    const deficit = Math.max(0, phase2AnnualExpense - phase2AnnualIncome);
    if (deficit > 0) {
      requiredAtTransition += deficit / Math.pow(1 + RETURN_RATE, t - yearsToParentDeath);
    }
  }

  const gap = Math.max(0, requiredAtTransition - corpusAtTransition);
  const sustainabilityRatio = requiredAtTransition > 0
    ? corpusAtTransition / requiredAtTransition : 1;

  // ── Lump-sum investment needed TODAY at 8% ────────────────
  // How much do we need NOW that, growing at 8%, will cover the gap at parent death?
  const investmentLumpSum = gap > 0
    ? Math.ceil(gap / Math.pow(1 + RETURN_RATE, yearsToParentDeath) / 1000) * 1000
    : 0;

  // ── Insurance gap: if parent dies TODAY ───────────────────
  // Need to fund ALL of Phase 2 from today. PV of all Phase 2 deficits discounted from now.
  let totalSuddenNeed = 0;
  for (let t = 0; t <= totalYears; t++) {
    const phase2AnnualExpense = phase2ExpenseList.reduce(
      (s, e) => s + inflated(e.monthlyAmount, e.inflationRate, t), 0
    );
    const phase2AnnualIncome = income
      .filter(i => i.survivesParents)
      .reduce((s, i) => s + inflated(i.monthlyAmount, i.incrementRate, t), 0);
    const deficit = Math.max(0, phase2AnnualExpense - phase2AnnualIncome);
    if (deficit > 0) {
      totalSuddenNeed += deficit / Math.pow(1 + RETURN_RATE, t);
    }
  }
  const insuranceGap = Math.max(0, totalSuddenNeed - currentCorpus - existingLifeCover);

  const status: ProjectionResult["status"] =
    sustainabilityRatio >= 1    ? "secure"   :
    sustainabilityRatio >= 0.65 ? "at_risk"  : "critical";

  return {
    fundsDurationYears,
    shortfallTotal,
    investmentLumpSum,
    insuranceGap,
    assetsNeededInWillTrust: requiredAtTransition,
    status,
    monthlyPhase1Expense,
    monthlyPhase2Expense,
    monthlyPhase2Income,
    monthlyPhase2Net,
    corpusAtTransition,
    requiredAtTransition,
    gap,
    sustainabilityRatio,
    depletionChildAge,
    recommendedMonthlySIP: 0, // replaced by investmentLumpSum
    years,
  };
}

export function formatCrore(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
