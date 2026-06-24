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
    num: 4, key: "emergency", title: "Emergency Plan",
    subtitle: "Who acts first and what they must know in 24 hours",
    route: "/emergency", minutes: 15,
    why: "The most urgent piece — activate it even if nothing else is ready.",
  },
  {
    num: 5, key: "medical", title: "Medical Records",
    subtitle: "Doctors, medications, therapies, appointments",
    route: "/medical", minutes: 15,
    why: "Any caregiver stepping in needs this to keep your child safe.",
  },
  {
    num: 6, key: "legal", title: "Legal Foundation",
    subtitle: "Will, Special Needs Trust, guardianship, power of attorney",
    route: "/legal", minutes: 10,
    why: "Without legal documents, courts decide your child's future.",
  },
  {
    num: 7, key: "financial", title: "Financial Planning",
    subtitle: "Lifetime corpus, assets, insurance, government schemes",
    route: "/financial", minutes: 15,
    why: "Ensure the money outlasts the need — mapped to your child's real costs.",
  },
  {
    num: 8, key: "residential", title: "Residential Planning",
    subtitle: "Where they will live — primary, backup, and emergency options",
    route: "/residential", minutes: 12,
    why: "Good group homes have 5–10 year waitlists. Apply now.",
  },
  {
    num: 9, key: "vault", title: "Digital Vault",
    subtitle: "Upload and secure every critical document in one place",
    route: "/vault", minutes: 10,
    why: "Successors need instant access to the right papers at the right time.",
  },
];

/** Build completion map from plan_progress + child profile flag. */
export function buildCompletionMap(
  progress: Record<string, boolean>,
  hasChildProfile: boolean,
): Record<string, boolean> {
  return {
    child: hasChildProfile,
    parent_profile: !!progress["parent_profile"],
    care_circle: !!progress["care_circle"],
    emergency: !!progress["emergency"],
    medical: !!progress["medical"],
    legal: !!progress["legal"],
    financial: !!progress["financial"],
    residential: !!progress["residential"],
    vault: !!progress["vault"],
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
