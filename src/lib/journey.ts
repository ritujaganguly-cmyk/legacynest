/**
 * The 9-chapter planning journey.
 * Completion is derived from plan_progress (Supabase) + child profile existence.
 * Streak is localStorage-based (dates user opened the app while logged in).
 */

export type Chapter = {
  num: number;
  key: string;
  title: string;
  subtitle: string;
  route: string;
  minutes: number;
  why: string;       // one sentence explaining why this chapter matters
};

export const CHAPTERS: Chapter[] = [
  {
    num: 1, key: "child", title: "Your Child's Profile",
    subtitle: "Who they are, their diagnosis, daily care needs",
    route: "/child-profile", minutes: 12,
    why: "Everything else builds on knowing your child.",
  },
  {
    num: 2, key: "parent_profile", title: "Your Profile",
    subtitle: "Primary caregiver details and health information",
    route: "/parent-profile", minutes: 8,
    why: "Future caregivers need to know who you are and how to reach you.",
  },
  {
    num: 3, key: "care_circle", title: "Care Circle",
    subtitle: "Trusted people who can step in when needed",
    route: "/care-circle", minutes: 10,
    why: "Without a named backup, strangers make decisions for your child.",
  },
  {
    num: 4, key: "succession", title: "Succession Planning",
    subtitle: "Guardian hierarchy and handover documentation",
    route: "/caregiver", minutes: 12,
    why: "Name who steps in — in order — so there is no ambiguity.",
  },
  {
    num: 5, key: "medical", title: "Medical Records",
    subtitle: "Doctors, medications, therapies, appointments",
    route: "/medical", minutes: 15,
    why: "Any caregiver stepping in needs this to keep your child safe.",
  },
  {
    num: 6, key: "residential", title: "Residential Planning",
    subtitle: "Where they will live — primary, backup, and emergency options",
    route: "/residential", minutes: 12,
    why: "Good group homes have 5–10 year waitlists. Apply now.",
  },
  {
    num: 7, key: "insurance", title: "Insurance",
    subtitle: "Health, life, and disability insurance policies",
    route: "/insurance-policies", minutes: 10,
    why: "Niramaya and LIC policies protect against unexpected care costs.",
  },
  {
    num: 8, key: "financial", title: "Financial Planning",
    subtitle: "Lifetime corpus, assets and government schemes",
    route: "/financial", minutes: 15,
    why: "Ensure the money outlasts the need — mapped to your child's real costs.",
  },
  {
    num: 9, key: "legal", title: "Legal Foundation",
    subtitle: "Will, Special Needs Trust, guardianship, power of attorney",
    route: "/legal", minutes: 10,
    why: "Without legal documents, courts decide your child's future.",
  },
  {
    num: 10, key: "vault", title: "Digital Vault",
    subtitle: "Upload and secure every critical document in one place",
    route: "/vault", minutes: 10,
    why: "Successors need instant access to the right papers at the right time.",
  },
  {
    num: 11, key: "emergency", title: "Emergency Plan",
    subtitle: "Who acts first and what they must know in 24 hours",
    route: "/emergency", minutes: 15,
    why: "With everything documented, now activate your emergency safety net.",
  },
];

/** Build completion map from plan_progress + child profile flag. */
export function buildCompletionMap(
  progress: Record<string, boolean>,
  hasChildProfile: boolean,
): Record<string, boolean> {
  return {
    child:        hasChildProfile,
    parent_profile: !!progress["parent_profile"],
    care_circle:  !!progress["care_circle"],
    succession:   !!progress["succession"],
    medical:      !!progress["medical"],
    residential:  !!progress["residential"],
    insurance:    !!progress["insurance"],
    financial:    !!progress["financial"],
    legal:        !!progress["legal"],
    vault:        !!progress["vault"],
    emergency:    !!progress["emergency"],
  };
}

// ── User-pinned next chapter ───────────────────────────────────────────────

const PIN_KEY = "legacynest.journey.pin.v1";

export function getPinnedKey(): string | null {
  try { return localStorage.getItem(PIN_KEY); } catch { return null; }
}

export function setPinnedKey(key: string): void {
  try { localStorage.setItem(PIN_KEY, key); } catch { /* ignore */ }
}

export function clearPinnedKey(): void {
  try { localStorage.removeItem(PIN_KEY); } catch { /* ignore */ }
}

/**
 * Next chapter to work on.
 * Honours the user's pin if the pinned chapter is not yet done;
 * otherwise falls back to the first incomplete in the default sequence.
 */
export function nextChapter(done: Record<string, boolean>): Chapter {
  const pinned = getPinnedKey();
  if (pinned) {
    const pinnedChapter = CHAPTERS.find((c) => c.key === pinned && !done[c.key]);
    if (pinnedChapter) return pinnedChapter;
    clearPinnedKey(); // pin is stale (chapter now done)
  }
  return CHAPTERS.find((c) => !done[c.key]) ?? CHAPTERS[CHAPTERS.length - 1];
}

/** Count completed chapters. */
export function completedCount(done: Record<string, boolean>): number {
  return CHAPTERS.filter((c) => done[c.key]).length;
}

// ── Journey stages (maps to the 4 growth images) ──────────────────────────────

export type JourneyStageNum = 0 | 1 | 2 | 3;

