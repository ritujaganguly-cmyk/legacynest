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

  // Child approaching 18 — urgent guardianship
  if (childAge !== null && childAge >= 15 && childAge < 18 &&
      (!input.guardianshipStatus || input.guardianshipStatus === "Not Initiated")) {
    short.push({
      title: `START GUARDIANSHIP NOW — child turns 18 in ${18 - childAge} year(s)`,
      detail: `Legal guardianship under RPWD Act 2016 requires a court process taking 2+ years. File immediately.`,
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

  // Guardianship — child under 15
  if (childAge !== null && childAge < 15 &&
      (!input.guardianshipStatus || input.guardianshipStatus === "Not Initiated")) {
    medium.push({
      title: `Start legal guardianship process by age ${Math.max((childAge ?? 0) + 2, 16)}`,
      detail: `${childLabel} is ${childAge} now. File for guardianship under RPWD Act 2016 at least 2 years before they turn 18. Court process takes 1–2 years.`,
      horizon: "medium",
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

  // ── LONG TERM (2+ years) ─────────────────────────────────────────────

  // UDID renewal
  if (input.udidValidity) {
    const expiry = new Date(input.udidValidity);
    const yearsLeft = (expiry.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
    if (yearsLeft > 0.5) {
      long.push({
        title: `Renew UDID before ${expiry.toLocaleDateString("en-IN")}`,
        detail: "UDID renewal must be initiated 6 months before expiry. Lapse disqualifies from Niramaya and other government benefits.",
        urgent: yearsLeft < 1,
        horizon: "long",
        source: "Child Profile",
      });
    }
  }

  // Niramaya renewal date
  if (input.niramayaRenewalDate) {
    const renewal = new Date(input.niramayaRenewalDate);
    long.push({
      title: `Renew Niramaya insurance by ${renewal.toLocaleDateString("en-IN")}`,
      detail: "Niramaya must be renewed annually. Lapse means loss of ₹1L health cover.",
      urgent: (renewal.getTime() - Date.now()) < 60 * 24 * 60 * 60 * 1000,
      horizon: "long",
      source: "Insurance",
    });
  }

  // Other insurance renewals
  const renewals = (input.insurancePolicies ?? []).filter(p => p.renewalReminderDate && !p.policyType?.toLowerCase().includes("niramaya"));
  if (renewals.length > 0) {
    long.push({
      title: `Track ${renewals.length} insurance policy renewal(s)`,
      detail: renewals.map(p => `${p.policyType} — ${p.providerName}`).join(" · "),
      horizon: "long",
      source: "Insurance",
    });
  }

  // Annual plan review
  long.push({
    title: "Annual plan review — review every 12 months",
    detail: "Revisit your corpus projection, care circle, residential options and insurance coverage every year. Life changes fast.",
    horizon: "long",
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
