/**
 * Lifetime corpus-adequacy projection engine.
 * Deterministic year-by-year simulation. No external dependencies.
 */

export type FinancialExpense = {
  id: string;
  name: string;
  category: string;
  monthlyAmount: number;
  inflationRate: number;   // % per year, e.g. 6
  phase3Only: boolean;     // only counted when parents are gone
};

export type FinancialIncome = {
  id: string;
  name: string;
  incomeType: string;
  monthlyAmount: number;
  incrementRate: number;   // % per year
  survivesParents: boolean;
  endsAtRetirement: boolean;
};

export type Assumptions = {
  childCurrentAge: number;
  childLifeExpectancy: number;
  parentAge: number;
  parentRetirementAge: number;
  parentLifeExpectancy: number;   // when Phase 3 starts
  generalInflation: number;       // %
  blendedReturnPhase1: number;    // % expected return while accumulating
  blendedReturnPhase3: number;    // % conservative return post-transition
  existingLifeCover: number;      // ₹ total sum assured
};

export type ProjectionYear = {
  year: number;       // 0 = now, 1 = +1yr, …
  childAge: number;
  phase: 1 | 2 | 3;
  annualIncome: number;
  annualExpense: number;
  netFlow: number;    // income − expense (negative → drawdown)
  corpus: number;     // end-of-year corpus balance
};

export type ProjectionResult = {
  years: ProjectionYear[];
  corpusAtTransition: number;   // corpus when Phase 3 starts
  requiredAtTransition: number; // PV of all Phase-3 deficits at transition
  gap: number;                  // max(0, required − projected)
  sustainabilityRatio: number;  // corpusAtTransition / requiredAtTransition
  status: "secure" | "at_risk" | "critical";
  depletionChildAge: number | null; // child's age when corpus hits 0, or null if it survives
  recommendedMonthlySIP: number;
  insuranceGap: number;         // sudden-loss scenario gap
};

function resolvePhase(
  yearIndex: number,
  parentAge: number,
  parentRetirementAge: number,
  parentLifeExpectancy: number
): 1 | 2 | 3 {
  const age = parentAge + yearIndex;
  if (age < parentRetirementAge) return 1;
  if (age < parentLifeExpectancy) return 2;
  return 3;
}

function annualExpense(expenses: FinancialExpense[], t: number, phase: 1 | 2 | 3): number {
  return expenses.reduce((sum, e) => {
    if (e.phase3Only && phase !== 3) return sum;
    const inflated = e.monthlyAmount * 12 * Math.pow(1 + e.inflationRate / 100, t);
    return sum + inflated;
  }, 0);
}

function annualIncome(
  income: FinancialIncome[],
  t: number,
  phase: 1 | 2 | 3,
  parentAge: number,
  parentRetirementAge: number
): number {
  return income.reduce((sum, s) => {
    // salary ends at retirement
    if (s.endsAtRetirement && parentAge + t >= parentRetirementAge) return sum;
    // income that doesn't survive parents disappears in Phase 3
    if (!s.survivesParents && phase === 3) return sum;
    const grown = s.monthlyAmount * 12 * Math.pow(1 + s.incrementRate / 100, t);
    return sum + grown;
  }, 0);
}

export function runProjection(
  expenses: FinancialExpense[],
  income: FinancialIncome[],
  currentCorpus: number,
  assumptions: Assumptions
): ProjectionResult {
  const {
    childCurrentAge,
    childLifeExpectancy,
    parentAge,
    parentRetirementAge,
    parentLifeExpectancy,
    blendedReturnPhase1,
    blendedReturnPhase3,
    existingLifeCover,
  } = assumptions;

  const horizon = childLifeExpectancy - childCurrentAge;
  const transitionYear = parentLifeExpectancy - parentAge; // years until Phase 3

  const years: ProjectionYear[] = [];
  let corpus = currentCorpus;
  let depletionChildAge: number | null = null;
  let corpusAtTransition = 0;

  for (let t = 0; t <= horizon; t++) {
    const phase = resolvePhase(t, parentAge, parentRetirementAge, parentLifeExpectancy);
    const returnRate = phase === 3 ? blendedReturnPhase3 : blendedReturnPhase1;
    const inc = annualIncome(income, t, phase, parentAge, parentRetirementAge);
    const exp = annualExpense(expenses, t, phase);
    const netFlow = inc - exp;

    // growth then add net flow
    corpus = corpus * (1 + returnRate / 100) + netFlow;

    if (t === transitionYear) corpusAtTransition = Math.max(0, corpus);

    if (corpus <= 0 && depletionChildAge === null) {
      depletionChildAge = childCurrentAge + t;
      corpus = 0;
    }

    years.push({
      year: t,
      childAge: childCurrentAge + t,
      phase,
      annualIncome: inc,
      annualExpense: exp,
      netFlow,
      corpus: Math.max(0, corpus),
    });
  }

  // Required corpus at transition = PV today of Phase-3 annual deficits
  // Computed by summing the PV of each Phase-3 shortfall
  let requiredAtTransition = 0;
  const r = blendedReturnPhase3 / 100;
  for (let t = transitionYear; t <= horizon; t++) {
    const inc = annualIncome(income, t, 3, parentAge, parentRetirementAge);
    const exp = annualExpense(expenses, t, 3);
    const deficit = Math.max(0, exp - inc);
    if (deficit > 0) {
      // discount back to transition date
      requiredAtTransition += deficit / Math.pow(1 + r, t - transitionYear);
    }
  }

  const gap = Math.max(0, requiredAtTransition - corpusAtTransition);
  const sustainabilityRatio = requiredAtTransition > 0
    ? corpusAtTransition / requiredAtTransition
    : 1;

  const status: ProjectionResult["status"] =
    sustainabilityRatio >= 1   ? "secure"   :
    sustainabilityRatio >= 0.7 ? "at_risk"  : "critical";

  // Monthly SIP to close planned gap
  const yearsToTransition = Math.max(1, transitionYear);
  const monthsToTransition = yearsToTransition * 12;
  const monthlyReturn = (blendedReturnPhase1 / 100) / 12;
  // FV annuity factor: ((1+r)^n - 1) / r
  const fvFactor = monthlyReturn > 0
    ? (Math.pow(1 + monthlyReturn, monthsToTransition) - 1) / monthlyReturn
    : monthsToTransition;
  const recommendedMonthlySIP = gap > 0 ? Math.ceil(gap / fvFactor / 100) * 100 : 0;

  // Insurance gap: sudden-loss scenario
  // If parents die today, entire Phase-3 expense must be covered by current corpus + existing cover
  let totalSuddenLossNeed = 0;
  const rConservative = blendedReturnPhase3 / 100;
  for (let t = 0; t <= horizon; t++) {
    const inc = annualIncome(income, t, 3, parentAge, parentRetirementAge);
    const exp = annualExpense(expenses, t, 3);
    const deficit = Math.max(0, exp - inc);
    if (deficit > 0) {
      totalSuddenLossNeed += deficit / Math.pow(1 + rConservative, t);
    }
  }
  const insuranceGap = Math.max(0, totalSuddenLossNeed - currentCorpus - existingLifeCover);

  return {
    years,
    corpusAtTransition,
    requiredAtTransition,
    gap,
    sustainabilityRatio,
    status,
    depletionChildAge,
    recommendedMonthlySIP,
    insuranceGap,
  };
}

export function formatCrore(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