export type JourneyStage = {
  num: JourneyStageNum;
  label: string;
  tagline: string;
  image: string;           // filename under src/assets/journey/
  completeWhen: string[];  // chapter keys that must ALL be done to exit this stage
};

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    num: 0,
    label: "Seed Planted",
    tagline: "Your plan is taking root. Complete your profiles to grow.",
    image: "stage-1-seed.png",
    completeWhen: ["child", "parent_profile"],
  },
  {
    num: 1,
    label: "Roots Established",
    tagline: "Your care network is forming. Named successors protect what matters.",
    image: "stage-2-roots.png",
    completeWhen: ["care_circle", "succession"],
  },
  {
    num: 2,
    label: "Strength Established",
    tagline: "Medical, residential, insurance and financial foundations are in place.",
    image: "stage-3-stream.png",
    completeWhen: ["medical", "residential", "insurance", "financial"],
  },
  {
    num: 3,
    label: "Eternal Banyan",
    tagline: "Legal protection, vault secured, emergency plan active. Your legacy stands.",
    image: "stage-4-banyan.png",
    completeWhen: ["legal", "vault", "emergency"],
  },
];

/** Returns which growth stage (0–3) the user is currently in. */
export function currentStage(done: Record<string, boolean>): JourneyStageNum {
  // Walk stages — a stage is "reached" when all prior stages' completeWhen keys are done
  const allKeys = JOURNEY_STAGES.flatMap((s) => s.completeWhen);
  const allDone = allKeys.every((k) => done[k]);
  if (allDone) return 3;

  let reached: JourneyStageNum = 0;
  for (const stage of JOURNEY_STAGES) {
    if (stage.completeWhen.every((k) => done[k])) {
      reached = Math.min(stage.num + 1, 3) as JourneyStageNum;
    } else {
      break;
    }
  }
  return reached;
}

/** True when all 9 chapters + all stage keys are done → show actionable items. */
export function isJourneyComplete(done: Record<string, boolean>): boolean {
  return CHAPTERS.every((c) => done[c.key]);
}

// ── Actionable items shown after journey completion ────────────────────────────

export type ActionItem = {
  title: string;
  detail: string;
  link?: string;
  urgent?: boolean;
};

export const ACTIONABLE: Record<"short" | "medium" | "long", ActionItem[]> = {
  short: [
    { title: "Apply for UDID", detail: "Register at swavlambancard.gov.in for government scheme access.", link: "https://swavlambancard.gov.in", urgent: true },
    { title: "Enroll in Niramaya Insurance", detail: "₹1 lakh/year health cover for UDID holders. Apply via National Trust.", urgent: true },
    { title: "Share care plan with Care Circle", detail: "Send portal access to each caregiver from the Care Circle section." },
    { title: "Activate Emergency Plan", detail: "Share coordinator codes and test your emergency contact chain." },
    { title: "Review Will with a lawyer", detail: "Get your drafted Will reviewed and registered at a sub-registrar office." },
  ],
  medium: [
    { title: "Register Special Needs Trust", detail: "Work with a lawyer to register your SNT with the Charity Commissioner." },
    { title: "Join residential care waitlists", detail: "Good facilities have 5–10 year waits. Apply to your shortlisted options now." },
    { title: "Apply for PM-DAKSH / NHFDC schemes", detail: "Explore vocational training and loan schemes for your child's independence." },
    { title: "Annual plan review", detail: "Revisit your corpus projection and care plan every 12 months." },
    { title: "Update nominee details", detail: "Ensure all bank accounts, FDs, and insurance policies have correct nominees." },
  ],
  long: [
    { title: "Apply for legal guardianship (before age 18)", detail: "Start the guardianship process under RPWD Act 2016 at least 2 years before your child turns 18." },
    { title: "UDID renewal", detail: "Track expiry dates — renewals must be initiated 6 months before lapse." },
    { title: "Expand the Care Circle as family changes", detail: "Add new members, update succession order after life events (marriages, relocations)." },
    { title: "Estate planning review", detail: "Update your Will and Trust annually or after any major asset change." },
    { title: "Transition to supported independence", detail: "Explore supported employment and independent living options as your child grows." },
  ],
};

// ── Streak (localStorage) ──────────────────────────────────────────────────

const STREAK_KEY = "legacynest.journey.streak.v1";

type StreakStore = { dates: string[] };   // ISO date strings YYYY-MM-DD

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordVisit(): void {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const store: StreakStore = raw ? JSON.parse(raw) : { dates: [] };
    if (!store.dates.includes(today())) {
      store.dates.push(today());
      // keep only last 30 days
      store.dates = store.dates.slice(-30);
      localStorage.setItem(STREAK_KEY, JSON.stringify(store));
    }
  } catch { /* ignore */ }
}

export function streakCount(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { dates }: StreakStore = JSON.parse(raw);
    if (!dates.length) return 0;
    // Count consecutive days backward from today
    let streak = 0;
    const d = new Date();
    while (true) {
      if (dates.includes(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  } catch { return 0; }
}

/** Friendly session day label: "Day 1", "Day 4", etc. */
export function sessionDay(): number {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 1;
    const { dates }: StreakStore = JSON.parse(raw);
    return dates.length || 1;
  } catch { return 1; }
}
