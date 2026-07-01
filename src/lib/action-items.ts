/**
 * Dynamic action item generator.
 * Produces personalised short / medium / long-term actions based on
 * what the user has entered and what's still missing.
 */
import { formatCrore } from "@/lib/financial-projection";

export type ActionItem = {
  title: string;
  detail: string;
  link?: string;
  urgent?: boolean;
  horizon: "short" | "medium" | "long";
  source: string; // which module generated this
};

function calcAge(dob: string): number {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}

/** Years remaining until a date (negative once past). */
function yearsUntil(dateStr: string): number {
  return (new Date(dateStr).getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
}

/** Renewal/expiry horizon bucketing used across UDID, Niramaya, and other
 *  insurance policies: due within 6 months → short term (urgent, or overdue);
 *  6 months to 1 year → medium term; beyond a year → long term. */
function renewalHorizon(yearsLeft: number): { horizon: "short" | "medium" | "long"; urgent: boolean } {
  if (yearsLeft <= 0.5) return { horizon: "short", urgent: true };
  if (yearsLeft <= 1) return { horizon: "medium", urgent: false };
  return { horizon: "long", urgent: false };
}

export type ActionItemsInput = {
  childName?: string;
  childDob?: string;
  udidNumber?: string;
  udidValidity?: string;
  disabilityType?: string;
  coordinatorName?: string;
  willStatus?: string;
  trustStatus?: string;
  guardianshipStatus?: string;
  hasPrimary?: boolean;       // residential primary option exists
  waitlistsNotApplied?: number; // count of residential options not yet applied
  insuranceGap?: number;       // from financial projection (₹)
  investmentLumpSum?: number;  // from financial projection (₹)
  projectionStatus?: "secure" | "at_risk" | "critical" | null;
  hasNiramaya?: boolean;
  niramayaRenewalDate?: string;
  careCircleCount?: number;
  insurancePolicies?: Array<{ policyType: string; providerName: string; renewalReminderDate?: string }>;
  legalCapturedInWillTrust?: boolean; // whether assets have nominee/trust
  successionGuardians?: Array<{ name: string; responsibilities?: string[] }>;
  done?: Record<string, boolean>;     // journey completion map
};

export function generateActionItems(input: ActionItemsInput): {
  short: ActionItem[];
  medium: ActionItem[];
  long: ActionItem[];
} {
  const short: ActionItem[] = [];
  const medium: ActionItem[] = [];
  const long: ActionItem[] = [];

  const childAge = input.childDob ? calcAge(input.childDob) : null;
  const childLabel = input.childName || "your child";

  // ── SHORT TERM (0–6 months) ──────────────────────────────────────────

  // UDID not registered
  if (!input.udidNumber) {
    short.push({
      title: "Apply for UDID — Unique Disability ID",
      detail: `UDID is the gateway to all government disability benefits. Apply at swavlambancard.gov.in. ${input.disabilityType ? `Disability type: ${input.disabilityType}.` : ""}`,
      link: "https://www.swavlambancard.gov.in",
      urgent: true,
      horizon: "short",
      source: "Child Profile",
    });
  }

  // Niramaya not enrolled (need UDID first)
  if (input.udidNumber && !input.hasNiramaya) {
    short.push({
      title: "Enroll in Niramaya Health Insurance",
      detail: `₹1 lakh/year health cover for UDID holders at minimal premium. Apply via National Trust — renewable annually.`,
      link: "https://thenationaltrust.gov.in",
      urgent: true,
      horizon: "short",
      source: "Insurance",
    });
  }

  // No emergency coordinator
  if (!input.coordinatorName) {
    short.push({
      title: "Set your Emergency Coordinator",
      detail: "The one person to call first if you are incapacitated. Go to Emergency Plan → Call First section.",
      urgent: true,
      horizon: "short",
      source: "Emergency Plan",
    });
  }

  // Will not started
  if (!input.willStatus || input.willStatus === "Not Started") {
    short.push({
      title: "Consult a lawyer to draft your Will",
      detail: `Without a Will, courts distribute assets under the Indian Succession Act — your child may not be protected. Use LegacyNest's draft template to start the conversation with a lawyer.`,
      horizon: "short",
      source: "Legal",
    });
  }

  // Insurance gap (if parent dies now)
  if (input.insuranceGap && input.insuranceGap > 0) {
    short.push({
      title: `Close insurance gap — ${formatCrore(input.insuranceGap)} cover needed`,
      detail: `If you pass away today, existing assets and insurance won't cover ${childLabel}'s lifetime needs. A term life policy can close this gap affordably.`,
      urgent: input.projectionStatus === "critical",
      horizon: "short",
      source: "Financial",
    });
  }

  // No primary residential option
  if (!input.hasPrimary) {
    short.push({
      title: `Document where ${childLabel} will live after you`,
      detail: "Identify the primary care home and name the caregiver. Go to Residential Planning → The Plan → Set Primary Option.",
      horizon: "short",
      source: "Residential",
    });
  }

  // Guardianship — child within 6 months of 18 → SHORT TERM urgent
  if (childAge !== null && childAge >= 17.5 && childAge < 18 &&
      (!input.guardianshipStatus || input.guardianshipStatus === "Not Initiated")) {
    const monthsLeft = Math.round((18 - childAge) * 12);
    short.push({
      title: `START GUARDIANSHIP NOW — child turns 18 in ${monthsLeft} month(s)`,
      detail: `Legal guardianship under RPWD Act 2016 requires a court process taking 1–2 years. File IMMEDIATELY — you are almost out of time.`,
      urgent: true,
      horizon: "short",
      source: "Legal",
    });
  }

  // Low care circle
  if ((input.careCircleCount ?? 0) < 2) {
    short.push({
      title: "Add at least 2 people to your Care Circle",
      detail: "Your care circle is the backbone of succession. Name backups for every role so no single person is a single point of failure.",
      horizon: "short",
      source: "Care Circle",
    });
  }

  // Named successors missing financial or legal responsibility coverage
  const guardians = input.successionGuardians ?? [];
  if (guardians.length > 0) {
    const hasFinancial = guardians.some(g => (g.responsibilities ?? []).some(r => r.toLowerCase().includes("financial")));
    const hasLegal = guardians.some(g => (g.responsibilities ?? []).some(r => r.toLowerCase().includes("legal")));
    if (!hasFinancial) {
      short.push({
        title: "Identify who handles financial decisions after you",
        detail: "None of your named successors are assigned Financial Management. Go to Succession Planning and assign this responsibility to a guardian.",
        urgent: true,
        horizon: "short",
        source: "Succession Planning",
      });
    }
    if (!hasLegal) {
      short.push({
        title: "Identify who handles legal decisions after you",
        detail: "None of your named successors are assigned Legal Representation. Go to Succession Planning and assign this responsibility to a guardian.",
        urgent: true,
        horizon: "short",
        source: "Succession Planning",
      });
    }
  }

  // ── MEDIUM TERM (6 months – 2 years) ────────────────────────────────

  // Special Needs Trust not created
  if (!input.trustStatus || input.trustStatus === "Not Created") {
    medium.push({
      title: "Create a Special Needs Trust",
      detail: `An SNT protects assets left to ${childLabel} without disqualifying them from government benefits. Register with the Charity Commissioner after your Will is drafted.`,
      horizon: "medium",
      source: "Legal",
    });
  }

  // Residential waitlists
  if ((input.waitlistsNotApplied ?? 0) > 0) {
    medium.push({
      title: `Apply to ${input.waitlistsNotApplied} residential care home waitlist(s)`,
      detail: "Good group homes in India have 5–10 year waitlists. Apply now even if the need is years away — you can always decline later.",
      horizon: "medium",
      source: "Residential",
    });
  }

  // Financial shortfall investment
  if (input.investmentLumpSum && input.investmentLumpSum > 0) {
    medium.push({
      title: `Invest ${formatCrore(input.investmentLumpSum)} at 8% to fund lifetime needs`,
      detail: `This lump sum invested today at 8% p.a. will grow to cover ${childLabel}'s lifetime care costs. Options: PPF, mutual funds, NPS.`,
      horizon: "medium",
      source: "Financial",
    });
  }

  // Guardianship — child 16–17.5 (within 2 years of 18) → MEDIUM
  if (childAge !== null && childAge >= 16 && childAge < 17.5 &&
      (!input.guardianshipStatus || input.guardianshipStatus === "Not Initiated")) {
    medium.push({
      title: `File for legal guardianship now — child turns 18 in ${Math.round((18 - childAge) * 12)} months`,
      detail: `Court process takes 1–2 years under RPWD Act 2016. File immediately to ensure guardianship is in place before ${childLabel} turns 18.`,
      urgent: true,
      horizon: "medium",
      source: "Legal",
    });
  }

  // Guardianship — child under 16 → LONG TERM
  if (childAge !== null && childAge < 16 &&
      (!input.guardianshipStatus || input.guardianshipStatus === "Not Initiated")) {
    long.push({
      title: `Plan legal guardianship — file when child is 16`,
      detail: `${childLabel} is ${childAge} now. Start the RPWD Act 2016 guardianship process at age 16 so it completes before they turn 18. Court process takes 1–2 years.`,
      horizon: "long",
      source: "Legal",
    });
  }

  // Assets not in will/trust
  if (input.legalCapturedInWillTrust === false) {
    medium.push({
      title: "Ensure assets are named in Will or Trust",
      detail: `Check nominee names on all bank accounts, FDs, and investments. Any asset without a nominee or trust coverage may go through lengthy succession proceedings.`,
      horizon: "medium",
      source: "Legal + Financial",
    });
  }

  // ── RENEWALS — bucketed by how soon they're due ──────────────────────
  // Within 6 months → short term (urgent). 6 months–1 year → medium term.
  // Beyond a year → long term.

  const buckets = { short, medium, long };

  // UDID renewal
  if (input.udidValidity) {
    const expiry = new Date(input.udidValidity);
    const yearsLeft = yearsUntil(input.udidValidity);
    const { horizon, urgent } = renewalHorizon(yearsLeft);
    buckets[horizon].push({
      title: `Renew UDID before ${expiry.toLocaleDateString("en-IN")}`,
      detail: "UDID renewal must be initiated 6 months before expiry. Lapse disqualifies from Niramaya and other government benefits.",
      urgent,
      horizon,
      source: "Child Profile",
    });
  }

  // Niramaya renewal date
  if (input.niramayaRenewalDate) {
    const renewal = new Date(input.niramayaRenewalDate);
    const { horizon, urgent } = renewalHorizon(yearsUntil(input.niramayaRenewalDate));
    buckets[horizon].push({
      title: `Renew Niramaya insurance by ${renewal.toLocaleDateString("en-IN")}`,
      detail: "Niramaya must be renewed annually. Lapse means loss of ₹1L health cover.",
      urgent,
      horizon,
      source: "Insurance",
    });
  }

  // Other insurance renewals — each bucketed individually by its own due date
  const renewals = (input.insurancePolicies ?? []).filter(p => p.renewalReminderDate && !p.policyType?.toLowerCase().includes("niramaya"));
  for (const p of renewals) {
    const renewal = new Date(p.renewalReminderDate!);
    const { horizon, urgent } = renewalHorizon(yearsUntil(p.renewalReminderDate!));
    buckets[horizon].push({
      title: `Renew ${p.policyType} by ${renewal.toLocaleDateString("en-IN")}`,
      detail: `${p.providerName} — renew before this date to avoid a coverage gap.`,
      urgent,
      horizon,
      source: "Insurance",
    });
  }

  // ── MEDIUM TERM: recurring plan validation ───────────────────────────
  // A living plan needs periodic revisiting — every 6-9 months, not annually,
  // since a lot can change for a growing child in a year.
  medium.push({
    title: "Log in and revalidate your plan every 6–9 months",
    detail: "Revisit your corpus projection, care circle, residential options and insurance coverage every 6–9 months. Life changes fast — keep the plan current.",
    horizon: "medium",
    source: "General",
  });

  // Will update after life events
  long.push({
    title: "Update Will and Trust after major life events",
    detail: "Any asset purchase/sale, birth, death, marriage, or relocation should trigger a Will review. Keep your lawyer's contact handy.",
    horizon: "long",
    source: "Legal",
  });

  return { short, medium, long };
}
