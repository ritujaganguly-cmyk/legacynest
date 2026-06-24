import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { supabase, pdb } from "@/integrations/supabase/client";

/**
 * Session + onboarding store, backed by Supabase auth.
 * Onboarding draft is kept in localStorage until the wizard finishes,
 * then persisted to public.child_profiles.
 */

export type ChildProfile = {
  fullName: string;
  age: string;
  diagnosis: string;
  about: string;
};

export type CareNeeds = {
  supportLevels: string[];
  calmingStrategies: string;
  sensitivityTriggers: string[];
};

export type FinancialSnapshot = {
  liquidAssets: string;
  fixedDeposits: string;
  realEstate: string;
  monthlyIncome: string;
  disabilityBenefits: string;
};

export type IdentityDocs = {
  pan: string;
  aadhaar: string;
  udid: string;
  hasWill: boolean;
};

export type OnboardingData = {
  child: ChildProfile;
  care: CareNeeds;
  financial: FinancialSnapshot;
  identity: IdentityDocs;
  completedAt?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

type SessionState = {
  user: AuthUser | null;
  onboarding: OnboardingData;
  hydrated: boolean;
};

type Action =
  | { type: "HYDRATE"; payload: Partial<SessionState> }
  | { type: "SIGN_IN"; payload: AuthUser }
  | { type: "SIGN_OUT" }
  | { type: "UPDATE_ONBOARDING"; payload: Partial<OnboardingData> }
  | { type: "COMPLETE_ONBOARDING" };

const STORAGE_KEY = "legacynest.onboarding.v1";

const emptyOnboarding: OnboardingData = {
  child: { fullName: "", age: "", diagnosis: "", about: "" },
  care: { supportLevels: [], calmingStrategies: "", sensitivityTriggers: [] },
  financial: {
    liquidAssets: "",
    fixedDeposits: "",
    realEstate: "",
    monthlyIncome: "",
    disabilityBenefits: "",
  },
  identity: { pan: "", aadhaar: "", udid: "", hasWill: false },
};

const initial: SessionState = { user: null, onboarding: emptyOnboarding, hydrated: false };

function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };
    case "SIGN_IN":
      return { ...state, user: action.payload };
    case "SIGN_OUT":
      return { ...state, user: null };
    case "UPDATE_ONBOARDING":
      return { ...state, onboarding: { ...state.onboarding, ...action.payload } };
    case "COMPLETE_ONBOARDING":
      return {
        ...state,
        onboarding: { ...state.onboarding, completedAt: new Date().toISOString() },
      };
    default:
      return state;
  }
}

type SessionContextValue = SessionState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateOnboarding: (patch: Partial<OnboardingData>) => void;
  completeOnboarding: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function userFromSupabase(
  u: { id: string; email?: string | null } | null | undefined,
): AuthUser | null {
  if (!u?.email) return null;
  return { id: u.id, email: u.email, displayName: u.email.split("@")[0].replace(/[._-]/g, " ") };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // hydrate onboarding draft + current Supabase session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let onboarding = emptyOnboarding;
      try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) onboarding = { ...emptyOnboarding, ...(JSON.parse(raw) as OnboardingData) };
      } catch {
        /* ignore */
      }

      const { data } = await supabase.auth.getSession();
      const user = userFromSupabase(data.session?.user);
      if (cancelled) return;
      dispatch({ type: "HYDRATE", payload: { user, onboarding } });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = userFromSupabase(session?.user);
      dispatch(u ? { type: "SIGN_IN", payload: u } : { type: "SIGN_OUT" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // persist onboarding draft only
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.onboarding));
    } catch {
      /* ignore */
    }
  }, [state.onboarding, state.hydrated]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // auto-provision on first use so the MVP demo flow works end-to-end
      if (/invalid login credentials/i.test(error.message)) {
        const { error: upErr } = await supabase.auth.signUp({ email, password });
        if (upErr) throw upErr;
        const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
        if (retryErr) throw retryErr;
        return;
      }
      throw error;
    }
    const u = userFromSupabase(data.user);
    if (u) dispatch({ type: "SIGN_IN", payload: u });
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: "SIGN_OUT" });
  }, []);

  const updateOnboarding = useCallback(
    (patch: Partial<OnboardingData>) => dispatch({ type: "UPDATE_ONBOARDING", payload: patch }),
    [],
  );

  const completeOnboarding = useCallback(async () => {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    const ob = state.onboarding;
    const { data: authData } = await supabase.auth.getSession();
    const { error } = await pdb.from("child_profiles").upsert(
      {
        user_id: authData.session?.user?.id,
        full_name: ob.child.fullName,
        age: ob.child.age,
        diagnosis: ob.child.diagnosis,
        about: ob.child.about,
        support_levels: ob.care.supportLevels,
        calming_strategies: ob.care.calmingStrategies,
        sensitivity_triggers: ob.care.sensitivityTriggers,
        pan: ob.identity.pan,
        aadhaar_last4: ob.identity.aadhaar,
        udid: ob.identity.udid,
        has_will: ob.identity.hasWill,
        liquid_assets: Number(ob.financial.liquidAssets) || 0,
        fixed_deposits: Number(ob.financial.fixedDeposits) || 0,
        real_estate: Number(ob.financial.realEstate) || 0,
        monthly_income: Number(ob.financial.monthlyIncome) || 0,
        disability_benefits: Number(ob.financial.disabilityBenefits) || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) console.error("completeOnboarding", error);
  }, [state.onboarding]);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, signIn, signUp, signOut, updateOnboarding, completeOnboarding }),
    [state, signIn, signUp, signOut, updateOnboarding, completeOnboarding],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
